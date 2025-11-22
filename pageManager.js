// pageManager.js

export function initPageManager() {
  const container = document.getElementById('pagesButtonsContainer');
  if (!container) return;

  // Crear botó + inicial
  const addButton = document.createElement('button');
  addButton.textContent = '+';
  addButton.className = 'bg-green-500 text-white px-2 py-1 rounded font-bold hover:bg-green-600';
  container.appendChild(addButton);

  // Array per guardar pàgines creades
  const pages = [];

  addButton.addEventListener('click', () => {
    const pageName = prompt('Nom de la nova pàgina:', `Pàgina ${pages.length + 1}`);
    if (!pageName) return;

    // Crear botó per la nova pàgina
    const newPageBtn = document.createElement('button');
    newPageBtn.textContent = pageName;
    newPageBtn.className = 'bg-gray-200 text-black px-2 py-1 rounded hover:bg-gray-300';
    container.insertBefore(newPageBtn, addButton); // inserta abans del +

    // Guardar pàgina al array
    pages.push({ name: pageName, button: newPageBtn });

    // Event click per mostrar la pàgina corresponent
    newPageBtn.addEventListener('click', () => {
      alert(`Mostrant pàgina: ${pageName}`);
      // Aquí posaries el codi per canviar el contingut de la graella segons la pàgina
    });
  });
}
