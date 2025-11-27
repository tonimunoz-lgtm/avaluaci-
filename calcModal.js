/* ---------------- Calc Modal: Selecciona graella i activitats ---------------- */

let currentCalcActivityId = null;
const calcTermSelect = document.getElementById('calcTermSelect');
const formulaButtonsDiv = document.getElementById('formulaButtons');
const formulaField = document.getElementById('formulaField');
const modalApplyCalcBtn = document.getElementById('modalApplyCalcBtn');
const calcTypeSelect = document.getElementById('calcType');
const numericDiv = document.getElementById('numericInput');
const numericField = document.getElementById('numericField');
const formulaDiv = document.getElementById('formulaInputs');

/* ---------------- Obrir modal ---------------- */
function openCalcModal(activityId){
  currentCalcActivityId = activityId;
  openModal('modalCalc');

  // Reset modal
  calcTypeSelect.value = 'numeric';
  numericDiv.classList.remove('hidden');
  formulaDiv.classList.add('hidden');
  numericField.value = '';
  formulaField.value = '';

  loadCalcTerms(); // Carrega desplegable de graelles i activitats inicials
}

/* ---------------- Carregar graelles al desplegable ---------------- */
async function loadCalcTerms(){
  const terms = await Terms.getTerms(); // [{id,name}]
  calcTermSelect.innerHTML = '';

  terms.forEach(term => {
    const opt = document.createElement('option');
    opt.value = term.id;
    opt.textContent = term.name;
    if(term.id === Terms.getActiveTermId()) opt.selected = true;
    calcTermSelect.appendChild(opt);
  });

  // Primer carregament activitats graella seleccionada
  loadCalcActivities(calcTermSelect.value);
}

/* ---------------- Carregar activitats d'una graella ---------------- */
async function loadCalcActivities(termId){
  formulaButtonsDiv.innerHTML = '';

  // Obtenir activitats de la graella
  const activities = await Terms.getActivities(termId); // [{id,name}]
  activities.forEach(act => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
    btn.textContent = act.name;
    btn.addEventListener('click', ()=> formulaField.value += act.name);
    formulaButtonsDiv.appendChild(btn);
  });

  // Botons operadors
  ['+', '-', '*', '/', '(', ')'].forEach(op=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
    btn.textContent = op;
    btn.addEventListener('click', ()=> formulaField.value += op);
    formulaButtonsDiv.appendChild(btn);
  });

  // Botons números 0-10
  for(let i=0;i<=10;i++){
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = i;
    btn.addEventListener('click', ()=> formulaField.value += i);
    formulaButtonsDiv.appendChild(btn);
  }

  // Botons decimals
  ['.', ','].forEach(dec=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='px-2 py-1 m-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.textContent = dec;
    btn.addEventListener('click', ()=> formulaField.value += '.');
    formulaButtonsDiv.appendChild(btn);
  });

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', ()=> formulaField.value = formulaField.value.slice(0,-1));
  formulaButtonsDiv.appendChild(backBtn);
}

/* ---------------- Canvi graella ---------------- */
calcTermSelect.addEventListener('change', (e)=>{
  const termId = e.target.value;
  loadCalcActivities(termId);
});

/* ---------------- Canvi tipus càlcul ---------------- */
calcTypeSelect.addEventListener('change', ()=>{
  if(calcTypeSelect.value==='numeric'){
    numericDiv.classList.remove('hidden');
    formulaDiv.classList.add('hidden');
  } else if(calcTypeSelect.value==='formula' || calcTypeSelect.value==='rounding'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    // Recarregar botons d'activitats de la graella actual
    loadCalcActivities(calcTermSelect.value);
  }
});

/* ---------------- Aplicar càlcul ---------------- */
modalApplyCalcBtn.addEventListener('click', async ()=>{
  if(!currentCalcActivityId) return;

  try{
    let formulaText = '';
    let displayFormulaText = '';

    switch(calcTypeSelect.value){
      case 'numeric':
        const val = Number(numericField.value);
        if(isNaN(val)) throw new Error('Introdueix un número vàlid');
        await Promise.all(classStudents.map(sid=> saveNote(sid,currentCalcActivityId,val)));
        formulaText = val;
        displayFormulaText = val;
        break;

      case 'formula':
        if(!formulaField.value.trim()) throw new Error('Formula buida');
        await Promise.all(classStudents.map(async sid=>{
          const result = await evalFormulaAsync(formulaField.value, sid);
          await saveNote(sid, currentCalcActivityId, result);
        }));
        formulaText = formulaField.value;
        displayFormulaText = formulaField.value;
        break;

      case 'rounding':
        if(!formulaField.value.trim()) throw new Error('Selecciona activitat i 0,5 o 1');
        await applyRounding(formulaField.value);
        formulaText = formulaField.value;
        displayFormulaText = formulaField.value;
        break;

      default:
        throw new Error('Tipus de càlcul desconegut');
    }

    if(currentClassId){
      await db.collection('classes').doc(currentClassId).update({
        [`calculatedActivities.${currentCalcActivityId}`]: {
          calculated:true,
          formula:formulaText,
          displayFormula:displayFormulaText
        }
      });
    }

    closeModal('modalCalc');
    renderNotesGrid();
  } catch(e){
    console.error(e);
    alert('Error aplicant càlcul: '+e.message);
  }
});
