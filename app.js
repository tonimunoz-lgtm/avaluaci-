// app.js - lògica principal (modules)
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

const modalCreateClassBtn = document.getElementById('modalCreateClassBtn');
const modalAddStudentBtn = document.getElementById('modalAddStudentBtn');
const modalAddActivityBtn = document.getElementById('modalAddActivityBtn');

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

  // Crida automàtica per carregar la graella de classes
  loadClassesScreen();
}

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
function openClass(classId){
  currentClassId = classId;
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

  db.collection('classes').doc(currentClassId).get().then(doc => {
    if(!doc.exists) return alert('Classe no trobada');
    const data = doc.data();
    classStudents = data.alumnes || [];
    classActivities = data.activitats || [];

    // Títol
    document.getElementById('classTitle').textContent = data.nom || 'Sense nom';

    renderStudentsList();
    renderNotesGrid();
  });
}

/* ---------------- Students ---------------- */
btnAddStudent.addEventListener('click', ()=> openModal('modalAddStudent'));

function addStudentModal(){
  const name = document.getElementById('modalStudentName').value.trim();
  if(!name) return alert('Posa un nom');
  const newStudent = { nom: name, notes: {} };
  classStudents.push(newStudent);

  db.collection('classes').doc(currentClassId).update({ alumnes: classStudents })
    .then(()=> {
      closeModal('modalAddStudent');
      document.getElementById('modalStudentName').value = '';
      renderStudentsList();
      renderNotesGrid();
    });
}
modalAddStudentBtn.addEventListener('click', addStudentModal);

function renderStudentsList(){
  studentsList.innerHTML = '';
  studentsCount.textContent = `(${classStudents.length})`;

  classStudents.forEach((alum, i) => {
    const li = document.createElement('li');
    li.className = 'py-1 px-2 border rounded hover:bg-gray-100 cursor-pointer';
    li.textContent = alum.nom;
    studentsList.appendChild(li);
  });
}

/* ---------------- Activities ---------------- */
btnAddActivity.addEventListener('click', ()=> openModal('modalAddActivity'));

function addActivityModal(){
  const name = document.getElementById('modalActivityName').value.trim();
  if(!name) return alert('Posa un nom');
  const id = 'act' + (classActivities.length + 1);
  const newActivity = { id, nom: name };

  classActivities.push(newActivity);

  // afegir columna buida per cada alumne
  classStudents.forEach(st => {
    st.notes[id] = '';
  });

  db.collection('classes').doc(currentClassId).update({ alumnes: classStudents, activitats: classActivities })
    .then(()=> {
      closeModal('modalAddActivity');
      document.getElementById('modalActivityName').value = '';
      renderNotesGrid();
    });
}
modalAddActivityBtn.addEventListener('click', addActivityModal);

