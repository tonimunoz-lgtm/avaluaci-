// activityTabs.js
import { openClassTab } from './classData.js';

export let currentTabId = null; // pestanya actual
export let tabs = []; // llista de pestanyes per la classe

/**
 * Inicialitza les pestanyes d'una classe.
 * @param {string} classId 
 */
export async function initTabs(classId) {
  try {
    const container = document.getElementById('tabsContainer');
    if (!container) {
      console.warn('initTabs: tabsContainer no existeix al DOM encara.');
      return;
    }

    // Comprova que firebase està inicialitzat
    if (!firebase || !firebase.firestore) {
      console.warn('Firebase no està inicialitzat.');
      return;
    }

    const classRef = firebase.firestore().collection('classes').doc(classId);
    const doc = await classRef.get();
    if (!doc.exists) {
      console.warn(`Classe ${classId} no existeix.`);
      return;
    }

    tabs = doc.data().activityTabs || [];

    if (tabs.length === 0) {
      const defaultTab = { id: crypto.randomUUID(), nom: 'General', activitats: [] };
      tabs.push(defaultTab);
      await classRef.update({ activityTabs: tabs });
    }

    renderTabs(classId);
  } catch (e) {
    console.error('Error inicialitzant pestanyes:', e);
  }
}

/**
 * Renderitza les pestanyes a la UI
 * @param {string} classId 
 */
export function renderTabs(classId) {
  try {
    const container = document.getElementById('tabsContainer');
    if (!container) return;

    container.innerHTML = '';

    tabs.forEach((tab, idx) => {
      const btn = document.createElement('button');
      btn.textContent = tab.nom;
      btn.className = 'tab-btn px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';

      if (currentTabId === tab.id || (currentTabId === null && idx === 0)) currentTabId = tab.id;
      if (currentTabId === tab.id) btn.classList.add('bg-indigo-400', 'text-white');

      btn.addEventListener('click', async () => {
        currentTabId = tab.id;
        try {
          await openClassTab(classId, currentTabId);
        } catch (err) {
          console.error('Error obrint pestanya:', err);
        }
        renderTabs(classId);
      });

      container.appendChild(btn);
    });

    // Botó "+" per nova pestanya
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.className = 'tab-add-btn px-2 py-1 m-1 bg-green-300 rounded hover:bg-green-400';
    addBtn.addEventListener('click', async () => {
      const name = prompt('Nom nova pestanya:', 'Nova pestanya');
      if (!name) return;
      const newTab = { id: crypto.randomUUID(), nom: name, activitats: [] };
      tabs.push(newTab);
      try {
        await firebase.firestore().collection('classes').doc(classId).update({ activityTabs: tabs });
        currentTabId = newTab.id;
        renderTabs(classId);
        await openClassTab(classId, currentTabId);
      } catch (err) {
        console.error('Error creant nova pestanya:', err);
      }
    });

    container.insertBefore(addBtn, container.firstChild);
  } catch (e) {
    console.error('Error renderitzant pestanyes:', e);
  }
}
