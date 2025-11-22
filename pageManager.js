// pageManager.js

export function initPageManager(containerSelector, buttonsContainerSelector) {
  const container = document.querySelector(containerSelector);
  const buttonsContainer = document.querySelector(buttonsContainerSelector);

  if (!container || !buttonsContainer) return;

  // Llista de pàgines (per defecte, només la principal)
  let pages = [
    { id: 'avaluacions', name: 'Avaluacions', gridData: [] } // primera pàgina principal
  ];
  let currentPageId = 'avaluacions';

  // Funció per renderitzar botons de pàgines
  function renderPageButtons() {
    buttonsContainer.innerHTML = '';

    // Botó "+"
    const addBtn = document.createElement('button');
    addBtn.textContent = '+';
    addBtn.title = 'Afegir nova pàgina';
    addBtn.classList.add('page-add-btn');
    addBtn.addEventListener('click', () => {
      const pageName = prompt('Nom de la nova pàgina:');
      if (!pageName) return;

      const id = pageName.toLowerCase().replace(/\s+/g, '-');
      pages.push({ id, name: pageName, gridData: [] });
      currentPageId = id;
      renderPageButtons();
      renderGrid();
    });
    buttonsContainer.appendChild(addBtn);

    // Botons per a cada pàgina
    pages.forEach((page) => {
      const btn = document.createElement('button');
      btn.textContent = page.name;
      btn.classList.toggle('active', page.id === currentPageId);
      btn.addEventListener('click', () => {
        currentPageId = page.id;
        renderPageButtons();
        renderGrid();
      });
      buttonsContainer.appendChild(btn);
    });
  }

  // Funció per renderitzar la graella de la pàgina actual
  function renderGrid() {
    container.innerHTML = ''; // neteja
    const page = pages.find(p => p.id === currentPageId);
    if (!page) return;

    const h2 = document.createElement('h2');
    h2.textContent = page.name;
    container.appendChild(h2);

    const grid = document.createElement('div');
    grid.classList.add('grid-placeholder');
    grid.textContent = `Aquí aniria la graella de ${page.name}`;
    container.appendChild(grid);
  }

  // Inicialització
  renderPageButtons();
  renderGrid();
}
