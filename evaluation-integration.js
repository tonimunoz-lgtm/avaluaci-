/**
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN
 * Se ejecuta automáticamente y añade botones sin modificar app.js
 */

(function() {
  
  console.log('🔧 Evaluation Integration iniciando...');
  
  // Esperar a que EvaluationSystem esté listo
  let initAttempts = 0;
  const maxAttempts = 30;
  
  const waitForAppInit = setInterval(() => {
    initAttempts++;
    
    // Verificar que existan los sistemas de evaluación
    const hasEvalSystem = window.EvaluationSystem !== undefined;
    const hasEvalUI = window.EvaluationUI !== undefined;
    const hasRenderGrid = typeof window.renderNotesGrid === 'function';
    
    console.log(`⏳ Intento ${initAttempts}/${maxAttempts} - renderGrid: ${hasRenderGrid}, EvalSystem: ${hasEvalSystem}, EvalUI: ${hasEvalUI}`);
    
    if (hasEvalSystem && hasEvalUI && hasRenderGrid) {
      clearInterval(waitForAppInit);
      console.log('✅ Sistemas de evaluación cargados, inicializando...');
      initializeEvaluationIntegration();
      return;
    }
    
    if (initAttempts >= maxAttempts) {
      console.error('❌ Timeout: No se cargaron los módulos necesarios');
      clearInterval(waitForAppInit);
    }
  }, 500);

  async function initializeEvaluationIntegration() {
    // Hook en renderNotesGrid para inyectar opciones de escala
    const originalRenderNotesGrid = window.renderNotesGrid;
    
    window.renderNotesGrid = async function() {
      console.log('📊 renderNotesGrid ejecutándose...');
      
      // Ejecutar renderizado original
      const result = await originalRenderNotesGrid.call(this);
      
      // INYECTAR BOTONES DE ESCALA EN MENÚ DE ACTIVIDADES
      setTimeout(() => {
        console.log('💉 Inyectando botones...');
        injectScaleButtons();
      }, 500);
      
      return result;
    };
    
    console.log('✅ renderNotesGrid hooked correctamente');
  }

  /**
   * Inyectar botones de escala en el menú de cada actividad
   */
  function injectScaleButtons() {
    // Buscar menús dentro de headers de tabla
    const menus = document.querySelectorAll('thead th .menu');
    console.log(`📍 Encontrados ${menus.length} menús de actividades en el header`);
    
    if (menus.length === 0) {
      console.warn('⚠️ No se encontraron menús. La tabla puede estar vacía.');
      return;
    }
    
    menus.forEach((menu, idx) => {
      // No duplicar si ya existe el botón
      if (menu.querySelector('.scale-btn')) {
        console.log(`⏭️ Menú ${idx} ya tiene botones`);
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
        
        const activityId = getActivityIdFromHeader(menu);
        console.log('⚖️ Scale button clicked, activityId:', activityId);
        
        if (!activityId) {
          alert('Error identificando activitat');
          return;
        }

        const scale = await EvaluationSystem.getActivityScale(activityId);
        console.log('📊 Escala actual:', scale);
        EvaluationUI.createActivityScaleModal(activityId, scale.id);
      });

      rubricBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const activityId = getActivityIdFromHeader(menu);
        console.log('📋 Rubric button clicked, activityId:', activityId);
        
        if (!activityId) {
          alert('Error identificando activitat');
          return;
        }

        try {
          const activityDoc = await db.collection('activitats').doc(activityId).get();
          if (!activityDoc.exists) {
            alert('Activitat no trobada');
            return;
          }
          const activityName = activityDoc.data().nom;
          EvaluationUI.createRubricModal(activityId, activityName);
        } catch (err) {
          console.error('Error obteniendo actividad:', err);
          alert('Error obteniendo informació de l\'activitat');
        }
      });

      // Insertar botones en el menú (antes del delete)
      menu.insertBefore(rubricBtn, deleteBtn);
      menu.insertBefore(scaleBtn, deleteBtn);
      
      console.log(`✅ Botones inyectados en menú ${idx}`);
    });
  }

  /**
   * Obtener ID de actividad desde el header
   */
  function getActivityIdFromHeader(menuElement) {
    try {
      // Buscar el th que contiene este menú
      let th = menuElement.closest('th');
      if (!th) {
        console.error('❌ No se encontró th');
        return null;
      }

      // Obtener el índice de esta columna
      const headerRow = th.parentNode;
      const columnIndex = Array.from(headerRow.children).indexOf(th);
      
      console.log(`📍 Columna índice: ${columnIndex}`);

      // Buscar en el tbody
      const tbody = document.querySelector('tbody');
      if (!tbody) {
        console.error('❌ No se encontró tbody');
        return null;
      }

      const firstRow = tbody.querySelector('tr');
      if (!firstRow) {
        console.error('❌ No hay filas');
        return null;
      }

      const cellAtIndex = firstRow.children[columnIndex];
      if (!cellAtIndex) {
        console.error('❌ No se encontró celda en índice', columnIndex);
        return null;
      }

      const input = cellAtIndex.querySelector('input');
      if (!input || !input.dataset.activityId) {
        console.error('❌ No se encontró input o activity ID');
        return null;
      }

      const activityId = input.dataset.activityId;
      console.log(`✅ ActivityId encontrado: ${activityId}`);
      
      return activityId;
    } catch (e) {
      console.error('❌ Error obteniendo activityId:', e);
      return null;
    }
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
        
        const buttonsContainer = modal.querySelector('.flex.gap-2');
        if (!buttonsContainer) {
          console.warn('⚠️ No se encontró contenedor de botones');
          return;
        }

        const feedbackBtn = document.createElement('button');
        feedbackBtn.className = 'feedback-btn px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer border-none flex-1';
        feedbackBtn.textContent = '🤖 Generar feedback';
        feedbackBtn.type = 'button';
        
        feedbackBtn.addEventListener('click', async () => {
          // Detectar cuál es la actividad actual
          // Buscar si hay un menú abierto
          const openMenu = document.querySelector('thead th .menu:not(.hidden)');
          let activityId = null;
          
          if (openMenu) {
            activityId = getActivityIdFromHeader(openMenu);
          }
          
          // Si no hay menú abierto, buscar en app.js
          if (!activityId && window.currentCalcActivityId) {
            activityId = window.currentCalcActivityId;
          }
          
          if (!activityId) {
            alert('Selecciona una activitat primer (haz clic en ⋮ de una activitat)');
            return;
          }

          try {
            const studentDoc = await db.collection('alumnes').doc(studentId).get();
            if (!studentDoc.exists) {
              alert('Alumne no trobat');
              return;
            }
            const studentData = studentDoc.data();
            
            const activityDoc = await db.collection('activitats').doc(activityId).get();
            if (!activityDoc.exists) {
              alert('Activitat no trobada');
              return;
            }
            const activityName = activityDoc.data().nom;
            
            const score = studentData.notes?.[activityId] || '';
            
            console.log('🎯 Generando feedback para:', { studentName, activityName, score, activityId });
            
            EvaluationUI.createFeedbackModal(
              studentId,
              studentName,
              activityId,
              activityName,
              score
            );
          } catch (err) {
            console.error('Error generando feedback:', err);
            alert('Error: ' + err.message);
          }
        });
        
        // Insertar antes del botón Guardar
        buttonsContainer.insertBefore(feedbackBtn, buttonsContainer.children[buttonsContainer.children.length - 1]);
      }, 100);
    };
    
    console.log('✅ Feedback button hook configurado');
  }

  // Ejecutar integraciones cuando el sistema esté listo
  setTimeout(() => {
    console.log('🚀 Ejecutando integraciones finales...');
    addFeedbackButton();
    console.log('✅ Integración completada');
  }, 3000);

})();
