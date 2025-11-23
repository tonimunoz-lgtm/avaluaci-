// classStructure.js

// Array global per emmagatzemar temporalment l'estructura copiada
let copiedStructure = [];

/**
 * Copiar l'estructura d'activitats d'una classe
 * @param {HTMLElement} classContainer - el contenidor de la classe actual
 */
export function copyStructure(classContainer) {
    copiedStructure = [];
    const activities = classContainer.querySelectorAll('.activitat'); // assumeixo que cada activitat té classe 'activitat'
    activities.forEach(act => {
        copiedStructure.push(act.textContent.trim());
    });
    alert('Estructura copiada!');
}

/**
 * Enganxar l'estructura d'activitats a una altra classe
 * @param {HTMLElement} classContainer - el contenidor de la classe on enganxar
 */
export function pasteStructure(classContainer) {
    if (copiedStructure.length === 0) {
        alert('No hi ha estructura copiada.');
        return;
    }

    copiedStructure.forEach(name => {
        const newActivity = document.createElement('div');
        newActivity.classList.add('activitat');
        newActivity.textContent = name;
        classContainer.appendChild(newActivity);
    });

    alert('Estructura enganxada!');
}

/**
 * Crear el botó "Estructura" amb el desplegable
 * @param {HTMLElement} parentContainer - on inserir el botó (al costat del "+activitat")
 * @param {HTMLElement} classContainer - contenidor de la classe actual
 */
export function createStructureButton(parentContainer, classContainer) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('structure-wrapper');
    wrapper.style.display = 'inline-block';
    wrapper.style.marginLeft = '10px';

    const button = document.createElement('button');
    button.textContent = 'Estructura';
    button.classList.add('structure-btn');
    button.style.position = 'relative';

    const dropdown = document.createElement('div');
    dropdown.classList.add('structure-dropdown');
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.backgroundColor = '#fff';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.padding = '5px';
    dropdown.style.zIndex = '1000';

    const copyOption = document.createElement('div');
    copyOption.textContent = 'Copiar';
    copyOption.style.cursor = 'pointer';
    copyOption.addEventListener('click', () => copyStructure(classContainer));

    const pasteOption = document.createElement('div');
    pasteOption.textContent = 'Enganxar';
    pasteOption.style.cursor = 'pointer';
    pasteOption.addEventListener('click', () => pasteStructure(classContainer));

    dropdown.appendChild(copyOption);
    dropdown.appendChild(pasteOption);
    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);
    parentContainer.appendChild(wrapper);

    // Toggle dropdown al click
    button.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Amagar dropdown si fem click fora
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}
