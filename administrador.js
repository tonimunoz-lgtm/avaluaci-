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
    tr.innerHTML = `
      <td>${esc(data.nom || '-')}</td>
      <td>${esc(data.email || '-')}</td>
      <td>${data.createdAt ? data.createdAt.toDate().toLocaleString() : '-'}</td>
      <td>${data.isAdmin ? 'Sí' : 'No'}</td>
     <td>${data.suspended ? 'Sí' : 'No'}</td>
     <td>${data.deleted ? 'Sí' : 'No'}</td>
      <td>
        <button class="btn-suspend-toggle px-2 py-1 bg-yellow-400 text-white rounded" data-id="${esc(doc.id)}">${data.suspended ? 'Reactivar' : 'Suspendre'}</button>
        <button class="btn-reset px-2 py-1 bg-blue-400 text-white rounded" data-id="${esc(doc.id)}">Reset PW</button>
        <button class="btn-admin-toggle px-2 py-1 bg-indigo-500 text-white rounded" data-id="${esc(doc.id)}">${data.isAdmin ? 'Treure admin' : 'Fer admin'}</button>
        <button class="btn-delete px-2 py-1 bg-red-500 text-white rounded" data-id="${esc(doc.id)}">Eliminar</button>
      </td>
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
 document.querySelectorAll('.btn-reset').forEach(btn => {
    btn.addEventListener('click', () => resetPassword(btn.dataset.id));
  });
  document.querySelectorAll('.btn-admin-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleAdmin(btn.dataset.id));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => deleteUser(btn.dataset.id);
  });
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
      alert("🔹 Usuari suspès correctament. Rebrà un avís al login.");
    } else {
      alert("🔹 Usuari reactivat correctament.");
    }

    // Recarregar llista d'usuaris si tens aquesta funció
    loadUsers();

  } catch (e) {
    console.error("Error canviant estat de suspensió:", e);
    alert("⚠️ Error canviant estat de suspensió.");
  }
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
// Marcar usuari com a eliminat, sense esborrar document
async function deleteUser(uid) {
  if (!confirm('Estàs segur que vols eliminar aquest usuari?')) return;

  try {
    await db.collection('professors').doc(uid).update({ deleted: true, suspended: false });
    alert("Usuari marcat com a eliminat. Ja no podrà entrar a l'app. (El seu compte d'autenticació continua existint; per restaurar-lo, edita deleted=false a Firestore.)");
    loadUsers(); // Recarregar llista d'usuaris
    return true;
  } catch (e) {
    console.error("Error eliminant usuari:", e);
    alert("⚠️ Error eliminant usuari: " + e.message);
    return false;
  }
}


// Crear nou usuari (amb una app secundària perquè l'admin NO perdi la seva sessió)
btnAddAdmin.addEventListener('click', async () => {
  const email = (prompt('Introdueix email del nou usuari:') || '').trim();
  if (!email) return;
  const password = prompt('Introdueix contrasenya (mínim 6 caràcters):');
  if (!password) return;
  const nom = prompt('Nom de l’usuari:') || email.split('@')[0];
  const makeAdmin = confirm('Vols que sigui administrador?\n(Acceptar = admin, Cancel·lar = usuari normal)');

  let secondary = null;
  try {
    secondary = firebase.apps.find(a => a.name === 'secondary') || firebase.initializeApp(firebaseConfig, 'secondary');
    const cred = await secondary.auth().createUserWithEmailAndPassword(email, password);
    const newUid = cred.user.uid;
    await secondary.auth().signOut();

    // El document el crea l'admin (sessió principal), que té permís per fer-ho
    await db.collection('professors').doc(newUid).set({
      email,
      nom,
      isAdmin: makeAdmin,
      suspended: false,
      deleted: false,
      classes: [],
      createdAt: firebase.firestore.Timestamp.now()
    });
    alert('Nou usuari creat!');
    loadUsers();
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      // Ja existeix a Authentication: només el promocionem si tenim el seu perfil
      const snap = await db.collection('professors').where('email', '==', email).get();
      if (!snap.empty && makeAdmin && confirm('Aquest email ja existeix. Convertir-lo en administrador?')) {
        await db.collection('professors').doc(snap.docs[0].id).update({ isAdmin: true });
        alert('L’usuari ja existia, ara és administrador!');
        loadUsers();
      } else {
        alert('Aquest email ja està registrat.');
      }
    } else {
      console.error(e);
      alert('Error creant l’usuari: ' + e.message);
    }
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


// administrador-enhancements.js és un mòdul separat: li exposem el que necessita
Object.assign(window, { db, auth, loadUsers, toggleSuspendUser, deleteUser, toggleAdmin, resetPassword });
