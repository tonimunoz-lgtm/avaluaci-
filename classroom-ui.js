// classroom-ui.js - Manejador de interfaz para importación de Classroom
// Funciona de forma independiente sin necesidad de modificar app.js

import { initClassroomAPI, getClassroomCourses, importClassroomCourse } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourse = null;
let currentProfessorUID = null;
let currentDB = null;

// Auto-inicializar cuando el DOM está listo
document.addEventListener('DOMContentLoaded', initializeClassroomUI);

async function initializeClassroomUI() {
  // Esperar a que la app esté lista (máximo 5 segundos)
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    
    // Verificar si window.Terms existe (indicador de que app.js ha cargado)
    if (window.Terms || attempts > 50) {
      clearInterval(interval);
      
      // Inyectar el botón en la pantalla de clases
      injectClassroomButton();
      
      // Observar cambios en el DOM para detectar cuando se carga la pantalla
      setupDOMObserver();
    }
  }, 100);
}

// Inyectar botón de Classroom en la pantalla de clases
function injectClassroomButton() {
  // Esperar a que exista el contenedor de botones
  const observer = new MutationObserver(() => {
    const btnDeleteMode = document.getElementById('btnDeleteMode');
    const screenClasses = document.getElementById('screen-classes');
    
    if (btnDeleteMode && !document.getElementById('btnClassroomImport') && screenClasses) {
      const btn = document.createElement('button');
      btn.id = 'btnClassroomImport';
      btn.className = 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2 rounded-xl shadow transition-all duration-200 font-semibold flex items-center gap-2';
      btn.innerHTML = '🎓 Importar de Classroom';
      
      btn.addEventListener('click', openClassroomImportModal);
      
      // Insertar después del botón de eliminar clase
      btnDeleteMode.parentNode.insertBefore(btn, btnDeleteMode.nextSibling);
      
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Configurar observador para detectar cuando se muestra la pantalla de clases
function setupDOMObserver() {
  const observer = new MutationObserver((mutations) => {
    const screenClasses = document.getElementById('screen-classes');
    
    mutations.forEach(mutation => {
      // Detectar cuando la pantalla de clases está visible
      if (mutation.target === screenClasses) {
        const isVisible = !screenClasses.classList.contains('hidden');
        
        if (isVisible && !document.getElementById('btnClassroomImport')) {
          injectClassroomButton();
        }
      }
    });
  });
  
  observer.observe(document.getElementById('screen-classes') || document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });
}

// Abrir modal y cargar cursos
async function openClassroomImportModal() {
  // Capturar el UID del profesor desde window (establecido por app.js)
  if (window.professorUID) {
    currentProfessorUID = window.professorUID;
  }
  
  // Capturar la instancia de Firebase
  if (window.firebase && window.firebase.firestore) {
    currentDB = window.firebase.firestore();
  }
  
  if (!currentDB || !currentProfessorUID) {
    alert('Error: Necesitas iniciar sesión primero');
    return;
  }
  
  openModal('modalClassroomImport');
  
  try {
    // Inicializar API si aún no está
    await initClassroomAPI();
    
    // Cargar cursos
    await loadClassroomCourses();
  } catch (err) {
    console.error('Error:', err);
    showClassroomError('Error inicializando Google Classroom: ' + err.message);
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

    if (courses.length === 0) {
      showClassroomError('No se encontraron cursos en tu Google Classroom.');
      return;
    }

    // Limpiar lista anterior
    coursesList.innerHTML = '';
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
  const btnImport = document.getElementById('btnImportSelectedCourse');
  
  if (btnImport) {
    btnImport.addEventListener('click', async () => {
      if (!selectedCourse) {
        alert('Selecciona un curso primero');
        return;
      }

      if (!currentDB || !currentProfessorUID) {
        alert('Error: Necesitas iniciar sesión primero');
        return;
      }

      try {
        const btn = event.target;
        btn.disabled = true;
        btn.innerHTML = '⏳ Importando...';

        // Importar el curso
        const newClassId = await importClassroomCourse(selectedCourse, currentDB, currentProfessorUID);
        
        alert('✅ Clase importada correctamente');
        closeModal('modalClassroomImport');
        
        // Recargar lista de clases usando la función global si existe
        if (window.loadClassesScreen && typeof window.loadClassesScreen === 'function') {
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
});
