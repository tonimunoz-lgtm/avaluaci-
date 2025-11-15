// app.js - Gestor de Classes + Google Classroom
import { openModal, closeModal, confirmAction } from './modals.js';

/* ---------------- FIREBASE CONFIG ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.appspot.com",
  messagingSenderId: "324570393360",
  appId: "1:324570393360:web:13a65fcf948813805c5395"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ---------------- Globals ---------------- */
let professorUID = null;
let currentClassId = null;
let classStudents = [];
let classActivities = [];

/* ---------------- Elements ---------------- */
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const usuariNom = document.getElementById('usuariNom');

const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const btnRecover = document.getElementById('btnRecover');
const btnLogout = document.getElementById('btnLogout');
const btnCreateClass = document.getElementById('btnCreateClass');
const btnRefreshClasses = document.getElementById('btnRefreshClasses');

const screenClasses = document.getElementById('screen-classes');
const screenClass = document.getElementById('screen-class');
const classesGrid = document.getElementById('classesGrid');

const btnBack = document.getElementById('btnBack');
const btnAddStudent = document.getElementById('btnAddStudent');
const btnAddActivity = document.getElementById('btnAddActivity');
const btnSortAlpha = document.getElementById('btnSortAlpha');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');

const studentsList = document.getElementById('studentsList');
const studentsCount = document.getElementById('studentsCount');

const notesThead = document.getElementById('notesThead');
const notesTbody = document.getElementById('notesTbody');
const notesTfoot = document.getElementById('notesTfoot');

const modalCreateClassBtn = document.getElementById('modalCreateClassBtn');
const modalAddStudentBtn = document.getElementById('modalAddStudentBtn');
const modalAddActivityBtn = document.getElementById('modalAddActivityBtn');

/* ---------------- UTILITIES ---------------- */
function showLogin() {
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}
function showApp() {
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
}

/* ---------------- AUTH ---------------- */
btnLogin.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');
  auth.signInWithEmailAndPassword(email, pw)
    .then(u => { professorUID = u.user.uid; setupAfterAuth(u.user); })
    .catch(e => alert('Error login: ' + e.message));
});

btnRegister.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');
  auth.createUserWithEmailAndPassword(email, pw)
    .then(u => {
      professorUID = u.user.uid;
      db.collection('professors').doc(professorUID).set({ email, classes: [] })
        .then(() => setupAfterAuth(u.user));
    })
    .catch(e => alert('Error registre: ' + e.message));
});

btnRecover.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) return alert('Introdueix el teu email per recuperar la contrasenya');
  auth.sendPasswordResetEmail(email)
    .then(() => alert('Email de recuperació enviat!'))
    .catch(e => alert('Error: ' + e.message));
});

btnLogout.addEventListener('click', () => {
  auth.signOut().then(() => { professorUID = null; currentClassId = null; showLogin(); });
});

auth.onAuthStateChanged(user => { user ? setupAfterAuth(user) : showLogin(); });

/* ---------------- AFTER LOGIN ---------------- */
function setupAfterAuth(user) {
  showApp();
  const email = user.email || '';
  usuariNom.textContent = email.split('@')[0] || email;
  loadClassesScreen();
}

/* ---------------- CLASSES SCREEN ---------------- */
btnCreateClass.addEventListener('click', () => openModal('modalCreateClass'));
btnRefreshClasses.addEventListener('click', loadClassesScreen);

function loadClassesScreen() {
  if (!professorUID) return alert('Fes login primer.');
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
  classesGrid.innerHTML = '<div class="col-span-full text-sm text-gray-500">Carregant...</div>';

  const classColors = ['from-indigo-600 to-purple-600','from-pink-500 to-red-500','from-yellow-400 to-orange-500','from-green-500 to-teal-500','from-blue-500 to-indigo-600','from-purple-500 to-pink-500'];

  db.collection('professors').doc(professorUID).get().then(doc => {
    if(!doc.exists) { classesGrid.innerHTML = '<div class="text-sm text-red-500">Professor no trobat</div>'; return; }
    const ids = doc.data().classes || [];
    if(ids.length === 0) {
      classesGrid.innerHTML = `<div class="col-span-full p-6 bg-white dark:bg-gray-800 rounded shadow text-center">No tens cap classe. Crea la primera!</div>`;
      return;
    }
    Promise.all(ids.map(id => db.collection('classes').doc(id).get()))
      .then(docs => {
        classesGrid.innerHTML = '';
        docs.forEach((d,i) => {
          if(!d.exists) return;
          const color = classColors[i % classColors.length];
          const card = document.createElement('div');
          card.className = `class-card bg-gradient-to-br ${color} text-white rounded-xl p-4 shadow cursor-pointer`;
          card.innerHTML = `<h3 class="text-lg font-bold">${d.data().nom||'Sense nom'}</h3>
                            <p class="text-sm mt-2">${(d.data().alumnes||[]).length} alumnes · ${(d.data().activitats||[]).length} activitats</p>`;
          card.addEventListener('click', () => openClass(d.id));
          classesGrid.appendChild(card);
        });
      });
  }).catch(e=> console.error(e));
}

