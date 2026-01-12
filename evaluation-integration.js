/**  
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN  
 * Se ejecuta automáticamente y añade botones sin modificar app.js  
 */  
  
(function() {  
  
  console.log('🔧 Evaluation Integration iniciando...');  
  
  // Usamos un flag para controlar si la inicialización principal ya ocurrió  
  let integrationInitialized = false;  
  
  // Esperar a que el entorno básico de app.js esté listo  
  const waitForAppInit = setInterval(() => {  
    // Verificamos si las variables clave que app.js ya expone al window están presentes.  
    // No verificamos renderNotesGrid aquí porque puede que no esté expuesta directamente  
    // o que su disponibilidad sea más tardía/dinámica.  
    if (!window.db || typeof window.currentClassId === 'undefined') {  
      console.log('⏳ Esperando app.js y variables globales...');  
      return;  
    }  
  
    clearInterval(waitForAppInit);  
    console.log('✅ App.js y variables globales cargadas, iniciando integración...');  
      
    // Una vez que el entorno básico está listo, intentamos hookear renderNotesGrid  
    // y el modal de comentarios. Esto se intentará SOLO UNA VEZ.  
    if (!integrationInitialized) {  
      initializeEvaluationIntegrationHooks();  
      integrationInitialized = true;  
    }  
  }, 500); // Ajusta este tiempo si los logs de espera siguen siendo excesivos  
  
  async function initializeEvaluationIntegrationHooks() {  
    // Intentar hookear renderNotesGrid, que es fundamental para los botones de actividad.  
    // Esto se hará de forma recurrente si renderNotesGrid no está presente al inicio.  
    attemptRenderNotesGridHook();  
  
    // Hookear el modal de comentarios (este debería ser más directo)  
    addFeedbackButtonToCommentsModal();  
  
    console.log('✅ Integración principal solicitada. Esperando renderizado de tabla...');  
  }  
  
  // --- Funciones para manejar el hook de renderNotesGrid y la inyección de botones ---  
  
  function attemptRenderNotesGridHook() {  
    // Si renderNotesGrid ya fue hookeado, no hacemos nada  
    if (window.__originalRenderNotesGridHooked) {  
      // console.log('renderNotesGrid ya está hookeado.');  
      return;  
    }  
  
    const originalRenderNotesGrid = window.renderNotesGrid;  
  
    if (!originalRenderNotesGrid) {  
      // Si renderNotesGrid aún no está disponible, lo reintentamos más tarde  
      // Esto es crucial para la restricción de no modificar app.js, ya que  
      // window.renderNotesGrid puede aparecer dinámicamente.  
      console.log('⚠️ renderNotesGrid aún no disponible. Reintentando hook en 1s...');  
      setTimeout(attemptRenderNotesGridHook, 1000);  
      return;  
    }  
  
    // Marca que ya hemos hookeado para no hacerlo de nuevo  
    window.__originalRenderNotesGridHooked = true;  
    window.renderNotesGrid = async function() {  
      // Ejecutar el renderizado original  
      const result = await originalRenderNotesGrid.call(this);  
  
      // INYECTAR BOTONES DE ESCALA Y RÚBRICA EN EL MENÚ DE ACTIVIDADES  
      // Damos un poco de tiempo para que la tabla se redibuje completamente  
      setTimeout(() => {  
        injectScaleAndRubricButtons();  
      }, 300); // Ajusta este tiempo si los botones no aparecen consistentemente  
  
      return result;  
    };  
    console.log('✅ renderNotesGrid hookeado con éxito.');  
  }  
  
  
  /**  
   * Inyectar botones de escala y rúbrica en el menú de cada actividad  
   */  
  function injectScaleAndRubricButtons() {  
    // Selector más específico para evitar conflictos y asegurar que sea el menú correcto  
    // Buscamos los menús dentro de los TH del THEAD de la tabla de notas  
    const menus = document.querySelectorAll('#notesThead th .menu');  
    // console.log(`📍 Encontrados ${menus.length} menús de actividades para inyección.`);  
  
    menus.forEach((menu) => {  
      // Obtener el TH padre del menú  
      const th = menu.closest('th');  
      if (!th) {  
        // console.warn('⚠️ Menú sin TH padre encontrado. Saltando inyección.');  
        return;  
      }  
  
      // El activityId se debe obtener de forma robusta.  
      // Podemos usar el dataset.id del TH si app.js lo pusiera ahí,  
      // pero como no podemos modificar app.js, lo deduciremos de otra forma.  
      // Sin embargo, ¡app.js ya pone un id de actividad en el TH que tiene el menú!  
      // Vamos a asumir que tu app.js lo está haciendo o lo hará.  
      // Si el TH no tiene un ID, es más complejo.  
      let activityId = null;  
      // Tu app.js en renderNotesGrid sí usa 'classActivities' y las 'actDocs'  
      // para construir el thead. El activityId debería poder obtenerse del contexto  
      // de la columna si app.js lo hubiera puesto en el TH.  
      // Pero como no lo hace, y no podemos modificar app.js,  
      // necesitamos una forma de deducirlo.  
  
      // La lógica en tu 'getActivityIdFromMenu' es intentar sacarlo del input.  
      // Esta lógica la llevamos aquí directamente y la mejoramos.  
  
      // Intentamos encontrar el activityId desde el input en la misma columna.  
      // Esto requiere que al menos una fila de tbody esté presente.  
      const columnIndex = Array.from(th.parentNode.children).indexOf(th);  
      if (columnIndex > 0) { // Ignoramos la primera columna 'Alumne'  
          const firstDataRow = document.querySelector('#notesTbody tr');  
          if (firstDataRow) {  
              const cellInColumn = firstDataRow.querySelector(`td:nth-child(${columnIndex + 1})`);  
              const inputInCell = cellInColumn ? cellInColumn.querySelector('input[data-activity-id]') : null;  
              if (inputInCell) {  
                  activityId = inputInCell.dataset.activityId;  
              }  
          }  
      }  
  
      if (!activityId) {  
        // Fallback: Si no se encontró el activityId, no se inyectan los botones.  
        // Esto ocurrirá para columnas no de actividad o si la estructura esperada no está.  
        // console.warn('⚠️ No se pudo determinar el activityId para este menú. Saltando inyección.');  
        return;  
      }  
        
      // No duplicar si ya existe el botón, usando un ID único por actividad.  
      if (menu.querySelector(`#scale-btn-${activityId}`)) {  
        // console.log(`⏭️ Menú para actividad ${activityId} ya tiene botones, saltando...`);  
        return;  
      }  
  
      const deleteBtn = menu.querySelector('.delete-btn');  
      if (!deleteBtn) {  
        // console.warn(`⏭️ Menú para actividad ${activityId} sin delete-btn. Saltando inyección.`);  
        return;  
      }  
  
      // console.log(`✏️ Inyectando botones en menú para actividad: ${activityId}`);  
  
      // Crear botón de escala  
      const scaleBtn = document.createElement('button');  
      scaleBtn.className = 'scale-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';  
      scaleBtn.textContent = '⚖️ Tipus avaluació';  
      scaleBtn.type = 'button';  
      scaleBtn.style.borderTop = '1px solid #e5e7eb';  
      scaleBtn.style.marginTop = '4px';  
      scaleBtn.style.paddingTop = '6px';  
      scaleBtn.id = `scale-btn-${activityId}`; // Añadimos un ID para evitar duplicados  
  
      // Crear botón de rúbrica  
      const rubricBtn = document.createElement('button');  
      rubricBtn.className = 'rubric-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';  
      rubricBtn.textContent = '📋 Rúbrica';  
      rubricBtn.type = 'button';  
      rubricBtn.id = `rubric-btn-${activityId}`; // Añadimos un ID para evitar duplicados  
  
  
      // --- Event Listeners para los nuevos botones ---  
      scaleBtn.addEventListener('click', async (e) => {  
        e.preventDefault();  
        e.stopPropagation(); // Evita que se cierre el menú inmediatamente  
        if (!activityId) return alert('Error: ID de actividad no encontrado.');  
        const scale = await EvaluationSystem.getActivityScale(activityId);  
        EvaluationUI.createActivityScaleModal(activityId, scale.id);  
        menu.classList.add('hidden'); // Oculta el menú después de clickear  
      });  
  
      rubricBtn.addEventListener('click', async (e) => {  
        e.preventDefault();  
        e.stopPropagation(); // Evita que se cierre el menú inmediatamente  
        if (!activityId) return alert('Error: ID de actividad no encontrado.');  
          
        // Asumiendo que window.db está disponible globalmente.  
        // Si no lo está, esta parte fallará y necesitaríamos un 'hack' más profundo.  
        const activityDoc = await window.db.collection('activitats').doc(activityId).get();  
        const activityName = activityDoc.exists ? activityDoc.data().nom : 'Actividad desconocida';  
  
        EvaluationUI.createRubricModal(activityId, activityName);  
        menu.classList.add('hidden'); // Oculta el menú después de clickear  
      });  
  
      // Insertar botones en el menú (antes del delete)  
      menu.insertBefore(rubricBtn, deleteBtn);  
      menu.insertBefore(scaleBtn, rubricBtn); // Insertar scaleBtn antes de rubricBtn  
        
      // console.log(`✅ Botones inyectados en menú para actividad: ${activityId}`);  
    });  
  }  
  
  /**  
   * Modifica el modal de comentarios para añadir el botón de feedback.  
   */  
  function addFeedbackButtonToCommentsModal() {  
    // Si el hook ya está, no hacemos nada (para evitar duplicados en re-intentos)  
    if (window.__commentsModalHooked) {  
      // console.log('openCommentsModal ya está hookeado.');  
      return;  
    }  
  
    const originalOpenComments = window.openCommentsModal;  
  
    if (!originalOpenComments) {  
      // Si openCommentsModal aún no está disponible, lo reintentamos.  
      // Esto es crucial para la restricción de no modificar app.js.  
      console.log('⚠️ openCommentsModal aún no disponible. Reintentando hook en 1s...');  
      setTimeout(addFeedbackButtonToCommentsModal, 1000);  
      return;  
    }  
      
    window.__commentsModalHooked = true; // Marca que ya hookeamos  
    window.openCommentsModal = function(studentId, studentName, currentComment) {  
      // Llamar original  
      originalOpenComments.call(this, studentId, studentName, currentComment);  
  
      // Agregar botón de feedback después de que el modal original esté creado  
      setTimeout(async () => { // Hacemos async el setTimeout para usar await dentro  
        const modal = document.getElementById('modalComments');  
        if (!modal) return; // Si el modal no se creó, salimos  
  
        // Aseguramos que el botón no se duplique si el modal se reusa  
        if (modal.querySelector('.feedback-btn-ai')) return;  
  
        const saveBtn = modal.querySelector('.flex-1:nth-of-type(2)'); // Botón "Guardar"  
        if (saveBtn) {  
          const feedbackBtn = document.createElement('button');  
          feedbackBtn.className = 'feedback-btn-ai px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer border-none';  
          feedbackBtn.textContent = '🤖 Generar feedback AI';  
          feedbackBtn.style.marginRight = '8px';  
          feedbackBtn.type = 'button';  
  
          feedbackBtn.addEventListener('click', async () => {  
              // Obtener la actividad seleccionada para el feedback  
              const selectActivityForFeedback = document.getElementById('selectActivityForFeedback');  
              if (!selectActivityForFeedback || !selectActivityForFeedback.value) {  
                  alert('Por favor, selecciona una actividad para generar el feedback.');  
                  return;  
              }  
              const selectedActivityId = selectActivityForFeedback.value;  
              const selectedActivityName = selectActivityForFeedback.options[selectActivityForFeedback.selectedIndex].text;  
  
              // Asumiendo que window.db está disponible globalmente.  
              const studentDoc = await window.db.collection('alumnes').doc(studentId).get();  
              const studentData = studentDoc.exists ? studentDoc.data() : {};  
  
              const score = studentData.notes?.[selectedActivityId] || '';  
  
              // Cerrar el modal actual de comentarios antes de abrir el de feedback  
              window.closeCommentsModal();  
  
              EvaluationUI.createFeedbackModal(  
                  studentId,  
                  studentName,  
                  selectedActivityId,  
                  selectedActivityName,  
                  score  
              );  
          });  
  
          // Insertar antes del botón "Guardar"  
          saveBtn.parentNode.insertBefore(feedbackBtn, saveBtn);  
  
          // AÑADIR SELECTOR DE ACTIVIDADES al modal de comentarios  
          const textarea = document.getElementById('commentTextarea');  
          if (textarea) {  
              const activitySelectContainer = document.createElement('div');  
              activitySelectContainer.className = 'flex flex-col gap-2 mb-2 p-2 bg-gray-50 rounded border border-gray-200';  
              activitySelectContainer.innerHTML = `  
                  <label for="selectActivityForFeedback" class="text-sm font-semibold text-gray-700">Selecciona activitat per feedback AI:</label>  
                  <select id="selectActivityForFeedback" class="w-full p-2 border rounded bg-white"></select>  
              `;  
              // Insertar el selector justo después del título del modal  
              const titleEl = modal.querySelector('.bg-white h2');  
              if (titleEl) {  
                  titleEl.after(activitySelectContainer);  
              } else {  
                  // Fallback si no se encuentra el h2, insertar antes del textarea  
                  textarea.before(activitySelectContainer);  
              }  
  
  
              const selectElement = document.getElementById('selectActivityForFeedback');  
              const defaultOption = document.createElement('option');  
              defaultOption.value = '';  
              defaultOption.textContent = '--- Selecciona una activitat ---';  
              selectElement.appendChild(defaultOption);  
  
              // Asumiendo que window.classActivities está disponible globalmente  
              if (window.classActivities && window.classActivities.length > 0) {  
                  // Obtener nombres de actividad de forma asíncrona y poblar  
                  // Usamos Promise.all para esperar a que todas las actividades se carguen  
                  const activityPromises = window.classActivities.map(actId =>  
                      window.db.collection('activitats').doc(actId).get().then(doc => {  
                          if (doc.exists) {  
                              return { id: actId, nom: doc.data().nom };  
                          }  
                          return null;  
                      }).catch(e => {  
                          console.error(`Error al cargar actividad ${actId} para selector:`, e);  
                          return null;  
                      })  
                  );  
  
                  const activities = await Promise.all(activityPromises);  
                  activities.filter(Boolean).forEach(act => { // Filtrar nulos  
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
        }  
      }, 100); // Pequeño retardo para que el modal de comentarios termine de renderizarse  
    };  
    console.log('✅ openCommentsModal hookeado con éxito.');  
  }  
  
})();  
