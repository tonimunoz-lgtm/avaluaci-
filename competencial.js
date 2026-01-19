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
  
  // ***** CAMBIO CLAVE 1: Interceptar window.renderNotesGrid *****  
  // Guarda una referencia a la función original de app.js  
  // Asegúrate de que app.js se haya cargado antes de intentar esto.  
  if (window.renderNotesGrid) {  
    const originalRenderNotesGrid = window.renderNotesGrid;  
    window.renderNotesGrid = async function() {  
      // 1. Llama a la función original de app.js para que dibuje la tabla con los inputs numéricos  
      console.log('competencial.js: Interceptando renderNotesGrid y llamando al original...');  
      await originalRenderNotesGrid.apply(this, arguments); // Usa .apply para pasar el contexto y argumentos  
  
      // 2. Ahora, modifica los inputs para actividades competenciales  
      console.log('competencial.js: Original renderizado, aplicando parches competenciales...');  
      await patchTableInputs(); // Espera a que las actividades competenciales se identifiquen y parchen  
      console.log('competencial.js: Parches competenciales aplicados.');  
    };  
    console.log('✅ window.renderNotesGrid interceptado por competencial.js');  
  } else {  
    console.warn('competencial.js: window.renderNotesGrid no encontrado. El parche de inputs podría no funcionar.');  
    // Si no se encuentra renderNotesGrid, aún podemos intentar usar el MutationObserver  
    // aunque la intercepción directa es más fiable.  
     const observer = new MutationObserver((mutationsList, observer) => {  
        for(const mutation of mutationsList) {  
            if (mutation.type === 'childList' && document.getElementById('notesTbody')) {  
                // Desconectar temporalmente para evitar bucles infinitos si patchTableInputs modifica el DOM  
                observer.disconnect();  
                patchTableInputs().then(() => {  
                    // Volver a conectar el observer después de que se apliquen los parches  
                    observer.observe(document.body, { childList: true, subtree: true });  
                });  
                break; // Una vez que encontramos la tabla y actuamos, salimos  
            }  
        }  
    });  
    observer.observe(document.body, { childList: true, subtree: true });  
  }  
  
  // ***** FIN CAMBIO CLAVE 1 *****  
});  
  
  
function waitForActivityModal() {  
  const modalBtn = document.getElementById('modalAddActivityBtn');  
    
  if (!modalBtn) {  
    setTimeout(waitForActivityModal, 500);  
    return;  
  }  
  
  // ***** CAMBIO CLAVE 2: Desvincular el manejador original del botón *****  
  // Marcar el botón para evitar duplicar listeners si esta función se llama varias veces  
  if (modalBtn.dataset.competencialModified) {  
    console.log('competencial.js: Botón de añadir actividad ya modificado, omitiendo.');  
    return;  
  }  
  
  // Desvincular el manejador de eventos `createActivityModal` de app.js  
  // Es crucial que createActivityModal esté disponible en el ámbito global (window)  
  // o que se defina en app.js de manera que sea accesible.  
  if (typeof window.createActivityModal === 'function') {  
    modalBtn.removeEventListener('click', window.createActivityModal);  
    console.log('competencial.js: Manejador original de createActivityModal desvinculado.');  
  } else {  
    console.warn('competencial.js: window.createActivityModal no encontrado para desvincular. Puede haber duplicación de actividad.');  
    // Si no se puede desvincular, al menos aseguramos que nuestro handler use preventDefault  
  }  
  // ***** FIN CAMBIO CLAVE 2 *****  
    
  modalBtn.addEventListener('click', async (e) => {  
    //e.stopImmediatePropagation(); // No es estrictamente necesario si removeEventListener funciona  
    e.preventDefault(); // Impedir cualquier comportamiento por defecto del botón  
      
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
  
    // Después de crear la actividad, si el modalAddActivity de app.js tiene un handler  
    // para cerrar el modal o recargar la vista, es posible que queramos invocarlo.  
    // Sin embargo, createActivityWithType ya se encarga de closeModal y loadClassData.  
    // Si el comportamiento aún no es el esperado, podríamos considerar invocar el handler original  
    // aquí si lo hubiéramos guardado (aunque removeEventListener es más seguro).  
  
  });  
  
  modalBtn.dataset.competencialModified = 'true'; // Marcar que el botón ha sido modificado  
  console.log('✅ Sistema competencial inicializado y botón de añadir actividad modificado.');  
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
      calcType: 'numeric', // Esto no es un problema si luego se ignora para competenciales  
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
    // Aquí es donde la inyección se encuentra con la lógica de app.js  
    if (window.Terms && window.Terms.addActivityToActiveTerm) {  
      await window.Terms.addActivityToActiveTerm(ref.id);  
    } else {  
      console.warn('competencial.js: window.Terms o addActivityToActiveTerm no disponible. La actividad podría no añadirse a la pestaña actual.');  
      // Como fallback, el original app.js podría haber tenido una lógica para actividades generales  
      // pero ahora la gestión de términos es la estándar.  
    }  
  
    // Cerrar modal  
    const modalNameInput = document.getElementById('modalActivityName');  
    if (modalNameInput) modalNameInput.value = '';  
      
    if (window.closeModal) {  
      window.closeModal('modalAddActivity');  
    }  
  
    // Recargar datos  
    // Esto llamará a la versión interceptada de renderNotesGrid si la intercepción fue exitosa.  
    if (window.loadClassData) {  
      await window.loadClassData();  
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
  
// El MutationObserver ya no es la principal forma de interceptar  
// renderizado si hemos sobrescrito window.renderNotesGrid.  
// Lo mantenemos como fallback si window.renderNotesGrid no es accesible.  
  
// Hook en el renderNotesGrid original  
// const originalFetch = window.fetch; // Esta variable no se usa, se puede eliminar si no es necesaria.  
// let isRenderingTable = false; // Esta variable tampoco se usa, se puede eliminar si no es necesaria.  
  
// La lógica principal de carga del sistema competencial (incluyendo la interceptación de renderNotesGrid)  
// ya se maneja en el listener DOMContentLoaded.  
  
async function patchTableInputs() {  
  console.log('competencial.js: Aplicando parches a la tabla de notas...');  
  // Buscar todas las actividades competenciales  
  const headers = document.querySelectorAll('#notesThead th');  
    
  // Usaremos un bucle for...of para poder usar await dentro.  
  for (const [idx, header] of headers.entries()) {  
    const headText = header.textContent.trim();  
    if (headText === 'Alumne' || headText === 'Comentaris') continue;  
  
    // Obtener el nombre de la actividad  
    // Considerar que el nombre real está en un span dentro del th en app.js  
    const actNameSpan = header.querySelector('span');  
    const actName = actNameSpan ? actNameSpan.textContent.trim() : headText.trim();  
      
    if (actName) {  
      await checkAndPatchActivityInputs(actName, idx);  
    }  
  }  
  console.log('competencial.js: Parches de tabla completados.');  
}  
  
async function checkAndPatchActivityInputs(actName, colIdx) {  
  try {  
    const db = window.firebase?.firestore?.();  
    if (!db) return;  
  
    // Buscar actividad por nombre  
    // Mejor buscar por ID si se tiene, pero por nombre es el camino aquí.  
    // Esto asume que los nombres de actividad son únicos, lo cual es buena práctica.  
    const snapshot = await db.collection('activitats')  
      .where('nom', '==', actName)  
      .limit(1)  
      .get();  
  
    if (snapshot.empty) return;  
  
    const activity = snapshot.docs[0];  
    const actData = activity.data();  
  
    // Si es competencial, modificar los inputs  
    if (actData.evaluationType === 'competency') {  
      await patchCompetencyInputs(colIdx, activity.id); // Asegurarse de que el ID de actividad se pase  
    }  
  } catch (err) {  
    console.error('competencial.js: Error verificando tipo de actividad:', err);  
  }  
}  
  
async function patchCompetencyInputs(colIdx, activityId) {  
  const rows = document.querySelectorAll('#notesTbody tr[data-student-id]');  
    
  for (const row of rows) {  
    // colIdx es el índice del TH. Los TD comienzan en 0 con el nombre del alumno,  
    // así que la columna de actividad es colIdx.  
    // Los inputs en app.js se crean dentro de los TD, a partir del segundo TD (índice 1).  
    // Por lo tanto, el input correspondiente estará en el TD de índice `colIdx`.  
    const tdToPatch = row.querySelector(`td:nth-child(${colIdx + 1})`);   
    if (!tdToPatch) continue;  
  
    // El input original es el que tiene data-activity-id  
    const oldInput = tdToPatch.querySelector(`input[data-activity-id="${activityId}"]`);  
      
    // Si ya existe un select competencial, no hacemos nada para evitar duplicados.  
    if (tdToPatch.querySelector('.competency-select')) {  
      // console.log(`competencial.js: Selector ya existe para actId ${activityId} en alumno ${row.dataset.studentId}.`);  
      continue;  
    }  
  
    if (oldInput) {  
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
  
      // Cargar valor actual desde Firestore.  
      // fetch actual note for student and activity  
      const studentDoc = await window.firebase.firestore().collection('alumnes').doc(studentId).get();  
      const currentVal = studentDoc.exists ? studentDoc.data().notes?.[activityId] || '' : '';  
  
      if (COMPETENCIES.includes(currentVal)) {  
        select.value = currentVal;  
      }  
  
      // Aplicar color inicial  
      applyCompetencyColor(select);  
  
      // Event listeners  
      select.addEventListener('change', async () => {  
        applyCompetencyColor(select);  
        await saveCompetencyNote(studentId, activityId, select.value);  
        // Opcional: Después de guardar, si hay lógica de app.js para recalcular promedios, llamarla.  
        if (window.renderAverages) {  
          window.renderAverages();  
        }  
      });  
  
      // Reemplazar input. Asegurarse de que el antiguo input se elimine.  
      oldInput.parentNode.replaceChild(select, oldInput);  
      console.log(`competencial.js: Input para actividad competencial ${activityId} en alumno ${studentId} reemplazado por select.`);  
    }  
  }  
}  
  
function applyCompetencyColor(select) {  
  const value = select.value;  
  select.style.backgroundColor = COMPETENCY_COLORS[value] || '#ffffff';  
  select.style.color = (value === 'AN') ? '#000000' : '#ffffff'; // Texto negro para 'AN'  
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
    console.log(`✅ Nota competencial para ${studentId}, ${activityId} guardada: ${value}`);  
  } catch (err) {  
    console.error('competencial.js: Error guardando nota competencial:', err);  
  }  
}  
  
// ============================================================  
// EXCLUIR COMPETENCIALES DE FÓRMULAS  
// ============================================================  
  
// ***** CAMBIO CLAVE 3: Interceptar window.buildActivityButtons *****  
// Esta es la función que app.js llama para generar los botones de actividades en el modal de cálculo.  
if (window.buildActivityButtons) {  
  const originalBuildActivityButtons = window.buildActivityButtons;  
  window.buildActivityButtons = async function() {  
    // Llama a la función original para que app.js cree los botones  
    await originalBuildActivityButtons.apply(this, arguments);  
  
    // Luego, aplica tu filtro  
    await filterCompetencyActivitiesFromFormula();  
  };  
  console.log('✅ window.buildActivityButtons interceptado por competencial.js');  
} else {  
  console.warn('competencial.js: window.buildActivityButtons no encontrado. El filtro de fórmulas podría no funcionar.');  
}  
// ***** FIN CAMBIO CLAVE 3 *****  
  
  
async function filterCompetencyActivitiesFromFormula() {  
  try {  
    const db = window.firebase?.firestore?.();  
    if (!db) return;  
  
    // Necesitamos un pequeño delay para asegurarnos de que los botones hayan sido renderizados  
    await new Promise(r => setTimeout(r, 100));   
  
    // Aquí, la función `buildActivityButtons` de `app.js` crea los botones  
    // con el texto del nombre de la actividad.  
    // También crea un selector de términos para las fórmulas.  
    // Los botones de actividad están dentro de un `.activity-buttons-container`  
    // y pueden estar dentro de un `div.activity-buttons-container`.  
      
    // Buscar los botones de actividad en el modal de cálculo  
    const activityButtonContainers = document.querySelectorAll('.activity-buttons-container');  
  
    for (const container of activityButtonContainers) {  
      const buttons = container.querySelectorAll('button[type="button"]'); // Botones de actividad generados  
  
      for (const btn of buttons) {  
        // El texto del botón puede incluir el prefijo del término "[TERM_NAME] ACTIVITY_NAME"  
        // Necesitamos extraer solo el nombre de la actividad  
        let actName = btn.textContent.trim();  
        const termPrefixMatch = actName.match(/^.∗?\s*(.*)$/);
if (termPrefixMatch) {
actName = termPrefixMatch[1]; // Extraer solo el nombre de la actividad
}
 plaintextconst snapshot = await db.collection('activitats')  
      .where('nom', '==', actName)  
      .limit(1)  
      .get();  

    if (!snapshot.empty) {  
      const activity = snapshot.docs[0].data();  
      if (activity.evaluationType === 'competency') {  
        btn.style.opacity = '0.5';  
        btn.style.cursor = 'not-allowed';  
        btn.title = 'No se puede usar actividades competenciales en fórmulas numéricas';  
        btn.disabled = true;  
      }  
    }  
  }  
}
} catch (err) {
console.error('competencial.js: Error filtrando actividades competenciales:', err);
}
}
console.log('🎓 Sistema de Evaluación Competencial - Cargado correctamente');
 plaintext
