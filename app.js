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
let currentCalcActivityId = null; // Activitat actual per fer càlculs


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
    classStudents = data.alumnes || [];
    classActivities = data.activitats || [];
    document.getElementById('classTitle').textContent = data.nom || 'Sense nom';
    document.getElementById('classSub').textContent = `ID: ${doc.id}`;
    renderStudentsList();
    renderNotesGrid();
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

function removeStudent(studentId){
  db.collection('classes').doc(currentClassId).update({ alumnes: firebase.firestore.FieldValue.arrayRemove(studentId) })
    .then(()=> db.collection('alumnes').doc(studentId).delete())
    .then(()=> loadClassData())
    .catch(e=> alert('Error eliminant alumne: '+e.message));
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

function createActivityModal(){
  const name = document.getElementById('modalActivityName').value.trim();
  if(!name) return alert('Posa un nom');
  const ref = db.collection('activitats').doc();
  ref.set({ nom: name, data: new Date().toISOString().split('T')[0] })
    .then(()=> db.collection('classes').doc(currentClassId).update({ activitats: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> {
      closeModal('modalAddActivity');
      document.getElementById('modalActivityName').value = '';
      loadClassData();
    }).catch(e=> alert('Error: '+e.message));
}

function removeActivity(actId){
  confirmAction('Eliminar activitat', 'Esborrar activitat i totes les notes relacionades?', ()=> {
    db.collection('classes').doc(currentClassId).update({ activitats: firebase.firestore.FieldValue.arrayRemove(actId) })
      .then(()=> {
        const batch = db.batch();
        classStudents.forEach(sid => {
          const ref = db.collection('alumnes').doc(sid);
          batch.update(ref, { [`notes.${actId}`]: firebase.firestore.FieldValue.delete() });
        });
        return batch.commit();
      }).then(()=> loadClassData())
      .catch(e=> alert('Error esborrant activitat: '+e.message));
  });
}

/* ---------------- Render Students List amb menú ---------------- */
function renderStudentsList(){
  studentsList.innerHTML = '';
  studentsCount.textContent = `(${classStudents.length})`;

  if(classStudents.length === 0){
    studentsList.innerHTML = '<li class="text-sm text-gray-400">No hi ha alumnes</li>';
    return;
  }

  classStudents.forEach((stuId, idx)=>{
    db.collection('alumnes').doc(stuId).get().then(doc=>{
      const name = doc.exists ? doc.data().nom : 'Desconegut';
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded';

      li.innerHTML = `
        <div class="flex items-center gap-3">
          <span draggable="true" title="Arrossega per reordenar" class="cursor-move text-sm text-gray-500">☰</span>
          <span class="stu-name font-medium">${name}</span>
        </div>
        <div class="relative">
          <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮</button>
          <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10 transition-opacity duration-200 opacity-0">
            <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
            <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
          </div>
        </div>
      `;

      const menuBtn = li.querySelector('.menu-btn');
      const menu = li.querySelector('.menu');

      menuBtn.addEventListener('click', e=>{
        e.stopPropagation();
        document.querySelectorAll('.menu').forEach(m=> m.classList.add('hidden'));
        menu.classList.toggle('hidden');
      });

      li.querySelector('.edit-btn').addEventListener('click', ()=>{
        const newName = prompt('Introdueix el nou nom:', name);
        if(!newName || newName.trim()===name) return;
        db.collection('alumnes').doc(stuId).update({ nom: newName.trim() })
          .then(()=> loadClassData())
          .catch(e=> alert('Error editant alumne: '+e.message));
      });

      li.querySelector('.delete-btn').addEventListener('click', ()=> removeStudent(stuId));

      // Drag handle
      const dragHandle = li.querySelector('[draggable]');
      dragHandle.addEventListener('dragstart', e=>{
        e.dataTransfer.setData('text/plain', idx.toString());
      });
      li.addEventListener('dragover', e=> e.preventDefault());
      li.addEventListener('drop', e=>{
        e.preventDefault();
        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
        reorderStudents(fromIdx, idx);
      });

      studentsList.appendChild(li);
    });
  });
}

/* ---------------- Notes Grid amb menú activitats ---------------- */
function renderNotesGrid(){
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';

  const headRow = document.createElement('tr');
  headRow.appendChild(th('Alumne'));

  Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()))
    .then(actDocs=>{
      actDocs.forEach(adoc=>{
        const id = adoc.id;
        const name = adoc.exists ? (adoc.data().nom||'Sense nom') : 'Desconegut';
        const thEl = th('');
        const container = document.createElement('div');
        container.className = 'flex items-center justify-between';

        const spanName = document.createElement('span');
        spanName.textContent = name;

        const menuDiv = document.createElement('div');
        menuDiv.className = 'relative';
        menuDiv.innerHTML = `
          <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮</button>
          <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10 transition-opacity duration-200 opacity-0">
             <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
            <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
            <button class="calc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Calcul</button>
          </div>
        `;
        container.appendChild(spanName);
        container.appendChild(menuDiv);
        thEl.appendChild(container);
        headRow.appendChild(thEl);

        const menuBtn = menuDiv.querySelector('.menu-btn');
        const menu = menuDiv.querySelector('.menu');
        menuBtn.addEventListener('click', e=>{
          e.stopPropagation();
          document.querySelectorAll('.menu').forEach(m=> m.classList.add('hidden'));
          menu.classList.toggle('hidden');
        });

        menuDiv.querySelector('.calc-btn').addEventListener('click', () => {
          e.stopPropagation();
          openCalcModal(id); // id és l'ID de l'activitat
        });
        
        menuDiv.querySelector('.edit-btn').addEventListener('click', ()=>{
          const newName = prompt('Introdueix el nou nom de l\'activitat:', name);
          if(!newName || newName.trim()===name) return;
          db.collection('activitats').doc(id).update({ nom: newName.trim() })
            .then(()=> loadClassData())
            .catch(e=> alert('Error editant activitat: '+e.message));
        });

        menuDiv.querySelector('.delete-btn').addEventListener('click', ()=> removeActivity(id));
      });

      headRow.appendChild(th('Mitjana', 'text-right'));
      notesThead.appendChild(headRow);

      if(classStudents.length===0){
        notesTbody.innerHTML = `<tr><td class="p-3 text-sm text-gray-400" colspan="${classActivities.length+2}">No hi ha alumnes</td></tr>`;
        renderAverages();
        return;
      }

      Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()))
        .then(studentDocs=>{
          studentDocs.forEach(sdoc=>{
            const sid = sdoc.id;
            const sdata = sdoc.exists ? sdoc.data() : { nom:'Desconegut', notes:{} };
            const tr = document.createElement('tr');
            tr.className = 'align-top';

            const tdName = document.createElement('td');
            tdName.className = 'border px-2 py-1';
            tdName.textContent = sdata.nom;
            tr.appendChild(tdName);

            actDocs.forEach(actDoc=>{
              const aid = actDoc.id;
              const val = (sdata.notes && sdata.notes[aid]!==undefined) ? sdata.notes[aid] : '';
              const td = document.createElement('td');
              td.className = 'border px-2 py-1';
              const input = document.createElement('input');
              input.type='number'; input.min=0; input.max=10;
              input.value=val;
              input.className='table-input text-center rounded border p-1';
              input.addEventListener('change', e=> saveNote(sid, aid, e.target.value));
              input.addEventListener('input', ()=> applyCellColor(input));
              applyCellColor(input);
              td.appendChild(input);
              tr.appendChild(td);
            });

            const avgTd = document.createElement('td');
            avgTd.className = 'border px-2 py-1 text-right font-semibold';
            avgTd.textContent = computeStudentAverageText(sdata);
            tr.appendChild(avgTd);

            notesTbody.appendChild(tr);
          });
          renderAverages();
        });
    });
}

