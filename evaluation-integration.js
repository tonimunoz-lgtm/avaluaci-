/**
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN
 * Se ejecuta automáticamente y añade botones sin modificar app.js
 */

(function() {
  
  console.log('🔧 Evaluation Integration iniciando...');
  
  // Esperar a que DOM esté listo y app.js esté cargado
  const waitForAppInit = setInterval(() => {
    if (!window.db || !window.currentClassId === undefined) {
      console.log('⏳ Esperando app.js...');
      return;
    }
    
    clearInterval(waitForAppInit);
    console.log('✅ App.js cargado, inicializando integración...');
    initializeEvaluationIntegration();
  }, 500);

  async function initializeEvaluationIntegration() {
    // Hook en renderNotesGrid para inyectar opciones de escala
    const originalRenderNotesGrid = window.renderNotesGrid;
    
    if (!originalRenderNotesGrid) {
      console.error('❌ renderNotesGrid no encontrado');
      return;
    }
    
    window.renderNotesGrid = async function() {
      // Ejecutar renderizado original
      const result = await originalRenderNotesGrid.call(this);
      
      // INYECTAR BOTONES DE ESCALA EN MENÚ DE ACTIVIDADES
      setTimeout(() => {
        injectScaleButtons();
      }, 200);
      
      return result;
    };
    
    console.log('✅ renderNotesGrid hooked');
  }

  /**
   * Inyectar botones de escala en el menú de cada actividad
   */
  function injectScaleButtons() {
    const menus = document.querySelectorAll('th .menu');
    console.log(`📍 Encontrados ${menus.length} menús de actividades`);
    
    menus.forEach((menu, idx) => {
      // No duplicar si ya existe el botón
      if (menu.querySelector('.scale-btn')) {
        console.log(`⏭️ Menú ${idx} ya tiene botones, saltando...`);
        return;
      }
      
      const deleteBtn = menu.querySelector('.delete-btn');
      if (!deleteBtn) {
        console.log(`⏭️ Menú ${idx} sin delete-btn`);
        return;
      }

      console.log(`✏️ Inyectando botones en menú ${idx}`);

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
        console.log('🔄 Escala button clicked, activityId:', activityId);
        
        if (!activityId) {
          alert('Error identificando activitat');
          return;
        }

        const scale = await EvaluationSystem.getActivityScale(activityId);
        EvaluationUI.createActivityScaleModal(activityId, scale.id);
      });

      rubricBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const activityId = getActivityIdFromMenu(menu);
        console.log('📋 Rúbrica button clicked, activityId:', activityId);
        
        if (!activityId) {
          alert('Error identificando activitat');
          return;
        }

        const activityDoc = await db.collection('activitats').doc(activityId).get();
        const activityName = activityDoc.data().nom;

        EvaluationUI.createRubricModal(activityId, activityName);
      });

      // Insertar botones en el menú (antes del delete)
      menu.insertBefore(rubricBtn, deleteBtn);
      menu.insertBefore(scaleBtn, deleteBtn);
      
      console.log(`✅ Botones inyectados en menú ${idx}`);
    });
  }

  /**
   * Obtener ID de actividad desde el elemento del menú
   */
  function getActivityIdFromMenu(menu) {
    // El menú está dentro de un th
    let th = menu.closest('th');
    
    if (!th) {
      console.error('❌ No se encontró th para este menú');
      return null;
    }

    // Obtener el índice de esta columna en el header
    const headerRow = th.parentNode;
    const columnIndex = Array.from(headerRow.children).indexOf(th);
    
    console.log(`📍 Columna índice: ${columnIndex}`);

    // Buscar en el tbody la primera fila, columna correspondiente
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
    console.log(`✅ ActivityId encontrado: ${activityId}`);
    
    return activityId;
  }

  /**
   * Inyectar botón de feedback en el modal de comentarios
   */
  function addFeedbackButton() {
    const originalOpenComments = window.openCommentsModal;
    
    if (!originalOpenComments) {
      console.warn('⚠️ openCommentsModal no encontrado');
      return;
    }
    
    window.openCommentsModal = function(studentId, studentName, currentComment) {
      // Llamar original
      originalOpenComments.call(this, studentId, studentName, currentComment);
      
      // Agregar botón de feedback
      setTimeout(() => {
        const modal = document.getElementById('modalComments');
        if (!modal || modal.querySelector('.feedback-btn')) return;
        
        const saveBtn = modal.querySelector('.flex-1:nth-of-type(2)');
        if (saveBtn) {
          const feedbackBtn = document.createElement('button');
          feedbackBtn.className = 'feedback-btn px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer border-none';
          feedbackBtn.textContent = '🤖 Generar feedback';
          feedbackBtn.style.marginRight = '8px';
          feedbackBtn.type = 'button';
          
          feedbackBtn.addEventListener('click', async () => {
            const currentActivityId = window.currentCalcActivityId;
            if (!currentActivityId) {
              alert('Selecciona una activitat primer');
              return;
            }

            const studentDoc = await db.collection('alumnes').doc(studentId).get();
            const studentData = studentDoc.data();
            
            const activityDoc = await db.collection('activitats').doc(currentActivityId).get();
            const activityName = activityDoc.data().nom;
            
            const score = studentData.notes?.[currentActivityId] || '';
            
            EvaluationUI.createFeedbackModal(
              studentId,
              studentName,
              currentActivityId,
              activityName,
              score
            );
          });
          
          saveBtn.parentNode.insertBefore(feedbackBtn, saveBtn);
        }
      }, 100);
    };
  }

  // Ejecutar integraciones cuando el sistema esté listo
  setTimeout(() => {
    console.log('🚀 Ejecutando integraciones finales...');
    addFeedbackButton();
    console.log('✅ Integración completada');
  }, 1500);

})();
