// modals.js - exporta helpers per obrir tancar modals i confirmacions
export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.style.display = 'flex';
  // focus primer input si existeix
  const input = el.querySelector('input, textarea, select');
  if (input) input.focus();
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.style.display = 'none';
}

export function confirmAction(title, msg, yesCallback) {
  const confirmTitle = document.getElementById('confirmTitle');
  const confirmMsg = document.getElementById('confirmMsg');
  confirmTitle.textContent = title;
  confirmMsg.textContent = msg;
  openModal('modalConfirm');
  const yesBtn = document.getElementById('confirmYes');
  // netejar handler anterior
  yesBtn.onclick = () => {
    closeModal('modalConfirm');
    try { yesCallback(); } catch (e) { console.error(e); }
  };
}

// attach modal-close buttons (delegation)
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.matches && t.matches('.modal-close')) {
    const which = t.getAttribute('data-modal-close');
    if (which) closeModal(which);
  }
});

// També accessibles globalment per als scripts que no són mòduls (p. ex. competencial.js)
window.openModal = openModal;
window.closeModal = closeModal;

// Esc tanca el modal obert més amunt; clic al fons fosc tanca els modals senzills.
// (no es toquen la importació de Classroom, que pot estar a mig procés, ni els quadres amb camps llargs com el càlcul)
const NO_ESC = new Set(['modalClassroomImport']);
const BACKDROP_OK = new Set(['modalCreateClass', 'modalAddStudent', 'modalAddActivity', 'modalConfirm']);
const openModals = () => [...document.querySelectorAll('[id^="modal"]')]
  .filter(el => el.querySelector(':scope > .modal-backdrop') && el.style.display !== 'none' && !el.classList.contains('hidden'));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const top = openModals().pop();
  if (top && !NO_ESC.has(top.id)) { closeModal(top.id); e.preventDefault(); }
});
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('modal-backdrop') && t.parentElement && BACKDROP_OK.has(t.parentElement.id)) closeModal(t.parentElement.id);
});
