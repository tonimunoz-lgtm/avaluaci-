// classroom.js
import { addNewTermWithName } from './terms.js'; // si vols afegir alumnes en un terme específic

// ------------------ CONFIGURACIÓ ------------------
const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly'
];

// ⚠️ Canvia-ho per l'ID de la teva classe concreta de Classroom
const CLASSROOM_COURSE_ID = 'gse6foyp';

// ------------------ LOGIN AMB GOOGLE ------------------
export async function loginWithGoogleClassroom() {
  return new Promise(async (resolve, reject) => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      CLASSROOM_SCOPES.forEach(scope => provider.addScope(scope));

      const result = await firebase.auth().signInWithPopup(provider);

      // Guardem el token per fer crides a l’API de Classroom
      const credential = result.credential;
      const accessToken = credential.accessToken;
      window._googleAccessToken = accessToken;

      console.log("Sessió iniciada correctament amb Google Classroom!");
      resolve(accessToken);
    } catch (err) {
      console.error("Error iniciant sessió amb Google Classroom:", err);
      reject(err);
    }
  });
}

// ------------------ OBTENIR ALUMNES DE CLASSROOM ------------------
async function fetchClassroomStudents(accessToken) {
  if (!accessToken) throw new Error("No hi ha token d'autenticació.");

  const url = `https://classroom.googleapis.com/v1/courses/${CLASSROOM_COURSE_ID}/students`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`Error accedint a Google Classroom: ${JSON.stringify(errData)}`);
  }

  const data = await res.json();
  return data.students || [];
}

// ------------------ IMPORTAR ALUMNES A FIRESTORE ------------------
export async function importClassroomStudents() {
  try {
    let token = window._googleAccessToken;
    if (!token) {
      token = await loginWithGoogleClassroom();
    }

    const students = await fetchClassroomStudents(token);

    if (students.length === 0) {
      alert("No s'han trobat alumnes a aquesta classe de Classroom.");
      return;
    }

    // Exemple d'importació: afegir-los a la llista de Firestore
    const batch = firebase.firestore().batch();
    const studentsCollection = firebase.firestore().collection('students');

    students.forEach(student => {
      const studentRef = studentsCollection.doc(student.userId); // o generar un id nou
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
    console.error("Error important alumnes de Classroom:", err);
    alert("Error accedint a Google Classroom: " + err.message);
  }
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
