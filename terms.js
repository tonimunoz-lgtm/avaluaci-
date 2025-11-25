// terms.js
import { db } from './app.js';
import { renderNotesGrid } from './app.js';

// terms.js
export function initTerms({ db, renderNotesGrid, currentClassId, currentTermId }) {
  const container = document.createElement('div');
  container.id = 'termsControls';
  container.className = 'flex gap-2 items-center mb-4';

  const select = document.createElement('select');
  select.id = 'termSelector';
  select.className = 'border rounded p-1';
  container.appendChild(select);

  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'bg-green-500 text-white px-3 py-1 rounded';
  container.appendChild(addBtn);

  const wrapper = document.getElementById('classScreenWrapper');
  if (wrapper) wrapper.prepend(container);

  loadTerms();

  select.addEventListener('change', async () => {
    const termId = select.value;
    if (!termId) return;
    window.currentTermId = termId;
    await renderNotesGrid();
  });

  addBtn.addEventListener('click', async () => {
    const name = prompt('Nom del nou trimestre:');
    if (!name) return;
    await createTerm(name);
    await loadTerms();
  });

  async function loadTerms() {
    const snapshot = await db.collection('classes')
      .doc(currentClassId)
      .collection('terms')
      .get();

    select.innerHTML = '';
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.data().name || doc.id;
      select.appendChild(opt);
    });

    if (!window.currentTermId && snapshot.docs.length) {
      window.currentTermId = snapshot.docs[0].id;
    }

    Array.from(select.options).forEach(opt => {
      opt.selected = opt.value === window.currentTermId;
    });
  }

  async function createTerm(name) {
    const newTermRef = db.collection('classes')
      .doc(currentClassId)
      .collection('terms')
      .doc();

    const lastTermSnap = await db.collection('classes')
      .doc(currentClassId)
      .collection('terms')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let data = { name, createdAt: Date.now(), alumnes: [], activitats: [] };
    if (!lastTermSnap.empty) {
      const lastData = lastTermSnap.docs[0].data();
      data.alumnes = lastData.alumnes || [];
      data.activitats = lastData.activitats || [];
    }

    await newTermRef.set(data);
    window.currentTermId = newTermRef.id;
  }
}


export async function initTerms() {
  // Contenidor
  let container = document.getElementById('termsControls');
  if (!container) {
    container = document.createElement('div');
    container.id = 'termsControls';
    container.className = 'flex gap-2 items-center mb-4';
    const wrapper = document.getElementById('classScreenWrapper');
    if (wrapper) wrapper.prepend(container);
  }

  // Selector de termes
  let select = document.getElementById('termSelector');
  if (!select) {
    select = document.createElement('select');
    select.id = 'termSelector';
    select.className = 'border rounded p-1';
    container.appendChild(select);
  }

  // Botó per crear nou terme
  let addBtn = container.querySelector('#btnAddTerm');
  if (!addBtn) {
    addBtn = document.createElement('button');
    addBtn.id = 'btnAddTerm';
    addBtn.textContent = '＋';
    addBtn.className = 'bg-green-500 text-white px-3 py-1 rounded';
    container.appendChild(addBtn);
  }

  // Carregar termes existents
  await loadTerms();

  // Canvi de select
  select.addEventListener('change', async () => {
    const termId = select.value;
    if (!termId) return;
    window.currentTermId = termId;
    await renderNotesGrid();
  });

  // Crear nou terme
  addBtn.addEventListener('click', async () => {
    const name = prompt('Nom del nou terme:');
    if (!name) return;
    await createTerm(name);
    await loadTerms();
    await renderNotesGrid();
  });
}

// ---------------- Helpers ----------------
async function loadTerms() {
  if (!window.currentClassId) return;
  const select = document.getElementById('termSelector');
  if (!select) return;

  const snapshot = await db.collection('classes')
    .doc(window.currentClassId)
    .collection('terms')
    .orderBy('createdAt')
    .get();

  select.innerHTML = '';

  snapshot.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.data().name || doc.id;
    select.appendChild(opt);
  });

  // Selecciona el terme actual o el primer
  if (!window.currentTermId && snapshot.docs.length) {
    window.currentTermId = snapshot.docs[0].id;
  }

  Array.from(select.options).forEach(opt => {
    opt.selected = opt.value === window.currentTermId;
  });
}

async function createTerm(name) {
  if (!window.currentClassId) return;

  const termsRef = db.collection('classes')
    .doc(window.currentClassId)
    .collection('terms');

  const newTermRef = termsRef.doc(); // ID automàtic

  // Copiem alumnes i activitats de l'últim terme
  const lastTermSnap = await termsRef
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  let data = { name, createdAt: Date.now(), alumnes: [], activitats: [] };

  if (!lastTermSnap.empty) {
    const lastData = lastTermSnap.docs[0].data();
    data.alumnes = lastData.alumnes || [];
    data.activitats = lastData.activitats || [];
  }

  await newTermRef.set(data);
  window.currentTermId = newTermRef.id;
}
