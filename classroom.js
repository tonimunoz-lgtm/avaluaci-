// classroom.js - Integración con Google Classroom usando REST API

const CLASSROOM_CLIENT_ID = "324570393360-2ib4925pbobfbggu8t0nnj14q5n414nv.apps.googleusercontent.com"; // Reemplaza con tu ID
const CLASSROOM_DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/classroom/v1/rest"
];

let classroomAccessToken = null;

// Inicializar autenticación con Google usando Google Sign-In
export function initClassroomAPI() {
  return new Promise((resolve, reject) => {
    console.log('📚 Inicializando Classroom API con GIS...');

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLASSROOM_CLIENT_ID,
        scope: [
          "https://www.googleapis.com/auth/classroom.courses.readonly",
          "https://www.googleapis.com/auth/classroom.rosters.readonly",
          "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
          "https://www.googleapis.com/auth/classroom.coursework.students",
          "https://www.googleapis.com/auth/classroom.student-submissions.students.readonly"
        ].join(' '),
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            classroomAccessToken = tokenResponse.access_token;
            window._googleAccessToken = classroomAccessToken;
            console.log('✅ Token obtenido con éxito');
            resolve(true);
          } else {
            reject(new Error('No se obtuvo token de Google Classroom'));
          }
        }
      });

      client.requestAccessToken();

    } catch (err) {
      console.error('❌ Error inicializando Google Classroom:', err);
      reject(err);
    }
  });
}

// Llegeix TOTES les pàgines d'un endpoint de Classroom (nextPageToken)
async function fetchAllPages(baseUrl, key, errMsg) {
  const out = [];
  let pageToken = '';
  do {
    const url = baseUrl + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${classroomAccessToken}`, 'Accept': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errMsg);
    }
    const data = await response.json();
    out.push(...(data[key] || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

// Esborra documents en lots de 400
async function deleteRefsChunked(db, refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const b = db.batch();
    refs.slice(i, i + 400).forEach(r => b.delete(r));
    await b.commit();
  }
}

// Obtener lista de cursos
export async function getClassroomCourses() {
  if (!classroomAccessToken) throw new Error('No hay token de autenticación');

  try {
    console.log('📚 Obteniendo cursos...');
    const response = await fetch(
      'https://classroom.googleapis.com/v1/courses?pageSize=50&courseStates=ACTIVE',
      { headers: { 'Authorization': `Bearer ${classroomAccessToken}`, 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de API:', errorData);
      throw new Error(errorData.error?.message || 'Error obteniendo cursos');
    }

    const data = await response.json();
    console.log(`✅ Se encontraron ${data.courses?.length || 0} cursos`);
    return data.courses || [];

  } catch (err) {
    console.error('Error obteniendo cursos:', err);
    throw new Error('No se pudieron obtener los cursos de Classroom: ' + err.message);
  }
}

// Obtener estudiantes de un curso
export async function getClassroomStudents(courseId) {
  if (!classroomAccessToken) throw new Error('No hay token de autenticación');

  try {
    console.log(`👥 Obteniendo estudiantes del curso ${courseId}...`);
    const list = await fetchAllPages(
      `https://classroom.googleapis.com/v1/courses/${courseId}/students?pageSize=100`,
      'students', 'Error obteniendo estudiantes');
    console.log(`✅ Se encontraron ${list.length} estudiantes`);

    // Asignar valores por defecto si email o nom son undefined
    return list.map(student => ({
      id: student.userId,
      email: (student.profile && student.profile.emailAddress) || '',
      nom: (student.profile && student.profile.name && student.profile.name.fullName) || 'Sin nombre'
    }));

  } catch (err) {
    console.error('Error obteniendo estudiantes:', err);
    throw new Error('No se pudieron obtener los estudiantes: ' + err.message);
  }
}

// Obtener actividades del curso
export async function getClassroomCoursework(courseId) {
  if (!classroomAccessToken) throw new Error('No hay token de autenticación');

  try {
    console.log(`📝 Obteniendo actividades del curso ${courseId}...`);
    const works = await fetchAllPages(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=100&courseWorkStates=PUBLISHED`,
      'courseWork', 'Error obteniendo actividades');
    console.log(`✅ Se encontraron ${works.length} actividades`);

    return works.map(work => ({
      id: work.id,
      title: work.title,
      description: work.description || '',
      dueDate: work.dueDate || null,
      maxPoints: work.maxPoints || 10
    }));

  } catch (err) {
    console.error('Error obteniendo actividades:', err);
    throw new Error('No se pudieron obtener las actividades: ' + err.message);
  }
}

// Obtener calificaciones de un alumno en una actividad
export async function getStudentSubmissions(courseId, courseWorkId) {
  if (!classroomAccessToken) throw new Error('No hay token de autenticación');

  try {
    console.log(`📊 Obteniendo calificaciones para actividad ${courseWorkId}...`);
    const list = await fetchAllPages(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions?pageSize=100`,
      'studentSubmissions', 'Error obteniendo calificaciones');
    const submissions = {};
    list.forEach(submission => {
      // 0 és una nota vàlida: només és "sense nota" si assignedGrade no existeix
      const g = submission.assignedGrade;
      submissions[submission.userId] = (g !== undefined && g !== null) ? Number(g) : null;
    });

    console.log(`✅ Se encontraron calificaciones para ${Object.keys(submissions).length} estudiantes`);
    return submissions;

  } catch (err) {
    console.error('Error obteniendo calificaciones:', err);
    return {};
  }
}

