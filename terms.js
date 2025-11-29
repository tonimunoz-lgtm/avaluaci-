// terms.js
// Mòdul per gestionar "terms" (graelles d'activitats) dins d'una classe

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
// ------------------------ Setup ------------------------
export function setup(db, classId, classData, opts = {}) {
  _db = db;
  _currentClassId = classId;
  _classData = classData || {};
  _onChangeCallback = opts.onChange || null;

  // Si no hi ha termes, inicialitzem i mostrem missatge.
  if (!_classData.terms) {
    _classData.terms = {};
    _activeTermId = null;
    renderDropdown();
    showEmptyMessage(true);
    // NO cridarem _onChangeCallback amb null — això provoca renders en blanc
    return;
  }

  // Si no hi ha terme actiu, agafem el primer
  if (!_activeTermId) _activeTermId = Object.keys(_classData.terms)[0];

  renderDropdown();

  // Només cridem el callback amb un termid vàlid (si existeix)
  if (_onChangeCallback && _activeTermId) {
    // petit timeout perquè la UI ja estigui completament muntada
    setTimeout(() => {
      if (_onChangeCallback && _activeTermId) {
        _onChangeCallback(_activeTermId);
      }
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
  const payload = { name: name.trim(), activities: [] };

  if (!_classData.terms) _classData.terms = {};

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

  if (!_classData.terms) _classData.terms = {};
  if (!_classData.terms[_activeTermId]) _classData.terms[_activeTermId] = { name: '', activities: [] };
  if (!_classData.terms[_activeTermId].activities) _classData.terms[_activeTermId].activities = [];

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
  if (!_classData.terms[termId]) _classData.terms[termId] = { name: '', activities: [] };

  const path = `terms.${termId}.activities`;
  await _db.collection('classes').doc(_currentClassId).update({
    [path]: newActivityIds
  });

  const doc = await _db.collection('classes').doc(_currentClassId).get();
  if (doc.exists) Object.assign(_classData, doc.data());

  if (_onChangeCallback && _activeTermId) _onChangeCallback(_activeTermId);
}

// ------------------------ Export mínim ------------------------
export function getActiveTerm() { return _activeTermId; }
