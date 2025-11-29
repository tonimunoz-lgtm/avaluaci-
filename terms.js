// terms.js
// Mòdul per gestionar "terms" (graelles d'activitats) dins d'una classe

import firebase from 'firebase/app';
import 'firebase/firestore';
import { renderNotesGrid } from './app.js'; // ajusta la ruta segons la teva estructura

let _db = null;
let _currentClassId = null;
let _classData = null;
let _activeTermId = null;
let _onChangeCallback = null;
let _copiedGridStructure = null; // guardar estructura d'activitats temporalment

// ---------- Generar un ID únic per terme ----------
function makeTermId(name) {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

// ---------- Variables globals necessàries per renderNotesGrid ----------
window.classStudents = [];
window.classActivities = [];

// 🔹 Força refresc de la graella després de canvis
async function refreshGridAfterDataChange() {
  if (!_classData || !_activeTermId) return;

  // Actualitza arrays locals que renderNotesGrid utilitza
  window.classStudents = Object.keys(_classData.students || {});
  window.classActivities = _classData.terms[_activeTermId]?.activities || [];

  // Crida renderNotesGrid() per forçar render
  await renderNotesGrid();
}

// ------------------------ Setup ------------------------
export function setup(db, classId, classData, opts = {}) {
  _db = db;
  _currentClassId = classId;
  _classData = classData || {};
  _onChangeCallback = opts.onChange || null;

  if (!_classData.terms) {
    _classData.terms = {};
    _activeTermId = null;
    renderDropdown();
    showEmptyMessage(true);
    return;
  }

  if (!_activeTermId) _activeTermId = Object.keys(_classData.terms)[0];

  renderDropdown();

  // 🔥 Forcem un refresc inicial encara que la graella estigui buida
  if (_onChangeCallback && _activeTermId) {
    setTimeout(async () => {
      _onChangeCallback(_activeTermId);
      await refreshGridAfterDataChange();
    }, 50);
  }
}

// ------------------------ Obtenir dades ------------------------
export function getActiveTermId() {
  return _activeTermId;
}

export function getActiveTermName() {
  return (_classData?.terms?.[_activeTermId]?.name) || '';
}

export function getActiveTermActivities() {
  return (_classData?.terms?.[_activeTermId]?.activities) || [];
}

export function getActiveTermStudents() {
  return (_classData?.terms?.[_activeTermId]?.students) || [];
}

// ------------------------ Render Dropdown ------------------------
function renderDropdown() {
  const sel = document.getElementById('termsDropdown');
  if (!sel) return;
  sel.innerHTML = '';

  const terms = _classData.terms || {};
  const termIds = Object.keys(terms);

  if (termIds.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Crea el teu primer grup';
    opt.disabled = true;
    opt.selected = true;
    sel.appendChild(opt);
    showEmptyMessage(true);
    return;
  }

  termIds.forEach(termId => {
    const opt = document.createElement('option');
    opt.value = termId;
    opt.textContent = terms[termId].name || termId;
    sel.appendChild(opt);
  });

  sel.onchange = async (e) => {
    _activeTermId = e.target.value;
    showEmptyMessage(false);
    if (_onChangeCallback) await _onChangeCallback(_activeTermId);
    await refreshGridAfterDataChange();
  };

  if (_activeTermId) {
    sel.value = _activeTermId;
    showEmptyMessage(false);
  } else {
    sel.innerHTML = '<option value="" selected disabled>Selecciona o crea un grup</option>';
    showEmptyMessage(true);
  }
}

// ------------------------ Mostrar/Amagar missatge ------------------------
function showEmptyMessage(show) {
  const msg = document.getElementById('emptyGroupMessage');
  const wrapper = document.getElementById('notesTable-wrapper');
  const table = document.getElementById('notesTable');
  const instruction = document.getElementById('emptyInstructionMessage');

  if (!msg || !wrapper || !table || !instruction) return;

  if (show) {
    msg.style.display = 'block';
    table.style.display = 'none';
    instruction.style.display = 'block';
  } else {
    msg.style.display = 'none';
    table.style.display = 'table';
    instruction.style.display = 'none';
  }
}

// ------------------------ Crear un nou terme ------------------------
export async function addNewTermWithName(name) {
  if (!name || !name.trim()) return null;
  if (!_db || !_currentClassId) throw new Error('terms.js no inicialitzat (db o classId manquen)');

  const newId = makeTermId(name.trim());
  const payload = { name: name.trim(), activities: [], students: [] };

  if (!_classData.terms) _classData.terms = {};

  const updateObj = {};
  updateObj[`terms.${newId}`] = payload;
  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  _activeTermId = newId;
  renderDropdown();
  showEmptyMessage(false);

  if (_onChangeCallback) {
    await _onChangeCallback(_activeTermId);
    await refreshGridAfterDataChange();
  }

  return newId;
}

// ------------------------ Afegir/Eliminar activitat ------------------------
export async function addActivityToActiveTerm(activityId) {
  if (!_activeTermId || !_db || !_currentClassId) return;

  if (!_classData.terms[_activeTermId].activities) 
      _classData.terms[_activeTermId].activities = [];

  const path = `terms.${_activeTermId}.activities`;

  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayUnion(activityId)
  });

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  // 🔥 Forcem refresc de la graella
  if (_onChangeCallback && _activeTermId) {
    await _onChangeCallback(_activeTermId);
    await refreshGridAfterDataChange();
  }
}

// ------------------------ Afegir/Eliminar alumne ------------------------
export async function addStudentToActiveTerm(studentId) {
  if (!_activeTermId || !_db || !_currentClassId) return;

  if (!_classData.students) _classData.students = {};
  _classData.students[studentId] = { nom: 'Nom alumne', notes: {} };

  await _db.collection('classes').doc(_currentClassId).update({
    [`students.${studentId}`]: _classData.students[studentId]
  });

  // 🔥 Forcem refresc de la graella
  if (_onChangeCallback && _activeTermId) {
    await _onChangeCallback(_activeTermId);
    await refreshGridAfterDataChange();
  }
}

// ------------------------ Export mínim ------------------------
export function getActiveTerm() { return _activeTermId; }