// Importar un curso completo
// - Escriptures en lots de 400 (límit Firestore: 500)
// - Notes escalades a 0–10 segons maxPoints
// - Si falla a mig camí, s'esborra el que s'havia creat (no queden documents orfes)
export async function importClassroomCourse(courseData, db, professorUID) {
  const created = [];   // refs creades, per poder fer rollback
  try {
    console.log('📚 Iniciando importación de:', courseData.name);

    const classRef = db.collection('classes').doc();
    const classId = classRef.id;

    const [students, courseworks] = await Promise.all([
      getClassroomStudents(courseData.id),
      getClassroomCoursework(courseData.id)
    ]);
    console.log(`👥 ${students.length} estudiantes, 📝 ${courseworks.length} actividades`);

    // Notes de totes les activitats en paral·lel (abans: una darrere l'altra)
    const submissionsList = await Promise.all(
      courseworks.map(cw => getStudentSubmissions(courseData.id, cw.id))
    );

    // Activitats
    const activityIds = [];
    const actRefs = courseworks.map(cw => {
      const ref = db.collection('activitats').doc();
      activityIds.push(ref.id);
      return ref;
    });

    // Alumnes amb les seves notes ja calculades (una sola escriptura per alumne)
    const studentIds = [];
    const writes = [];   // [ref, data]
    students.forEach(student => {
      const ref = db.collection('alumnes').doc();
      studentIds.push(ref.id);
      const notes = {};
      courseworks.forEach((cw, idx) => {
        const raw = submissionsList[idx][student.id];
        if (raw === undefined || raw === null) return;
        const max = Number(cw.maxPoints);
        const scaled = max > 0 ? (raw / max) * 10 : raw;     // escala 0–10
        notes[activityIds[idx]] = Math.round(scaled * 100) / 100;
      });
      writes.push([ref, {
        nom: student.nom || 'Sin nombre',
        email: student.email || '',
        notes,
        googleClassroomId: student.id,
        comentarios: {},
        ownerUid: professorUID
      }]);
    });
    courseworks.forEach((cw, idx) => {
      writes.push([actRefs[idx], {
        nom: cw.title,
        description: cw.description,
        data: cw.dueDate || new Date().toISOString().split('T')[0],
        calcType: 'numeric',
        formula: '',
        googleClassroomId: cw.id,
        maxPoints: cw.maxPoints,
        ownerUid: professorUID
      }]);
    });

    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch();
      writes.slice(i, i + 400).forEach(([ref, data]) => { batch.set(ref, data); created.push(ref); });
      await batch.commit();
    }
    console.log('✅ Alumnos, actividades y calificaciones creados');

    // Crear la clase con todos los datos
    await classRef.set({
      nom: courseData.name,
      alumnes: studentIds,
      activitats: activityIds,
      terms: {
        'imported': {
          name: 'Importado de Classroom',
          activities: activityIds
        }
      },
      calculatedActivities: {},
      googleClassroomId: courseData.id,
      ownerUid: professorUID,
      importedAt: new Date().toISOString()
    });
    created.push(classRef);

    await db.collection('professors').doc(professorUID).update({
      classes: firebase.firestore.FieldValue.arrayUnion(classId)
    });

    console.log('✅ Clase importada correctamente');
    return classId;

  } catch (err) {
    console.error('❌ Error importando curso:', err);
    try { await deleteRefsChunked(db, created); } catch (e2) { console.error('Rollback incomplet', e2); }
    throw new Error('Error importando curso: ' + err.message);
  }
}

// Logout de Classroom
export async function signOutClassroom() {
  try {
    if (gapi && gapi.auth2) {
      const auth2 = gapi.auth2.getAuthInstance();
      if (auth2) {
        await auth2.signOut();
        classroomAccessToken = null;
        console.log('✅ Sesión de Classroom cerrada');
      }
    }
  } catch (err) {
    console.error('Error en logout:', err);
  }
}
