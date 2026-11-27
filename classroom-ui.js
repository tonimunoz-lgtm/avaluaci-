// classroom-ui.js - Manejador de interfaz para importación de Classroom (optimizado)
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, getClassroomCoursework, importClassroomCourse, formatDueDate, previewClassroomSync, applyClassroomSync } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourses = [];
let currentProfessorUID = null;
let currentDB = null;
let step = 'courses';          // 'courses' | 'works'
let worksByCourse = {};        // courseId → [activitats de Classroom]
let pickedWorks = {};          // courseId → Set(ids triats)
let valWorks = {};             // courseId → Set(ids marcats com a Lliurament)
let compWorks = {};            // courseId → Set(ids marcats com a competencials)

console.log('✅ classroom-ui.js cargado');

// ============================================================
// FUNCIONES UTILITARIAS
// ============================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Crear modal de progreso
function createProgressModal() {
  const modal = document.createElement('div');
  modal.id = 'classroomProgressModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-40';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
      <div class="flex flex-col items-center gap-4">
        <!-- Spinner animado -->
        <div class="relative w-16 h-16">
          <div class="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
        </div>
        
        <!-- Texto de estado -->
        <div class="text-center">
          <h3 id="progressTitle" class="text-lg font-bold text-gray-900 mb-2">
            Important cursos...
          </h3>
          <p id="progressCourse" class="text-sm text-gray-600 mb-4">
            Preparant importació...
          </p>
        </div>
        
        <!-- Barra de progreso -->
        <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div id="progressBar" class="bg-blue-500 h-full transition-all duration-300" style="width: 0%"></div>
        </div>
        
        <!-- Contador -->
        <p id="progressCounter" class="text-xs text-gray-500 text-center">
          0 de 0 cursos
        </p>
        
        <!-- Detalles -->
        <p id="progressDetails" class="text-xs text-gray-400 text-center mt-2">
          Això pot trigar uns segons...
        </p>
      </div>
    </div>
  `;
  
  return modal;
}

// Actualizar modal de progreso
function updateProgressModal(modal, courseName, current, total, percentage) {
  const title = modal.querySelector('#progressTitle');
  const course = modal.querySelector('#progressCourse');
  const bar = modal.querySelector('#progressBar');
  const counter = modal.querySelector('#progressCounter');
  const details = modal.querySelector('#progressDetails');
  
  if (percentage === 100) {
    title.textContent = '✅ ¡Importació completada!';
    details.textContent = 'Recarregant pàgina...';
  } else {
    title.textContent = 'Important cursos...';
    course.textContent = courseName;
    details.textContent = 'Carregant estudiants, activitats y qualificacions...';
  }
  
  bar.style.width = percentage + '%';
  counter.textContent = `${current} de ${total} cursos`;
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📱 DOM cargado, inicializando classroom-ui.js...');
  
  // Inyectar el botón INMEDIATAMENTE
  setupClassroomButton();
  
  // Monitorear autenticación
  monitorAuthState();
  
  // Configurar listeners de importación
  setupImportListener();
});

// ============================================================
// MONITOREO DE AUTENTICACIÓN
// ============================================================

function monitorAuthState() {
  try {
    const checkAuth = () => {
      const auth = window.firebase?.auth?.();
      
      if (auth) {
        auth.onAuthStateChanged((user) => {
          if (user) {
            console.log('✅ Usuario detectado:', user.email);
            currentProfessorUID = user.uid;
            currentDB = window.firebase.firestore();
          } else {
            console.log('⚠️ Usuario cerró sesión');
            currentProfessorUID = null;
            currentDB = null;
          }
        });
      } else {
        setTimeout(checkAuth, 500);
      }
    };
    
    checkAuth();
  } catch (err) {
    console.error('Error monitoreando auth state:', err);
  }
}

// ============================================================
// INYECCIÓN DEL BOTÓN
// ============================================================

function setupClassroomButton() {
  const btnDeleteMode = document.getElementById('btnDeleteMode');
  
  if (!btnDeleteMode) {
    console.log('⏳ Esperando DOM para inyectar botón...');
    setTimeout(setupClassroomButton, 300);
    return;
  }
  
  if (document.getElementById('btnClassroomImport')) {
    console.log('ℹ️ Botón de Classroom ya existe');
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'btnClassroomImport';
  btn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-xl shadow transition-transform font-semibold mb-0';
  btn.style.height = 'auto';
  btn.style.padding = '0.5rem 1.25rem';
  btn.innerHTML = '<img src="img/classroom.png" alt="" class="btn-logo"><span><span class="lbl-main">Importar</span><span class="lbl-x"> de Classroom</span></span>';
  
  btn.addEventListener('click', async () => {
    console.log('🎓 Botón Classroom clickeado');
    
    if (!currentProfessorUID || !currentDB) {
      notify('❌ Necessites iniciar sessió primer');
      return;
    }
    
    await openClassroomImportModal();
  });

  btnDeleteMode.parentNode.insertBefore(btn, btnDeleteMode.nextSibling);
  
  console.log('✅ Botón de Classroom inyectado (tiempo rápido)');
}

// ============================================================
// MODAL DE IMPORTACIÓN
// ============================================================

async function openClassroomImportModal() {
  console.log('🔓 Abriendo modal de Classroom...');
  
  if (!currentDB || !currentProfessorUID) {
    notify('❌ Error: Necessites iniciar sessió primer');
    return;
  }
  
  openModal('modalClassroomImport');
  
  try {
    console.log('📚 Inicializando Google Classroom API...');
    await initClassroomAPI();
    console.log('✅ API inicializado');
    
    console.log('📚 Cargando cursos de Classroom...');
    await loadClassroomCourses();
    
  } catch (err) {
    console.error('❌ Error completo:', err);
    showClassroomError('Error inicialitzant Google Classroom: ' + (err.message || JSON.stringify(err)));
  }
}

async function loadClassroomCourses() {
  const loadingState = document.getElementById('classroomLoadingState');
  const coursesList = document.getElementById('classroomCoursesList');
  const errorState = document.getElementById('classroomErrorState');

  loadingState.classList.remove('hidden');
  coursesList.classList.add('hidden');
  errorState.classList.add('hidden');
  selectedCourses = [];
  worksByCourse = {}; pickedWorks = {}; compWorks = {}; valWorks = {};
  setStep('courses');
  document.getElementById('btnImportSelectedCourse').disabled = true;

  try {
    const courses = await getClassroomCourses();
    console.log('📚 Cursos obtenidos:', courses.length);

    if (courses.length === 0) {
      showClassroomError('Cursos no trobats al teu Google Classroom.');
      return;
    }

    coursesList.innerHTML = '<label class="text-sm font-semibold text-gray-700 mb-3 block">Selecciona els cursos a importar:</label>';
    const container = document.createElement('div');
    container.className = 'space-y-2';

    courses.forEach(course => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-3 p-3 border rounded hover:bg-indigo-50 cursor-pointer transition-colors';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = course.id;
      checkbox.className = 'w-4 h-4 text-indigo-500 cursor-pointer';

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedCourses.push(course);
        } else {
          selectedCourses = selectedCourses.filter(c => c.id !== course.id);
        }
        document.getElementById('btnImportSelectedCourse').disabled = selectedCourses.length === 0;
      });

      const span = document.createElement('span');
      span.className = 'flex-1 cursor-pointer';
      span.innerHTML = `
        <div class="font-medium text-gray-900">${escapeHtml(course.name)}</div>
        <div class="text-xs text-gray-600">${escapeHtml(course.descriptionHeading || 'Sense descripció')}</div>
      `;
      span.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });

      label.appendChild(checkbox);
      label.appendChild(span);
      container.appendChild(label);
    });

    coursesList.appendChild(container);
    loadingState.classList.add('hidden');
    coursesList.classList.remove('hidden');

  } catch (err) {
    console.error('Error carregant cursos:', err);
    showClassroomError(err.message);
  }
}

// Pas 1: triar cursos · Pas 2: triar activitats de cada curs
function setStep(s) {
  step = s;
  const btn = document.getElementById('btnImportSelectedCourse');
  const back = document.getElementById('btnClassroomBack');
  document.getElementById('classroomCoursesList')?.classList.toggle('hidden', s !== 'courses');
  document.getElementById('classroomWorksList')?.classList.toggle('hidden', s !== 'works');
  back?.classList.toggle('hidden', s !== 'works');
  if (btn) btn.textContent = s === 'works' ? 'Importar' : 'Següent: triar activitats';
}

async function loadWorksStep() {
  const box = document.getElementById('classroomWorksList');
  const btn = document.getElementById('btnImportSelectedCourse');
  const loading = document.getElementById('classroomLoadingState');
  btn.disabled = true;
  document.getElementById('classroomCoursesList').classList.add('hidden');
  loading.classList.remove('hidden');
  try {
    for (const c of selectedCourses) {
      if (!worksByCourse[c.id]) {
        worksByCourse[c.id] = await getClassroomCoursework(c.id);
        pickedWorks[c.id] = new Set(worksByCourse[c.id].map(w => w.id));   // per defecte, totes marcades
        compWorks[c.id] = new Set();
        valWorks[c.id] = new Set(worksByCourse[c.id].filter(w => w.noGrade).map(w => w.id));   // sense punts → Lliurament per defecte
      }
    }
  } catch (err) {
    loading.classList.add('hidden');
    setStep('courses');
    document.getElementById('classroomCoursesList').classList.remove('hidden');
    notify('❌ Error carregant les activitats: ' + err.message);
    btn.disabled = false;
    return;
  }
  loading.classList.add('hidden');
  renderWorks(box);
  setStep('works');
  btn.disabled = false;
}

function renderWorks(box) {
  box.innerHTML = '<p class="text-sm text-gray-600 mb-3">Tria les activitats que vols importar de cada curs. Els alumnes s\'importen sempre. Marca «Competencial» a les que s\'han d\'avaluar amb NA/AS/AN/AE (notes 0–4).</p>';
  selectedCourses.forEach(course => {
    const works = worksByCourse[course.id] || [];
    const picked = pickedWorks[course.id];
    const comp = compWorks[course.id] || (compWorks[course.id] = new Set());
    const val = valWorks[course.id] || (valWorks[course.id] = new Set());
    const sec = document.createElement('div');
    sec.className = 'mb-4 border rounded';
    const count = () => `${picked.size} de ${works.length} activitats`;
    sec.innerHTML = `
      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b">
        <div class="font-semibold text-gray-900" translate="no">${escapeHtml(course.name)}</div>
        <div class="text-xs text-gray-600"><span class="cw-count">${count()}</span> ·
          <button type="button" class="cw-all underline text-indigo-600">Totes</button> ·
          <button type="button" class="cw-none underline text-indigo-600">Cap</button> ·
          <button type="button" class="cw-comp underline text-indigo-600" title="Marca o desmarca totes com a competencials">Totes competencials</button></div>
      </div>
      <div class="cw-rows divide-y"></div>`;
    const rows = sec.querySelector('.cw-rows');
    if (!works.length) rows.innerHTML = '<p class="px-3 py-3 text-sm text-gray-500">Aquest curs no té activitats.</p>';
    const refresh = () => { sec.querySelector('.cw-count').textContent = count(); };
    works.forEach(w => {
      const due = formatDueDate(w.dueDate);
      const lab = document.createElement('label');
      lab.className = 'flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 cursor-pointer';
      lab.innerHTML = `<input type="checkbox" class="cw-pick w-4 h-4" ${picked.has(w.id) ? 'checked' : ''}>
        <span class="flex-1 text-sm text-gray-900" translate="no">${escapeHtml(w.title || '(sense títol)')}</span>
        <span class="text-xs text-gray-500">${due ? escapeHtml(due) + ' · ' : ''}${w.noGrade ? 'sense nota' : escapeHtml(String(w.maxPoints)) + ' pts'}</span>
        <span class="cw-compwrap flex items-center gap-1 text-xs text-gray-700 border-l pl-3" title="Avaluar amb NA/AS/AN/AE (0–4)"><input type="checkbox" class="cw-comp-pick w-4 h-4" ${comp.has(w.id) ? 'checked' : ''}>Competencial</span>
        <span class="cw-valwrap flex items-center gap-1 text-xs text-gray-700 border-l pl-3" title="Només ✓ lliurat / ✗ no lliurat, sense nota"><input type="checkbox" class="cw-val-pick w-4 h-4" ${val.has(w.id) ? 'checked' : ''}>Lliurament</span>`;
      lab.querySelector('.cw-pick').addEventListener('change', e => {
        e.target.checked ? picked.add(w.id) : picked.delete(w.id); refresh();
      });
      const cc = lab.querySelector('.cw-comp-pick');
      cc.addEventListener('click', e => e.stopPropagation());
      const vc = lab.querySelector('.cw-val-pick');
      cc.addEventListener('change', e => { e.target.checked ? comp.add(w.id) : comp.delete(w.id); if (e.target.checked) { val.delete(w.id); vc.checked = false; } });
      vc.addEventListener('click', e => e.stopPropagation());
      vc.addEventListener('change', e => { e.target.checked ? val.add(w.id) : val.delete(w.id); if (e.target.checked) { comp.delete(w.id); cc.checked = false; } });
      lab.querySelector('.cw-compwrap').addEventListener('click', e => e.stopPropagation());
      lab.querySelector('.cw-valwrap').addEventListener('click', e => e.stopPropagation());
      rows.appendChild(lab);
    });
    const setAll = on => { works.forEach(w => on ? picked.add(w.id) : picked.delete(w.id)); rows.querySelectorAll('.cw-pick').forEach(i => i.checked = on); refresh(); };
    sec.querySelector('.cw-comp').addEventListener('click', () => {
      const on = !works.every(w => comp.has(w.id));
      works.forEach(w => on ? comp.add(w.id) : comp.delete(w.id));
      rows.querySelectorAll('.cw-comp-pick').forEach(i => i.checked = on);
    });
    sec.querySelector('.cw-all').addEventListener('click', () => setAll(true));
    sec.querySelector('.cw-none').addEventListener('click', () => setAll(false));
    box.appendChild(sec);
  });
}

function showClassroomError(message) {
  const errorState = document.getElementById('classroomErrorState');
  const loadingState = document.getElementById('classroomLoadingState');
  const coursesList = document.getElementById('classroomCoursesList');

  errorState.innerHTML = `<strong>❌ Error:</strong> ${escapeHtml(message)}`;
  errorState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  coursesList.classList.add('hidden');
}

// ============================================================
// LISTENERS DE IMPORTACIÓN
// ============================================================

function setupImportListener() {
  const back = document.getElementById('btnClassroomBack');
  if (back && !back.dataset.listenerAdded) {
    back.dataset.listenerAdded = 'true';
    back.addEventListener('click', () => { setStep('courses'); document.getElementById('btnImportSelectedCourse').disabled = selectedCourses.length === 0; });
  }
  const btnImport = document.getElementById('btnImportSelectedCourse');
  
  if (!btnImport) {
    console.warn('⚠️ Botón de importación no encontrado, reintentando...');
    setTimeout(setupImportListener, 500);
    return;
  }

  if (btnImport.dataset.listenerAdded) {
    console.log('ℹ️ Listener ya está configurado');
    return;
  }

  btnImport.dataset.listenerAdded = 'true';
  
  btnImport.addEventListener('click', async (event) => {
    if (selectedCourses.length === 0) {
      return notify('Selecciona almenys un curs');
    }
    if (step === 'courses') { await loadWorksStep(); return; }

    if (!currentDB || !currentProfessorUID) {
      return notify('❌ Necessites iniciar sessió primer');
    }

    try {
      const btn = event.target;
      btn.disabled = true;
      btn.innerHTML = '⏳ Important...';

      // Crear y mostrar modal de progreso
      const progressModal = createProgressModal();
      document.body.appendChild(progressModal);
      
      const totalCourses = selectedCourses.length;
      
      for (let i = 0; i < selectedCourses.length; i++) {
        const course = selectedCourses[i];
        const progress = ((i + 1) / totalCourses) * 100;
        
        console.log('📚 Importando curso:', course.name);
        updateProgressModal(progressModal, course.name, i + 1, totalCourses, progress);
        
        await importClassroomCourse(course, currentDB, currentProfessorUID, { workIds: [...(pickedWorks[course.id] || [])], compIds: [...(compWorks[course.id] || [])], valIds: [...(valWorks[course.id] || [])] });
      }

      console.log('✅ Cursos importats correctament');
      
      // Mostrar mensaje final
      updateProgressModal(progressModal, '✅ ¡Procés completat!', totalCourses, totalCourses, 100);
      
      setTimeout(() => {
        progressModal.remove();
        notify('✅ Cursos importats correctament');
        closeModal('modalClassroomImport');
        
        // Recargar página
        setTimeout(() => {
          console.log('🔄 Recarregant pàgina...');
          location.reload();
        }, 500);
      }, 1000);

    } catch (err) {
      console.error('Error important:', err);
      notify('❌ Error important els cursos: ' + err.message);
      const progressModal = document.getElementById('classroomProgressModal');
      if (progressModal) progressModal.remove();
    } finally {
      const btn = event.target;
      btn.disabled = false;
      btn.textContent = step === 'works' ? 'Importar' : 'Següent: triar activitats';
    }
  });
}


// ============================================================
// ACTUALITZAR CLASSE IMPORTADA (menú «Opcions» del període)
// ============================================================
function injectSyncButton() {
  const menu = document.getElementById('termMenu');
  if (!menu) { setTimeout(injectSyncButton, 400); return; }
  if (menu.querySelector('.classroom-sync-btn')) return;
  const b = document.createElement('button');
  b.className = 'classroom-sync-btn hidden';
  b.textContent = 'Actualitzar de Classroom';
  menu.appendChild(b);
  // només es mostra si la classe oberta s'ha importat de Classroom
  document.getElementById('termMenuBtn')?.addEventListener('click', async () => {
    try {
      const id = window.AvaluApp?.getClassId?.();
      const d = id && window.firebase ? await window.firebase.firestore().collection('classes').doc(id).get() : null;
      b.classList.toggle('hidden', !(d && d.exists && d.data().googleClassroomId));
    } catch { b.classList.add('hidden'); }
  });
  b.addEventListener('click', () => { menu.classList.add('hidden'); startClassroomSync(); });

  // Botó directe (només escriptori) al costat d'«Alumnes»: visible si la classe oberta s'ha importat de Classroom.
  const d = document.getElementById('btnClassroomSync');
  if (d) {
    d.addEventListener('click', e => { e.stopPropagation(); startClassroomSync(); });
    const upd = () => { const cd = window.AvaluApp?.getClassData?.(); d.classList.toggle('hidden', !(cd && cd.googleClassroomId)); };
    setInterval(upd, 1000); window.addEventListener('class-opened', () => setTimeout(upd, 600));
  }
}
document.addEventListener('DOMContentLoaded', injectSyncButton);

function syncBox(html) {
  let m = document.getElementById('classroomSyncModal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'classroomSyncModal';
    m.className = 'fixed inset-0 flex items-center justify-center z-[10000] bg-black bg-opacity-50 p-4';
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">${html}</div>`;
  return m;
}
const closeSync = () => document.getElementById('classroomSyncModal')?.remove();

