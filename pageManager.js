// pageManager.js
export const pages = {}; // Objecte de pàgines
export let currentPage = ''; // Pàgina activa
export const sharedStudents = []; // Alumnes compartits

export function initPageManager() {
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

    // Renderitzar alumnes (compartits)
    const studentsList = document.getElementById('studentsList');
    studentsList.innerHTML = '';
    sharedStudents.forEach(alumne => {
      const li = document.createElement('li');
      li.textContent = alumne;
      studentsList.appendChild(li);
    });

    // Renderitzar activitats (propietat de la pàgina)
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
    sharedStudents.forEach(() => {
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

    // Crear pàgina nova clonant només els alumnes compartits
    pages[pageName] = {
      activities: [] // Activitats noves i independents
    };

    newPageBtn.addEventListener('click', () => renderPage(pageName));
    renderPage(pageName);
  });

  // Crear primera pàgina Avaluacions
  const firstPageName = 'Avaluacions';
  const firstBtn = document.createElement('button');
  firstBtn.textContent = firstPageName;
  firstBtn.className = 'bg-gray-200 text-black px-2 py-1 rounded hover:bg-gray-300';
  container.insertBefore(firstBtn, addButton);

  pages[firstPageName] = {
    activities: [] // Inicialment buides
  };

  firstBtn.addEventListener('click', () => renderPage(firstPageName));

  // Mostrar primera pàgina
  renderPage(firstPageName);

  // Integració botó “Afegir activitat” → només afegeix a la pàgina activa
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

  // Integració botó “Afegir alumne” → afegeix a totes les pàgines
  const addStudentBtn = document.getElementById('btnAddStudent');
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
      const studentName = prompt('Nom de l’alumne:');
      if (!studentName) return;

      sharedStudents.push(studentName);
      // Renderitzar la pàgina activa per actualitzar graella
      renderPage(currentPage);
    });
  }
}
