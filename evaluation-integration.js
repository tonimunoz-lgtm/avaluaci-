/**  
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN  
 * Se ejecuta automáticamente y añade botones sin modificar app.js  
 */  
  
(function() {  
  
  console.log('🔧 Evaluation Integration iniciando...');  
  
  // Esperar a que DOM esté listo y app.js esté cargado  
  const waitForAppInit = setInterval(() => {  
    // Es importante verificar también que renderNotesGrid ya esté definida por app.js  
    // currentClassId puede ser null/undefined si no hay clase abierta, pero window.db y renderNotesGrid deben estar.  
    if (!window.db || typeof window.renderNotesGrid === 'undefined') {  
      console.log('⏳ Esperando app.js y renderNotesGrid...');  
      return;  
    }  
  
    clearInterval(waitForAppInit);  
    console.log('✅ App.js y renderNotesGrid cargados, inicializando integración...');  
    initializeEvaluationIntegration();  
  }, 500); // Puedes ajustar este tiempo si sigues viendo "Esperando..." muchas veces  
  
  async function initializeEvaluationIntegration() {  
    // Hook en renderNotesGrid para inyectar opciones de escala  
    const originalRenderNotesGrid = window.renderNotesGrid;  
  
    if (!originalRenderNotesGrid) {  
      console.error('❌ renderNotesGrid no encontrado al intentar hookear. Esto no debería pasar si la comprobación anterior funcionó.');  
      return;  
    }  
  
    window.renderNotesGrid = async function() {  
      // Ejecutar renderizado original  
      const result = await originalRenderNotesGrid.call(this);  
  
      // INYECTAR BOTONES DE ESCALA EN MENÚ DE ACTIVIDADES  
      // Aumentamos el setTimeout para asegurarnos de que el DOM esté completamente renderizado  
      // y que los elementos a los que queremos inyectar existan.  
      setTimeout(() => {  
        injectScaleAndRubricButtons();  
      }, 500); // Aumentado a 500ms. Si aún fallas, prueba 1000ms.  
  
      // Inyectar el botón de feedback aquí en lugar de un setTimeout global  
      // Esto asegura que el hook de openCommentsModal se haga solo una vez  
      if (!window.__feedbackButtonHooked) { // Controlamos que el hook solo se haga una vez  
          addFeedbackButtonToCommentsModal();  
          window.__feedbackButtonHooked = true;  
      }  
  
      return result;  
    };  
  
    console.log('✅ renderNotesGrid hooked');  
  }  
  
  /**  
   * Inyectar botones de escala y rúbrica en el menú de cada actividad  
   */  
  function injectScaleAndRubricButtons() {  
    // Selector más específico para evitar conflictos y asegurar que sea el menú correcto  
    // Buscamos los menús dentro de los TH del THEAD de la tabla de notas  
    const menus = document.querySelectorAll('#notesThead th .menu');  
    console.log(`📍 Encontrados ${menus.length} menús de actividades para inyección.`);  
  
    menus.forEach((menu) => {  
      // Obtener el TH padre del menú  
      const th = menu.closest('th');  
      if (!th) {  
        console.warn('⚠️ Menú sin TH padre encontrado. Saltando inyección.');  
        return;  
      }  
  
      // Obtener el activityId directamente desde el input dentro del TR del Tbody  
      // Esto es más robusto que inferir el ID por posición de columna si el THEAD cambia.  
      // Necesitamos una actividad activa para obtener su ID.  
      let activityId = null;  
      const firstRowInTbody = document.querySelector('#notesTbody tr');  
      if (firstRowInTbody) {  
        // Encontrar el input dentro de la celda de la misma columna que el TH actual  
        // que contenga el activityId.  
        const headerCells = Array.from(document.querySelectorAll('#notesThead th'));  
        const currentColumnIndex = headerCells.indexOf(th);  
  
        if (currentColumnIndex > 0) { // La primera columna es "Alumne", no una actividad  
          const activityInput = firstRowInTbody.querySelector(`td:nth-child(${currentColumnIndex + 1}) input[data-activity-id]`);  
          if (activityInput) {  
            activityId = activityInput.dataset.activityId;  
          }  
        }  
      }  
  
      if (!activityId) {  
        console.warn('⚠️ No se pudo determinar el activityId para un menú de actividad. Saltando inyección de botones de escala/rúbrica.');  
        return;  
      }  
  
      // No duplicar si ya existe el botón. Buscamos el ID que se usará en el botón.  
      if (menu.querySelector(`#scale-btn-${activityId}`)) {  
        // console.log(`⏭️ Menú para actividad ${activityId} ya tiene botones, saltando...`);  
        return;  
      }  
  
      const deleteBtn = menu.querySelector('.delete-btn');  
      if (!deleteBtn) {  
        console.warn(`⏭️ Menú para actividad ${activityId} sin delete-btn. Saltando inyección.`);  
        return;  
      }  
  
      console.log(`✏️ Inyectando botones en menú para actividad: ${activityId}`);  
  
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
        const activityDoc = await db.collection('activitats').doc(activityId).get();  
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
   * Ahora este botón permitirá seleccionar la actividad.  
   */  
  function addFeedbackButtonToCommentsModal() {  
    const originalOpenComments = window.openCommentsModal;  
  
    if (!originalOpenComments) {  
      console.warn('⚠️ openCommentsModal no encontrado. No se puede inyectar el botón de feedback.');  
      return;  
    }  
  
    window.openCommentsModal = function(studentId, studentName, currentComment) {  
      // Llamar original  
      originalOpenComments.call(this, studentId, studentName, currentComment);  
  
      // Agregar botón de feedback después de que el modal original esté creado  
      setTimeout(() => {  
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
  
              const studentDoc = await db.collection('alumnes').doc(studentId).get();  
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
              // Insertar el selector antes del textarea o justo después del título  
              modal.querySelector('.bg-white h2').after(activitySelectContainer);  
  
              const selectElement = document.getElementById('selectActivityForFeedback');  
              const defaultOption = document.createElement('option');  
              defaultOption.value = '';  
              defaultOption.textContent = '--- Selecciona una activitat ---';  
              selectElement.appendChild(defaultOption);  
  
              // Poblar el selector con las actividades del término actual  
              if (window.classActivities && window.classActivities.length > 0) {  
                  window.classActivities.forEach(actId => {  
                      db.collection('activitats').doc(actId).get().then(doc => {  
                          if (doc.exists) {  
                              const option = document.createElement('option');  
                              option.value = actId;  
                              option.textContent = doc.data().nom;  
                              selectElement.appendChild(option);  
                          }  
                      }).catch(e => console.error("Error al cargar actividad para selector:", e));  
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
  }  
  
  // Comentar esta sección para que los hooks se manejen dentro de initializeEvaluationIntegration  
  // setTimeout(() => {  
  //   console.log('🚀 Ejecutando integraciones finales...');  
  //   addFeedbackButton();  
  //   console.log('✅ Integración completada');  
  // }, 1500);  
  
})();  
