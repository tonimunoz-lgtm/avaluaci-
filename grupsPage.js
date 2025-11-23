// grupsPage.js
import { db } from './firebase.js';
import { currentClassId, classStudents } from './app.js';
import { initNotesGrid } from './notesGrid.js';

const grupsContainer = document.getElementById('grupsContainer');
const btnNouGrup = document.getElementById('btnNouGrup');

export async function loadGrupsPage() {
  if (!currentClassId) return;

  grupsContainer.innerHTML = '<p>Carregant grups...</p>';

  // Llegim els grups de la classe
  const classDoc = await db.collection('classes').doc(currentClassId).get();
  if (!classDoc.exists) return grupsContainer.innerHTML = '<p>No s’ha trobat la classe.</p>';

  const grups = classDoc.data().grups || []; // Array de IDs de grup
  grupsContainer.innerHTML = '';

  for (const gid of grups) {
    const grupDoc = await db.collection('grups').doc(gid).get();
    const grupData = grupDoc.exists ? grupDoc.data() : { nom: '???', activitats: [] };

    const div = document.createElement('div');
    div.className = 'grup-card p-2 mb-2 border rounded flex justify-between items-center';

    const span = document.createElement('span');
    span.textContent = grupData.nom;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex gap-2';

    // Botó editar
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.className = 'px-2 py-1 bg-yellow-200 rounded';
    editBtn.addEventListener('click', () => editGrup(gid, grupData.nom));

    // Botó eliminar
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'px-2 py-1 bg-red-200 rounded';
    delBtn.addEventListener('click', () => deleteGrup(gid));

    // Botó obrir (graella)
    const openBtn = document.createElement('button');
    openBtn.textContent = '📊';
    openBtn.className = 'px-2 py-1 bg-green-200 rounded';
    openBtn.addEventListener('click', () => initNotesGrid(gid));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);
    actionsDiv.appendChild(openBtn);

    div.appendChild(span);
    div.appendChild(actionsDiv);
    grupsContainer.appendChild(div);
  }
}

// ─────────────── Crear / Editar grup ───────────────
btnNouGrup.addEventListener('click', async () => {
  const nom = prompt('Nom del nou grup:');
  if (!nom) return;

  // Crear document grup
  const grupRef = db.collection('grups').doc();
  await grupRef.set({
    nom,
    activitats: [],
    alumnes: classStudents // compartim alumnes
  });

  // Afegir ID del grup a la classe
  await db.collection('classes').doc(currentClassId).update({
    grups: firebase.firestore.FieldValue.arrayUnion(grupRef.id)
  });

  await loadGrupsPage();
});

async function editGrup(grupId, oldName) {
  const nom = prompt('Nou nom del grup:', oldName);
  if (!nom) return;
  await db.collection('grups').doc(grupId).update({ nom });
  await loadGrupsPage();
}

async function deleteGrup(grupId) {
  if (!confirm('Segur que vols eliminar aquest grup?')) return;

  // Eliminar grup
  await db.collection('grups').doc(grupId).delete();

  // Treure ID de grup de la classe
  await db.collection('classes').doc(currentClassId).update({
    grups: firebase.firestore.FieldValue.arrayRemove(grupId)
  });

  await loadGrupsPage();
}
