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
  if (window.renderNotesGrid && !window.renderNotesGrid.isCompetencialPatched) { // Añadimos un flag para evitar doble parcheo  
    const originalRenderNotesGrid = window.renderNotesGrid;  
    window.renderNotesGrid = async function() {  
      // 1. Llama a la función original de app.js para que dibuje la tabla con los inputs numéricos  
      console.log('competencial.js: Interceptando renderNotesGrid y llamando al original...');  
      // Usamos .apply para asegurar que el contexto (this) y los argumentos se pasen correctamente  
      await originalRenderNotesGrid.apply(this, arguments);   
  
      // 2. Ahora, modifica los inputs para actividades competenciales  
      console.log('competencial.js: Original renderizado, aplicando parches competenciales...');  
      await patchTableInputs(); // Espera a que las actividades competenciales se identifiquen y parchen  
      console.log('competencial.js: Parches competenciales aplicados.');  
    };  
    window.renderNotesGrid.isCompetencialPatched = true; // Marca la función como parcheada  
    console.log('✅ window.renderNotesGrid interceptado por competencial.js');  
  } else if (!window.renderNotesGrid) {  
    console.warn('competencial.js: window.renderNotesGrid no encontrado. El parche de inputs podría no funcionar correctamente si la tabla se re-renderiza.');  
    // Si no se encuentra renderNotesGrid, aún podemos intentar usar el MutationObserver  
    // aunque la intercepción directa es más fiable.  
    // Este observer es un fallback si la intercepción principal falla.  
    const observer = new MutationObserver((mutationsList, observer) => {  
        for(const mutation of mutationsList) {  
            // Buscamos si se añadió o modificó el tbody de la tabla  
            if (mutation.type === 'childList' && mutation.target.id === 'notesTbody' && mutation.addedNodes.length > 0) {  
                 console.log('competencial.js: MutationObserver detectó cambios en notesTbody, aplicando parches...');  
                // Desconectar temporalmente para evitar bucles infinitos si patchTableInputs modifica el DOM  
                observer.disconnect();  
                patchTableInputs().then(() => {  
                    // Volver a conectar el observer después de que se apliquen los parches  
                    observer.observe(document.body, { childList: true, subtree: true }); // O el elemento que se observe inicialmente  
                }).catch(e => console.error("Error en patchTableInputs desde MutationObserver:", e));  
                break; // Una vez que encontramos la tabla y actuamos, salimos  
            } else if (mutation.type === 'childList' && document.getElementById('notesTbody')) {  
                // Si el notesTbody ya existe y se modificó algo más, también podemos intentar  
                // Aunque la lógica de arriba debería ser suficiente si el tbody es nuevo o reconstruido.  
            }  
        }  
    });  
    // Observar el body para cambios en el subtree (incluyendo notesTbody cuando se crea o modifica)  
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
    // Si conocemos la función específica, podemos removerla.  
    modalBtn.removeEventListener('click', window.createActivityModal);  
    console.log('competencial.js: Manejador original de createActivityModal desvinculado.');  
  } else {  
    // Si no podemos removerla por nombre (ej. si está definida localmente en un módulo),  
    // o si app.js adjunta su handler de otra manera, `stopImmediatePropagation` es el último recurso.  
    // El warning es importante para saber si la desvinculación fue exitosa.  
    console.warn('competencial.js: window.createActivityModal no encontrado para desvincular. Puede haber duplicación de actividad. Dependiendo de e.stopImmediatePropagation().');  
  }  
    
  modalBtn.addEventListener('click', async (e) => {  
    // Solo si no pudimos desvincular el listener original, usamos stopImmediatePropagation.  
    // Si el removeEventListener funcionó, no es estrictamente necesario, pero no hace daño.  
    // Importante: si el handler de app.js se adjuntó después que el nuestro,  
    // stopImmediatePropagation() NO lo detendrá. La desvinculación explícita es mejor.  
    e.stopImmediatePropagation();   
    e.preventDefault(); // Impedir cualquier comportamiento por defecto (ej. envío de formulario)  
      
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
  
    // No necesitamos llamar a closeModal o loadClassData aquí si ya lo hace createActivityWithType  
    // y si la intercepción de renderNotesGrid funciona, la UI se actualizará.  
  
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
  
// La variable originalFetch y isRenderingTable no se usan en esta versión.  
// const originalFetch = window.fetch;  
// let isRenderingTable = false;  
  
// El MutationObserver de la versión original se ha movido al DOMContentLoaded  
// como fallback si window.renderNotesGrid no es interceptado directamente.  
  
async function patchTableInputs() {  
  console.log('competencial.js: Aplicando parches a la tabla de notas...');  
  const headers = document.querySelectorAll('#notesThead th');  
    
  for (const [idx, header] of headers.entries()) { // Usamos for...of para poder usar await  
    // Skipping 'Alumne' (first column) and 'Comentaris' (last column, check dynamically)  
    // El índice del "Alumne" es 0. El índice de "Comentaris" será `headers.length - 1`.  
    if (idx === 0 || idx === headers.length - 1) continue;  
  
    // Obtener el nombre de la actividad de forma más robusta  
    const actNameSpan = header.querySelector('span');  
    const actName = actNameSpan ? actNameSpan.textContent.trim() : header.textContent.trim();  
      
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
  
    const snapshot = await db.collection('activitats')  
      .where('nom', '==', actName) // Ya eliminamos trim() de actName en el loop principal  
      .limit(1)  
      .get();  
  
    if (snapshot.empty) return;  
  
    const activity = snapshot.docs[0];  
    const actData = activity.data();  
  
    if (actData.evaluationType === 'competency') {  
      await patchCompetencyInputs(colIdx, activity.id); // Pasa el ID de la actividad  
    }  
  } catch (err) {  
    console.error('competencial.js: Error verificando tipo de actividad:', err);  
  }  
}  
  
async function patchCompetencyInputs(colIdx, activityId) {  
  const rows = document.querySelectorAll('#notesTbody tr[data-student-id]');  
    
  for (const row of rows) { // Usamos for...of para poder usar await  
    // colIdx es el índice del TH. Los TD comienzan en 0 con el nombre del alumno.  
    // El TD correspondiente a la actividad estará en el índice `colIdx`.  
    // (Ej. TH[0] (Alumne) -> TD[0]; TH[1] (Actividad1) -> TD[1])  
    const tdToPatch = row.querySelector(`td:nth-child(${colIdx + 1})`);   
    if (!tdToPatch) continue;  
  
    // Buscamos el input original dentro de ese TD  
    const oldInput = tdToPatch.querySelector(`input[data-activity-id="${activityId}"]`);  
      
    // Si ya existe un select competencial, o si el elemento ya fue parcheado, no hacemos nada  
    if (tdToPatch.querySelector('.competency-select')) {  
      continue;  
    }  
  
    if (oldInput) {  
      const studentId = row.dataset.studentId;  
        
      const select = document.createElement('select');  
      select.className = 'competency-select border rounded px-2 py-1 w-full text-center font-semibold';  
      select.dataset.activityId = activityId;  
      select.dataset.studentId = studentId;  
        
      select.innerHTML = `  
        <option value="">-</option>  
        <option value="NA" style="background-color: ${COMPETENCY_COLORS['NA']}; color: white;">NA</option>  
        <option value="AS" style="background-color: ${COMPETENCY_COLORS['AS']}; color: white;">AS</option>  
        <option value="AN" style="background-color: ${COMPETENCY_COLORS['AN']}; color: black;">AN</option>  
        <option value="AE" style="background-color: ${COMPETENCY_COLORS['AE']}; color: white;">AE</option>  
      `;  
  
      // Cargar el valor actual de la nota competencial del alumno para esta actividad  
      const db = window.firebase?.firestore?.();  
      if (db) {  
        const studentDoc = await db.collection('alumnes').doc(studentId).get();  
        const currentNote = studentDoc.exists ? studentDoc.data().notes?.[activityId] : '';  
        if (COMPETENCIES.includes(currentNote)) {  
          select.value = currentNote;  
        }  
      }  
  
      applyCompetencyColor(select);  
  
      select.addEventListener('change', async () => {  
        applyCompetencyColor(select);  
        await saveCompetencyNote(studentId, activityId, select.value);  
        // Si hay una función global para re-renderizar los promedios en app.js, llámala  
        if (window.renderAverages) {  
          window.renderAverages();  
        }  
      });  
  
      // Reemplazar el input original por el nuevo select  
      oldInput.parentNode.replaceChild(select, oldInput);  
      console.log(`competencial.js: Input para actividad ${activityId} en alumno ${studentId} reemplazado por selector competencial.`);  
    }  
  }  
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
    console.log(`✅ Nota competencial para ${studentId}, actividad ${activityId} guardada: ${value}`);  
  } catch (err) {  
    console.error('competencial.js: Error guardando nota competencial:', err);  
  }  
}  
  
// ============================================================  
// EXCLUIR COMPETENCIALES DE FÓRMULAS  
// ============================================================  
  
// ***** CAMBIO CLAVE 3: Interceptar window.buildActivityButtons *****  
// Esto asegura que los botones para actividades competenciales estén deshabilitados  
// en el modal de cálculo de fórmulas.  
if (window.buildActivityButtons && !window.buildActivityButtons.isCompetencialPatched) {  
  const originalBuildActivityButtons = window.buildActivityButtons;  
  window.buildActivityButtons = async function() {  
    // Primero, deja que la función original construya los botones.  
    await originalBuildActivityButtons.apply(this, arguments);  
  
    // Luego, aplica tu filtro para deshabilitar los botones de actividades competenciales.  
    await filterCompetencyActivitiesFromFormula();  
  };  
  window.buildActivityButtons.isCompetencialPatched = true; // Marca la función como parcheada  
  console.log('✅ window.buildActivityButtons interceptado por competencial.js');  
} else if (!window.buildActivityButtons) {  
  console.warn('competencial.js: window.buildActivityButtons no encontrado. El filtro de fórmulas podría no funcionar.');  
}  
// ***** FIN CAMBIO CLAVE 3 *****  
  
  
async function filterCompetencyActivitiesFromFormula() {  
  try {  
    const db = window.firebase?.firestore?.();  
    if (!db) return;  
  
    // Damos un pequeño respiro para que el DOM se actualice con los botones  
    await new Promise(r => setTimeout(r, 50));   
  
    // Los botones de actividad están dentro de contenedores específicos en el modal de cálculo.  
    const activityButtonContainers = document.querySelectorAll('.activity-buttons-container');  
  
    for (const container of activityButtonContainers) {  
      const buttons = container.querySelectorAll('button[type="button"]');  
        
      for (const btn of buttons) {  
        let actName = btn.textContent.trim();  
        // Las actividades en el modal de cálculo pueden tener un prefijo de término, ej. "[TermName] ActivityName"  
        const termPrefixMatch = actName.match(/^.∗?\s*(.*)$/);
if (termPrefixMatch && termPrefixMatch[1]) {
actName = termPrefixMatch[1]; // Usar solo el nombre de la actividad
}
 plaintext// Buscar la actividad en Firestore para obtener su tipo de evaluación  
    const snapshot = await db.collection('activitats')  
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
console.error('competencial.js: Error filtrando actividades competenciales de fórmulas:', err);
}
}
console.log('🎓 Sistema de Evaluación Competencial - Cargado correctamente');
 plaintext
