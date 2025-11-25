// terms.js
import { db } from './app.js'; // o exporta db des de app.js si és module
import { renderNotesGrid } from './app.js';

export function initTerms() {
  const container = document.createElement('div');
  container.id = 'termsControls';
  container.className = 'flex gap-2 items-center mb-4';

  // Selector de trimestres
  const select = document.createElement('select');
  select.id = 'termSelector';
  select.className = 'border rounded p-1';
  container.appendChild(select);

  // Botó "+" per crear un nou trimestre
  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'bg-green-500 text-white px-3 py-1 rounded';
  container.appendChild(addBtn);

  // Insertem abans de la graella
  const wrapper = document.getElementById('classScreenWrapper');
  if (wrapper) wrapper.prepend(container);

  // Carrega trimestres existents
  loadTerms().then(() => {
    select.addEventListener('change', async () => {
      const termId = select.value;
      if (!termId) return;
      window.currentTermId = termId; // global temporal
      await renderNotesGrid(); // renderitza graella amb el trimestre seleccionat
    });
  });

  // Crear un nou trimestre
  addBtn.addEventListener('click', async () => {
    const name = prompt('Nom del nou trimestre:');
    if (!name) return;
    await createTerm(name);
    await loadTerms();
  });
}

// ---------------- Funcions internes -----------------
async function loadTerms() {
  const select = document.getElementById('termSelector');
  if (!select || !window.currentClassId) return;

  // Obtenim tots els trimestres de la classe
  const snapshot = await db.collection('classes')
    .doc(window.currentClassId)
    .collection('terms')
    .get();

  select.innerHTML = ''; // neteja

  snapshot.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = doc.data().name || doc.id;
    select.appendChild(opt);
  });

  // Selecciona el primer si no hi ha cap definit
  if (!window.currentTermId && snapshot.docs.length) {
    window.currentTermId = snapshot.docs[0].id;
  }

  // Marquem l’actual
  Array.from(select.options).forEach(opt => {
    opt.selected = opt.value === window.currentTermId;
  });
}

async function createTerm(name) {
  if (!window.currentClassId) return;

  const newTermRef = db.collection('classes')
    .doc(window.currentClassId)
    .collection('terms')
    .doc(); // genera ID automàtic

  // Clonem alumnes i activitats de l'últim trimestre si existeix
  const lastTermSnap = await db.collection('classes')
    .doc(window.currentClassId)
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
  window.currentTermId = newTermRef.id; // seleccionem automàticament el nou trimestre
}
