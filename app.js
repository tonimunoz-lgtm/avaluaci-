// ---------------- app.js - Part 1/3 ----------------
import { openModal, closeModal, confirmAction } from './modals.js';

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

/* ---------------- Elements ---------------- */
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

/* ---------------- UTILS ---------------- */
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

/* ---------------- AUTH ---------------- */
btnLogin.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');
  auth.signInWithEmailAndPassword(email, pw)
    .then(u => {
      professorUID = u.user.uid;
      setupAfterAuth(u.user);
    }).catch(e => alert('Error login: ' + e.message));
});

btnRegister.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if (!email || !pw) return alert('Introdueix email i contrasenya');
  auth.createUserWithEmailAndPassword(email, pw)
    .then(u => {
      professorUID = u.user.uid;
      db.collection('professors').doc(professorUID).set({ email, classes: [] })
        .then(()=> { setupAfterAuth(u.user); });
    }).catch(e => alert('Error registre: ' + e.message));
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
    setupAfterAuth(user);
  } else {
    professorUID = null;
    showLogin();
  }
});

function setupAfterAuth(user) {
  showApp();
  const email = user.email || '';
  usuariNom.textContent = email.split('@')[0] || email;
  loadClassesScreen();
}
// ---------------- app.js - Part 2/3 ----------------

