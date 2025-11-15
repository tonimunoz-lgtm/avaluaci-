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
