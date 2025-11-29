// terms.js
// Mòdul per gestionar "terms" (graelles d'activitats i alumnes) dins d'una classe

let _db = null;
let _currentClassId = null;
let _classData = null;
let _activeTermId = null;
let _onChangeCallback = null;
let _copiedGridStructure = null; // guardar estructura d'activitats temporalment

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

  if (!_classData.terms) {
    _classData.terms = {};
    _activeTermId = null;
    renderDropdown();
    showEmptyMessage(true);
    return;
  }

  if (!_activeTermId) _activeTermId = Object.keys(_classData.terms)[0];

  renderDropdown();

  // Forcem un refresc inicial si hi ha terme actiu
  if (_onChangeCallback && _activeTermId) {
    setTimeout(() => {
      _onChangeCallback(_activeTermId);
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

  sel.onchange = (e) => {
    _activeTermId = e.target.value;
    showEmptyMessage(false);
    if (_onChangeCallback) _onChangeCallback(_activeTermId);
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
  _classData.terms[newId] = payload;
  _activeTermId = newId;

  // 🔹 Forçar render inicial de la graella encara que no tingui dades
  renderDropdown();
  showEmptyMessage(false);
  if (_onChangeCallback) _onChangeCallback(_activeTermId);  // aquí refresca la graella

  // 🔹 Després actualitzem Firestore
  const updateObj = {};
  updateObj[`terms.${newId}`] = payload;
  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  return newId;
}


// ------------------------ Afegir/Eliminar activitat ------------------------
export async function addActivityToActiveTerm(activityId) {
  if (!_activeTermId || !_db || !_currentClassId) return;

  if (!_classData.terms) _classData.terms = {};
  if (!_classData.terms[_activeTermId]) _classData.terms[_activeTermId] = { name: '', activities: [], students: [] };
  if (!_classData.terms[_activeTermId].activities) _classData.terms[_activeTermId].activities = [];

  const path = `terms.${_activeTermId}.activities`;

  // 🔹 Actualitzem localment abans que Firestore
  _classData.terms[_activeTermId].activities.push(activityId);

  // 🔹 Refresquem la graella immediatament
  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  // 🔹 Actualitzem Firestore
  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayUnion(activityId)
  });
}

// ------------------------ Afegir/Eliminar alumne ------------------------
export async function addStudentToActiveTerm(studentId) {
  if (!_activeTermId || !_db || !_currentClassId) return;

  if (!_classData.terms) _classData.terms = {};
  if (!_classData.terms[_activeTermId]) _classData.terms[_activeTermId] = { name: '', activities: [], students: [] };
  if (!_classData.terms[_activeTermId].students) _classData.terms[_activeTermId].students = [];

  const path = `terms.${_activeTermId}.students`;

  // 🔹 Actualitzem localment abans que Firestore
  _classData.terms[_activeTermId].students.push(studentId);

  // 🔹 Refresquem la graella immediatament
  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  // 🔹 Actualitzem Firestore
  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayUnion(studentId)
  });
}

export async function removeActivityFromActiveTerm(activityId) {
  if (!_activeTermId || !_db || !_currentClassId) return;

  const path = `terms.${_activeTermId}.activities`;

  // 🔹 Actualitzem localment
  _classData.terms[_activeTermId].activities = _classData.terms[_activeTermId].activities.filter(id => id !== activityId);

  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayRemove(activityId)
  });
}

export async function removeStudentFromActiveTerm(studentId) {
  if (!_activeTermId || !_db || !_currentClassId) return;

  const path = `terms.${_activeTermId}.students`;

  _classData.terms[_activeTermId].students = _classData.terms[_activeTermId].students.filter(id => id !== studentId);

  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  await _db.collection('classes').doc(_currentClassId).update({
    [path]: firebase.firestore.FieldValue.arrayRemove(studentId)
  });
}

// ------------------------ Renombrar/eliminar terme ------------------------
export async function renameTerm(termId, newName) {
  if (!termId || !newName) return;

  if (_classData.terms?.[termId]) _classData.terms[termId].name = newName;

  renderDropdown();
  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  const path = `terms.${termId}.name`;
  await _db.collection('classes').doc(_currentClassId).update({ [path]: newName });
}

export async function deleteTerm(termId) {
  if (!_db || !_currentClassId || !_classData?.terms?.[termId]) return;

  delete _classData.terms[termId];

  if (_activeTermId === termId) {
    const remainingTerms = Object.keys(_classData.terms || {});
    _activeTermId = remainingTerms[0] || null;
  }

  renderDropdown();
  if (_activeTermId) showEmptyMessage(false);
  else showEmptyMessage(true);

  if (_onChangeCallback && _activeTermId) _onChangeCallback(_activeTermId);

  const updateObj = {};
  updateObj[`terms.${termId}`] = firebase.firestore.FieldValue.delete();
  await _db.collection('classes').doc(_currentClassId).update(updateObj);
}

// ------------------------ Copiar estructura ------------------------
export function copyGridStructure(termId) {
  if (!termId || !_classData?.terms?.[termId]) return;
  _copiedGridStructure = [...(_classData.terms[termId].activities || [])];
  console.log('Estructura copiada:', _copiedGridStructure);
}

// ------------------------ Enganxar estructura ------------------------
export async function pasteGridStructure(termId) {
  if (!termId || !_copiedGridStructure) return;

  const newActivityIds = [];

  for (const actId of _copiedGridStructure) {
    const doc = await _db.collection('activitats').doc(actId).get();
    if (!doc.exists) continue;

    const data = doc.data();
    const newActRef = await _db.collection('activitats').add({
      ...data,
      originalCloneOf: actId,
      createdAt: Date.now()
    });

    newActivityIds.push(newActRef.id);
  }

  if (!_classData.terms) _classData.terms = {};
  if (!_classData.terms[termId]) _classData.terms[termId] = { name: '', activities: [], students: [] };

  _classData.terms[termId].activities = newActivityIds;

  if (_onChangeCallback) _onChangeCallback(_activeTermId);

  const path = `terms.${termId}.activities`;
  await _db.collection('classes').doc(_currentClassId).update({
    [path]: newActivityIds
  });
}

// ------------------------ Export mínim ------------------------
export function getActiveTerm() { return _activeTermId; }
