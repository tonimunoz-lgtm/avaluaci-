// app.js - Gestor de Classes
import { openModal, closeModal, confirmAction } from './modals.js';

/* ---------------- FIREBASE CONFIG ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.firebasestorage.app",
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
let deleteMode = false;
let currentCalcActivityId = null;

/* Elements */
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const usuariNom = document.getElementById('usuariNom');

const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const btnRecover = document.getElementById('btnRecover');
const btnLogout = document.getElementById('btnLogout');
const btnCreateClass = document.getElementById('btnCreateClass');
const btnDeleteMode = document.getElementById('btnDeleteMode');

const screenClasses = document.getElementById('screen-classes');
const screenClass = document.getElementById('screen-class');
const classesGrid = document.getElementById('classesGrid');

const btnBack = document.getElementById('btnBack');
const btnAddStudent = document.getElementById('btnAddStudent');
const btnAddActivity = document.getElementById('btnAddActivity');
const btnSortAlpha = document.getElementById('btnSortAlpha');
const btnExport = document.getElementById('btnExport');

const studentsList = document.getElementById('studentsList');
const studentsCount = document.getElementById('studentsCount');

const notesThead = document.getElementById('notesThead');
const notesTbody = document.getElementById('notesTbody');
const notesTfoot = document.getElementById('notesTfoot');

const modalCreateClassBtn = document.getElementById('modalCreateClassBtn');
const modalAddStudentBtn = document.getElementById('modalAddStudentBtn');
const modalAddActivityBtn = document.getElementById('modalAddActivityBtn');

/* ---------- UTILS ---------- */
function showLogin() {
  loginScreen.style.display = 'block';
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}
function showApp() {
  loginScreen.style.display = 'none';
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
}

/* ---------- AUTH ---------- */
btnLogin.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');
  auth.signInWithEmailAndPassword(email, pw)
    .then(u => {
      professorUID = u.user.uid;
      setupAfterAuth(u.user);
    }).catch(e => alert('Error login: ' + e.message));
});

btnRegister.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');
  auth.createUserWithEmailAndPassword(email, pw)
    .then(u => {
      professorUID = u.user.uid;
      db.collection('professors').doc(professorUID).set({ email, classes: [] })
        .then(()=> { setupAfterAuth(u.user); });
    }).catch(e => alert('Error registre: ' + e.message));
});

btnRecover.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  if(!email) return alert('Introdueix el teu email per recuperar la contrasenya');
  auth.sendPasswordResetEmail(email)
    .then(()=> alert('Email de recuperació enviat!'))
    .catch(e=> alert('Error: ' + e.message));
});

btnLogout.addEventListener('click', ()=> {
  auth.signOut().then(()=> {
    professorUID = null;
    currentClassId = null;
    showLogin();
  });
});

auth.onAuthStateChanged(user => {
  if (user) {
    professorUID = user.uid;
    setupAfterAuth(user);
  } else {
    professorUID = null;
    showLogin();
  }
});

function setupAfterAuth(user) {
  showApp();
  const email = user.email || '';
  usuariNom.textContent = email.split('@')[0] || email;

  loadClassesScreen();
}

/* ---------------- Classes screen ---------------- */
btnCreateClass.addEventListener('click', ()=> openModal('modalCreateClass'));

