// intermediatePage.js
import { openModal } from './modals.js';
import { pageManager } from './pageManager.js';

export const intermediatePage = (() => {

  const containerId = 'intermediateContainer'; // contenedor dinàmic
  let currentClass = null;
  let students = [];

  // Crear pantalla intermèdia
  function render(classData, studentList) {
    currentClass = classData;
    students = studentList;

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'w-full p-6';
      document.getElementById('appRoot').appendChild(container);
    }

    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Classe: ${classData.name}</h2>
        <div class="flex gap-2">
          <button id="btnEvaluation" class="bg-green-500 text-white px-4 py-2 rounded">Avaluació</button>
          <button id="btnNewPage" class="bg-blue-500 text-white px-4 py-2 rounded">+</button>
        </div>
      </div>

      <div class="flex gap-3 mb-4">
        <button id="btnSortAlpha" class="bg-yellow-400 px-3 py-1 rounded">Ordenar A-Z</button>
        <button id="btnExport" class="bg-amber-500 px-3 py-1 rounded text-white">Exportar</button>
        <button id="btnImportAL" class="bg-blue-500 px-3 py-1 rounded text-white">Importar</button>
        <button id="btnAddStudent" class="bg-purple-600 px-3 py-1 rounded text-white">Afegir alumne</button>
      </div>

      <ul id="intermediateStudentList" class="space-y-2 border p-2 rounded bg-gray-50">
      </ul>
    `;

    renderStudentList();
    attachEvents();
  }

  // Renderitzar alumnes
  function renderStudentList() {
    const ul = document.getElementById('intermediateStudentList');
    ul.innerHTML = '';
    students.forEach((s, idx) => {
      const li = document.createElement('li');
      li.textContent = s.name;
      li.className = 'p-2 border-b last:border-b-0';
      ul.appendChild(li);
    });
  }

  // Afegir alumnes nous
  function addStudent(name) {
    students.push({ name });
    renderStudentList();
    pageManager.updateAllPagesWithNewStudent({ name }); // sincronitza a totes les pàgines
  }

  // Events
  function attachEvents() {
    document.getElementById('btnSortAlpha').onclick = () => {
      students.sort((a, b) => a.name.localeCompare(b.name));
      renderStudentList();
    };

    document.getElementById('btnAddStudent').onclick = () => {
      const studentName = prompt('Nom de l’alumne:');
      if (studentName) addStudent(studentName);
    };

    document.getElementById('btnEvaluation').onclick = () => {
      // Aquí cridem app.js o la funció existent que mostra la graella d’activitats
      document.dispatchEvent(new CustomEvent('goToEvaluation', { detail: { classData, students } }));
    };

    document.getElementById('btnNewPage').onclick = () => {
      pageManager.createNewPage(currentClass, students);
    };

    document.getElementById('btnExport').onclick = () => {
      document.dispatchEvent(new CustomEvent('exportStudents', { detail: students }));
    };

    document.getElementById('btnImportAL').onclick = () => {
      openModal('modalImportAL');
    };
  }

  return { render, addStudent };

})();
