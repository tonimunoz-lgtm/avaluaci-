// terms.js — gestor de trimestres

window.initTerms = function () {
    console.log("initTerms OK");

    if (!window.currentClassId) return;

    const classTitle = document.getElementById("classTitle");
    const classSub = document.getElementById("classSub");

    // -----------------------------
    // 1) Afegir botó "+"
    // -----------------------------
    if (!document.getElementById("btnAddTerm")) {
        const btn = document.createElement("button");
        btn.id = "btnAddTerm";
        btn.className = "bg-green-500 text-white px-3 py-1 rounded ml-3";
        btn.textContent = "➕ Trimestre";
        btn.addEventListener("click", createNewTerm);
        classTitle.insertAdjacentElement("afterend", btn);
    }

    // -----------------------------
    // 2) Afegir selector de trimestre
    // -----------------------------
    if (!document.getElementById("termSelector")) {
        const sel = document.createElement("select");
        sel.id = "termSelector";
        sel.className = "border px-2 py-1 rounded ml-3";
        sel.addEventListener("change", loadSelectedTerm);
        classTitle.insertAdjacentElement("afterend", sel);
    }

    loadTermsList();
};

// --------------------------------------------------
// Llista de trimestres existents
// --------------------------------------------------
async function loadTermsList() {
    const sel = document.getElementById("termSelector");
    if (!sel || !window.currentClassId) return;

    sel.innerHTML = "";

    const snap = await db
        .collection("classes")
        .doc(window.currentClassId)
        .collection("trimestres")
        .get();

    if (snap.empty) {
        sel.innerHTML = `<option value="">Sense trimestres</option>`;
        return;
    }

    snap.forEach((doc) => {
        const opt = document.createElement("option");
        opt.value = doc.id;
        opt.textContent = doc.data().nom;
        sel.appendChild(opt);
    });

    // Carreguem el primer trimestre si cap està seleccionat
    if (!window.currentTermId && sel.options.length > 0) {
        window.currentTermId = sel.options[0].value;
        sel.value = window.currentTermId;
        loadTermData();
    } else {
        sel.value = window.currentTermId;
    }
}

// --------------------------------------------------
// Crear trimestre nou
// --------------------------------------------------
async function createNewTerm() {
    if (!window.currentClassId) return;

    const nom = prompt("Nom del nou trimestre:", "Segon trimestre");
    if (!nom) return;

    const docRef = await db
        .collection("classes")
        .doc(window.currentClassId)
        .collection("trimestres")
        .add({
            nom,
            activitats: []
        });

    window.currentTermId = docRef.id;
    loadTermsList();
    loadTermData();
}

// --------------------------------------------------
// Quan canvies de trimestre al selector
// --------------------------------------------------
function loadSelectedTerm(e) {
    window.currentTermId = e.target.value;
    loadTermData();
}

// --------------------------------------------------
// Carrega les ACTIVITATS del trimestre
// --------------------------------------------------
async function loadTermData() {
    if (!window.currentClassId || !window.currentTermId) return;

    const termDoc = await db
        .collection("classes")
        .doc(window.currentClassId)
        .collection("trimestres")
        .doc(window.currentTermId)
        .get();

    if (!termDoc.exists) return;

    const d = termDoc.data();

    // Actualitzar array global d’activitats
    window.classActivities = d.activitats || [];

    // Tornem a dibuixar la graella
    if (window.renderNotesGrid) renderNotesGrid();
}