modalCreateClassBtn.addEventListener('click', () => {
  const name = document.getElementById('modalClassName').value.trim();
  if (!name) return alert('Posa un nom');
  const ref = db.collection('classes').doc();
  ref.set({ nom: name, alumnes: [], activitats: [] })
    .then(() => db.collection('professors').doc(professorUID).update({ classes: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(() => { closeModal('modalCreateClass'); document.getElementById('modalClassName').value = ''; loadClassesScreen(); });
});

/* ---------------- OPEN CLASS ---------------- */
function openClass(id) {
  currentClassId = id;
  screenClasses.classList.add('hidden');
  screenClass.classList.remove('hidden');
  loadClassData();
}

btnBack.addEventListener('click', () => { currentClassId=null; screenClass.classList.add('hidden'); screenClasses.classList.remove('hidden'); loadClassesScreen(); });

function loadClassData() {
  if(!currentClassId) return;
  db.collection('classes').doc(currentClassId).get().then(doc => {
    if(!doc.exists) return alert('Classe no trobada');
    const data = doc.data();
    classStudents = data.alumnes || [];
    classActivities = data.activitats || [];
    document.getElementById('classTitle').textContent = data.nom || 'Sense nom';
    document.getElementById('classSub').style.display='none'; // ocultem ID
    renderStudentsList();
    renderNotesGrid();
  });
}

/* ---------------- STUDENTS ---------------- */
btnAddStudent.addEventListener('click', () => openModal('modalAddStudent'));
modalAddStudentBtn.addEventListener('click', () => {
  const name = document.getElementById('modalStudentName').value.trim();
  if(!name) return alert('Posa un nom');
  const ref = db.collection('alumnes').doc();
  ref.set({ nom: name, notes:{} })
    .then(()=> db.collection('classes').doc(currentClassId).update({ alumnes: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> { closeModal('modalAddStudent'); document.getElementById('modalStudentName').value=''; loadClassData(); });
});

function renderStudentsList() {
  studentsList.innerHTML = '';
  studentsCount.textContent = `(${classStudents.length})`;
  if(classStudents.length===0) { studentsList.innerHTML='<li class="text-sm text-gray-400">No hi ha alumnes</li>'; return; }
  classStudents.forEach((stuId,idx)=>{
    db.collection('alumnes').doc(stuId).get().then(doc=>{
      const name = doc.exists ? doc.data().nom : 'Desconegut';
      const li = document.createElement('li');
      li.className='flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded';
      li.innerHTML=`<span class="font-medium">${name}</span>`;
      studentsList.appendChild(li);
    });
  });
}

/* ---------------- ACTIVITIES ---------------- */
btnAddActivity.addEventListener('click', () => openModal('modalAddActivity'));
modalAddActivityBtn.addEventListener('click', () => {
  const name = document.getElementById('modalActivityName').value.trim();
  if(!name) return alert('Posa un nom');
  const ref = db.collection('activitats').doc();
  ref.set({ nom:name, data: new Date().toISOString().split('T')[0] })
    .then(()=> db.collection('classes').doc(currentClassId).update({ activitats: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> { closeModal('modalAddActivity'); document.getElementById('modalActivityName').value=''; loadClassData(); });
});

/* ---------------- NOTES GRID ---------------- */
function renderNotesGrid() {
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';
  const headRow=document.createElement('tr');
  headRow.appendChild(th('Alumne'));
  classActivities.forEach(aid => headRow.appendChild(th(aid)));
  notesThead.appendChild(headRow);
}

/* ---------------- EXPORT EXCEL ---------------- */
btnExport.addEventListener('click', () => {
  const table=document.getElementById('notesTable');
  const wb=XLSX.utils.table_to_book(table,{sheet:"Notes"});
  XLSX.writeFile(wb,(document.getElementById('classTitle').textContent||'classe')+'.xlsx');
});

/* ---------------- GOOGLE CLASSROOM IMPORT ---------------- */
btnImport.addEventListener('click', importFromClassroom);

async function initGoogleAPI() {
  return new Promise(resolve=>{
    gapi.load('client:auth2', async ()=>{
      await gapi.client.init({
        apiKey: 'TEU_API_KEY',
        clientId: 'TEU_CLIENT_ID',
        discoveryDocs: ["https://classroom.googleapis.com/$discovery/rest?version=v1"],
        scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly"
      });
      resolve();
    });
  });
}

async function importFromClassroom() {
  await initGoogleAPI();
  const authInstance = gapi.auth2.getAuthInstance();
  if(!authInstance.isSignedIn.get()) await authInstance.signIn();

  const coursesRes = await gapi.client.classroom.courses.list({ pageSize:50 });
  const courses = coursesRes.result.courses || [];
  if(courses.length===0) return alert('No hi ha cursos a Google Classroom');

  const courseId = courses[0].id;
  const studentsRes = await gapi.client.classroom.courses.students.list({ courseId });
  const students = studentsRes.result.students || [];
  if(students.length===0) return alert('Aquest curs no té alumnes');

  const batch = db.batch();
  students.forEach(s=>{
    const ref=db.collection('alumnes').doc();
    batch.set(ref,{ nom: s.profile.name.fullName, notes:{} });
    batch.update(db.collection('classes').doc(currentClassId),{ alumnes: firebase.firestore.FieldValue.arrayUnion(ref.id) });
  });

  batch.commit().then(()=>{
    alert(`Importats ${students.length} alumnes de Classroom`);
    loadClassData();
  }).catch(e=> console.error(e));
}

/* ---------------- UTIL ---------------- */
function th(txt){ const el=document.createElement('th'); el.textContent=txt; el.className='border px-2 py-1'; return el; }
