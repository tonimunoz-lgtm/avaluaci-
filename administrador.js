// administrador.js

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
const usersTable = document.getElementById('usersTableBody'); // tbody de la taula
const btnCreateAdmin = document.getElementById('btnAddAdmin');
const btnLogout = document.getElementById('btnLogout');
const btnSendEmail = document.getElementById('btnSendEmail');
const lastLoginsContainer = document.getElementById('lastLoginsContainer');

// ---------------- FUNCIONS ----------------

// Carrega la llista d'usuaris
async function loadUsers() {
  usersTable.innerHTML = ''; // buidem el tbody

  const snapshot = await db.collection('professors').orderBy('createdAt', 'desc').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${data.nom || ''}</td>
      <td>${data.email}</td>
      <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : '-'}</td>
      <td>${data.isAdmin ? 'Sí' : 'No'}</td>
      <td>${data.suspended ? 'Sí' : 'No'}</td>
      <td>
        <button class="btn-admin" data-id="${doc.id}">${data.isAdmin ? 'Treure admin' : 'Fer admin'}</button>
        <button class="btn-suspend" data-id="${doc.id}">Suspendre</button>
        <button class="btn-delete" data-id="${doc.id}">Eliminar</button>
      </td>
    `;
    usersTable.appendChild(tr);
  });

  attachUserButtons();
}

// Assignar esdeveniments als botons de cada fila
function attachUserButtons() {
  document.querySelectorAll('.btn-suspend').forEach(btn => {
    btn.addEventListener('click', () => suspendUser(btn.dataset.id));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
  });
  document.querySelectorAll('.btn-admin').forEach(btn => {
    btn.addEventListener('click', () => toggleAdmin(btn.dataset.id));
  });
}

// Suspendre usuari
async function suspendUser(uid) {
  if (!confirm('Estàs segur que vols suspendre aquest usuari?')) return;
  await db.collection('professors').doc(uid).update({ suspended: true });
  alert('Usuari suspès. Envia un email informant-lo.');
  loadUsers();
}

// Eliminar usuari
async function deleteUser(uid) {
  if (!confirm('Estàs segur que vols eliminar aquest usuari?')) return;
  await db.collection('professors').doc(uid).delete();
  loadUsers();
}

// Fer o treure admin
async function toggleAdmin(uid) {
  const doc = await db.collection('professors').doc(uid).get();
  if (!doc.exists) return;
  const isAdmin = doc.data().isAdmin || false;
  await db.collection('professors').doc(uid).update({ isAdmin: !isAdmin });
  loadUsers();
}

// Crear un nou admin per usuari existent
btnCreateAdmin.addEventListener('click', async () => {
  const email = prompt('Introdueix el correu del nou administrador:');
  if (!email) return;

  // Busquem l'usuari existent
  const snapshot = await db.collection('professors').where('email', '==', email).get();
  if (snapshot.empty) {
    return alert('No existeix cap usuari amb aquest email.');
  }

  const doc = snapshot.docs[0];
  await db.collection('professors').doc(doc.id).update({ isAdmin: true });
  alert('L’usuari ara és administrador!');
  loadUsers();
});

// Enviament de correus (només mock, sense servidor)
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
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
});

// ---------------- TORNAR AL GESTOR ----------------
const btnBackToApp = document.getElementById('btnBackToApp');
if (btnBackToApp) {
  btnBackToApp.addEventListener('click', () => window.location.href = 'index.html');
}

// ---------------- EXECUCIÓ ----------------
window.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    const doc = await db.collection('professors').doc(user.uid).get();
    if (!doc.exists || !doc.data().isAdmin) return window.location.href = 'index.html';

    loadUsers();
    loadLastLogins();
  });
});
