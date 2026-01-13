// classroom-ui.js - Manejador de interfaz para importación de Classroom (multiselección)
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, importClassroomCourse } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourses = [];
let currentProfessorUID = null;
let currentDB = null;

console.log('✅ classroom-ui.js cargado');

// Esperar a que app.js haya inicializado todo
function waitForAppInitialization() {
  return new Promise((resolve) => {
    console.log('⏳ Esperando inicialización de app.js...');
    const interval = setInterval(() => {
      if (window.firebase && 
          window.firebase.firestore && 
          typeof window.loadClassesScreen === 'function') {
        console.log('✅ app.js está listo');
        clearInterval(interval);
        resolve();
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(interval);
      console.warn('⚠️ Timeout esperando app.js, continuando de todas formas...');
      resolve();
    }, 10000);
  });
}

// Esperar a que el usuario inicie sesión
function waitForUserLogin() {
  return new Promise((resolve) => {
    console.log('⏳ Esperando login del usuario...');
    
    const interval = setInterval(() => {
      const auth = window.firebase?.auth?.();
      if (auth && auth.currentUser) {
        console.log('✅ Usuario autenticado:', auth.currentUser.email);
        currentProfessorUID = auth.currentUser.uid;
        currentDB = window.firebase.firestore();
        clearInterval(interval);
        resolve();
      }
    }, 500);
    
    setTimeout(() => {
      clearInterval(interval);
      console.warn('⚠️ Timeout esperando login');
    }, 30000);
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📱 DOM cargado, inicializando classroom-ui.js...');
  try {
    await waitForAppInitialization();
    setupClassroomButton();
    monitorAuthState();
  } catch (err) {
    console.error('❌ Error inicializando classroom-ui:', err);
  }
});

// Monitorear cambios en el estado de autenticación
function monitorAuthState() {
  try {
    const auth = window.firebase?.auth?.();
    if (auth) {
      auth.onAuthStateChanged((user) => {
        if (user) {
          console.log('✅ Usuario detectado:', user.email);
          currentProfessorUID = user.uid;
          currentDB = window.firebase.firestore();
          setTimeout(() => {
            if (!document.getElementById('btnClassroomImport')) {
              setupClassroomButton();
            }
          }, 500);
        } else {
          console.log('⚠️ Usuario cerró sesión');
          currentProfessorUID = null;
          currentDB = null;
        }
      });
    }
  } catch (err) {
    console.error('Error monitoreando auth state:', err);
  }
}

// Configurar y inyectar el botón de Classroom
function setupClassroomButton() {
  const screenClasses = document.getElementById('screen-classes');
  const btnDeleteMode = document.getElementById('btnDeleteMode');
  if (!screenClasses || !btnDeleteMode) {
    setTimeout(setupClassroomButton, 500);
    return;
  }
  
  if (document.getElementById('btnClassroomImport')) return;

  const btn = document.createElement('button');
  btn.id = 'btnClassroomImport';
  btn.className = 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2 rounded-xl shadow transition-transform';
  btn.innerHTML = '🎓 Importar Classroom';
  btn.addEventListener('click', async () => {
    if (!currentProfessorUID || !currentDB) {
      alert('❌ Necesitas iniciar sesión primero');
      return;
    }
    await openClassroomImportModal();
  });

  btnDeleteMode.parentNode.insertBefore(btn, btnDeleteMode.nextSibling);
  console.log('✅ Botón de Classroom inyectado');
}

// Abrir modal y cargar cursos
async function openClassroomImportModal() {
  console.log('🔓 Abriendo modal de Classroom...');
  if (!currentDB || !currentProfessorUID) {
    alert('❌ Necesitas iniciar sesión primero');
    return;
  }
  
  openModal('modalClassroomImport');
  try {
    console.log('📚 Inicializando Google Classroom API...');
    await initClassroomAPI();
    console.log('✅ API inicializado');
    await loadClassroomCourses();
  } catch (err) {
    console.error('❌ Error completo:', err);
    showClassroomError('Error inicializando Google Classroom: ' + (err.message || JSON.stringify(err)));
  }
}

// Cargar cursos y mostrarlos en el modal
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Botón de importación
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const btnImport = document.getElementById('btnImportSelectedCourse');
    if (!btnImport || btnImport.dataset.listenerAdded) return;

    btnImport.dataset.listenerAdded = 'true';
    btnImport.addEventListener('click', async (event) => {
      if (selectedCourses.length === 0) return alert('Selecciona al menos un curso');

      if (!currentDB || !currentProfessorUID) return alert('❌ Necesitas iniciar sesión primero');

      try {
        const btn = event.target;
        btn.disabled = true;
        btn.innerHTML = '⏳ Importando...';

        for (const course of selectedCourses) {
          console.log('📚 Importando curso:', course.name);
          await importClassroomCourse(course, currentDB, currentProfessorUID);
        }

        console.log('✅ Cursos importados correctamente');
        alert('✅ Cursos importados correctamente');
        closeModal('modalClassroomImport');

        if (window.loadClassesScreen) window.loadClassesScreen();

      } catch (err) {
        console.error('Error importando:', err);
        alert('❌ Error importando los cursos: ' + err.message);
      } finally {
        const btn = event.target;
        btn.disabled = false;
        btn.innerHTML = 'Importar';
      }
    });
  }, 1000);
});
