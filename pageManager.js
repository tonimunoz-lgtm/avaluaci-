// pageManager.js
export const pageManager = (() => {

  // Estructura de dades
  const classesPages = {}; // { classId: [ {name: 'Avaluació', activities: [], students: []}, ... ] }

  // Crear pàgina nova dins d’una classe
  function createNewPage(classData, students) {
    const classId = classData.id;
    if (!classesPages[classId]) classesPages[classId] = [];

    const pageName = prompt('Nom de la nova pàgina:');
    if (!pageName) return;

    const newPage = {
      name: pageName,
      activities: [],
      students: [...students] // copia inicial
    };

    classesPages[classId].push(newPage);

    alert(`Pàgina "${pageName}" creada!`);
    renderPage(classId, newPage);
  }

  // Renderitzar pàgina concreta
  function renderPage(classId, page) {
    const wrapperId = 'pageWrapper';
    let wrapper = document.getElementById(wrapperId);

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = wrapperId;
      wrapper.className = 'w-full p-4';
      document.getElementById('appRoot').appendChild(wrapper);
    }

    wrapper.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">${page.name} - Classe: ${classId}</h2>
        <button id="btnBackToIntermediate" class="bg-gray-300 px-3 py-1 rounded">⬅ Tornar</button>
      </div>

      <div class="flex gap-2 mb-3">
        <button id="btnAddStudentPage" class="bg-purple-600 px-3 py-1 text-white rounded">Afegir alumne</button>
      </div>

      <div id="activitiesGrid" class="grid grid-cols-1 gap-2 border p-2 rounded bg-gray-50">
        <!-- Activitats apareixeran aquí -->
      </div>
    `;

    attachPageEvents(classId, page);
    renderActivities(page);
  }

  // Afegir activitats
  function renderActivities(page) {
    const grid = document.getElementById('activitiesGrid');
    grid.innerHTML = '';
    page.activities.forEach(act => {
      const div = document.createElement('div');
      div.textContent = act.name;
      div.className = 'p-2 border rounded bg-white';
      grid.appendChild(div);
    });
  }

  // Afegir alumnes nous a totes les pàgines d’una classe
  function updateAllPagesWithNewStudent(student) {
    Object.values(classesPages).forEach(pages => {
      pages.forEach(page => {
        page.students.push(student);
      });
    });
  }

  // Events
  function attachPageEvents(classId, page) {
    document.getElementById('btnBackToIntermediate').onclick = () => {
      document.dispatchEvent(new CustomEvent('backToIntermediate', { detail: { classId } }));
    };

    document.getElementById('btnAddStudentPage').onclick = () => {
      const studentName = prompt('Nom de l’alumne:');
      if (studentName) {
        const newStudent = { name: studentName };
        page.students.push(newStudent);
        updateAllPagesWithNewStudent(newStudent);
        renderPage(classId, page);
      }
    };
  }

  return {
    createNewPage,
    renderPage,
    updateAllPagesWithNewStudent,
    classesPages
  };

})();
