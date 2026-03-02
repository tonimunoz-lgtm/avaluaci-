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
  'NA': 'No Assolit',
  'AS': 'Assoliment Satisfactori',
  'AN': 'Assoliment Notable',
  'AE': 'Assoliment Excelent'
};

// 🔥 NUEVA: Flag para evitar bucle infinito
let isPatching = false;

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

// 🔥 MEJORADO: Observer con mejor gestión
const observer = new MutationObserver(() => {
  if (!isPatching) {
    isPatching = true;
    setTimeout(async () => {
      await patchCompetencyInputs();
      isPatching = false;
    }, 150);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    observer.observe(document.body, observerConfig);
    console.log('👁️ Observer iniciado');
  }, 1000);
});

// 🔥 MEJORADO: Procesar TODOS los inputs de una vez
async function patchCompetencyInputs() {
  // Ignorar inputs ja gestionats per competencial-config.js (data-is-competency-numeric)
  // i els que estan dins d'un wrapper .comp-cell-wrapper (ja processats)
  const inputs = document.querySelectorAll(
    'input[type="number"][data-activity-id]:not([data-patched="true"]):not([data-is-competency-numeric="true"])'
  );
  
  // Filtrar inputs que estan dins d'un wrapper ja processat
  const filteredInputs = Array.from(inputs).filter(inp => 
    !inp.closest('.comp-cell-wrapper')
  );

  if (filteredInputs.length === 0) return;

  console.log(`🔧 Parchando ${filteredInputs.length} inputs de una sola vez...`);

  // 🔥 NUEVA: Precarga de actividades competenciales
  const db = window.firebase?.firestore?.();
  if (!db) {
    console.error('❌ Firebase no disponible');
    return;
  }

  // Obtener todos los IDs únicos de actividades
  const activityIds = new Set();
  filteredInputs.forEach(input => {
    const actId = input.dataset.activityId;
    if (actId) activityIds.add(actId);
  });

  // Precarga: obtener todas las actividades de una vez
  const competencyActivityIds = new Set();
  for (const actId of activityIds) {
    try {
      const actDoc = await db.collection('activitats').doc(actId).get();
      if (actDoc.exists) {
        const activity = actDoc.data();
        if (activity.evaluationType === 'competency' || activity.isCompetency) {
          competencyActivityIds.add(actId);
        }
      }
    } catch (err) {
      console.error('Error cargando actividad:', err);
    }
  }

  console.log(`📊 Actividades competenciales detectadas: ${competencyActivityIds.size}`);

  // Ahora procesar inputs
  for (const input of filteredInputs) {
    if (input.dataset.patched === 'true') continue;

    const activityId = input.dataset.activityId;
    const studentId = input.closest('tr')?.dataset.studentId;

    if (!activityId || !studentId) {
      input.dataset.patched = 'true';
      continue;
    }

    input.dataset.patched = 'true';

    try {
      // Solo si es competencial: si competencial-config.js está activo,
      // NO reemplazamos con select - lo gestiona competencial-config.js
      if (competencyActivityIds.has(activityId)) {
        // Comprovar si competencial-config.js ja gestiona aquest input
        if (window._competencialConfigActive) {
          // Marcar com a competencial però no substituir - config.js ho farà
          input.dataset.isCompetency = 'true';
        } else if (input.parentNode) {
          // Comportament original: substituir per select
          const studentDoc = await db.collection('alumnes').doc(studentId).get();
          const competencyValue = studentDoc.exists ? 
            (studentDoc.data().competencyNotes?.[activityId] || '') : '';
          replaceWithCompetencySelect(input, studentId, activityId, competencyValue);
        }
      }
    } catch (err) {
      console.error('Error procesando input:', err);
    }
  }

  console.log('✅ Parcheo completado');
}

function replaceWithCompetencySelect(inputElement, studentId, activityId, initialValue = '') {
  if (!inputElement.parentNode) {
    return;
  }

  const select = document.createElement('select');
  select.className = 'competency-select border rounded px-2 py-1 w-full text-center font-semibold';
  select.style.minHeight = '38px';
  select.dataset.activityId = activityId;
  select.dataset.studentId = studentId;
  select.dataset.isCompetency = 'true';

  select.innerHTML = `
    <option value="" style="background-color: white; color: black;">-</option>
    <option value="NA" style="background-color: ${COMPETENCY_COLORS['NA']}; color: white;">NA</option>
    <option value="AS" style="background-color: ${COMPETENCY_COLORS['AS']}; color: white;">AS</option>
    <option value="AN" style="background-color: ${COMPETENCY_COLORS['AN']}; color: black;">AN</option>
    <option value="AE" style="background-color: ${COMPETENCY_COLORS['AE']}; color: white;">AE</option>
  `;

  const currentValue = initialValue || inputElement.value;
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

    console.log(`💾 Guardando: ${value}`);

    const updateObj = {};
    if (value === '') {
      updateObj[`competencyNotes.${activityId}`] = window.firebase.firestore.FieldValue.delete();
    } else {
      updateObj[`competencyNotes.${activityId}`] = value;
    }

    await db.collection('alumnes').doc(studentId).update(updateObj);
    
  } catch (err) {
    console.error('❌ Error guardando nota competencial:', err);
  }
}

// ============================================================
// EXCLUIR COMPETENCIALES DE CALCULADORA Y ROUNDING
// ============================================================

// 🔥 MEJORADO: Cache de actividades competenciales
let competencyActivityCache = null;

