window.populateCalcTermSelect = function (classTerms) {
    const select = document.getElementById("calcTermSelect");
    if (!select) return;

    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona graella...";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    classTerms.forEach(term => {
        const option = document.createElement("option");
        option.value = term.id;
        option.textContent = term.name || "Sense nom";
        select.appendChild(option);
    });
};
