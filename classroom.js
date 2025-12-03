// classroom.js
import { addNewTermWithName } from './terms.js';

let COURSE_ID_DYNAMIC = null;

export function showClassroomModal() {
  const modal = document.getElementById("modalClassroom");
  if (!modal) return;
  modal.classList.remove("hidden");

  const inputCourse = document.getElementById("modalClassroomCourseId");

  document.getElementById("modalClassroomCancel").onclick = () => {
    modal.classList.add("hidden");
  };

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

export async function loginWithGoogleClassroom() {
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
    return accessToken;
  } catch (err) {
    console.error("Error Google Classroom login:", err);
    throw err;
  }
}

export async function importClassroomStudents(courseId) {
  try {
    const accessToken = await loginWithGoogleClassroom();

    const url = `https://classroom.googleapis.com/v1/courses/${courseId}/students`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }

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
    alert("Error accedint a Google Classroom: " + (err.message || err));
  }
}

export async function importClassroomActivities(courseId) {
  alert("Funció d'importar activitats encara no implementada.");
}

export function setupClassroomButton() {
  const btn = document.getElementById("importClassroom");
  if (!btn) return;
  btn.addEventListener("click", showClassroomModal);
}



// ------------------ IMPORTAR ACTIVITATS (placeholder) ------------------
export async function importClassroomActivities(courseId) {
  alert("Funció d'importar activitats encara no implementada.");
}

// ------------------------ BOTÓ CLASSROOM ------------------------
export function setupClassroomButton() {
  const btn = document.getElementById("importClassroom");
  if (!btn) return;
  btn.addEventListener("click", showClassroomModal);
}
