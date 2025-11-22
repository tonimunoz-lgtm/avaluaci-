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
    if(ids.length === 0){
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

function createActivityModal(){
  const name = document.getElementById('modalActivityName').value.trim();
  if(!name) return alert('Posa un nom');
  const ref = db.collection('activitats').doc();
  ref.set({ nom: name, data: new Date().toISOString().split('T')[0], calcType:'numeric', formula:'' })
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
function renderNotesGrid() {
  // Neteja taula
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';

  // Capçalera alumne
  const headRow = document.createElement('tr');
  headRow.appendChild(th('Alumne'));

  // Carrega classe
  db.collection('classes').doc(currentClassId).get().then(doc => {
    if (!doc.exists) return;

    const classData = doc.data();
    const calculatedActs = classData.calculatedActivities || {};

    // Carrega activitats de la classe
    Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()))
      .then(actDocs => {

        // Capçalera activitats amb icona refrescar si és calculada
        actDocs.forEach(adoc => {
          const id = adoc.id;
          const name = adoc.exists ? (adoc.data().nom || 'Sense nom') : 'Desconegut';

          const thEl = th('');
          const container = document.createElement('div');
          container.className = 'flex items-center justify-between';

          const spanName = document.createElement('span');
          spanName.textContent = name;

          // Icona refrescar (només si és calculada)
          const refreshIcon = document.createElement('span');
          refreshIcon.innerHTML = '🔄';
          refreshIcon.title = 'Refrescar columna';
          refreshIcon.className = 'ml-2 cursor-pointer hidden';

          // Afegim event listener per refrescar la columna
          refreshIcon.addEventListener('click', async (e) => {
            e.stopPropagation();

            // Busquem la fila de fórmules a l'últim peu de la taula
            const formulasRow = notesTfoot.querySelector('.formulas-row');
            if (!formulasRow) return;

            const idx = Array.from(headRow.children).indexOf(thEl);
            const formulaTd = formulasRow.children[idx];
            if (!formulaTd) return;

            const formulaText = formulaTd.textContent.trim();
            if (!formulaText) return alert('No hi ha cap fórmula aplicada a aquesta activitat.');

            try {
              // Aplicar fórmula a tots els alumnes
              await Promise.all(classStudents.map(async sid => {
                const result = await evalFormulaAsync(formulaText, sid);
                await saveNote(sid, id, result);
              }));

              // Actualitzar taula visualment
              renderNotesGrid();
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
            </div>
          `;

          container.appendChild(spanName);
          container.appendChild(refreshIcon);
          container.appendChild(menuDiv);
          thEl.appendChild(container);
          headRow.appendChild(thEl);

          // Capçalera color calculada
          if (calculatedActs[id]) {
            thEl.style.backgroundColor = "#fecaca";
            thEl.style.borderBottom = "3px solid #dc2626";
            thEl.style.color = "black";
            refreshIcon.classList.remove('hidden');
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
            db.collection('activitats').doc(id).update({ nom: newName.trim() })
              .then(() => loadClassData());
          });

          menuDiv.querySelector('.delete-btn').addEventListener('click', () => removeActivity(id));
          menuDiv.querySelector('.calc-btn').addEventListener('click', () => openCalcModal(id));
        });

        headRow.appendChild(th('Mitjana', 'text-right'));
        notesThead.appendChild(headRow);

        enableActivityDrag();

        // Si no hi ha alumnes
        if (classStudents.length === 0) {
          notesTbody.innerHTML = `<tr><td class="p-3 text-sm text-gray-400" colspan="${classActivities.length + 2}">No hi ha alumnes</td></tr>`;
          renderAverages();
          return;
        }

        // Cos taula alumnes
        Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()))
          .then(studentDocs => {
            studentDocs.forEach(sdoc => {
              const studentId = sdoc.id;
              const studentData = sdoc.exists ? sdoc.data() : { nom: 'Desconegut', notes: {} };

              let tr = document.querySelector(`tr[data-student-id="${studentId}"]`);
              if (!tr) {
                tr = document.createElement('tr');
                tr.dataset.studentId = studentId;

                // Nom alumne
                const tdName = document.createElement('td');
                tdName.className = 'border px-2 py-1';
                tdName.textContent = studentData.nom;
                tr.appendChild(tdName);

                // Notes activitats
                actDocs.forEach(actDoc => {
                  const actId = actDoc.id;
                  const val = (studentData.notes && studentData.notes[actId] !== undefined) ? studentData.notes[actId] : '';

                  const td = document.createElement('td');
                  td.className = 'border px-2 py-1';

                  if (calculatedActs[actId]) {
                    td.style.backgroundColor = "#ffe4e6";
                  }

                  const input = document.createElement('input');
                  input.type = 'number';
                  input.min = 0;
                  input.max = 10;
                  input.value = val;
                  input.dataset.activityId = actId;
                  input.className = 'table-input text-center rounded border p-1';

                  if (calculatedActs[actId]) {
                    input.disabled = true;
                    input.style.backgroundColor = "#fca5a5";
                  } else {
                    input.addEventListener('change', e => saveNote(studentId, actId, e.target.value));
                    input.addEventListener('input', () => applyCellColor(input));
                    applyCellColor(input);
                  }

                  td.appendChild(input);
                  tr.appendChild(td);
                });

                // Mitjana alumne
                const avgTd = document.createElement('td');
                avgTd.className = 'border px-2 py-1 text-right font-semibold';
                avgTd.textContent = computeStudentAverageText(studentData);
                tr.appendChild(avgTd);

                notesTbody.appendChild(tr);
              }
            });

            renderAverages();
          });
      });
  });
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
  // Actualitzar mitjanes alumnes
  Array.from(notesTbody.children).forEach(tr=>{
    const inputs = Array.from(tr.querySelectorAll('input')).map(i=> Number(i.value)).filter(v=> !isNaN(v));
    const lastTd = tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 1];
    lastTd.textContent = inputs.length ? (inputs.reduce((a,b)=>a+b,0)/inputs.length).toFixed(2) : '';
  });

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

    notesTfoot.appendChild(trForm);
  });
}




/* ---------------- Open Calculation Modal ---------------- */
function openCalcModal(activityId){
  currentCalcActivityId = activityId; 
  openModal('modalCalc');
  // Reset modal
  document.getElementById('calcType').value = 'numeric';
  document.getElementById('formulaInputs').classList.add('hidden');
  document.getElementById('numericInput').classList.remove('hidden');
  document.getElementById('numericField').value = '';
  document.getElementById('formulaField').value = '';
}
/* ---------------- Modal Calcul: Numeric / Formula ---------------- */
const calcTypeSelect = document.getElementById('calcType');
const numericDiv = document.getElementById('numericInput');
const numericField = document.getElementById('numericField');
const formulaDiv = document.getElementById('formulaInputs');
const formulaField = document.getElementById('formulaField');
const formulaButtonsDiv = document.getElementById('formulaButtons');
const modalApplyCalcBtn = document.getElementById('modalApplyCalcBtn');

// Canvi tipus càlcul
calcTypeSelect.addEventListener('change', ()=>{
  if(calcTypeSelect.value==='numeric'){
    numericDiv.classList.remove('hidden');
    formulaDiv.classList.add('hidden');
  } else if(calcTypeSelect.value==='formula'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildFormulaButtons(); // activitats + operadors + números
  } else if(calcTypeSelect.value==='rounding'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildRoundingButtons(); // ACTIVITATS + 0,5 i 1
  }
});

// ─────────── Helpers ───────────

// Numeric
async function applyNumeric(val) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => saveNote(sid, currentCalcActivityId, val)));
}

// Formula
async function applyFormula(formula) {
  if (!formula.trim()) throw new Error('Formula buida');
  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid);
    await saveNote(sid, currentCalcActivityId, result);
  }));
}

// Rounding
async function applyRounding(formula) {
  if (!formula.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

  // Llegim totes les activitats
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

// ─────────── Event Listener ───────────

modalApplyCalcBtn.addEventListener('click', async () => {
  if (!currentCalcActivityId) return;

  try {
    let formulaText = ''; // <-- guardarem la fórmula real
    switch (calcTypeSelect.value) {
      case 'numeric':
        await applyNumeric(Number(numericField.value));
        formulaText = numericField.value;
        break;
      case 'formula':
        await applyFormula(formulaField.value);
        formulaText = formulaField.value;
        break;
      case 'rounding':
        await applyRounding(formulaField.value);
        formulaText = formulaField.value;
        break;
      default:
        throw new Error('Tipus de càlcul desconegut');
    }

    // Guardar a Firestore la informació de fórmula a calculatedActivities
    if(currentClassId){
      await db.collection('classes').doc(currentClassId).update({
        [`calculatedActivities.${currentCalcActivityId}`]: {
          calculated: true,
          formula: formulaText
        }
      });
    }

    closeModal('modalCalc');
    renderNotesGrid(); // Re-render per actualitzar cel·les i fila fórmules
  } catch (e) {
    console.error(e);
    alert('Error en aplicar el càlcul: ' + e.message);
  }
});


// ---------------- Construir botons de fórmules ----------------
function buildFormulaButtons(){
  formulaButtonsDiv.innerHTML = '';

  // Botons activitats
  classActivities.forEach(aid=>{
    db.collection('activitats').doc(aid).get().then(doc=>{
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', ()=> addToFormula(name));
      formulaButtonsDiv.appendChild(btn);
    });
  });

  // Botons operadors
  ['+', '-', '*', '/', '(', ')'].forEach(op=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
    btn.textContent = op;
    btn.addEventListener('click', ()=> addToFormula(op));
    formulaButtonsDiv.appendChild(btn);
  });

  // Botons números 0-10
  for(let i=0;i<=10;i++){
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = i;
    btn.addEventListener('click', ()=> addToFormula(i));
    formulaButtonsDiv.appendChild(btn);
  }

  // Botons decimals
  ['.', ','].forEach(dec=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.textContent = dec;
    btn.addEventListener('click', ()=> addToFormula('.')); // sempre converteix ',' a '.'
    formulaButtonsDiv.appendChild(btn);
  });

  // Botó Backspace
  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', ()=> formulaField.value = formulaField.value.slice(0,-1));
  formulaButtonsDiv.appendChild(backBtn);
}

// Afegir a formula
function addToFormula(str){
  formulaField.value += str;
}

function buildRoundingButtons(){
  formulaButtonsDiv.innerHTML = '';

  // Botons activitats
  classActivities.forEach(aid=>{
    db.collection('activitats').doc(aid).get().then(doc=>{
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type='button';
      btn.className='px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', ()=> addToFormula(name)); // el nom de l'activitat
      formulaButtonsDiv.appendChild(btn);
    });
  });

  // Botó Backspace
  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', ()=> formulaField.value = formulaField.value.slice(0,-1));
  formulaButtonsDiv.appendChild(backBtn);

  // Botons 0.5 i 1
  [0.5,1].forEach(v=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = v;
    btn.addEventListener('click', ()=> addToFormula(v)); // afegim directament 0.5 o 1
    formulaButtonsDiv.appendChild(btn);
  });
}


// ---------------- Evaluar fórmula ----------------
async function evalFormulaAsync(formula, studentId){
  let evalStr = formula;

  // Primer carreguem totes les notes de l'alumne
  const studentDoc = await db.collection('alumnes').doc(studentId).get();
  const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

  for(const aid of classActivities){
    const actDoc = await db.collection('activitats').doc(aid).get();
    const actName = actDoc.exists ? actDoc.data().nom : '';
    if(!actName) continue;

    const val = Number(notes[aid]) || 0; // Agafem directament les notes de Firestore

    const regex = new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(regex, val);
  }

  try {
    return Function('"use strict"; return (' + evalStr + ')')();
  } catch(e){
    console.error('Error evaluating formula:', formula, e);
    return 0;
  }
}





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
        db.collection('classes').doc(currentClassId).update({ activitats: classActivities })
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



/* ---------------- Export Excel ---------------- */
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
}


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
