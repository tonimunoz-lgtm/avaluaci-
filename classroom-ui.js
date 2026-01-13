// classroom-ui.js - Manejador de interfaz para importación de Classroom (optimizado)
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, importClassroomCourse } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourses = [];
let currentProfessorUID = null;
let currentDB = null;

console.log('✅ classroom-ui.js cargado');

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📱 DOM cargado, inicializando classroom-ui.js...');
  
  // Inyectar el botón INMEDIATAMENTE
  // (no esperar a que app.js cargue completamente)
  setupClassroomButton();
  
  // Monitorear autenticación
  monitorAuthState();
});

// Monitorear cambios en el estado de autenticación
function monitorAuthState() {
  try {
    // Función para chequear auth
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
        // Reintentar en 500ms si Firebase aún no está listo
        setTimeout(checkAuth, 500);
      }
    };
    
    checkAuth();
  } catch (err) {
    console.error('Error monitoreando auth state:', err);
  }
}

// Configurar y inyectar el botón de Classroom
function setupClassroomButton() {
  // Buscar elementos necesarios
  const btnDeleteMode = document.getElementById('btnDeleteMode');
  
  // Si el botón de eliminar no existe aún, reintentar más tarde
  if (!btnDeleteMode) {
    console.log('⏳ Esperando DOM para inyectar botón...');
    setTimeout(setupClassroomButton, 300);
    return;
  }
  
  // Evitar duplicados
  if (document.getElementById('btnClassroomImport')) {
    console.log('ℹ️ Botón de Classroom ya existe');
    return;
  }

  // Crear botón
  const btn = document.createElement('button');
  btn.id = 'btnClassroomImport';
  btn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-xl shadow transition-transform font-semibold';
  btn.innerHTML = '🎓 Importar Classroom';
  
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
  
  console.log('✅ Botón de Classroom inyectado (tiempo rápido)');
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
    await initClassroomAPI();
    console.log('✅ API inicializado');
    
    console.log('📚 Cargando cursos de Classroom...');
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

        // Esperar un poquito a que Firestore se actualice
        setTimeout(() => {
          console.log('🔄 Recargando lista de clases...');
          if (window.loadClassesScreen && typeof window.loadClassesScreen === 'function') {
            window.loadClassesScreen();
          }
        }, 1000);

      } catch (err) {
        console.error('Error importando:', err);
        alert('❌ Error importando los cursos: ' + err.message);
      } finally {
        const btn = event.target;
        btn.disabled = false;
        btn.innerHTML = 'Importar';
      }
    });
  }, 100); // Reducido a 100ms en lugar de 1000ms
});
