// competencial.js - Sistema de Evaluación Competencial (Injector)
// Se ejecuta automáticamente sin modificar archivos existentes

console.log('✅ competencial.js cargado - Sistema de Evaluación Competencial');

const COMPETENCIES = ['NA', 'AS', 'AN', 'AE'];
const COMPETENCY_COLORS = {
  'NA': '#ef4444', // rojo
  'AS': '#f97316', // naranja
  'AN': '#eab308', // amarillo
  'AE': '#22c55e'  // verde
};

const COMPETENCY_NAMES = {
  'NA',
  'AS': 'En Adquisición',
  'AN': 'Afianzado',
  'AE': 'Ampliado Excelente'
};

// ============================================================
// INTERCEPTAR CREACIÓN DE ACTIVIDADES
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📚 Inicializando sistema competencial...');
  
  setTimeout(() => {
    patchActivityButton();
  }, 500);
});

function patchActivityButton() {
  const modalBtn = document.getElementById('modalAddActivityBtn');
  
  if (!modalBtn) {
    console.log('⏳ Esperando modalAddActivityBtn...');
    setTimeout(patchActivityButton, 500);
    return;
  }

  // Remover todos los listeners existentes clonando el elemento
  const newBtn = modalBtn.cloneNode(true);
  modalBtn.parentNode.replaceChild(newBtn, modalBtn);

  // Añadir el nuevo listener
  newBtn.addEventListener('click', handleActivityCreation);

  console.log('✅ Botón de actividad patcheado');
}

async function handleActivityCreation(e) {
  e.preventDefault();
  e.stopPropagation();

  const inputName = document.getElementById('modalActivityName');
  const name = inputName?.value.trim();

  if (!name) {
    alert('Posa un nom');
    return;
  }

  // Mostrar diálogo de tipo de evaluación
  const evaluationType = await showEvaluationTypeDialog();

  if (evaluationType === null) {
    return; // Usuario canceló
  }

  // Crear la actividad
  await createActivityWithType(name, evaluationType);
}

// ============================================================
// DIÁLOGO DE SELECCIÓN DE TIPO DE EVALUACIÓN
// ============================================================

function showEvaluationTypeDialog() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'competencyTypeModal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-40';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 class="text-2xl font-bold mb-2 text-gray-900">¿Cómo vols avaluar aquesta activitat?</h2>
        <p class="text-sm text-gray-600 mb-6">Selecciona el tipus d'avaluació:</p>
        
        <div class="space-y-3 mb-6">
          <!-- Opción Numérica -->
          <label class="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all">
            <input type="radio" name="evalType" value="numeric" class="w-5 h-5 text-blue-600">
            <div>
              <div class="font-semibold text-gray-900">Numèrica (0-10)</div>
              <div class="text-xs text-gray-600">Puntuació del 0 al 10</div>
            </div>
          </label>
          
          <!-- Opción Competencial -->
          <label class="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-500 transition-all">
            <input type="radio" name="evalType" value="competency" class="w-5 h-5 text-green-600">
            <div>
              <div class="font-semibold text-gray-900">Competencial</div>
              <div class="text-xs text-gray-600">NA, AS, AN, AE</div>
            </div>
          </label>
        </div>

        <div class="flex gap-2 justify-end">
          <button id="btnCancelEvalType" class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold">
            Cancel·lar
          </button>
          <button id="btnConfirmEvalType" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled>
            Continuar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const radios = modal.querySelectorAll('input[name="evalType"]');
    const btnConfirm = modal.querySelector('#btnConfirmEvalType');
    const btnCancel = modal.querySelector('#btnCancelEvalType');

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        btnConfirm.disabled = false;
      });
    });

    btnConfirm.addEventListener('click', () => {
      const selected = modal.querySelector('input[name="evalType"]:checked');
      const result = selected ? selected.value : null;
      modal.remove();
      resolve(result);
    });

    btnCancel.addEventListener('click', () => {
      modal.remove();
      resolve(null);
    });
  });
}

// ============================================================
// CREAR ACTIVIDAD CON TIPO
// ============================================================

