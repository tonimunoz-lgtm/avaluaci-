// classroom-ui.js - Manejador de interfaz para importación de Classroom (optimizado)
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, getClassroomCoursework, importClassroomCourse, formatDueDate } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourses = [];
let currentProfessorUID = null;
let currentDB = null;
let step = 'courses';          // 'courses' | 'works'
let worksByCourse = {};        // courseId → [activitats de Classroom]
let pickedWorks = {};          // courseId → Set(ids triats)

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
  worksByCourse = {}; pickedWorks = {};
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
  box.innerHTML = '<p class="text-sm text-gray-600 mb-3">Tria les activitats que vols importar de cada curs. Els alumnes s\'importen sempre.</p>';
  selectedCourses.forEach(course => {
    const works = worksByCourse[course.id] || [];
    const picked = pickedWorks[course.id];
    const sec = document.createElement('div');
    sec.className = 'mb-4 border rounded';
    const count = () => `${picked.size} de ${works.length} activitats`;
    sec.innerHTML = `
      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b">
        <div class="font-semibold text-gray-900" translate="no">${escapeHtml(course.name)}</div>
        <div class="text-xs text-gray-600"><span class="cw-count">${count()}</span> ·
          <button type="button" class="cw-all underline text-indigo-600">Totes</button> ·
          <button type="button" class="cw-none underline text-indigo-600">Cap</button></div>
      </div>
      <div class="cw-rows divide-y"></div>`;
    const rows = sec.querySelector('.cw-rows');
    if (!works.length) rows.innerHTML = '<p class="px-3 py-3 text-sm text-gray-500">Aquest curs no té activitats.</p>';
    const refresh = () => { sec.querySelector('.cw-count').textContent = count(); };
    works.forEach(w => {
      const due = formatDueDate(w.dueDate);
      const lab = document.createElement('label');
      lab.className = 'flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 cursor-pointer';
      lab.innerHTML = `<input type="checkbox" class="w-4 h-4" ${picked.has(w.id) ? 'checked' : ''}>
        <span class="flex-1 text-sm text-gray-900" translate="no">${escapeHtml(w.title || '(sense títol)')}</span>
        <span class="text-xs text-gray-500">${due ? escapeHtml(due) + ' · ' : ''}${escapeHtml(String(w.maxPoints))} pts</span>`;
      lab.querySelector('input').addEventListener('change', e => {
        e.target.checked ? picked.add(w.id) : picked.delete(w.id); refresh();
      });
      rows.appendChild(lab);
    });
    const setAll = on => { works.forEach(w => on ? picked.add(w.id) : picked.delete(w.id)); rows.querySelectorAll('input').forEach(i => i.checked = on); refresh(); };
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
        
        await importClassroomCourse(course, currentDB, currentProfessorUID, { workIds: [...(pickedWorks[course.id] || [])] });
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