/* ---------------- Load Classes ---------------- */
function loadClassesScreen() {
  if(!professorUID) { alert('Fes login primer.'); return; }
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
  classesGrid.innerHTML = '<div class="col-span-full text-sm text-gray-500">Carregant...</div>';

  const classColors = [
    'from-indigo-600 to-purple-600',
    'from-pink-500 to-red-500',
    'from-yellow-400 to-orange-500',
    'from-green-500 to-teal-500',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-500'
  ];

  db.collection('professors').doc(professorUID).get().then(doc => {
    if(!doc.exists) { classesGrid.innerHTML = '<div class="text-sm text-red-500">Professor no trobat</div>'; return; }
    const ids = doc.data().classes || [];
    if(ids.length === 0){
      classesGrid.innerHTML = `<div class="col-span-full p-6 bg-white dark:bg-gray-800 rounded shadow text-center">No tens cap classe. Crea la primera!</div>`;
      return;
    }

    Promise.all(ids.map(id => db.collection('classes').doc(id).get()))
      .then(docs => {
        classesGrid.innerHTML = '';
        docs.forEach((d, i) => {
          if(!d.exists) return;
          const color = classColors[i % classColors.length];
          const card = document.createElement('div');
          card.className = `class-card bg-gradient-to-br ${color} text-white relative p-4 rounded-lg`;
          card.dataset.id = d.id;

          card.innerHTML = `
            ${deleteMode ? '<input type="checkbox" class="delete-checkbox absolute top-2 right-2 w-5 h-5">' : ''}
            <h3 class="text-lg font-bold">${d.data().nom||'Sense nom'}</h3>
            <p class="text-sm mt-2">${(d.data().alumnes||[]).length} alumnes · ${(d.data().activitats||[]).length} activitats</p>
            <div class="click-hint">${deleteMode ? 'Selecciona per eliminar' : 'Fes clic per obrir'}</div>
          `;
          classesGrid.appendChild(card);

          // Click a la classe
          card.addEventListener('click', e => {
            if(deleteMode){
              const checkbox = card.querySelector('.delete-checkbox');
              checkbox.checked = !checkbox.checked;
            } else {
              openClass(d.id);
            }
          });
        });
      });
  });
}

/* ---------------- Delete Mode ---------------- */
btnDeleteMode.addEventListener('click', ()=> {
  deleteMode = !deleteMode;
  btnDeleteMode.textContent = deleteMode ? 'Eliminar classes' : 'Mode eliminar';
  loadClassesScreen();
});

/* ---------------- Open Class ---------------- */
btnBack.addEventListener('click', ()=> {
  currentClassId = null;
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
});

function openClass(classId){
  currentClassId = classId;
  screenClasses.classList.add('hidden');
  screenClass.classList.remove('hidden');
  loadClassDetails(classId);
}

/* ---------------- Load Class Details ---------------- */
function loadClassDetails(classId){
  studentsList.innerHTML = '<div class="text-sm text-gray-500">Carregant alumnes...</div>';
  notesTbody.innerHTML = '<tr><td colspan="20" class="text-center text-gray-500">Carregant notes...</td></tr>';
  studentsCount.textContent = '';

  db.collection('classes').doc(classId).get().then(doc=>{
    if(!doc.exists) { alert('Classe no trobada'); return; }
    const data = doc.data();
    classStudents = data.alumnes || [];
    classActivities = data.activitats || [];

    renderStudentsList();
    renderNotesTable();
  });
}

/* ---------------- Render Students ---------------- */
function renderStudentsList(){
  if(classStudents.length === 0){
    studentsList.innerHTML = '<div class="text-sm text-gray-500">Cap alumne</div>';
  } else {
    studentsList.innerHTML = '';
    classStudents.forEach((a,i)=>{
      const div = document.createElement('div');
      div.className = 'student-item flex justify-between items-center p-2 border-b hover:bg-gray-50';
      div.dataset.index = i;
      div.innerHTML = `<span>${a.nom}</span>`;
      studentsList.appendChild(div);
    });
  }
  studentsCount.textContent = `${classStudents.length} alumnes`;
}

