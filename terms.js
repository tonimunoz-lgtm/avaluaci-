// terms.js
// Mòdul per gestionar "terms" (graelles d'activitats) dins d'una classe

let _db = null;
let _currentClassId = null;
let _classData = null;
let _activeTermId = null;
let _onChangeCallback = null;

// Generar un ID únic per terme
function makeTermId(name) {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

// ------------------------ Setup ------------------------
export function setup(db, classId, classData, opts = {}) {
  _db = db;
  _currentClassId = classId;
  _classData = classData || {};
  _onChangeCallback = opts.onChange || null;

  // Crear terme inicial si no n'hi ha cap
 if (!_classData.terms) {
  _classData.terms = {}; // sense terme inicial
  _activeTermId = null;  // cap terme actiu
  renderDropdown();       // desplegable buit
  showEmptyMessage(true); // mostrar missatge d'instrucció
  return;
}


  // Selecciona primer terme actiu
  if (!_activeTermId) _activeTermId = Object.keys(_classData.terms)[0];

  renderDropdown();

  if (_onChangeCallback) _onChangeCallback(_activeTermId);
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

// ------------------------ Render Dropdown ------------------------
function renderDropdown() {
  const sel = document.getElementById('termsDropdown');
  if (!sel) return;
  sel.innerHTML = '';

  const terms = _classData.terms || {};
  Object.keys(terms).forEach(termId => {
    const opt = document.createElement('option');
    opt.value = termId;
    opt.textContent = terms[termId].name || termId;
    sel.appendChild(opt);
  });

  if (_activeTermId) sel.value = _activeTermId;

  sel.onchange = (e) => {
    _activeTermId = e.target.value;
    if (_onChangeCallback) _onChangeCallback(_activeTermId);
  };
}

// ------------------------ Crear un nou terme ------------------------
export async function addNewTermWithName(name) {
  if (!name || !name.trim()) return null;
  if (!_db || !_currentClassId) throw new Error('terms.js no inicialitzat (db o classId manquen)');

  const newId = makeTermId(name.trim());
  const payload = { name: name.trim(), activities: [] };

  const updateObj = {};
  updateObj[`terms.${newId}`] = payload;

  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  _activeTermId = newId;
  renderDropdown();
  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  return newId;
}

// ------------------------ Afegir activitat a terme actiu ------------------------
export async function addActivityToActiveTerm(activityId) {
  if (!_activeTermId || !_db || !_currentClassId) return;
  const path = `terms.${_activeTermId}.activities`;
  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayUnion(activityId)
  });

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  if (_onChangeCallback) _onChangeCallback(_activeTermId);
}

// ------------------------ Eliminar activitat de terme actiu ------------------------
export async function removeActivityFromActiveTerm(activityId) {
  if (!_activeTermId || !_db || !_currentClassId) return;
  const path = `terms.${_activeTermId}.activities`;
  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayRemove(activityId)
  });

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  if (_onChangeCallback) _onChangeCallback(_activeTermId);
}

// ------------------------ Renombrar terme ------------------------
export async function renameTerm(termId, newName) {
  if (!termId || !newName) return;
  const path = `terms.${termId}.name`;
  await _db.collection('classes').doc(_currentClassId).update({ [path]: newName });

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  renderDropdown();
}

// ------------------------ Eliminar terme complet ------------------------
export async function deleteTerm(termId) {
  if (!_db || !_currentClassId || !_classData?.terms?.[termId]) return;

  const updateObj = {};
  updateObj[`terms.${termId}`] = firebase.firestore.FieldValue.delete();

  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  // Si el terme eliminat era el actiu, seleccionar un altre
  if (_activeTermId === termId) {
    const remainingTerms = Object.keys(_classData.terms || {});
    _activeTermId = remainingTerms[0] || null;
  }

 renderDropdown(); // refresca el desplegable

if (_activeTermId) {
  sel.value = _activeTermId;
  showEmptyMessage(false); // amaguem missatge
} else {
  sel.innerHTML = '<option value="" selected disabled>Selecciona o crea un grup</option>';
  showEmptyMessage(true);  // mostrar missatge
}

if (_onChangeCallback && _activeTermId) _onChangeCallback(_activeTermId);

}

function showEmptyMessage(show) {
  const msg = document.getElementById('emptyGroupMessage');
  const table = document.getElementById('notesTable-wrapper');
  if (!msg || !table) return;

  if (show) {
    msg.style.display = 'block';
    table.style.display = 'none';
  } else {
    msg.style.display = 'none';
    table.style.display = 'block';
  }
}


// ------------------------ Exports mínims ------------------------
export function getActiveTerm() { return _activeTermId; }
