// terms.js
import { db } from './firebase.js';
import { renderNotesGrid } from './app.js';

window.initTerms = function() {
   console.log("terms carregat");
};


export async function initTerms(currentClassId) {
  const selector = document.getElementById("termSelector");
  const btnAdd = document.getElementById("btnAddTerm");
  if (!selector || !btnAdd) return;

  // Carregar trimestres existents
  async function loadTerms() {
    selector.innerHTML = "";

    const snap = await db.collection("classes")
                         .doc(currentClassId)
                         .collection("terms")
                         .get();

    if (snap.empty) {
      // Crear automàticament Primer trimestre si no n'hi ha cap
      const first = await db.collection("classes")
                            .doc(currentClassId)
                            .collection("terms")
                            .add({
                              nom: "Primer trimestre",
                              classActivities: [],
                              calculatedActivities: {}
                            });

      const opt = document.createElement("option");
      opt.value = first.id;
      opt.textContent = "Primer trimestre";
      selector.appendChild(opt);

      selector.value = first.id;
      renderNotesGrid(first.id);
      return;
    }

    snap.forEach(doc => {
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = doc.data().nom;
      selector.appendChild(opt);
    });

    selector.value = selector.value || snap.docs[0].id;
    renderNotesGrid(selector.value);
  }

  await loadTerms();

  // Canviar de trimestre
  selector.addEventListener("change", () => {
    renderNotesGrid(selector.value);
  });

  // Crear nou trimestre
  btnAdd.addEventListener("click", async () => {
    const nom = prompt("Nom del nou trimestre:");
    if (!nom) return;

    const newTerm = await db.collection("classes")
                            .doc(currentClassId)
                            .collection("terms")
                            .add({
                              nom,
                              classActivities: [],
                              calculatedActivities: {}
                            });

    const opt = document.createElement("option");
    opt.value = newTerm.id;
    opt.textContent = nom;
    selector.appendChild(opt);

    selector.value = newTerm.id;
    renderNotesGrid(newTerm.id);
  });
}
