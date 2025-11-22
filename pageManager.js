// pageManager.js
export const pages = {}; // Objecte global per guardar pàgines
export let currentPage = ''; // Pàgina activa

export function initPageManager(alumnesInicials = []) {
  const container = document.getElementById('pagesButtonsContainer');
  if (!container) {
    console.error('No existeix el contenidor pagesButtonsContainer');
    return;
  }

  function renderPage(pageName) {
    const page = pages[pageName];
    if (!page) return;

    currentPage = pageName;

    // Marcar botó actiu
    Array.from(container.children).forEach(btn => {
      btn.classList.remove('bg-blue-500', 'text-white');
      btn.classList.add('bg-gray-200', 'text-black');
    });
    const activeBtn = Array.from(container.children).find(btn => btn.textContent === pageName);
    if (activeBtn) {
      activeBtn.classList.add('bg-blue-500', 'text-white');
      activeBtn.classList.remove('bg-gray-200', 'text-black');
    }

    // Renderitzar alumnes
    const studentsList = document.getElementById('studentsList');
    studentsList.innerHTML = '';
    page.students.forEach(alumne => {
      const li = document.createElement('li');
      li.textContent = alumne;
      studentsList.appendChild(li);
    });

    // Renderitzar activitats
    const notesThead = document.getElementById('notesThead');
    const notesTbody = document.getElementById('notesTbody');
    notesThead.innerHTML = '';
    notesTbody.innerHTML = '';

    // Capçalera activitats
    const trHead = document.createElement('tr');
    page.activities.forEach(act => {
      const th = document.createElement('th');
      th.textContent = act;
      trHead.appendChild(th);
    });
    notesThead.appendChild(trHead);

    // Filres buides per alumnes
    page.students.forEach(() => {
      const tr = document.createElement('tr');
      page.activities.forEach(() => {
        const td = document.createElement('td');
        td.textContent = '';
        tr.appendChild(td);
      });
      notesTbody.appendChild(tr);
    });
  }

  // Botó + per afegir pàgina
  const addButton = document.createElement('button');
  addButton.textContent = '+';
  addButton.className = 'bg-green-500 text-white px-2 py-1 rounded font-bold hover:bg-green-600';
  container.appendChild(addButton);

  addButton.addEventListener('click', () => {
    const pageName = prompt('Nom de la nova pàgina:', `Pàgina ${Object.keys(pages).length + 1}`);
    if (!pageName) return;

    if (pages[pageName]) {
      alert('Ja existeix una pàgina amb aquest nom!');
      return;
    }

    // Crear botó pàgina nova abans del +
    const newPageBtn = document.createElement('button');
    newPageBtn.textContent = pageName;
    newPageBtn.className = 'bg-gray-200 text-black px-2 py-1 rounded hover:bg-gray-300';
    container.insertBefore(newPageBtn, addButton);

    // Guardar pàgina nova: alumnes copiats, activitats buides
    pages[pageName] = {
      students: [...alumnesInicials],
      activities: []
    };

    newPageBtn.addEventListener('click', () => renderPage(pageName));

    // Mostrar la pàgina nova immediatament
    renderPage(pageName);
  });

  // Crear la primera pàgina “Avaluacions”
  const firstPageName = 'Avaluacions';
  const firstBtn = document.createElement('button');
  firstBtn.textContent = firstPageName;
  firstBtn.className = 'bg-gray-200 text-black px-2 py-1 rounded hover:bg-gray-300';
  container.insertBefore(firstBtn, addButton);

  pages[firstPageName] = {
    students: [...alumnesInicials],
    activities: []
  };

  firstBtn.addEventListener('click', () => renderPage(firstPageName));

  // Mostrar la primera pàgina al iniciar
  renderPage(firstPageName);

  // Integració amb "Afegir activitat"
  const addActivityBtn = document.getElementById('btnAddActivity');
  if (addActivityBtn) {
    addActivityBtn.addEventListener('click', () => {
      if (!currentPage) return;
      const actName = prompt('Nom de la nova activitat:');
      if (!actName) return;

      pages[currentPage].activities.push(actName);
      renderPage(currentPage);
    });
  }
}
