// ---------------- ADMIN ENHANCEMENTS ----------------

// Afegim input de cerca a la secció de taula
const searchInput = document.createElement('input');
searchInput.placeholder = 'Cerca per nom, email o estat...';
searchInput.className = 'border p-2 w-full mb-2 rounded';
document.querySelector('section.mb-6').insertBefore(searchInput, document.getElementById('usersTableBody').parentNode);

// Funció de filtratge per text
searchInput.addEventListener('input', () => {
  const filter = searchInput.value.toLowerCase();
  document.querySelectorAll('#usersTableBody tr').forEach(tr => {
    const text = tr.innerText.toLowerCase();
    tr.style.display = text.includes(filter) ? '' : 'none';
  });
});

// ---------------- ORDRE COLUMNES ----------------
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

// ---------------- BADGES ESTATS ----------------
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

// Observem canvis a tbody per reaplicar badges després de loadUsers()
const observer = new MutationObserver(addBadges);
observer.observe(document.getElementById('usersTableBody'), { childList: true });

// ---------------- HOVER FILA ----------------
function addHoverEffect() {
  document.querySelectorAll('#usersTableBody tr').forEach(tr => {
    tr.addEventListener('mouseenter', () => tr.style.backgroundColor = '#f0f9ff');
    tr.addEventListener('mouseleave', () => tr.style.backgroundColor = '');
  });
}
observer.observe(document.getElementById('usersTableBody'), { childList: true });

// ---------------- TOAST UNDO ----------------
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

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// ---------------- WRAP ACCIONS EXISTENTS PER UNDO ----------------
function wrapActionsWithUndo() {
  // Suspend toggle
  document.querySelectorAll('.btn-suspend-toggle').forEach(btn => {
    const originalClick = btn.onclick || (() => {});
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
    const originalClick = btn.onclick || (() => {});
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

//-----------

//-----------
// Funció de filtratge combinat
function applyFilters() {
  const adminVal = document.getElementById('filterAdmin').value;
  const suspendedVal = document.getElementById('filterSuspended').value;
  const deletedVal = document.getElementById('filterDeleted').value;

  document.querySelectorAll('#usersTableBody tr').forEach(tr => {
    const admin = tr.children[3].innerText.toLowerCase();
    const suspended = tr.children[4].innerText.toLowerCase();
    const deleted = tr.children[5].innerText.toLowerCase();

    const show =
      (!adminVal || admin === adminVal) &&
      (!suspendedVal || suspended === suspendedVal) &&
      (!deletedVal || deleted === deletedVal);

    tr.style.display = show ? '' : 'none';
  });
}

[adminSelect, suspendedSelect, deletedSelect].forEach(select => {
  select.addEventListener('change', applyFilters);
});

const filterObserver = new MutationObserver(applyFilters);
filterObserver.observe(document.getElementById('usersTableBody'), { childList: true });

const actionObserver = new MutationObserver(wrapActionsWithUndo);
actionObserver.observe(document.getElementById('usersTableBody'), { childList: true });
  

// ---------------- FILTRAT AVANÇAT PER ESTAT AMB BOTONS ----------------
const statusFilterContainer = document.createElement('div');
statusFilterContainer.className = 'flex gap-2 mb-2';

function createStatusButton(label, color, filterValue) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = `px-3 py-1 rounded text-white font-semibold`;
  btn.style.backgroundColor = color;
  btn.onclick = () => {
    document.querySelectorAll('#usersTableBody tr').forEach(tr => {
      const admin = tr.children[3].innerText.toLowerCase();
      const suspended = tr.children[4].innerText.toLowerCase();
      const deleted = tr.children[5].innerText.toLowerCase();

      let show = false;

      switch(filterValue) {
        case 'admin':
          show = admin === 'sí';
          break;
        case 'suspended':
          show = suspended === 'sí';
          break;
        case 'deleted':
          show = deleted === 'sí';
          break;
        case 'active':
          show = suspended === 'no' && deleted === 'no';
          break;
        case 'all':
          show = true;
          break;
      }

      tr.style.display = show ? '' : 'none';
    });
  };
  return btn;
}

const adminBtn = createStatusButton('🔵 Admins', '#4f46e5', 'admin');
const suspendedBtn = createStatusButton('🟡 Suspès', '#facc15', 'suspended');
const deletedBtn = createStatusButton('🔴 Eliminats', '#ef4444', 'deleted');
const activeBtn = createStatusButton('🟢 Actius', '#10b981', 'active');
const allBtn = createStatusButton('🔁 Tots', '#6b7280', 'all');

statusFilterContainer.appendChild(adminBtn);
statusFilterContainer.appendChild(suspendedBtn);
statusFilterContainer.appendChild(deletedBtn);
statusFilterContainer.appendChild(activeBtn);
statusFilterContainer.appendChild(allBtn);

usersSection.insertBefore(statusFilterContainer, usersSection.querySelector('table'));

// Inicialitzar badges, hover i wrap d’accions
addBadges();
addHoverEffect();
wrapActionsWithUndo();
