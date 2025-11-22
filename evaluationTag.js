// evaluationTag.js
import { openEvaluationPage } from './evaluationPage.js';

export function renderEvaluationTags(container, classId) {
    container.innerHTML = '';

    // Carregar les etiquetes d’avaluació des de Firestore
    firebase.firestore().collection('classes').doc(classId).get().then(doc => {
        const evaluations = doc.data().evaluations || [];
        evaluations.forEach(evalId => {
            const tagBtn = document.createElement('button');
            tagBtn.textContent = evalId; // aquí pots posar el nom real
            tagBtn.onclick = () => openEvaluationPage(classId, evalId);
            container.appendChild(tagBtn);
        });

        // Botó + per crear nova etiqueta
        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Avaluació';
        addBtn.onclick = () => addEvaluation(classId);
        container.appendChild(addBtn);
    });
}

function addEvaluation(classId) {
    const name = prompt('Nom de la nova avaluació:');
    if (!name) return;

    // Crear nova avaluació a Firestore
    const newEvalRef = firebase.firestore().collection('evaluations').doc();
    newEvalRef.set({ name, activities: [] }).then(() => {
        // Afegir l'ID a la classe
        const classRef = firebase.firestore().collection('classes').doc(classId);
        classRef.update({
            evaluations: firebase.firestore.FieldValue.arrayUnion(newEvalRef.id)
        }).then(() => {
            renderEvaluationTags(document.getElementById('evaluation-tags'), classId);
        });
    });
}
