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

// ============================================================
// INTERCEPTAR CREACIÓN DE ACTIVIDADES
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📚 Inicializando sistema competencial...');
  
  // Esperar a que el modal de actividad esté listo
  waitForActivityModal();
});

function waitForActivityModal() {
  const modalBtn = document.getElementById('modalAddActivityBtn');
  
  if (!modalBtn) {
    setTimeout(waitForActivityModal, 500);
    return;
  }

  // Reemplazar el click handler del botón
  const originalHandler = modalBtn.onclick;
  
  modalBtn.addEventListener('click', async (e) => {
    // Prevenir que se ejecute el handler original
    e.stopImmediatePropagation();
    
    const activityName = document.getElementById('modalActivityName').value.trim();
    if (!activityName) {
      alert('Posa un nom');
      return;
    }

    // Mostrar diálogo de selección de tipo
    const evaluationType = await showEvaluationTypeDialog();
    
    if (evaluationType === null) {
      return; // Usuario canceló
    }

    // Crear la actividad con el tipo seleccionado
    await createActivityWithType(activityName, evaluationType);
  });

  console.log('✅ Sistema competencial inicializado');
}

// ============================================================
// DIÁLOGO DE SELECCIÓN DE TIPO DE EVALUACIÓN
// ============================================================

function showEvaluationTypeDialog() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-40';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 class="text-2xl font-bold mb-2 text-gray-900">¿Cómo vols evaluar aquesta activitat?</h2>
        <p class="text-sm text-gray-600 mb-6">Selecciona el tipus d'avaluació:</p>
        
        <div class="space-y-3 mb-6">
          <!-- Opción Numérica -->
          <label class="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all">
            <input type="radio" name="evaluationType" value="numeric" class="w-5 h-5 text-blue-600">
            <div>
              <div class="font-semibold text-gray-900">Numèrica (0-10)</div>
              <div class="text-xs text-gray-600">Puntuació del 0 al 10</div>
            </div>
          </label>
          
          <!-- Opción Competencial -->
          <label class="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-500 transition-all">
            <input type="radio" name="evaluationType" value="competency" class="w-5 h-5 text-green-600">
            <div>
              <div class="font-semibold text-gray-900">Competencial</div>
              <div class="text-xs text-gray-600">NA, AS, AN, AE</div>
            </div>
          </label>
        </div>

        <div class="flex gap-2 justify-end">
          <button id="btnCancelEval" class="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-semibold">
            Cancel·lar
          </button>
          <button id="btnConfirmEval" class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled>
            Continuar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const radios = modal.querySelectorAll('input[name="evaluationType"]');
    const btnConfirm = modal.querySelector('#btnConfirmEval');
    const btnCancel = modal.querySelector('#btnCancelEval');

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        btnConfirm.disabled = false;
      });
    });

    btnConfirm.addEventListener('click', () => {
      const selected = modal.querySelector('input[name="evaluationType"]:checked');
      modal.remove();
      resolve(selected ? selected.value : null);
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
      console.error('Firebase no disponible');
      alert('Error: Firebase no disponible');
      return;
    }

    // Crear referencia de actividad
    const ref = db.collection('activitats').doc();

    // Guardar con tipo de evaluación
    await ref.set({
      nom: name,
      data: new Date().toISOString().split('T')[0],
      calcType: 'numeric',
      formula: '',
      evaluationType: evaluationType, // 'numeric' o 'competency'
      competencyScales: evaluationType === 'competency' ? {
        'NA': 'No Alcanzado',
        'AS': 'En Adquisición',
        'AN': 'Afianzado',
        'AE': 'Ampliado'
      } : null
    });

    console.log('✅ Actividad creada:', name, 'Tipo:', evaluationType);

    // Añadir al término activo
    if (window.Terms && window.Terms.addActivityToActiveTerm) {
      await window.Terms.addActivityToActiveTerm(ref.id);
    }

    // Cerrar modal
    const modalName = document.getElementById('modalActivityName');
    if (modalName) modalName.value = '';
    
    if (window.closeModal) {
      window.closeModal('modalAddActivity');
    }

    // Recargar datos
    if (window.loadClassData) {
      window.loadClassData();
    }

    alert(`✅ Activitat '${name}' creada com a ${evaluationType === 'numeric' ? 'numèrica' : 'competencial'}`);

  } catch (err) {
    console.error('Error creant activitat:', err);
    alert('Error creant activitat: ' + err.message);
  }
}

// ============================================================
// INTERCEPTAR RENDERIZADO DE TAULA PARA INPUTS COMPETENCIALES
// ============================================================

// Hook en el renderNotesGrid original
const originalFetch = window.fetch;
let isRenderingTable = false;

