// terms.js
// Mòdul per gestionar "terms" (graelles d'activitats) dins d'una classe

let _db = null;
let _currentClassId = null;
let _classData = null;
let _activeTermId = null;
let _lastClassId = null;
let _onChangeCallback = null;
let _copiedGridStructure = null;

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

  // En canviar de classe, el període actiu de l'anterior no val: si no, el desplegable queda
  // en blanc i la graella sense activitats (les dades continuen intactes a Firestore).
  if (_lastClassId !== classId || !_classData.terms?.[_activeTermId]) _activeTermId = null;
  _lastClassId = classId;

  // Si no hi ha termes, deixem tot buit i mostrem missatge
  if (!_classData.terms || Object.keys(_classData.terms).length === 0) {
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
    opt.textContent = 'Crea el teu primer període';
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
    sel.innerHTML = '<option value="" selected disabled>Selecciona o crea un període</option>';
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

// Esborra documents en lots de 400 (límit Firestore: 500). Si un lot falla, reintenta doc a doc.
async function _deleteDocs(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const chunk = refs.slice(i, i + 400);
    try {
      const batch = _db.batch();
      chunk.forEach(r => batch.delete(r));
      await batch.commit();
    } catch (e) {
      console.warn('Lot d\'esborrat fallit, reintentant un a un', e);
      for (const r of chunk) {
        try { await r.delete(); } catch (e2) { console.error('No s\'ha pogut esborrar', r.path, e2); }
      }
    }
  }
}

export async function deleteTerm(termId) {
  if (!_db || !_currentClassId || !_classData?.terms?.[termId]) return;

  // Cascada: activitats del grup, notes dels alumnes i càlculs associats
  const actIds = [...(_classData.terms[termId].activities || [])];
  const alumnes = _classData.alumnes || [];
  const updateObj = {};
  updateObj[`terms.${termId}`] = firebase.firestore.FieldValue.delete();
  actIds.forEach(id => {
    updateObj[`calculatedActivities.${id}`] = firebase.firestore.FieldValue.delete();
    updateObj['activitats'] = firebase.firestore.FieldValue.arrayRemove(...actIds);
  });
  await _db.collection('classes').doc(_currentClassId).update(updateObj);

  // Notes dels alumnes (en lots)
  for (let i = 0; i < alumnes.length; i += 400) {
    const batch = _db.batch();
    alumnes.slice(i, i + 400).forEach(sid => {
      const upd = {};
      actIds.forEach(id => { upd[`notes.${id}`] = firebase.firestore.FieldValue.delete(); });
      if (actIds.length) batch.update(_db.collection('alumnes').doc(sid), upd);
    });
    if (actIds.length) await batch.commit();
  }
  await _deleteDocs(actIds.map(id => _db.collection('activitats').doc(id)));

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
  // Guardem una còpia de l'array d'activitats
  _copiedGridStructure = [...(_classData.terms[termId].activities || [])];
  console.log('Estructura copiada:', _copiedGridStructure);
}

// ------------------------ Enganxar estructura ------------------------
export async function pasteGridStructure(termId) {
  if (!termId || !_copiedGridStructure) return;

  const uid = firebase.auth().currentUser.uid;
  const idMap = {};            // id antic -> id nou
  const clones = [];           // [{ref, data}]

  // 1. Llegim originals i reservem ids nous (així podem remapejar fórmules entre elles)
  for (const actId of _copiedGridStructure) {
    const doc = await _db.collection('activitats').doc(actId).get();
    if (!doc.exists) continue;
    const ref = _db.collection('activitats').doc();
    idMap[actId] = ref.id;
    clones.push({ oldId: actId, ref, data: doc.data() });
  }
  if (!clones.length) return;

  const remap = (str) => {
    if (typeof str !== 'string') return str;
    let out = str;
    Object.keys(idMap).forEach(o => { out = out.split(o).join(idMap[o]); });
    return out;
  };

  // 2. Escrivim les còpies amb fórmules remapejades
  const srcCalc = _classData.calculatedActivities || {};
  const classUpdate = {};
  for (const c of clones) {
    const data = { ...c.data };
    if (data.formula) data.formula = remap(data.formula);
    await c.ref.set({
      ...data,
      ownerUid: uid,
      originalCloneOf: c.oldId,
      createdAt: Date.now()
    });
    const calc = srcCalc[c.oldId];
    if (calc) {
      const copy = { ...calc };
      if (copy.formula) copy.formula = remap(copy.formula);
      if (copy.displayFormula) copy.displayFormula = remap(copy.displayFormula);
      classUpdate[`calculatedActivities.${c.ref.id}`] = copy;
    }
  }

  // 3. AFEGIM (no substituïm) les noves activitats al grup destí
  classUpdate[`terms.${termId}.activities`] =
    firebase.firestore.FieldValue.arrayUnion(...clones.map(c => c.ref.id));
  await _db.collection('classes').doc(_currentClassId).update(classUpdate);

  // 4. Refrescar dades internes i UI
  const doc = await _db.collection('classes').doc(_currentClassId).get();
  _classData = doc.exists ? doc.data() : _classData;

  if (_onChangeCallback) _onChangeCallback(termId);
}

// ------------------------ Export mínim ------------------------
export function getActiveTerm() { return _activeTermId; }
