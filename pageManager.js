// pageManager.js
export default class PageManager {
  constructor() {
    this.pages = {}; // Objecte amb totes les pàgines
    this.currentPage = null; // Pàgina actual
    this.pagesButtonsContainer = document.getElementById('pagesButtonsContainer');

    this.init();
  }

  init() {
    // Crear la pàgina principal Avaluació
    this.createPage('Avaluació', true);

    // Botó "+" per crear noves pàgines
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.className = 'bg-green-500 text-white px-3 py-1 rounded';
    addBtn.addEventListener('click', () => {
      const name = prompt('Nom de la nova pàgina:');
      if(name) this.createPage(name);
    });
    this.pagesButtonsContainer.prepend(addBtn);
  }

  createPage(name, isMain = false) {
    // Clonar alumnes si no és la principal
    const students = isMain ? [] : [...this.pages['Avaluació'].students];

    // Inicialitzar activitats buides
    const activities = [];

    this.pages[name] = {
      name,
      students,
      activities
    };

    // Crear botó pàgina
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.className = 'bg-gray-200 px-3 py-1 rounded hover:bg-gray-300';
    btn.addEventListener('click', () => this.switchPage(name));
    this.pagesButtonsContainer.appendChild(btn);

    // Si és la primera, establir com a actual
    if(isMain || !this.currentPage) {
      this.switchPage(name);
    }
  }

  switchPage(name) {
    this.currentPage = name;
    this.renderPage();
  }

  renderPage() {
    const page = this.pages[this.currentPage];
    const notesTbody = document.getElementById('notesTbody');
    notesTbody.innerHTML = '';

    // Crear fila per cada alumne
    page.students.forEach(student => {
      const tr = document.createElement('tr');
      tr.className = student.colorClass || '';
      tr.innerHTML = `<td>${student.name}</td>`; 
      page.activities.forEach(act => {
        const td = document.createElement('td');
        td.textContent = act.values?.[student.name] ?? '';
        tr.appendChild(td);
      });
      notesTbody.appendChild(tr);
    });
  }

  addStudent(name) {
    // Afegir a totes les pàgines
    Object.values(this.pages).forEach(page => {
      page.students.push({ name, colorClass: '' });
    });
    this.renderPage();
  }

  addActivity(name) {
    // Només a la pàgina actual
    const page = this.pages[this.currentPage];
    const act = { name, values: {} };
    page.activities.push(act);
    this.renderPage();
  }

  getCurrentPage() {
    return this.currentPage;
  }
}
