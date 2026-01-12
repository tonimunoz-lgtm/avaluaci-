/**
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN
 * Se ejecuta automáticamente y añade botones sin modificar app.js
 * 
 * NOTA: Este archivo se ejecuta en global scope
 * Usa MutationObserver para detectar cambios en la tabla
 */

(function() {
  
  console.log('🔧 Evaluation Integration iniciando...');
  
  // Esperar a que EvaluationSystem esté listo
  let initAttempts = 0;
  const maxAttempts = 40;
  
  const waitForModules = setInterval(() => {
    initAttempts++;
    
    const hasEvalSystem = window.EvaluationSystem !== undefined;
    const hasEvalUI = window.EvaluationUI !== undefined;
    
    console.log(`⏳ Intento ${initAttempts}/${maxAttempts} - EvalSystem: ${hasEvalSystem}, EvalUI: ${hasEvalUI}`);
    
    if (hasEvalSystem && hasEvalUI) {
      clearInterval(waitForModules);
      console.log('✅ Sistemas de evaluación cargados, inicializando...');
      initializeEvaluationIntegration();
      return;
    }
    
    if (initAttempts >= maxAttempts) {
      console.error('❌ Timeout esperando módulos');
      clearInterval(waitForModules);
    }
  }, 300);

  function initializeEvaluationIntegration() {
    // Usar MutationObserver para detectar cambios en la tabla
    const tableWrapper = document.getElementById('notesTable-wrapper');
    
    if (!tableWrapper) {
      console.error('❌ notesTable-wrapper no encontrado');
      return;
    }

    const observer = new MutationObserver((mutations) => {
      console.log('🔍 Detectado cambio en tabla');
      setTimeout(() => {
        injectScaleButtons();
      }, 300);
    });

    observer.observe(tableWrapper, {
      childList: true,
      subtree: true,
      attributes: false
    });

    console.log('✅ MutationObserver configurado');
    
    // También inyectar botones ahora por si ya existe la tabla
    setTimeout(() => {
      injectScaleButtons();
    }, 1000);
  }

  /**
   * Inyectar botones de escala en el menú de cada actividad
   */
  function injectScaleButtons() {
    // Buscar menús dentro de headers de tabla
    const menus = document.querySelectorAll('thead th .menu');
    console.log(`📍 Encontrados ${menus.length} menús de actividades`);
    
    if (menus.length === 0) {
      return;
    }
    
    menus.forEach((menu, idx) => {
      // No duplicar si ya existe el botón
      if (menu.querySelector('.scale-btn')) {
        return;
      }
      
      const deleteBtn = menu.querySelector('.delete-btn');
      if (!deleteBtn) {
        return;
      }

      console.log(`✏️ Inyectando botones en menú ${idx}`);

      // Crear botón de escala
      const scaleBtn = document.createElement('button');
      scaleBtn.className = 'scale-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap';
      scaleBtn.textContent = '⚖️ Tipus avaluació';
      scaleBtn.type = 'button';
      scaleBtn.style.borderTop = '1px solid #e5e7eb';
      scaleBtn.style.marginTop = '4px';
      scaleBtn.style.paddingTop = '6px';
      scaleBtn.style.cursor = 'pointer';

      // Crear botón de rúbrica
      const rubricBtn = document.createElement('button');
      rubricBtn.className = 'rubric-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap';
      rubricBtn.textContent = '📋 Rúbrica';
      rubricBtn.type = 'button';
      rubricBtn.style.cursor = 'pointer';

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

        try {
          const scale = await EvaluationSystem.getActivityScale(activityId);
          console.log('📊 Escala actual:', scale.name);
          EvaluationUI.createActivityScaleModal(activityId, scale.id);
        } catch (err) {
          console.error('Error:', err);
          alert('Error: ' + err.message);
        }
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
          // ✅ CORRECCIÓN: reemplazamos db.collection por firebase.firestore().collection
          const activityDoc = await firebase.firestore().collection('activitats').doc(activityId).get();
          if (!activityDoc.exists) {
            alert('Activitat no trobada');
            return;
          }
          const activityName = activityDoc.data().nom;
          EvaluationUI.createRubricModal(activityId, activityName);
        } catch (err) {
          console.error('Error:', err);
          alert('Error: ' + err.message);
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
          let activityId = null;
          
          const openMenu = document.querySelector('thead th .menu:not(.hidden)');
          if (openMenu) {
            activityId = getActivityIdFromHeader(openMenu);
          }

          if (!activityId) {
            const inputs = document.querySelectorAll('input[data-activity-id]');
            if (inputs.length > 0) activityId = inputs[0].dataset.activityId;
          }
          
          if (!activityId) {
            alert('Selecciona una activitat primer (haz clic en ⋮ de una activitat o en una cel·la de nota)');
            return;
          }

          try {
            const studentDoc = await firebase.firestore().collection('alumnes').doc(studentId).get();
            if (!studentDoc.exists) return alert('Alumne no trobat');
            const studentData = studentDoc.data();
            
            const activityDoc = await firebase.firestore().collection('activitats').doc(activityId).get();
            if (!activityDoc.exists) return alert('Activitat no trobada');
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
        
        const lastBtn = buttonsContainer.children[buttonsContainer.children.length - 1];
        buttonsContainer.insertBefore(feedbackBtn, lastBtn);
      }, 100);
    };
    
    console.log('✅ Feedback button hook configurado');
  }

  // Ejecutar integraciones cuando los módulos estén listos
  setTimeout(() => {
    console.log('🚀 Ejecutando integraciones finales...');
    addFeedbackButton();
    console.log('✅ Integración completada');
  }, 2000);

})();
