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
const btnRefreshClasses = document.getElementById('btnRefreshClasses');


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


});

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
          <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮
          </button>
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
          <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮
          </button>
          <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10 transition-opacity duration-200 opacity-0">
            <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
            <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
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
