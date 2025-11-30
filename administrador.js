// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.firebasestorage.app",
  messagingSenderId: "324570393360",
  appId: "1:324570393360:web:13a65fc948813805c5395"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------------- Globals ----------------
const usersTableBody = document.getElementById('usersTableBody');
const btnAddAdmin = document.getElementById('btnAddAdmin');
const btnLogout = document.getElementById('btnLogout');
const btnSendEmail = document.getElementById('btnSendEmail');
const lastLoginsContainer = document.getElementById('lastLoginsContainer');
const btnBackToApp = document.getElementById('btnBackToApp');

// ---------------- FUNCIONS ----------------

// Carregar llista d'usuaris
async function loadUsers() {
  usersTableBody.innerHTML = '';

  // Obtenim tots els documents de professors
  const snapshot = await db.collection('professors').orderBy('createdAt', 'desc').get();

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
        <td>${email}</td>
        <td>-</td>
        <td>No</td>
        <td>No</td>
        <td>-</td>
      `;
      usersTableBody.appendChild(tr);
    });

    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.nom || '-'}</td>
      <td>${data.email || '-'}</td>
      <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : '-'}</td>
      <td>${data.isAdmin ? 'Sí' : 'No'}</td>
      <td>${data.suspended ? 'Sí' : 'No'}</td>
      <td>
        <button class="btn-suspend-toggle px-2 py-1 bg-yellow-400 text-white rounded" data-id="${doc.id}">${data.suspended ? 'Reactivar' : 'Suspendre'}</button>
        <button class="btn-reset px-2 py-1 bg-blue-400 text-white rounded" data-id="${doc.id}">Reset PW</button>
        <button class="btn-admin-toggle px-2 py-1 bg-indigo-500 text-white rounded" data-id="${doc.id}">${data.isAdmin ? 'Treure admin' : 'Fer admin'}</button>
        <button class="btn-delete px-2 py-1 bg-red-500 text-white rounded" data-id="${doc.id}">Eliminar</button>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });

  attachUserButtons();
}

// Assignar esdeveniments als botons de cada fila
function attachUserButtons() {
  document.querySelectorAll('.btn-suspend-toggle').forEach(btn => {
    btn.addEventListener('click', () => togglesuspendUser(btn.dataset.id));
  });
  document.querySelectorAll('.btn-reset').forEach(btn => {
    btn.addEventListener('click', () => resetPassword(btn.dataset.id));
  });
  document.querySelectorAll('.btn-admin-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleAdmin(btn.dataset.id));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
  });
 
}

// ---------------- ACCIONS ----------------



//-------------reactivar/suspendre usuari-----------------
// Toggle suspensió
async function toggleSuspendUser(uid) {

  const doc = await db.collection('professors').doc(uid).get();
  if (!doc.exists) return;

  const current = doc.data().suspended || false;
  const email = doc.data().email;

  // Nou estat (invertit)
  const newState = !current;

  await db.collection('professors').doc(uid).update({
    suspended: newState,
    suspendedAt: newState ? firebase.firestore.Timestamp.now() : null
  });

  if (newState) {
    // Si s'està SUSPENENT → enviem correu mínim d’avís
    auth.sendPasswordResetEmail(email).catch(() => {});
    alert("Usuari suspès.\nRebrà un correu d’avís automàtic.");
  } else {
    alert("Usuari reactivat correctament.");
  }

  loadUsers();
}


// Reset contrasenya
async function resetPassword(uid) {
  const doc = await db.collection('professors').doc(uid).get();
  if (!doc.exists) return;
  const email = doc.data().email;
  if (!email) return alert('No hi ha email associat a aquest usuari.');
  auth.sendPasswordResetEmail(email)
      .then(() => alert('Email de reseteig enviat a ' + email))
      .catch(e => alert('Error: ' + e.message));
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
async function deleteUser(uid) {
  if (!confirm('Estàs segur que vols eliminar aquest usuari?')) return;
  await db.collection('professors').doc(uid).delete();
  loadUsers();
}

// Crear nou usuari o admin
btnAddAdmin.addEventListener('click', async () => {
  const email = prompt('Introdueix email del nou usuari:');
  if (!email) return;
  const password = prompt('Introdueix contrasenya:');
  if (!password) return;
  const nom = prompt('Nom de l’usuari:') || '';

  try {
    // Creem usuari a Firebase Auth
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('professors').doc(userCredential.user.uid).set({
      email,
      nom,
      isAdmin: true,
      suspended: false,
      createdAt: firebase.firestore.Timestamp.now()
    });
    alert('Nou usuari creat amb permisos d’admin!');
    loadUsers();
  } catch(e) {
    // Si l'usuari ja existeix, fem update a isAdmin
    const snapshot = await db.collection('professors').where('email', '==', email).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      await db.collection('professors').doc(doc.id).update({ isAdmin: true });
      alert('L’usuari ja existia, ara és administrador!');
      loadUsers();
    } else {
      alert('Error creant l’usuari: ' + e.message);
    }
  }
});

// Enviar correu (mock)
btnSendEmail.addEventListener('click', () => {
  const recipient = document.getElementById('emailRecipient').value.trim();
  const message = document.getElementById('emailMessage').value.trim();
  if (!recipient || !message) return alert('Omple usuari i missatge');
  alert(`Missatge enviat a ${recipient}:\n\n${message}`);
  document.getElementById('emailRecipient').value = '';
  document.getElementById('emailMessage').value = '';
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
  if (!confirm('Segur que vols migrar els usuaris antics? Afegirà nom, isAdmin, suspended i createdAt.')) return;

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

    alert(`Migració completada! S'han actualitzat ${migratedCount} usuaris antics.`);
  } catch (e) {
    console.error('Error migració:', e);
    alert('Error durant la migració: ' + e.message);
  }
}
