/**  
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN  
 * Se ejecuta automáticamente y añade botones sin modificar app.js  
 */  
  
// *******************************************************************  
// CORRECCIÓN CLAVE 1: PATRÓN SINGLETON para evitar ejecuciones duplicadas  
// *******************************************************************  
if (window.__evaluationIntegrationIsRunning) {  
  console.warn('⚠️ evaluation-integration.js ya está en ejecución. Ignorando carga duplicada.');  
} else {  
  window.__evaluationIntegrationIsRunning = true; // Establecer flag global  
  console.log('🔧 Evaluation Integration: Ejecutando instancia única.');  
  
  (function() { // Envuelve todo el código en una IIFE para aislamiento de scope  
  
    console.log('🔧 Evaluation Integration iniciando...');  
      
    // Una variable para controlar que los hooks principales solo se establezcan una vez  
    let mainHooksEstablished = false;  
  
    // Esperar a que app.js esté listo  
    const waitForAppInit = setInterval(() => {  
      // ***********************************************************************************  
      // CORRECCIÓN CLAVE 2: Condición de espera más precisa para window.db y currentClassId  
      // ***********************************************************************************  
      // Esperamos hasta que window.db tenga un valor (no null/undefined)  
      // Y esperamos a que window.currentClassId tenga un valor que no sea null o undefined.  
      // app.js inicializa currentClassId en null, y luego le asigna un ID.  
      if (!window.db || !window.currentClassId) { // Simplificado y correcto  
        console.log('⏳ Esperando app.js (window.db y window.currentClassId válidos)...');  
        return;  
      }  
        
      clearInterval(waitForAppInit); // Detener el intervalo de espera  
      console.log('✅ App.js (window.db y window.currentClassId) cargado y válido. Inicializando integración...');  
        
      // Asegurarse de que los hooks principales solo se establezcan una vez  
      if (!mainHooksEstablished) {  
        initializeEvaluationIntegration();  
        mainHooksEstablished = true;  
      }  
    }, 500); // Puedes ajustar este tiempo si el inicio es más lento  
  
    async function initializeEvaluationIntegration() {  
      // --- Hook renderNotesGrid ---  
      // Usamos un flag interno para el hook de renderNotesGrid para evitar duplicados  
      if (!window.__renderNotesGridHookedOnce) {  
        const originalRenderNotesGrid = window.renderNotesGrid;  
        if (!originalRenderNotesGrid) {  
            console.error('❌ renderNotesGrid no encontrado para hook. Reintentando...');  
            // Si no se encuentra, reintentar el hook completo después de un breve tiempo  
            // Esto es crucial porque renderNotesGrid puede no estar disponible  
            // inmediatamente después de que currentClassId se vuelva válido.  
            setTimeout(initializeEvaluationIntegration, 500);  
            return;  
        }  
        window.__renderNotesGridHookedOnce = true;  
        window.renderNotesGrid = async function() {  
            const result = await originalRenderNotesGrid.call(this);  
            setTimeout(() => {  
                injectScaleButtons(); // Inyecta botones en los menús de actividad  
            }, 300); // Un pequeño retardo para asegurar que el DOM esté listo  
            return result;  
        };  
        console.log('✅ renderNotesGrid hookeado.');  
      } else {  
          console.log('renderNotesGrid ya está hookeado.');  
      }  
  
  
      // --- Hook openCommentsModal ---  
      // Usamos un flag interno para el hook de openCommentsModal para evitar duplicados  
      if (!window.__openCommentsModalHookedOnce) {  
        const originalOpenComments = window.openCommentsModal;  
        if (!originalOpenComments) {  
            console.warn('⚠️ openCommentsModal no encontrado para hook. Reintentando...');  
            setTimeout(initializeEvaluationIntegration, 500); // Reintentar si no está  
            return;  
        }  
        window.__openCommentsModalHookedOnce = true;  
        window.openCommentsModal = function(studentId, studentName, currentComment) {  
          originalOpenComments.call(this, studentId, studentName, currentComment);  
          // Usar setTimeout para agregar el botón de feedback DESPUÉS de que el modal se haya renderizado  
          setTimeout(async () => { // Hacemos async para usar await dentro  
            const modal = document.getElementById('modalComments');  
            if (!modal) return;  
            if (modal.querySelector('.feedback-btn-ai')) return; // Ya existe, no duplicar  
  
            const saveBtn = modal.querySelector('.flex-1:nth-of-type(2)');  
            if (saveBtn) {  
              const feedbackBtn = document.createElement('button');  
              feedbackBtn.className = 'feedback-btn-ai px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer border-none';  
              feedbackBtn.textContent = '🤖 Generar feedback AI';  
              feedbackBtn.style.marginRight = '8px';  
              feedbackBtn.type = 'button';  
  
              feedbackBtn.addEventListener('click', async () => {  
                  const selectActivityForFeedback = document.getElementById('selectActivityForFeedback');  
                  if (!selectActivityForFeedback || !selectActivityForFeedback.value) {  
                      alert('Por favor, selecciona una actividad para generar el feedback.');  
                      return;  
                  }  
                  const selectedActivityId = selectActivityForFeedback.value;  
                  const selectedActivityName = selectActivityForFeedback.options[selectActivityForFeedback.selectedIndex].text;  
  
                  // Asumimos que window.db está disponible globalmente  
                  const studentDoc = await window.db.collection('alumnes').doc(studentId).get();  
                  const studentData = studentDoc.exists ? studentDoc.data() : {};  
                    
                  // Asumimos que EvaluationSystem es global  
                  const activityScale = await EvaluationSystem.getActivityScale(selectedActivityId);  
                  const score = studentData.notes?.[selectedActivityId] || '';  
                    
                  window.closeCommentsModal(); // Cerrar modal actual  
                  EvaluationUI.createFeedbackModal(studentId, studentName, selectedActivityId, selectedActivityName, score);  
              });  
              saveBtn.parentNode.insertBefore(feedbackBtn, saveBtn);  
  
              // Añadir selector de actividades al modal de comentarios  
              const titleEl = modal.querySelector('.bg-white h2');  
              const activitySelectContainer = document.createElement('div');  
              activitySelectContainer.className = 'flex flex-col gap-2 mb-2 p-2 bg-gray-50 rounded border border-gray-200';  
              activitySelectContainer.innerHTML = `  
                  <label for="selectActivityForFeedback" class="text-sm font-semibold text-gray-700">Selecciona activitat per feedback AI:</label>  
                  <select id="selectActivityForFeedback" class="w-full p-2 border rounded bg-white"></select>  
              `;  
              if (titleEl) titleEl.after(activitySelectContainer);  
              else modal.querySelector('#commentTextarea').before(activitySelectContainer);  
  
              const selectElement = document.getElementById('selectActivityForFeedback');  
              const defaultOption = document.createElement('option');  
              defaultOption.value = '';  
              defaultOption.textContent = '--- Selecciona una activitat ---';  
              selectElement.appendChild(defaultOption);  
  
              // Poblar el selector de actividades  
              // Asumimos que window.classActivities está disponible globalmente  
              if (window.classActivities && window.classActivities.length > 0) {  
                  const activityPromises = window.classActivities.map(actId =>  
                      window.db.collection('activitats').doc(actId).get().then(doc => {  
                          if (doc.exists) return { id: actId, nom: doc.data().nom };  
                          return null;  
                      }).catch(e => {  
                          console.error(`Error al cargar actividad ${actId} para selector:`, e);  
                          return null;  
                      })  
                  );  
                  const activities = await Promise.all(activityPromises);  
                  activities.filter(Boolean).forEach(act => {  
                      const option = document.createElement('option');  
                      option.value = act.id;  
                      option.textContent = act.nom;  
                      selectElement.appendChild(option);  
                  });  
              } else {  
                  const noActivitiesOption = document.createElement('option');  
                  noActivitiesOption.value = '';  
                  noActivitiesOption.textContent = 'No hi ha activitats en aquest terme.';  
                  noActivitiesOption.disabled = true;  
                  selectElement.appendChild(noActivitiesOption);  
              }  
            }  
          }, 100); // Pequeño retardo  
        };  
        console.log('✅ openCommentsModal hookeado.');  
      } else {  
          console.log('openCommentsModal ya está hookeado.');  
      }  
  
      console.log('🚀 Ejecutando integraciones finales...');  
      console.log('✅ Integración completada.');  
  
    } // Fin de initializeEvaluationIntegration  
  
    /**  
     * Inyectar botones de escala en el menú de cada actividad  
     * (El resto de esta función es igual que en tu código original, solo copiado para contexto)  
     */  
    function injectScaleButtons() {  
      const menus = document.querySelectorAll('th .menu');  
      // console.log(`📍 Encontrados ${menus.length} menús de actividades`);  
        
      menus.forEach((menu, idx) => {  
        // No duplicar si ya existe el botón  
        if (menu.querySelector('.scale-btn')) {  
          // console.log(`⏭️ Menú ${idx} ya tiene botones, saltando...`);  
          return;  
        }  
          
        const deleteBtn = menu.querySelector('.delete-btn');  
        if (!deleteBtn) {  
          // console.log(`⏭️ Menú ${idx} sin delete-btn`);  
          return;  
        }  
  
        // console.log(`✏️ Inyectando botones en menú ${idx}`);  
  
        // Crear botón de escala  
        const scaleBtn = document.createElement('button');  
        scaleBtn.className = 'scale-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';  
        scaleBtn.textContent = '⚖️ Tipus avaluació';  
        scaleBtn.type = 'button';  
        scaleBtn.style.borderTop = '1px solid #e5e7eb';  
        scaleBtn.style.marginTop = '4px';  
        scaleBtn.style.paddingTop = '6px';  
  
        // Crear botón de rúbrica  
        const rubricBtn = document.createElement('button');  
        rubricBtn.className = 'rubric-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';  
        rubricBtn.textContent = '📋 Rúbrica';  
        rubricBtn.type = 'button';  
  
        // Event listeners  
        scaleBtn.addEventListener('click', async (e) => {  
          e.preventDefault();  
          e.stopPropagation();  
            
          const activityId = getActivityIdFromMenu(menu);  
          // console.log('🔄 Escala button clicked, activityId:', activityId);  
            
          if (!activityId) {  
            alert('Error identificando activitat');  
            return;  
          }  
  
          // Asumimos que EvaluationSystem es global  
          const scale = await EvaluationSystem.getActivityScale(activityId);  
          // Asumimos que EvaluationUI es global  
          EvaluationUI.createActivityScaleModal(activityId, scale.id);  
          menu.classList.add('hidden'); // Ocultar el menú al hacer clic  
        });  
  
        rubricBtn.addEventListener('click', async (e) => {  
          e.preventDefault();  
          e.stopPropagation();  
            
          const activityId = getActivityIdFromMenu(menu);  
          // console.log('📋 Rúbrica button clicked, activityId:', activityId);  
            
          if (!activityId) {  
            alert('Error identificando activitat');  
            return;  
          }  
  
          // Asumimos que db es global  
          const activityDoc = await window.db.collection('activitats').doc(activityId).get();  
          const activityName = activityDoc.data().nom;  
  
          // Asumimos que EvaluationUI es global  
          EvaluationUI.createRubricModal(activityId, activityName);  
          menu.classList.add('hidden'); // Ocultar el menú al hacer clic  
        });  
  
        // Insertar botones en el menú (antes del delete)  
        menu.insertBefore(rubricBtn, deleteBtn);  
        menu.insertBefore(scaleBtn, rubricBtn); // Insertar scaleBtn antes de rubricBtn  
          
        // console.log(`✅ Botones inyectados en menú ${idx}`);  
      });  
    }  
  
    /**  
     * Obtener ID de actividad desde el elemento del menú  
     * (Esta función es igual que en tu código original)  
     */  
    function getActivityIdFromMenu(menu) {  
      let th = menu.closest('th');  
      if (!th) {  
        console.error('❌ No se encontró th para este menú');  
        return null;  
      }  
  
      const headerRow = th.parentNode;  
      const columnIndex = Array.from(headerRow.children).indexOf(th);  
        
      // console.log(`📍 Columna índice: ${columnIndex}`);  
  
      const tbody = document.querySelector('tbody');  
      if (!tbody) {  
        console.error('❌ No se encontró tbody');  
        return null;  
      }  
  
      const firstRow = tbody.querySelector('tr');  
      if (!firstRow) {  
        console.error('❌ No hay filas en tbody');  
        return null;  
      }  
  
      const cellAtIndex = firstRow.children[columnIndex];  
      if (!cellAtIndex) {  
        console.error('❌ No se encontró celda en índice', columnIndex);  
        return null;  
      }  
  
      const input = cellAtIndex.querySelector('input');  
      if (!input) {  
        console.error('❌ No se encontró input en celda');  
        return null;  
      }  
  
      const activityId = input.dataset.activityId;  
      // console.log(`✅ ActivityId encontrado: ${activityId}`);  
        
      return activityId;  
    }  
  
  })(); // Fin de la IIFE  
} // Fin del Singleton  
