import { openModal, closeModal } from './modals.js';

export function setupForms() {
  // Exemple: crear classe
  const createBtn = document.getElementById('modalCreateClassBtn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openModal('modalCreateClass');
    });
  }

  // Exemple: afegir alumne
  const addStudentBtn = document.getElementById('modalAddStudentBtn');
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
      openModal('modalAddStudent');
    });
  }
}