async function startClassroomSync() {
  const classId = window.AvaluApp?.getClassId?.();
  if (!classId || !currentDB || !currentProfessorUID) { notify('❌ Obre una classe i inicia sessió'); return; }
  syncBox('<h3 class="font-bold text-lg mb-2">Actualitzar de Classroom</h3><p class="text-sm text-gray-600">⏳ Connectant amb Google Classroom i comparant…</p>');
  try {
    await initClassroomAPI();
    const plan = await previewClassroomSync(classId, currentDB);
    renderSyncPlan(plan);
  } catch (err) {
    console.error(err);
    syncBox(`<h3 class="font-bold text-lg mb-2">Actualitzar de Classroom</h3><p class="text-sm text-red-600">❌ ${escapeHtml(err.message || String(err))}</p>
      <div class="mt-4 text-right"><button type="button" id="syncClose" class="border rounded-lg px-4 py-2 text-sm">Tanca</button></div>`);
    document.getElementById('syncClose').onclick = closeSync;
  }
}

function renderSyncPlan(plan) {
  const nS = plan.newStudents.length, nF = plan.fills.length, nW = plan.newWorks.length;
  const acts = [...new Set(plan.fills.map(f => f.actName))];
  const nothing = !nS && !nF && !nW;
  const html = `
    <h3 class="font-bold text-lg mb-1">Actualitzar de Classroom</h3>
    <p class="text-xs text-gray-500 mb-4" translate="no">${escapeHtml(plan.cls.nom || '')}</p>
    ${nothing ? '<p class="text-sm text-gray-700">✅ Tot està al dia: no hi ha alumnes, notes ni activitats noves.</p>' : `
    <ul class="text-sm text-gray-800 space-y-2 mb-4">
      <li>👥 <b>${nS}</b> alumne${nS === 1 ? '' : 's'} nou${nS === 1 ? '' : 's'}${nS ? `: <span translate="no" class="text-gray-600">${escapeHtml(plan.newStudents.map(s => s.nom).join(', '))}</span>` : ''}</li>
      <li>📝 <b>${nF}</b> nota${nF === 1 ? '' : 's'} per omplir (només cel·les buides)${acts.length ? ` a: <span translate="no" class="text-gray-600">${escapeHtml(acts.join(', '))}</span>` : ''}</li>
      <li>🆕 <b>${nW}</b> activitat${nW === 1 ? '' : 's'} nova${nW === 1 ? '' : 's'} a Classroom</li>
    </ul>
    ${nW ? `<div class="border rounded-lg divide-y mb-4" id="syncWorks">
      ${plan.newWorks.map(w => `<div class="flex items-center gap-3 px-3 py-2 text-sm" data-id="${escapeHtml(w.id)}">
        <label class="flex items-center gap-2 flex-1"><input type="checkbox" class="sw-pick w-4 h-4" checked><span translate="no">${escapeHtml(w.title || '(sense títol)')}</span></label>
        <label class="flex items-center gap-1 text-xs border-l pl-3"><input type="checkbox" class="sw-comp w-4 h-4">Competencial</label>
        <label class="flex items-center gap-1 text-xs border-l pl-3"><input type="checkbox" class="sw-val w-4 h-4" ${w.noGrade ? 'checked' : ''}>Lliurament</label></div>`).join('')}
    </div>` : ''}
    <p class="text-xs text-gray-500 mb-4">No se sobreescriu cap nota existent ni s'esborra res.</p>`}
    <div class="flex gap-2 justify-end">
      <button type="button" id="syncClose" class="border rounded-lg px-4 py-2 text-sm">${nothing ? 'Tanca' : 'Cancel·la'}</button>
      ${nothing ? '' : '<button type="button" id="syncApply" class="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold">Actualitza</button>'}
    </div>`;
  syncBox(html);
  document.getElementById('syncClose').onclick = closeSync;
  const ap = document.getElementById('syncApply');
  if (!ap) return;
  ap.onclick = async () => {
    ap.disabled = true; ap.textContent = '⏳ Actualitzant…';
    try {
      const newWorks = [...document.querySelectorAll('#syncWorks [data-id]')]
        .filter(r => r.querySelector('.sw-pick').checked)
        .map(r => ({ id: r.dataset.id, comp: r.querySelector('.sw-comp').checked, val: r.querySelector('.sw-val').checked }));
      const r = await applyClassroomSync(plan, currentDB, currentProfessorUID, { newWorks, termId: window.AvaluApp?.getActiveTermId?.() });
      closeSync();
      notify(`✅ Actualitzat: ${r.newStudents} alumnes nous, ${r.notes} notes, ${r.newActivities} activitats noves`);
      setTimeout(() => { if (window.loadClassData) window.loadClassData(); else location.reload(); }, 300);
    } catch (err) {
      console.error(err);
      notify('❌ Error actualitzant: ' + (err.message || err));
      ap.disabled = false; ap.textContent = 'Actualitza';
    }
  };
}
