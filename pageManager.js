// pageManager.js

// Elements
const container = document.getElementById('pagesButtonsContainer');
const btnAddPage = document.createElement('button');
btnAddPage.textContent = '+';
btnAddPage.className = 'bg-green-500 text-white px-3 py-1 rounded font-bold';
container.prepend(btnAddPage);

// Dades globals
let pages = {}; // Clau: nom pàgina, Valor: {activities: []}
let sharedStudents = []; // alumnes compartits
let currentPage = 'Avaluació'; // pàgina inicial

// Inicialitza pàgina principal
pages['Avaluació'] = { activities: [] };

// RENDER GENERAL
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

  // Mostrar nom de la pàgina
  const classTitle = document.getElementById('classTitle');
  if (classTitle) classTitle.textContent = pageName;

  // Render alumnes a la llista lateral
  const studentsList = document.getElementById('studentsList');
  studentsList.innerHTML = '';
  sharedStudents.forEach(alumne => {
    const li = document.createElement('li');
    li.textContent = alumne;
    studentsList.appendChild(li);
  });

  // Render capçalera i cos de la graella
  const notesThead = document.getElementById('notesThead');
  const notesTbody = document.getElementById('notesTbody');
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';

  const trHead = document.createElement('tr');
  const thEmpty = document.createElement('th');
  thEmpty.textContent = 'Alumnes';
  thEmpty.className = 'border px-2 py-1 bg-gray-100 text-gray-700';
  trHead.appendChild(thEmpty);

  page.activities.forEach(act => {
    const th = document.createElement('th');
    th.textContent = act;
    th.className = 'border px-2 py-1 bg-gray-100 text-gray-700';
    trHead.appendChild(th);
  });
  notesThead.appendChild(trHead);

  sharedStudents.forEach(alumne => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = alumne;
    tdName.className = 'border px-2 py-1 bg-gray-50';
    tr.appendChild(tdName);

    page.activities.forEach(() => {
      const td = document.createElement('td');
      td.textContent = '';
      td.className = 'border px-2 py-1';
      tr.appendChild(td);
    });

    notesTbody.appendChild(tr);
  });
}

// CREAR BOTONS PÀGINES EXISTENTS
function renderPageButtons() {
  // Esborra tots menys el "+"
  Array.from(container.children).forEach(btn => {
    if (btn !== btnAddPage) btn.remove();
  });

  Object.keys(pages).forEach(pageName => {
    const btn = document.createElement('button');
    btn.textContent = pageName;
    btn.className = 'bg-gray-200 text-black px-3 py-1 rounded';
    btn.addEventListener('click', () => renderPage(pageName));
    container.appendChild(btn);
  });

  renderPage(currentPage);
}

// AFEGIR PÀGINA NOVA
btnAddPage.addEventListener('click', () => {
  const newPageName = prompt('Nom de la nova pàgina:');
  if (!newPageName || pages[newPageName]) return;

  // Clonar només alumnes, activitats buides
  pages[newPageName] = { activities: [] };
  renderPageButtons();
});

// AFEGIR ALUMNE (compartit a totes les pàgines)
const btnAddStudent = document.getElementById('btnAddStudent');
btnAddStudent.addEventListener('click', () => {
  const nom = prompt('Nom de l’alumne:');
  if (!nom) return;

  sharedStudents.push(nom);
  // Re-render totes les pàgines (per mantenir l’alumne visible a totes)
  renderPage(currentPage);
});

// AFEGIR ACTIVITAT (només a la pàgina actual)
const btnAddActivity = document.getElementById('btnAddActivity');
btnAddActivity.addEventListener('click', () => {
  const nomAct = prompt('Nom de la nova activitat:');
  if (!nomAct) return;

  pages[currentPage].activities.push(nomAct);
  renderPage(currentPage);
});

// Inicialització inicial
renderPageButtons();
