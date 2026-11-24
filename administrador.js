// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.firebasestorage.app",
  messagingSenderId: "324570393360",
  appId: "1:324570393360:web:13a65fcf948813805c5395"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------------- Globals ----------------
const usersTableBody = document.getElementById('usersTableBody');
const btnAddAdmin = document.getElementById('btnAddAdmin');
const btnLogout = document.getElementById('btnLogout');
const lastLoginsContainer = document.getElementById('lastLoginsContainer');
const btnBackToApp = document.getElementById('btnBackToApp');

// ---------------- FUNCIONS ----------------

// Carregar llista d'usuaris
async function loadUsers() {
  usersTableBody.innerHTML = '';

  // Obtenim tots els documents de professors
  const snapshot = await db.collection('professors').get();
  const docs = snapshot.docs.slice().sort((a, b) => {
    const ta = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
    const tb = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
    return tb - ta; // més nous primer; els antics sense createdAt al final
  });

  if (snapshot.empty) { usersTableBody.innerHTML = '<tr><td colspan="7">Cap usuari registrat.</td></tr>'; return; }

  docs.forEach(doc => { _emails[doc.id] = doc.data().email || ''; });
  docs.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement('tr');
    if (data.deleted) tr.className = 'row-deleted';
    const actions = data.deleted
      ? `<button class="btn-restore px-2 py-1 bg-green-500 text-white rounded" data-id="${esc(doc.id)}">Restaurar</button>
         <button class="btn-purge px-2 py-1 bg-red-500 text-white rounded" data-id="${esc(doc.id)}">Esborrar definitivament</button>`
      : `<button class="btn-suspend-toggle px-2 py-1 bg-yellow-400 text-white rounded" data-id="${esc(doc.id)}">${data.suspended ? 'Reactivar' : 'Suspendre'}</button>
         <button class="btn-admin-toggle px-2 py-1 bg-indigo-500 text-white rounded" data-id="${esc(doc.id)}">${data.isAdmin ? 'Treure admin' : 'Fer admin'}</button>
         <button class="btn-delete px-2 py-1 bg-red-500 text-white rounded" data-id="${esc(doc.id)}">Eliminar</button>`;
    tr.innerHTML = `
      <td>${esc(data.nom || data.name || '-')}</td>
      <td>${esc(data.email || '-')}</td>
      <td data-ts="${data.createdAt ? data.createdAt.toMillis() : 0}">${data.createdAt ? data.createdAt.toDate().toLocaleString('ca-ES') : '-'}</td>
      <td><span class="badge ${data.isAdmin ? 'b-admin' : 'b-no'}">${data.isAdmin ? 'Sí' : 'No'}</span></td>
      <td><span class="badge ${data.suspended ? 'b-susp' : 'b-no'}">${data.suspended ? 'Sí' : 'No'}</span></td>
      <td><span class="badge ${data.deleted ? 'b-del' : 'b-no'}">${data.deleted ? 'Sí' : 'No'}</span></td>
      <td>${actions}</td>
    `;
    usersTableBody.appendChild(tr);
  });

  attachUserButtons();
}

// Assignar esdeveniments als botons de cada fila
function attachUserButtons() {
  
  // --- TOGGLE SUSPENSIÓ ---
  document.querySelectorAll('.btn-suspend-toggle').forEach(btn => {
    btn.onclick = () => toggleSuspendUser(btn.dataset.id);
  });
  document.querySelectorAll('.btn-admin-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleAdmin(btn.dataset.id));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => deleteUser(btn.dataset.id);
  });
  document.querySelectorAll('.btn-restore').forEach(btn => {
    btn.onclick = () => restoreUser(btn.dataset.id);
  });
  document.querySelectorAll('.btn-purge').forEach(btn => {
    btn.onclick = () => purgeUser(btn.dataset.id);
  });
  const nDel = document.querySelectorAll('#usersTableBody tr.row-deleted').length;
  const hint = document.getElementById('deletedHint');
  if (hint) hint.textContent = nDel ? `${nDel} usuari${nDel > 1 ? 's' : ''} eliminat${nDel > 1 ? 's' : ''} amagat${nDel > 1 ? 's' : ''}. Els pots veure amb el filtre «Eliminats».` : '';
}

// Restaurar un usuari marcat com a eliminat
// Registre d'accions d'administració (admin_log): qui ha fet què sobre qui i quan
const _emails = {};   // uid -> email (cau de la darrera càrrega)
async function logAdmin(action, targetUid, extra = {}) {
  try {
    await db.collection('admin_log').add({
      ts: firebase.firestore.Timestamp.now(),
      by: auth.currentUser.uid, byEmail: auth.currentUser.email || '',
      action, target: targetUid, targetEmail: _emails[targetUid] || '', ...extra
    });
  } catch (e) { console.warn('No s\'ha pogut registrar l\'acció:', e.message); }
}