async function createActivityWithType(name, evaluationType) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) {
      console.error('❌ Firebase no disponible');
      alert('Error: Firebase no disponible');
      return;
    }

    console.log('📝 Creando actividad:', name, 'Tipo:', evaluationType);

    // Crear referencia
    const ref = db.collection('activitats').doc();

    // Guardar actividad
    await ref.set({
      nom: name,
      data: new Date().toISOString().split('T')[0],
      calcType: 'numeric',
      formula: '',
      evaluationType: evaluationType,
      isCompetency: evaluationType === 'competency'
    });

    console.log('✅ Actividad guardada en Firestore');

    // Añadir al término activo
    if (window.Terms && window.Terms.addActivityToActiveTerm) {
      await window.Terms.addActivityToActiveTerm(ref.id);
      console.log('✅ Añadida al término activo');
    }

    // Limpiar input
    const inputName = document.getElementById('modalActivityName');
    if (inputName) inputName.value = '';

    // Cerrar modal
    if (window.closeModal) {
      window.closeModal('modalAddActivity');
    }

    // Recargar
    if (window.loadClassData) {
      setTimeout(() => window.loadClassData(), 500);
    }

    alert(`✅ Activitat '${name}' creada`);

  } catch (err) {
    console.error('❌ Error creant activitat:', err);
    alert('Error: ' + err.message);
  }
}

// ============================================================
// MONITOREAR Y PARCHEAR INPUTS COMPETENCIALES
// ============================================================

const observerConfig = {
  childList: true,
  subtree: true,
  attributes: false
};

const observer = new MutationObserver(() => {
  setTimeout(patchCompetencyInputs, 100);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    observer.observe(document.body, observerConfig);
    console.log('👁️ Observer iniciado');
  }, 1000);
});

async function patchCompetencyInputs() {
  const inputs = document.querySelectorAll('input[type="number"][data-activity-id]:not([data-patched="true"])');
  
  if (inputs.length === 0) return;

  console.log(`🔧 Parchando ${inputs.length} inputs...`);

  for (const input of inputs) {
    // Marcar ANTES de procesar
    input.dataset.patched = 'true';

    const activityId = input.dataset.activityId;
    const studentId = input.closest('tr')?.dataset.studentId;

    if (!activityId || !studentId) continue;

    try {
      const db = window.firebase?.firestore?.();
      if (!db) continue;

      // Obtener actividad
      const actDoc = await db.collection('activitats').doc(activityId).get();
      if (!actDoc.exists) continue;

      const activity = actDoc.data();

      // Si es competencial, reemplazar
      if (activity.isCompetency || activity.evaluationType === 'competency') {
        // Verificar que el input aún existe en el DOM
        if (input.parentNode) {
          replaceWithCompetencySelect(input, studentId, activityId);
        }
      }
    } catch (err) {
      console.error('Error verificando actividad:', err);
    }
  }
}

function replaceWithCompetencySelect(inputElement, studentId, activityId) {
  // Verificar que el elemento sigue en el DOM
  if (!inputElement.parentNode) {
    console.warn('⚠️ Elemento ya no existe en el DOM');
    return;
  }

  const select = document.createElement('select');
  select.className = 'competency-select border rounded px-2 py-1 w-full text-center font-semibold';
  select.style.minHeight = '38px';
  select.dataset.activityId = activityId;
  select.dataset.studentId = studentId;
  select.dataset.isCompetency = 'true';

  const currentValue = inputElement.value;

  select.innerHTML = `
    <option value="" style="background-color: white; color: black;">-</option>
    <option value="NA" style="background-color: ${COMPETENCY_COLORS['NA']}; color: white;">NA - No Alcanzado</option>
    <option value="AS" style="background-color: ${COMPETENCY_COLORS['AS']}; color: white;">AS - En Adquisición</option>
    <option value="AN" style="background-color: ${COMPETENCY_COLORS['AN']}; color: black;">AN - Afianzado</option>
    <option value="AE" style="background-color: ${COMPETENCY_COLORS['AE']}; color: white;">AE - Ampliado</option>
  `;

  if (COMPETENCIES.includes(currentValue)) {
    select.value = currentValue;
  }

  applyCompetencyColor(select);

  select.addEventListener('change', async () => {
    applyCompetencyColor(select);
    await saveCompetencyNote(studentId, activityId, select.value);
  });

  try {
    inputElement.parentNode.replaceChild(select, inputElement);
    console.log('✅ Input reemplazado por selector competencial');
  } catch (err) {
    console.error('Error al reemplazar elemento:', err);
  }
}

