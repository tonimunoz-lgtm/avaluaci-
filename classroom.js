// classroom.js
// Funcions per interactuar amb Google Classroom
const CLASSROOM_API = "https://classroom.googleapis.com/v1";
const CLASSROOM_COURSE_ID = "ID_DE_LA_CLASSE_AQUI"; // Canviar per la classe concreta

// ------------------------ FUNCIONS PRINCIPALS ------------------------
export async function importClassroomStudents() {
    if (!window._googleAccessToken) {
        alert("Has de fer login amb Google abans!");
        return;
    }

    try {
        const res = await fetch(`${CLASSROOM_API}/courses/${CLASSROOM_COURSE_ID}/students`, {
            headers: { "Authorization": `Bearer ${window._googleAccessToken}` }
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        if (!data.students || data.students.length === 0) {
            alert("No hi ha alumnes a aquesta classe Classroom.");
            return;
        }

        data.students.forEach(student => addStudentToApp(student.profile.name.fullName));
        alert("Alumnes importats correctament!");
    } catch (err) {
        console.error("Error al importar alumnes:", err);
        alert("Error al importar alumnes: " + err.message);
    }
}

export async function importClassroomActivities() {
    if (!window._googleAccessToken) {
        alert("Has de fer login amb Google abans!");
        return;
    }

    try {
        const res = await fetch(`${CLASSROOM_API}/courses/${CLASSROOM_COURSE_ID}/courseWork`, {
            headers: { "Authorization": `Bearer ${window._googleAccessToken}` }
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        if (!data.courseWork || data.courseWork.length === 0) {
            alert("No hi ha activitats a aquesta classe Classroom.");
            return;
        }

        data.courseWork.forEach(activity => addActivityToApp(activity.title));
        alert("Activitats importades correctament!");
    } catch (err) {
        console.error("Error al importar activitats:", err);
        alert("Error al importar activitats: " + err.message);
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