/* ---------------- Render Notes Table ---------------- */
function renderNotesTable(){
  notesThead.innerHTML = '<tr><th>Alumne</th></tr>';
  notesTbody.innerHTML = '';

  classActivities.forEach(act=>{
    notesThead.querySelector('tr').innerHTML += `<th>${act.nom}</th>`;
  });

  classStudents.forEach((stu, si)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${stu.nom}</td>`;
    classActivities.forEach((act, ai)=>{
      const note = stu.notes && stu.notes[act.id] != null ? stu.notes[act.id] : '';
      tr.innerHTML += `<td><input type="number" min="0" max="10" value="${note}" class="note-input w-16 text-center border rounded px-1 py-0.5" data-student="${si}" data-activity="${ai}"></td>`;
    });
    notesTbody.appendChild(tr);
  });

  // Assign event listener per input
  notesTbody.querySelectorAll('.note-input').forEach(input=>{
    input.addEventListener('change', e=>{
      const si = input.dataset.student;
      const ai = input.dataset.activity;
      const val = parseFloat(input.value);
      if(isNaN(val) || val < 0 || val > 10){ alert('Nota vàlida: 0-10'); return; }
      if(!classStudents[si].notes) classStudents[si].notes = {};
      classStudents[si].notes[classActivities[ai].id] = val;
      saveStudentNote(si);
    });
  });
}

/* ---------------- Save Notes ---------------- */
function saveStudentNote(studentIndex){
  if(currentClassId == null) return;
  const stu = classStudents[studentIndex];
  const updateData = {};
  updateData[`alumnes.${studentIndex}.notes`] = stu.notes || {};
  db.collection('classes').doc(currentClassId).update(updateData)
    .catch(e=>console.error('Error guardant nota:', e));
}

/* ---------------- Modals ---------------- */
modalCreateClassBtn.addEventListener('click', ()=>{
  const nom = document.getElementById('modalCreateClassName').value.trim();
  if(!nom) { alert('Introdueix un nom'); return; }

  const newClassRef = db.collection('classes').doc();
  const newClassData = {
    nom,
    alumnes: [],
    activitats: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  newClassRef.set(newClassData).then(()=>{
    // Afegir a professor
    db.collection('professors').doc(professorUID).update({
      classes: firebase.firestore.FieldValue.arrayUnion(newClassRef.id)
    }).then(()=>{
      closeModal('modalCreateClass');
      loadClassesScreen();
    });
  }).catch(e=> alert('Error creant classe: ' + e.message));
});

/* ---------------- Add Student Modal ---------------- */
btnAddStudent.addEventListener('click', ()=> openModal('modalAddStudent'));
modalAddStudentBtn.addEventListener('click', ()=>{
  const nom = document.getElementById('modalAddStudentName').value.trim();
  if(!nom) { alert('Introdueix un nom'); return; }

  const newStudent = { nom, notes: {} };
  classStudents.push(newStudent);
  db.collection('classes').doc(currentClassId).update({
    alumnes: classStudents
  }).then(()=>{
    closeModal('modalAddStudent');
    renderStudentsList();
    renderNotesTable();
  });
});

/* ---------------- Add Activity Modal ---------------- */
btnAddActivity.addEventListener('click', ()=> openModal('modalAddActivity'));
modalAddActivityBtn.addEventListener('click', ()=>{
  const nom = document.getElementById('modalAddActivityName').value.trim();
  if(!nom) { alert('Introdueix un nom d’activitat'); return; }

  const newActivity = { id: Date.now().toString(), nom };
  classActivities.push(newActivity);

  // Afegir nova activitat a classe
  db.collection('classes').doc(currentClassId).update({
    activitats: classActivities
  }).then(()=>{
    closeModal('modalAddActivity');
    renderNotesTable();
  });
});
/* ---------------- Delete Selected Classes ---------------- */
btnDeleteSelected.addEventListener('click', ()=>{
  if(!deleteMode) return;
  const selectedIds = Array.from(classesGrid.querySelectorAll('.delete-checkbox:checked'))
                          .map(cb => cb.dataset.id);
  if(selectedIds.length === 0) { alert('Selecciona alguna classe'); return; }
  if(!confirm(`Eliminar ${selectedIds.length} classes?`)) return;

  const batch = db.batch();
  selectedIds.forEach(id=>{
    const ref = db.collection('classes').doc(id);
    batch.delete(ref);
    // Opcional: eliminar de professor
    const profRef = db.collection('professors').doc(professorUID);
    batch.update(profRef, { classes: firebase.firestore.FieldValue.arrayRemove(id) });
  });
  batch.commit().then(()=> loadClassesScreen());
});

/* ---------------- Delete Student ---------------- */
function deleteStudent(index){
  if(!confirm('Eliminar alumne?')) return;
  classStudents.splice(index,1);
  db.collection('classes').doc(currentClassId).update({ alumnes: classStudents })
    .then(()=> {
      renderStudentsList();
      renderNotesTable();
    });
}

/* ---------------- Delete Activity ---------------- */
function deleteActivity(index){
  if(!confirm('Eliminar activitat?')) return;
  const actId = classActivities[index].id;
  classActivities.splice(index,1);

  // Eliminar notes associades
  classStudents.forEach(s=>{
    if(s.notes && s.notes[actId] != null) delete s.notes[actId];
  });

  db.collection('classes').doc(currentClassId).update({
    activitats: classActivities,
    alumnes: classStudents
  }).then(()=>{
    renderNotesTable();
  });
}

/* ---------------- Sort Table ---------------- */
notesThead.addEventListener('click', e=>{
  if(e.target.tagName !== 'TH') return;
  const index = Array.from(notesThead.querySelectorAll('th')).indexOf(e.target);
  if(index === 0) return; // Nom alumne
  classStudents.sort((a,b)=>{
    const actId = classActivities[index-1].id;
    const na = a.notes ? a.notes[actId] || 0 : 0;
    const nb = b.notes ? b.notes[actId] || 0 : 0;
    return nb - na; // Descendent
  });
  renderNotesTable();
});

/* ---------------- Export CSV ---------------- */
btnExportCSV.addEventListener('click', ()=>{
  if(classStudents.length === 0) { alert('No hi ha alumnes'); return; }

  let csv = 'Alumne,' + classActivities.map(a=>a.nom).join(',') + '\n';
  classStudents.forEach(s=>{
    const row = [s.nom];
    classActivities.forEach(a=>{
      row.push(s.notes && s.notes[a.id] != null ? s.notes[a.id] : '');
    });
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${screenClass.querySelector('h2').textContent || 'classe'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------------- Badge i Colors ---------------- */
function gradeBadge(note){
  if(note === '') return '';
  if(note >= 9) return '<span class="px-1 py-0.5 rounded bg-green-200 text-green-800 text-xs font-bold">'+note+'</span>';
  if(note >= 7) return '<span class="px-1 py-0.5 rounded bg-yellow-200 text-yellow-800 text-xs font-bold">'+note+'</span>';
  return '<span class="px-1 py-0.5 rounded bg-red-200 text-red-800 text-xs font-bold">'+note+'</span>';
}

function renderNotesTableWithBadges(){
  notesThead.innerHTML = '<tr><th>Alumne</th></tr>';
  notesTbody.innerHTML = '';
  classActivities.forEach(act=>{
    notesThead.querySelector('tr').innerHTML += `<th>${act.nom}</th>`;
  });

  classStudents.forEach((stu, si)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${stu.nom}</td>`;
    classActivities.forEach((act, ai)=>{
      const note = stu.notes && stu.notes[act.id] != null ? stu.notes[act.id] : '';
      tr.innerHTML += `<td>${gradeBadge(note)}</td>`;
    });
    notesTbody.appendChild(tr);
  });
}

