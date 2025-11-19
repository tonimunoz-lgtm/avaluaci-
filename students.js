import { openModal, confirmAction } from './modals.js';

export function loadClasses() {
  const container = document.getElementById('screen-classes');
  if (!container) return;

  // Exemple dummy de classes
  const classes = [
    { id: 1, name: 'Matemàtiques', desc: 'Àlgebra i Geometria' },
    { id: 2, name: 'Física', desc: 'Mecànica' },
  ];

  container.innerHTML = '';
  classes.forEach(c => {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.id = c.id;
    card.innerHTML = `
      <h3>${c.name}</h3>
      <p>${c.desc}</p>
      <span class="click-hint">Clica per veure la classe</span>
    `;
    container.appendChild(card);
  });
}

export function setupClassClicks() {
  const container = document.getElementById('screen-classes');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.class-card');
    if (!card) return;
    const classId = card.dataset.id;
    openClass(classId);
  });
}

// Obre pantalla de classe
function openClass(classId) {
  document.getElementById('screen-classes').style.display = 'none';
  document.getElementById('screen-class').style.display = 'block';
  // Pots cridar aquí funció de classScreen.js per renderitzar la taula
}
