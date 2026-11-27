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
      maxPoints: work.maxPoints || 10,
      noGrade: !work.maxPoints   // activitat sense nota: candidata a «Lliurament»
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
    // Lliurament: només compta com a ✓ si el professor l'ha DEVOLTA (state RETURNED). Lliurat sense tornar = buit.
    const returned = new Set();
    Object.defineProperty(submissions, '_returned', { value: returned, enumerable: false });
    list.forEach(submission => {
      if (submission.state === 'RETURNED') returned.add(submission.userId);
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

// {year, month, day} de Classroom → 'AAAA-MM-DD'
export function formatDueDate(d) {
  if (!d || !d.year || !d.month || !d.day) return '';
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

// Escala una nota de Classroom a l'escala de l'activitat.
// Numèrica: 0–10 segons maxPoints. Competencial: 0–4; si cap nota supera 4, ja venen en 0–4 i es deixen tal qual;
// si n'hi ha alguna per sobre de 4, es fa proporcionalment segons maxPoints.
export function compNeedsScaling(raws) {
  return raws.some(r => r !== null && r !== undefined && Number(r) > 4);
}
export function scaleGrade(raw, maxPoints, comp, scaleComp) {
  if (raw === undefined || raw === null) return null;
  const max = Number(maxPoints);
  if (comp) {
    const v = scaleComp && max > 0 ? (raw / max) * 4 : Number(raw);
    return Math.min(4, Math.round(v * 100) / 100);
  }
  const v = max > 0 ? (raw / max) * 10 : Number(raw);
  return Math.round(v * 100) / 100;
}

// Importar un curso completo
// - Escriptures en lots de 400 (límit Firestore: 500)
// - Notes escalades a 0–10 segons maxPoints
// - Si falla a mig camí, s'esborra el que s'havia creat (no queden documents orfes)
export async function importClassroomCourse(courseData, db, professorUID, opts = {}) {
  const created = [];   // refs creades, per poder fer rollback
  try {
    console.log('📚 Iniciando importación de:', courseData.name);

    const classRef = db.collection('classes').doc();
    const classId = classRef.id;

    // opts.workIds: només s'importen aquestes activitats (si no es passa, totes)
    const only = opts.workIds ? new Set(opts.workIds) : null;
    const compSet = new Set(opts.compIds || []);   // activitats marcades com a competencials
    const valSet = new Set(opts.valIds || []);     // activitats marcades com a «Lliurament» (✓/✗ sense nota)
    const [students, allWorks] = await Promise.all([
      getClassroomStudents(courseData.id),
      getClassroomCoursework(courseData.id)
    ]);
    const courseworks = only ? allWorks.filter(w => only.has(w.id)) : allWorks;
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

    // Competencials: s'escalen proporcionalment només si alguna nota supera 4
    const scaleComp = courseworks.map((cw, idx) => !valSet.has(cw.id) && compSet.has(cw.id) && compNeedsScaling(Object.values(submissionsList[idx])));

    // Alumnes amb les seves notes ja calculades (una sola escriptura per alumne)
    const studentIds = [];
    const writes = [];   // [ref, data]
    students.forEach(student => {
      const ref = db.collection('alumnes').doc();
      studentIds.push(ref.id);
      const notes = {};
      const lliu = {};
      courseworks.forEach((cw, idx) => {
        if (valSet.has(cw.id)) { if (submissionsList[idx]._returned?.has(student.id)) lliu[activityIds[idx]] = 'ok'; return; }
        const v = scaleGrade(submissionsList[idx][student.id], cw.maxPoints, compSet.has(cw.id), scaleComp[idx]);
        if (v === null) return;
        notes[activityIds[idx]] = v;
      });
      writes.push([ref, {
        nom: student.nom || 'Sin nombre',
        email: student.email || '',
        notes,
        lliuraments: lliu,
        googleClassroomId: student.id,
        comentarios: {},
        ownerUid: professorUID
      }]);
    });
    courseworks.forEach((cw, idx) => {
      writes.push([actRefs[idx], {
        nom: cw.title,
        description: cw.description,
        data: formatDueDate(cw.dueDate) || new Date().toISOString().split('T')[0],
        calcType: 'numeric',
        formula: '',
        evaluationType: valSet.has(cw.id) ? 'validation' : compSet.has(cw.id) ? 'competency' : 'numeric',
        isCompetency: !valSet.has(cw.id) && compSet.has(cw.id),
        googleClassroomId: cw.id,
        ...(valSet.has(cw.id) ? {} : { maxPoints: cw.maxPoints }),
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


// ============================================================
// ACTUALITZAR UNA CLASSE JA IMPORTADA
// - alumnes nous: s'afegeixen
// - notes: només s'omplen les cel·les BUIDES de l'app que ara tenen nota a Classroom
//   (mai se sobreescriu res del que ja hi ha)
// - activitats noves: es proposen (l'usuari tria quines afegir i si són competencials)
// - no s'esborra mai res
// ============================================================
const _empty = v => v === undefined || v === null || v === '';
const _norm = e => String(e || '').trim().toLowerCase();

export async function previewClassroomSync(classId, db) {
  const cdoc = await db.collection('classes').doc(classId).get();
  if (!cdoc.exists) throw new Error('Classe no trobada');
  const cls = cdoc.data();
  const courseId = cls.googleClassroomId;
  if (!courseId) throw new Error('Aquesta classe no s\'ha importat de Classroom');

  const [stuDocs, actDocs, crStudents, crWorks] = await Promise.all([
    Promise.all((cls.alumnes || []).map(id => db.collection('alumnes').doc(id).get())),
    Promise.all((cls.activitats || []).map(id => db.collection('activitats').doc(id).get())),
    getClassroomStudents(courseId),
    getClassroomCoursework(courseId)
  ]);
  const students = stuDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));
  const acts = actDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

  const byGid = new Map(); const byMail = new Map();
  students.forEach(st => { if (st.googleClassroomId) byGid.set(st.googleClassroomId, st); if (st.email) byMail.set(_norm(st.email), st); });
  const matchOf = cs => byGid.get(cs.id) || (cs.email ? byMail.get(_norm(cs.email)) : null) || null;

  const actByGid = new Map(); acts.forEach(a => { if (a.googleClassroomId) actByGid.set(a.googleClassroomId, a); });
  const knownWorks = crWorks.filter(w => actByGid.has(w.id));
  const newWorks = crWorks.filter(w => !actByGid.has(w.id));

  // Notes de Classroom: de les activitats ja importades i de les noves (per poder oferir-les)
  const subs = {};
  await Promise.all(crWorks.map(async w => { subs[w.id] = await getStudentSubmissions(courseId, w.id); }));

  const newStudents = crStudents.filter(cs => !matchOf(cs));
  const fills = [];   // {studentId, studentName, actId, actName, value}
  knownWorks.forEach(w => {
    const act = actByGid.get(w.id);
    if (act.evaluationType === 'validation') {   // Lliurament: només s'omple ✓ (RETURNED) si és buit
      crStudents.forEach(cs => {
        const st = matchOf(cs);
        if (!st || (st.lliuraments || {})[act.id]) return;
        if (subs[w.id]._returned?.has(cs.id)) fills.push({ studentId: st.id, studentName: st.nom, actId: act.id, actName: act.nom, value: 'ok', kind: 'val' });
      });
      return;
    }
    const comp = act.evaluationType === 'competency' || act.isCompetency === true;
    const scale = comp && compNeedsScaling(Object.values(subs[w.id]));
    const max = act.maxPoints || w.maxPoints;
    crStudents.forEach(cs => {
      const st = matchOf(cs);
      if (!st) return;
      if (!_empty((st.notes || {})[act.id])) return;          // ja té nota: no es toca
      const v = scaleGrade(subs[w.id][cs.id], max, comp, scale);
      if (v === null) return;
      fills.push({ studentId: st.id, studentName: st.nom, actId: act.id, actName: act.nom, value: v });
    });
  });

  return { classId, cls, courseId, crStudents, newStudents, newWorks, knownWorks, actByGid, subs, fills, matchOf, students };
}

// opts.newWorks: [{id, comp}]  -> activitats noves triades
export async function applyClassroomSync(plan, db, professorUID, opts = {}) {
  const { classId, cls, newStudents, fills, subs, crStudents } = plan;
  const chosen = (opts.newWorks || []);
  const works = plan.newWorks.filter(w => chosen.some(c => c.id === w.id));
  const compOf = id => !!chosen.find(c => c.id === id)?.comp && !valOf(id);
  const valOf = id => !!chosen.find(c => c.id === id)?.val;

  const writes = [];   // [type, ref, data]
  // 1) activitats noves
  const newActIds = {};
  works.forEach(w => {
    const ref = db.collection('activitats').doc();
    newActIds[w.id] = ref.id;
    const comp = compOf(w.id);
    writes.push(['set', ref, {
      nom: w.title, description: w.description,
      data: formatDueDate(w.dueDate) || new Date().toISOString().split('T')[0],
      calcType: 'numeric', formula: '',
      evaluationType: valOf(w.id) ? 'validation' : comp ? 'competency' : 'numeric', isCompetency: comp,
      googleClassroomId: w.id, ...(valOf(w.id) ? {} : { maxPoints: w.maxPoints }), ownerUid: professorUID
    }]);
  });
  const scaleNew = {}; works.forEach(w => { scaleNew[w.id] = compOf(w.id) && compNeedsScaling(Object.values(subs[w.id])); });
  const noteForNew = (csId) => {
    const notes = {};
    works.forEach(w => {
      if (valOf(w.id)) return;
      const v = scaleGrade(subs[w.id][csId], w.maxPoints, compOf(w.id), scaleNew[w.id]);
      if (v !== null) notes[newActIds[w.id]] = v;
    });
    return notes;
  };
  const lliuForNew = (csId) => {
    const l = {};
    works.forEach(w => { if (valOf(w.id) && subs[w.id]._returned?.has(csId)) l[newActIds[w.id]] = 'ok'; });
    return l;
  };

  // 2) alumnes nous
  const newStudentIds = [];
  newStudents.forEach(cs => {
    const ref = db.collection('alumnes').doc();
    newStudentIds.push(ref.id);
    // notes de les activitats ja existents (si les hi ha) + de les noves
    const notes = noteForNew(cs.id);
    const lliu = lliuForNew(cs.id);
    plan.knownWorks.forEach(w => {
      const act = plan.actByGid.get(w.id);
      if (act.evaluationType === 'validation') { if (subs[w.id]._returned?.has(cs.id)) lliu[act.id] = 'ok'; return; }
      const comp = act.evaluationType === 'competency' || act.isCompetency === true;
      const v = scaleGrade(subs[w.id][cs.id], act.maxPoints || w.maxPoints, comp, comp && compNeedsScaling(Object.values(subs[w.id])));
      if (v !== null) notes[act.id] = v;
    });
    writes.push(['set', ref, { nom: cs.nom || 'Sin nombre', email: cs.email || '', notes, lliuraments: lliu, googleClassroomId: cs.id, comentarios: {}, ownerUid: professorUID }]);
  });

  // 3) notes buides d'alumnes existents (activitats ja importades)
  const byStudent = {};
  fills.forEach(f => { (byStudent[f.studentId] = byStudent[f.studentId] || {})[`${f.kind === 'val' ? 'lliuraments' : 'notes'}.${f.actId}`] = f.value; });
  // 3b) alumnes existents + activitats noves
  plan.students.forEach(st => {
    const cs = crStudents.find(c => (st.googleClassroomId && c.id === st.googleClassroomId) || (!st.googleClassroomId && c.email && _norm(c.email) === _norm(st.email)));
    if (!cs) return;
    const extra = noteForNew(cs.id);
    Object.entries(extra).forEach(([aid, v]) => { (byStudent[st.id] = byStudent[st.id] || {})[`notes.${aid}`] = v; });
    Object.entries(lliuForNew(cs.id)).forEach(([aid, v]) => { (byStudent[st.id] = byStudent[st.id] || {})[`lliuraments.${aid}`] = v; });
    if (!st.googleClassroomId && byStudent[st.id]) byStudent[st.id].googleClassroomId = cs.id;
  });
  Object.entries(byStudent).forEach(([sid, upd]) => writes.push(['update', db.collection('alumnes').doc(sid), upd]));

  // 4) classe: alumnes i activitats nous (+ al grup d'avaluació indicat)
  const classUpd = {};
  if (newStudentIds.length) classUpd.alumnes = firebase.firestore.FieldValue.arrayUnion(...newStudentIds);
  const addedActIds = Object.values(newActIds);
  if (addedActIds.length) {
    classUpd.activitats = firebase.firestore.FieldValue.arrayUnion(...addedActIds);
    const termId = opts.termId && cls.terms && cls.terms[opts.termId] ? opts.termId : (cls.terms && cls.terms.imported ? 'imported' : null);
    if (termId) classUpd[`terms.${termId}.activities`] = firebase.firestore.FieldValue.arrayUnion(...addedActIds);
  }

  const items = writes.filter(w => w[0] !== 'class');
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    items.slice(i, i + 400).forEach(([t, ref, data]) => t === 'set' ? batch.set(ref, data) : batch.update(ref, data));
    await batch.commit();
  }
  if (Object.keys(classUpd).length) await db.collection('classes').doc(classId).update(classUpd);

  return { newStudents: newStudentIds.length, notes: fills.length, newActivities: addedActIds.length };
}
