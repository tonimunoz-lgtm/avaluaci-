// app.js - lògica principal (modules)

// importar helpers de modals
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
let deleteMode = false; // mode eliminar classes

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

/* modal buttons */
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
            // show app
            setupAfterAuth(u.user);
        })
        .catch(e => alert('Error login: ' + e.message));
});

btnRegister.addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;
    if (!email || !pw) return alert('Introdueix email i contrasenya');

    auth.createUserWithEmailAndPassword(email, pw)
        .then(u => {
            professorUID = u.user.uid;
            // create professor doc
            db.collection('professors').doc(professorUID).set({ email, classes: [] })
                .then(() => {
                    setupAfterAuth(u.user);
                });
        })
        .catch(e => alert('Error registre: ' + e.message));
});

btnRecover.addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) return alert('Introdueix el teu email per recuperar la contrasenya');

    auth.sendPasswordResetEmail(email)
        .then(() => alert('Email de recuperació enviat!'))
        .catch(e => alert('Error: ' + e.message));
});

btnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
        professorUID = null;
        currentClassId = null;
        showLogin();
    });
});

/* On load auth state */
auth.onAuthStateChanged(user => {
    if (user) {
        professorUID = user.uid;
        setupAfterAuth(user);
    } else {
        professorUID = null;
        showLogin();
    }
});

/* ---------- After login setup ---------- */
function setupAfterAuth(user) {
    // show initial app area
    showApp();

    // show email username (upto @)
    const email = user.email || '';
    usuariNom.textContent = email.split('@')[0] || email;

    // load classes
    loadClassesScreen();
}

/* ---------- CLASSES SCREEN ---------- */
function loadClassesScreen() {
    screenClasses.classList.remove('hidden');
    screenClass.classList.add('hidden');

    if (!professorUID) return;

    classesGrid.innerHTML = '<p class="text-gray-300">Carregant classes...</p>';

    db.collection('professors').doc(professorUID).get()
        .then(doc => {
            if (!doc.exists) return;

            const data = doc.data();
            const classes = data.classes || [];

            if (classes.length === 0) {
                classesGrid.innerHTML = `
                    <p class="text-gray-200 text-center mt-4">
                        No tens cap classe creada.
                    </p>
                `;
                return;
            }

            classesGrid.innerHTML = '';

            classes.forEach((cls, index) => {
                const div = document.createElement('div');
                div.className =
                    "class-card bg-gradient-to-br p-4 rounded-xl shadow-md text-white relative cursor-pointer " +
                    classColors[index % classColors.length];

                const key = cls.classId;

                div.innerHTML = `
                    <h3>${cls.name}</h3>
                    <p>${cls.description || ''}</p>
                    <span class="click-hint text-sm opacity-80 mt-1">Fes clic per obrir</span>
                `;

                div.addEventListener('click', () => {
                    if (deleteMode) {
                        confirmAction(
                            'Eliminar classe',
                            `Segur que vols eliminar la classe <b>${cls.name}</b>?`
                        ).then(ok => {
                            if (ok) deleteClass(key);
                        });
                    } else {
                        loadClass(key);
                    }
                });

                classesGrid.appendChild(div);
            });
        });
}

/* ---------- Create class modal ---------- */
btnCreateClass.addEventListener('click', () => openModal('modalCreateClass'));

modalCreateClassBtn.addEventListener('click', () => {
    const name = document.getElementById('newClassName').value.trim();
    const desc = document.getElementById('newClassDesc').value.trim();

    if (!name) return alert('Introdueix un nom de classe');

    const newId = db.collection('professors').doc().id;

    const newClass = {
        classId: newId,
        name,
        description: desc
    };

    db.collection('professors').doc(professorUID).update({
        classes: firebase.firestore.FieldValue.arrayUnion(newClass)
    }).then(() => {
        closeModal('modalCreateClass');
        loadClassesScreen();
    });
});

/* ---------- Delete class ---------- */
function deleteClass(classId) {
    db.collection('professors').doc(professorUID).get()
        .then(doc => {
            if (!doc.exists) return;

            const data = doc.data();
            const classes = data.classes || [];

            const filtered = classes.filter(c => c.classId !== classId);

            db.collection('professors').doc(professorUID)
                .update({ classes: filtered })
                .then(() => loadClassesScreen());
        });
}