function applyCompetencyColor(select) {
  const value = select.value;
  
  if (value === '') {
    select.style.backgroundColor = '#ffffff';
    select.style.color = '#000000';
  } else {
    select.style.backgroundColor = COMPETENCY_COLORS[value] || '#ffffff';
    select.style.color = (value === 'AN') ? '#000000' : '#ffffff';
  }
  
  select.style.fontWeight = 'bold';
  select.style.padding = '0.5rem';
}

async function saveCompetencyNote(studentId, activityId, value) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) {
      console.error('❌ Firebase no disponible');
      return;
    }

    console.log(`💾 Guardando nota competencial - Alumno: ${studentId}, Actividad: ${activityId}, Valor: ${value}`);

    const updateObj = {};
    if (value === '') {
      updateObj[`notes.${activityId}`] = window.firebase.firestore.FieldValue.delete();
    } else {
      updateObj[`notes.${activityId}`] = value;
    }

    const result = await db.collection('alumnes').doc(studentId).update(updateObj);
    console.log('✅ Nota competencial guardada correctamente:', value);
    
  } catch (err) {
    console.error('❌ Error guardando nota competencial:', err);
    alert('Error guardando nota: ' + err.message);
  }
}

// ============================================================
// EXCLUIR COMPETENCIALES DE CALCULADORA
// ============================================================

// Hook original de buildFormulaButtons
const originalBuildFormulaButtons = window.buildFormulaButtons;

window.buildFormulaButtons = async function() {
  // Ejecutar original primero
  if (originalBuildFormulaButtons) {
    originalBuildFormulaButtons.call(this);
  }

  // Luego filtrar competenciales
  await filterCompetencyFromFormula();
};

async function filterCompetencyFromFormula() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    // Seleccionar botones sin filtrar Y selectores competenciales
    const buttons = document.querySelectorAll('.activity-buttons-container button[type="button"]');
    const competencySelects = document.querySelectorAll('select[data-isCompetency="true"]');

    // Obtener IDs de actividades competenciales
    const competencyIds = new Set();
    for (const select of competencySelects) {
      competencyIds.add(select.dataset.activityId);
    }

    for (const btn of buttons) {
      if (btn.dataset.filtered === 'true') continue;

      let actName = btn.textContent.trim();
      
      // Limpiar prefijos de términos si existen
      if (actName.includes(']')) {
        actName = actName.split(']')[1].trim();
      }

      try {
        const snapshot = await db.collection('activitats')
          .where('nom', '==', actName)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const activity = snapshot.docs[0].data();
          const actId = snapshot.docs[0].id;
          
          if (activity.isCompetency || activity.evaluationType === 'competency' || competencyIds.has(actId)) {
            // Deshabilitar botón
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
            btn.title = '❌ No se puede usar en fórmulas (actividad competencial)';
            btn.disabled = true;
            btn.dataset.filtered = 'true';
            console.log('🚫 Actividad competencial excluida:', actName);
          }
        }
      } catch (err) {
        console.error('Error filtrando:', err);
      }

      btn.dataset.filtered = 'true';
    }

    console.log('✅ Filtrado completado - Actividades competenciales excluidas');
  } catch (err) {
    console.error('Error en filterCompetencyFromFormula:', err);
  }
}

// Hook para rounding buttons también
const originalBuildRoundingButtons = window.buildRoundingButtons;

window.buildRoundingButtons = async function() {
  if (originalBuildRoundingButtons) {
    originalBuildRoundingButtons.call(this);
  }

  await filterCompetencyFromFormula();
};

console.log('🎓 Sistema de Evaluación Competencial - Listo');
