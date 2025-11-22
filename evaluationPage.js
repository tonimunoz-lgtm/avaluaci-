// evaluationPage.js
let currentClassId = null;
let currentEvalId = null;
let students = [];
let evaluation = {};

export function openEvaluationPage(classId, evalId) {
    currentClassId = classId;
    currentEvalId = evalId;

    // Carregar alumnes i avaluació
    Promise.all([
        firebase.firestore().collection('classes').doc(classId).get(),
        firebase.firestore().collection('evaluations').doc(evalId).get()
    ]).then(([classDoc, evalDoc]) => {
        students = classDoc.data().alumnes || [];
        evaluation = evalDoc.data() || { name: 'Nova avaluació', activities: [] };
        renderPage();
    });
}

function renderPage() {
    const container = document.getElementById('app');
    container.innerHTML = '';

    // === Títol ===
    const title = document.createElement('h2');
    title.textContent = evaluation.name;
    container.appendChild(title);

    // === Botons ===
    const buttons = document.createElement('div');
    buttons.innerHTML = `
        <button id="add-activity">+ Activitat</button>
        <button id="delete-activity">Eliminar activitat</button>
        <button id="save-changes">Guardar</button>
    `;
    container.appendChild(buttons);

    document.getElementById('add-activity').onclick = addActivity;
    document.getElementById('delete-activity').onclick = toggleDeleteActivityMode;
    document.getElementById('save-changes').onclick = saveEvaluation;

    // === Graella alumnes x activitats ===
    const table = document.createElement('table');
    table.id = 'evaluation-table';

    // Capçalera
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.innerHTML = `<th>Alumne</th>` + evaluation.activities.map(act => `<th>${act.name}</th>`).join('');
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Cos de la taula
    const tbody = document.createElement('tbody');
    students.forEach((student, sIndex) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${student.name}</td>` + evaluation.activities.map((act, aIndex) => {
            const value = act.scores?.[sIndex] ?? '';
            return `<td contenteditable="true" data-activity="${aIndex}" data-student="${sIndex}">${value}</td>`;
        }).join('');
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.appendChild(table);
}

// === Funcions dels botons ===
function addActivity() {
    const name = prompt('Nom de la nova activitat:');
    if (!name) return;

    evaluation.activities.push({ name, scores: Array(students.length).fill('') });
    renderPage();
}

let deleteMode = false;
function toggleDeleteActivityMode() {
    deleteMode = !deleteMode;
    if (deleteMode) {
        const activityNames = evaluation.activities.map((a, i) => `${i}: ${a.name}`).join('\n');
        const index = prompt(`Quina activitat vols eliminar?\n${activityNames}`);
        if (index !== null && evaluation.activities[index]) {
            evaluation.activities.splice(index, 1);
            renderPage();
        }
    }
}

function saveEvaluation() {
    // Agafar notes de la taula
    const table = document.getElementById('evaluation-table');
    table.querySelectorAll('td[contenteditable]').forEach(td => {
        const sIndex = td.dataset.student;
        const aIndex = td.dataset.activity;
        evaluation.activities[aIndex].scores[sIndex] = td.textContent;
    });

    // Guardar a Firestore
    firebase.firestore().collection('evaluations').doc(currentEvalId).set(evaluation)
        .then(() => alert('Canvis guardats!'))
        .catch(err => console.error(err));
}