document.addEventListener('DOMContentLoaded', () => {
  // Monitorear cambios en la tabla
  const observer = new MutationObserver(() => {
    if (document.getElementById('notesTbody')) {
      patchTableInputs();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

function patchTableInputs() {
  // Buscar todas las actividades competenciales
  const headers = document.querySelectorAll('#notesThead th');
  
  headers.forEach((header, idx) => {
    const headText = header.textContent.trim();
    if (headText === 'Alumne' || headText === 'Comentaris') return;

    // Obtener el nombre de la actividad
    const actName = header.querySelector('span')?.textContent || headText;
    
    // Buscar actividad en Firestore para verificar tipo
    checkAndPatchActivityInputs(actName, idx);
  });
}

async function checkAndPatchActivityInputs(actName, colIdx) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    // Buscar actividad por nombre
    const snapshot = await db.collection('activitats')
      .where('nom', '==', actName.trim())
      .limit(1)
      .get();

    if (snapshot.empty) return;

    const activity = snapshot.docs[0];
    const actData = activity.data();

    // Si es competencial, modificar los inputs
    if (actData.evaluationType === 'competency') {
      patchCompetencyInputs(colIdx, activity.id);
    }
  } catch (err) {
    console.error('Error verificando tipo de actividad:', err);
  }
}

function patchCompetencyInputs(colIdx, activityId) {
  const rows = document.querySelectorAll('#notesTbody tr[data-student-id]');
  
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input[type="number"]');
    if (inputs[colIdx - 1]) {
      const oldInput = inputs[colIdx - 1];
      const studentId = row.dataset.studentId;
      
      // Crear selector de competencias
      const select = document.createElement('select');
      select.className = 'competency-select border rounded px-2 py-1 w-full text-center font-semibold';
      select.dataset.activityId = activityId;
      select.dataset.studentId = studentId;
      
      // Opciones
      select.innerHTML = `
        <option value="">-</option>
        <option value="NA" style="background-color: ${COMPETENCY_COLORS['NA']}; color: white;">NA</option>
        <option value="AS" style="background-color: ${COMPETENCY_COLORS['AS']}; color: white;">AS</option>
        <option value="AN" style="background-color: ${COMPETENCY_COLORS['AN']}; color: black;">AN</option>
        <option value="AE" style="background-color: ${COMPETENCY_COLORS['AE']}; color: white;">AE</option>
      `;

      // Cargar valor actual
      const currentVal = oldInput.value;
      if (COMPETENCIES.includes(currentVal)) {
        select.value = currentVal;
      }

      // Aplicar color
      applyCompetencyColor(select);

      // Event listeners
      select.addEventListener('change', async () => {
        applyCompetencyColor(select);
        await saveCompetencyNote(studentId, activityId, select.value);
      });

      // Reemplazar input
      oldInput.parentNode.replaceChild(select, oldInput);
    }
  });
}

function applyCompetencyColor(select) {
  const value = select.value;
  select.style.backgroundColor = COMPETENCY_COLORS[value] || '#ffffff';
  select.style.color = (value === 'AN') ? '#000000' : '#ffffff';
}

async function saveCompetencyNote(studentId, activityId, value) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const updateObj = {};
    if (value === '') {
      updateObj[`notes.${activityId}`] = window.firebase.firestore.FieldValue.delete();
    } else {
      updateObj[`notes.${activityId}`] = value;
    }

    await db.collection('alumnes').doc(studentId).update(updateObj);
    console.log('✅ Nota competencial guardada:', value);
  } catch (err) {
    console.error('Error guardando nota competencial:', err);
  }
}

// ============================================================
// EXCLUIR COMPETENCIALES DE FÓRMULAS
// ============================================================

// Hook para modificar buildActivityButtons
const originalBuildActivityButtons = window.buildActivityButtons;

window.buildActivityButtons = async function() {
  if (originalBuildActivityButtons) {
    originalBuildActivityButtons();
  }

  // Filtrar botones de actividades competenciales
  filterCompetencyActivitiesFromFormula();
};

async function filterCompetencyActivitiesFromFormula() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const buttons = document.querySelectorAll('.activity-buttons-container button[type="button"]');
    
    for (const btn of buttons) {
      const actName = btn.textContent.replace(/[\[\]]/g, '').trim();
      
      const snapshot = await db.collection('activitats')
        .where('nom', '==', actName)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const activity = snapshot.docs[0].data();
        if (activity.evaluationType === 'competency') {
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
          btn.title = 'No se puede usar actividades competenciales en fórmulas';
          btn.disabled = true;
        }
      }
    }
  } catch (err) {
    console.error('Error filtrando actividades competenciales:', err);
  }
}

console.log('🎓 Sistema de Evaluación Competencial - Cargado correctamente');
