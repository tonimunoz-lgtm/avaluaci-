// terms.js
// Mòdul per gestionar "terms" (graelles d'activitats) dins d'una classe

let _db = null;
let _currentClassId = null;
let _classData = null;
let _activeTermId = null;
let _onChangeCallback = null;
let _copiedGridStructure = null; // guardar estructura temporal de noms d'activitats


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

  // Si no hi ha termes, deixem tot buit i mostrem missatge
  if (!_classData.terms) {
    _classData.terms = {};   // sense terme inicial
    _activeTermId = null;    // cap terme actiu
    renderDropdown();        // desplegable buit
    showEmptyMessage(true);  // mostrar missatge
    return;
  }

  // Selecciona primer terme actiu
  if (!_activeTermId) _activeTermId = Object.keys(_classData.terms)[0];

  renderDropdown();

  if (_onChangeCallback && _activeTermId) _onChangeCallback(_activeTermId);
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
  const msg = document.getElementById('emptyGroupMessage');           // missatge petit existent
  const wrapper = document.getElementById('notesTable-wrapper');
  const table = document.getElementById('notesTable');
  const instruction = document.getElementById('emptyInstructionMessage'); // nou missatge central

  if (!msg || !wrapper || !table || !instruction) return;

  if (show) {
    msg.style.display = 'block';        // missatge existent
    table.style.display = 'none';       // amaguem la taula
    instruction.style.display = 'block';// mostrem missatge central gran
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
  const payload = { name: name.trim(), activities: [] };

  const updateObj = {};
  updateObj[`terms.${newId}`] = payload;

  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  _activeTermId = newId;
  renderDropdown();
  showEmptyMessage(false);

  if (_onChangeCallback) _onChangeCallback(_activeTermId);
  return newId;
}

// ------------------------ Afegir/Eliminar activitat ------------------------
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

// ------------------------ Renombrar/eliminar terme ------------------------
export async function renameTerm(termId, newName) {
  if (!termId || !newName) return;
  const path = `terms.${termId}.name`;
  await _db.collection('classes').doc(_currentClassId).update({ [path]: newName });

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  renderDropdown();
}

export async function deleteTerm(termId) {
  if (!_db || !_currentClassId || !_classData?.terms?.[termId]) return;

  const updateObj = {};
  updateObj[`terms.${termId}`] = firebase.firestore.FieldValue.delete();
  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  if (_activeTermId === termId) {
    const remainingTerms = Object.keys(_classData.terms || {});
    _activeTermId = remainingTerms[0] || null;
  }

  renderDropdown();

  if (_activeTermId) showEmptyMessage(false);
  else showEmptyMessage(true);

  if (_onChangeCallback && _activeTermId) _onChangeCallback(_activeTermId);
}

// ------------------------ Copiar estructura ------------------------
export function copyGridStructure(termId) {
  if (!termId || !_classData?.terms?.[termId]) return;

  const activityIds = _classData.terms[termId].activities || [];

  // Guardem només els noms
  _copiedGridStructure = activityIds.map(id => {
    return _classData.activities?.[id]?.name || "SenseNom";
  });

  console.log("Estructura copiada (només noms):", _copiedGridStructure);
}

// ------------------------ Enganxar estructura ------------------------
export async function pasteGridStructure(termId) {
  if (!_copiedGridStructure || _copiedGridStructure.length === 0) {
    console.warn("No hi ha estructura copiada.");
    return false;
  }

  if (!termId || !_db || !_currentClassId) return false;

  const classRef = _db.collection("classes").doc(_currentClassId);

  // Crear activitats noves amb IDs únics
  const newActivityIds = _copiedGridStructure.map(name => {
    return `act_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  });

  const updateObj = {};

  // Assignem cada activitat nova amb el nom copiat i valors buits
  newActivityIds.forEach((id, i) => {
    updateObj[`activities.${id}`] = {
      name: _copiedGridStructure[i],
      weight: 1,
      formula: "",
      isAverage: false,
      isExam: false,
      isFinal: false
    };
  });

  // Afegim la nova llista d'activitats al terme
  updateObj[`terms.${termId}.activities`] = newActivityIds;

  // Actualitzar Firestore
  await classRef.update(updateObj);

  // Recarregar dades locals
  const doc = await classRef.get();
  _classData = doc.exists ? doc.data() : _classData;

  console.log("Estructura enganxada (activitats noves):", newActivityIds);

  return true;
}


// ------------------------ Export mínim ------------------------
export function getActiveTerm() { return _activeTermId; }
