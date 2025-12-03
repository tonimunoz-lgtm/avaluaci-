// classroom.js
import { addNewTermWithName } from './terms.js'; // si vols afegir alumnes en un terme específic

let COURSE_ID_DYNAMIC = null;

// Funció que mostra modal i guarda el courseId
export function showClassroomModal() {
  const modal = document.getElementById("modalClassroom");
  modal.classList.remove("hidden");

  document.getElementById("modalClassroomCancel").onclick = () => {
    modal.classList.add("hidden");
  };

  const inputCourse = document.getElementById("modalClassroomCourseId");

  document.getElementById("modalClassroomImportStudents").onclick = async () => {
    const courseId = inputCourse.value.trim();
    if (!courseId) { alert("Introdueix l’ID del curs."); return; }
    COURSE_ID_DYNAMIC = courseId;
    modal.classList.add("hidden");
    await importClassroomStudents(COURSE_ID_DYNAMIC);
  };

  document.getElementById("modalClassroomImportActivities").onclick = async () => {
    const courseId = inputCourse.value.trim();
    if (!courseId) { alert("Introdueix l’ID del curs."); return; }
    COURSE_ID_DYNAMIC = courseId;
    modal.classList.add("hidden");
    await importClassroomActivities(COURSE_ID_DYNAMIC);
  };
}

// ------------------ LOGIN AMB GOOGLE ------------------
export async function loginWithGoogleClassroom() {
  return new Promise(async (resolve, reject) => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      [
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students'
      ].forEach(scope => provider.addScope(scope));

      const result = await firebase.auth().signInWithPopup(provider);
      const credential = result.credential;
      const accessToken = credential.accessToken;
      window._googleAccessToken = accessToken;
      resolve(accessToken);
    } catch (err) {
      console.error("Error Google Classroom login:", err);
      reject(err);
    }
  });
}

// ------------------ IMPORTAR ALUMNES ------------------
export async function importClassroomStudents(courseId) {
  try {
    const accessToken = window._googleAccessToken || await loginWithGoogleClassroom();
    const url = `https://classroom.googleapis.com/v1/courses/${courseId}/students`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const students = data.students || [];
    if (students.length === 0) { alert("No s'han trobat alumnes."); return; }

    const batch = firebase.firestore().batch();
    const studentsCollection = firebase.firestore().collection('students');

    students.forEach(student => {
      const studentRef = studentsCollection.doc(student.userId);
      batch.set(studentRef, {
        name: student.profile.name.fullName,
        email: student.profile.emailAddress,
        classroomId: student.userId,
        createdAt: Date.now()
      }, { merge: true });
    });

    await batch.commit();
    alert(`${students.length} alumnes importats correctament!`);

  } catch (err) {
    console.error("Error import alumnes Classroom:", err);
    alert("Error important alumnes: " + err.message);
  }
}

// ------------------ IMPORTAR ACTIVITATS (placeholder) ------------------
export async function importClassroomActivities(courseId) {
  alert("Funció d'importar activitats encara no implementada.");
}



// ------------------------ FUNCIONS D’AFEGIR A LA TEVA APP ------------------------
function addStudentToApp(fullName) {
    document.dispatchEvent(new CustomEvent("classroomStudentAdded", { detail: { name: fullName } }));
}

function addActivityToApp(title) {
    document.dispatchEvent(new CustomEvent("classroomActivityAdded", { detail: { title } }));
}

// ------------------------ MINI MENÚ DESPLEGABLE ------------------------
export function setupClassroomButton() {
    const btn = document.getElementById("importClassroom");
    if (!btn) return;

    // Crear el menú si no existeix
    let menu = document.getElementById("classroomMiniMenu");
    if (!menu) {
        menu = document.createElement("div");
        menu.id = "classroomMiniMenu";
        menu.className = "absolute bg-white border rounded shadow p-2 hidden z-50";
        menu.innerHTML = `
            <button id="importStudentsBtn" class="px-3 py-1 w-full text-left hover:bg-gray-200 whitespace-nowrap">Importar alumnes</button>
            <button id="importActivitiesBtn" class="px-3 py-1 w-full text-left hover:bg-gray-200 whitespace-nowrap">Importar activitats</button>
        `;
        document.body.appendChild(menu);
    }

    // Mostrar menú
    btn.addEventListener("click", (e) => {
        const rect = btn.getBoundingClientRect();
        menu.style.top = rect.bottom + window.scrollY + "px";
        menu.style.left = rect.left + window.scrollX + "px";
        menu.classList.toggle("hidden");
    });

    // Click fora per tancar
    document.addEventListener("click", (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add("hidden");
        }
    });

    // Assignar accions
    document.getElementById("importStudentsBtn").addEventListener("click", async () => {
        menu.classList.add("hidden");
        await importClassroomStudents();
    });

    document.getElementById("importActivitiesBtn").addEventListener("click", async () => {
        menu.classList.add("hidden");
        await importClassroomActivities();
    });
}