/* ---------------- Update Notes and Badges ---------------- */
notesTbody.addEventListener('input', e=>{
  if(!e.target.classList.contains('note-input')) return;
  const si = e.target.dataset.student;
  const ai = e.target.dataset.activity;
  const val = parseFloat(e.target.value);
  if(isNaN(val) || val < 0 || val > 10) { e.target.value = ''; return; }
  if(!classStudents[si].notes) classStudents[si].notes = {};
  classStudents[si].notes[classActivities[ai].id] = val;
  saveStudentNote(si);
  renderNotesTableWithBadges();
});
/* ---------------- Firebase Auth ---------------- */
firebase.auth().onAuthStateChanged(user=>{
  if(user){
    professorUID = user.uid;
    loadProfessorData();
    showScreen('classes');
  } else {
    showScreen('login');
  }
});

loginForm.addEventListener('submit', e=>{
  e.preventDefault();
  const email = loginForm.email.value;
  const pass = loginForm.password.value;
  firebase.auth().signInWithEmailAndPassword(email, pass)
    .catch(err => alert('Error login: ' + err.message));
});

btnLogout.addEventListener('click', ()=>{
  firebase.auth().signOut();
});

/* ---------------- Load Professor Data ---------------- */
function loadProfessorData(){
  db.collection('professors').doc(professorUID).get()
    .then(doc=>{
      if(!doc.exists){
        db.collection('professors').doc(professorUID).set({ classes: [] });
      }
      professorData = doc.data();
      loadClassesScreen();
    });
}