const isSelf = uid => auth.currentUser && auth.currentUser.uid === uid;
const noSelf = () => notify('No pots fer aquesta acció sobre el teu propi compte (et quedaries sense accés a l\'administració).', 'error');

async function restoreUser(uid) {
  try {
    await db.collection('professors').doc(uid).update({ deleted: false });
    logAdmin('restaurar', uid);
    notify('Usuari restaurat.');
    loadUsers();
  } catch (e) { notify('Error: ' + e.message, 'error'); }
}

// Esborrat definitiu d'un usuari: perfil + còpies + accessos + classes, alumnes i activitats que només són seus.
// (El compte d'Authentication s'elimina a la consola de Firebase.)
async function collectUserData(uid) {
  const profs = await db.collection('professors').get();
  const me = profs.docs.find(d => d.id === uid);
  const classIds = new Set((me?.data().classes) || []);
  const usedByOthers = new Set();
  profs.docs.forEach(d => { if (d.id !== uid) (d.data().classes || []).forEach(c => usedByOthers.add(c)); });
  // classes amb ownerUid (migrades) + classes de la seva llista
  const owned = await db.collection('classes').where('ownerUid', '==', uid).get();
  owned.docs.forEach(d => classIds.add(d.id));
  const classRefs = [], studentIds = new Set(), actIds = new Set(); let skipped = 0;
  for (const cid of classIds) {
    const cd = await db.collection('classes').doc(cid).get();
    if (!cd.exists) continue;
    const c = cd.data();
    if (usedByOthers.has(cid) || (c.ownerUid && c.ownerUid !== uid)) { skipped++; continue; }   // compartida: no es toca
    classRefs.push(cd.ref);
    (c.alumnes || []).forEach(i => studentIds.add(i));
    (c.activitats || []).forEach(i => actIds.add(i));
    Object.values(c.terms || {}).forEach(t => (t.activities || []).forEach(i => actIds.add(i)));
  }
  // documents amb ownerUid que quedin fora de les classes
  for (const [col, set] of [['alumnes', studentIds], ['activitats', actIds]]) {
    const q = await db.collection(col).where('ownerUid', '==', uid).get();
    q.docs.forEach(d => set.add(d.id));
  }
  const refsOf = (col, ids) => [...ids].map(id => db.collection(col).doc(id));
  const subs = async name => (await db.collection('professors').doc(uid).collection(name).get()).docs.map(d => d.ref);
  const [logins, copies] = await Promise.all([subs('logins'), subs('copies')]);
  return { classRefs, studentRefs: refsOf('alumnes', studentIds), actRefs: refsOf('activitats', actIds), logins, copies, skipped, email: me?.data().email || '' };
}

async function purgeUser(uid) {
  if (isSelf(uid)) return noSelf();
  let plan;
  try { plan = await collectUserData(uid); }
  catch (e) { return notify('No s\'han pogut comptar les dades de l\'usuari: ' + e.message, 'error'); }
  const msg = `Esborrar DEFINITIVAMENT ${plan.email || 'aquest usuari'} i totes les seves dades?\n\n` +
    `• ${plan.classRefs.length} classes · ${plan.studentRefs.length} alumnes · ${plan.actRefs.length} activitats\n` +
    `• ${plan.copies.length} còpies de seguretat · ${plan.logins.length} registres d'accés\n` +
    (plan.skipped ? `• ${plan.skipped} classes compartides amb altres professors NO s'esborren\n` : '') +
    `\nNo es pot desfer.`;
  if (!await confirmDialog(msg, { okText: 'Esborra tot' })) return;
  try {
    const all = [...plan.studentRefs, ...plan.actRefs, ...plan.classRefs, ...plan.copies, ...plan.logins];
    for (let i = 0; i < all.length; i += 400) {
      const b = db.batch();
      all.slice(i, i + 400).forEach(r => b.delete(r));
      await b.commit();
    }
    await logAdmin('esborrar-definitivament', uid, { classes: plan.classRefs.length, alumnes: plan.studentRefs.length, activitats: plan.actRefs.length });
    await db.collection('professors').doc(uid).delete();
    notify('Usuari i dades esborrats definitivament. Recorda eliminar-ne també el compte a Firebase Authentication.');
    loadUsers(); loadLastLogins(); loadAdminLog();
  } catch (e) { notify('Error: ' + e.message, 'error'); }
}

// ---------------- ACCIONS ----------------

