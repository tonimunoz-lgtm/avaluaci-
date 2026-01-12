/**
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN
 * Solo botón Tipus avaluació, sin rúbrica
 * Mantiene colores y tamaño de celdas
 */

(function() {
  
  console.log('🔧 Evaluation Integration iniciando...');

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
    if (!tableWrapper) return;

    const observer = new MutationObserver((mutations) => {
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

    setTimeout(() => {
      injectScaleButtons();
      refreshAllActivityInputs();
    }, 1000);
  }

  /** INYECTAR SOLO BOTÓN TIPUS AVALUACIÓ **/
  function injectScaleButtons() {
    const menus = document.querySelectorAll('thead th .menu');
    if (!menus.length) return;

    menus.forEach((menu) => {
      if (menu.querySelector('.scale-btn')) return;
      const deleteBtn = menu.querySelector('.delete-btn');
      if (!deleteBtn) return;

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

          // Actualizar celdas al guardar
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

      menu.insertBefore(scaleBtn, deleteBtn);
    });
  }

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

  /** REFRESCAR TODAS LAS ACTIVIDADES **/
  async function refreshAllActivityInputs() {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;
    const inputs = tbody.querySelectorAll('input[data-activity-id], select[data-activity-id]');
    const activityIds = [...new Set(Array.from(inputs).map(i => i.dataset.activityId))];
    for (const activityId of activityIds) {
      await refreshInputsForActivity(activityId);
    }
  }

  /** REFRESCAR UNA ACTIVIDAD **/
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

      // Estilos similares a la tabla original
      newInput.style.width = '60px';
      newInput.style.padding = '2px 4px';
      newInput.style.textAlign = 'center';
      newInput.classList.add('table-input');

      // Colores según valor
      if (scale.id === 'ASSOLIMENTS') {
        newInput.addEventListener('change', () => {
          applyAssolimentColor(newInput);
        });
        applyAssolimentColor(newInput);
      } else {
        newInput.addEventListener('change', () => {
          applyNumericColor(newInput);
        });
        applyNumericColor(newInput);
      }

      // Guardar en Firestore
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

  /** COLORES ASSOLIMENTS **/
  function applyAssolimentColor(input) {
    const val = input.value;
    switch(val) {
      case 'NA':
        input.style.backgroundColor = '#d1d5db'; // gris
        input.style.color = '#000';
        break;
      case 'AS':
        input.style.backgroundColor = '#facc15'; // amarillo
        input.style.color = '#000';
        break;
      case 'AN':
        input.style.backgroundColor = '#f97316'; // naranja
        input.style.color = '#fff';
        break;
      case 'AE':
        input.style.backgroundColor = '#16a34a'; // verde
        input.style.color = '#fff';
        break;
      default:
        input.style.backgroundColor = '';
        input.style.color = '';
    }
  }

  /** COLORES NUMÉRICOS **/
  function applyNumericColor(input) {
    const val = parseFloat(input.value);
    if (isNaN(val)) {
      input.style.backgroundColor = '';
      input.style.color = '';
      return;
    }
    if (val < 5) {
      input.style.backgroundColor = '#f87171'; // rojo
      input.style.color = '#fff';
    } else if (val < 7) {
      input.style.backgroundColor = '#fbbf24'; // amarillo
      input.style.color = '#000';
    } else {
      input.style.backgroundColor = '#34d399'; // verde
      input.style.color = '#000';
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