/* ---------------- Show/Hide Screens ---------------- */
function showScreen(screen){
  document.querySelectorAll('.screen').forEach(s=>s.style.display='none');
  document.getElementById(screen).style.display='block';
}

/* ---------------- Alerts / Feedback ---------------- */
function showAlert(msg, type='info'){
  const alertBox = document.createElement('div');
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${type}`;
  document.body.appendChild(alertBox);
  setTimeout(()=>alertBox.remove(), 3000);
}

/* ---------------- Create Class ---------------- */
createClassForm.addEventListener('submit', e=>{
  e.preventDefault();
  const nom = createClassForm.className.value.trim();
  if(!nom) { showAlert('Introdueix nom de la classe','error'); return; }

  db.collection('classes').add({
    nom: nom,
    professor: professorUID,
    alumnes: [],
    activitats: []
  }).then(doc=>{
    db.collection('professors').doc(professorUID)
      .update({ classes: firebase.firestore.FieldValue.arrayUnion(doc.id) });
    showAlert('Classe creada','success');
    loadClassesScreen();
    createClassForm.reset();
  });
});

/* ---------------- Load Classes Screen ---------------- */
function loadClassesScreen(){
  classesGrid.innerHTML = '';
  if(!professorData || !professorData.classes) return;

  professorData.classes.forEach(cid=>{
    db.collection('classes').doc(cid).get()
      .then(doc=>{
        if(!doc.exists) return;
        const cls = doc.data();
        const div = document.createElement('div');
        div.className = 'class-card';
        div.innerHTML = `<h3>${cls.nom}</h3>
                         <button onclick="openClass('${doc.id}')">Obrir</button>
                         <input type="checkbox" class="delete-checkbox" data-id="${doc.id}">`;
        classesGrid.appendChild(div);
      });
  });
}

/* ---------------- Open Class ---------------- */
function openClass(classId){
  currentClassId = classId;
  db.collection('classes').doc(classId).get()
    .then(doc=>{
      const cls = doc.data();
      classStudents = cls.alumnes || [];
      classActivities = cls.activitats || [];
      screenClass.querySelector('h2').textContent = cls.nom;
      renderStudentsList();
      renderNotesTableWithBadges();
      showScreen('class');
    });
}
/* ---------------- Add Student ---------------- */
addStudentForm.addEventListener('submit', e=>{
  e.preventDefault();
  const name = addStudentForm.studentName.value.trim();
  if(!name){ showAlert('Introdueix el nom de l’alumne','error'); return; }

  classStudents.push({ nom: name, notes: [] });
  updateClassFirestore().then(()=>{
    showAlert('Alumne afegit','success');
    addStudentForm.reset();
    renderStudentsList();
  });
});

/* ---------------- Render Students List ---------------- */
function renderStudentsList(){
  studentsList.innerHTML = '';
  classStudents.forEach((alum, i)=>{
    const li = document.createElement('li');
    li.textContent = alum.nom;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = ()=>removeStudent(i);
    li.appendChild(delBtn);
    studentsList.appendChild(li);
  });
}

/* ---------------- Remove Student ---------------- */
function removeStudent(index){
  if(!confirm('Segur que vols eliminar aquest alumne?')) return;
  classStudents.splice(index,1);
  updateClassFirestore().then(()=>{
    showAlert('Alumne eliminat','success');
    renderStudentsList();
  });
}

/* ---------------- Add Activity ---------------- */
addActivityForm.addEventListener('submit', e=>{
  e.preventDefault();
  const title = addActivityForm.activityTitle.value.trim();
  if(!title){ showAlert('Introdueix el nom de l’activitat','error'); return; }

  classActivities.push({ títol: title, data: new Date().toISOString() });
  updateClassFirestore().then(()=>{
    showAlert('Activitat afegida','success');
    addActivityForm.reset();
    renderActivitiesList();
  });
});

/* ---------------- Render Activities List ---------------- */
function renderActivitiesList(){
  activitiesList.innerHTML = '';
  classActivities.forEach((act, i)=>{
    const li = document.createElement('li');
    li.textContent = act.títol;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = ()=>removeActivity(i);
    li.appendChild(delBtn);
    activitiesList.appendChild(li);
  });
}

/* ---------------- Remove Activity ---------------- */
function removeActivity(index){
  if(!confirm('Segur que vols eliminar aquesta activitat?')) return;
  classActivities.splice(index,1);
  updateClassFirestore().then(()=>{
    showAlert('Activitat eliminada','success');
    renderActivitiesList();
  });
}

/* ---------------- Update Firestore ---------------- */
function updateClassFirestore(){
  if(!currentClassId) return Promise.reject('No hi ha classe oberta');
  return db.collection('classes').doc(currentClassId).update({
    alumnes: classStudents,
    activitats: classActivities
  });
}

/* ---------------- Realtime Updates ---------------- */
db.collection('classes').doc(currentClassId)
  .onSnapshot(doc=>{
    const cls = doc.data();
    if(!cls) return;
    classStudents = cls.alumnes || [];
    classActivities = cls.activitats || [];
    renderStudentsList();
    renderActivitiesList();
  });
/* ---------------- Add/Edit Grades ---------------- */
studentsList.addEventListener('click', e=>{
  if(e.target.tagName !== 'LI') return;
  const index = Array.from(studentsList.children).indexOf(e.target);
  const alum = classStudents[index];
  const grade = prompt(`Introdueix la nota de ${alum.nom} (0-10)`);
  const numGrade = parseFloat(grade);
  if(isNaN(numGrade) || numGrade < 0 || numGrade > 10){
    showAlert('Nota invàlida','error');
    return;
  }
  alum.notes.push(numGrade);
  updateClassFirestore().then(()=>{
    showAlert('Nota afegida','success');
    renderStudentsList();
  });
});

/* ---------------- Calculate Badge ---------------- */
function calculateBadge(notes){
  if(!notes.length) return '';
  const avg = notes.reduce((a,b)=>a+b,0)/notes.length;
  if(avg >= 9) return '🏆 Excel·lent';
  if(avg >= 7) return '🎖 Bé';
  if(avg >= 5) return '👍 Acceptable';
  return '⚠️ Millorar';
}

/* ---------------- Render Students with Badges ---------------- */
function renderStudentsList(){
  studentsList.innerHTML = '';
  classStudents.forEach((alum, i)=>{
    const li = document.createElement('li');
    const badge = calculateBadge(alum.notes);
    li.textContent = `${alum.nom} ${badge}`;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = ()=>removeStudent(i);
    li.appendChild(delBtn);
    studentsList.appendChild(li);
  });
}

/* ---------------- Activities Summary ---------------- */
function renderActivitiesSummary(){
  activitiesSummary.innerHTML = '';
  classActivities.forEach(act=>{
    const li = document.createElement('li');
    li.textContent = `${act.títol} - Data: ${new Date(act.data).toLocaleDateString()}`;
    activitiesSummary.appendChild(li);
  });
}

/* ---------------- Class Statistics ---------------- */
function renderClassStatistics(){
  const allNotes = classStudents.flatMap(alum=>alum.notes);
  if(!allNotes.length){
    statsContainer.textContent = 'No hi ha notes encara';
    return;
  }
  const avg = (allNotes.reduce((a,b)=>a+b,0)/allNotes.length).toFixed(2);
  const max = Math.max(...allNotes);
  const min = Math.min(...allNotes);
  statsContainer.textContent = `Mitjana: ${avg}, Màxima: ${max}, Mínima: ${min}`;
}

/* ---------------- Update UI ---------------- */
function updateUI(){
  renderStudentsList();
  renderActivitiesList();
  renderActivitiesSummary();
  renderClassStatistics();
}
/* ---------------- Export Class Data ---------------- */
exportBtn.addEventListener('click', ()=>{
  const dataStr = JSON.stringify({students: classStudents, activities: classActivities}, null, 2);
  const blob = new Blob([dataStr], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${className}_data.json`;
  a.click();
  URL.revokeObjectURL(url);
  showAlert('Dades exportades','success');
});