// Suspendre usuari
async function toggleSuspendUser(uid) {
  if (isSelf(uid)) return noSelf();
  try {
    // Llegim l'estat actual
    const doc = await db.collection('professors').doc(uid).get();
    if (!doc.exists) return;

    const currentState = doc.data().suspended || false;
    const newState = !currentState; // Toggle

    // Actualitzem Firestore
    await db.collection('professors').doc(uid).update({ suspended: newState });
    logAdmin(newState ? 'suspendre' : 'reactivar', uid);

    // Missatge a l'administrador
    if (newState) {
      notify("🔹 Usuari suspès correctament. Rebrà un avís al login.");
    } else {
      notify("🔹 Usuari reactivat correctament.");
    }

    // Recarregar llista d'usuaris si tens aquesta funció
    loadUsers();

  } catch (e) {
    console.error("Error canviant estat de suspensió:", e);
    notify("⚠️ Error canviant estat de suspensió.");
  }
}



// Toggle admin
async function toggleAdmin(uid) {
  if (isSelf(uid)) return noSelf();
  const doc = await db.collection('professors').doc(uid).get();
  if (!doc.exists) return;
  const isAdmin = doc.data().isAdmin || false;
  await db.collection('professors').doc(uid).update({ isAdmin: !isAdmin });
  logAdmin(isAdmin ? 'treure-admin' : 'fer-admin', uid);
  loadUsers();
}

// Eliminar usuari
// Marcar usuari com a eliminat, sense esborrar document
async function deleteUser(uid) {
  if (isSelf(uid)) { noSelf(); return false; }
  if (!await confirmDialog('Estàs segur que vols eliminar aquest usuari?')) return;

  try {
    await db.collection('professors').doc(uid).update({ deleted: true, suspended: false });
    logAdmin('eliminar', uid);
    notify("Usuari marcat com a eliminat. Ja no podrà entrar a l'app. (El seu compte d'autenticació continua existint; per restaurar-lo, edita deleted=false a Firestore.)");
    loadUsers(); // Recarregar llista d'usuaris
    return true;
  } catch (e) {
    console.error("Error eliminant usuari:", e);
    notify("⚠️ Error eliminant usuari: " + e.message);
    return false;
  }
}


// Només hi ha accés amb Google: els usuaris es creen sols en el primer login.
// Aquest botó converteix en administrador un usuari que ja hagi entrat alguna vegada.
btnAddAdmin.addEventListener('click', async () => {
  const email = ((await promptDialog('Email (Google) de l’usuari que vols fer administrador:', '', { title: 'Nou administrador', type: 'email' })) || '').trim().toLowerCase();
  if (!email) return;
  try {
    // comparació sense distingir majúscules (el correu pot haver-se desat amb majúscules)
    const all = await db.collection('professors').get();
    const hit = all.docs.find(d => String(d.data().email || '').trim().toLowerCase() === email);
    const snap = { empty: !hit, docs: hit ? [hit] : [] };
    if (snap.empty) {
      return notify('Aquest usuari encara no ha entrat mai a l’aplicació. Demana-li que iniciï sessió amb Google i torna-ho a provar.', 'error');
    }
    if (!await confirmDialog(`Convertir ${email} en administrador?`, { okText: 'Fer admin', danger: false })) return;
    await db.collection('professors').doc(snap.docs[0].id).update({ isAdmin: true });
    _emails[snap.docs[0].id] = email; logAdmin('fer-admin', snap.docs[0].id);
    notify('Ara és administrador.');
    loadUsers();
  } catch (e) {
    console.error(e);
    notify('Error: ' + e.message, 'error');
  }
});

