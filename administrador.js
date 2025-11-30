// Firebase inicialització
const app = firebase.initializeApp({
  // les teves configuracions
});
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser;

// Comprovar rol admin al carregar la pàgina
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = 'index.html';
  const userDoc = await db.collection('users').doc(user.uid).get();
  currentUser = userDoc.data();
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Accés denegat: només administradors');
    return window.location.href = 'index.html';
  }
  loadUsers();
});

// -------------------- Carregar usuaris --------------------
async function loadUsers() {
  const usersSnapshot = await db.collection('users').get();
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  usersSnapshot.forEach(doc => {
    const user = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-2 py-1">${user.nom}</td>
      <td class="px-2 py-1">${user.email}</td>
      <td class="px-2 py-1">${new Date(user.createdAt).toLocaleString()}</td>
      <td class="px-2 py-1">${user.role}</td>
      <td class="px-2 py-1">${(user.lastAccess || []).slice(-10).map(ts => new Date(ts).toLocaleString()).join('<br>')}</td>
      <td class="px-2 py-1 flex gap-1">
        <button class="suspendBtn px-2 py-1 bg-yellow-500 text-white rounded" data-id="${doc.id}">Suspèn</button>
        <button class="deleteBtn px-2 py-1 bg-red-600 text-white rounded" data-id="${doc.id}">Elimina</button>
        <button class="emailBtn px-2 py-1 bg-blue-600 text-white rounded" data-id="${doc.id}">Mail</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachUserActions();
}

// -------------------- Accions --------------------
function attachUserActions() {
  document.querySelectorAll('.suspendBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      await db.collection('users').doc(userId).update({ suspended: true });
      sendSuspensionMail(userId);
      loadUsers();
    });
  });

  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      if (confirm('Segur que vols eliminar aquest usuari?')) {
        await db.collection('users').doc(userId).delete();
        loadUsers();
      }
    });
  });

  document.querySelectorAll('.emailBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.id;
      openSendMailModal(userId);
    });
  });
}

// -------------------- Funció enviar mail de suspensió --------------------
async function sendSuspensionMail(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  const email = userDoc.data().email;

  const subject = 'Suspensió de compte';
  const body = `Benvolgut/da ${userDoc.data().nom},

Degut a un ús incorrecte del sistema, el seu compte ha estat suspès temporalment. Si creu que s'ha comès un error, si us plau contacti amb l'administrador.

Salutacions,
Equip de gestió`;

  sendEmail(email, subject, body); // Funció externa per enviar mail
}

// -------------------- Crear nou usuari --------------------
const createUserBtn = document.getElementById('createUserBtn');
const createUserModal = document.getElementById('createUserModal');
const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
const createUserForm = document.getElementById('createUserForm');

createUserBtn.addEventListener('click', () => createUserModal.classList.remove('hidden'));
cancelCreateUserBtn.addEventListener('click', () => createUserModal.classList.add('hidden'));

createUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('newUserName').value;
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserAdmin').checked ? 'admin' : 'usuari';

  try {
    const newUser = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(newUser.user.uid).set({
      nom: name,
      email: email,
      role: role,
      createdAt: Date.now(),
      lastAccess: []
    });
    createUserModal.classList.add('hidden');
    loadUsers();
    alert('Usuari creat correctament');
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

// -------------------- Placeholder enviar mail --------------------
function openSendMailModal(userId) {
  const email = prompt('Escriu el missatge per l’usuari:');
  if (!email) return;
  alert(`Aquí hauries d’enviar el mail a ${userId}: ${email}`);
}

function sendEmail(email, subject, body) {
  console.log(`Enviar mail a ${email}\nSubject: ${subject}\nBody:\n${body}`);
}
