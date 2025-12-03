// classroom.js
// Funcions per importar alumnes des de Google Classroom

// URL base de l'API
const CLASSROOM_API = "https://classroom.googleapis.com/v1";

// ID de la classe concreta (pots canviar per un selector dinàmic)
const CLASSROOM_COURSE_ID = "ID_DE_LA_CLASSE_AQUI";

// Funció per obtenir alumnes
export async function importClassroomStudents() {
    if (!window._googleAccessToken) {
        alert("Has de fer login amb Google abans!");
        return;
    }

    try {
        const res = await fetch(`${CLASSROOM_API}/courses/${CLASSROOM_COURSE_ID}/students`, {
            headers: {
                "Authorization": `Bearer ${window._googleAccessToken}`
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Error Classroom:", errText);
            alert("Error accedint a Google Classroom: " + errText);
            return;
        }

        const data = await res.json();
        console.log("Alumnes Classroom:", data.students);

        if (!data.students || data.students.length === 0) {
            alert("No hi ha alumnes a aquesta classe Classroom.");
            return;
        }

        // Afegir alumnes al teu llistat
        data.students.forEach(student => {
            const fullName = `${student.profile.name.fullName}`;
            addStudentToApp(fullName);
        });

        alert("Alumnes importats correctament!");
    } catch (err) {
        console.error("Error al importar alumnes:", err);
        alert("Error al importar alumnes: " + err.message);
    }
}

// Exemple de funció per afegir alumnes al teu sistema
function addStudentToApp(fullName) {
    // Depèn de com estigui implementat el teu afegir alumne
    // Per exemple, si tens una funció que mostra la UI i actualitza la BD:
    // addStudentToList(fullName);

    console.log("Afegint alumne al sistema:", fullName);

    // Aquí pots cridar el teu modal / funció existent per afegir alumne:
    const event = new CustomEvent("classroomStudentAdded", { detail: { name: fullName } });
    document.dispatchEvent(event);
}

// Vincular amb el botó
export function setupClassroomButton() {
    const btn = document.getElementById("importClassroom");
    if (!btn) return;

    btn.addEventListener("click", () => {
        importClassroomStudents();
    });
}
