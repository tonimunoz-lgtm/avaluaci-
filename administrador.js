// Inicialització Firebase
const app = firebase.initializeApp({/* la teva configuració */});
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

let currentUser;
let allUsers = [];

// Comprovar rol admin
auth.onAuthStateChanged(async user => {
  if (!user) return window.location.href = 'index.html';
  const doc = await db.collection('users').doc(user.uid).get();
  currentUser = doc.data();
  if (!currentUser || currentUser.role !== 'admin') {
    alert('Accés denegat: només administradors');
    return window.location.href = 'index.html';
  }
  loadUsers();
});

// -------------------- Carregar usuaris --------------------
async function loadUsers() {
  const snapshot = await db.collection('users').get();
  allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderUsers(allUsers);
}

// -------------------- Render taula --------------------
function renderUsers(users) {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-2 py-1">${user.nom}</td>
      <td class="px-2 py-1">${user.email}</td>
      <td class="px-2 py-1">${new Date(user.createdAt).toLocaleString()}</td>
      <td class="px-2 py-1">${user.role}</td>
      <td class="px-2 py-1 max-h-32 overflow-y-auto">${(user.lastAccess||[]).slice(-10).map(ts=>new Date(ts).toLocaleString()).join('<br>')}</td>
      <td class="px-2 py-1 flex gap-1">
        <button class="suspendBtn px-2 py-1 bg-yellow-500 text-white rounded" data-id="${user.id}">Suspèn</button>
        <button class="deleteBtn px-2 py-1 bg-red-600 text-white rounded" data-id="${user.id}">Elimina</button>
        <button class="emailBtn px-2 py-1 bg-blue-600 text-white rounded" data-id="${user.id}">Mail</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  attachUserActions();
}

// -------------------- Accions --------------------
function attachUserActions() {
  document.querySelectorAll('.suspendBtn').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      await db.collection('users').doc(uid).update({ suspended: true });
      sendSuspensionMail(uid);
      loadUsers();
    }
  });

  document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.onclick = async () => {
      const uid = btn.dataset.id;
      if (confirm('Segur que vols eliminar aquest usuari?')) {
        await db.collection('users').doc(uid).delete();
        loadUsers();
      }
    }
  });

  document.querySelectorAll('.emailBtn').forEach(btn => {
    btn.onclick = () => openSendMailModal(btn.dataset.id);
  });
}

// -------------------- Enviar correu suspensió --------------------
async function sendSuspensionMail(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return;
  const email = userDoc.data().email;
  const subject = 'Suspensió de compte';
  const body = `Benvolgut/da ${userDoc.data().nom},

Degut a un ús incorrecte del sistema, el seu compte ha estat suspès temporalment.

Salutacions,
Equip de gestió`;

  const sendMail = functions.httpsCallable('sendMail');
  sendMail({ email, subject, body });
}

// -------------------- Modal crear usuari --------------------
const createUserBtn = document.getElementById('createUserBtn');
const createUserModal = document.getElementById('createUserModal');
const cancelCreateUserBtn = document.getElementById('cancelCreateUserBtn');
const createUserForm = document.getElementById('createUserForm');

createUserBtn.onclick = () => createUserModal.classList.remove('hidden');
cancelCreateUserBtn.onclick = () => createUserModal.classList.add('hidden');

createUserForm.onsubmit = async e => {
  e.preventDefault();
  const name = document.getElementById('newUserName').value;
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserAdmin').checked ? 'admin' : 'usuari';

  try {
    const newUser = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(newUser.user.uid).set({
      nom: name,
      email,
      role,
      createdAt: Date.now(),
      lastAccess: []
    });
    createUserModal.classList.add('hidden');
    loadUsers();
    alert('Usuari creat correctament');
  } catch (err) { alert('Error: '+err.message); }
};

// -------------------- Enviar mail manual --------------------
function openSendMailModal(uid) {
  const message = prompt('Missatge per l’usuari:');
  if (!message) return;
  const userEmail = allUsers.find(u=>u.id===uid).email;
  const sendMail = functions.httpsCallable('sendMail');
  sendMail({ email: userEmail, subject: 'Missatge administració', body: message });
}

// -------------------- Filtres --------------------
document.getElementById('btnApplyFilter').onclick = () => {
  const nameFilter = document.getElementById('filterName').value.toLowerCase();
  const emailFilter = document.getElementById('filterEmail').value.toLowerCase();
  renderUsers(allUsers.filter(u =>
    u.nom.toLowerCase().includes(nameFilter) &&
    u.email.toLowerCase().includes(emailFilter)
  ));
}

document.getElementById('btnClearFilter').onclick = () => {
  document.getElementById('filterName').value = '';
  document.getElementById('filterEmail').value = '';
  renderUsers(allUsers);
}
