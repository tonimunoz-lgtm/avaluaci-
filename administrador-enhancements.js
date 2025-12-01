// ---------------- FILTRAT I CERCA ----------------
const searchInput = document.createElement('input');
searchInput.placeholder = 'Cerca per nom o email...';
searchInput.className = 'border p-2 w-full mb-2 rounded';
document.querySelector('section.mb-6').insertBefore(searchInput, document.getElementById('usersTableBody').parentNode);

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
document.querySelectorAll('#usersTableBody tr').forEach(tr => {
  tr.addEventListener('mouseenter', () => tr.style.backgroundColor = '#f0f9ff');
  tr.addEventListener('mouseleave', () => tr.style.backgroundColor = '');
});
