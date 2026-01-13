// classroom.js - Integración con Google Classroom

const CLASSROOM_CLIENT_ID = "324570393360-2ib4925pbobfbggu8t0nnj14q5n414nv.apps.googleusercontent.com"; // Reemplaza con tu ID
const CLASSROOM_SCOPE = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly'
];

let classroomGoogleAuth = null;

// Inicializar Google API
export async function initClassroomAPI() {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          clientId: CLASSROOM_CLIENT_ID,
          scope: CLASSROOM_SCOPE.join(' ')
        });
        classroomGoogleAuth = gapi.auth2.getAuthInstance();
        console.log('✅ Classroom API inicializado');
        resolve(true);
      } catch (err) {
        console.error('❌ Error inicializando Classroom API:', err);
        reject(err);
      }
    });
  });
}

// Obtener lista de clases del profesor
export async function getClassroomCourses() {
  try {
    if (!classroomGoogleAuth?.isSignedIn.get()) {
      await classroomGoogleAuth.signIn();
    }

    const response = await gapi.client.classroom.courses.list({
      pageSize: 50,
      courseStates: ['ACTIVE']
    });

    return response.result.courses || [];
  } catch (err) {
    console.error('Error obteniendo cursos:', err);
    throw new Error('No se pudieron obtener los cursos de Classroom');
  }
}

// Obtener estudiantes de un curso
export async function getClassroomStudents(courseId) {
  try {
    const response = await gapi.client.classroom.courses.students.list({
      courseId: courseId,
      pageSize: 100
    });

    return (response.result.students || []).map(student => ({
      id: student.userId,
      email: student.profile.emailAddress,
      nom: student.profile.name.fullName
    }));
  } catch (err) {
    console.error('Error obteniendo estudiantes:', err);
    throw new Error('No se pudieron obtener los estudiantes');
  }
}

// Obtener actividades (coursework) de un curso
export async function getClassroomCoursework(courseId) {
  try {
    const response = await gapi.client.classroom.courses.courseWork.list({
      courseId: courseId,
      pageSize: 100,
      courseWorkStates: ['PUBLISHED']
    });

    return (response.result.courseWork || []).map(work => ({
      id: work.id,
      title: work.title,
      description: work.description || '',
      dueDate: work.dueDate || null,
      maxPoints: work.maxPoints || 10
    }));
  } catch (err) {
    console.error('Error obteniendo actividades:', err);
    throw new Error('No se pudieron obtener las actividades');
  }
}

// Obtener calificaciones de un alumno en una actividad
export async function getStudentSubmissions(courseId, courseWorkId) {
  try {
    const response = await gapi.client.classroom.courses.courseWork.studentSubmissions.list({
      courseId: courseId,
      courseWorkId: courseWorkId,
      pageSize: 100
    });

    const submissions = {};
    (response.result.studentSubmissions || []).forEach(submission => {
      const grade = submission.assignedGrade || null;
      submissions[submission.userId] = grade ? Number(grade) : null;
    });

    return submissions;
  } catch (err) {
    console.error('Error obteniendo calificaciones:', err);
    return {};
  }
}

// Función principal para importar un curso completo
export async function importClassroomCourse(courseData, db, professorUID) {
  try {
    console.log('📚 Iniciando importación de:', courseData.name);

    // 1. Crear la clase en Firestore
    const classRef = db.collection('classes').doc();
    const classId = classRef.id;

    // 2. Obtener estudiantes
    const students = await getClassroomStudents(courseData.id);
    console.log(`👥 Se encontraron ${students.length} estudiantes`);

    // 3. Obtener actividades
    const courseworks = await getClassroomCoursework(courseData.id);
    console.log(`📝 Se encontraron ${courseworks.length} actividades`);

    // 4. Crear documentos de estudiantes en Firestore
    const studentIds = [];
    const batch = db.batch();

    for (const student of students) {
      const studentRef = db.collection('alumnes').doc();
      studentIds.push(studentRef.id);

      batch.set(studentRef, {
        nom: student.nom,
        email: student.email,
        notes: {},
        googleClassroomId: student.id
      });
    }

    await batch.commit();
    console.log('✅ Estudiantes creados');

    // 5. Crear actividades y obtener calificaciones
    const activityIds = [];
    const notesData = {};

    for (const coursework of courseworks) {
      const actRef = db.collection('activitats').doc();
      const actId = actRef.id;
      activityIds.push(actId);

      // Crear actividad
      await actRef.set({
        nom: coursework.title,
        description: coursework.description,
        data: coursework.dueDate || new Date().toISOString().split('T')[0],
        calcType: 'numeric',
        formula: '',
        googleClassroomId: coursework.id,
        maxPoints: coursework.maxPoints
      });

      // Obtener calificaciones
      const submissions = await getStudentSubmissions(courseData.id, coursework.id);
      notesData[actId] = submissions;
    }

    console.log('✅ Actividades creadas');

    // 6. Guardar calificaciones en los documentos de estudiantes
    const updateBatch = db.batch();
    for (let i = 0; i < studentIds.length; i++) {
      const studentRef = db.collection('alumnes').doc(studentIds[i]);
      const studentNotes = {};

      for (const [actId, submissions] of Object.entries(notesData)) {
        const googleStudentId = students[i].id;
        if (submissions[googleStudentId] !== undefined) {
          studentNotes[actId] = submissions[googleStudentId];
        }
      }

      updateBatch.update(studentRef, { notes: studentNotes });
    }

    await updateBatch.commit();
    console.log('✅ Calificaciones importadas');

    // 7. Crear la clase con todos los datos
    await classRef.set({
      nom: courseData.name,
      alumnes: studentIds,
      activitats: activityIds,
      terms: {
        default: {
          name: 'Importado de Classroom',
          activities: activityIds
        }
      },
      calculatedActivities: {},
      googleClassroomId: courseData.id,
      importedAt: new Date().toISOString()
    });

    // 8. Añadir la clase al profesor
    await db.collection('professors').doc(professorUID).update({
      classes: firebase.firestore.FieldValue.arrayUnion(classId)
    });

    console.log('✅ Clase importada correctamente');
    return classId;

  } catch (err) {
    console.error('❌ Error importando curso:', err);
    throw new Error('Error importando curso: ' + err.message);
  }
}

// Logout de Classroom
export async function signOutClassroom() {
  if (classroomGoogleAuth) {
    await classroomGoogleAuth.signOut();
    console.log('Sesión de Classroom cerrada');
  }
}
