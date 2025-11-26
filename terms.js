// terms.js

let currentTermName = 'Avaluació'; // Nom per defecte del primer grup
let classTerms = {}; // { 'Avaluació': { activitats: [], calculatedActivities: {} }, 'Exàmens': {...} }

// Inicialitzar termes
function initTerms(classData) {
  // Si ja hi ha termes guardats a Firestore, els carreguem
  classTerms = classData.terms || {};
  if(Object.keys(classTerms).length === 0){
    // Crear un terme inicial si no existeix
    classTerms[currentTermName] = { activitats: [...classActivities], calculatedActivities: {} };
  }

  renderTermSelector();
  renderTermGrid();
}

// ------------------ Botó "+" per crear nou terme ------------------
const btnAddTerm = document.getElementById('btnAddTerm');
if(btnAddTerm){
  btnAddTerm.addEventListener('click', async ()=>{
    const termName = prompt("Introdueix el nom del nou grup d'activitats:");
    if(!termName) return;

    if(classTerms[termName]){
      alert('Ja existeix un grup amb aquest nom!');
      return;
    }

    // Crear un nou terme buit (només alumnes)
    classTerms[termName] = { activitats: [], calculatedActivities: {} };
    currentTermName = termName;

    await saveTermsToFirestore();
    renderTermSelector();
    renderTermGrid();
  });
}

// ------------------ Render selector de termes ------------------
function renderTermSelector(){
  const selectorDiv = document.getElementById('termSelector');
  if(!selectorDiv) return;

  selectorDiv.innerHTML = '';

  const select = document.createElement('select');
  select.className = 'border p-1 rounded';

  Object.keys(classTerms).forEach(term=>{
    const option = document.createElement('option');
    option.value = term;
    option.textContent = term;
    if(term === currentTermName) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener('change', (e)=>{
    currentTermName = e.target.value;
    renderTermGrid();
  });

  selectorDiv.appendChild(select);
}

// ------------------ Render graella segons terme ------------------
function renderTermGrid(){
  // Activitats del terme actual
  const termData = classTerms[currentTermName];
  classActivities = termData.activitats || [];
  calculatedActivities = termData.calculatedActivities || {};

  // Cridem la funció de app.js que ja renderitza la graella
  renderNotesGrid();
}

// ------------------ Guardar termes a Firestore ------------------
async function saveTermsToFirestore(){
  if(!currentClassId) return;
  try{
    await db.collection('classes').doc(currentClassId).update({
      terms: classTerms
    });
  } catch(e){
    console.error('Error guardant termes:', e);
    alert('Error guardant grups d’activitats: ' + e.message);
  }
}
