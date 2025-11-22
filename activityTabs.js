// activityTabs.js
import { openClassTab, loadClassData } from './classData.js';

export let currentTabId = null; // pestanya actual
export let tabs = []; // llista de pestanyes per la classe

// Inicialitzar pestanyes (carregar del Firestore o crear la primera)
export async function initTabs(classId) {
    const classRef = firebase.firestore().collection('classes').doc(classId);
    const doc = await classRef.get();
    if (!doc.exists) return;

    tabs = doc.data().activityTabs || [];

    if(tabs.length === 0) {
        // Crear una pestanya per defecte
        const defaultTab = { id: crypto.randomUUID(), nom: 'General', activitats: [] };
        tabs.push(defaultTab);
        await classRef.update({ activityTabs: tabs });
    }

    // Mostrar pestanyes a la UI
    renderTabs(classId);
}

// Render pestanyes a la UI
export function renderTabs(classId) {
    const container = document.getElementById('tabsContainer');
    container.innerHTML = '';

    tabs.forEach((tab, idx) => {
        const btn = document.createElement('button');
        btn.textContent = tab.nom;
        btn.className = 'tab-btn px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
        if(currentTabId === tab.id || (currentTabId===null && idx===0)) currentTabId = tab.id;
        if(currentTabId === tab.id) btn.classList.add('bg-indigo-400', 'text-white');

        btn.addEventListener('click', async () => {
            currentTabId = tab.id;
            await openClassTab(classId, currentTabId); // carregar activitats de la pestanya
            renderTabs(classId);
        });
        container.appendChild(btn);
    });

    // Botó "+" per nova pestanya
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.className = 'tab-add-btn px-2 py-1 m-1 bg-green-300 rounded hover:bg-green-400';
    addBtn.addEventListener('click', async () => {
        const name = prompt('Nom nova pestanya:','Nova pestanya');
        if(!name) return;
        const newTab = { id: crypto.randomUUID(), nom: name, activitats: [] };
        tabs.push(newTab);
        await firebase.firestore().collection('classes').doc(classId).update({ activityTabs: tabs });
        currentTabId = newTab.id;
        renderTabs(classId);
        await openClassTab(classId, currentTabId);
    });
    container.insertBefore(addBtn, container.firstChild);
}
