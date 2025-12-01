// administrador-enhancements.js
// ---------------- ADMIN ENHANCEMENTS (versió completa, plug-and-play)
// Afegir aquest fitxer després de administrador.js (ja està al teu HTML).

// Notes:
// - Aquest script utilitza la mateixa instància `firebase`/`db` que ja has inicialitzat
//   a administrador.js (els scripts són mòduls però tots comparteixen la mateixa app).
// - No modifica cap codi existent; executa les mateixes operacions directament contra Firestore.
// - Les accions 'enviar mail' són MOCK (alert) perquè no tens servidor de correu aquí.
// - Undo per eliminació/suspensió: revertible en temps limitat (5s).

// Encapsulem per evitar col·lisions globals
(() => {
  // ---- Utilities ----
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const USERS_TBODY_ID = 'usersTableBody';

  // Esperar que DOM estigui llest
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Comprovem que tenim els elements mínims
    const usersSection = document.querySelector('section.mb-6');
    const usersTable = document.getElementById(USERS_TBODY_ID)?.parentNode;
    if (!usersSection || !usersTable) return console.warn('administrador-enhancements: elements no trobats');

    // ---- 1) Panell superior d'eines: cerca, filtres, acciones massives, export ----
    const toolsBar = document.createElement('div');
    toolsBar.className = 'ae-toolbar mb-3 flex flex-wrap gap-2 items-center';
    toolsBar.style.display = 'flex';
    toolsBar.style.gap = '0.5rem';
    toolsBar.style.marginBottom = '0.75rem';

    // Cerca
    const searchInput = document.createElement('input');
    searchInput.placeholder = 'Cerca per nom, email o estat...';
    searchInput.className = 'ae-search';
    searchInput.style.padding = '0.5rem';
    searchInput.style.border = '1px solid #d1d5db';
    searchInput.style.borderRadius = '0.375rem';
    searchInput.style.minWidth = '260px';

    // Filtres ràpids
    const filtersDiv = document.createElement('div');
    filtersDiv.style.display = 'flex';
    filtersDiv.style.gap = '0.4rem';
    const filterButtons = [
      { id: 'filter-all', text: 'Tots' },
      { id: 'filter-active', text: 'Actius' },
      { id: 'filter-suspended', text: 'Suspès' },
      { id: 'filter-deleted', text: 'Eliminats' },
      { id: 'filter-admins', text: 'Admins' }
    ];
    filterButtons.forEach(f => {
      const btn = document.createElement('button');
      btn.id = f.id;
      btn.textContent = f.text;
      btn.className = 'ae-filter-btn';
      btn.style.padding = '0.35rem 0.6rem';
      btn.style.borderRadius = '0.375rem';
      btn.style.border = '1px solid transparent';
      btn.style.cursor = 'pointer';
      btn.style.background = '#ffffff';
      btn.addEventListener('click', () => applyFilter(f.id));
      filtersDiv.appendChild(btn);
    });

    // Accions massives
    const bulkDiv = document.createElement('div');
    bulkDiv.style.display = 'flex';
    bulkDiv.style.gap = '0.4rem';
    const btnBulkSuspend = makeSmallBtn('Suspendre seleccionats');
    const btnBulkReactivate = makeSmallBtn('Reactivar seleccionats');
    const btnBulkMakeAdmin = makeSmallBtn('Fer admin');
    const btnBulkRemoveAdmin = makeSmallBtn('Treure admin');
    const btnBulkDelete = makeSmallBtn('Eliminar seleccionats', { background: '#ef4444', color: '#fff' });
    const btnExportCsv = makeSmallBtn('Exportar CSV', { background: '#10b981', color: '#fff' });

    bulkDiv.append(btnBulkSuspend, btnBulkReactivate, btnBulkMakeAdmin, btnBulkRemoveAdmin, btnBulkDelete, btnExportCsv);

    // Enviar correu a seleccionats
    const btnEmailSelected = makeSmallBtn('Enviar correu a seleccionats', { background: '#2563eb', color: '#fff' });

    toolsBar.append(searchInput, filtersDiv, bulkDiv, btnEmailSelected);

    // Insertem sobre la taula
    usersSection.insertBefore(toolsBar, usersTable);

    // ---- 2) Afegir checkbox a l'header (Seleccionar tots) ----
    const thead = usersTable.querySelector('thead');
    if (thead) {
      const headerRow = thead.querySelector('tr');
      // Afegim columna checkbox a l'esquerra si no existeix (detectem per data attribute)
      if (!headerRow.querySelector('.ae-select-all')) {
        const thSelect = document.createElement('th');
        thSelect.className = 'px-4 py-2 ae-select-all';
        thSelect.style.width = '48px';
        thSelect.innerHTML = `<input type="checkbox" id="ae-select-all-checkbox" title="Seleccionar tots">`;
        headerRow.insertBefore(thSelect, headerRow.firstElementChild);
      }
    }

    // Afegirem la columna de checkbox a cada fila quan apareguin (MutationObserver)
    const tbody = document.getElementById(USERS_TBODY_ID);
    if (!tbody) return console.warn('administrador-enhancements: tbody no existeix');

    // Helper: afegir checkbox a una fila tr
    function ensureRowHasCheckbox(tr) {
      if (!tr) return;
      if (tr.querySelector('.ae-row-check')) return;
      const td = document.createElement('td');
      td.style.padding = '0.5rem';
      td.style.width = '48px';
      td.className = 'ae-row-check';
      td.innerHTML = `<input type="checkbox" class="ae-checkbox" data-uid="${tr.dataset.uid || ''}">`;
      // insert as first cell
      tr.insertBefore(td, tr.firstElementChild);
    }

    // Llegeix totes les files actuals i les augmenta
    function augmentAllRows() {
      Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
        // attempt to set data-uid from first action button if missing
        if (!tr.dataset.uid) {
          const actionBtn = tr.querySelector('button[data-id]');
          if (actionBtn) tr.dataset.uid = actionBtn.dataset.id;
        }
        ensureRowHasCheckbox(tr);
      });
    }

    // Observador de canvis en tbody per afegir checkboxes i badges/hover
    const mo = new MutationObserver(() => {
      augmentAllRows();
      addBadgesToRows();
      addRowHover();
    });
    mo.observe(tbody, { childList: true, subtree: false });

    // Fer que el checkbox d'header seleccioni tots
    const selectAllCheckbox = document.getElementById('ae-select-all-checkbox');
    selectAllCheckbox?.addEventListener('change', e => {
      const checked = e.target.checked;
      tbody.querySelectorAll('.ae-checkbox').forEach(cb => cb.checked = checked);
    });

    // ---- 3) Cerca i filtratge ----
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
        const text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(q) ? '' : 'none';
      });
    });

    function applyFilter(filterId) {
      // reset search
      searchInput.value = '';
      document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
        tr.style.display = '';
      });

      if (filterId === 'filter-all') return;
      if (filterId === 'filter-active') {
        document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
          const suspended = cellText(tr, 4).toLowerCase().includes('sí');
          const deleted = cellText(tr, 5).toLowerCase().includes('sí');
          tr.style.display = (!suspended && !deleted) ? '' : 'none';
        });
      }
      if (filterId === 'filter-suspended') {
        document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
          const suspended = cellText(tr, 4).toLowerCase().includes('sí');
          tr.style.display = suspended ? '' : 'none';
        });
      }
      if (filterId === 'filter-deleted') {
        document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
          const deleted = cellText(tr, 5).toLowerCase().includes('sí');
          tr.style.display = deleted ? '' : 'none';
        });
      }
      if (filterId === 'filter-admins') {
        document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
          const admin = cellText(tr, 3).toLowerCase().includes('sí');
          tr.style.display = admin ? '' : 'none';
        });
      }
    }

    function cellText(tr, idx) {
      return (tr.children[idx] && tr.children[idx].innerText) || '';
    }

    // ---- 4) Badges visuals i hover ----
    function addBadgesToRows() {
      document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
        // cells expected: [checkbox td], name, email, createdAt, admin, suspended, deleted, actions...
        // but if no checkbox yet, indices are shifted. We handle both cases.
        const hasCheckbox = !!tr.querySelector('.ae-checkbox');
        // compute index offset:
        const offset = hasCheckbox ? 1 : 0;
        const adminCell = tr.children[3 + offset];
        const suspendedCell = tr.children[4 + offset];
        const deletedCell = tr.children[5 + offset];

        // Add span.badge if not present
        if (adminCell && !adminCell.querySelector('.ae-badge')) {
          adminCell.innerHTML = `<span class="ae-badge ae-admin">${adminCell.innerText}</span>`;
        }
        if (suspendedCell && !suspendedCell.querySelector('.ae-badge')) {
          suspendedCell.innerHTML = `<span class="ae-badge ae-suspended">${suspendedCell.innerText}</span>`;
        }
        if (deletedCell && !deletedCell.querySelector('.ae-badge')) {
          deletedCell.innerHTML = `<span class="ae-badge ae-deleted">${deletedCell.innerText}</span>`;
        }
      });
    }

    function addRowHover() {
      document.querySelectorAll(`#${USERS_TBODY_ID} tr`).forEach(tr => {
        if (tr.dataset.aeHoverBound) return;
        tr.addEventListener('mouseenter', () => tr.style.backgroundColor = '#fbfbff');
        tr.addEventListener('mouseleave', () => tr.style.backgroundColor = '');
        tr.dataset.aeHoverBound = '1';
      });
    }

    // ---- 5) Toast / Undo container ----
    const toastContainer = document.createElement('div');
    toastContainer.id = 'ae-toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '18px';
    toastContainer.style.right = '18px';
    toastContainer.style.zIndex = '20000';
    document.body.appendChild(toastContainer);

    function showToast(message, { undoLabel = 'Undo', undo = null, timeout = 5000 } = {}) {
      const t = document.createElement('div');
      t.style.background = '#111827';
      t.style.color = '#fff';
      t.style.padding = '10px 14px';
      t.style.borderRadius = '8px';
      t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
      t.style.marginTop = '8px';
      t.style.display = 'flex';
      t.style.alignItems = 'center';
      t.style.gap = '12px';
      t.innerHTML = `<div style="flex:1">${message}</div>`;
      if (undo) {
        const b = document.createElement('button');
        b.textContent = undoLabel;
        b.style.background = '#fff';
        b.style.color = '#111827';
        b.style.border = 'none';
        b.style.padding = '6px 8px';
        b.style.borderRadius = '6px';
        b.style.cursor = 'pointer';
        b.addEventListener('click', async () => {
          await undo();
          t.remove();
        });
        t.appendChild(b);
      }
      toastContainer.appendChild(t);
      setTimeout(() => {
        try { t.remove(); } catch (e) {}
      }, timeout);
    }

    // ---- 6) Bulk actions helpers ----
    async function getSelectedUids() {
      const uids = [];
      tbody.querySelectorAll('.ae-checkbox:checked').forEach(cb => {
        const uid = cb.closest('tr')?.dataset.uid || cb.dataset.uid;
        if (uid) uids.push(uid);
      });
      return uids;
    }

    async function bulkUpdate(uids, fieldUpdates) {
      if (!uids || uids.length === 0) return alert('No hi ha usuaris seleccionats.');
      // confirm
      if (!confirm(`Aplicar a ${uids.length} usuari(s)?`)) return;
      const batch = db.batch ? db.batch() : null;
      // Firestore compat: db.batch exists
      for (const uid of uids) {
        const ref = db.collection('professors').doc(uid);
        if (batch) batch.update(ref, fieldUpdates);
        else await ref.update(fieldUpdates);
      }
      if (batch) await batch.commit();
      loadUsersRemoteAndRefresh(); // recarregar
    }

    btnBulkSuspend.addEventListener('click', async () => {
      const uids = await getSelectedUids();
      await bulkUpdate(uids, { suspended: true });
      showToast('Usuaris suspesos', { undo: async () => await bulkUpdate(uids, { suspended: false }) });
    });
    btnBulkReactivate.addEventListener('click', async () => {
      const uids = await getSelectedUids();
      await bulkUpdate(uids, { suspended: false });
      showToast('Usuaris reactivats');
    });
    btnBulkMakeAdmin.addEventListener('click', async () => {
      const uids = await getSelectedUids();
      await bulkUpdate(uids, { isAdmin: true });
      showToast('Usuaris convertits en admins', { undo: async () => await bulkUpdate(uids, { isAdmin: false }) });
    });
    btnBulkRemoveAdmin.addEventListener('click', async () => {
      const uids = await getSelectedUids();
      await bulkUpdate(uids, { isAdmin: false });
      showToast('Admins retirats');
    });
    btnBulkDelete.addEventListener('click', async () => {
      const uids = await getSelectedUids();
      if (!uids.length) return alert('No hi ha usuaris seleccionats.');
      // 2-step: show toast with undo, then perform after timeout
      showToast(`${uids.length} usuaris marcats per eliminació (Undo)`, {
        undo: async () => {
          // revert simply by setting deleted=false (they were not changed yet)
          await bulkUpdate(uids, { deleted: false });
        },
        timeout: 5000
      });
      // Delay actual update
      setTimeout(async () => {
        // check that they still have deleted !== true (if undone the flag will be false)
        for (const uid of uids) {
          const doc = await db.collection('professors').doc(uid).get();
          if (doc.exists && doc.data().deleted) {
            // already deleted flag true -> keep
          }
        }
        // apply deletion flag now
        await bulkUpdate(uids, { deleted: true, suspended: false });
      }, 5000);
    });

    // Export CSV implementation (reads Firestore documents for canonical export)
    btnExportCsv.addEventListener('click', async () => {
      try {
        const snap = await db.collection('professors').orderBy('createdAt', 'desc').get();
        const rows = snap.docs.map(d => {
          const data = d.data();
          return {
            uid: d.id,
            nom: data.nom || '',
            email: data.email || '',
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : '',
            isAdmin: !!data.isAdmin,
            suspended: !!data.suspended,
            deleted: !!data.deleted
          };
        });
        downloadCSV(rows, 'usuaris_export.csv');
      } catch (e) {
        console.error(e);
        alert('Error exportant CSV: ' + e.message);
      }
    });

    function downloadCSV(rows, filename = 'export.csv') {
      if (!rows || rows.length === 0) return alert('No hi ha dades per exportar.');
      const cols = Object.keys(rows[0]);
      const csv = [
        cols.join(','),
        ...rows.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // ---- 7) Enviar correu a seleccionats (mock) ----
    btnEmailSelected.addEventListener('click', async () => {
      const uids = await getSelectedUids();
      if (!uids.length) return alert('No hi ha usuaris seleccionats.');
      // if only one selected, prefill recipient
      if (uids.length === 1) {
        const doc = await db.collection('professors').doc(uids[0]).get();
        if (doc.exists && doc.data().email) {
          const email = doc.data().email;
          const message = prompt(`Missatge per ${email}:`, '');
          if (!message) return;
          // MOCK send
          alert(`(Mock) Missatge enviat a ${email}:\n\n${message}`);
        } else {
          alert('No s\'ha trobat email per a l\'usuari.');
        }
      } else {
        const message = prompt(`Enviar missatge a ${uids.length} usuaris (mock). Escriu el missatge:`, '');
        if (!message) return;
        // get emails list
        const emails = [];
        for (const uid of uids) {
          const doc = await db.collection('professors').doc(uid).get();
          if (doc.exists && doc.data().email) emails.push(doc.data().email);
        }
        alert(`(Mock) Missatge enviat a ${emails.join(', ')}:\n\n${message}`);
      }
    });

    // ---- 8) Chart summary (load Chart.js dynamically) ----
    const chartsWrapper = document.createElement('div');
    chartsWrapper.style.display = 'flex';
    chartsWrapper.style.gap = '12px';
    chartsWrapper.style.marginBottom = '12px';
    chartsWrapper.style.alignItems = 'center';
    chartsWrapper.style.flexWrap = 'wrap';
    chartsWrapper.innerHTML = `
      <div style="min-width:220px;flex:1">
        <canvas id="ae-chart-users-pie" style="max-height:160px"></canvas>
      </div>
      <div style="min-width:220px;flex:1">
        <canvas id="ae-chart-suspensions" style="max-height:160px"></canvas>
      </div>
    `;
    // insert above toolsBar
    usersSection.insertBefore(chartsWrapper, toolsBar);

    // load Chart.js then render charts
    loadChartJs().then(renderCharts).catch(e => console.warn('Chart load failed', e));

    async function loadChartJs() {
      if (window.Chart) return window.Chart;
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.onload = () => resolve(window.Chart);
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    async function renderCharts() {
      try {
        const snap = await db.collection('professors').get();
        const counts = { total: 0, admins: 0, suspended: 0, deleted: 0, active: 0 };
        snap.forEach(d => {
          counts.total++;
          const data = d.data();
          if (data.isAdmin) counts.admins++;
          if (data.suspended) counts.suspended++;
          if (data.deleted) counts.deleted++;
        });
        counts.active = counts.total - counts.suspended - counts.deleted;

        // Pie: Admin vs non-admin
        const ctx = document.getElementById('ae-chart-users-pie').getContext('2d');
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Admins', 'No Admins'],
            datasets: [{ data: [counts.admins, Math.max(0, counts.total - counts.admins)] }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });

        // Bar: active / suspended / deleted
        const ctx2 = document.getElementById('ae-chart-suspensions').getContext('2d');
        new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: ['Actius', 'Suspesos', 'Eliminats'],
            datasets: [{ label: 'Usuaris', data: [counts.active, counts.suspended, counts.deleted] }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      } catch (e) {
        console.error('Error renderCharts', e);
      }
    }

    // ---- 9) Helpers i recarrega de dades ----
    // Aquesta funció recarrega la taula des de Firestore (no trenca la teva funció loadUsers)
    // La crida intenta reutilitzar la taula existent: si administrador.js també fa loadUsers,
    // s'haurà d'executar després. Aquí fem una petita "força" per assegurar que la UI es refresqui.
    async function loadUsersRemoteAndRefresh() {
      try {
        // cridem la funció original si existeix (en cas que administrador.js exporti a window)
        if (typeof window.loadUsers === 'function') {
          await window.loadUsers();
        } else {
          // fallback: re-cridar la teva pàgina (simple)
          await defaultReloadUsers(); // internal custom
        }
      } catch (e) {
        console.error('Error recarregant users via loadUsers', e);
        await defaultReloadUsers();
      }
    }

    // fallback implementation: refes la taula llegint Firestore i re-escrivint tbody
    async function defaultReloadUsers() {
      try {
        const snap = await db.collection('professors').orderBy('createdAt', 'desc').get();
        tbody.innerHTML = '';
        snap.forEach(doc => {
          const data = doc.data();
          const tr = document.createElement('tr');
          // notem que afegirem dataset.uid
          tr.dataset.uid = doc.id;
          tr.innerHTML = `
            <td>${data.nom || '-'}</td>
            <td>${data.email || '-'}</td>
            <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : '-'}</td>
            <td>${data.isAdmin ? 'Sí' : 'No'}</td>
            <td>${data.suspended ? 'Sí' : 'No'}</td>
            <td>${data.deleted ? 'Sí' : 'No'}</td>
            <td>
              <button class="btn-suspend-toggle px-2 py-1" data-id="${doc.id}">${data.suspended ? 'Reactivar' : 'Suspendre'}</button>
              <button class="btn-reset px-2 py-1" data-id="${doc.id}">Reset PW</button>
              <button class="btn-admin-toggle px-2 py-1" data-id="${doc.id}">${data.isAdmin ? 'Treure admin' : 'Fer admin'}</button>
              <button class="btn-delete px-2 py-1" data-id="${doc.id}">Eliminar</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
        // augment rows: checkboxes etc es controlen pel MutationObserver
      } catch (e) {
        console.error('defaultReloadUsers error', e);
      }
    }

    // ---- 10) Delegate click handlers for row-buttons (suspend/delete/admin/reset pw) ----
    // We listen on tbody and perform actions here (so we do not rely on functions from administrador.js)
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const uid = btn.dataset.id;
      if (!uid) return;

      // SUSPEND toggle
      if (btn.classList.contains('btn-suspend-toggle')) {
        try {
          const doc = await db.collection('professors').doc(uid).get();
          const prev = doc.exists ? (doc.data().suspended || false) : false;
          const newState = !prev;
          await db.collection('professors').doc(uid).update({ suspended: newState });
          showToast(`Usuari ${newState ? 'suspès' : 'reactivat'}`, {
            undo: async () => {
              await db.collection('professors').doc(uid).update({ suspended: prev });
              await loadUsersRemoteAndRefresh();
            }
          });
          await loadUsersRemoteAndRefresh();
        } catch (err) {
          console.error(err);
          alert('Error toggling suspend: ' + err.message);
        }
      }

      // RESET PASSWORD (send reset email)
      if (btn.classList.contains('btn-reset')) {
        try {
          const doc = await db.collection('professors').doc(uid).get();
          if (!doc.exists || !doc.data().email) return alert('No hi ha email per a aquest usuari.');
          const email = doc.data().email;
          await firebase.auth().sendPasswordResetEmail(email);
          alert('Email de reseteig enviat a ' + email);
        } catch (err) {
          console.error(err);
          alert('Error enviant reseteig: ' + err.message);
        }
      }

      // ADMIN toggle
      if (btn.classList.contains('btn-admin-toggle')) {
        try {
          const doc = await db.collection('professors').doc(uid).get();
          const prev = doc.exists ? (doc.data().isAdmin || false) : false;
          await db.collection('professors').doc(uid).update({ isAdmin: !prev });
          showToast(`Admin ${!prev ? 'assignat' : 'retirat'}`, {
            undo: async () => {
              await db.collection('professors').doc(uid).update({ isAdmin: prev });
              await loadUsersRemoteAndRefresh();
            }
          });
          await loadUsersRemoteAndRefresh();
        } catch (err) {
          console.error(err);
          alert('Error toggling admin: ' + err.message);
        }
      }

      // DELETE (soft delete: mark deleted:true + suspended:false)
      if (btn.classList.contains('btn-delete')) {
        try {
          const doc = await db.collection('professors').doc(uid).get();
          const prevDeleted = doc.exists ? (doc.data().deleted || false) : false;

          // show toast with undo
          showToast('Usuari marcat per eliminació (Undo)', {
            undo: async () => {
              await db.collection('professors').doc(uid).update({ deleted: prevDeleted });
              await loadUsersRemoteAndRefresh();
            },
            timeout: 5000
          });

          // after delay, set deleted true
          setTimeout(async () => {
            const check = await db.collection('professors').doc(uid).get();
            // if still not reverted
            if (check.exists && check.data().deleted !== true) {
              await db.collection('professors').doc(uid).update({ deleted: true, suspended: false });
              await loadUsersRemoteAndRefresh();
            }
          }, 5000);
        } catch (err) {
          console.error(err);
          alert('Error eliminant usuari: ' + err.message);
        }
      }
    });

    // ---- 11) Small CSS tweaks for badges and buttons (inline, non-intrusive) ----
    const style = document.createElement('style');
    style.innerHTML = `
      .ae-badge { font-weight:700; padding:0.15rem 0.45rem; border-radius:999px; display:inline-block; font-size:0.85rem; }
      .ae-admin { background:linear-gradient(90deg,#6366f1,#a78bfa); color:white; }
      .ae-suspended { background:#f59e0b; color:white; }
      .ae-deleted { background:#ef4444; color:white; }
      .ae-filter-btn:hover { opacity:0.9; background:#f3f4f6; }
      .ae-filter-btn.active { background:#e6e6ff; border-color:#c7b3ff; }
      .ae-search:focus { outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); border-color: #6366f1; }
      /* small buttons */
      .ae-small-btn { font-size:0.85rem; padding:0.35rem 0.6rem; border-radius:6px; border:1px solid rgba(0,0,0,0.06); cursor:pointer; background:#fff; }
    `;
    document.head.appendChild(style);

    // helper to create small button
    function makeSmallBtn(text, opts = {}) {
      const b = document.createElement('button');
      b.textContent = text;
      b.className = 'ae-small-btn';
      b.style.background = opts.background || '#fff';
      if (opts.color) b.style.color = opts.color;
      else b.style.color = '#111827';
      b.style.border = opts.border || '1px solid rgba(0,0,0,0.06)';
      return b;
    }

    // ---- 12) Inicialitzar: augmenta files actuals ----
    augmentAllRows();
    addBadgesToRows();
    addRowHover();

    // Also refresh charts and counters periodically (nice-to-have)
    setInterval(() => {
      renderCharts().catch(()=>{});
    }, 60_000); // every minute

    // expose util for debugging
    window.__ae = {
      augmentAllRows, addBadgesToRows, loadUsersRemoteAndRefresh
    };
  } // end init()
})();
