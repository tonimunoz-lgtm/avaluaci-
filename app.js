// Objecte global per guardar fórmules
const formulas = {}; // clau = id activitat, valor = fórmula

function renderNotesGrid() {
  // Neteja taula
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';

  // Capçalera alumne
  const headRow = document.createElement('tr');
  headRow.appendChild(th('Alumne'));

  // Carrega classe
  db.collection('classes').doc(currentClassId).get().then(doc => {
    if (!doc.exists) return;

    const classData = doc.data();
    const calculatedActs = classData.calculatedActivities || {};

    // Carrega activitats de la classe
    Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()))
      .then(actDocs => {

        // Capçalera activitats amb icona refrescar si és calculada
        actDocs.forEach(adoc => {
          const id = adoc.id;
          const name = adoc.exists ? (adoc.data().nom || 'Sense nom') : 'Desconegut';

          const thEl = th('');
          const container = document.createElement('div');
          container.className = 'flex items-center justify-between';

          const spanName = document.createElement('span');
          spanName.textContent = name;

          // Icona refrescar (només si és calculada)
          const refreshIcon = document.createElement('span');
          refreshIcon.innerHTML = '🔄';
          refreshIcon.title = 'Refrescar columna';
          refreshIcon.className = 'ml-2 cursor-pointer hidden';

          const menuDiv = document.createElement('div');
          menuDiv.className = 'relative';
          menuDiv.innerHTML = `
            <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮</button>
            <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10">
              <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
              <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
              <button class="calc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Càlcul</button>
            </div>
          `;

          container.appendChild(spanName);
          container.appendChild(refreshIcon);
          container.appendChild(menuDiv);
          thEl.appendChild(container);
          headRow.appendChild(thEl);

          // Capçalera color calculada
          if (calculatedActs[id]) {
            thEl.style.backgroundColor = "#fecaca";
            thEl.style.borderBottom = "3px solid #dc2626";
            thEl.style.color = "black";
            refreshIcon.classList.remove('hidden');
          }

          // Menú activitat
          const menuBtn = menuDiv.querySelector('.menu-btn');
          const menu = menuDiv.querySelector('.menu');
          menuBtn.addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
            menu.classList.toggle('hidden');
          });

          menuDiv.querySelector('.edit-btn').addEventListener('click', () => {
            const newName = prompt('Nou nom activitat:', name);
            if (!newName || newName.trim() === name) return;
            db.collection('activitats').doc(id).update({ nom: newName.trim() })
              .then(() => loadClassData());
          });

          menuDiv.querySelector('.delete-btn').addEventListener('click', () => removeActivity(id));
          menuDiv.querySelector('.calc-btn').addEventListener('click', () => openCalcModal(id));
        });

        headRow.appendChild(th('Mitjana', 'text-right'));
        notesThead.appendChild(headRow);

        enableActivityDrag();

        // Si no hi ha alumnes
        if (classStudents.length === 0) {
          notesTbody.innerHTML = `<tr><td class="p-3 text-sm text-gray-400" colspan="${classActivities.length + 2}">No hi ha alumnes</td></tr>`;
          renderAverages();
          addFormulaRow(actDocs); // Afegim fila fórmules encara que no hi hagi alumnes
          return;
        }

        // Cos taula alumnes
        Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()))
          .then(studentDocs => {
            studentDocs.forEach(sdoc => {
              const studentId = sdoc.id;
              const studentData = sdoc.exists ? sdoc.data() : { nom: 'Desconegut', notes: {} };

              let tr = document.querySelector(`tr[data-student-id="${studentId}"]`);
              if (!tr) {
                tr = document.createElement('tr');
                tr.dataset.studentId = studentId;

                // Nom alumne
                const tdName = document.createElement('td');
                tdName.className = 'border px-2 py-1';
                tdName.textContent = studentData.nom;
                tr.appendChild(tdName);

                // Notes activitats
                actDocs.forEach(actDoc => {
                  const actId = actDoc.id;
                  const val = (studentData.notes && studentData.notes[actId] !== undefined) ? studentData.notes[actId] : '';

                  const td = document.createElement('td');
                  td.className = 'border px-2 py-1';

                  if (calculatedActs[actId]) {
                    td.style.backgroundColor = "#ffe4e6";
                  }

                  const input = document.createElement('input');
                  input.type = 'number';
                  input.min = 0;
                  input.max = 10;
                  input.value = val;
                  input.dataset.activityId = actId;
                  input.className = 'table-input text-center rounded border p-1';

                  if (calculatedActs[actId]) {
                    input.disabled = true;
                    input.style.backgroundColor = "#fca5a5";
                  } else {
                    input.addEventListener('change', e => saveNote(studentId, actId, e.target.value));
                    input.addEventListener('input', () => applyCellColor(input));
                    applyCellColor(input);
                  }

                  td.appendChild(input);
                  tr.appendChild(td);
                });

                // Mitjana alumne
                const avgTd = document.createElement('td');
                avgTd.className = 'border px-2 py-1 text-right font-semibold';
                avgTd.textContent = computeStudentAverageText(studentData);
                tr.appendChild(avgTd);

                notesTbody.appendChild(tr);
              }
            });

            renderAverages();

            // Afegim la fila de fórmules al final
            addFormulaRow(actDocs);
          });
      });
  });
}

// Funció que afegeix la fila "Formula" al final de la taula
function addFormulaRow(actDocs) {
  // Neteja fila si ja existia
  let formulaRow = document.getElementById('formulaRow');
  if (!formulaRow) {
    formulaRow = document.createElement('tr');
    formulaRow.id = 'formulaRow';
    formulaRow.className = 'bg-yellow-50 italic';
  } else {
    formulaRow.innerHTML = '';
  }

  // Primera cel·la amb etiqueta
  const firstCell = document.createElement('td');
  firstCell.textContent = 'Formula';
  formulaRow.appendChild(firstCell);

  // Cel·les per activitats
  actDocs.forEach(actDoc => {
    const td = document.createElement('td');
    const actId = actDoc.id;
    td.textContent = formulas[actId] || '';
    td.className = 'text-center text-sm';
    formulaRow.appendChild(td);
  });

  // Cel·la final buida per la columna Mitjana
  formulaRow.appendChild(document.createElement('td'));

  notesTbody.appendChild(formulaRow);
}

// Quan s'assigna una fórmula des del modal
function setFormula(actId, formulaStr) {
  formulas[actId] = formulaStr;
  addFormulaRow(document.querySelectorAll('#notesThead th')); // actualitza fila
}
