/**
 * INTEGRACIÓN DEL SISTEMA DE EVALUACIÓN
 * Se ejecuta automáticamente y añade botones sin modificar app.js
 * 
 * INSTRUCCIONES:
 * 1. Incluir en HTML DESPUÉS de app.js:
 *    <script src="evaluation.js"></script>
 *    <script src="evaluationUI.js"></script>
 *    <script src="evaluation-integration.js"></script>
 */

(function() {
  
  // Esperar a que DOM esté listo
  const waitForAppInit = setInterval(() => {
    if (!window.db || !window.currentClassId) return;
    
    clearInterval(waitForAppInit);
    initializeEvaluationIntegration();
  }, 500);

  async function initializeEvaluationIntegration() {
    // Hook en renderNotesGrid para inyectar opciones de escala
    const originalRenderNotesGrid = window.renderNotesGrid;
    
    window.renderNotesGrid = async function() {
      // Ejecutar renderizado original
      const result = await originalRenderNotesGrid.call(this);
      
      // INYECTAR BOTONES DE ESCALA EN MENÚ DE ACTIVIDADES
      setTimeout(() => {
        injectScaleButtons();
      }, 100);
      
      return result;
    };
  }

  /**
   * Inyectar botones de escala en el menú de cada actividad
   */
  function injectScaleButtons() {
    const menus = document.querySelectorAll('.menu');
    
    menus.forEach(menu => {
      // No duplicar si ya existe el botón
      if (menu.querySelector('.scale-btn')) return;
      
      const deleteBtn = menu.querySelector('.delete-btn');
      if (!deleteBtn) return;

      // Crear botón de escala
      const scaleBtn = document.createElement('button');
      scaleBtn.className = 'scale-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';
      scaleBtn.textContent = '⚖️ Tipus avaluació';
      scaleBtn.style.borderTop = '1px solid #e5e7eb';
      scaleBtn.style.marginTop = '4px';
      scaleBtn.style.paddingTop = '6px';

      // Crear botón de rúbrica
      const rubricBtn = document.createElement('button');
      rubricBtn.className = 'rubric-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';
      rubricBtn.textContent = '📋 Rúbrica';

      // Obtener ID de la actividad del contexto
      rubricBtn.addEventListener('click', async (e) => {
        const activityId = getActivityIdFromMenu(menu);
        if (!activityId) {
          alert('Error identificando activitat');
          return;
        }

        const activityDoc = await db.collection('activitats').doc(activityId).get();
        const activityName = activityDoc.data().nom;

        EvaluationUI.createRubricModal(activityId, activityName);
      });

      scaleBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const activityId = getActivityIdFromMenu(menu);
        if (!activityId) {
          alert('Error identificando activitat');
          return;
        }

        const scale = await EvaluationSystem.getActivityScale(activityId);
        EvaluationUI.createActivityScaleModal(activityId, scale.id);
      });

      // Insertar botones en el menú
      menu.insertBefore(rubricBtn, deleteBtn);
      menu.insertBefore(scaleBtn, deleteBtn);
    });
  }

  /**
   * Obtener ID de actividad desde el elemento del menú
   */
  function getActivityIdFromMenu(menu) {
    // El menú está en el header de la tabla
    // Buscar hacia arriba hasta encontrar el <th> que contiene el ID
    let th = menu.closest('th');
    
    if (th) {
      // El ID está en la primera columna de datos (input en tbody)
      const headerIndex = Array.from(th.parentNode.children).indexOf(th);
      const firstRow = document.querySelector('tbody tr');
      
      if (firstRow && firstRow.children[headerIndex]) {
        const input = firstRow.children[headerIndex].querySelector('input');
        if (input) {
          return input.dataset.activityId;
        }
      }
    }
    
    return null;
  }

  /**
   * Hook en los inputs de notas para cambiar tipo según escala
   */
  async function enhanceNoteInputs() {
    const inputs = document.querySelectorAll('input[data-activity-id]');
    
    for (const input of inputs) {
      const activityId = input.dataset.activityId;
      const scale = await EvaluationSystem.getActivityScale(activityId);
      
      if (scale.id === 'ASSOLIMENTS') {
        // Convertir input a select
        const select = EvaluationUI.createScaleInput(
          activityId,
          input.value,
          'ASSOLIMENTS'
        );
        input.replaceWith(select);
      }
    }
  }

  /**
   * Inyectar botón de feedback en el menú de comentarios
   */
  function addFeedbackButton() {
    // Cuando se abre el modal de comentarios, agregar botón de feedback
    const originalOpenComments = window.openCommentsModal;
    
    if (originalOpenComments) {
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
            
            feedbackBtn.addEventListener('click', async () => {
              // Obtener datos necesarios
              const currentActivityId = window.currentCalcActivityId;
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
  }

  // Ejecutar integraciones cuando el sistema esté listo
  setTimeout(() => {
    enhanceNoteInputs();
    addFeedbackButton();
  }, 1000);

})();
