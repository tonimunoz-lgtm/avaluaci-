// terms.js
export async function initTerms({ db, renderNotesGrid, currentClassId, currentTermId: initialTermId }) {
  if (!currentClassId) {
    console.error('No hi ha currentClassId definit per inicialitzar termes.');
    return;
  }

  // ----------------- Crea contenidor -----------------
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

  // Estat local temporal
  let currentTermId = initialTermId || null;

  // ----------------- Funció per carregar termes -----------------
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

    // Si no hi ha currentTermId definit, seleccionem el primer
    if (!currentTermId && snapshot.docs.length) {
      currentTermId = snapshot.docs[0].id;
    }

    Array.from(select.options).forEach(opt => {
      opt.selected = opt.value === currentTermId;
    });

    return currentTermId;
  }

  // ----------------- Funció per crear nou terme -----------------
  async function createTerm(name) {
    const newTermRef = db.collection('classes')
      .doc(currentClassId)
      .collection('terms')
      .doc();

    // Clonar alumnes i activitats de l’últim terme si existeix
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
    currentTermId = newTermRef.id;
  }

  // ----------------- Event handlers -----------------
  select.addEventListener('change', async () => {
    const termId = select.value;
    if (!termId) return;
    currentTermId = termId;
    window.currentTermId = termId; // global per compatibilitat
    await renderNotesGrid();
  });

  addBtn.addEventListener('click', async () => {
    const name = prompt('Nom del nou trimestre:');
    if (!name) return;
    await createTerm(name);
    await loadTerms();
    await renderNotesGrid();
  });

  // ----------------- Inicialitza -----------------
  await loadTerms();
  window.currentTermId = currentTermId; // guardem a global
  return currentTermId; // opcional per app.js
}