/* ---------------- Import Class Data ---------------- */
importBtn.addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt=>{
    try{
      const data = JSON.parse(evt.target.result);
      if(data.students) classStudents = data.students;
      if(data.activities) classActivities = data.activities;
      updateClassFirestore().then(()=>{
        updateUI();
        showAlert('Dades importades correctament','success');
      });
    }catch(err){
      showAlert('Error al llegir fitxer','error');
    }
  };
  reader.readAsText(file);
});

/* ---------------- Filter Students ---------------- */
filterStudentInput.addEventListener('input', e=>{
  const term = e.target.value.toLowerCase();
  const filtered = classStudents.filter(alum=>alum.nom.toLowerCase().includes(term));
  studentsList.innerHTML = '';
  filtered.forEach((alum, i)=>{
    const li = document.createElement('li');
    const badge = calculateBadge(alum.notes);
    li.textContent = `${alum.nom} ${badge}`;
    studentsList.appendChild(li);
  });
});

/* ---------------- Filter Activities ---------------- */
filterActivityInput.addEventListener('input', e=>{
  const term = e.target.value.toLowerCase();
  const filtered = classActivities.filter(act=>act.títol.toLowerCase().includes(term));
  activitiesList.innerHTML = '';
  filtered.forEach(act=>{
    const li = document.createElement('li');
    li.textContent = `${act.títol} - Data: ${new Date(act.data).toLocaleDateString()}`;
    activitiesList.appendChild(li);
  });
});

