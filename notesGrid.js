// notesGrid.js
import { db, auth } from './firebase.js';
import { classStudents } from './app.js'; // manté la llista d'alumnes de la classe seleccionada

let currentGrupId = null;
let grupData = null;
let classActivities = [];
let notesTbody, notesThead, notesTfoot, formulaTfoot;

export async function initNotesGrid(grupId) {
  currentGrupId = grupId;

  // Seleccionem els elements DOM
  notesTbody = document.getElementById('notesTbody');
  notesThead = document.getElementById('notesThead');
  notesTfoot = document.getElementById('notesTfoot');
  formulaTfoot = document.getElementById('formulaTfoot');

  // Carreguem les dades del grup
  const grupDoc = await db.collection('grups').doc(grupId).get();
  if (!grupDoc.exists) return alert('Grup no trobat.');
  grupData = grupDoc.data();
  classActivities = grupData.activitats || [];

  renderNotesGrid();
}

export async function renderNotesGrid() {
  if (!currentGrupId) return;

  // ----------------- Capçalera -----------------
  const trHead = document.createElement('tr');
  trHead.innerHTML = '';
  trHead.appendChild(th('Alumne'));
  classActivities.forEach(aid => {
    const actDoc = db.collection('activitats').doc(aid).get();
    actDoc.then(doc => {
      const td = th(doc.exists ? doc.data().nom : '???');
      trHead.appendChild(td);
    });
  });
  trHead.appendChild(th('Mitjana'));
  notesThead.innerHTML = '';
  notesThead.appendChild(trHead);

  // ----------------- Files alumnes -----------------
  notesTbody.innerHTML = '';
  for (const sid of classStudents) {
    const studentDoc = await db.collection('alumnes').doc(sid).get();
    const studentNotes = studentDoc.exists ? studentDoc.data().notes || {} : {};
    const tr = document.createElement('tr');

    // Nom alumne
    const tdNom = document.createElement('td');
    tdNom.textContent = studentDoc.exists ? studentDoc.data().nom : 'Desconegut';
    tdNom.className = 'border px-2 py-1';
    tr.appendChild(tdNom);

    // Notes activitats
    for (const aid of classActivities) {
      const td = document.createElement('td');
      td.className = 'border px-2 py-1 text-center';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = studentNotes[aid] !== undefined ? studentNotes[aid] : '';
      input.className = 'w-12 text-center';
      input.addEventListener('input', e => {
        applyCellColor(input);
        saveNote(sid, aid, input.value);
        renderAverages();
      });

      td.appendChild(input);
      tr.appendChild(td);
    }

    // Mitjana
    const tdAvg = document.createElement('td');
    tdAvg.className = 'border px-2 py-1 text-center font-semibold';
    tr.appendChild(tdAvg);

    notesTbody.appendChild(tr);
  }

  renderAverages();
}

// ----------------- Helpers -----------------
function th(txt, cls = '') {
  const el = document.createElement('th');
  el.className = 'border px-2 py-1 ' + cls;
  el.textContent = txt;
  return el;
}

function applyCellColor(inputEl) {
  const v = Number(inputEl.value);
  inputEl.classList.remove('bg-red-100', 'bg-yellow-100', 'bg-green-100');
  if (inputEl.value === '' || isNaN(v)) return;
  if (v < 5) inputEl.classList.add('bg-red-100');
  else if (v < 7) inputEl.classList.add('bg-yellow-100');
  else inputEl.classList.add('bg-green-100');
}

async function saveNote(studentId, activityId, value) {
  const num = value === '' ? null : Number(value);
  const updateObj = {};
  if (num === null || isNaN(num)) updateObj[`notes.${activityId}`] = firebase.firestore.FieldValue.delete();
  else updateObj[`notes.${activityId}`] = num;

  return db.collection('alumnes').doc(studentId).update(updateObj)
    .catch(e => console.error('Error saving note', e));
}

function computeStudentAverageText(studentData) {
  const notesMap = studentData && studentData.notes ? studentData.notes : {};
  const vals = classActivities.map(aid => (notesMap[aid] !== undefined ? Number(notesMap[aid]) : null))
    .filter(v => v !== null && !isNaN(v));
  if (vals.length === 0) return '';
  return (vals.reduce((s, n) => s + n, 0) / vals.length).toFixed(2);
}

function renderAverages() {
  Array.from(notesTbody.children).forEach(tr => {
    const inputs = Array.from(tr.querySelectorAll('input')).map(i => Number(i.value)).filter(v => !isNaN(v));
    const lastTd = tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 1];
    lastTd.textContent = inputs.length ? (inputs.reduce((a, b) => a + b, 0) / inputs.length).toFixed(2) : '';
  });
}