async function getCompetencyActivityIds() {
  if (competencyActivityCache !== null) return competencyActivityCache;

  try {
    const db = window.firebase?.firestore?.();
    if (!db) return new Set();

    const snapshot = await db.collection('activitats')
      .where('evaluationType', '==', 'competency')
      .get();

    competencyActivityCache = new Set(snapshot.docs.map(doc => doc.id));
    return competencyActivityCache;
  } catch (err) {
    console.error('Error obteniendo actividades competenciales:', err);
    return new Set();
  }
}

// 🔥 INTERCEPTAR buildActivityButtons ANTES de crear los botones
const originalBuildActivityButtons = window.buildActivityButtons;

window.buildActivityButtons = async function() {
  // Llamar al original
  if (originalBuildActivityButtons) {
    await originalBuildActivityButtons.call(this);
  }

  // LUEGO desabilitar los competenciales
  await disableCompetencyButtons();
};

async function disableCompetencyButtons() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const competencyIds = await getCompetencyActivityIds();
    const buttons = document.querySelectorAll('.activity-buttons-container button[type="button"]');

    for (const btn of buttons) {
      if (btn.dataset.competencyFiltered === 'true') continue;

      let actName = btn.textContent.trim();
      
      if (actName.includes(']')) {
        actName = actName.split(']')[1].trim();
      }

      try {
        const snapshot = await db.collection('activitats')
          .where('nom', '==', actName)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const actId = snapshot.docs[0].id;
          
          if (competencyIds.has(actId)) {
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
            btn.title = '❌ Activitat competencial - no es pot usar en fórmules';
            btn.disabled = true;
            console.log('🚫 Excluida competencial:', actName);
          }
        }
      } catch (err) {
        console.error('Error filtrando:', err);
      }

      btn.dataset.competencyFiltered = 'true';
    }

  } catch (err) {
    console.error('Error en disableCompetencyButtons:', err);
  }
}

// Hook original de buildFormulaButtons
const originalBuildFormulaButtons = window.buildFormulaButtons;

window.buildFormulaButtons = async function() {
  if (originalBuildFormulaButtons) {
    originalBuildFormulaButtons.call(this);
  }

  // Después de crear los botones de fórmula, deshabilitar competenciales
  await disableCompetencyButtons();
};

// Hook para rounding buttons
const originalBuildRoundingButtons = window.buildRoundingButtons;

window.buildRoundingButtons = async function() {
  if (originalBuildRoundingButtons) {
    originalBuildRoundingButtons.call(this);
  }

  // También deshabilitar competenciales en rounding
  await disableCompetencyButtons();
};

// ============================================================
// MONITOREAR Y APLICAR BLOQUEOS A SELECTS COMPETENCIALES
// ============================================================

// 🔥 NUEVA: MutationObserver para detectar nuevos selects y aplicar bloqueos
const selectLockObserver = new MutationObserver(async () => {
  if (isPatching) return; // Evitar conflicto con el otro observer
  
  setTimeout(async () => {
    await applyLockToNewSelects();
  }, 50);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const notesTbody = document.getElementById('notesTbody');
    if (notesTbody) {
      selectLockObserver.observe(notesTbody, {
        childList: true,
        subtree: true,
        attributes: true
      });
      console.log('👁️ Observer de bloqueos iniciado');
    }
  }, 2000);
});

async function applyLockToNewSelects() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db || !window.currentClassId) return;

    // Obtener estado actual de bloqueos
    const classDoc = await db.collection('classes').doc(window.currentClassId).get();
    if (!classDoc.exists) return;

    const calculatedActs = classDoc.data().calculatedActivities || {};

    // Encontrar todos los selects competenciales
    const selects = document.querySelectorAll('select[data-isCompetency="true"]');

    selects.forEach(select => {
      const actId = select.dataset.activityId;
      if (!actId) return;

      const isLocked = calculatedActs[actId]?.locked || calculatedActs[actId]?.calculated;

      if (isLocked && !select.dataset.locked) {
        // Bloquear
        select.disabled = true;
        select.style.opacity = '0.6';
        select.style.cursor = 'not-allowed';
        select.classList.add('blocked-competency');
        select.title = '🔒 Activitat bloquejada';
        select.dataset.locked = 'true';
        console.log('🔒 Select bloqueado:', actId);
      } 
      else if (!isLocked && select.dataset.locked === 'true') {
        // Desbloquear
        select.disabled = false;
        select.style.opacity = '1';
        select.style.cursor = 'pointer';
        select.classList.remove('blocked-competency');
        select.title = '';
        select.dataset.locked = 'false';
        console.log('🔓 Select desbloqueado:', actId);
      }
    });

  } catch (err) {
    console.error('Error aplicando locks:', err);
  }
}

// 🔥 NUEVA: Interceptar clicks en lock icon directamente
setInterval(async () => {
  const lockIcons = document.querySelectorAll('.lock-icon');
  lockIcons.forEach(icon => {
    if (!icon.dataset.lockListenerAdded) {
      icon.addEventListener('click', async () => {
        console.log('🔒 Click en candado - actualizando selects...');
        // Esperar a que se guarde en Firestore
        await new Promise(r => setTimeout(r, 600));
        await applyLockToNewSelects();
      });
      icon.dataset.lockListenerAdded = 'true';
    }
  });
}, 500);

console.log('🎓 Sistema de Evaluación Competencial - Con Bloqueos Mejorados');