/* ---------------- Helpers Notes & Excel ---------------- */
function th(txt, cls=''){
  const el = document.createElement('th');
  el.className = 'border px-2 py-1 ' + cls;
  el.textContent = txt;
  return el;
}

function saveNote(studentId, activityId, value){
  const num = value === '' ? null : Number(value);
  const updateObj = {};
  if(num === null || isNaN(num)) updateObj[`notes.${activityId}`] = firebase.firestore.FieldValue.delete();
  else updateObj[`notes.${activityId}`] = num;
  db.collection('alumnes').doc(studentId).update(updateObj)
    .then(()=> renderNotesGrid())
    .catch(e=> console.error('Error saving note', e));
}

function applyCellColor(inputEl){
  const v = Number(inputEl.value);
  inputEl.classList.remove('bg-red-100','bg-yellow-100','bg-green-100');
  if(inputEl.value === '' || isNaN(v)) return;
  if(v < 5) inputEl.classList.add('bg-red-100');
  else if(v < 7) inputEl.classList.add('bg-yellow-100');
  else inputEl.classList.add('bg-green-100');
}

function computeStudentAverageText(studentData){
  const notesMap = (studentData && studentData.notes) ? studentData.notes : {};
  const vals = classActivities.map(aid => (notesMap[aid] !== undefined ? Number(notesMap[aid]) : null)).filter(v=> v!==null && !isNaN(v));
  if(vals.length === 0) return '';
  return (vals.reduce((s,n)=> s+n,0)/vals.length).toFixed(2);
}

