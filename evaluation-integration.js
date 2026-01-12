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
        refreshAllActivityInputs();
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
      refreshAllActivityInputs();
    }, 1000);
  }

  /** INYECCIÓN DE BOTONES **/
  function injectScaleButtons() {
    const menus = document.querySelectorAll('thead th .menu');
    if (!menus.length) return;

    menus.forEach((menu) => {
      if (menu.querySelector('.scale-btn')) return;
      const deleteBtn = menu.querySelector('.delete-btn');
      if (!deleteBtn) return;

      // Botón escala
      const scaleBtn = document.createElement('button');
      scaleBtn.className = 'scale-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap';
      scaleBtn.textContent = '⚖️ Tipus avaluació';
      scaleBtn.type = 'button';
      scaleBtn.style.cursor = 'pointer';

      scaleBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activityId = getActivityIdFromHeader(menu);
        if (!activityId) return alert('Error identificando activitat');

        try {
          const scale = await EvaluationSystem.getActivityScale(activityId);
          EvaluationUI.createActivityScaleModal(activityId, scale.id);

          // Después de guardar la escala, actualizar inputs
          const saveBtn = document.querySelector('#activityScaleModal .saveBtn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              setTimeout(() => refreshInputsForActivity(activityId), 200);
            });
          }
        } catch (err) {
          console.error(err);
          alert('Error: ' + err.message);
        }
      });

      // Botón rúbrica
      const rubricBtn = document.createElement('button');
      rubricBtn.className = 'rubric-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap';
      rubricBtn.textContent = '📋 Rúbrica';
      rubricBtn.type = 'button';
      rubricBtn.style.cursor = 'pointer';

      rubricBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activityId = getActivityIdFromHeader(menu);
        if (!activityId) return alert('Error identificando activitat');

        try {
          const activityDoc = await firebase.firestore().collection('activitats').doc(activityId).get();
          if (!activityDoc.exists) return alert('Activitat no trobada');
          const activityName = activityDoc.data().nom;
          EvaluationUI.createRubricModal(activityId, activityName);
        } catch (err) {
          console.error(err);
          alert('Error: ' + err.message);
        }
      });

      menu.insertBefore(rubricBtn, deleteBtn);
      menu.insertBefore(scaleBtn, deleteBtn);
    });
  }

  /** OBTENER ID ACTIVIDAD **/
  function getActivityIdFromHeader(menuElement) {
    const th = menuElement.closest('th');
    if (!th) return null;
    const colIndex = Array.from(th.parentNode.children).indexOf(th);
    const firstRow = document.querySelector('tbody tr');
    if (!firstRow) return null;
    const cell = firstRow.children[colIndex];
    if (!cell) return null;
    const input = cell.querySelector('input, select');
    return input?.dataset.activityId || null;
  }

  /** REFRESCAR TODOS LOS INPUTS **/
  async function refreshAllActivityInputs() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    const inputs = tbody.querySelectorAll('input[data-activity-id], select[data-activity-id]');
    const activityIds = [...new Set(Array.from(inputs).map(i => i.dataset.activityId))];
    for (const activityId of activityIds) {
      await refreshInputsForActivity(activityId);
    }
  }

  /** REFRESCAR INPUTS DE UNA ACTIVIDAD **/
  async function refreshInputsForActivity(activityId) {
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
      if (!newInput) continue;

      // Mantener dataset
      if (studentId) newInput.dataset.studentId = studentId;
      newInput.dataset.activityId = activityId;

      // Guardar cambios
      newInput.addEventListener('change', async () => {
        if (!studentId) return;
        const value = newInput.value;
        await firebase.firestore().collection('alumnes').doc(studentId).update({
          [`notes.${activityId}`]: value
        });
      });

      cell.innerHTML = '';
      cell.appendChild(newInput);
    }
  }

  /** BOTÓN FEEDBACK **/
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
    addFeedbackButton();
    console.log('✅ Integración completada');
  }, 2000);

})();