/* ---------- Load a class ---------- */
function loadClass(classId) {
    currentClassId = classId;

    screenClasses.classList.add('hidden');
    screenClass.classList.remove('hidden');

    // load professor classes to find this one
    db.collection('professors').doc(professorUID).get()
        .then(doc => {
            const data = doc.data();
            const clist = data.classes || [];
            const found = clist.find(c => c.classId === classId);
            if (found) {
                document.getElementById('classTitle').textContent = found.name;
            }
        });

    loadStudents();
    loadActivities();
}

/* ---------- Back button ---------- */
btnBack.addEventListener('click', () => {
    currentClassId = null;
    loadClassesScreen();
});

/* ---------- STUDENTS ---------- */
function loadStudents() {
    if (!currentClassId) return;

    studentsList.innerHTML = '<p class="text-gray-300">Carregant alumnes...</p>';
    classStudents = [];

    db.collection('classes')
        .doc(currentClassId)
        .collection('students')
        .orderBy('name')
        .get()
        .then(snap => {
            studentsList.innerHTML = '';
            snap.forEach(doc => {
                const s = { id: doc.id, ...doc.data() };
                classStudents.push(s);

                const div = document.createElement('div');
                div.className =
                    "p-2 bg-gray-700 rounded-lg text-white flex justify-between items-center";

                div.innerHTML = `
                    <span>${s.name}</span>
                    <button class="text-red-300 hover:text-red-500" data-id="${s.id}">
                        Eliminar
                    </button>
                `;

                div.querySelector('button').addEventListener('click', () => {
                    confirmAction(
                        'Eliminar alumne',
                        `Segur que vols eliminar <b>${s.name}</b>?`
                    ).then(ok => {
                        if (ok) deleteStudent(s.id);
                    });
                });

                studentsList.appendChild(div);
            });

            studentsCount.textContent = classStudents.length;
        });
}

/* Add student modal */
btnAddStudent.addEventListener('click', () => openModal('modalAddStudent'));

modalAddStudentBtn.addEventListener('click', () => {
    const name = document.getElementById('newStudentName').value.trim();
    if (!name) return alert('Introdueix un nom');

    const id = db.collection('classes').doc().id;

    db.collection('classes')
        .doc(currentClassId)
        .collection('students')
        .doc(id)
        .set({ name })
        .then(() => {
            closeModal('modalAddStudent');
            loadStudents();
            loadNotesTable();
        });
});

/* Delete student */
function deleteStudent(sid) {
    db.collection('classes')
        .doc(currentClassId)
        .collection('students')
        .doc(sid)
        .delete()
        .then(() => {
            loadStudents();
            loadNotesTable();
        });
}

/* ---------- ACTIVITIES ---------- */
function loadActivities() {
    if (!currentClassId) return;

    classActivities = [];

    db.collection('classes')
        .doc(currentClassId)
        .collection('activities')
        .orderBy('date')
        .get()
        .then(snap => {
            classActivities = [];
            snap.forEach(doc => {
                classActivities.push({ id: doc.id, ...doc.data() });
            });
            loadNotesTable();
        });
}

/* Add activity modal */
btnAddActivity.addEventListener('click', () => openModal('modalAddActivity'));

modalAddActivityBtn.addEventListener('click', () => {
    const name = document.getElementById('newActivityName').value.trim();
    const date = document.getElementById('newActivityDate').value;
    const weight = parseFloat(document.getElementById('newActivityWeight').value) || 1;

    if (!name) return alert('Nom d\'activitat necessari');
    if (!date) return alert('Data necessària');

    const id = db.collection('classes').doc().id;

    db.collection('classes')
        .doc(currentClassId)
        .collection('activities')
        .doc(id)
        .set({ name, date, weight })
        .then(() => {
            closeModal('modalAddActivity');
            loadActivities();
        });
});

/* Delete activity */
function deleteActivity(aid) {
    db.collection('classes')
        .doc(currentClassId)
        .collection('activities')
        .doc(aid)
        .delete()
        .then(() => loadActivities());
}

