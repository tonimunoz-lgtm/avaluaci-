// administrador.js

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
const usersTable = document.getElementById('usersTable'); // taula on mostrarem els usuaris
const btnCreateAdmin = document.getElementById('btnCreateAdmin');
const btnLogout = document.getElementById('btnLogout');
btnLogout.addEventListener('click', async () => {
  await auth.signOut();
  window.location.href = 'index.html';
});


// ---------------- FUNCIONS ----------------

// Carrega la llista d'usuaris
async function loadUsers() {
  usersTable.innerHTML = ''; // buidem la taula
  const snapshot = await db.collection('professors').orderBy('createdAt', 'desc').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${data.nom || ''}</td>
      <td>${data.email}</td>
      <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : '-'}</td>
      <td>
        <button class="btn-suspend" data-id="${doc.id}">Suspendre</button>
        <button class="btn-delete" data-id="${doc.id}">Eliminar</button>
        <button class="btn-admin" data-id="${doc.id}">${data.isAdmin ? 'Treure admin' : 'Fer admin'}</button>
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

// Crear un nou admin manualment
btnCreateAdmin.addEventListener('click', async () => {
  const email = prompt('Introdueix el correu del nou administrador:');
  if (!email) return;
  const password = prompt('Introdueix la contrasenya:');
  if (!password) return;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('professors').doc(userCredential.user.uid).set({
      email,
      isAdmin: true,
      createdAt: firebase.firestore.Timestamp.now()
    });
    alert('Nou administrador creat!');
    loadUsers();
  } catch (e) {
    alert('Error creant l’usuari: ' + e.message);
  }
});

// ---------------- EXECUCIÓ ----------------
window.addEventListener('DOMContentLoaded', () => {
  // Només usuaris admins poden accedir a aquesta pàgina
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    const doc = await db.collection('professors').doc(user.uid).get();
    if (!doc.exists || !doc.data().isAdmin) return window.location.href = 'index.html';
    loadUsers();
  });
});