/* ---------------- Dynamic Search ---------------- */
searchInput.addEventListener('input', e=>{
  const term = e.target.value.toLowerCase();
  studentsList.querySelectorAll('li').forEach(li=>{
    li.style.display = li.textContent.toLowerCase().includes(term)?'':'none';
  });
  activitiesList.querySelectorAll('li').forEach(li=>{
    li.style.display = li.textContent.toLowerCase().includes(term)?'':'none';
  });
});
/* ---------------- Show Alerts ---------------- */
function showAlert(msg, type='info', duration=3000){
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = msg;
  document.body.appendChild(alertDiv);
  setTimeout(()=>{
    alertDiv.remove();
  }, duration);
}

/* ---------------- Initialize App ---------------- */
function initApp(){
  // Load class data from Firestore
  loadClassFirestore().then(()=>{
    updateUI();
    showAlert('Aplicació carregada correctament','success');
  }).catch(err=>{
    console.error(err);
    showAlert('Error carregant dades de la classe','error');
  });

  // Event listeners already set up in previous parts
  // e.g., addStudentBtn, addActivityBtn, exportBtn, importBtn, searchInput, filters
}

/* ---------------- Update UI ---------------- */
function updateUI(){
  // Update student list
  studentsList.innerHTML = '';
  classStudents.forEach(alum=>{
    const li = document.createElement('li');
    const badge = calculateBadge(alum.notes);
    li.textContent = `${alum.nom} ${badge}`;
    studentsList.appendChild(li);
  });

  // Update activities list
  activitiesList.innerHTML = '';
  classActivities.forEach(act=>{
    const li = document.createElement('li');
    li.textContent = `${act.títol} - Data: ${new Date(act.data).toLocaleDateString()}`;
    activitiesList.appendChild(li);
  });
}

/* ---------------- Calculate Badge ---------------- */
function calculateBadge(notes){
  if(!notes || notes.length === 0) return '';
  const avg = notes.reduce((a,b)=>a+b,0)/notes.length;
  if(avg >= 9) return '🌟';
  if(avg >= 7) return '✅';
  if(avg >= 5) return '⚠️';
  return '❌';
}

/* ---------------- Load & Update Firestore ---------------- */
async function loadClassFirestore(){
  // Simulated fetch from Firestore
  const data = await fakeFirestoreFetch();
  classStudents = data.students || [];
  classActivities = data.activities || [];
}

async function updateClassFirestore(){
  // Simulated update to Firestore
  await fakeFirestoreUpdate({students: classStudents, activities: classActivities});
}

/* ---------------- Fake Firestore Simulation ---------------- */
function fakeFirestoreFetch(){
  return new Promise(resolve=>{
    setTimeout(()=>{
      resolve({students: [], activities: []});
    }, 500);
  });
}

function fakeFirestoreUpdate(data){
  return new Promise(resolve=>{
    setTimeout(()=>{
      resolve(true);
    }, 500);
  });
}

/* ---------------- Start App ---------------- */
document.addEventListener('DOMContentLoaded', initApp);

