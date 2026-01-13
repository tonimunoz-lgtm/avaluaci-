// classroom-ui.js - Manejador de interfaz para importación de Classroom (optimizado)
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, importClassroomCourse } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourses = [];
let currentProfessorUID = null;
let currentDB = null;

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
            Importando cursos...
          </h3>
          <p id="progressCourse" class="text-sm text-gray-600 mb-4">
            Preparando importación...
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
          Esto puede tomar unos segundos...
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
    title.textContent = '✅ ¡Importación completada!';
    details.textContent = 'Recargando página...';
  } else {
    title.textContent = 'Importando cursos...';
    course.textContent = courseName;
    details.textContent = 'Cargando estudiantes, actividades y calificaciones...';
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
  btn.innerHTML = '🎓 Importar Classroom';
  
  btn.addEventListener('click', async () => {
    console.log('🎓 Botón Classroom clickeado');
    
    if (!currentProfessorUID || !currentDB) {
      alert('❌ Necesitas iniciar sesión primero');
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
    alert('❌ Error: Necesitas iniciar sesión primero');
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
    showClassroomError('Error inicializando Google Classroom: ' + (err.message || JSON.stringify(err)));
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
  document.getElementById('btnImportSelectedCourse').disabled = true;

  try {
    const courses = await getClassroomCourses();
    console.log('📚 Cursos obtenidos:', courses.length);

    if (courses.length === 0) {
      showClassroomError('No se encontraron cursos en tu Google Classroom.');
      return;
    }

    coursesList.innerHTML = '<label class="text-sm font-semibold text-gray-700 mb-3 block">Selecciona los cursos a importar:</label>';
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
        <div class="text-xs text-gray-600">${escapeHtml(course.descriptionHeading || 'Sin descripción')}</div>
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
    console.error('Error cargando cursos:', err);
    showClassroomError(err.message);
  }
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
      return alert('Selecciona al menos un curso');
    }

    if (!currentDB || !currentProfessorUID) {
      return alert('❌ Necesitas iniciar sesión primero');
    }

    try {
      const btn = event.target;
      btn.disabled = true;
      btn.innerHTML = '⏳ Importando...';

      // Crear y mostrar modal de progreso
      const progressModal = createProgressModal();
      document.body.appendChild(progressModal);
      
      const totalCourses = selectedCourses.length;
      
      for (let i = 0; i < selectedCourses.length; i++) {
        const course = selectedCourses[i];
        const progress = ((i + 1) / totalCourses) * 100;
        
        console.log('📚 Importando curso:', course.name);
        updateProgressModal(progressModal, course.name, i + 1, totalCourses, progress);
        
        await importClassroomCourse(course, currentDB, currentProfessorUID);
      }

      console.log('✅ Cursos importados correctamente');
      
      // Mostrar mensaje final
      updateProgressModal(progressModal, '✅ ¡Proceso completado!', totalCourses, totalCourses, 100);
      
      setTimeout(() => {
        progressModal.remove();
        alert('✅ Cursos importados correctamente');
        closeModal('modalClassroomImport');
        
        // Recargar página
        setTimeout(() => {
          console.log('🔄 Recargando página...');
          location.reload();
        }, 500);
      }, 1000);

    } catch (err) {
      console.error('Error importando:', err);
      alert('❌ Error importando los cursos: ' + err.message);
      const progressModal = document.getElementById('classroomProgressModal');
      if (progressModal) progressModal.remove();
    } finally {
      const btn = event.target;
      btn.disabled = false;
      btn.innerHTML = 'Importar seleccionados';
    }
  });
}
