// competencial.js - Sistema de Evaluación Competencial (Injector)
console.log('✅ competencial.js cargado - Sistema de Evaluación Competencial');

const COMPETENCIES = ['NA','AS','AN','AE'];
const COMPETENCY_COLORS = {
  NA:'#ef4444', // rojo
  AS:'#f97316', // naranja
  AN:'#eab308', // amarillo
  AE:'#22c55e'  // verde
};

// ============================================================
// INTERCEPTAR CREACIÓN DE ACTIVIDADES
// ============================================================

document.addEventListener('DOMContentLoaded', () => waitForActivityModal());

// Espera y parchea el botón de añadir actividad
function waitForActivityModal() {
  const modalBtn = document.getElementById('modalAddActivityBtn');
  if (!modalBtn) return setTimeout(waitForActivityModal, 500);

  // Eliminar onclick inline de app.js para evitar duplicados
  modalBtn.removeAttribute('onclick');

  if (modalBtn.dataset.competencialModified) return;
  modalBtn.dataset.competencialModified = 'true';

  modalBtn.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();

    const activityName = document.getElementById('modalActivityName').value.trim();
    if (!activityName) { alert('Posa un nom'); return; }

    const evaluationType = await showEvaluationTypeDialog();
    if (!evaluationType) return;

    await createActivityWithType(activityName, evaluationType);
  });

  console.log('✅ Sistema competencial inicializado y botón modificado');
}

// ============================================================
// MODAL DE SELECCIÓN DE TIPO (tu modal original)
// ============================================================

function showEvaluationTypeDialog() {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-40';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 class="text-2xl font-bold mb-2 text-gray-900">¿Cómo vols evaluar aquesta activitat?</h2>
        <p class="text-sm text-gray-600 mb-6">Selecciona el tipus d'avaluació:</p>
        <div class="space-y-3 mb-6">
          <label class="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all">
            <input type="radio" name="evaluationType" value="numeric" class="w-5 h-5 text-blue-600">
            <div><div class="font-semibold text-gray-900">Numèrica (0-10)</div><div class="text-xs text-gray-600">Puntuació del 0 al 10</div></div>
          </label>
          <label class="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-500 transition-all">
            <input type="radio" name="evaluationType" value="competency" class="w-5 h-5 text-green-600">
            <div><div class="font-semibold text-gray-900">Competencial</div><div class="text-xs text-gray-600">NA, AS, AN, AE</div></div>
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button id="btnCancelEval" class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold">Cancel·lar</button>
          <button id="btnConfirmEval" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled>Continuar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const radios = modal.querySelectorAll('input[name="evaluationType"]');
    const btnConfirm = modal.querySelector('#btnConfirmEval');
    const btnCancel = modal.querySelector('#btnCancelEval');

    radios.forEach(r => r.addEventListener('change', () => btnConfirm.disabled = false));

    btnConfirm.addEventListener('click', () => {
      const selected = modal.querySelector('input[name="evaluationType"]:checked');
      modal.remove();
      resolve(selected ? selected.value : null);
    });

    btnCancel.addEventListener('click', () => { modal.remove(); resolve(null); });
  });
}

// ============================================================
// CREAR ACTIVIDAD
// ============================================================

async function createActivityWithType(name, evaluationType) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) { alert('Error: Firebase no disponible'); return; }

    const ref = db.collection('activitats').doc();

    await ref.set({
      nom: name,
      data: new Date().toISOString().split('T')[0],
      calcType: evaluationType === 'competency' ? 'competency' : 'numeric',
      evaluationType: evaluationType,
      competencyScales: evaluationType === 'competency' ? { NA:'No Alcanzado', AS:'En Adquisición', AN:'Afianzado', AE:'Ampliado' } : null
    });

    if (window.Terms?.addActivityToActiveTerm) {
      await window.Terms.addActivityToActiveTerm(ref.id);
    }

    if (window.loadClassData) await window.loadClassData();

    alert(`✅ Activitat '${name}' creada com a ${evaluationType === 'numeric' ? 'numèrica' : 'competencial'}`);

  } catch (err) {
    console.error('Error creant activitat:', err);
    alert('Error creant activitat: ' + err.message);
  }
}

// ============================================================
// PATCH AUTOMÁTICO DE INPUTS COMPETENCIALES
// ============================================================

const tableObserver = new MutationObserver(()=>patchTableInputs());
tableObserver.observe(document.body,{childList:true,subtree:true});

async function patchTableInputs() {
  const db = window.firebase?.firestore?.();
  if (!db) return;

  const ths = [...document.querySelectorAll('#notesThead th')];
  for(let colIdx=1; colIdx<ths.length-1; colIdx++){
    const actName = ths[colIdx].querySelector('span')?.textContent?.trim() || ths[colIdx].textContent.trim();
    if (!actName) continue;

    const snapshot = await db.collection('activitats').where('nom','==',actName).limit(1).get();
    if (snapshot.empty) continue;

    const actData = snapshot.docs[0].data();
    if (actData.evaluationType !== 'competency') continue;

    const rows = document.querySelectorAll('#notesTbody tr[data-student-id]');
    for(const row of rows){
      const td = row.querySelector(`td:nth-child(${colIdx+1})`);
      if(!td) continue;
      if(td.querySelector('.competency-select')) continue;

      const oldInput = td.querySelector('input');
      if(!oldInput) continue;

      const studentId = row.dataset.studentId;
      const select = document.createElement('select');
      select.className = 'competency-select border rounded px-2 py-1 w-full text-center font-semibold';
      select.dataset.activityId = snapshot.docs[0].id;
      select.dataset.studentId = studentId;

      select.innerHTML = `<option value=""></option>` + COMPETENCIES.map(c=>`<option value="${c}">${c}</option>`).join('');
      if(COMPETENCIES.includes(oldInput.value)) select.value = oldInput.value;

      applyCompetencyColor(select);
      select.addEventListener('change', async ()=>{
        applyCompetencyColor(select);
        await saveCompetencyNote(studentId, snapshot.docs[0].id, select.value);
      });

      oldInput.replaceWith(select);
    }
  }
}

function applyCompetencyColor(select){
  const value = select.value;
  select.style.backgroundColor = COMPETENCY_COLORS[value] || '#ffffff';
  select.style.color = (value==='AN') ? '#000000' : '#ffffff';
}

async function saveCompetencyNote(studentId, activityId, value){
  try{
    const db = window.firebase?.firestore?.();
    if(!db) return;
    const updateObj = {};
    if(value==='') updateObj[`notes.${activityId}`] = window.firebase.firestore.FieldValue.delete();
    else updateObj[`notes.${activityId}`] = value;
    await db.collection('alumnes').doc(studentId).update(updateObj);
    console.log(`✅ Nota competencial guardada: ${studentId} ${activityId}=${value}`);
  } catch(e){
    console.error('Error guardando nota competencial:', e);
  }
}

console.log('🎓 Sistema de Evaluación Competencial cargado correctamente');
