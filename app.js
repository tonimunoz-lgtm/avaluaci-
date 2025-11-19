// app.js - lògica principal (modules)
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
let currentCalcActivityId = null; // Activitat actual per fer càlculs
// --- Model de dades: llista d'alumnes i activitats ---
let tableData = [
  // exemple inicial
  { student: 'Anna', activity1: 5, activity2: 7, formula: null },
  { student: 'Pere', activity1: 6, activity2: 8, formula: null },
];

/* Elements */
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const usuariNom = document.getElementById('usuariNom');

const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const btnRecover = document.getElementById('btnRecover');
const btnLogout = document.getElementById('btnLogout');
const btnCreateClass = document.getElementById('btnCreateClass');

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

const btnImportAL = document.getElementById('btnImportAL');
btnImportAL.addEventListener('click', () => {
  openModal('modalImportAL');
});

// Mobile: toggle students overlay
const btnToggleStudentsMobile = document.getElementById('btnToggleStudentsMobile');
const btnCloseStudentsMobile = document.getElementById('btnCloseStudentsMobile');

if (btnToggleStudentsMobile) {
  btnToggleStudentsMobile.addEventListener('click', () => {
    const cont = document.getElementById('studentsListContainer');
    if (!cont) return;
    cont.classList.add('mobile-open');
  });
}

if (btnCloseStudentsMobile) {
  btnCloseStudentsMobile.addEventListener('click', () => {
    const cont = document.getElementById('studentsListContainer');
    if (!cont) return;
    cont.classList.remove('mobile-open');
  });
}

// També tancar si cliques a fora del card (overlay)
// detectem clicks al container però fora de .students-card
document.getElementById('studentsListContainer')?.addEventListener('click', (e) => {
  if (e.target.id === 'studentsListContainer') {
    document.getElementById('studentsListContainer').classList.remove('mobile-open');
  }
});

// MOBILE — OBRIR LLISTA ALUMNES
const btnMobile = document.getElementById("btnToggleStudentsMobile");
const cont = document.getElementById("studentsListContainer");

if (btnMobile) {
  btnMobile.addEventListener("click", () => {
    cont.classList.add("mobile-open");
  });
}

// TANCAR FENT CLIC FORA DEL PANELL BLANC
cont?.addEventListener("click", (e) => {
  if (e.target === cont) {
    cont.classList.remove("mobile-open");
  }
});

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

function recalcFormulas() {
  tableData.forEach(row => {
    // exemple: mitjana d'activitats 1 i 2 amb redondeig
    row.formula = Math.round((row.activity1 + row.activity2) / 2);
  });
}

function renderTable() {
  const tbody = document.querySelector('#notesTable tbody');
  tbody.innerHTML = ''; // netegem contingut actual

  tableData.forEach((row, i) => {
    const tr = document.createElement('tr');

    // Nom alumne
    const tdName = document.createElement('td');
    tdName.textContent = row.student;
    tr.appendChild(tdName);

    // Activitat 1
    const tdAct1 = document.createElement('td');
    const input1 = document.createElement('input');
    input1.type = 'number';
    input1.value = row.activity1;
    input1.classList.add('table-input');
    input1.dataset.row = i;
    input1.dataset.col = 'activity1';
    tdAct1.appendChild(input1);
    tr.appendChild(tdAct1);

    // Activitat 2
    const tdAct2 = document.createElement('td');
    const input2 = document.createElement('input');
    input2.type = 'number';
    input2.value = row.activity2;
    input2.classList.add('table-input');
    input2.dataset.row = i;
    input2.dataset.col = 'activity2';
    tdAct2.appendChild(input2);
    tr.appendChild(tdAct2);

    // Fórmula / mitjana
    const tdFormula = document.createElement('td');
    tdFormula.textContent = row.formula ?? '';
    tr.appendChild(tdFormula);

    tbody.appendChild(tr);
  });

  attachInputListeners();
}

function attachInputListeners() {
  document.querySelectorAll('.table-input').forEach(input => {
    input.oninput = (e) => {
      const row = e.target.dataset.row;
      const col = e.target.dataset.col;
      tableData[row][col] = Number(e.target.value);
      recalcFormulas();
      renderTable();
    };
  });
}
/* ---------------- LOGIN / REGISTER ---------------- */
btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    professorUID = userCredential.user.uid;
    usuariNom.textContent = userCredential.user.email;
    showApp();
    loadClasses();
  } catch (err) {
    alert('Error login: ' + err.message);
  }
});