/* ---------------- Classes screen ---------------- */
btnCreateClass.addEventListener('click', ()=> openModal('modalCreateClass'));

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
    if(!doc.exists) { classesGrid.innerHTML = '<div class="text-sm text-red-500">Professor no trobat</div>'; return; }
    const ids = doc.data().classes || [];
    if(ids.length === 0) {
      classesGrid.innerHTML = `<div class="col-span-full p-6 bg-white dark:bg-gray-800 rounded shadow text-center">No tens cap classe. Crea la primera!</div>`;
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

          card.innerHTML = `
            ${deleteMode ? '<input type="checkbox" class="delete-checkbox absolute top-2 right-2 w-5 h-5">' : ''}
            <h3 class="text-lg font-bold">${d.data().nom||'Sense nom'}</h3>
            <p class="text-sm mt-2">${(d.data().alumnes||[]).length} alumnes · ${(d.data().activitats||[]).length} activitats</p>
            <div class="click-hint">${deleteMode ? 'Selecciona per eliminar' : 'Fes clic per obrir'}</div>
          `;

          if(!deleteMode){
            const menuDiv = document.createElement('div');
            menuDiv.className = 'absolute top-2 right-2';
            menuDiv.innerHTML = `
              <button class="menu-btn text-white font-bold text-xl">⋮</button>
              <div class="menu hidden absolute right-0 mt-1 bg-white text-black border rounded shadow z-10">
                <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100">Editar</button>
                <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100">Eliminar</button>
                <button class="calc-btn px-3 py-1 w-full text-left hover:bg-gray-100">Calcul</button>
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

            menuDiv.querySelector('.delete-btn').addEventListener('click', () => {
              confirmAction('Eliminar classe', 'Segur que vols eliminar-la?', ()=> {
                db.collection('professors').doc(professorUID).update({
                  classes: firebase.firestore.FieldValue.arrayRemove(d.id)
                });
                db.collection('classes').doc(d.id).delete();
                loadClassesScreen();
              });
            });

            menuDiv.querySelector('.calc-btn').addEventListener('click', ()=> openCalcModal(d.id));

            card.addEventListener('click', () => openClass(d.id));
          }

          classesGrid.appendChild(card);
        });
      });
  }).catch(e=> {
    classesGrid.innerHTML = `<div class="text-sm text-red-500">Error carregant classes</div>`;
    console.error(e);
  });
}

/* ---------------- Modal de càlcul ---------------- */
function openCalcModal(activityId){
  const activityName = document.querySelector(`.class-card[data-id="${currentClassId}"] h3`)?.textContent || 'Activitat';
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded shadow w-96">
      <h3 class="text-lg font-bold mb-4">Càlcul per: ${activityName}</h3>
      <div class="mb-4">
        <label class="block mb-1 font-medium">Tipus de càlcul</label>
        <select id="calcType" class="w-full border rounded p-2">
          <option value="numeric">Numeric (manual)</option>
          <option value="formula">Fórmula</option>
        </select>
      </div>
      <div class="mb-4 hidden" id="formulaDiv">
        <label class="block mb-1 font-medium">Fórmula</label>
        <input type="text" id="formulaInput" class="w-full border rounded p-2" placeholder="Ex: ((act1+act2)/2)*0.4 + act3*0.6">
        <p class="text-xs text-gray-500 mt-1">Utilitza els IDs de les activitats: act1, act2, act3...</p>
      </div>
      <div class="flex justify-end gap-2">
        <button id="calcCancelBtn" class="px-4 py-2 rounded border">Cancel·lar</button>
        <button id="calcOkBtn" class="px-4 py-2 rounded bg-blue-600 text-white">Aplicar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const calcType = modal.querySelector('#calcType');
  const formulaDiv = modal.querySelector('#formulaDiv');
  const formulaInput = modal.querySelector('#formulaInput');
  const cancelBtn = modal.querySelector('#calcCancelBtn');
  const okBtn = modal.querySelector('#calcOkBtn');

  calcType.addEventListener('change', ()=> formulaDiv.classList.toggle('hidden', calcType.value === 'numeric'));
  cancelBtn.addEventListener('click', ()=> modal.remove());
  okBtn.addEventListener('click', ()=>{
    const type = calcType.value;
    if(type === 'numeric'){
      alert('Numeric manté la introducció manual.');
      modal.remove();
    } else {
      const formula = formulaInput.value.trim();
      if(!formula) return alert('Introdueix una fórmula vàlida.');
      applyFormulaToActivity(activityId, formula);
      modal.remove();
    }
  });
}
// ---------------- app.js - Part 3/3 ----------------

/* ---------- Obtenir IDs i noms d'activitats ---------- */
function getActivityIdsMap(){
  const map = {};
  classActivities.forEach((aid,i)=>{
    map[`act${i+1}`] = aid;
  });
  return map;
}

function getActivityNamesMap(){
  const map = {};
  classActivities.forEach((aid,i)=>{
    db.collection('activitats').doc(aid).get().then(doc=>{
      map[`act${i+1}`] = doc.exists ? doc.data().nom || `act${i+1}` : `act${i+1}`;
    });
  });
  return map;
}

/* ---------- Validació fórmula segura ---------- */
function safeEvalFormula(expr, studentNotes){
  // Substitueix només números i operadors bàsics
  Object.keys(studentNotes).forEach(aid=>{
    const re = new RegExp(aid,'g');
    expr = expr.replace(re, studentNotes[aid] !== undefined ? studentNotes[aid] : 0);
  });

  // Només permet números, +, -, *, /, (, ), . i espais
  if(!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('Fórmula conté caràcters no permesos');

  return Function('"use strict"; return (' + expr + ')')();
}

/* ---------- Aplicar fórmula avançada ---------- */
function applyFormulaToActivity(activityId, formula){
  const idsMap = getActivityIdsMap();

  Promise.all(classStudents.map(sid => db.collection('alumnes').doc(sid).get()))
    .then(studentDocs=>{
      studentDocs.forEach(sdoc=>{
        if(!sdoc.exists) return;
        const notes = sdoc.data().notes || {};

        // Substitueix act1, act2... amb valors reals de l'alumne
        let expr = formula;
        Object.keys(idsMap).forEach(actKey=>{
          const aid = idsMap[actKey];
          const val = notes[aid] !== undefined ? notes[aid] : 0;
          expr = expr.replace(new RegExp(actKey,'g'), val);
        });

        let result;
        try {
          result = safeEvalFormula(expr, notes);
        } catch(e){
          console.error('Error a la fórmula:', e);
          result = null;
        }

        if(result !== null && !isNaN(result)){
          notes[activityId] = Number(result.toFixed(2));
          db.collection('alumnes').doc(sdoc.id).update({ notes })
            .catch(e=> console.error('Error actualitzant nota:', e));
        }
      });
    })
    .then(()=> renderNotesGrid());
}

/* ---------- Integrar opció "Calcul" als tres punts ---------- */
document.addEventListener('click', e=>{
  if(e.target.classList.contains('calc-btn')){
    const thEl = e.target.closest('th');
    if(!thEl) return;
    const idx = Array.from(thEl.parentNode.children).indexOf(thEl) - 1; // -1 per columna Alumne
    const activityId = classActivities[idx];
    openCalcModal(activityId);
  }
});

/* ---------- Afegir botó "Calcul" als menús ---------- */
function enhanceActivityMenus(){
  notesThead.querySelectorAll('th').forEach((thEl, i)=>{
    if(i === 0 || i > classActivities.length) return; // Saltar Alumne i Mitjana
    const menu = thEl.querySelector('.menu');
    if(menu && !menu.querySelector('.calc-btn')){
      const btn = document.createElement('button');
      btn.className = 'calc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';
      btn.textContent = 'Calcul';
      menu.appendChild(btn);
    }
  });
}

// Crida després de renderNotesGrid
const originalRenderNotesGrid = renderNotesGrid;
renderNotesGrid = function(){
  originalRenderNotesGrid();
  setTimeout(enhanceActivityMenus, 50); // Assegurar que els menús estiguin creats
};



