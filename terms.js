// terms.js
// Mòdul responsable de gestionar "terms" (grups d'activitats) dins d'una classe.

let _db = null;
let _currentClassId = null;
let _classData = null;         // objecte sencer de la classe (document.data())
let _activeTermId = null;
let _onChangeCallback = null;  // opcional: cridar quan canvia terme

// Utilities
function makeTermId(name) {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
}

// --------- setup ---------
export function setup(db, classId, classData, opts = {}) {
  _db = db;
  _currentClassId = classId;
  _classData = classData || {};
  _onChangeCallback = opts.onChange || null;

  // Només creem el terme inicial si no existeix cap terme
  if (!_classData.terms) {
    const legacyActs = _classData.activitats || [];
    const defaultId = makeTermId('avaluacio');
    _classData.terms = {
      [defaultId]: {
        name: 'Avaluació',
        activities: Array.isArray(legacyActs) ? [...legacyActs] : []
      }
    };
  }

  // Seleccionem el primer terme si no hi ha actiu
  if (!_activeTermId) {
    _activeTermId = Object.keys(_classData.terms)[0];
  }

  renderDropdown();

  if (_onChangeCallback) _onChangeCallback(_activeTermId);
}

// --------- obtenir dades ---------
export function getActiveTermId() {
  return _activeTermId;
}
export function getActiveTermName() {
  return (_classData?.terms?.[_activeTermId]?.name) || '';
}
export function getActiveTermActivities() {
  return (_classData?.terms?.[_activeTermId]?.activities) || [];
}

// --------- render dropdown (DOM) ---------
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

// --------- crear un nou terme ---------
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

// --------- afegir activitat a terme actiu ---------
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

// --------- eliminar activitat de terme actiu ---------
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

// --------- renombrar terme ---------
export async function renameTerm(termId, newName) {
  if (!termId || !newName) return;
  const path = `terms.${termId}.name`;
  await _db.collection('classes').doc(_currentClassId).update({ [path]: newName });
  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;
  renderDropdown();
}

// --------- exports mínims ---------
export function getActiveTerm() { return _activeTermId; }