/* ---------------- Notes Grid ---------------- */
function renderNotesGrid(){
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';

  // Header
  const trHead = document.createElement('tr');
  trHead.innerHTML = `<th class="px-2 py-1">Alumne</th>`;
  classActivities.forEach(act => {
    trHead.innerHTML += `<th class="px-2 py-1 relative">
      ${act.nom}
      <button class="calc-btn absolute top-1 right-1 text-xs px-1 rounded bg-gray-200 hover:bg-gray-300">Calcul</button>
    </th>`;
  });
  notesThead.appendChild(trHead);

  // Body
  classStudents.forEach((alum, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="px-2 py-1">${alum.nom}</td>`;
    classActivities.forEach(act => {
      tr.innerHTML += `<td class="px-2 py-1 text-center">
        <input type="text" class="table-input" data-student="${i}" data-act="${act.id}" value="${alum.notes[act.id] || ''}">
      </td>`;
    });
    notesTbody.appendChild(tr);
  });

  // attach input change events
  document.querySelectorAll('.table-input').forEach(input => {
    input.addEventListener('input', e => {
      const s = input.dataset.student;
      const a = input.dataset.act;
      classStudents[s].notes[a] = input.value;
      db.collection('classes').doc(currentClassId).update({ alumnes: classStudents });
    });
  });

  // attach calc button events
  document.querySelectorAll('.calc-btn').forEach((btn, idx) => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openCalcModalForActivity(classActivities[idx].id);
    });
  });
}

/* ---------------- Sort & Export ---------------- */
btnSortAlpha.addEventListener('click', () => {
  classStudents.sort((a,b)=> a.nom.localeCompare(b.nom));
  renderNotesGrid();
});

btnExport.addEventListener('click', () => {
  const wb = XLSX.utils.book_new();
  const ws_data = [];
  const header = ['Alumne', ...classActivities.map(a=>a.nom)];
  ws_data.push(header);

  classStudents.forEach(st => {
    const row = [st.nom, ...classActivities.map(a=> st.notes[a.id] || '')];
    ws_data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Notes');
  XLSX.writeFile(wb, `${document.getElementById('classTitle').textContent}_notes.xlsx`);
});

/* ---------------- Modal Calc Placeholder ---------------- */
function openCalcModalForActivity(actId){
  // guardem l'activitat seleccionada
  window.currentCalcActId = actId;

  const calcType = document.getElementById('calcType');
  calcType.value = 'numeric';
  document.getElementById('numericInput').style.display = 'block';
  document.getElementById('formulaInputs').style.display = 'none';

  openModal('modalCalc');
}

/* ---------- Calc Type Change ---------- */
document.getElementById('calcType').addEventListener('change', e => {
  const val = e.target.value;
  if(val === 'numeric'){
    document.getElementById('numericInput').style.display = 'block';
    document.getElementById('formulaInputs').style.display = 'none';
  } else {
    document.getElementById('numericInput').style.display = 'none';
    document.getElementById('formulaInputs').style.display = 'block';
    buildFormulaButtons(); // crear botons de fórmula
  }
});
/* ---------------- Build Formula Buttons ---------------- */
function buildFormulaButtons(){
  const formulaInputs = document.getElementById('formulaInputs');
  formulaInputs.innerHTML = '';

  // input de fórmula on es mostrarà la selecció
  const formulaField = document.createElement('input');
  formulaField.id = 'formulaField';
  formulaField.type = 'text';
  formulaField.placeholder = 'Ex: ((act1+act2)/2)*0.4 + act3*0.6';
  formulaField.className = 'border rounded px-3 py-2 w-full mb-2';
  formulaField.readOnly = true; // només es construeix amb botons
  formulaInputs.appendChild(formulaField);

  const instructions = document.createElement('p');
  instructions.className = 'text-xs text-gray-500 mb-2';
  instructions.textContent = 'Construeix la fórmula seleccionant activitats i operadors.';
  formulaInputs.appendChild(instructions);

  // contenidor de botons
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'flex flex-wrap gap-2 mb-2';
  formulaInputs.appendChild(buttonsDiv);

  // afegir botons d'activitats
  classActivities.forEach(act => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = act.nom;
    btn.className = 'px-2 py-1 bg-indigo-200 rounded hover:bg-indigo-300';
    btn.addEventListener('click', () => {
      formulaField.value += act.id;
    });
    buttonsDiv.appendChild(btn);
  });

  // operadors
  ['+', '-', '*', '/', '(', ')'].forEach(op => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = op;
    btn.className = 'px-2 py-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.addEventListener('click', () => {
      formulaField.value += op;
    });
    buttonsDiv.appendChild(btn);
  });

  // afegir números 0-10
  for(let i=0;i<=10;i++){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    btn.className = 'px-2 py-1 bg-green-200 rounded hover:bg-green-300';
    btn.addEventListener('click', () => {
      formulaField.value += i;
    });
    buttonsDiv.appendChild(btn);
  }

  // reset formula
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = 'Clear';
  resetBtn.className = 'px-2 py-1 bg-red-200 rounded hover:bg-red-300';
  resetBtn.addEventListener('click', ()=> formulaField.value = '');
  buttonsDiv.appendChild(resetBtn);
}

/* ---------------- Apply Formula ---------------- */
applyCalcBtn.addEventListener('click', ()=>{
  const type = document.getElementById('calcType').value;
  const actId = window.currentCalcActId;
  if(!actId) return alert('No s\'ha seleccionat cap activitat');

  if(type === 'numeric'){
    const val = document.getElementById('numericField').value;
    classStudents.forEach(st => st.notes[actId] = val);
  } else {
    const formula = document.getElementById('formulaField').value.trim();
    if(!formula) return alert('Formula buida');

    // aplicar fórmula a cada alumne
    classStudents.forEach(st => {
      try{
        // reemplaçar ids d'activitats per valors de cada alumne
        let expr = formula;
        classActivities.forEach(a => {
          const v = parseFloat(st.notes[a.id]) || 0;
          expr = expr.replaceAll(a.id, v);
        });
        // calcular el resultat
        const res = eval(expr);
        st.notes[actId] = res.toFixed(2);
      }catch(e){
        console.error('Error calculant formula:', e);
        st.notes[actId] = '';
      }
    });
  }

  // actualitzar Firebase i graella
  db.collection('classes').doc(currentClassId).update({ alumnes: classStudents })
    .then(()=>{
      renderNotesGrid();
      closeModal('modalCalc');
    });
});
/* ---------------- Firebase Inicialització ---------------- */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ---------------- Login i Registre ---------------- */
btnLogin.addEventListener('click', ()=>{
  const email = loginEmail.value;
  const pass = loginPassword.value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => { showApp(); })
    .catch(err => alert(err.message));
});

btnRegister.addEventListener('click', ()=>{
  const email = loginEmail.value;
  const pass = loginPassword.value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(() => { showApp(); })
    .catch(err => alert(err.message));
});

btnLogout.addEventListener('click', ()=>{
  auth.signOut().then(()=> showLogin());
});

auth.onAuthStateChanged(user => {
  if(user) showApp();
  else showLogin();
});

/* ---------------- Mostra / Amaga Pantalles ---------------- */
function showApp(){
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
  usuariNom.textContent = auth.currentUser.email;
  loadClasses();
}

function showLogin(){
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}

/* ---------------- Carregar Classes ---------------- */
function loadClasses(){
  db.collection('classes').where('user', '==', auth.currentUser.uid)
    .onSnapshot(snapshot => {
      classesGrid.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        const card = document.createElement('div');
        card.className = 'class-card';
        card.innerHTML = `<h3>${data.nom}</h3>`;
        card.addEventListener('click', ()=>{
          openClass(doc.id, data);
        });
        classesGrid.appendChild(card);
      });
    });
}

/* ---------------- Obrir Classe ---------------- */
function openClass(id, data){
  currentClassId = id;
  currentClassData = data;
  classStudents = data.alumnes || [];
  classActivities = data.activitats || [];
  screenClasses.classList.add('hidden');
  screenClass.classList.remove('hidden');
  classTitle.textContent = data.nom;
  renderNotesGrid();
}

/* ---------------- Tornar a Classes ---------------- */
btnBack.addEventListener('click', ()=>{
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
});

/* ---------------- Render Notes Grid ---------------- */
function renderNotesGrid(){
  // render alumnes i activitats en la graella
  studentsList.innerHTML = '';
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';

  // capçalera
  const trHead = document.createElement('tr');
  trHead.appendChild(document.createElement('th')); // columna alumnes
  classActivities.forEach(a=>{
    const th = document.createElement('th');
    th.textContent = a.nom;
    th.innerHTML += ` <button class="activity-menu-btn" data-actid="${a.id}">⋮</button>`;
    trHead.appendChild(th);
  });
  notesThead.appendChild(trHead);

  // alumnes
  classStudents.forEach(s=>{
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = s.nom;
    tr.appendChild(tdName);

    classActivities.forEach(a=>{
      const td = document.createElement('td');
      td.className = 'table-input';
      td.textContent = s.notes[a.id] || '';
      tr.appendChild(td);
    });

    notesTbody.appendChild(tr);
  });

  // attach event per botó ⋮ de cada activitat
  document.querySelectorAll('.activity-menu-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const actId = btn.getAttribute('data-actid');
      window.currentCalcActId = actId;
      openModal('modalCalc');
    });
  });
}
