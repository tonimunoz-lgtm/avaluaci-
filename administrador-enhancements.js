// ---------------- ADMIN ENHANCEMENTS ----------------

// 1️⃣ Input de cerca a la secció de taula
const searchInput = document.createElement('input');
searchInput.placeholder = 'Cerca per nom, email o estat...';
searchInput.className = 'border p-2 w-full mb-2 rounded';
const usersSection = document.querySelector('section.mb-6');
const usersTable = document.getElementById('usersTableBody').parentNode; // table
usersSection.insertBefore(searchInput, usersTable);

// Funció de filtratge
searchInput.addEventListener('input', () => {
  const filter = searchInput.value.toLowerCase();
  document.querySelectorAll('#usersTableBody tr').forEach(tr => {
    const text = tr.innerText.toLowerCase();
    tr.style.display = text.includes(filter) ? '' : 'none';
  });
});

// 2️⃣ Ordenació columnes
document.querySelectorAll('thead th').forEach((th, index) => {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => {
    const tbody = document.getElementById('usersTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const asc = !th.asc;
    th.asc = asc;

    rows.sort((a, b) => {
      const aText = a.children[index].innerText.toLowerCase();
      const bText = b.children[index].innerText.toLowerCase();
      return aText.localeCompare(bText) * (asc ? 1 : -1);
    });

    rows.forEach(row => tbody.appendChild(row));
  });
});

// 3️⃣ Badges d’estats
function addBadges() {
  document.querySelectorAll('#usersTableBody tr').forEach(tr => {
    const adminCell = tr.children[3];
    const suspendedCell = tr.children[4];
    const deletedCell = tr.children[5];

    if (!adminCell.querySelector('.badge')) {
      adminCell.innerHTML = `<span class="badge bg-indigo-500 text-white px-2 py-0.5 rounded">${adminCell.innerText}</span>`;
      suspendedCell.innerHTML = `<span class="badge bg-yellow-400 text-white px-2 py-0.5 rounded">${suspendedCell.innerText}</span>`;
      deletedCell.innerHTML = `<span class="badge bg-red-500 text-white px-2 py-0.5 rounded">${deletedCell.innerText}</span>`;
    }
  });
}

// 4️⃣ Hover a files
function addHoverEffect() {
  document.querySelectorAll('#usersTableBody tr').forEach(tr => {
    tr.addEventListener('mouseenter', () => tr.style.backgroundColor = '#f0f9ff');
    tr.addEventListener('mouseleave', () => tr.style.backgroundColor = '');
  });
}

// 5️⃣ Toast + Undo
const toastContainer = document.createElement('div');
toastContainer.style.position = 'fixed';
toastContainer.style.bottom = '20px';
toastContainer.style.right = '20px';
toastContainer.style.zIndex = '9999';
document.body.appendChild(toastContainer);

function showToast(message, undoCallback) {
  const toast = document.createElement('div');
  toast.className = 'bg-gray-800 text-white p-3 rounded shadow-md mb-2 flex justify-between items-center';
  toast.innerHTML = `<span>${message}</span>`;
  
  if (undoCallback) {
    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'Undo';
    undoBtn.className = 'ml-4 bg-white text-gray-800 px-2 py-1 rounded';
    undoBtn.onclick = () => {
      undoCallback();
      toast.remove();
    };
    toast.appendChild(undoBtn);
  }

  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// 6️⃣ Wrap accions existents per Undo
function wrapActionsWithUndo() {
  // Suspend toggle
  document.querySelectorAll('.btn-suspend-toggle').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      const doc = await db.collection('professors').doc(uid).get();
      const prevState = doc.data().suspended || false;

      await toggleSuspendUser(uid);
      showToast(`Usuari ${prevState ? 'reactivat' : 'suspès'}`, async () => {
        await db.collection('professors').doc(uid).update({ suspended: prevState });
        loadUsers();
      });
    };
  });

  // Delete
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      const doc = await db.collection('professors').doc(uid).get();
      const prevState = doc.data().deleted || false;

      await deleteUser(uid);
      showToast(`Usuari eliminat`, async () => {
        await db.collection('professors').doc(uid).update({ deleted: prevState });
        loadUsers();
      });
    };
  });
}


// 7️⃣ Observers per reaplicar badges, hover i wrap actions quan canvia tbody
const observer = new MutationObserver(() => {
  addBadges();
  addHoverEffect();
  wrapActionsWithUndo();
});
observer.observe(document.getElementById('usersTableBody'), { childList: true });

// 8️⃣ Inicialització al carregar
addBadges();
addHoverEffect();
wrapActionsWithUndo();
