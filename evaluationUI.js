/**
 * INTERFAZ DE USUARIO PARA SISTEMA DE EVALUACIÓN
 * Componentes para cambiar escalas, crear rúbricas y generar feedback
 */

window.EvaluationUI = (function() {

  /**
   * Crear modal para editar escala de una actividad
   */
  function createActivityScaleModal(activityId, currentScale) {
    const modal = document.createElement('div');
    modal.id = 'activityScaleModal';
    modal.className = 'fixed inset-0 hidden items-center justify-center z-50';
    modal.innerHTML = `
      <div class="modal-backdrop absolute inset-0" style="background: rgba(0,0,0,0.2);"></div>
      <div class="bg-white rounded shadow-lg z-10 w-full max-w-md p-6 flex flex-col gap-4">
        <h2 class="text-xl font-bold">Tipus d'avaluació</h2>
        
        <div class="flex flex-col gap-3">
          <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <input type="radio" name="scaleOption" value="NUMERIC" class="w-4 h-4" 
              ${currentScale === 'NUMERIC' ? 'checked' : ''}>
            <div>
              <div class="font-semibold">Numèrica (0-10)</div>
              <div class="text-sm text-gray-600">Escala tradicional de números</div>
            </div>
          </label>
          
          <label class="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <input type="radio" name="scaleOption" value="ASSOLIMENTS" class="w-4 h-4"
              ${currentScale === 'ASSOLIMENTS' ? 'checked' : ''}>
            <div>
              <div class="font-semibold">Assoliments (NA, AS, AN, AE)</div>
              <div class="text-sm text-gray-600">Escala competencial ESO</div>
            </div>
          </label>
        </div>

        <div class="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
          ℹ️ Les activitats numèriques es poden utilitzar en fórmules. Els assoliments no.
        </div>

        <div class="flex gap-2">
          <button class="flex-1 px-3 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black font-semibold cursor-pointer border-none cancelBtn">
            Cancel·lar
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer border-none saveBtn">
            Guardar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cancelBtn = modal.querySelector('.cancelBtn');
    const saveBtn = modal.querySelector('.saveBtn');
    const backdrop = modal.querySelector('.modal-backdrop');

    cancelBtn.addEventListener('click', () => modal.remove());
    backdrop.addEventListener('click', () => modal.remove());

    saveBtn.addEventListener('click', async () => {
      const selectedScale = document.querySelector('input[name="scaleOption"]:checked')?.value;
      if (!selectedScale) return alert('Selecciona un tipus');

      await EvaluationSystem.setActivityScale(activityId, selectedScale);
      alert('Tipus d\'avaluació actualitzat!');
      modal.remove();
      
      // Recarregar graella si existe
      if (typeof renderNotesGrid === 'function') {
        renderNotesGrid();
      }
    });

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  /**
   * Crear input dinámico según la escala
   */
  function createScaleInput(activityId, currentValue = '', scaleId = 'NUMERIC') {
    const scale = EvaluationSystem.getScaleById(scaleId);
    
    if (scale.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 10;
      input.step = 0.5;
      input.value = currentValue;
      input.className = 'table-input text-center rounded border p-1 w-full';
      return input;
    } else {
      // Para assoliments, crear select
      const select = document.createElement('select');
      select.className = 'table-input text-center rounded border p-1 w-full';
      
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '---';
      select.appendChild(emptyOption);
      
      scale.values.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        if (val === currentValue) opt.selected = true;
        select.appendChild(opt);
      });
      
      return select;
    }
  }

  /**
   * Modal para crear/editar rúbrica
   */
  function createRubricModal(activityId, activityName) {
    const modal = document.createElement('div');
    modal.id = 'rubricModal';
    modal.className = 'fixed inset-0 hidden items-center justify-center z-50 overflow-y-auto';
    modal.innerHTML = `
      <div class="modal-backdrop absolute inset-0" style="background: rgba(0,0,0,0.2);"></div>
      <div class="bg-white rounded shadow-lg z-10 w-full max-w-2xl p-6 flex flex-col gap-4 my-8">
        <h2 class="text-xl font-bold">Rúbrica: ${activityName}</h2>
        
        <div class="space-y-4 max-h-96 overflow-y-auto" id="rubricContainer">
          <div class="text-center text-gray-500">Carregant rúbrica...</div>
        </div>

        <div class="flex gap-2">
          <button class="flex-1 px-3 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black font-semibold cursor-pointer border-none generateBtn">
            🤖 Generar amb IA
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black font-semibold cursor-pointer border-none cancelBtn">
            Cancel·lar
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer border-none saveBtn">
            Guardar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const cancelBtn = modal.querySelector('.cancelBtn');
    const backdrop = modal.querySelector('.modal-backdrop');
    const generateBtn = modal.querySelector('.generateBtn');
    const saveBtn = modal.querySelector('.saveBtn');

    cancelBtn.addEventListener('click', () => modal.remove());
    backdrop.addEventListener('click', () => modal.remove());

    generateBtn.addEventListener('click', async () => {
      generateBtn.disabled = true;
      generateBtn.textContent = '⏳ Generant...';

      const scale = await EvaluationSystem.getActivityScale(activityId);
      const rubric = await EvaluationSystem.generateRubricWithAI(
        activityName,
        '',
        scale.id
      );

      if (rubric) {
        displayRubric(rubric);
      } else {
        alert('Error generant la rúbrica. Intenta manualment.');
      }

      generateBtn.disabled = false;
      generateBtn.textContent = '🤖 Generar amb IA';
    });

    saveBtn.addEventListener('click', async () => {
      alert('Rúbrica guardada!');
      modal.remove();
    });

    // Cargar rúbrica existente
    loadRubricData(activityId);
  }

  /**
   * Cargar datos de rúbrica existente
   */
  async function loadRubricData(activityId) {
    const rubric = await EvaluationSystem.getRubric(activityId);
    const container = document.getElementById('rubricContainer');

    if (!rubric) {
      container.innerHTML = `
        <div class="text-center text-gray-500 p-4">
          No hi ha rúbrica. Genera una amb IA o crea'n una manualment.
        </div>
      `;
      return;
    }

    displayRubric(rubric);
  }

  /**
   * Mostrar rúbrica en formato visual
   */
  function displayRubric(rubric) {
    const container = document.getElementById('rubricContainer');
    container.innerHTML = '';

    if (!rubric.criteria) return;

    rubric.criteria.forEach((criterion, idx) => {
      const criterionDiv = document.createElement('div');
      criterionDiv.className = 'p-4 border rounded bg-gray-50';
      criterionDiv.innerHTML = `
        <h3 class="font-semibold text-lg mb-2">${criterion.name}</h3>
        <p class="text-sm text-gray-600 mb-3">${criterion.description}</p>
        <div class="space-y-2">
      `;

      criterion.levels.forEach(level => {
        criterionDiv.innerHTML += `
          <div class="p-2 bg-white border border-gray-200 rounded text-sm">
            <span class="font-semibold text-blue-600">${level.level}:</span>
            ${level.descriptor}
          </div>
        `;
      });

      criterionDiv.innerHTML += '</div>';
      container.appendChild(criterionDiv);
    });
  }

  /**
   * Modal para generar feedback automático
   */
  function createFeedbackModal(studentId, studentName, activityId, activityName, currentScore) {
    const modal = document.createElement('div');
    modal.id = 'feedbackModal';
    modal.className = 'fixed inset-0 hidden items-center justify-center z-50 overflow-y-auto';
    modal.innerHTML = `
      <div class="modal-backdrop absolute inset-0" style="background: rgba(0,0,0,0.2);"></div>
      <div class="bg-white rounded shadow-lg z-10 w-full max-w-2xl p-6 flex flex-col gap-4 my-8">
        <h2 class="text-xl font-bold">Feedback per a ${studentName}</h2>
        
        <textarea 
          id="feedbackText"
          class="w-full h-32 p-3 border rounded resize-none focus:ring-2 focus:ring-blue-400"
          placeholder="El feedback apareixerà aquí..."
        ></textarea>

        <div class="flex gap-2">
          <button class="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer border-none generateAIBtn">
            🤖 Generar amb IA
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black font-semibold cursor-pointer border-none cancelBtn">
            Cancel·lar
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer border-none sendBtn">
            Enviar per email
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const feedbackText = document.getElementById('feedbackText');
    const generateAIBtn = modal.querySelector('.generateAIBtn');
    const cancelBtn = modal.querySelector('.cancelBtn');
    const sendBtn = modal.querySelector('.sendBtn');
    const backdrop = modal.querySelector('.modal-backdrop');

    generateAIBtn.addEventListener('click', async () => {
      generateAIBtn.disabled = true;
      generateAIBtn.textContent = '⏳ Generant...';

      const scale = await EvaluationSystem.getActivityScale(activityId);
      const rubric = await EvaluationSystem.getRubric(activityId);
      
      const feedback = await EvaluationSystem.generateStudentFeedback(
        studentName,
        activityName,
        currentScore,
        scale.id,
        rubric
      );

      if (feedback) {
        feedbackText.value = feedback;
      } else {
        alert('Error generant el feedback');
      }

      generateAIBtn.disabled = false;
      generateAIBtn.textContent = '🤖 Generar amb IA';
    });

    cancelBtn.addEventListener('click', () => modal.remove());
    backdrop.addEventListener('click', () => modal.remove());

    sendBtn.addEventListener('click', async () => {
      const feedback = feedbackText.value;
      if (!feedback) return alert('Afegeix un feedback primer');

      try {
        // Obtener email del alumno
        const studentDoc = await firebase.firestore().collection('alumnes').doc(studentId).get();
        const studentEmail = studentDoc.data().email;

        if (!studentEmail) {
          alert('El alumne no té email registrat');
          return;
        }

        // Preparar email
        const subject = `Feedback activitat: ${activityName}`;
        const message = `Hola,\n\nAquí teniu el feedback de ${studentName} per l'activitat "${activityName}":\n\n${feedback}\n\nSalutacions cordials`;

        // Enviar (usa la función gmailSendEmail de app.js)
        if (typeof gmailSendEmail === 'function') {
          await gmailSendEmail(studentEmail, subject, message);
          feedbackText.value = '';
          modal.remove();
        }
      } catch (err) {
        console.error('Error enviant feedback:', err);
        alert('Error: ' + err.message);
      }
    });
  }

  // Exportar API pública
  return {
    createActivityScaleModal,
    createScaleInput,
    createRubricModal,
    createFeedbackModal,
    displayRubric,
    loadRubricData
  };
})();
