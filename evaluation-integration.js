/**
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN
 * Se ejecuta automáticamente y añade botones sin modificar app.js
 * 
 * NOTA: Este archivo se ejecuta en global scope
 * Usa MutationObserver para detectar cambios en la tabla
 */

(function() {
  
  console.log('🔧 Evaluation Integration iniciando...');
  
  // Esperar a que EvaluationSystem y EvaluationUI estén listos
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
    const tableWrapper = document.getElementById('notesTable-wrapper');
    if (!tableWrapper) {
      console.error('❌ notesTable-wrapper no encontrado');
      return;
    }

    const observer = new MutationObserver((mutations) => {
      console.log('🔍 Detectado cambio en tabla');
      setTimeout(() => {
        injectScaleButtons();
        replaceInputsBasedOnScale();
      }, 300);
    });

    observer.observe(tableWrapper, {
      childList: true,
      subtree: true,
      attributes: false
    });

    console.log('✅ MutationObserver configurado');

    // Inicializar botones y inputs al cargar
    setTimeout(() => {
      injectScaleButtons();
      replaceInputsBasedOnScale();
    }, 1000);
  }

  /**
   * Inyectar botones de escala en el menú de cada actividad
   */
  function injectScaleButtons() {
    const menus = document.querySelectorAll('thead th .menu');
    console.log(`📍 Encontrados ${menus.length} menús de actividades`);
    
    if (menus.length === 0) return;
    
    menus.forEach((menu, idx) => {
      if (menu.querySelector('.scale-btn')) return;
      const deleteBtn = menu.querySelector('.delete-btn');
      if (!deleteBtn) return;

      console.log(`✏️ Inyectando botones en menú ${idx}`);

      const scaleBtn = document.createElement('button');
      scaleBtn.className = 'scale-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap';
      scaleBtn.textContent = '⚖️ Tipus avaluació';
      scaleBtn.type = 'button';
      scaleBtn.style.borderTop = '1px solid #e5e7eb';
      scaleBtn.style.marginTop = '4px';
      scaleBtn.style.paddingTop = '6px';
      scaleBtn.style.cursor = 'pointer';

      const rubricBtn = document.createElement('button');
      rubricBtn.className = 'rubric-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap';
      rubricBtn.textContent = '📋 Rúbrica';
      rubricBtn.type = 'button';
      rubricBtn.style.cursor = 'pointer';

      scaleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activityId = getActivityIdFromHeader(menu);
        console.log('⚖️ Scale button clicked, activityId:', activityId);
        if (!activityId) return alert('Error identificando activitat');
        try {
          const scale = await EvaluationSystem.getActivityScale(activityId);
          EvaluationUI.createActivityScaleModal(activityId, scale.id);

          // Hook: cuando se guarde la escala, actualizar los inputs
          const originalSave = EvaluationUI.createActivityScaleModal;
          EvaluationUI.createActivityScaleModal = async function(actId, currentScaleId) {
            await originalSave(actId, currentScaleId);
            replaceInputsForActivity(actId);
          };

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
        if (!activityId) return alert('Error identificando activitat');
        try {
          const activityDoc = await firebase.firestore().collection('activitats').doc(activityId).get();
          if (!activityDoc.exists) return alert('Activitat no trobada');
          const activityName = activityDoc.data().nom;
          EvaluationUI.createRubricModal(activityId, activityName);
        } catch (err) {
          console.error('Error:', err);
          alert('Error: ' + err.message);
        }
      });

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
      let th = menuElement.closest('th');
      if (!th) return null;
      const headerRow = th.parentNode;
      const columnIndex = Array.from(headerRow.children).indexOf(th);
      const tbody = document.querySelector('tbody');
      if (!tbody) return null;
      const firstRow = tbody.querySelector('tr');
      if (!firstRow) return null;
      const cellAtIndex = firstRow.children[columnIndex];
      if (!cellAtIndex) return null;
      const input = cellAtIndex.querySelector('input, select');
      if (!input || !input.dataset.activityId) return null;
      return input.dataset.activityId;
    } catch (e) {
      console.error('❌ Error obteniendo activityId:', e);
      return null;
    }
  }

  /**
   * Reemplazar todos los inputs según su escala
   */
  async function replaceInputsBasedOnScale() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.children;
      for (const cell of cells) {
        const input = cell.querySelector('input, select');
        if (!input || !input.dataset.activityId) continue;
        replaceInputsForActivity(input.dataset.activityId);
      }
    }
  }

  /**
   * Reemplaza inputs de una actividad específica según su escala
   */
  async function replaceInputsForActivity(activityId) {
    const scale = await EvaluationSystem.getActivityScale(activityId);
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    for (const row of rows) {
      const cell = Array.from(row.children).find(c => {
        const inp = c.querySelector('input, select');
        return inp?.dataset.activityId === activityId;
      });
      if (!cell) continue;

      const oldInput = cell.querySelector('input, select');
      const studentId = cell.dataset.studentId;
      const currentValue = oldInput?.value || '';

      const newInput = EvaluationUI.createScaleInput(activityId, currentValue, scale.id);
      cell.innerHTML = '';
      cell.appendChild(newInput);

      // Guardar cambio
      newInput.addEventListener('change', async () => {
        if (!studentId) return;
        const value = newInput.value;
        await firebase.firestore().collection('alumnes').doc(studentId).update({
          [`notes.${activityId}`]: value
        });
      });
    }
  }

  /**
   * Inyectar botón de feedback en el modal de comentarios
   */
  function addFeedbackButton() {
    const originalOpenComments = window.openCommentsModal;
    if (!originalOpenComments) return;

    window.openCommentsModal = function(studentId, studentName, currentComment) {
      originalOpenComments.call(this, studentId, studentName, currentComment);

      setTimeout(() => {
        const modal = document.getElementById('modalComments');
        if (!modal || modal.querySelector('.feedback-btn')) return;
        const buttonsContainer = modal.querySelector('.flex.gap-2');
        if (!buttonsContainer) return;

        const feedbackBtn = document.createElement('button');
        feedbackBtn.className = 'feedback-btn px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer border-none flex-1';
        feedbackBtn.textContent = '🤖 Generar feedback';
        feedbackBtn.type = 'button';

        feedbackBtn.addEventListener('click', async () => {
          let activityId = null;
          const openMenu = document.querySelector('thead th .menu:not(.hidden)');
          if (openMenu) activityId = getActivityIdFromHeader(openMenu);
          if (!activityId) {
            const inputs = document.querySelectorAll('input[data-activity-id]');
            if (inputs.length > 0) activityId = inputs[0].dataset.activityId;
          }
          if (!activityId) return alert('Selecciona una activitat primer');

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

  setTimeout(() => {
    console.log('🚀 Ejecutando integraciones finales...');
    addFeedbackButton();
    console.log('✅ Integración completada');
  }, 2000);

})();
