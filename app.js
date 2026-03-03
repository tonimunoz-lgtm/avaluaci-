// app.js - lògica principal (modules)
import { openModal, closeModal, confirmAction } from './modals.js';
import * as Terms from './terms.js';
window.Terms = Terms;

/* ---------------- FIREBASE CONFIG ---------------- */
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


/* ---------------- Globals ---------------- */
let professorUID = null;
let currentClassId = null;
let classStudents = [];
let classActivities = [];
let deleteMode = false;
let currentCalcActivityId = null; // Activitat actual per fer càlculs
let isDeleteMode = false;
let currentCommentStudentId = null;
let currentCommentStudentName = null;

// 🔥 FUNCIONES GLOBALES - Asignadas a window
window.openCommentsModal = function(studentId, studentName, currentComment) {
  currentCommentStudentId = studentId;
  currentCommentStudentName = studentName;
  
  // Crear modal dinámicamente si no existe
  let modal = document.getElementById('modalComments');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalComments';
    modal.className = 'fixed inset-0 hidden items-center justify-center z-50';
    modal.innerHTML = `
      <div class="modal-backdrop absolute inset-0" style="background: rgba(0,0,0,0.2);"></div>
      <div class="bg-white rounded shadow-lg z-10 w-full max-w-md p-6 flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <h2 id="modalCommentsTitle" class="text-xl font-bold"></h2>
          <button style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <textarea 
          id="commentTextarea" 
          class="border rounded p-3 w-full h-32 resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none"
          placeholder="Escriu aquí els comentaris de l'alumne/a..."
          maxlength="500"
          style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
        ></textarea>
        
        <div class="text-xs text-gray-500">
          <span id="commentChars">0</span>/500 caracteres
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 px-3 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black font-semibold cursor-pointer border-none">
            Cancelar
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer border-none">
            Guardar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Event listeners - AHORA SIN ATRIBUTOS ONCLICK
    const closeBtn = modal.querySelector('.bg-white button:first-of-type');
    const cancelBtn = modal.querySelector('.flex-1:nth-of-type(1)');
    const saveBtn = modal.querySelector('.flex-1:nth-of-type(2)');
    const backdropDiv = modal.querySelector('.modal-backdrop');
    const textarea = document.getElementById('commentTextarea');
    
    // Cerrar al pulsar X
    closeBtn.addEventListener('click', window.closeCommentsModal);
    
    // Cerrar al pulsar Cancelar
    cancelBtn.addEventListener('click', window.closeCommentsModal);
    
    // Guardar al pulsar Guardar
    saveBtn.addEventListener('click', window.saveComment);
    
    // Cerrar al pulsar en el fondo
    backdropDiv.addEventListener('click', window.closeCommentsModal);
    
    // Event listener para el textarea
    textarea.addEventListener('input', window.updateCommentChars);
  }
  
  // Poblar modal
  document.getElementById('modalCommentsTitle').textContent = `Comentaris: ${studentName}`;
  const textarea = document.getElementById('commentTextarea');
  textarea.value = currentComment;
  window.updateCommentChars();
  
  // Mostrar modal
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  textarea.focus();
};

window.closeCommentsModal = function() {
  const modal = document.getElementById('modalComments');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  currentCommentStudentId = null;
  currentCommentStudentName = null;
};

window.updateCommentChars = function() {
  const textarea = document.getElementById('commentTextarea');
  if (!textarea) return;
  const charsDiv = document.getElementById('commentChars');
  if (!charsDiv) return;
  const chars = textarea.value.length;
  charsDiv.textContent = chars;
};

window.saveComment = async function() {
  if (!currentCommentStudentId) {
    alert('Error: No hi ha estudiant seleccionat');
    return;
  }
  
  const textarea = document.getElementById('commentTextarea');
  if (!textarea) return;
  
  const comment = textarea.value.trim();
  
  try {
    // Guardar en Firestore
    await db.collection('alumnes').doc(currentCommentStudentId).update({
      [`comentarios.${currentClassId}`]: comment
    });
    
    console.log('Comentari guardat per:', currentCommentStudentName);
    
    // Cerrar modal
    window.closeCommentsModal();
    
    // Recargar la tabla para mostrar el nuevo comentario
    setTimeout(() => {
      renderNotesGrid();
    }, 100);
    
  } catch (e) {
    console.error('Error guardant comentari:', e);
    alert('Error guardant comentari: ' + e.message);
  }
};

// FIN DE FUNCIONES GLOBALES

/* Elements */
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const usuariNom = document.getElementById('usuariNom');

const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const btnRecover = document.getElementById('btnRecover');
const btnLogout = document.getElementById('btnLogout');
const btnCreateClass = document.getElementById('btnCreateClass');

const screenClasses = document.getElementById('screen-classes');
const screenClass = document.getElementById('screen-class');
const classesGrid = document.getElementById('classesGrid');

const btnBack = document.getElementById('btnBack');
const btnAddStudent = document.getElementById('btnAddStudent');
const btnAddActivity = document.getElementById('btnAddActivity');
const btnSortAlpha = document.getElementById('btnSortAlpha');
const btnExport = document.getElementById('btnExport');

const studentsList = document.getElementById('studentsList');
const studentsCount = document.getElementById('studentsCount');

const notesThead = document.getElementById('notesThead');
const notesTbody = document.getElementById('notesTbody');
const notesTfoot = document.getElementById('notesTfoot');
const formulaTfoot = document.getElementById('formulaTfoot');

const modalCreateClassBtn = document.getElementById('modalCreateClassBtn');
const modalAddStudentBtn = document.getElementById('modalAddStudentBtn');
const modalAddActivityBtn = document.getElementById('modalAddActivityBtn');

const btnImportAL = document.getElementById('btnImportAL');
btnImportAL.addEventListener('click', () => {
  openModal('modalImportAL');
});

// Mobile: toggle students overlay
const btnToggleStudentsMobile = document.getElementById('btnToggleStudentsMobile');
const btnCloseStudentsMobile = document.getElementById('btnCloseStudentsMobile');

if (btnToggleStudentsMobile) {
  btnToggleStudentsMobile.addEventListener('click', () => {
    const cont = document.getElementById('studentsListContainer');
    if (!cont) return;
    cont.classList.add('mobile-open');
  });
}

if (btnCloseStudentsMobile) {
  btnCloseStudentsMobile.addEventListener('click', () => {
    const cont = document.getElementById('studentsListContainer');
    if (!cont) return;
    cont.classList.remove('mobile-open');
  });
}

// També tancar si cliques a fora del card (overlay)
// detectem clicks al container però fora de .students-card
document.getElementById('studentsListContainer')?.addEventListener('click', (e) => {
  if (e.target.id === 'studentsListContainer') {
    document.getElementById('studentsListContainer').classList.remove('mobile-open');
  }
});

// MOBILE — OBRIR LLISTA ALUMNES
const btnMobile = document.getElementById("btnToggleStudentsMobile");
const cont = document.getElementById("studentsListContainer");

if (btnMobile) {
  btnMobile.addEventListener("click", () => {
    cont.classList.add("mobile-open");
  });
}

// TANCAR FENT CLIC FORA DEL PANELL BLANC
cont?.addEventListener("click", (e) => {
  if (e.target === cont) {
    cont.classList.remove("mobile-open");
  }
});

/* ---------- UTILS ---------- */
function showLogin() {
  loginScreen.style.display = 'block';
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}
function showApp() {
  loginScreen.style.display = 'none';
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
}

/* ---------- AUTH ---------- */
btnLogin.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');

  try {
    const u = await auth.signInWithEmailAndPassword(email, pw);

    const userDoc = await db.collection('professors').doc(u.user.uid).get();

    if (!userDoc.exists) {
      await auth.signOut();
      return alert("⚠️ Usuari no trobat. Contacta amb l’administrador.");
    }

    // 🔹 Comprovació eliminat
    if (userDoc.data().deleted) {
      await auth.signOut();
      return alert("⚠️ El teu compte ha estat eliminat. Pots registrar-te de nou amb aquest email.");
    }

    // 🔹 Comprovació suspès
    if (userDoc.data().suspended) {
      await auth.signOut();
      return alert("⚠️ El teu compte està suspès.\nContacta amb l’administrador.");
    }

    professorUID = u.user.uid;
    setupAfterAuth(u.user);

  } catch (e) {
    alert('Error login: ' + e.message);
  }
});

// ---------------- LOGIN AMB GOOGLE I REGISTRE AUTOMÀTIC ----------------
async function signInWithGoogleGmail() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');

  try {
    const result = await firebase.auth().signInWithPopup(provider);
    const credential = result.credential;
    window._googleAccessToken = credential.accessToken;

    const profRef = db.collection('professors').doc(result.user.uid);
    const docSnap = await profRef.get();

    if (!docSnap.exists) {
      // Crear usuari nou si no existeix
      await profRef.set({
        email: result.user.email,
        name: result.user.displayName || result.user.email.split('@')[0],
        google: true,
        isAdmin: false,
        suspended: false,
        deleted: false,
        classes: [],
        createdAt: firebase.firestore.Timestamp.now()
      });
    }

    // 🔹 DESPRÉS DE CREAR/OBTENIR EL DOC: COMPROVAR ESTATS
    const profDoc = await profRef.get();
    const profData = profDoc.data();

    if (profData.deleted) {
      await auth.signOut();
      return alert("⚠️ El teu compte ha estat eliminat. Pots registrar-te de nou amb aquest email.");
    }

    if (profData.suspended) {
      await auth.signOut();
      return alert("⚠️ El teu compte està suspès.\nContacta amb l’administrador.");
    }

    // ✅ Tot correcte: assignar UID i carregar UI
    professorUID = result.user.uid;
    setupAfterAuth(result.user);
    alert("Sessió iniciada correctament!");

  } catch (error) {
    console.error(error);
    alert("Error iniciant sessió amb Google: " + error.message);
  }
}

// ---------------- BOTÓ LOGIN ----------------
document.getElementById("googleLoginBtn").addEventListener("click", signInWithGoogleGmail);


btnRegister.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');

  try {
    // Crear usuari a Firebase Auth — sense tocar Firestore abans d'autenticar-se
    const u = await auth.createUserWithEmailAndPassword(email, pw);
    professorUID = u.user.uid;

    // Ara ja estem autenticats, les rules permeten escriure el propi document
    await db.collection('professors').doc(professorUID).set({
      email,
      nom: email.split('@')[0],
      isAdmin: false,
      suspended: false,
      deleted: false,
      createdAt: firebase.firestore.Timestamp.now(),
      classes: []
    });

    setupAfterAuth(u.user);
    alert("Compte creat correctament!");

  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      alert("Aquest email ja està registrat. Utilitza el botó d'inici de sessió.");
    } else if (e.code === 'auth/weak-password') {
      alert("La contrasenya ha de tenir mínim 6 caràcters.");
    } else if (e.code === 'auth/invalid-email') {
      alert("L'email no és vàlid.");
    } else {
      alert('Error registre: ' + e.message);
    }
  }
});


btnRecover.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  if(!email) return alert('Introdueix el teu email per recuperar la contrasenya');
  auth.sendPasswordResetEmail(email)
    .then(()=> alert('Email de recuperació enviat!'))
    .catch(e=> alert('Error: ' + e.message));
});

btnLogout.addEventListener('click', ()=> {
  auth.signOut().then(()=> {
    professorUID = null;
    currentClassId = null;
    showLogin();
  });
});

auth.onAuthStateChanged(user => {
  if (user) {
    professorUID = user.uid;

    // ---------- REGISTRAR LOGIN ----------
    db.collection('professors').doc(user.uid).collection('logins')
      .add({ timestamp: firebase.firestore.Timestamp.now() })
      .catch(e => console.error('Error registrant login:', e));

    setupAfterAuth(user);
  } else {
    professorUID = null;
    showLogin();
  }
});
 
async function setupAfterAuth(user) {
  showApp();
  const email = user.email || '';
  usuariNom.textContent = email.split('@')[0] || email;

  // ----------------- AFEGIR OPCIÓ ADMIN -----------------
  const userDoc = await db.collection('professors').doc(user.uid).get();
  if (userDoc.exists && userDoc.data().isAdmin) {
    // Comprovem que encara no hi ha el botó
    if (!document.getElementById('btnAdminPanel')) {
      const adminBtn = document.createElement('button');
      adminBtn.id = 'btnAdminPanel';
      adminBtn.className = 'w-full text-left px-2 py-1 hover:bg-gray-100';
      adminBtn.textContent = 'Administrar';
      adminBtn.addEventListener('click', () => {
        window.location.href = 'administrador.html';
      });
      document.getElementById('userMenu').appendChild(adminBtn);
    }
  }

  // Crida automàtica per carregar la graella de classes
  loadClassesScreen();
}



/* ---------------- Classes screen ---------------- */
btnCreateClass.addEventListener('click', ()=> openModal('modalCreateClass'));

/* ---------------- Classes Screen (cont.) ---------------- */
function loadClassesScreen() {
  if(!professorUID) { alert('Fes login primer.'); return; }
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
  classesGrid.innerHTML = '<div class="col-span-full text-sm text-gray-500">Carregant...</div>';

  const classColors = [
    'from-indigo-600 to-purple-600',
    'from-pink-500 to-red-500',
    'from-yellow-400 to-orange-500',
    'from-green-500 to-teal-500',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-500'
  ];

  db.collection('professors').doc(professorUID).get().then(doc => {
    if(!doc.exists) { 
      classesGrid.innerHTML = '<div class="text-sm text-red-500">Professor no trobat</div>'; 
      return; 
    }
    const ids = doc.data().classes || [];
    if(ids.length === 0){
      classesGrid.innerHTML = `<div class="col-span-full p-6 bg-white dark:bg-gray-800 rounded shadow text-center text-lg">🔰 No tens cap classe activa. <strong class="font-bold">Crea la primera!</strong></div>`;         
      return;
    }

    Promise.all(ids.map(id => db.collection('classes').doc(id).get()))
      .then(docs => {
        classesGrid.innerHTML = '';
        docs.forEach((d, i) => {
          if(!d.exists) return;
          const color = classColors[i % classColors.length];
          const card = document.createElement('div');
          card.className = `class-card bg-gradient-to-br ${color} text-white relative p-4 rounded-lg`;
          card.dataset.id = d.id;

          // Comptar activitats totals sumant totes les activitats de tots els termes
          let totalActivities = 0;
          const terms = d.data().terms || {};
          Object.values(terms).forEach(term => {
            totalActivities += (term.activities || []).length;
          });

          card.innerHTML = `
            ${deleteMode ? '<input type="checkbox" class="delete-checkbox absolute top-2 right-2 w-5 h-5">' : ''}
            <h3 class="text-lg font-bold">${d.data().nom||'Sense nom'}</h3>
            <p class="text-sm mt-2">${(d.data().alumnes||[]).length} alumnes · ${totalActivities} activitats</p>
            <div class="click-hint">${deleteMode ? 'Selecciona per eliminar' : 'Fes clic per obrir'}</div>
          `;

          if(!deleteMode){
            const menuDiv = document.createElement('div');
            menuDiv.className = 'absolute top-2 right-2';
            menuDiv.innerHTML = `
              <button class="menu-btn text-white font-bold text-xl">⋮</button>
              <div class="menu hidden absolute right-0 mt-1 bg-white text-black border rounded shadow z-10 transition-opacity duration-200 opacity-0">
                <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100">Editar</button>
              </div>
            `;
            card.appendChild(menuDiv);

            const menuBtn = menuDiv.querySelector('.menu-btn');
            const menu = menuDiv.querySelector('.menu');

            menuBtn.addEventListener('click', e => {
              e.stopPropagation();
              document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
              menu.classList.toggle('hidden');
            });

            menuDiv.querySelector('.edit-btn').addEventListener('click', () => {
              const newName = prompt('Introdueix el nou nom de la classe:', d.data().nom || '');
              if(!newName || newName.trim() === d.data().nom) return;
              db.collection('classes').doc(d.id).update({ nom: newName.trim() })
                .then(() => loadClassesScreen())
                .catch(e => alert('Error editant classe: ' + e.message));
            });

            card.addEventListener('click', () => openClass(d.id));
          }

          classesGrid.appendChild(card);
        });

        const existingBtn = document.querySelector('#classesGrid + .delete-selected-btn');
        if(existingBtn) existingBtn.remove();
        if(deleteMode) addDeleteSelectedButton();
      });
  }).catch(e=> {
    classesGrid.innerHTML = `<div class="text-sm text-red-500">Error carregant classes</div>`;
    console.error(e);
  });
}

/* ---------------- Delete Mode Classes ---------------- */
const btnDeleteMode = document.getElementById('btnDeleteMode');
btnDeleteMode.addEventListener('click', ()=> {
  deleteMode = !deleteMode;
  btnDeleteMode.textContent = deleteMode ? '❌ Cancel·lar eliminar' : '🗑️ Eliminar classe';
  loadClassesScreen();
});

function addDeleteSelectedButton(){
  const delBtn = document.createElement('button');
  delBtn.textContent = 'Eliminar seleccionats';
  delBtn.className = 'delete-selected-btn mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow';
  delBtn.onclick = confirmDeleteSelected;
  classesGrid.parentNode.insertBefore(delBtn, classesGrid.nextSibling);
}

function confirmDeleteSelected(){
  const selected = [...document.querySelectorAll('.delete-checkbox')]
    .filter(chk => chk.checked)
    .map(chk => chk.closest('.class-card'));

  if(selected.length === 0) return alert('Selecciona almenys una classe!');

  confirmAction(
    'Confirmació d\'eliminació',
    `Estàs segur que vols eliminar ${selected.length} classe(s)? Aquesta acció no té marxa enrere.`,
    () => {
      selected.forEach(card => {
        const classIdToRemove = card.dataset.id;
        card.remove();
        if(classIdToRemove){
          db.collection('professors').doc(professorUID).update({
            classes: firebase.firestore.FieldValue.arrayRemove(classIdToRemove)
          });
          db.collection('classes').doc(classIdToRemove).delete();
        }
      });
      deleteMode = false;
      btnDeleteMode.textContent = '🗑️ Eliminar classe';
      loadClassesScreen();
    }
  );
}

/* ---------------- Create Class ---------------- */
function createClassModal(){
  const name = document.getElementById('modalClassName').value.trim();
  if(!name) return alert('Posa un nom');
  const ref = db.collection('classes').doc();
  ref.set({ nom: name, alumnes: [], activitats: [] })
    .then(()=> db.collection('professors').doc(professorUID).update({ classes: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> {
      closeModal('modalCreateClass');
      document.getElementById('modalClassName').value = '';
      loadClassesScreen();
    }).catch(e=> alert('Error: ' + e.message));
}
modalCreateClassBtn.addEventListener('click', createClassModal);

/* ---------------- Open Class ---------------- */
function openClass(id){
  currentClassId = id;
  screenClasses.classList.add('hidden');
  screenClass.classList.remove('hidden');
  loadClassData();
}

btnBack.addEventListener('click', ()=> {
  currentClassId = null;
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
  loadClassesScreen();
});

/* ---------------- Load Class Data ---------------- */
function loadClassData(){
  if(!currentClassId) return;
  db.collection('classes').doc(currentClassId).get().then(doc=>{
    if(!doc.exists) { alert('Classe no trobada'); return; }
    const data = doc.data();
    _classData = data; // 🔥 ASEGURATE QUE ESTO ESTÉ AQUÍ

    // Guardem dades locals com abans
    classStudents = data.alumnes || [];
    document.getElementById('classTitle').textContent = data.nom || 'Sense nom';
    document.getElementById('classSub').textContent = `ID: ${doc.id}`;

    // Inicialitzar Terms passant db, id i dades de la classe
    Terms.setup(db, currentClassId, data, {
      onChange: (activeTermId) => {
        // 🔥 NUEVO: Actualizar _classData cada vez que cambia el término
        db.collection('classes').doc(currentClassId).get().then(updatedDoc => {
          if(updatedDoc.exists) {
            _classData = updatedDoc.data(); // Actualizar con datos frescos
            console.log('_classData actualizado:', _classData);
          }
        });

        // Quan el terme actiu canvia, actualitzem classActivities i re-renderitzem la taula
        const acts = Terms.getActiveTermActivities();
        classActivities = Array.isArray(acts) ? acts : [];
        renderNotesGrid(); // renderitza la taula amb activitats del terme actiu
        
        // Actualitzar títol per incloure nom terme al costat de nom classe
        const titleEl = document.getElementById('classTitle');
        if(titleEl) titleEl.textContent = `${data.nom} - ${Terms.getActiveTermName() || ''}`;
      }
    });

    // Render llista d'alumnes i altres UI
    renderStudentsList();
  }).catch(e=> console.error(e));
}

/* ---------------- Students ---------------- */
btnAddStudent.addEventListener('click', ()=> openModal('modalAddStudent'));
modalAddStudentBtn.addEventListener('click', createStudentModal);

function createStudentModal(){
  const name = document.getElementById('modalStudentName').value.trim();
  if(!name) return alert('Posa un nom');
  const ref = db.collection('alumnes').doc();
  ref.set({ nom: name, notes: {} })
    .then(()=> db.collection('classes').doc(currentClassId).update({ alumnes: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> {
      closeModal('modalAddStudent');
      document.getElementById('modalStudentName').value = '';
      loadClassData();
    }).catch(e=> alert('Error: '+e.message));
}

function removeStudent(studentId) {
  confirmAction(
    'Eliminar alumne',
    'Estàs segur que vols eliminar aquest alumne?',
    () => {
      db.collection('classes').doc(currentClassId)
        .update({ alumnes: firebase.firestore.FieldValue.arrayRemove(studentId) })
        .then(() => db.collection('alumnes').doc(studentId).delete())
        .then(() => loadClassData())
        .catch(e => alert('Error eliminant alumne: ' + e.message));
    }
  );
}

function reorderStudents(fromIdx, toIdx){
  if(fromIdx===toIdx) return;
  const arr = Array.from(classStudents);
  const item = arr.splice(fromIdx,1)[0];
  arr.splice(toIdx,0,item);
  db.collection('classes').doc(currentClassId).update({ alumnes: arr })
    .then(()=> loadClassData())
    .catch(e=> console.error('Error reordenant', e));
}

btnSortAlpha.addEventListener('click', sortStudentsAlpha);
function sortStudentsAlpha(){
  Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()))
    .then(docs=>{
      const pairs = docs.map(d=> ({ id: d.id, name: d.exists? (d.data().nom||'') : '' }));
      pairs.sort((a,b)=> a.name.localeCompare(b.name, 'ca'));
      const newOrder = pairs.map(p=> p.id);
      return db.collection('classes').doc(currentClassId).update({ alumnes: newOrder });
    }).then(()=> loadClassData())
    .catch(e=> console.error(e));
}
/* ---------------- Activities ---------------- */
btnAddActivity.addEventListener('click', ()=> openModal('modalAddActivity'));
modalAddActivityBtn.addEventListener('click', createActivityModal);

async function createActivityModal() {
    const name = document.getElementById("modalActivityName").value.trim();
    if (!name) return;

    closeModal("modalAddActivity");
    document.getElementById("modalActivityName").value = "";

    try {
        const ref = db.collection("activitats").doc();
        await ref.set({
            nom: name,
            data: new Date().toISOString().split("T")[0],
            calcType: "numeric",
            formula: ""
        });
        if (window.Terms && Terms.addActivityToActiveTerm) {
            await Terms.addActivityToActiveTerm(ref.id);
        }
    } catch (e) {
        console.error("Error creant activitat:", e);
        alert("Error creant l'activitat: " + e.message);
    }
}

function removeActivity(actId){
  confirmAction('Eliminar activitat', 'Esborrar activitat i totes les notes relacionades?', async ()=> {
    try {
      const termId = Terms.getActiveTermId(); // obtenir terme actiu

      // Eliminar activitat del llistat general i del terme actiu
      await db.collection('classes').doc(currentClassId).update({
        activitats: firebase.firestore.FieldValue.arrayRemove(actId),
        [`terms.${termId}.activities`]: firebase.firestore.FieldValue.arrayRemove(actId)
      });

      // Eliminar notes dels alumnes
      const batch = db.batch();
      classStudents.forEach(sid => {
        const ref = db.collection('alumnes').doc(sid);
        batch.update(ref, { [`notes.${actId}`]: firebase.firestore.FieldValue.delete() });
      });
      await batch.commit();

      // Refrescar dades
      loadClassData();

    } catch(e) {
      alert('Error esborrant activitat: ' + e.message);
    }
  });
}

/* ---------------- Render Students List amb menú ---------------- */
function renderStudentsList() {
  studentsList.innerHTML = '';
  studentsCount.textContent = `(${classStudents.length})`;

  // 🔎 Connectem la barra de cerca
  const searchInput = document.getElementById('studentSearch');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener('input', filterStudentsList);
    searchInput.dataset.bound = "true"; // Evita duplicar el listener
  }

  if (classStudents.length === 0) {
    studentsList.innerHTML = '<li class="text-sm text-gray-400">No hi ha alumnes</li>';
    return;
  }

  classStudents.forEach((stuId, idx) => {
    db.collection('alumnes').doc(stuId).get().then(doc => {
      const data = doc.data() || {};
      const name = data.nom || 'Desconegut';
      const email = data.email || '';

      const li = document.createElement('li');
      li.className = 'flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded';
      li.dataset.studentId = stuId;
      if (email) li.dataset.email = email;

      li.innerHTML = `
        <div class="flex items-center gap-3">
          <span draggable="true" title="Arrossega per reordenar" class="cursor-move text-sm text-gray-500">☰</span>
          <span class="stu-name font-medium">${name}</span>
        </div>
        <div class="relative">
          <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮</button>
          <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10">
            <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
            <button class="set-email-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap">Introduir email</button>          
            <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
          </div>
        </div>
      `;

      const menuBtn = li.querySelector('.menu-btn');
      const menu = li.querySelector('.menu');

      menuBtn.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
        menu.classList.toggle('hidden');
      });

      // EDITAR
      li.querySelector('.edit-btn').addEventListener('click', () => {
        const newName = prompt('Introdueix el nou nom:', name);
        if (!newName || newName.trim() === name) return;
        db.collection('alumnes').doc(stuId).update({ nom: newName.trim() })
          .then(() => loadClassData())
          .catch(e => alert('Error editant alumne: ' + e.message));
      });

      // INTRODUIR EMAIL
      li.querySelector('.set-email-btn').addEventListener('click', async () => {
        const current = li.dataset.email || '';
        const newMail = prompt("Introdueix email:", current);
        if (!newMail) return;

        await db.collection('alumnes').doc(stuId).update({ email: newMail.trim() });
        li.dataset.email = newMail.trim();
        alert("Email guardat.");
      });

      // ELIMINAR
      li.querySelector('.delete-btn').addEventListener('click', () => removeStudent(stuId));

      // DRAG
      const dragHandle = li.querySelector('[draggable]');
      dragHandle.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', idx);
      });
      li.addEventListener('dragover', e => e.preventDefault());
      li.addEventListener('drop', e => {
        e.preventDefault();
        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
        reorderStudents(fromIdx, idx);
      });

      studentsList.appendChild(li);

      // SI EL MODE ENVIAR NOTES ÉS ACTIU → AFEGIU CHECKBOXES
      if (window.__sendNotesModeActive) {
        showSendModeCheckboxes();
        showExitSendNotesButton();
      }
    });
  });
}

/* ================================
   MENÚ GLOBAL D'ALUMNES
================================= */

const studentsMenuBtn = document.getElementById('studentsMenuBtn');
const studentsMenu = document.getElementById('studentsMenu');
const deleteStudentsModeBtn = document.getElementById('deleteStudentsModeBtn');

studentsMenuBtn.addEventListener('click', e => {
    e.stopPropagation();
    studentsMenu.classList.toggle('hidden');
});

// Tancar menús quan es clica fora
document.addEventListener('click', () => {
    studentsMenu.classList.add('hidden');
});

/* 🔥 Activar mode d'eliminació múltiple */
deleteStudentsModeBtn.addEventListener('click', () => {
    activateDeleteStudentsMode();
});



/* ---------------- Notes Grid amb menú activitats ---------------- */
async function renderNotesGrid() {
  // Neteja taula
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';
  formulaTfoot.innerHTML = '';

  // Capçalera alumne
  const headRow = document.createElement('tr');
  headRow.appendChild(th('Alumne'));

  // Carrega classe
  const classDoc = await db.collection('classes').doc(currentClassId).get();
  if (!classDoc.exists) return;
  const classData = classDoc.data();
  const calculatedActs = classData.calculatedActivities || {};

  // Carrega activitats
  const actDocs = await Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()));

  // Capçalera activitats amb icona refresh i candau
  actDocs.forEach(adoc => {
    const id = adoc.id;
    const name = adoc.exists ? (adoc.data().nom || 'Sense nom') : 'Desconegut';

    const thEl = th('');
    const container = document.createElement('div');
    container.className = 'flex items-center justify-between';

    const spanName = document.createElement('span');
    spanName.textContent = name;

   // Candau
const lockIcon = document.createElement('span');
lockIcon.className = 'lock-icon cursor-pointer mr-1';
lockIcon.innerHTML = calculatedActs[id]?.locked ? '🔒' : '🔓';
lockIcon.title = calculatedActs[id]?.locked ? 'Activitat bloquejada' : 'Activitat desbloquejada';

// Amaguem el candau si és una activitat calculada
if (calculatedActs[id]?.calculated) {
    lockIcon.classList.add('hidden');
}

lockIcon.addEventListener('click', async () => {
  try {
    const newLockState = !calculatedActs[id]?.locked;

    // Guardar a Firestore
    await db.collection('classes').doc(currentClassId).update({
      // assegurem que l'objecte existeixi i calculem la propietat
      [`calculatedActivities.${id}.locked`]: newLockState
    });

    // Si no existia l'entrada a local, la creem per evitar undefined errors
    if (!calculatedActs[id]) calculatedActs[id] = {};
    calculatedActs[id].locked = newLockState;

    // 🔥 Afegir aquesta línia perquè la UI es torni a generar amb l’estat correcte
await renderNotesGrid();

    // Actualitzar icona
    lockIcon.innerHTML = newLockState ? '🔒' : '🔓';
    lockIcon.title = newLockState ? 'Activitat bloquejada' : 'Activitat desbloquejada';

    // Estat de bloqueig real (si és calculada, també bloquejada)
    const locked = newLockState || Boolean(calculatedActs[id]?.calculated);

    // Actualitzar inputs IMMEDIATAMENT (sense esperar un render complet)
    document.querySelectorAll(`tr[data-student-id]`).forEach(tr => {
      const input = tr.querySelector(`input[data-activity-id="${id}"]`);
      if (!input) return;

      // Usem readOnly en lloc de disabled per no trencar reactivitat/estils
      input.readOnly = locked;

      // mantenim els colors de fons CRÍTIC: no sobreescrivim si ja té classes de color
      // si vols marcar visualment bloquejat, afegeix una classe mínima que no sobreescrigui colors
      if (locked) {
  input.disabled = true;
  input.classList.add('blocked-cell');
} else {
  input.disabled = false;
  input.classList.remove('blocked-cell');
}

      // Reapliquem la coloració basada en valor (applyCellColor) perquè no es perdin estils
      applyCellColor(input);
    });

    // Opcional: si vols re-renderitzar tota la taula per altres canvis, crida renderNotesGrid()
    // renderNotesGrid();
  } catch (e) {
    console.error('Error canviant bloqueig:', e);
    alert('Error canviant bloqueig: ' + e.message);
  }
});



    // Icona refrescar (només si és calculada)
    const refreshIcon = document.createElement('span');
    refreshIcon.innerHTML = '🔄';
    refreshIcon.title = 'Refrescar columna';
    refreshIcon.className = 'ml-2 cursor-pointer hidden';
    if (calculatedActs[id]?.calculated) refreshIcon.classList.remove('hidden');

    refreshIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const formulasRow = formulaTfoot.querySelector('.formulas-row');
      if (!formulasRow) return;
      const idx = Array.from(headRow.children).indexOf(thEl);
      const formulaTd = formulasRow.children[idx];
      if (!formulaTd) return;
      const formulaText = formulaTd.textContent.trim();
      if (!formulaText) return alert('No hi ha cap fórmula aplicada a aquesta activitat.');

      try {
        // Aplicar fórmula a tots els alumnes i esperar que es guardi
        await Promise.all(classStudents.map(async sid => {
          const result = await evalFormulaAsync(formulaText, sid);
          await saveNote(sid, id, result);
        }));

        // Quan acabi, actualitzem la vista i reapliquem colors
        await renderNotesGrid();
      } catch(err) {
        console.error('Error recalculant fórmula:', err);
        alert('Error recalculant la fórmula: ' + err.message);
      }
    });

    const menuDiv = document.createElement('div');
    menuDiv.className = 'relative';
    menuDiv.innerHTML = `
      <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮</button>
      <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10">
        <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
        <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
        <button class="calc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Càlcul</button>
        <button class="clear-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Netejar</button>
      </div>
    `;

    container.prepend(lockIcon);
    container.appendChild(spanName);
    container.appendChild(refreshIcon);
    container.appendChild(menuDiv);
    thEl.appendChild(container);
    headRow.appendChild(thEl);

    // Estil per capçaleres calculades
    if (calculatedActs[id]?.calculated) {
      thEl.style.backgroundColor = "#dbeafe";
      thEl.style.borderBottom = "3px solid #1d4ed8";
      thEl.style.color = "black";
    }

    // Menú activitat
    const menuBtn = menuDiv.querySelector('.menu-btn');
    const menu = menuDiv.querySelector('.menu');
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
      menu.classList.toggle('hidden');
    });

    menuDiv.querySelector('.edit-btn').addEventListener('click', () => {
      const newName = prompt('Nou nom activitat:', name);
      if (!newName || newName.trim() === name) return;
      db.collection('activitats').doc(id).update({ nom: newName.trim() }).then(() => renderNotesGrid());
    });

    menuDiv.querySelector('.clear-btn').addEventListener('click', async () => {
      if (!confirm('Segur que vols esborrar totes les notes d’aquesta activitat?')) return;
      try {
        await Promise.all(classStudents.map(sid => saveNote(sid, id, '')));
        await db.collection('classes').doc(currentClassId).update({
          [`calculatedActivities.${id}`]: firebase.firestore.FieldValue.delete()
        });
        renderNotesGrid();
      } catch(e) {
        console.error('Error netejant notes:', e);
        alert('Error netejant les notes: ' + e.message);
      }
    });

menuDiv.querySelector('.delete-btn').addEventListener('click', () => {
  confirmAction('Eliminar activitat', 'Esborrar activitat i totes les notes relacionades?', async () => {
    try {
      // Eliminar del terme actiu
      await Terms.removeActivityFromActiveTerm(id);

      // Eliminar de la llista general d’activitats de la classe
      await db.collection('classes').doc(currentClassId)
              .update({ activitats: firebase.firestore.FieldValue.arrayRemove(id) });

      // Esborrar les notes dels alumnes
      const batch = db.batch();
      classStudents.forEach(sid => {
        const ref = db.collection('alumnes').doc(sid);
        batch.update(ref, { [`notes.${id}`]: firebase.firestore.FieldValue.delete() });
      });
      await batch.commit();

      // Refrescar graella i capçaleres
      renderNotesGrid();
    } catch(e) {
      alert('Error esborrant activitat: ' + e.message);
    }
  });
});

    menuDiv.querySelector('.calc-btn').addEventListener('click', () => openCalcModal(id));

  });

  headRow.appendChild(th('Comentaris', 'text-center'));
  notesThead.appendChild(headRow);

  enableActivityDrag();

  if (classStudents.length === 0) {
    notesTbody.innerHTML = `<tr><td class="p-3 text-sm text-gray-400" colspan="${classActivities.length + 2}">No hi ha alumnes</td></tr>`;
    renderAverages();
    return;
  }

  // Carrega alumnes (una sola vegada)
  const studentDocs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));

  studentDocs.forEach(sdoc => {
    const studentId = sdoc.id;
    const studentData = sdoc.exists ? sdoc.data() : { nom: 'Desconegut', notes: {} };

    const tr = document.createElement('tr');
    tr.dataset.studentId = studentId;

    const tdName = document.createElement('td');
    tdName.className = 'border px-2 py-1';
    tdName.textContent = studentData.nom;
    tr.appendChild(tdName);

    // Per cada activitat afegim la cel·la i l'input
    actDocs.forEach(actDoc => {
      const actId = actDoc.id;
      const val = (studentData.notes && studentData.notes[actId] !== undefined) ? studentData.notes[actId] : '';

      const td = document.createElement('td');
      td.className = 'border px-2 py-1';

      if (calculatedActs[actId]?.calculated) {
        td.style.backgroundColor = "#dbeafe"; // capçalera blava i cel·la alguna cosa similar
      }

      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 10;
      input.value = val;
      input.dataset.activityId = actId;
      input.className = 'table-input text-center rounded border p-1';

      // Estat bloquejat si és calculada o hi ha lock
      const isLocked = !!(calculatedActs[actId]?.locked) || !!(calculatedActs[actId]?.calculated);
      input.disabled = isLocked;
      // 🔥 IMPORTANT: Afegir la classe visual persistent
if (isLocked) {
    input.classList.add('blocked-cell');
} else {
    input.classList.remove('blocked-cell');
}

      // Reaplica color sempre (això evita que quedi en gris)
      applyCellColor(input);

      // HANDLER: quan l'usuari canvia la nota, fem un save i actualitzem UI només quan saveNote acaba.
      if (!isLocked) {
        input.addEventListener('input', () => {
          // color en viu mentre escriu
          applyCellColor(input);
        });

        input.addEventListener('change', async (e) => {
          const newVal = e.target.value;
          try {
            // Opcional: desactivar l'input mentre guardem per evitar múltiples clicks ràpids
            input.disabled = true;

            // Guardem la nota a Firestore (await)
            await saveNote(studentId, actId, newVal);

            // Quan ja està guardada: reapliquem color (i recalculs locals ràpids)
            applyCellColor(input);

            // Actualitza mitjanes i mitjanes per activitat (local)
            renderAverages();

            // Si vols forçar refresc de columnes calculades relatives, pots cridar updateCalculatedCells()
            // updateCalculatedCells(); // opcional

          } catch (err) {
            console.error('Error guardant nota:', err);
            alert('Error guardant la nota: ' + err.message);
          } finally {
            // Tornem a aplicar disabled si la columna està bloquejada ara
            const nowLocked = !!(calculatedActs[actId]?.locked) || !!(calculatedActs[actId]?.calculated);
            input.disabled = nowLocked;
          }
        });
      } else {
        // Si està bloquejat, però vols que el color reflecteixi el valor actual, ja està feta applyCellColor()
        // No afegim handlers
      }

// 🔽 Navegació amb Enter, Shift+Enter i fletxes
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();

        const currentAct = input.dataset.activityId;
        const currentStudent = tr.dataset.studentId;

        // Trobar la fila actual
        const rows = Array.from(notesTbody.querySelectorAll('tr[data-student-id]'));
        const rowIndex = rows.findIndex(r => r.dataset.studentId === currentStudent);

        const nextRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;

        if (rows[nextRowIndex]) {
            const nextInput = rows[nextRowIndex].querySelector(`input[data-activity-id="${currentAct}"]`);
            if (nextInput && !nextInput.disabled) nextInput.focus();
        }
    }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); // evita increment automàtic
}
    // 🔼 Fletxa amunt
    if (e.key === 'ArrowUp') {
        const rows = Array.from(notesTbody.querySelectorAll('tr[data-student-id]'));
        const rowIndex = rows.findIndex(r => r.dataset.studentId === tr.dataset.studentId);
        if (rows[rowIndex - 1]) {
            const nextInput = rows[rowIndex - 1].querySelector(`input[data-activity-id="${input.dataset.activityId}"]`);
            if (nextInput && !nextInput.disabled) nextInput.focus();
        }
    }

    // 🔽 Fletxa avall
    if (e.key === 'ArrowDown') {
        const rows = Array.from(notesTbody.querySelectorAll('tr[data-student-id]'));
        const rowIndex = rows.findIndex(r => r.dataset.studentId === tr.dataset.studentId);
        if (rows[rowIndex + 1]) {
            const nextInput = rows[rowIndex + 1].querySelector(`input[data-activity-id="${input.dataset.activityId}"]`);
            if (nextInput && !nextInput.disabled) nextInput.focus();
        }
    }
});


      
      td.appendChild(input);
      tr.appendChild(td);
    });
    
    //----------------------------------------- Comentarios
    const commentTd = document.createElement('td');
    commentTd.className = 'border px-2 py-1 text-left cursor-pointer hover:bg-yellow-100 transition-colors';
    commentTd.style.maxWidth = '150px';
    commentTd.style.overflow = 'hidden';
    commentTd.style.textOverflow = 'ellipsis';
    commentTd.style.whiteSpace = 'nowrap';
    
    // Obtener comentario guardado
    const comment = studentData.comentarios?.[currentClassId] || '';
    const displayComment = comment ? comment.split(' ')[0] + (comment.split(' ').length > 1 ? '...' : '') : '(sense comentari)';
    
    // Crear un contenedor para ocultar el cálculo pero mostrar el comentario
    commentTd.innerHTML = `<span style="display: block;">${displayComment}</span>`;
    commentTd.title = comment || 'Fes clic per afegir comentari';
    
    // Click para abrir modal de comentarios
    commentTd.addEventListener('click', () => {
      openCommentsModal(studentId, studentData.nom, comment);
    });
    
    tr.appendChild(commentTd);

    
    notesTbody.appendChild(tr);

  });

 // Final: recalculs de mitjanes i fila fórmules (igual que abans)
  renderAverages();
}

// Funció per actualitzar cel·les calculades sense recrear tota la taula
function updateCalculatedCells() {
  db.collection('classes').doc(currentClassId).get().then(doc => {
    if (!doc.exists) return;
    const calculatedActs = doc.data().calculatedActivities || {};

    classStudents.forEach(sid => {
      const row = document.querySelector(`tr[data-student-id="${sid}"]`);
      if (!row) return;

      classActivities.forEach(aid => {
        if (!calculatedActs[aid]) return;
        const input = row.querySelector(`input[data-activity-id="${aid}"]`);
        if (!input) return;

        const val = computeCalculatedNote(sid, aid); // funció que calcula nota
        input.value = val;
        input.disabled = true;
        input.style.backgroundColor = "#fca5a5";
      });
    });
  });
}

//--------------nou per incloure buscador am filtre
const gridStudentSearch = document.getElementById('gridStudentSearch');
gridStudentSearch.addEventListener('input', () => {
  const filter = gridStudentSearch.value.toLowerCase();
  notesTbody.querySelectorAll('tr').forEach(tr => {
    const studentName = tr.children[0].textContent.toLowerCase();
    tr.style.display = studentName.includes(filter) ? '' : 'none';
  });
});



/* ---------------- Helpers Notes & Excel ---------------- */
function th(txt, cls=''){
  const el = document.createElement('th');
  el.className = 'border px-2 py-1 ' + cls;
  el.textContent = txt;
  return el;
}

// Canvia saveNote perquè NO re-renderitzi la taula
function saveNote(studentId, activityId, value){
  const num = value === '' ? null : Number(value);
  const updateObj = {};
  if(num === null || isNaN(num)) updateObj[`notes.${activityId}`] = firebase.firestore.FieldValue.delete();
  else updateObj[`notes.${activityId}`] = num;

  return db.collection('alumnes').doc(studentId).update(updateObj)
    .catch(e=> console.error('Error saving note', e));
}


function applyCellColor(inputEl){
  const v = Number(inputEl.value);
  inputEl.classList.remove('bg-purple-100','bg-red-100','bg-yellow-100','bg-green-100');
  if(inputEl.value === '' || isNaN(v)) return;
  if(v < 2.5) inputEl.classList.add('bg-red-100');
  else if(v < 5) inputEl.classList.add('bg-yellow-100');  
  else if(v < 7) inputEl.classList.add('bg-purple-100');
  else inputEl.classList.add('bg-green-100');
}

function computeStudentAverageText(studentData){
  const notesMap = (studentData && studentData.notes) ? studentData.notes : {};
  const vals = classActivities.map(aid => (notesMap[aid] !== undefined ? Number(notesMap[aid]) : null)).filter(v=> v!==null && !isNaN(v));
  if(vals.length === 0) return '';
  return (vals.reduce((s,n)=> s+n,0)/vals.length).toFixed(2);
}

// 🔥 CORRECCIÓN EN renderAverages() - Ignorar columna de comentarios
function renderAverages(){
  // Actualitzar mitjanes alumnes
  //Array.from(notesTbody.children).forEach(tr=>{
   // const inputs = Array.from(tr.querySelectorAll('input')).map(i=> Number(i.value)).filter(v=> !isNaN(v));
  //  const lastTd = tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 1];
  //  lastTd.textContent = inputs.length ? (inputs.reduce((a,b)=>a+b,0)/inputs.length).toFixed(2) : '';
 // });

  const actCount = classActivities.length;
  notesTfoot.innerHTML = '';

  // ----------------- Mitjana per activitat -----------------
  const trAvg = document.createElement('tr');
  trAvg.className = 'text-sm';
  trAvg.appendChild(th('Mitjana activitat'));
  if(actCount === 0){
    trAvg.appendChild(th('',''));
    notesTfoot.appendChild(trAvg);
    return;
  }

  for(let i=0;i<actCount;i++){
    const inputs = Array.from(notesTbody.querySelectorAll('tr')).map(r => r.querySelectorAll('input')[i]).filter(Boolean);
    const vals = inputs.map(inp => Number(inp.value)).filter(v=> !isNaN(v));
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '';
    const td = document.createElement('td');
    td.className = 'border px-2 py-1 text-center font-semibold';
    td.textContent = avg;
    trAvg.appendChild(td);
  }
  trAvg.appendChild(th('',''));
  notesTfoot.appendChild(trAvg);

  // ----------------- Fila fórmules -----------------
  const trForm = document.createElement('tr');
  trForm.className = 'formulas-row text-sm bg-gray-100';
  const td0 = document.createElement('td');
  td0.textContent = 'Fórmula';
  td0.className = 'border px-2 py-1 font-medium text-center';
  trForm.appendChild(td0);

  // Llegim fórmules de Firestore
  db.collection('classes').doc(currentClassId).get().then(doc=>{
    if(!doc.exists) return;
    const calculatedActs = doc.data().calculatedActivities || {};

    for(let i=0;i<actCount;i++){
      const actId = classActivities[i];
      const td = document.createElement('td');
      td.className = 'border px-2 py-1 text-center font-medium';
      td.textContent = calculatedActs[actId]?.formula || '';
      trForm.appendChild(td);
    }

    const tdLast = document.createElement('td');
    tdLast.textContent = '';
    tdLast.className = 'border px-2 py-1 text-center font-medium';
    trForm.appendChild(tdLast);

    formulaTfoot.appendChild(trForm);
  });
}





/* ============================================================
   MODAL CÁLCULO - Con Asistente de Fórmulas Mejorado
   ============================================================ */

let _classData = null;
let _selectedTermForFormula = null;
let _activityNameMap = {}; // 🔥 mapa id -> nom per al camp visual de fórmules

function openCalcModal(activityId){
  currentCalcActivityId = activityId; 
  openModal('modalCalc');
  document.getElementById('calcType').value = 'numeric';
  document.getElementById('formulaInputs').classList.add('hidden');
  document.getElementById('numericInput').classList.remove('hidden');
  document.getElementById('numericField').value = '';
  document.getElementById('formulaField').value = '';
  if (document.getElementById('formulaFieldHidden')) document.getElementById('formulaFieldHidden').value = '';
  _selectedTermForFormula = null;
  
  // 🔥 NUEVO: Limpiar validación
  clearFormulaValidation();
}

const calcTypeSelect = document.getElementById('calcType');
const numericDiv = document.getElementById('numericInput');
const numericField = document.getElementById('numericField');
const formulaDiv = document.getElementById('formulaInputs');
const formulaField = document.getElementById('formulaField');
const formulaFieldHidden = document.getElementById('formulaFieldHidden'); // 🔥 camp ocult amb IDs reals
const formulaButtonsDiv = document.getElementById('formulaButtons');
const modalApplyCalcBtn = document.getElementById('modalApplyCalcBtn');

// 🔥 NUEVO: Contenedores de validación
let formulaValidationDiv = null;
let formulaPreviewDiv = null;

// Cambio tipo cálculo
calcTypeSelect.addEventListener('change', ()=>{
  if(calcTypeSelect.value==='numeric'){
    numericDiv.classList.remove('hidden');
    formulaDiv.classList.add('hidden');
  } else if(calcTypeSelect.value==='formula'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildFormulaButtons(); 
    setupFormulaValidation(); // 🔥 NUEVO
  } else if(calcTypeSelect.value==='rounding'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildRoundingButtons();
  }
});

// ============================================================
// 🔥 NUEVO: Sistema de Validación en Tiempo Real
// ============================================================

function setupFormulaValidation() {
  // Crear contenedores si no existen
  if (!formulaValidationDiv) {
    formulaValidationDiv = document.createElement('div');
    formulaValidationDiv.id = 'formulaValidation';
    formulaValidationDiv.className = 'mt-2 p-3 rounded text-sm';
    formulaField.parentNode.insertBefore(formulaValidationDiv, formulaField.nextSibling);
  }
  
  if (!formulaPreviewDiv) {
    formulaPreviewDiv = document.createElement('div');
    formulaPreviewDiv.id = 'formulaPreview';
    formulaPreviewDiv.className = 'mt-2 p-3 rounded bg-green-50 border border-green-200 text-sm hidden';
    formulaValidationDiv.parentNode.insertBefore(formulaPreviewDiv, formulaValidationDiv.nextSibling);
  }

  // 🔥 NUEVO: Permitir edición inline - hacer contentEditable
  formulaField.addEventListener('input', validateFormula);
  formulaField.addEventListener('click', () => {
    // Permitir que el cursor se posicione en cualquier lugar
    formulaField.focus();
  });
}

function clearFormulaValidation() {
  if (formulaValidationDiv) formulaValidationDiv.innerHTML = '';
  if (formulaPreviewDiv) formulaPreviewDiv.classList.add('hidden');
}

function validateFormula() {
  const formula = formulaField.value.trim();
  
  if (!formula) {
    clearFormulaValidation();
    return;
  }

  // Validació visual (noms) - la regex de chars vàlids
  const validation = checkFormulaValidity(formula);
  
  // Mostrar validación
  if (formulaValidationDiv) {
    if (validation.valid) {
      formulaValidationDiv.innerHTML = `<span style="color: green; font-weight: bold;">✅ Fórmula vàlida</span>`;
      formulaValidationDiv.className = 'mt-2 p-3 rounded text-sm bg-green-50 border border-green-200';
      
      // Preview usa el camp ocult (amb IDs) que sí es pot avaluar
      const hidFormula = formulaFieldHidden ? formulaFieldHidden.value : formula;
      showFormulaPreview(hidFormula);
    } else {
      formulaValidationDiv.innerHTML = `<span style="color: red; font-weight: bold;">❌ Error: ${validation.error}</span>`;
      formulaValidationDiv.className = 'mt-2 p-3 rounded text-sm bg-red-50 border border-red-200';
      
      if (formulaPreviewDiv) {
        formulaPreviewDiv.classList.add('hidden');
      }
    }
  }
}

function checkFormulaValidity(formula) {
  // Contar paréntesis
  const openParens = (formula.match(/\(/g) || []).length;
  const closeParens = (formula.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    return {
      valid: false,
      error: `Paréntesis desbalanceados (abrir: ${openParens}, cerrar: ${closeParens})`
    };
  }

  // Validar caracteres permitidos
  const validChars = /^[a-zA-Z0-9+\-*/(). ,áéíóúàèìòùäëïöü\[\]_]*$/;
  if (!validChars.test(formula)) {
    return {
      valid: false,
      error: 'Caracteres inválidos detectados'
    };
  }

  // Validar que no termine en operador
  if (/[+\-*/]$/.test(formula.trim())) {
    return {
      valid: false,
      error: 'La fórmula no puede terminar en un operador'
    };
  }

  // Validar operadores duplicados
  if (/[+\-*/]{2,}/.test(formula)) {
    return {
      valid: false,
      error: 'Operadores duplicados detectados'
    };
  }

  return { valid: true, error: null };
}

function showFormulaPreview(formula) {
  if (!formulaPreviewDiv) return;

  // Simular cálculo con valores de ejemplo
  const exampleResult = simulateFormulaWithExamples(formula);
  
  if (exampleResult !== null && !isNaN(exampleResult)) {
    formulaPreviewDiv.innerHTML = `
      <strong>📊 Previsualización:</strong><br>
      Si todos los alumnos tuvieran nota <strong>6</strong>:<br>
      Resultado = <strong>${exampleResult.toFixed(2)}</strong>
    `;
    formulaPreviewDiv.classList.remove('hidden');
  }
}

function simulateFormulaWithExamples(formula) {
  try {
    let evalStr = formula;
    
    // 🔥 FIX: Substituir __ACT__id per 6 (exemple)
    evalStr = evalStr.replace(/__ACT__[a-zA-Z0-9_]+/g, '6');
    
    // Fallback: substituir noms d'activitats antics per 6
    const allTerms = _classData?.terms || {};
    Object.values(allTerms).forEach(term => {
      const activities = term.activities || [];
      activities.forEach(actId => {
        db.collection('activitats').doc(actId).get().then(doc => {
          if (doc.exists) {
            const actName = doc.data().nom;
            const regex = new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            evalStr = evalStr.replace(regex, '6');
          }
        });
      });
    });
    
    return Function('"use strict"; return (' + evalStr + ')')();
  } catch(e) {
    return null;
  }
}

// ============================================================
// HELPERS (sin cambios)
// ============================================================

async function applyNumeric(val) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => saveNote(sid, currentCalcActivityId, val)));
}

async function applyFormula(formula) {
  if (!formula.trim()) throw new Error('Formula buida');
  
  // Validar antes de aplicar
  const validation = checkFormulaValidity(formula);
  if (!validation.valid) {
    throw new Error('Fórmula inválida: ' + validation.error);
  }
  
  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid);
    await saveNote(sid, currentCalcActivityId, result);
  }));
}

async function applyRounding(formula) {
  if (!formula.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

  const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
  const selectedActivityDoc = activityDocs.find(doc => doc.exists && formula.startsWith(doc.data().nom));
  if (!selectedActivityDoc) throw new Error('Activitat no trobada');

  const selectedActivityName = selectedActivityDoc.data().nom;
  const multiplier = Number(formula.slice(selectedActivityName.length)) || 1;

  await Promise.all(classStudents.map(async sid => {
    const studentDoc = await db.collection('alumnes').doc(sid).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
    let val = Number(notes[selectedActivityDoc.id]) || 0;

    if (multiplier === 1) val = Math.round(val);
    else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

    await saveNote(sid, currentCalcActivityId, val);
  }));
}

// Event Listener Principal
modalApplyCalcBtn.addEventListener('click', async () => {
  if (!currentCalcActivityId) return;

  try {
    let formulaText = '';
    let displayFormulaText = '';

    switch (calcTypeSelect.value) {
      case 'numeric':
        await applyNumeric(Number(numericField.value));
        formulaText = numericField.value;
        displayFormulaText = numericField.value;
        break;

      case 'formula':
        // 🔥 FIX: Usem el camp ocult (amb IDs) per al càlcul real
        const realFormula = formulaFieldHidden ? formulaFieldHidden.value : formulaField.value;
        await applyFormula(realFormula);
        formulaText = realFormula;
        // 🔥 FIX: Traduir __ACT__id a noms per al displayFormula
        displayFormulaText = formulaField.value; // el camp visual ja té els noms
        break;

      case 'rounding':
        if (!formulaField.value.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

        const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
        const selectedActivityDoc = activityDocs.find(doc => doc.exists && formulaField.value.startsWith(doc.data().nom));
        if (!selectedActivityDoc) throw new Error('Activitat no trobada');

        const selectedActivityName = selectedActivityDoc.data().nom;
        const selectedActivityId = selectedActivityDoc.id;
        const multiplierStr = formulaField.value.slice(selectedActivityName.length).trim();
        const multiplier = multiplierStr === '' ? 1 : Number(multiplierStr);

        await Promise.all(classStudents.map(async sid => {
          const studentDoc = await db.collection('alumnes').doc(sid).get();
          const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
          let val = Number(notes[selectedActivityId]);
          if (isNaN(val)) val = 0;

          if (multiplier === 1) val = Math.round(val);
          else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

          await saveNote(sid, currentCalcActivityId, val);
        }));

        if (multiplier === 1) {
          formulaText = `Math.round(__ACT__${selectedActivityId})`;
          displayFormulaText = `Math.round(${selectedActivityName})`;
        } else if (multiplier === 0.5) {
          formulaText = `Math.round(__ACT__${selectedActivityId}*2)/2`;
          displayFormulaText = `Math.round(${selectedActivityName}*2)/2`;
        } else {
          formulaText = `__ACT__${selectedActivityId}`;
          displayFormulaText = `${selectedActivityName}`;
        }
        break;

      default:
        throw new Error('Tipus de càlcul desconegut');
    }

    if (currentClassId) {
      await db.collection('classes').doc(currentClassId).update({
        [`calculatedActivities.${currentCalcActivityId}`]: {
          calculated: true,
          formula: formulaText,
          displayFormula: displayFormulaText
        }
      });
    }

    closeModal('modalCalc');
    renderNotesGrid();
  } catch (e) {
    console.error(e);
    alert('Error en aplicar el càlcul: ' + e.message);
  }
});

// Build Formula Buttons (sin cambios respecto a versión anterior)
function buildFormulaButtons(){
  formulaButtonsDiv.innerHTML = '';

  console.log('buildFormulaButtons - _classData:', _classData);
  
  const allTerms = _classData?.terms || {};
  const termIds = Object.keys(allTerms);
  
  console.log('Términos encontrados:', termIds);

  if (termIds.length > 1) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'mb-3 p-2 bg-blue-50 rounded border border-blue-200';
    selectorContainer.innerHTML = '<label class="text-sm font-semibold text-blue-800">Selecciona pestaña d\'activitats:</label>';

    const termSelect = document.createElement('select');
    termSelect.className = 'w-full mt-1 border rounded px-2 py-1 bg-white';

    const optionAll = document.createElement('option');
    optionAll.value = '';
    optionAll.textContent = 'Activitats de la pestaña actual';
    termSelect.appendChild(optionAll);

    termIds.forEach(termId => {
      const opt = document.createElement('option');
      opt.value = termId;
      const termName = allTerms[termId].name || termId;
      opt.textContent = termName;
      termSelect.appendChild(opt);
    });

    termSelect.addEventListener('change', (e) => {
      _selectedTermForFormula = e.target.value || null;
      const currentButtons = formulaButtonsDiv.querySelectorAll('.activity-buttons-container');
      if (currentButtons.length > 0) {
        currentButtons.forEach(btn => btn.remove());
      }
      buildActivityButtons();
    });

    selectorContainer.appendChild(termSelect);
    formulaButtonsDiv.appendChild(selectorContainer);
  }

  // Operadores
  const operatorsContainer = document.createElement('div');
  operatorsContainer.className = 'operators-container mb-2';
  ['+', '-', '*', '/', '(', ')'].forEach(op=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
    btn.textContent = op;
    btn.addEventListener('click', ()=> insertAtCursor(op));
    operatorsContainer.appendChild(btn);
  });
  formulaButtonsDiv.appendChild(operatorsContainer);

  // Números
  const numbersContainer = document.createElement('div');
  numbersContainer.className = 'numbers-container mb-2';
  for(let i=0;i<=10;i++){
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = i;
    btn.addEventListener('click', ()=> insertAtCursor(i));
    numbersContainer.appendChild(btn);
  }
  formulaButtonsDiv.appendChild(numbersContainer);

  // Decimales
  const decimalsContainer = document.createElement('div');
  decimalsContainer.className = 'decimals-container mb-2';
  ['.', ','].forEach(dec=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.textContent = dec;
    btn.addEventListener('click', ()=> insertAtCursor('.'));
    decimalsContainer.appendChild(btn);
  });
  formulaButtonsDiv.appendChild(decimalsContainer);

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', deleteAtCursor);
  formulaButtonsDiv.appendChild(backBtn);

  buildActivityButtons();
}

// 🔥 Insertar en la posición del cursor
// str = text a inserir al camp OCULT (IDs)
// displayStr = text a mostrar al camp VISIBLE (noms). Si és null, usa str.
function insertAtCursor(str, displayStr) {
  const display = displayStr !== undefined ? displayStr : str;
  
  // -- Camp visual (noms) --
  const startVis = formulaField.selectionStart;
  const endVis = formulaField.selectionEnd;
  const textVis = formulaField.value;
  formulaField.value = textVis.substring(0, startVis) + display + textVis.substring(endVis);
  
  // -- Camp ocult (IDs) --
  // Com que readonly no permet selectionStart fiable per al hidden,
  // mantentem una posició en paral·lel basada en la mateixa lògica
  const textHid = formulaFieldHidden ? formulaFieldHidden.value : '';
  // Calculem quants caràcters hi havia al camp visual abans del cursor
  // i busquem la posició equivalent al camp ocult
  const visBeforeCursor = textVis.substring(0, startVis);
  const hidPos = getHiddenPosition(visBeforeCursor, textHid);
  
  if (formulaFieldHidden) {
    formulaFieldHidden.value = textHid.substring(0, hidPos) + str + textHid.substring(hidPos + (endVis - startVis > 0 ? getSelectionLengthInHidden(textVis, startVis, endVis, textHid) : 0));
  }
  
  // Mover el cursor después del texto insertado
  setTimeout(() => {
    formulaField.focus();
    formulaField.setSelectionRange(startVis + display.length, startVis + display.length);
  }, 0);
  
  validateFormula();
}

// Calcula la posició al camp ocult corresponent a un prefix del camp visual
function getHiddenPosition(visPrefix, hidValue) {
  // Anem reconstruint el visual a partir del hidden per trobar on estem
  let hidIdx = 0;
  let visBuilt = '';
  
  // Substituïm __ACT__id pel nom corresponent al mapa
  // Recorrem el hidden i anem construint el visual
  while (hidIdx < hidValue.length && visBuilt.length < visPrefix.length) {
    const remaining = hidValue.substring(hidIdx);
    const actMatch = remaining.match(/^__ACT__([a-zA-Z0-9_]+)/);
    if (actMatch) {
      const actId = actMatch[1];
      const actName = _activityNameMap[actId] || actMatch[0];
      if (visBuilt.length + actName.length <= visPrefix.length) {
        visBuilt += actName;
        hidIdx += actMatch[0].length;
      } else {
        break;
      }
    } else {
      visBuilt += hidValue[hidIdx];
      hidIdx++;
    }
  }
  return hidIdx;
}

function getSelectionLengthInHidden(visText, visStart, visEnd, hidValue) {
  const visBefore = visText.substring(0, visStart);
  const visSelected = visText.substring(visStart, visEnd);
  const hidStart = getHiddenPosition(visBefore, hidValue);
  const hidEnd = getHiddenPosition(visBefore + visSelected, hidValue);
  return hidEnd - hidStart;
}

// 🔥 Borrar el último token al cursor (si és __ACT__id esborra tot el token)
function deleteAtCursor() {
  const start = formulaField.selectionStart;
  if (start > 0) {
    const visText = formulaField.value;
    const hidText = formulaFieldHidden ? formulaFieldHidden.value : '';
    
    // Trobar el token al final del visual (pot ser un nom d'activitat o un caràcter)
    // Busquem si el text visual que acaba al cursor correspon a un nom d'activitat
    let tokenToDeleteVis = 1; // per defecte 1 caràcter
    let tokenToDeleteHid = 1;
    
    // Comprovar si el cursor acaba just després d'un nom d'activitat
    const visBefore = visText.substring(0, start);
    for (const [actId, actName] of Object.entries(_activityNameMap)) {
      if (actName && visBefore.endsWith(actName)) {
        tokenToDeleteVis = actName.length;
        tokenToDeleteHid = `__ACT__${actId}`.length;
        break;
      }
    }
    
    formulaField.value = visText.substring(0, start - tokenToDeleteVis) + visText.substring(start);
    
    if (formulaFieldHidden) {
      const hidPos = getHiddenPosition(visBefore, hidText);
      formulaFieldHidden.value = hidText.substring(0, hidPos - tokenToDeleteHid) + hidText.substring(hidPos);
    }
    
    setTimeout(() => {
      formulaField.focus();
      formulaField.setSelectionRange(start - tokenToDeleteVis, start - tokenToDeleteVis);
    }, 0);
    
    validateFormula();
  }
}

function buildActivityButtons(){
  console.log('buildActivityButtons - _selectedTermForFormula:', _selectedTermForFormula);

  const activitiesContainer = document.createElement('div');
  activitiesContainer.className = 'activity-buttons-container mb-2 p-2 bg-indigo-50 rounded';

  let activitiesToShow = [];

  if (_selectedTermForFormula && _classData?.terms?.[_selectedTermForFormula]) {
    activitiesToShow = _classData.terms[_selectedTermForFormula].activities || [];
  } else {
    activitiesToShow = classActivities;
  }

  if (activitiesToShow.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-sm text-gray-600 text-center';
    emptyMsg.textContent = 'Cap activitat en aquesta pestanya';
    activitiesContainer.appendChild(emptyMsg);
  } else {
    activitiesToShow.forEach(aid => {
      db.collection('activitats').doc(aid).get().then(doc => {
        if (!doc.exists) return;
        const name = doc.data().nom;
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300 font-semibold';
        
        let buttonText = name;
        if (_selectedTermForFormula) {
          const termName = _classData.terms[_selectedTermForFormula].name;
          buttonText = `[${termName}] ${name}`;
        }
        btn.textContent = buttonText;
        btn.title = `ID: ${aid}`; // tooltip per depurar si cal
        
        // 🔥 FIX: Guardem el nom al mapa per poder fer backspace intel·ligent
        _activityNameMap[aid] = name;
        
        // 🔥 FIX: Visible = nom, Ocult = __ACT__id
        btn.addEventListener('click', () => insertAtCursor(`__ACT__${aid}`, name));
        activitiesContainer.appendChild(btn);
      });
    });
  }

  formulaButtonsDiv.appendChild(activitiesContainer);
}

function buildRoundingButtons(){
  formulaButtonsDiv.innerHTML = '';

  const allTerms = _classData?.terms || {};
  const termIds = Object.keys(allTerms);

  if (termIds.length > 1) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'mb-3 p-2 bg-blue-50 rounded border border-blue-200';
    selectorContainer.innerHTML = '<label class="text-sm font-semibold text-blue-800">Selecciona pestaña d\'activitats:</label>';

    const termSelect = document.createElement('select');
    termSelect.className = 'w-full mt-1 border rounded px-2 py-1 bg-white';

    const optionAll = document.createElement('option');
    optionAll.value = '';
    optionAll.textContent = 'Activitats de la pestaña actual';
    termSelect.appendChild(optionAll);

    termIds.forEach(termId => {
      const opt = document.createElement('option');
      opt.value = termId;
      opt.textContent = allTerms[termId].name || termId;
      termSelect.appendChild(opt);
    });

    termSelect.addEventListener('change', (e) => {
      _selectedTermForFormula = e.target.value || null;
      const currentActivities = formulaButtonsDiv.querySelectorAll('.rounding-activities-container');
      if (currentActivities.length > 0) {
        currentActivities.forEach(act => act.remove());
      }
      buildRoundingActivityButtons();
    });

    selectorContainer.appendChild(termSelect);
    formulaButtonsDiv.appendChild(selectorContainer);
  }

  const roundingValuesContainer = document.createElement('div');
  roundingValuesContainer.className = 'rounding-values-container mb-2';
  [0.5, 1].forEach(v => {
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300 font-semibold';
    btn.textContent = v;
    btn.addEventListener('click', () => insertAtCursor(v));
    roundingValuesContainer.appendChild(btn);
  });
  formulaButtonsDiv.appendChild(roundingValuesContainer);

  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', deleteAtCursor);
  formulaButtonsDiv.appendChild(backBtn);

  buildRoundingActivityButtons();
}

function buildRoundingActivityButtons(){
  const activitiesContainer = document.createElement('div');
  activitiesContainer.className = 'rounding-activities-container mb-2 p-2 bg-indigo-50 rounded';

  let activitiesToShow = [];

  if (_selectedTermForFormula && _classData?.terms?.[_selectedTermForFormula]) {
    activitiesToShow = _classData.terms[_selectedTermForFormula].activities || [];
  } else {
    activitiesToShow = classActivities;
  }

  if (activitiesToShow.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-sm text-gray-600 text-center';
    emptyMsg.textContent = 'Cap activitat en aquesta pestanya';
    activitiesContainer.appendChild(emptyMsg);
  } else {
    activitiesToShow.forEach(aid => {
      db.collection('activitats').doc(aid).get().then(doc => {
        if (!doc.exists) return;
        const name = doc.data().nom;
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300 font-semibold';
        
        let buttonText = name;
        if (_selectedTermForFormula) {
          const termName = _classData.terms[_selectedTermForFormula].name;
          buttonText = `[${termName}] ${name}`;
        }
        btn.textContent = buttonText;
        
        btn.addEventListener('click', () => insertAtCursor(name));
        activitiesContainer.appendChild(btn);
      });
    });
  }

  formulaButtonsDiv.appendChild(activitiesContainer);
}

async function evalFormulaAsync(formula, studentId){
  let evalStr = formula;

  const studentDoc = await db.collection('alumnes').doc(studentId).get();
  const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

  const allTerms = _classData?.terms || {};
  const allActivityIds = new Set();
  
  Object.values(allTerms).forEach(term => {
    const activities = term.activities || [];
    activities.forEach(actId => allActivityIds.add(actId));
  });
  
  classActivities.forEach(actId => allActivityIds.add(actId));

  for(const aid of allActivityIds){
    const marker = `__ACT__${aid}`;
    const val = Number(notes[aid]);
    const safeVal = isNaN(val) ? 0 : val;
    const reMarker = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(reMarker, safeVal);
  }

  for(const aid of allActivityIds){
    const actDoc = await db.collection('activitats').doc(aid).get();
    const actName = actDoc.exists ? actDoc.data().nom : '';
    
    if(!actName) continue;
    
    const val = Number(notes[aid]);
    const safeVal = isNaN(val) ? 0 : val;
    
    const regex = new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(regex, safeVal);
  }

  try {
    const result = Function('"use strict"; return (' + evalStr + ')')();
    return result;
  } catch(e){
    console.error('Error evaluating formula:', formula, e);
    return 0;
  }
}

// ============================================================
// FIN MODAL CÁLCULO
// ============================================================




// ---------------- Helper per trobar nom alumne per ID ----------------
function getStudentRowById(sid) {
  // Busca la fila corresponent a aquest studentId
  const studentIndex = classStudents.findIndex(id => id === sid);
  if (studentIndex === -1) return null;
  return notesTbody.children[studentIndex] || null;
}

/* ---------------- Drag & Drop per activitats ---------------- */
function enableActivityDrag(){
  const ths = notesThead.querySelectorAll('tr:first-child th');
  ths.forEach((thEl, idx)=>{
    if(idx === 0 || idx === ths.length-1) return; // No draggable: primera (Alumne) i última (Mitjana)
    
    thEl.setAttribute('draggable', true);
    thEl.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', idx);
    });

    thEl.addEventListener('dragover', e=>{
      e.preventDefault();
      thEl.classList.add('border-dashed', 'border-2');
    });

    thEl.addEventListener('dragleave', e=>{
      thEl.classList.remove('border-dashed', 'border-2');
    });

    thEl.addEventListener('drop', e=>{
      e.preventDefault();
      thEl.classList.remove('border-dashed', 'border-2');
      const fromIdx = Number(e.dataTransfer.getData('text/plain'));
      const toIdx = idx;

      if(fromIdx === toIdx) return;

      // Reordenar classActivities
      const arr = Array.from(classActivities);
      const moved = arr.splice(fromIdx-1, 1)[0]; // -1 per ignorar columna Alumne
      arr.splice(toIdx-1, 0, moved);
      classActivities = arr;

      // 🔥 Guardar el nou ordre a Firestore
      if(currentClassId){
  const path = `terms.${Terms.getActiveTerm()}.activities`;
  db.collection('classes').doc(currentClassId).update({ [path]: classActivities })
    .then(() => console.log('Ordre d’activitats actualitzat a Firestore'))
    .catch(e => console.error('Error guardant ordre activitats', e));
}


      renderNotesGrid();
    });
  });
}


/* ---------------- Marcar activitat com calculada ---------------- */
async function markActivityAsCalculated(activityId){
  if(!currentClassId) return;
  await db.collection('classes').doc(currentClassId).update({
    [`calculatedActivities.${activityId}`]: true
  });
  // Re-render per assegurar bloqueig i color
  renderNotesGrid();
}



/* ---------------- Export Excel ---------------- 
btnExport.addEventListener('click', exportExcel);
async function exportExcel(){
  if(!currentClassId) return alert('No hi ha cap classe seleccionada.');

  try {
    // Carregar informació de la classe
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    if(!classDoc.exists) return alert('Classe no trobada.');
    const classData = classDoc.data();

    // Carregar activitats
    const actDocs = await Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()));

    // Carregar alumnes
    const studentDocs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));

    const ws_data = [];

    // Capçalera
    const header = ['Alumne', ...actDocs.map(a => a.exists ? a.data().nom : 'Sense nom'), 'Mitjana'];
    ws_data.push(header);

    // Files alumnes
    studentDocs.forEach(sdoc => {
      const notes = sdoc.exists ? sdoc.data().notes || {} : {};
      const row = [sdoc.exists ? sdoc.data().nom : 'Desconegut'];

      let sum = 0, count = 0;

      actDocs.forEach(adoc => {
        const aid = adoc.id;
        const val = (notes[aid] !== undefined) ? Number(notes[aid]) : '';
        row.push(val);
        if(val !== '') { sum += val; count++; }
      });

      row.push(count ? (sum/count).toFixed(2) : '');
      ws_data.push(row);
    });

    // Crear llibre Excel i full
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');

    // Nom del fitxer
    const fname = (document.getElementById('classTitle').textContent || 'classe') + '.xlsx';
    XLSX.writeFile(wb, fname);

  } catch(e){
    console.error(e);
    alert('Error exportant Excel: ' + e.message);
  }
}*/


/* ---------------- Tancar menús si fas clic fora ---------------- */
document.addEventListener('click', function(e) {
  document.querySelectorAll('.menu').forEach(menu => {
    if (!menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      menu.classList.add('hidden');
    }
  });
});
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenu = document.getElementById('userMenu');
const changePasswordBtn = document.getElementById('changePasswordBtn');

// Toggle menú
userMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  userMenu.classList.toggle('hidden');
});

// Tancar menú si clics fora
document.addEventListener('click', () => {
  userMenu.classList.add('hidden');
});

// Canviar contrasenya
changePasswordBtn.addEventListener('click', () => {
  const email = auth.currentUser?.email;
  if(!email) return alert('No hi ha usuari actiu.');
  const newPw = prompt('Introdueix la nova contrasenya:');
  if(!newPw) return;
  auth.currentUser.updatePassword(newPw)
    .then(()=> alert('Contrasenya canviada correctament!'))
    .catch(e=> alert('Error: ' + e.message));
});

// ---------------------- Importar alumnes ------------------------
document.getElementById('btnImportALConfirm').addEventListener('click', () => {
  const fileInput = document.getElementById('fileImport');
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona un fitxer!");

  const reader = new FileReader();
  reader.onload = async (e) => {
    let data = e.target.result;
    let studentNames = [];

    // Llegir CSV
    if (file.name.endsWith('.csv')) {
      const lines = data.split(/\r?\n/);
      lines.forEach(line => {
        const name = line.trim();
        if (name) studentNames.push(name);
      });
    } 
    // Llegir XLSX
    else if (file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      json.forEach(row => {
        const name = row[0];
        if (name) studentNames.push(name.trim());
      });
    }

    if(studentNames.length === 0) return alert('No s’ha trobat cap alumne al fitxer.');

    // Cridar funció per afegir alumnes a Firestore i classe
    await addImportedStudents(studentNames);

    closeModal('modalImportAL');
  };

  if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file);
  else reader.readAsText(file);
});

// Funció per afegir alumnes a Firestore i a la classe
async function addImportedStudents(names) {
  if (!currentClassId) return alert('No hi ha cap classe seleccionada.');

  const classRef = db.collection('classes').doc(currentClassId);

  try {
    for (const name of names) {
      const studentRef = db.collection('alumnes').doc();
      // Crear alumne a Firestore
      await studentRef.set({ nom: name, notes: {} });
      // Afegir ID alumne a la classe
      await classRef.update({
        alumnes: firebase.firestore.FieldValue.arrayUnion(studentRef.id)
      });
    }

    // Recarregar la graella perquè apareguin amb menú i drag & drop
    loadClassData();

    alert(`${names.length} alumne(s) importat(s) correctament!`);
  } catch(e) {
    console.error(e);
    alert('Error afegint alumnes: ' + e.message);
  }
}

// --------------Botó per tancar la llista d'alumnes mòbil
const closeBtn = document.getElementById('closeStudentsMobile');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    const container = document.getElementById('studentsListContainer');
    container.classList.remove('mobile-open');
  });
}

// ----------------------Fer funcionar el botó + (afegir terme)
const btnAddTerm = document.getElementById('btnAddTerm');
btnAddTerm.addEventListener('click', async () => {
  const name = prompt('Nom del nou grup (p. ex. 2TRIM):');
  if(!name) return;
  try {
    const newId = await Terms.addNewTermWithName(name);
    // Quan acaba, Terms ja cridarà l'onChange que actualitza la graella i el dropdown
  } catch(e) {
    console.error('Error creant terme:', e);
    alert('Error creant terme: ' + e.message);
  }
});

const btnAddTerm2 = document.getElementById('btnAddTerm2');
btnAddTerm2.addEventListener('click', async () => {
  const name = prompt('Nom del nou grup (p. ex. 2TRIM):');
  if(!name) return;
  try {
    const newId = await Terms.addNewTermWithName(name);
    // Quan acaba, Terms ja cridarà l'onChange que actualitza la graella i el dropdown
  } catch(e) {
    console.error('Error creant terme:', e);
    alert('Error creant terme: ' + e.message);
  }
});

// Botó de menú de graella
const termMenuBtn = document.getElementById('termMenuBtn');
const termMenu = document.getElementById('termMenu');

termMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  termMenu.classList.toggle('hidden');
});

// Tancar menú si clicques fora
document.addEventListener('click', () => {
  termMenu.classList.add('hidden');
});

// Editar nom de graella
termMenu.querySelector('.edit-term-btn').addEventListener('click', async () => {
  const currentTermId = Terms.getActiveTermId();
  const currentName = Terms.getActiveTermName();
  const newName = prompt('Nou nom de la graella:', currentName);
  if (newName && newName.trim() !== '') {
    await Terms.renameTerm(currentTermId, newName.trim());
  }
  termMenu.classList.add('hidden');
});

// Eliminar graella
termMenu.querySelector('.delete-term-btn').addEventListener('click', async () => {
  const currentTermId = Terms.getActiveTermId();
  if (!currentTermId) return;
  if (!confirm('Segur que vols eliminar aquesta graella i totes les seves activitats?')) return;

  try {
    await Terms.deleteTerm(currentTermId); // <-- Aquí utilitzem la funció de terms.js
  } catch(e) {
    alert('Error eliminant graella: ' + e.message);
  }

  termMenu.classList.add('hidden');
});

// Copiar estructura
termMenu.querySelector('.copy-structure-btn').addEventListener('click', () => {
  const currentTermId = Terms.getActiveTermId();
  if (!currentTermId) return;
  Terms.copyGridStructure(currentTermId);
  alert('Estructura copiada!');
  termMenu.classList.add('hidden');
});

// Enganxar estructura
termMenu.querySelector('.paste-structure-btn').addEventListener('click', async () => {
  const currentTermId = Terms.getActiveTermId();
  if (!currentTermId) return;

  await Terms.pasteGridStructure(currentTermId);
  alert('Estructura enganxada a la graella!');
  termMenu.classList.add('hidden');
});

// Exportar graella
termMenu.querySelector('.export-structure-btn').addEventListener('click', exportExcel);
async function exportExcel(){
  if(!currentClassId) return alert('No hi ha cap classe seleccionada.');

  try {
    // Carregar informació de la classe
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    if(!classDoc.exists) return alert('Classe no trobada.');
    const classData = classDoc.data();

    // Carregar activitats
    const actDocs = await Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()));

    // Carregar alumnes
    const studentDocs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));

    const ws_data = [];

    // Capçalera
    const header = ['Alumne', ...actDocs.map(a => a.exists ? a.data().nom : 'Sense nom'), 'Mitjana'];
    ws_data.push(header);

    // Files alumnes
    studentDocs.forEach(sdoc => {
      const notes = sdoc.exists ? sdoc.data().notes || {} : {};
      const row = [sdoc.exists ? sdoc.data().nom : 'Desconegut'];

      let sum = 0, count = 0;

      actDocs.forEach(adoc => {
        const aid = adoc.id;
        const val = (notes[aid] !== undefined) ? Number(notes[aid]) : '';
        row.push(val);
        if(val !== '') { sum += val; count++; }
      });

      row.push(count ? (sum/count).toFixed(2) : '');
      ws_data.push(row);
    });

    // Crear llibre Excel i full
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');

    // Nom del fitxer
    const fname = (document.getElementById('classTitle').textContent || 'classe') + '.xlsx';
    XLSX.writeFile(wb, fname);

  } catch(e){
    console.error(e);
    alert('Error exportant Excel: ' + e.message);
  }
}


//----------------------activar eliminar estudiants--------------------
function activateDeleteStudentsMode() {
    studentsMenu.classList.add('hidden');

    // Afegim el checkbox a cada alumne
    document.querySelectorAll('#studentsList li').forEach(li => {
        // Agafem la columna on hi ha el menú ⋮
        const menuContainer = li.querySelector('.relative');

        // Amaguem el menú ⋮
        const menuBtn = li.querySelector('.menu-btn');
        if (menuBtn) menuBtn.style.display = 'none';

        // Creem el checkbox i l’afegim DINS del mateix container a la dreta
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'stu-check ml-2'; // ml-2: marge a l’esquerra del checkbox
        menuContainer.appendChild(checkbox);
    });

    // Afegim menú inferior
    const footer = document.createElement('div');
    footer.id = 'studentsDeleteFooter';
    footer.className = 'mt-3 p-2 bg-red-50 border border-red-200 rounded flex justify-between items-center';

    footer.innerHTML = `
        <div>
            <label><input type="checkbox" id="selectAllStudents"> Tots</label>
        </div>
        <button id="confirmDeleteStudents" class="bg-red-600 text-white px-3 py-1 rounded">
            Eliminar
        </button>
    `;

    document.getElementById('studentsList').after(footer);

    // Select all
    document.getElementById('selectAllStudents').addEventListener('change', e => {
        document.querySelectorAll('.stu-check').forEach(ch => ch.checked = e.target.checked);
    });

    // Botó eliminar seleccionats
    document.getElementById('confirmDeleteStudents').addEventListener('click', () => {
        deleteSelectedStudents();
    });
}

//----------------------funcio eliminar seleccionats--------------------
function deleteSelectedStudents() {
    const selected = [...document.querySelectorAll('.stu-check:checked')];

    if (selected.length === 0) {
        alert('No hi ha alumnes seleccionats.');
        return;
    }

    if (!confirm(`Eliminar ${selected.length} alumnes?`)) return;

    const ids = [];

    selected.forEach(ch => {
        const li = ch.closest('li');
        const stuName = li.querySelector('.stu-name').textContent;

        // Agafem ID per eliminar-lo de la classe
        const index = [...studentsList.children].indexOf(li);
        const stuId = classStudents[index];

        ids.push(stuId);
    });

    // Actualitzar Firestore
    const classRef = db.collection('classes').doc(currentClassId);

    classRef.update({
        alumnes: firebase.firestore.FieldValue.arrayRemove(...ids)
    }).then(() => {
        // Tornem a carregar
        loadClassData();
        exitDeleteStudentsMode();
    });
}

//---------------sortit mode eliminacio----------------------------
function exitDeleteStudentsMode() {
    const footer = document.getElementById('studentsDeleteFooter');
    if (footer) footer.remove();

    // Treure els checkbox del costat dels alumnes
    document.querySelectorAll('.stu-check').forEach(ch => ch.remove());

    // Mostrar els ⋮ de cada alumne
    document.querySelectorAll('#studentsList li .menu-btn').forEach(btn => {
        btn.style.display = 'inline-block';
    });
}

//-----------------------control del mode eliminar
function toggleDeleteStudentsMode() {
    isDeleteMode = !isDeleteMode;

    classStudents.forEach(stuId => {
        const li = document.querySelector(`li[data-student-id="${stuId}"]`);
        if (!li) return;

        const menuBtn = li.querySelector('.menu-btn');

        if (isDeleteMode) {
            // Amaga ⋮ individuals
            if (menuBtn) menuBtn.style.display = 'none';

            // Afegir checkbox si no existeix
            if (!li.querySelector('.stu-check')) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'stu-check ml-2';
                li.querySelector('.relative').appendChild(checkbox);
            }
        } else {
            // Tornar a mostrar ⋮
            if (menuBtn) menuBtn.style.display = 'inline-block';

            // Eliminar checkboxes
            const checkbox = li.querySelector('.stu-check');
            if (checkbox) checkbox.remove();
        }
    });

    // Mostrar/Amagar botó Cancel·lar a la capçalera
    const cancelBtn = document.getElementById('cancelDeleteStudentsBtn');
    if (cancelBtn) cancelBtn.style.display = isDeleteMode ? 'inline-block' : 'none';
}

// Premem els tres puntets → mode eliminar
document.getElementById('deleteStudentsModeBtn').addEventListener('click', () => {
    toggleDeleteStudentsMode(); // aquí entres al mode eliminar
});

// Premem Cancel·lar → surt del mode
document.getElementById('cancelDeleteStudentsBtn').addEventListener('click', () => {
    exitDeleteStudentsMode();
    isDeleteMode = false; // actualitza l'estat del mode
    document.getElementById('cancelDeleteStudentsBtn').style.display = 'none'; // amaga el botó
});

// ----------- SCRIPT PER MARCAR USUARIS COM A ADMIN -----------
// ELIMINAT: setAdmins() s'ha mogut al panell d'administrador (administrador.js)
// ja que requeria permisos de 'list' sobre /professors que no tenen usuaris normals.

//----------------nou
function filterStudentsList() {
  const text = studentSearch.value.toLowerCase();

  document.querySelectorAll('#studentsList li').forEach(li => {
    const name = li.querySelector('.stu-name')?.innerText.toLowerCase() || "";
    li.style.display = name.includes(text) ? "" : "none";
  });
}

/* ---------------------- MODE ENVIAR NOTES ---------------------- */
window.__sendNotesModeActive = false;

// Afegim l’opció al menú global dels alumnes
(function attachGlobalStudentsMenuOption(){
  const studentsMenu = document.getElementById('studentsMenu');
  if (!studentsMenu) return;

  if (!studentsMenu.querySelector('.send-notes-mode-btn')) {
    const btn = document.createElement('button');
    btn.className = 'send-notes-mode-btn px-3 py-1 w-full text-left hover:bg-gray-100';
    btn.textContent = 'Enviar notes';
    btn.addEventListener('click', () => {
      toggleSendNotesMode();
      studentsMenu.classList.add('hidden');
    });
    studentsMenu.appendChild(btn);
  }
})();

// -------------------- FUNCIONS DE MODE ENVIAR NOTES --------------------
window.__sendNotesModeActive = false;

// Afegim l’opció al menú global dels alumnes
(function attachGlobalStudentsMenuOption(){
  const studentsMenu = document.getElementById('studentsMenu');
  if (!studentsMenu) return;

  if (!studentsMenu.querySelector('.send-notes-mode-btn')) {
    const btn = document.createElement('button');
    btn.className = 'send-notes-mode-btn px-3 py-1 w-full text-left hover:bg-gray-100';
    btn.textContent = 'Enviar notes';
    btn.addEventListener('click', () => {
      toggleSendNotesMode();
      studentsMenu.classList.add('hidden');
    });
    studentsMenu.appendChild(btn);
  }
})();

// -------------------- FUNCIONS DE MODE ENVIAR NOTES --------------------
function toggleSendNotesMode() {
  window.__sendNotesModeActive = !window.__sendNotesModeActive;

  if (window.__sendNotesModeActive) {
    showSendModeCheckboxes();
    showSendSelectedButton();
    showExitSendNotesButton();
  } else {
    hideSendModeCheckboxes();
    hideSendSelectedButton();
    hideExitSendNotesButton();
  }
}

// Mostrar checkboxes a la dreta (al lloc dels tres puntets) i amagar els tres puntets
function showSendModeCheckboxes() {
  document.querySelectorAll('#studentsList li').forEach(li => {
    if (li.querySelector('.send-note-checkbox')) return;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'send-note-checkbox';
    cb.style.marginLeft = '8px';
    cb.style.marginRight = '0';
    cb.style.cursor = 'pointer';

    // Amaguem els tres puntets
    const menuBtn = li.querySelector('.menu-btn');
    if (menuBtn) menuBtn.style.display = 'none';

    // Afegim el checkbox a la dreta
    const rightDiv = li.querySelector('div.relative');
    rightDiv.insertBefore(cb, rightDiv.firstChild);
  });
}

// Amagar checkboxes i tornar a mostrar els tres puntets
function hideSendModeCheckboxes() {
  document.querySelectorAll('.send-note-checkbox').forEach(cb => {
    const li = cb.closest('li');
    const menuBtn = li.querySelector('.menu-btn');
    if (menuBtn) menuBtn.style.display = '';
    cb.remove();
  });
}

// Botó i checkbox "Enviar notes + Tots"
function showSendSelectedButton() {
  const container = document.getElementById('studentsListContent');
  if (!container) return;
  if (document.getElementById('sendNotesRow')) return; // evita duplicar

  // Crear fila flexible
  const row = document.createElement('div');
  row.id = 'sendNotesRow';
  row.style.display = 'flex';
  row.style.gap = '0.5rem';
  row.style.marginBottom = '0.5rem';

  // Botó "Enviar notes"
  const btn = document.createElement('button');
  btn.textContent = 'Enviar notes';
  btn.style.flex = '1';
  btn.className = 'bg-blue-600 text-white px-3 py-2 rounded font-semibold';
  btn.addEventListener('click', sendSelectedNotes);

  // Checkbox "Tots"
  const cbAllContainer = document.createElement('label');
  cbAllContainer.style.flex = '1';
  cbAllContainer.style.display = 'flex';
  cbAllContainer.style.alignItems = 'center';
  cbAllContainer.style.gap = '0.5rem';
  cbAllContainer.style.cursor = 'pointer';

  const cbAll = document.createElement('input');
  cbAll.type = 'checkbox';
  cbAll.id = 'checkAllStudents';

  const cbAllText = document.createElement('span');
  cbAllText.textContent = 'Tots';

  cbAllContainer.appendChild(cbAll);
  cbAllContainer.appendChild(cbAllText);

  // Quan canviï el checkbox "Tots", marcar/desmarcar tots
  cbAll.addEventListener('change', () => {
    const allCheckboxes = document.querySelectorAll('.send-note-checkbox');
    allCheckboxes.forEach(cb => cb.checked = cbAll.checked);
  });

  row.appendChild(btn);
  row.appendChild(cbAllContainer);

  // Inserim just abans de la llista d'alumnes
  const studentsList = document.getElementById('studentsList');
  container.insertBefore(row, studentsList);
}

// Amagar la fila quan sortim del mode
function hideSendSelectedButton() {
  document.getElementById('sendNotesRow')?.remove();
}


// Botó "X vermella" per sortir del mode enviar notes
function showExitSendNotesButton() {
  const menuContainer = document.querySelector('#studentsListContent .flex.items-center.justify-between .relative');
  if (!menuContainer) return;
  if (document.getElementById('btnExitSendNotes')) return;

  // Assegura que el container sigui flex horitzontal
  menuContainer.style.display = 'flex';
  menuContainer.style.alignItems = 'center';
  menuContainer.style.gap = '4px'; // una mica d'espai entre la X i els tres puntets

  const btn = document.createElement('button');
  btn.id = 'btnExitSendNotes';
  btn.className = 'text-white bg-red-600 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer';
  btn.textContent = '×';
  btn.title = 'Sortir del mode enviar notes';
  btn.addEventListener('click', toggleSendNotesMode);

  const menuBtn = menuContainer.querySelector('#studentsMenuBtn');
  menuContainer.insertBefore(btn, menuBtn); // Ara quedarà just a l'esquerra dels tres puntets
}


function hideExitSendNotesButton() {
  document.getElementById('btnExitSendNotes')?.remove();
}

// Funció per formatar les notes d’un alumne per enviar per mail------------------------------

async function formatStudentNotesForEmail(studentId) {
  const doc = await db.collection('alumnes').doc(studentId).get();
  if (!doc.exists) return 'No hi ha dades.';

  const data = doc.data();
  const notes = data.notes || {};

  let lines = [];

  for (const actId of classActivities) {
    let actName = actId;

    try {
      const aDoc = await db.collection('activitats').doc(actId).get();
      if (aDoc.exists) actName = aDoc.data().nom || actId;
    } catch {}

    const val = notes[actId] ?? '';
    lines.push(`${actName}: ${val}`);
  }

 // if (typeof computeStudentAverageText === "function") {
  //  lines.push(`Mitjana: ${computeStudentAverageText(data)}`);
 // }

  return lines.join('\n');
}

//-------Enviar notes seleccionades
async function sendSelectedNotes() {
  const checked = [...document.querySelectorAll('.send-note-checkbox:checked')];
  if (!checked.length) {
    alert("Selecciona algun alumne.");
    return;
  }

  for (const cb of checked) {
    const li = cb.closest('li');
    const studentId = li.dataset.studentId;

    let email = li.dataset.email || '';

    // Si no hi ha email → demanar-lo
    if (!email) {
      const newMail = prompt(`Email per ${li.querySelector('.stu-name').textContent}:`);
      if (!newMail) continue;

      email = newMail.trim();
      li.dataset.email = email;

      await db.collection('alumnes').doc(studentId).update({ email });
    }

    const body = await formatStudentNotesForEmail(studentId);
    const subject = `Notes de ${li.querySelector('.stu-name').textContent}`;

    await gmailSendEmail(email, subject, body);


    await new Promise(r => setTimeout(r, 200));
  }
}

//-----------Funció per ENVIAR MAIL directament des del Gmail de l’usuari----------------
async function gmailSendEmail(to, subject, message) {
  if (!window._googleAccessToken) {
    alert("Cal iniciar sessió amb Google per enviar mails.");
    return;
  }

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "",
    message
  ].join("\n");

  const base64Email = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${window._googleAccessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Email })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(errorText);
      alert("Error enviant el correu: " + errorText);
      return;
    }

    alert(`Correu enviat a ${to} correctament!`);
    return true;
  } catch (err) {
    console.error(err);
    alert("Error enviant el correu: " + err.message);
  }
}
