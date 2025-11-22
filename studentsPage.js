// studentsPage.js
import { renderEvaluationTags } from './evaluationTag.js';
import { openEvaluationPage } from './evaluationPage.js';

// Variables globals de la pàgina
let currentClassId = null;
let students = [];

// Funció principal per obrir la pàgina d’alumnes
export function openStudentsPage(classId) {
    currentClassId = classId;
    loadStudents();
}

// Carregar alumnes des de Firestore
async function loadStudents() {
    // Exemple Firestore
    const classDoc = await firebase.firestore().collection('classes').doc(currentClassId).get();
    students = classDoc.data().alumnes || [];

    renderPage();
}

// Renderitzar la pàgina
function renderPage() {
    const container = document.getElementById('app');
    container.innerHTML = '';

    // === Etiquetes d'avaluació ===
    const tagContainer = document.createElement('div');
    tagContainer.id = 'evaluation-tags';
    container.appendChild(tagContainer);
    renderEvaluationTags(tagContainer, currentClassId);

    // === Botons ===
    const buttons = document.createElement('div');
    buttons.innerHTML = `
        <button id="add-student">+</button>
        <button id="sort-students">Ordenar</button>
        <button id="export-students">Exportar</button>
        <button id="delete-student">Eliminar</button>
    `;
    container.appendChild(buttons);

    document.getElementById('add-student').onclick = addStudent;
    document.getElementById('sort-students').onclick = sortStudents;
    document.getElementById('export-students').onclick = exportStudents;
    document.getElementById('delete-student').onclick = toggleDeleteMode;

    // === Llista d’alumnes ===
    const list = document.createElement('ul');
    list.id = 'student-list';
    students.forEach((s, index) => {
        const li = document.createElement('li');
        li.textContent = s.name;
        li.dataset.index = index;
        list.appendChild(li);
    });
    container.appendChild(list);
}

// === Funcions dels botons ===
function addStudent() {
    const name = prompt('Nom del nou alumne:');
    if (!name) return;

    // Afegir a Firestore i a totes les etiquetes
    students.push({ name });
    firebase.firestore().collection('classes').doc(currentClassId).update({
        alumnes: students
    });

    renderPage();
}

function sortStudents() {
    students.sort((a, b) => a.name.localeCompare(b.name));
    renderPage();
}

function exportStudents() {
    // Aquí pots cridar la funció d’exportació a Excel
    alert('Exportar alumnes a Excel (funció pendent)');
}

let deleteMode = false;
function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const list = document.getElementById('student-list');
    if (deleteMode) {
        list.querySelectorAll('li').forEach(li => {
            li.style.cursor = 'pointer';
            li.onclick = () => {
                const index = li.dataset.index;
                if (confirm(`Eliminar ${students[index].name}?`)) {
                    students.splice(index, 1);
                    firebase.firestore().collection('classes').doc(currentClassId).update({
                        alumnes: students
                    });
                    renderPage();
                }
            };
        });
    } else {
        renderPage();
    }
}
