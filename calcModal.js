// ---------------------------------------------------------
// calcModal.js — Versió 100% compatible amb el teu app.js
// ---------------------------------------------------------

// Funció per omplir el desplegable del modal amb les graelles
window.populateCalcTermSelect = function (classTerms) {
    const select = document.getElementById("calcTermSelect");
    if (!select) return;

    select.innerHTML = "";

    // Placeholder
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona graella...";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    // Afegir termes
    classTerms.forEach(term => {
        const option = document.createElement("option");
        option.value = term.id;
        option.textContent = term.name || "Sense nom";
        select.appendChild(option);
    });
};

// Obrir modal de càlcul
window.openCalcModal = function () {

    const modalCalc = document.getElementById("modalCalc");
    if (!modalCalc) return;

    // Mostrar modal
    modalCalc.classList.remove("hidden");
    modalCalc.style.display = "flex";

    // Omplir select amb termes si ja tenim dades de la classe carregades
    if (window.currentClassData?.terms) {
        window.populateCalcTermSelect(
            Object.values(window.currentClassData.terms)
        );
    }

    // Tancar modal
    const closeBtn = modalCalc.querySelector(".modal-close");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modalCalc.classList.add("hidden");
            modalCalc.style.display = "none";
        };
    }
};
