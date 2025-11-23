// grupsPage.js
import { db } from './firebase.js'; // o com tinguis configurat

let currentClassId = null;
let grups = [];

export function initGrupsPage(classId) {
  currentClassId = classId;
  loadGrups();
}

async function loadGrups() {
  const classDoc = await db.collection('classes').doc(currentClassId).get();
  if (!classDoc.exists) return;

  grups = classDoc.data().grups || [];
  renderGrups();
}

function renderGrups() {
  const container = document.getElementById('grupsContainer');
  container.innerHTML = '';

  grups.forEach(grupId => {
    const div = document.createElement('div');
    div.textContent = grupId; // després podem carregar el nom real
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Obrir';
    openBtn.addEventListener('click', () => openNotesGrid(grupId));
    div.appendChild(openBtn);
    container.appendChild(div);
  });

  // Botó crear nou grup
  const btnNou = document.createElement('button');
  btnNou.textContent = 'Crear Grup';
  btnNou.addEventListener('click', createNewGrup);
  container.appendChild(btnNou);
}

async function createNewGrup() {
  const nom = prompt('Nom del nou grup:');
  if (!nom) return;

  const grupRef = db.collection('grups').doc();
  await grupRef.set({
    nom,
    classeId: currentClassId,
    activitats: [],
    calculatedActivities: {}
  });

  // Afegir a la classe
  await db.collection('classes').doc(currentClassId).update({
    grups: firebase.firestore.FieldValue.arrayUnion(grupRef.id)
  });

  loadGrups();
}

function openNotesGrid(grupId) {
  // Aquí pots cridar la funció que actualitza la graella
  import('./notesGrid.js').then(module => {
    module.initNotesGrid(grupId);
  });
}