/* ---------- NOTES TABLE ---------- */
function loadNotesTable() {
    notesThead.innerHTML = '';
    notesTbody.innerHTML = '';
    notesTfoot.innerHTML = '';

    if (classActivities.length === 0 || classStudents.length === 0) {
        notesThead.innerHTML = '<tr><th>Nom</th></tr>';
        return;
    }

    // THEAD
    let theadHTML = `<tr><th>Nom</th>`;
    classActivities.forEach(act => {
        theadHTML += `
            <th class="text-center">
                ${act.name}<br>
                <span class="text-xs opacity-70">${act.date}</span><br>
                <button class="text-red-300 hover:text-red-500 delete-activity" data-id="${act.id}">
                    Eliminar
                </button>
            </th>
        `;
    });
    theadHTML += `<th>Mitjana</th></tr>`;
    notesThead.innerHTML = theadHTML;

    document.querySelectorAll('.delete-activity').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            confirmAction('Eliminar activitat', 'Segur?').then(ok => {
                if (ok) deleteActivity(id);
            });
        });
    });

    // TBODY
    classStudents.forEach(st => {
        let row = `<tr><td>${st.name}</td>`;

        classActivities.forEach(act => {
            row += `
                <td>
                    <input 
                        class="table-input w-16 text-black p-1 rounded" 
                        data-student="${st.id}" 
                        data-activity="${act.id}" 
                        type="number" step="0.1" min="0" max="10"
                    >
                </td>
            `;
        });

        row += `<td class="avg text-center font-bold text-lg"></td></tr>`;
        notesTbody.innerHTML += row;
    });

    // Load saved notes
    db.collection('classes')
        .doc(currentClassId)
        .collection('notes')
        .get()
        .then(snap => {
            snap.forEach(doc => {
                const { studentId, activityId, value } = doc.data();
                const input = document.querySelector(
                    `input[data-student="${studentId}"][data-activity="${activityId}"]`
                );
                if (input) input.value = value;
            });

            updateAllAverages();
        });

    // Save on change
    document.querySelectorAll('.table-input').forEach(inp => {
        inp.addEventListener('input', () => {
            const studentId = inp.dataset.student;
            const activityId = inp.dataset.activity;
            let value = parseFloat(inp.value);
            if (isNaN(value)) value = null;

            db.collection('classes')
                .doc(currentClassId)
                .collection('notes')
                .doc(`${studentId}_${activityId}`)
                .set({ studentId, activityId, value })
                .then(updateAllAverages);
        });
    });
}

/* ---------- AVERAGES ---------- */
function updateAllAverages() {
    const rows = notesTbody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        let sum = 0;
        let totalWeight = 0;

        inputs.forEach(inp => {
            const actId = inp.dataset.activity;
            const act = classActivities.find(a => a.id === actId);
            if (!act) return;

            const val = parseFloat(inp.value);
            if (!isNaN(val)) {
                sum += val * (act.weight || 1);
                totalWeight += (act.weight || 1);
            }
        });

        const avgCell = row.querySelector('.avg');
        if (totalWeight === 0) avgCell.textContent = '-';
        else {
            const avg = (sum / totalWeight).toFixed(2);
            avgCell.textContent = avg;

            if (avg < 5) avgCell.className = 'avg bg-red-100 text-black';
            else if (avg < 7) avgCell.className = 'avg bg-yellow-100 text-black';
            else avgCell.className = 'avg bg-green-100 text-black';
        }
    });
}

/* ---------- SORT STUDENTS ---------- */
btnSortAlpha.addEventListener('click', () => {
    classStudents.sort((a, b) => a.name.localeCompare(b.name));
    loadNotesTable();
    loadStudents();
});

/* ---------- EXPORT EXCEL ---------- */
btnExport.addEventListener('click', () => {
    const rows = [];

    // Header
    const header = ['Nom'];
    classActivities.forEach(a => header.push(a.name));
    header.push('Mitjana');
    rows.push(header);

    // Rows
    const trs = notesTbody.querySelectorAll('tr');
    trs.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        const row = [];

        row.push(cells[0].textContent.trim());

        const inputs = tr.querySelectorAll('input');
        inputs.forEach(inp => row.push(inp.value || ''));

        const avg = tr.querySelector('.avg').textContent;
        row.push(avg);

        rows.push(row);
    });

    // Excel
    let csv = "";
    rows.forEach(r => {
        csv += r.map(v => `"${v}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = "notes.csv";
    a.click();

    URL.revokeObjectURL(url);
});