// Últims 10 accessos per usuari, ordenats per l'últim accés (els que no han entrat mai, al final)
const fmtDT = d => d.toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function loadLastLogins() {
  lastLoginsContainer.innerHTML = '<p style="color:#6b7280;font-size:.88rem">Carregant…</p>';
  try {
    const snapshot = await db.collection('professors').get();
    const rows = await Promise.all(snapshot.docs.map(async doc => {
      const d = doc.data();
      let times = [];
      try {
        const ls = await db.collection('professors').doc(doc.id).collection('logins').orderBy('timestamp', 'desc').limit(10).get();
        times = ls.docs.map(x => x.data().timestamp?.toDate?.()).filter(Boolean);
      } catch (e) { console.warn('logins', doc.id, e); }
      return { email: d.email || doc.id, nom: d.nom || d.name || '', deleted: !!d.deleted, suspended: !!d.suspended, times };
    }));
    rows.sort((a, b) => (b.times[0]?.getTime() || 0) - (a.times[0]?.getTime() || 0) || a.email.localeCompare(b.email));
    lastLoginsContainer.innerHTML = '';
    rows.forEach(r => {
      const div = document.createElement('div');
      div.className = 'll-item' + (r.deleted ? ' ll-deleted' : '');
      const tag = r.deleted ? ' <span class="badge b-del">eliminat</span>' : r.suspended ? ' <span class="badge b-susp">suspès</span>' : '';
      const last = r.times[0];
      div.innerHTML = `<div class="ll-head"><span class="ll-mail">${esc(r.email)}</span>${tag}
          <span class="ll-last">${last ? 'Últim accés: <b>' + esc(fmtDT(last)) + '</b>' : 'Cap accés'}</span></div>` +
        (r.times.length > 1 ? `<details class="ll-more"><summary>Veure els ${r.times.length} últims accessos</summary><ul>${r.times.map(t => `<li>${esc(fmtDT(t))}</li>`).join('')}</ul></details>` : '');
      lastLoginsContainer.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    lastLoginsContainer.innerHTML = `<p style="color:#dc2626;font-size:.88rem">No s'han pogut carregar els accessos: ${esc(e.message)}</p>`;
  }
}

// Registre d'accions d'administració (últimes 60)
const ACTION_TXT = { 'suspendre': 'ha suspès', 'reactivar': 'ha reactivat', 'fer-admin': 'ha fet administrador', 'treure-admin': 'ha tret l\'administració a', 'eliminar': 'ha eliminat', 'restaurar': 'ha restaurat', 'esborrar-definitivament': 'ha esborrat definitivament' };
async function loadAdminLog() {
  const box = document.getElementById('adminLogContainer');
  if (!box) return;
  try {
    const snap = await db.collection('admin_log').orderBy('ts', 'desc').limit(60).get();
    if (snap.empty) { box.innerHTML = '<p style="color:#6b7280;font-size:.88rem">Encara no hi ha cap acció registrada.</p>'; return; }
    box.innerHTML = '<ul class="al-list">' + snap.docs.map(d => {
      const x = d.data(); const t = x.ts?.toDate?.();
      return `<li><span class="al-when">${t ? esc(fmtDT(t)) : ''}</span> <b>${esc(x.byEmail || x.by)}</b> ${esc(ACTION_TXT[x.action] || x.action)} <b>${esc(x.targetEmail || x.target)}</b></li>`;
    }).join('') + '</ul>';
  } catch (e) { box.innerHTML = `<p style="color:#dc2626;font-size:.88rem">No s'ha pogut carregar el registre: ${esc(e.message)} (cal desplegar les regles de Firestore actualitzades)</p>`; }
}

// ---------------- LOGOUT ----------------
btnLogout.addEventListener('click', () => {
  auth.signOut().then(() => window.location.href = 'index.html');
});

// ---------------- TORNAR AL GESTOR ----------------
if (btnBackToApp) {
  btnBackToApp.addEventListener('click', () => window.location.href = 'index.html');
}

// ---------------- INICIALITZACIÓ ----------------
window.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    const doc = await db.collection('professors').doc(user.uid).get();
    if (!doc.exists || !doc.data().isAdmin) return window.location.href = 'index.html';

    loadUsers();
    loadLastLogins();
    loadAdminLog();
  });
});


// ---------------- MIGRACIÓ USUARIS ----------------
const btnMigrateOldUsers = document.getElementById('btnMigrateOldUsers');
btnMigrateOldUsers?.addEventListener('click', migrateOldProfessors);


async function migrateOldProfessors() {
  if (!await confirmDialog('Segur que vols migrar els usuaris antics? Afegirà nom, isAdmin, suspended i createdAt.', { danger: false })) return;

  try {
    const snapshot = await db.collection('professors').get();
    let migratedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;

      if (!data.nom) { updates.nom = data.email ? data.email.split('@')[0] : ''; needsUpdate = true; }
      if (data.isAdmin === undefined) { updates.isAdmin = false; needsUpdate = true; }
      if (data.suspended === undefined) { updates.suspended = false; needsUpdate = true; }
      if (!data.createdAt) { updates.createdAt = firebase.firestore.Timestamp.now(); needsUpdate = true; }

      if (needsUpdate) {
        await db.collection('professors').doc(doc.id).update(updates);
        migratedCount++;
      }
    }

    notify(`Migració completada! S'han actualitzat ${migratedCount} usuaris antics.`);
  } catch (e) {
    console.error('Error migració:', e);
    notify('Error durant la migració: ' + e.message);
  }
}


// administrador-enhancements.js és un mòdul separat: li exposem el que necessita
Object.assign(window, { logAdmin, restoreUser, purgeUser, db, auth, loadUsers, toggleSuspendUser, deleteUser, toggleAdmin });
