// competencial.js - Sistema de Evaluación Competencial (Injector)
// Se ejecuta automáticamente sin modificar archivos existentes

console.log('✅ competencial.js cargado - Sistema de Evaluación Competencial');

const COMPETENCIES = ['NA', 'AS', 'AN', 'AE'];
const COMPETENCY_COLORS = {
  'NA': '#ef4444',
  'AS': '#f97316',
  'AN': '#eab308',
  'AE': '#22c55e'
};

// ============================================================
// INTERCEPTAR CREACIÓN DE ACTIVIDADES
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📚 Inicializando sistema competencial...');
  waitForActivityModal();
});

function waitForActivityModal() {
  const modalBtn = document.getElementById('modalAddActivityBtn');

  if (!modalBtn) {
    setTimeout(waitForActivityModal, 500);
    return;
  }

  // 🔴 ELIMINAR HANDLER ORIGINAL DE APP.JS (CLAVE)
  modalBtn.onclick = null;

  modalBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const activityName = document.getElementById('modalActivityName').value.trim();
    if (!activityName) {
      alert('Posa un nom');
      return;
    }

    const evaluationType = await showEvaluationTypeDialog();
    if (!evaluationType) return;

    await createActivityWithType(activityName, evaluationType);
  });

  console.log('✅ Sistema competencial inicializado');
}

// ============================================================
// DIÁLOGO DE SELECCIÓN
// ============================================================

function showEvaluationTypeDialog() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-40';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 class="text-2xl font-bold mb-4">Com vols avaluar aquesta activitat?</h2>

        <div class="space-y-3 mb-6">
          <label class="flex items-center gap-3 p-4 border-2 rounded cursor-pointer">
            <input type="radio" name="evaluationType" value="numeric"> Numèrica (0-10)
          </label>
          <label class="flex items-center gap-3 p-4 border-2 rounded cursor-pointer">
            <input type="radio" name="evaluationType" value="competency"> Competencial (NA, AS, AN, AE)
          </label>
        </div>

        <div class="flex justify-end gap-2">
          <button id="btnCancelEval">Cancel·lar</button>
          <button id="btnConfirmEval" disabled>Continuar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('input').forEach(r =>
      r.addEventListener('change', () => modal.querySelector('#btnConfirmEval').disabled = false)
    );

    modal.querySelector('#btnConfirmEval').onclick = () => {
      const v = modal.querySelector('input:checked')?.value || null;
      modal.remove(); resolve(v);
    };
    modal.querySelector('#btnCancelEval').onclick = () => { modal.remove(); resolve(null); };
  });
}

// ============================================================
// CREAR ACTIVIDAD
// ============================================================

async function createActivityWithType(name, evaluationType) {
  const db = window.firebase?.firestore();
  if (!db) return alert('Firebase no disponible');

  const ref = db.collection('activitats').doc();

  await ref.set({
    nom: name,
    data: new Date().toISOString().split('T')[0],
    calcType: evaluationType === 'competency' ? 'competency' : 'numeric',
    formula: '',
    evaluationType,
    competencyScales: evaluationType === 'competency' ? {
      NA: 'No Alcanzado',
      AS: 'En Adquisición',
      AN: 'Afianzado',
      AE: 'Ampliado'
    } : null
  });

  if (window.Terms?.addActivityToActiveTerm) await window.Terms.addActivityToActiveTerm(ref.id);

  document.getElementById('modalActivityName').value = '';
  window.closeModal?.('modalAddActivity');
  window.loadClassData?.();

  alert(`✅ Activitat creada com a ${evaluationType}`);
}

// ============================================================
// PARCHAR TABLA
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const obs = new MutationObserver(() => patchTableInputs());
  obs.observe(document.body, { childList: true, subtree: true });
});

async function patchTableInputs() {
  const db = window.firebase?.firestore();
  if (!db) return;

  const headers = document.querySelectorAll('#notesThead th');

  headers.forEach(async (h, idx) => {
    const name = h.textContent.trim();
    if (['Alumne','Comentaris'].includes(name)) return;

    const snap = await db.collection('activitats').where('nom','==',name).limit(1).get();
    if (snap.empty) return;
    if (snap.docs[0].data().evaluationType !== 'competency') return;

    document.querySelectorAll('#notesTbody tr[data-student-id]').forEach(row => {
      if (row.querySelector(`select[data-col="${idx}"]`)) return;

      const input = row.querySelectorAll('input')[idx-1];
      if (!input) return;

      const sel = document.createElement('select');
      sel.dataset.col = idx;
      sel.dataset.studentId = row.dataset.studentId;
      sel.dataset.activityId = snap.docs[0].id;

      sel.innerHTML = `<option></option>${COMPETENCIES.map(c=>`<option>${c}</option>`).join('')}`;
      sel.value = input.value;

      sel.onchange = () => saveCompetencyNote(sel.dataset.studentId, sel.dataset.activityId, sel.value);

      input.replaceWith(sel);
    });
  });
}

async function saveCompetencyNote(studentId, activityId, value) {
  const db = window.firebase?.firestore();
  if (!db) return;

  await db.collection('alumnes').doc(studentId).update({
    [`notes.${activityId}`]: value || window.firebase.firestore.FieldValue.delete()
  });
}