btnRegister.addEventListener('click', async () => {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    professorUID = userCredential.user.uid;
    usuariNom.textContent = userCredential.user.email;
    showApp();
    loadClasses();
  } catch (err) {
    alert('Error registre: ' + err.message);
  }
});

btnRecover.addEventListener('click', async () => {
  const email = document.getElementById('recoverEmail').value;
  try {
    await auth.sendPasswordResetEmail(email);
    alert('Email de recuperació enviat.');
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

btnLogout.addEventListener('click', async () => {
  await auth.signOut();
  professorUID = null;
  showLogin();
});

/* ---------------- CLASSES MANAGEMENT ---------------- */
async function loadClasses() {
  screenClasses.innerHTML = '';
  const snapshot = await db.collection('classes')
    .where('professor', '==', professorUID)
    .get();
  snapshot.forEach(doc => {
    const cls = doc.data();
    const div = document.createElement('div');
    div.classList.add('class-card');
    div.textContent = cls.name;
    div.dataset.id = doc.id;
    div.addEventListener('click', () => openClass(doc.id));
    screenClasses.appendChild(div);
  });
}

btnCreateClass.addEventListener('click', () => openModal('modalCreateClass'));

modalCreateClassBtn.addEventListener('click', async () => {
  const className = document.getElementById('modalCreateClassName').value;
  if (!className) return alert('Especifica un nom de classe');
  try {
    const docRef = await db.collection('classes').add({
      name: className,
      professor: professorUID,
      students: [],
      activities: []
    });
    currentClassId = docRef.id;
    closeModal('modalCreateClass');
    loadClasses();
    openClass(currentClassId);
  } catch (err) {
    alert('Error crear classe: ' + err.message);
  }
});

/* ---------------- OPEN CLASS ---------------- */
async function openClass(classId) {
  currentClassId = classId;
  screenClasses.style.display = 'none';
  screenClass.style.display = 'block';

  const doc = await db.collection('classes').doc(classId).get();
  const cls = doc.data();
  classStudents = cls.students || [];
  classActivities = cls.activities || [];

  renderStudentsList();
  renderActivitiesTable();
}

/* ---------------- STUDENTS ---------------- */
function renderStudentsList() {
  studentsList.innerHTML = '';
  classStudents.forEach((student, i) => {
    const li = document.createElement('li');
    li.textContent = student.name;
    li.dataset.index = i;
    if (deleteMode) li.classList.add('delete-mode');
    li.addEventListener('click', () => {
      if (deleteMode) deleteStudent(i);
    });
    studentsList.appendChild(li);
  });
  studentsCount.textContent = classStudents.length;
}

btnAddStudent.addEventListener('click', () => openModal('modalAddStudent'));

modalAddStudentBtn.addEventListener('click', async () => {
  const name = document.getElementById('modalAddStudentName').value;
  if (!name) return alert('Nom requerit');
  const student = { name };
  classStudents.push(student);
  await db.collection('classes').doc(currentClassId).update({ students: classStudents });
  renderStudentsList();
  closeModal('modalAddStudent');
});

function deleteStudent(index) {
  confirmAction('Segur que vols eliminar aquest alumne?', async () => {
    classStudents.splice(index, 1);
    await db.collection('classes').doc(currentClassId).update({ students: classStudents });
    renderStudentsList();
  });
}

/* ---------------- ACTIVITIES ---------------- */
function renderActivitiesTable() {
  // Cabecera
  notesThead.innerHTML = '';
  const trHead = document.createElement('tr');
  trHead.appendChild(document.createElement('th')); // Nom alumne
  classActivities.forEach(act => {
    const th = document.createElement('th');
    th.textContent = act.name;
    trHead.appendChild(th);
  });
  const thFormula = document.createElement('th');
  thFormula.textContent = 'Mitjana';
  trHead.appendChild(thFormula);
  notesThead.appendChild(trHead);

  // Cos
  notesTbody.innerHTML = '';
  classStudents.forEach((student, i) => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = student.name;
    tr.appendChild(tdName);

    classActivities.forEach((act, j) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.value = student.notes?.[act.id] ?? '';
      input.dataset.student = i;
      input.dataset.activity = j;
      input.addEventListener('input', (e) => {
        const sIndex = e.target.dataset.student;
        const aIndex = e.target.dataset.activity;
        if (!classStudents[sIndex].notes) classStudents[sIndex].notes = {};
        classStudents[sIndex].notes[classActivities[aIndex].id] = Number(e.target.value);
        recalcStudentAverage(sIndex);
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdAvg = document.createElement('td');
    tdAvg.textContent = calculateStudentAverage(i);
    tr.appendChild(tdAvg);

    notesTbody.appendChild(tr);
  });
}

function recalcStudentAverage(studentIndex) {
  const avg = calculateStudentAverage(studentIndex);
  const tr = notesTbody.children[studentIndex];
  const tdAvg = tr.lastChild;
  tdAvg.textContent = avg;
}

function calculateStudentAverage(studentIndex) {
  const student = classStudents[studentIndex];
  if (!student.notes) return '';
  const values = Object.values(student.notes);
  if (values.length === 0) return '';
  const sum = values.reduce((a, b) => a + b, 0);
  return (sum / values.length).toFixed(2);
}

btnAddActivity.addEventListener('click', () => openModal('modalAddActivity'));

modalAddActivityBtn.addEventListener('click', async () => {
  const name = document.getElementById('modalAddActivityName').value;
  if (!name) return alert('Nom requerit');
  const activity = { id: Date.now().toString(), name };
  classActivities.push(activity);
  await db.collection('classes').doc(currentClassId).update({ activities: classActivities });
  renderActivitiesTable();
  closeModal('modalAddActivity');
});
/* ---------------- DELETE MODE FOR STUDENTS ---------------- */
btnDeleteMode.addEventListener('click', () => {
  deleteMode = !deleteMode;
  renderStudentsList();
  btnDeleteMode.textContent = deleteMode ? 'Sortir mode eliminar' : 'Mode eliminar';
});

/* ---------------- MODAL UTILS ---------------- */
function openModal(id) {
  document.getElementById(id).style.display = 'block';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

/* ---------------- CONFIRMATION UTILS ---------------- */
function confirmAction(message, callback) {
  if (confirm(message)) callback();
}

/* ---------------- SAVE ALL NOTES ---------------- */
btnSaveNotes.addEventListener('click', async () => {
  try {
    const updateData = {
      students: classStudents,
      activities: classActivities
    };
    await db.collection('classes').doc(currentClassId).update(updateData);
    alert('Notes i activitats guardades correctament!');
  } catch (err) {
    alert('Error guardar dades: ' + err.message);
  }
});

/* ---------------- IMPORT / EXPORT ---------------- */
btnExportClass.addEventListener('click', () => {
  if (!currentClassId) return alert('Obre una classe primer');
  const dataStr = JSON.stringify({ students: classStudents, activities: classActivities });
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `classe_${currentClassId}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

btnImportClass.addEventListener('click', () => {
  fileImport.click();
});

fileImport.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!data.students || !data.activities) throw new Error('Format incorrecte');
    classStudents = data.students;
    classActivities = data.activities;
    await db.collection('classes').doc(currentClassId).update({ students: classStudents, activities: classActivities });
    renderStudentsList();
    renderActivitiesTable();
    alert('Classe importada correctament!');
  } catch (err) {
    alert('Error importar classe: ' + err.message);
  }
});

/* ---------------- SEARCH / FILTER ---------------- */
searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  const filtered = classStudents.filter(s => s.name.toLowerCase().includes(term));
  studentsList.innerHTML = '';
  filtered.forEach((student, i) => {
    const li = document.createElement('li');
    li.textContent = student.name;
    li.dataset.index = i;
    if (deleteMode) li.classList.add('delete-mode');
    li.addEventListener('click', () => {
      if (deleteMode) deleteStudent(i);
    });
    studentsList.appendChild(li);
  });
  studentsCount.textContent = filtered.length;
});

/* ---------------- FORMULAS ---------------- */
btnEditFormula.addEventListener('click', () => {
  const formula = prompt('Introdueix fórmula (p. ex. (nota1+nota2)/2)');
  if (!formula) return;
  currentFormula = formula;
  renderAllAverages();
});

function renderAllAverages() {
  classStudents.forEach((s, i) => recalcStudentAverage(i));
}

/* ---------------- EXPORT TO CSV ---------------- */
btnExportCSV.addEventListener('click', () => {
  let csv = 'Nom';
  classActivities.forEach(act => csv += `,${act.name}`);
  csv += ',Mitjana\n';

  classStudents.forEach(student => {
    csv += student.name;
    classActivities.forEach(act => {
      const note = student.notes?.[act.id] ?? '';
      csv += `,${note}`;
    });
    const avg = calculateStudentAverage(classStudents.indexOf(student));
    csv += `,${avg}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `classe_${currentClassId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------------- IMPORT FROM CSV ---------------- */
fileImportCSV.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const header = lines[0].split(',');
  const activitiesFromCSV = header.slice(1, -1).map((name, idx) => ({ id: Date.now().toString() + idx, name }));
  const studentsFromCSV = lines.slice(1).map(line => {
    const cols = line.split(',');
    const name = cols[0];
    const notes = {};
    cols.slice(1, -1).forEach((val, i) => {
      notes[activitiesFromCSV[i].id] = Number(val) || 0;
    });
    return { name, notes };
  });
  classActivities = activitiesFromCSV;
  classStudents = studentsFromCSV;
  await db.collection('classes').doc(currentClassId).update({ students: classStudents, activities: classActivities });
  renderStudentsList();
  renderActivitiesTable();
  alert('CSV importat correctament!');
});
/* ---------------- STUDENT AVERAGE CALCULATION ---------------- */
function calculateStudentAverage(studentIndex) {
  const student = classStudents[studentIndex];
  if (!student || !currentFormula) return 0;

  let formula = currentFormula;
  classActivities.forEach((act, idx) => {
    const note = student.notes?.[act.id] ?? 0;
    const re = new RegExp(`nota${idx + 1}`, 'g');
    formula = formula.replace(re, note);
  });

  try {
    const avg = eval(formula);
    return Math.round(avg * 100) / 100; // round to 2 decimals
  } catch (err) {
    console.error('Error calculant mitjana:', err);
    return 0;
  }
}

function recalcStudentAverage(studentIndex) {
  const avg = calculateStudentAverage(studentIndex);
  const row = document.querySelector(`#studentsTable tr[data-index='${studentIndex}']`);
  if (row) {
    const avgCell = row.querySelector('.cell-average');
    if (avgCell) avgCell.textContent = avg;
  }
}

/* ---------------- RENDER STUDENTS TABLE ---------------- */
function renderStudentsList() {
  studentsList.innerHTML = '';
  classStudents.forEach((student, i) => {
    const li = document.createElement('li');
    li.textContent = student.name;
    li.dataset.index = i;
    if (deleteMode) li.classList.add('delete-mode');
    li.addEventListener('click', () => {
      if (deleteMode) deleteStudent(i);
    });
    studentsList.appendChild(li);
  });
  studentsCount.textContent = classStudents.length;
}

/* ---------------- DELETE STUDENT ---------------- */
function deleteStudent(index) {
  confirmAction('Segur que vols eliminar aquest alumne?', async () => {
    classStudents.splice(index, 1);
    await db.collection('classes').doc(currentClassId).update({ students: classStudents });
    renderStudentsList();
    renderActivitiesTable();
  });
}

/* ---------------- RENDER ACTIVITIES TABLE ---------------- */
function renderActivitiesTable() {
  const table = document.getElementById('studentsTable');
  table.innerHTML = '';
  const header = document.createElement('tr');
  header.innerHTML = '<th>Nom</th>';
  classActivities.forEach(act => header.innerHTML += `<th>${act.name}</th>`);
  header.innerHTML += '<th>Mitjana</th>';
  table.appendChild(header);

  classStudents.forEach((student, sIndex) => {
    const row = document.createElement('tr');
    row.dataset.index = sIndex;
    row.innerHTML = `<td>${student.name}</td>`;
    classActivities.forEach(act => {
      const note = student.notes?.[act.id] ?? '';
      row.innerHTML += `<td contenteditable="true" class="cell-note" data-actid="${act.id}">${note}</td>`;
    });
    row.innerHTML += `<td class="cell-average">${calculateStudentAverage(sIndex)}</td>`;
    table.appendChild(row);
  });

  attachNoteListeners();
}

/* ---------------- NOTE INPUT LISTENERS ---------------- */
function attachNoteListeners() {
  const noteCells = document.querySelectorAll('.cell-note');
  noteCells.forEach(cell => {
    cell.addEventListener('input', async (e) => {
      const row = cell.parentElement;
      const studentIndex = Number(row.dataset.index);
      const actId = cell.dataset.actid;
      const value = parseFloat(cell.textContent) || 0;

      classStudents[studentIndex].notes = classStudents[studentIndex].notes || {};
      classStudents[studentIndex].notes[actId] = value;

      recalcStudentAverage(studentIndex);
      await db.collection('classes').doc(currentClassId).update({ students: classStudents });
    });
  });
}

/* ---------------- ADD ACTIVITY ---------------- */
btnAddActivity.addEventListener('click', async () => {
  const name = prompt('Nom de l’activitat:');
  if (!name) return;
  const id = Date.now().toString();
  classActivities.push({ id, name });
  classStudents.forEach(s => {
    s.notes = s.notes || {};
    s.notes[id] = 0;
  });
  await db.collection('classes').doc(currentClassId).update({ activities: classActivities, students: classStudents });
  renderActivitiesTable();
});

/* ---------------- DELETE ACTIVITY ---------------- */
function deleteActivity(index) {
  confirmAction('Segur que vols eliminar aquesta activitat?', async () => {
    const actId = classActivities[index].id;
    classActivities.splice(index, 1);
    classStudents.forEach(s => {
      if (s.notes) delete s.notes[actId];
    });
    await db.collection('classes').doc(currentClassId).update({ activities: classActivities, students: classStudents });
    renderActivitiesTable();
  });
}
/* ---------------- FORMULA MANAGEMENT ---------------- */
function setFormula(newFormula) {
  currentFormula = newFormula;
  localStorage.setItem(`formula_${currentClassId}`, newFormula);
  recalcAllAverages();
}

function recalcAllAverages() {
  classStudents.forEach((_, i) => recalcStudentAverage(i));
}

btnSetFormula.addEventListener('click', () => {
  const formula = prompt('Introdueix la fórmula (usa nota1, nota2, ...):', currentFormula || '');
  if (formula) setFormula(formula);
});

/* ---------------- IMPORT/EXPORT STUDENTS ---------------- */
btnImportStudents.addEventListener('click', async () => {
  const csv = prompt('Introdueix els alumnes separats per comes (nom1,nom2,...):');
  if (!csv) return;
  const names = csv.split(',').map(n => n.trim()).filter(n => n);
  names.forEach(name => classStudents.push({ name, notes: {} }));
  await db.collection('classes').doc(currentClassId).update({ students: classStudents });
  renderStudentsList();
  renderActivitiesTable();
});

btnExportStudents.addEventListener('click', () => {
  const csv = classStudents.map(s => s.name).join(',');
  prompt('Copia els alumnes:', csv);
});

/* ---------------- IMPORT/EXPORT ACTIVITIES ---------------- */
btnImportActivities.addEventListener('click', async () => {
  const csv = prompt('Introdueix les activitats separades per comes (act1,act2,...):');
  if (!csv) return;
  const names = csv.split(',').map(n => n.trim()).filter(n => n);
  names.forEach(name => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    classActivities.push({ id, name });
    classStudents.forEach(s => s.notes = s.notes || {});
  });
  await db.collection('classes').doc(currentClassId).update({ activities: classActivities, students: classStudents });
  renderActivitiesTable();
});

btnExportActivities.addEventListener('click', () => {
  const csv = classActivities.map(a => a.name).join(',');
  prompt('Copia les activitats:', csv);
});

/* ---------------- CONFIRM ACTION ---------------- */
function confirmAction(message, callback) {
  if (confirm(message)) callback();
}

/* ---------------- DELETE MODE TOGGLE ---------------- */
btnToggleDeleteMode.addEventListener('click', () => {
  deleteMode = !deleteMode;
  studentsList.classList.toggle('delete-mode', deleteMode);
});

/* ---------------- INITIALIZATION ---------------- */
async function initClass(classId) {
  currentClassId = classId;
  const doc = await db.collection('classes').doc(classId).get();
  if (!doc.exists) return alert('Classe no trobada');

  const data = doc.data();
  classStudents = data.students || [];
  classActivities = data.activities || [];
  currentFormula = localStorage.getItem(`formula_${classId}`) || '';

  renderStudentsList();
  renderActivitiesTable();
}

document.addEventListener('DOMContentLoaded', () => {
  // Example: initClass('classe1');
  renderStudentsList();
  renderActivitiesTable();
});
/* ---------------- FILTER AND SEARCH ---------------- */
inputSearchStudents.addEventListener('input', () => {
  const query = inputSearchStudents.value.toLowerCase();
  classStudents.forEach((student, index) => {
    const row = document.getElementById(`student-${index}`);
    if (!row) return;
    row.style.display = student.name.toLowerCase().includes(query) ? '' : 'none';
  });
});

/* ---------------- SORT STUDENTS ---------------- */
btnSortStudents.addEventListener('click', () => {
  classStudents.sort((a, b) => a.name.localeCompare(b.name));
  renderStudentsList();
});

/* ---------------- SORT ACTIVITIES ---------------- */
btnSortActivities.addEventListener('click', () => {
  classActivities.sort((a, b) => a.name.localeCompare(b.name));
  renderActivitiesTable();
});

/* ---------------- BULK UPDATE NOTES ---------------- */
btnBulkUpdateNotes.addEventListener('click', () => {
  const value = prompt('Introdueix la nota per a tots els alumnes en aquesta activitat:');
  if (!value || isNaN(value)) return alert('Nota invàlida');
  const actId = prompt('Introdueix l’ID de l’activitat:');
  classStudents.forEach(student => student.notes[actId] = Number(value));
  recalcAllAverages();
});

/* ---------------- HIGHLIGHT FAILING STUDENTS ---------------- */
btnHighlightFailing.addEventListener('click', () => {
  classStudents.forEach((student, index) => {
    const row = document.getElementById(`student-${index}`);
    const avg = studentAverage(student);
    if (!row) return;
    if (avg < 5) row.classList.add('failing');
    else row.classList.remove('failing');
  });
});

/* ---------------- CUSTOM STYLES ---------------- */
btnToggleDarkMode.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

btnToggleHighlightMode.addEventListener('click', () => {
  document.body.classList.toggle('highlight-mode');
});

/* ---------------- ACTIVITY STATISTICS ---------------- */
function activityAverage(activityId) {
  const notes = classStudents.map(s => s.notes[activityId]).filter(n => n != null);
  if (!notes.length) return 0;
  const sum = notes.reduce((a, b) => a + b, 0);
  return sum / notes.length;
}

btnShowActivityStats.addEventListener('click', () => {
  const activityId = prompt('Introdueix l’ID de l’activitat:');
  const avg = activityAverage(activityId);
  alert(`La nota mitjana per a l’activitat és: ${avg.toFixed(2)}`);
});

/* ---------------- EXPORT FULL DATA ---------------- */
btnExportFullData.addEventListener('click', () => {
  const data = { students: classStudents, activities: classActivities, formula: currentFormula };
  const json = JSON.stringify(data, null, 2);
  prompt('Copia el JSON complet:', json);
});

/* ---------------- IMPORT FULL DATA ---------------- */
btnImportFullData.addEventListener('click', async () => {
  const json = prompt('Introdueix el JSON complet de la classe:');
  if (!json) return;
  try {
    const data = JSON.parse(json);
    classStudents = data.students || [];
    classActivities = data.activities || [];
    currentFormula = data.formula || '';
    await db.collection('classes').doc(currentClassId).update({ students: classStudents, activities: classActivities });
    renderStudentsList();
    renderActivitiesTable();
  } catch (err) {
    alert('JSON invàlid');
  }
});
/* ---------------- EXPORT TO CSV ---------------- */
btnExportCSV.addEventListener('click', () => {
  let csv = 'Nom,';
  classActivities.forEach(act => csv += `${act.name},`);
  csv += 'Mitjana\n';

  classStudents.forEach(student => {
    csv += `${student.name},`;
    classActivities.forEach(act => {
      const note = student.notes[act.id] != null ? student.notes[act.id] : '';
      csv += `${note},`;
    });
    csv += `${studentAverage(student).toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'classe.csv';
  link.click();
});

/* ---------------- IMPORT FROM CSV ---------------- */
btnImportCSV.addEventListener('click', async () => {
  const file = inputCSV.files[0];
  if (!file) return alert('Cap fitxer seleccionat');
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const headers = lines[0].split(',').slice(1, -1); // noms activitats

  // Actualitza activitats
  classActivities = headers.map((name, index) => ({ id: `act${index}`, name }));

  // Actualitza alumnes
  classStudents = lines.slice(1).map(line => {
    const cols = line.split(',');
    const student = { name: cols[0], notes: {} };
    cols.slice(1, -1).forEach((val, idx) => {
      if (val) student.notes[`act${idx}`] = Number(val);
    });
    return student;
  });

  renderStudentsList();
  renderActivitiesTable();
});

/* ---------------- CALCULATE FINAL GRADES ---------------- */
function calculateFinalGrades() {
  classStudents.forEach(student => {
    student.finalGrade = studentAverage(student);
  });
  renderStudentsList();
}

/* ---------------- GRAPHICAL VISUALIZATION ---------------- */
function drawGradesChart() {
  const ctx = gradesChart.getContext('2d');
  ctx.clearRect(0, 0, gradesChart.width, gradesChart.height);

  const maxGrade = 10;
  const width = gradesChart.width / classStudents.length;
  
  classStudents.forEach((student, i) => {
    const height = (student.finalGrade / maxGrade) * gradesChart.height;
    ctx.fillStyle = student.finalGrade < 5 ? 'red' : 'green';
    ctx.fillRect(i * width, gradesChart.height - height, width - 2, height);
  });
}

/* ---------------- AUTOMATIC SAVE TO FIRESTORE ---------------- */
async function autoSaveClass() {
  if (!currentClassId) return;
  await db.collection('classes').doc(currentClassId).set({
    students: classStudents,
    activities: classActivities,
    formula: currentFormula
  });
}

/* ---------------- EVENT LISTENER FOR AUTO SAVE ---------------- */
setInterval(autoSaveClass, 60000); // cada 60 segons

/* ---------------- RESET CLASS DATA ---------------- */
btnResetClass.addEventListener('click', () => {
  if (!confirm('Segur que vols esborrar tota la classe?')) return;
  classStudents = [];
  classActivities = [];
  currentFormula = '';
  renderStudentsList();
  renderActivitiesTable();
  if (currentClassId) db.collection('classes').doc(currentClassId).delete();
});

/* ---------------- IMPORT/EXPORT FORMULA ---------------- */
btnExportFormula.addEventListener('click', () => {
  prompt('Copia la fórmula actual:', currentFormula);
});

btnImportFormula.addEventListener('click', () => {
  const formula = prompt('Introdueix la fórmula a aplicar:');
  if (!formula) return;
  currentFormula = formula;
});
/* ---------------- VALIDATE FORMULA ---------------- */
function validateFormula(formula) {
  try {
    const testStudent = { notes: {} };
    classActivities.forEach(act => testStudent.notes[act.id] = 5);
    const result = evalFormula(formula, testStudent);
    if (typeof result !== 'number' || isNaN(result)) throw new Error('Fórmula no vàlida');
    return true;
  } catch (err) {
    alert('Error en la fórmula: ' + err.message);
    return false;
  }
}

/* ---------------- EVAL FORMULA ---------------- */
function evalFormula(formula, student) {
  // Reemplaça cada nom d'activitat per la nota
  let evalString = formula;
  classActivities.forEach(act => {
    const note = student.notes[act.id] != null ? student.notes[act.id] : 0;
    const re = new RegExp(`\\b${act.name}\\b`, 'g');
    evalString = evalString.replace(re, note);
  });
  return Function('"use strict";return (' + evalString + ')')();
}

/* ---------------- APPLY FORMULA ---------------- */
btnApplyFormula.addEventListener('click', () => {
  if (!validateFormula(currentFormula)) return;
  classStudents.forEach(student => {
    student.finalGrade = evalFormula(currentFormula, student);
  });
  renderStudentsList();
  drawGradesChart();
});

/* ---------------- SEARCH STUDENT ---------------- */
inputSearchStudent.addEventListener('input', () => {
  const query = inputSearchStudent.value.toLowerCase();
  classStudents.forEach(student => {
    const row = document.getElementById(`student-${student.name}`);
    if (!row) return;
    row.style.display = student.name.toLowerCase().includes(query) ? '' : 'none';
  });
});

/* ---------------- SORT STUDENTS ---------------- */
function sortStudents(by = 'name') {
  classStudents.sort((a, b) => {
    if (by === 'name') return a.name.localeCompare(b.name);
    if (by === 'finalGrade') return b.finalGrade - a.finalGrade;
  });
  renderStudentsList();
}

/* ---------------- FILTER STUDENTS ---------------- */
function filterStudents(pass = true) {
  classStudents.forEach(student => {
    const row = document.getElementById(`student-${student.name}`);
    if (!row) return;
    row.style.display = pass ? (student.finalGrade >= 5 ? '' : 'none') : (student.finalGrade < 5 ? '' : 'none');
  });
}

/* ---------------- EXPORT TO PDF ---------------- */
btnExportPDF.addEventListener('click', () => {
  const doc = new jsPDF();
  let y = 10;
  doc.setFontSize(12);
  doc.text('Llistat de notes', 10, y);
  y += 10;
  classStudents.forEach(student => {
    const line = `${student.name}: ${student.finalGrade.toFixed(2)}`;
    doc.text(line, 10, y);
    y += 8;
  });
  doc.save('notes.pdf');
});

/* ---------------- IMPORT/EXPORT JSON ---------------- */
btnExportJSON.addEventListener('click', () => {
  const data = { students: classStudents, activities: classActivities, formula: currentFormula };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'classe.json';
  link.click();
});

btnImportJSON.addEventListener('change', async () => {
  const file = btnImportJSON.files[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  classStudents = data.students || [];
  classActivities = data.activities || [];
  currentFormula = data.formula || '';
  renderStudentsList();
  renderActivitiesTable();
  drawGradesChart();
});
/* ---------------- DRAW GRADES CHART ---------------- */
function drawGradesChart() {
  const ctx = document.getElementById('gradesChart').getContext('2d');
  if (window.gradesChartInstance) window.gradesChartInstance.destroy();

  const labels = classStudents.map(s => s.name);
  const data = classStudents.map(s => s.finalGrade);

  window.gradesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nota final',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 10
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/* ---------------- NOTIFICATION SYSTEM ---------------- */
function showNotification(message, type = 'info') {
  const notif = document.createElement('div');
  notif.className = `notification ${type}`;
  notif.innerText = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

/* ---------------- SAVE STATE ---------------- */
function saveState() {
  localStorage.setItem('classStudents', JSON.stringify(classStudents));
  localStorage.setItem('classActivities', JSON.stringify(classActivities));
  localStorage.setItem('currentFormula', currentFormula);
}

/* ---------------- LOAD STATE ---------------- */
function loadState() {
  const students = localStorage.getItem('classStudents');
  const activities = localStorage.getItem('classActivities');
  const formula = localStorage.getItem('currentFormula');

  if (students) classStudents = JSON.parse(students);
  if (activities) classActivities = JSON.parse(activities);
  if (formula) currentFormula = formula;

  renderStudentsList();
  renderActivitiesTable();
  drawGradesChart();
}

/* ---------------- INITIALIZATION ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderActivitiesTable();
  renderStudentsList();
  drawGradesChart();
});

/* ---------------- EVENT LISTENERS FOR SAVING ---------------- */
window.addEventListener('beforeunload', () => {
  saveState();
});

/* ---------------- RESET CLASS DATA ---------------- */
btnResetClass.addEventListener('click', () => {
  if (!confirm('Segur que vols reiniciar totes les dades?')) return;
  classStudents = [];
  classActivities = [];
  currentFormula = '';
  renderStudentsList();
  renderActivitiesTable();
  drawGradesChart();
  localStorage.clear();
  showNotification('Dades reiniciades', 'warning');
});
/* ---------------- EXPORT / IMPORT ---------------- */
btnExportClass.addEventListener('click', () => {
  const data = {
    students: classStudents,
    activities: classActivities,
    formula: currentFormula
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'class_data.json';
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Dades exportades correctament', 'success');
});

btnImportClass.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      classStudents = data.students || [];
      classActivities = data.activities || [];
      currentFormula = data.formula || '';
      renderStudentsList();
      renderActivitiesTable();
      drawGradesChart();
      saveState();
      showNotification('Dades importades correctament', 'success');
    } catch (err) {
      showNotification('Error al importar les dades', 'error');
    }
  };
  reader.readAsText(file);
});

/* ---------------- HELPER FUNCTIONS ---------------- */
function calculateAverage(grades) {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((a, b) => a + b, 0);
  return +(sum / grades.length).toFixed(2);
}

function calculateFinalGrade(student) {
  if (!currentFormula) return 0;
  // currentFormula example: "0.4*activity1 + 0.6*activity2"
  try {
    let formulaStr = currentFormula;
    classActivities.forEach(act => {
      const value = student.grades[act.id] || 0;
      const regex = new RegExp(`\\b${act.id}\\b`, 'g');
      formulaStr = formulaStr.replace(regex, value);
    });
    const finalGrade = Function('"use strict";return (' + formulaStr + ')')();
    return +finalGrade.toFixed(2);
  } catch (err) {
    console.error('Error calculant nota final:', err);
    return 0;
  }
}

/* ---------------- UPDATE FINAL GRADES ---------------- */
function updateAllFinalGrades() {
  classStudents.forEach(student => {
    student.finalGrade = calculateFinalGrade(student);
  });
  drawGradesChart();
}

/* ---------------- END OF SCRIPT ---------------- */
