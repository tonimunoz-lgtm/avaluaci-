// classroom-ui.js - Manejador de interfaz para importación de Classroom
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, importClassroomCourse } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourse = null;
let currentProfessorUID = null;
let currentDB = null;

console.log('✅ classroom-ui.js cargado');

// Esperar a que app.js haya inicializado todo
function waitForAppInitialization() {
  return new Promise((resolve) => {
    console.log('⏳ Esperando inicialización de app.js...');
    
    // Comprobar cada 100ms si app.js está listo
    const interval = setInterval(() => {
      // Criterios para saber que app.js ha iniciado:
      // 1. firebase debe estar inicializado
      // 2. window.loadClassesScreen debe existir
      // 3. Debe haber un usuario autenticado (para el caso de página recargada)
      
      if (window.firebase && 
          window.firebase.firestore && 
          typeof window.loadClassesScreen === 'function') {
        
        console.log('✅ app.js está listo');
        clearInterval(interval);
        resolve();
      }
    }, 100);
    
    // Timeout máximo de 10 segundos
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
    
    const checkLogin = () => {
      // Comprobar si hay usuario autenticado
      const auth = window.firebase?.auth?.();
      
      if (auth && auth.currentUser) {
        console.log('✅ Usuario autenticado:', auth.currentUser.email);
        currentProfessorUID = auth.currentUser.uid;
        currentDB = window.firebase.firestore();
        clearInterval(interval);
        resolve();
      }
    };
    
    const interval = setInterval(checkLogin, 500);
    
    // Intentar una vez inmediatamente
    checkLogin();
    
    // Timeout máximo de 30 segundos (tiempo para que el usuario inicie sesión)
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
    // 1. Esperar a que app.js esté listo
    await waitForAppInitialization();
    
    // 2. Configurar el botón de Classroom
    setupClassroomButton();
    
    // 3. Monitorear el estado de login
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
          
          // Cuando el usuario inicia sesión, inyectar el botón
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
  if (!screenClasses) {
    console.log('⏳ screen-classes no existe aún, esperando...');
    setTimeout(setupClassroomButton, 500);
    return;
  }

  const btnDeleteMode = document.getElementById('btnDeleteMode');
  if (!btnDeleteMode) {
    console.log('⏳ btnDeleteMode no existe aún, esperando...');
    setTimeout(setupClassroomButton, 500);
    return;
  }

  // Evitar duplicados
  if (document.getElementById('btnClassroomImport')) {
    console.log('ℹ️ Botón de Classroom ya existe');
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'btnClassroomImport';
  btn.className = 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2 rounded-xl shadow transition-all duration-200 font-semibold flex items-center gap-2';
  btn.innerHTML = '🎓 Importar de Classroom';
  
  btn.addEventListener('click', async () => {
    console.log('🎓 Botón Classroom clickeado');
    console.log('currentProfessorUID:', currentProfessorUID);
    console.log('currentDB:', currentDB);
    
    if (!currentProfessorUID || !currentDB) {
      alert('❌ Necesitas iniciar sesión primero');
      return;
    }
    
    await openClassroomImportModal();
  });
  
  // Insertar después del botón de eliminar clase
  btnDeleteMode.parentNode.insertBefore(btn, btnDeleteMode.nextSibling);
  
  console.log('✅ Botón de Classroom inyectado');
}

// Abrir modal y cargar cursos
async function openClassroomImportModal() {
  console.log('🔓 Abriendo modal de Classroom...');
  
  if (!currentDB || !currentProfessorUID) {
    alert('❌ Error: Necesitas iniciar sesión primero');
    console.error('DB:', currentDB, 'UID:', currentProfessorUID);
    return;
  }
  
  openModal('modalClassroomImport');
  
  try {
    console.log('📚 Inicializando Google Classroom API...');
    // Inicializar API - esto abrirá un popup si es necesario
    await initClassroomAPI();
    console.log('✅ API inicializado');
    
    // Cargar cursos
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

  // Reset
  loadingState.classList.remove('hidden');
  coursesList.classList.add('hidden');
  errorState.classList.add('hidden');
  selectedCourse = null;
  document.getElementById('btnImportSelectedCourse').disabled = true;

  try {
    const courses = await getClassroomCourses();
    console.log('📚 Cursos obtenidos:', courses.length);

    if (courses.length === 0) {
      showClassroomError('No se encontraron cursos en tu Google Classroom.');
      return;
    }

    // Limpiar lista anterior
    coursesList.innerHTML = '<label class="text-sm font-semibold text-gray-700 mb-3 block">Selecciona un curso:</label>';

    const coursesContainer = document.createElement('div');
    coursesContainer.className = 'space-y-2';

    courses.forEach(course => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-3 p-3 border rounded hover:bg-indigo-50 cursor-pointer transition-colors';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'classroomCourse';
      radio.value = course.id;
      radio.className = 'w-4 h-4 text-indigo-500 cursor-pointer';
      
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedCourse = course;
          console.log('✅ Curso seleccionado:', course.name);
          document.getElementById('btnImportSelectedCourse').disabled = false;
        }
      });

      const span = document.createElement('span');
      span.className = 'flex-1 cursor-pointer';
      span.innerHTML = `
        <div class="font-medium text-gray-900">${escapeHtml(course.name)}</div>
        <div class="text-xs text-gray-600">${escapeHtml(course.descriptionHeading || 'Sin descripción')}</div>
      `;

      label.appendChild(radio);
      label.appendChild(span);
      
      // Hacer que al hacer clic en el span también se seleccione el radio
      span.addEventListener('click', () => {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      });

      coursesContainer.appendChild(label);
    });

    coursesList.appendChild(coursesContainer);
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

// Función de utilidad para escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Manejar clic en botón de importación
document.addEventListener('DOMContentLoaded', () => {
  // Usar un pequeño delay para asegurar que el botón se ha inyectado
  setTimeout(() => {
    const btnImport = document.getElementById('btnImportSelectedCourse');
    
    if (btnImport && !btnImport.dataset.listenerAdded) {
      btnImport.dataset.listenerAdded = 'true';
      
      btnImport.addEventListener('click', async () => {
        if (!selectedCourse) {
          alert('Selecciona un curso primero');
          return;
        }

        if (!currentDB || !currentProfessorUID) {
          alert('❌ Error: Necesitas iniciar sesión primero');
          return;
        }

        try {
          const btn = event.target;
          btn.disabled = true;
          btn.innerHTML = '⏳ Importando...';

          console.log('📚 Importando curso:', selectedCourse.name);
          
          // Importar el curso
          const newClassId = await importClassroomCourse(selectedCourse, currentDB, currentProfessorUID);
          
          console.log('✅ Clase importada con ID:', newClassId);
          alert('✅ Clase importada correctamente');
          closeModal('modalClassroomImport');
          
          // Recargar lista de clases usando la función global si existe
          if (window.loadClassesScreen && typeof window.loadClassesScreen === 'function') {
            console.log('🔄 Recargando lista de clases...');
            window.loadClassesScreen();
          }
          
        } catch (err) {
          console.error('Error importando:', err);
          alert('❌ Error importando la clase: ' + err.message);
        } finally {
          const btn = event.target;
          btn.disabled = false;
          btn.innerHTML = 'Importar';
        }
      });
    }
  }, 1000);
});
