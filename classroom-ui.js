// classroom-ui.js - Manejador de interfaz para importación de Classroom

import { initClassroomAPI, getClassroomCourses, importClassroomCourse } from './classroom.js';
import { openModal, closeModal } from './modals.js';

let selectedCourse = null;

// Botón para abrir modal de importación
export async function attachClassroomImportButton() {
  const btn = document.createElement('button');
  btn.id = 'btnClassroomImport';
  btn.className = 'bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl shadow transition-transform';
  btn.textContent = '🎓 Importar de Classroom';
  
  btn.addEventListener('click', openClassroomImportModal);
  
  // Insertar junto a los otros botones (después del botón de eliminar clase)
  const btnDeleteMode = document.getElementById('btnDeleteMode');
  if (btnDeleteMode && btnDeleteMode.parentNode) {
    btnDeleteMode.parentNode.insertBefore(btn, btnDeleteMode.nextSibling);
  }
}

async function openClassroomImportModal() {
  openModal('modalClassroomImport');
  
  try {
    // Inicializar API si aún no está
    await initClassroomAPI();
    
    // Cargar cursos
    await loadClassroomCourses();
  } catch (err) {
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

  try {
    const courses = await getClassroomCourses();

    if (courses.length === 0) {
      showClassroomError('No se encontraron cursos en tu Google Classroom.');
      return;
    }

    // Mostrar lista de cursos
    const listContainer = coursesList.querySelector('div') || coursesList;
    listContainer.innerHTML = '';

    courses.forEach(course => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-3 p-3 border rounded hover:bg-indigo-50 cursor-pointer transition-colors mb-2';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'classroomCourse';
      radio.value = course.id;
      radio.className = 'w-4 h-4 text-indigo-500';
      
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedCourse = course;
          document.getElementById('btnImportSelectedCourse').disabled = false;
        }
      });

      const span = document.createElement('span');
      span.className = 'flex-1';
      span.innerHTML = `
        <div class="font-medium text-gray-900">${course.name}</div>
        <div class="text-sm text-gray-600">${course.descriptionHeading || 'Sin descripción'}</div>
      `;

      label.appendChild(radio);
      label.appendChild(span);
      listContainer.appendChild(label);
    });

    if (!listContainer.parentElement.classList.contains('hidden')) {
      coursesList.innerHTML = '';
      coursesList.appendChild(listContainer);
    } else {
      coursesList.innerHTML = '';
      courses.forEach(course => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-3 p-3 border rounded hover:bg-indigo-50 cursor-pointer transition-colors mb-2';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'classroomCourse';
        radio.value = course.id;
        radio.className = 'w-4 h-4 text-indigo-500';
        
        radio.addEventListener('change', (e) => {
          if (e.target.checked) {
            selectedCourse = course;
            document.getElementById('btnImportSelectedCourse').disabled = false;
          }
        });

        const span = document.createElement('span');
        span.className = 'flex-1';
        span.innerHTML = `
          <div class="font-medium text-gray-900">${course.name}</div>
          <div class="text-sm text-gray-600">${course.descriptionHeading || 'Sin descripción'}</div>
        `;

        label.appendChild(radio);
        label.appendChild(span);
        coursesList.appendChild(label);
      });
    }

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

  errorState.textContent = message;
  errorState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  coursesList.classList.add('hidden');
}

// Botón para confirmar importación
export function attachImportConfirmButton(db, professorUID, loadClassesScreenCallback) {
  const btn = document.getElementById('btnImportSelectedCourse');
  
  btn.addEventListener('click', async () => {
    if (!selectedCourse) {
      alert('Selecciona un curso primero');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = '⏳ Importando...';

      const newClassId = await importClassroomCourse(selectedCourse, db, professorUID);
      
      alert('✅ Clase importada correctamente');
      closeModal('modalClassroomImport');
      
      // Recargar la lista de clases
      loadClassesScreenCallback();
      
    } catch (err) {
      console.error('Error importando:', err);
      alert('❌ Error importando la clase: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Importar';
    }
  });
}