function renderAverages(){
  Array.from(notesTbody.children).forEach(tr=>{
    const inputs = Array.from(tr.querySelectorAll('input')).map(i=> Number(i.value)).filter(v=> !isNaN(v));
    const lastTd = tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 1];
    lastTd.textContent = inputs.length ? (inputs.reduce((a,b)=>a+b,0)/inputs.length).toFixed(2) : '';
  });

  const actCount = classActivities.length;
  notesTfoot.innerHTML = '';
  const tr = document.createElement('tr');
  tr.className = 'text-sm';
  tr.appendChild(th('Mitjana activitat'));
  if(actCount === 0){
    tr.appendChild(th('',''));
    notesTfoot.appendChild(tr);
    return;
  }
  for(let i=0;i<actCount;i++){
    const inputs = Array.from(notesTbody.querySelectorAll('tr')).map(r => r.querySelectorAll('input')[i]).filter(Boolean);
    const vals = inputs.map(inp => Number(inp.value)).filter(v=> !isNaN(v));
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '';
    const td = document.createElement('td');
    td.className = 'border px-2 py-1 text-center font-semibold';
    td.textContent = avg;
    tr.appendChild(td);
  }
  tr.appendChild(th('',''));
  notesTfoot.appendChild(tr);
}

function openCalcModal(activityId){
  // Guardarem l'activitat que estem editant
  currentCalcActivityId = activityId; // variable global nova que afegirem
  // Obrir el modal
  openModal('modalCalc');
  // Reset inputs del modal
  document.getElementById('calcType').value = 'numeric';
  document.getElementById('formulaInputs').classList.add('hidden');
  document.getElementById('numericInput').classList.remove('hidden');
  document.getElementById('numericField').value = '';
  document.getElementById('formulaField').value = '';
}

/* ---------------- Export Excel ---------------- */
btnExport.addEventListener('click', exportExcel);
function exportExcel(){
  const table = document.getElementById('notesTable');
  const wb = XLSX.utils.table_to_book(table, {sheet:"Notes"});
  const fname = (document.getElementById('classTitle').textContent || 'classe') + '.xlsx';
  XLSX.writeFile(wb, fname);
}

// Tancar menús si fas clic fora
document.addEventListener('click', function(e) {
  document.querySelectorAll('.menu').forEach(menu => {
    if (!menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      menu.classList.add('hidden');
    }
  });
});
