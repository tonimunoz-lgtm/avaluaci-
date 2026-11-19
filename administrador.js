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

  // Si no hi ha cap document, podem provar de carregar logs com fallback
  if (snapshot.empty) {
    // Buscar tots els usuaris amb subcol·lecció logins
    const usersWithLogs = await db.collectionGroup('logins')
      .orderBy('timestamp', 'desc')
      .limit(50) // pots ajustar
      .get();

    const emails = new Set();
    usersWithLogs.forEach(doc => emails.add(doc.ref.parent.parent.id));

    emails.forEach(email => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>-</td>
        <td>${esc(email)}</td>
        <td>-</td>
        <td>No</td>
        <td>No</td>
        <td>-</td>
      `;
      usersTableBody.appendChild(tr);
    });

    return;
  }

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
      <td>${esc(data.nom || '-')}</td>
      <td>${esc(data.email || '-')}</td>
      <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : '-'}</td>
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
async function restoreUser(uid) {
  try {
    await db.collection('professors').doc(uid).update({ deleted: false });
    notify('Usuari restaurat.');
    loadUsers();
  } catch (e) { notify('Error: ' + e.message, 'error'); }
}

// Esborrar definitivament el document de Firestore (el compte d'Authentication s'elimina a la consola de Firebase)
async function purgeUser(uid) {
  if (!await confirmDialog('Esborrar definitivament aquest usuari? Desapareixerà de la llista i no es pot desfer.', { okText: 'Esborra' })) return;
  try {
    await db.collection('professors').doc(uid).delete();
    notify('Usuari esborrat definitivament.');
    loadUsers();
  } catch (e) { notify('Error: ' + e.message, 'error'); }
}

// ---------------- ACCIONS ----------------

// Suspendre usuari
async function toggleSuspendUser(uid) {
  try {
    // Llegim l'estat actual
    const doc = await db.collection('professors').doc(uid).get();
    if (!doc.exists) return;

    const currentState = doc.data().suspended || false;
    const newState = !currentState; // Toggle

    // Actualitzem Firestore
    await db.collection('professors').doc(uid).update({ suspended: newState });

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
  const doc = await db.collection('professors').doc(uid).get();
  if (!doc.exists) return;
  const isAdmin = doc.data().isAdmin || false;
  await db.collection('professors').doc(uid).update({ isAdmin: !isAdmin });
  loadUsers();
}

// Eliminar usuari
// Marcar usuari com a eliminat, sense esborrar document
async function deleteUser(uid) {
  if (!await confirmDialog('Estàs segur que vols eliminar aquest usuari?')) return;

  try {
    await db.collection('professors').doc(uid).update({ deleted: true, suspended: false });
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
    const snap = await db.collection('professors').where('email', '==', email).get();
    if (snap.empty) {
      return notify('Aquest usuari encara no ha entrat mai a l’aplicació. Demana-li que iniciï sessió amb Google i torna-ho a provar.', 'error');
    }
    if (!await confirmDialog(`Convertir ${email} en administrador?`, { okText: 'Fer admin', danger: false })) return;
    await db.collection('professors').doc(snap.docs[0].id).update({ isAdmin: true });
    notify('Ara és administrador.');
    loadUsers();
  } catch (e) {
    console.error(e);
    notify('Error: ' + e.message, 'error');
  }
});

// Últims 10 accessos per usuari
async function loadLastLogins() {
  lastLoginsContainer.innerHTML = '';
  const snapshot = await db.collection('professors').get();
  snapshot.forEach(async doc => {
    const loginsSnapshot = await db.collection('professors').doc(doc.id)
      .collection('logins').orderBy('timestamp', 'desc').limit(10).get();
    const logins = loginsSnapshot.docs.map(d => d.data().timestamp.toDate().toLocaleString()).join(', ');
    const div = document.createElement('div');
    div.textContent = `${doc.data().email}: ${logins || 'Cap accés'}`;
    lastLoginsContainer.appendChild(div);
  });
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
Object.assign(window, { restoreUser, purgeUser, db, auth, loadUsers, toggleSuspendUser, deleteUser, toggleAdmin });
