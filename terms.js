// terms.js
// ----------------- Gestió de trimestres per classe -----------------

let currentTermId = null;  // Guardem el trimestre actual
const currentClassId = window.currentClassId; // o com ho tinguis definit

// Inicialitza el dropdown i botó "+"
export async function initTermsUI(containerSelector, renderNotesGridFn) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Dropdown de trimestres
    const termsDropdown = document.createElement('select');
    termsDropdown.className = 'border px-2 py-1 rounded mr-2';
    container.appendChild(termsDropdown);

    // Botó + per crear nou trimestre
    const addTermBtn = document.createElement('button');
    addTermBtn.textContent = '+';
    addTermBtn.className = 'px-2 py-1 border rounded hover:bg-gray-100';
    container.appendChild(addTermBtn);

    // Carreguem trimestres existents
    await loadTerms(termsDropdown, renderNotesGridFn);

    // Canvi de trimestre
    termsDropdown.addEventListener('change', async (e) => {
        currentTermId = e.target.value;
        await renderNotesGridFn(currentTermId);
    });

    // Crear nou trimestre
    addTermBtn.addEventListener('click', async () => {
        const termName = prompt('Nom del nou trimestre:');
        if (!termName) return;

        try {
            const newTermRef = await db.collection('classes')
                                       .doc(currentClassId)
                                       .collection('terms')
                                       .add({
                                            nom: termName,
                                            classActivities: [],
                                            calculatedActivities: {}
                                       });
            currentTermId = newTermRef.id;
            await loadTerms(termsDropdown, renderNotesGridFn);
        } catch(e) {
            console.error('Error creant trimestre:', e);
            alert('Error creant trimestre: ' + e.message);
        }
    });
}

// Funció per carregar trimestres a dropdown
async function loadTerms(dropdown, renderNotesGridFn) {
    dropdown.innerHTML = '';
    const termDocs = await db.collection('classes')
                             .doc(currentClassId)
                             .collection('terms')
                             .get();
    termDocs.forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.data().nom;
        if (doc.id === currentTermId) opt.selected = true;
        dropdown.appendChild(opt);
    });

    // Si no hi ha cap trimestre seleccionat, seleccionem el primer
    if (!currentTermId && termDocs.docs.length > 0) {
        currentTermId = termDocs.docs[0].id;
        dropdown.value = currentTermId;
    }

    // Renderitza la graella amb el trimestre seleccionat
    if (currentTermId) await renderNotesGridFn(currentTermId);
}
