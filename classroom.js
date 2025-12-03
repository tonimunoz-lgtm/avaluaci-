// classroom.js
// Funcions per interactuar amb Google Classroom
const CLASSROOM_API = "https://classroom.googleapis.com/v1";

// ID de la classe concreta de Classroom (canviar segons necessitat)
const CLASSROOM_COURSE_ID = "ID_DE_LA_CLASSE_AQUI";

// ------------------------ FUNCIONS PRINCIPALS ------------------------

// Importar alumnes
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
        if (!data.students || data.students.length === 0) {
            alert("No hi ha alumnes a aquesta classe Classroom.");
            return;
        }

        data.students.forEach(student => {
            const fullName = student.profile.name.fullName;
            addStudentToApp(fullName);
        });

        alert("Alumnes importats correctament!");
    } catch (err) {
        console.error("Error al importar alumnes:", err);
        alert("Error al importar alumnes: " + err.message);
    }
}

// Importar activitats
export async function importClassroomActivities() {
    if (!window._googleAccessToken) {
        alert("Has de fer login amb Google abans!");
        return;
    }

    try {
        const res = await fetch(`${CLASSROOM_API}/courses/${CLASSROOM_COURSE_ID}/courseWork`, {
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
        if (!data.courseWork || data.courseWork.length === 0) {
            alert("No hi ha activitats a aquesta classe Classroom.");
            return;
        }

        data.courseWork.forEach(activity => {
            const title = activity.title;
            addActivityToApp(title);
        });

        alert("Activitats importades correctament!");
    } catch (err) {
        console.error("Error al importar activitats:", err);
        alert("Error al importar activitats: " + err.message);
    }
}

// ------------------------ FUNCIONS D’AFEGIR A LA TEVA APP ------------------------

// Afegeix alumne al sistema sense tocar app.js ni terms.js
function addStudentToApp(fullName) {
    const event = new CustomEvent("classroomStudentAdded", { detail: { name: fullName } });
    document.dispatchEvent(event);
}

// Afegeix activitat al sistema sense tocar app.js ni terms.js
function addActivityToApp(title) {
    const event = new CustomEvent("classroomActivityAdded", { detail: { title } });
    document.dispatchEvent(event);
}

// ------------------------ BOTONS ------------------------

export function setupClassroomButton() {
    const btn = document.getElementById("importClassroom");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const action = prompt("Què vols importar? Escriu 'alumnes' o 'activitats':");
        if (!action) return;

        if (action.toLowerCase() === "alumnes") {
            await importClassroomStudents();
        } else if (action.toLowerCase() === "activitats") {
            await importClassroomActivities();
        } else {
            alert("Acció no vàlida. Escriu 'alumnes' o 'activitats'.");
        }
    });
}
