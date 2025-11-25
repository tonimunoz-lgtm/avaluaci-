/* ---------------- Globals & DOM ---------------- */
let currentClassId = null;
let currentCalcActivityId = null;
let classActivities = [];
let classStudents = [];

const notesThead = document.getElementById('notesThead');
const notesTbody = document.getElementById('notesTbody');
const notesTfoot = document.getElementById('notesTfoot');
const formulaTfoot = document.getElementById('formulaTfoot');

const btnExport = document.getElementById('btnExport');

// ---------------- Render Notes Grid ----------------
async function renderNotesGrid() {
  // Neteja taula
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';
  formulaTfoot.innerHTML = '';

  // Capçalera alumne
  const headRow = document.createElement('tr');
  headRow.appendChild(th('Alumne'));

  // Carrega classe
  const classDoc = await db.collection('classes').doc(currentClassId).get();
  if (!classDoc.exists) return;
  const classData = classDoc.data();
  const calculatedActs = classData.calculatedActivities || {};

  // Carrega activitats
  const actDocs = await Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()));

  // Capçalera activitats amb icones
  actDocs.forEach(adoc => {
    const id = adoc.id;
    const name = adoc.exists ? (adoc.data().nom || 'Sense nom') : 'Desconegut';
    const thEl = th('');
    const container = document.createElement('div');
    container.className = 'flex items-center justify-between';

    const spanName = document.createElement('span');
    spanName.textContent = name;

    // Candau
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon cursor-pointer mr-1';
    lockIcon.innerHTML = calculatedActs[id]?.locked ? '🔒' : '🔓';
    lockIcon.title = calculatedActs[id]?.locked ? 'Activitat bloquejada' : 'Activitat desbloquejada';
    if (calculatedActs[id]?.calculated) lockIcon.classList.add('hidden');

    lockIcon.addEventListener('click', async () => {
      try {
        const newLockState = !calculatedActs[id]?.locked;
        await db.collection('classes').doc(currentClassId).update({
          [`calculatedActivities.${id}.locked`]: newLockState
        });
        if (!calculatedActs[id]) calculatedActs[id] = {};
        calculatedActs[id].locked = newLockState;
        await renderNotesGrid(); // 🔥 UI actualitzada
      } catch (e) {
        console.error('Error canviant bloqueig:', e);
        alert('Error canviant bloqueig: ' + e.message);
      }
    });

    container.prepend(lockIcon);
    container.appendChild(spanName);
    thEl.appendChild(container);
    headRow.appendChild(thEl);

    // Estil per capçaleres calculades
    if (calculatedActs[id]?.calculated) {
      thEl.style.backgroundColor = "#dbeafe";
      thEl.style.borderBottom = "3px solid #1d4ed8";
      thEl.style.color = "black";
    }
  });

  headRow.appendChild(th('Mitjana', 'text-right'));
  notesThead.appendChild(headRow);

  enableActivityDrag();

  if (classStudents.length === 0) {
    notesTbody.innerHTML = `<tr><td class="p-3 text-sm text-gray-400" colspan="${classActivities.length + 2}">No hi ha alumnes</td></tr>`;
    renderAverages();
    return;
  }

  // Carrega alumnes
  const studentDocs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));
  studentDocs.forEach(sdoc => {
    const studentId = sdoc.id;
    const studentData = sdoc.exists ? sdoc.data() : { nom: 'Desconegut', notes: {} };
    const tr = document.createElement('tr');
    tr.dataset.studentId = studentId;

    const tdName = document.createElement('td');
    tdName.className = 'border px-2 py-1';
    tdName.textContent = studentData.nom;
    tr.appendChild(tdName);

    actDocs.forEach(actDoc => {
      const actId = actDoc.id;
      const val = (studentData.notes && studentData.notes[actId] !== undefined) ? studentData.notes[actId] : '';
      const td = document.createElement('td');
      td.className = 'border px-2 py-1';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 10;
      input.value = val;
      input.dataset.activityId = actId;
      input.className = 'table-input text-center rounded border p-1';

      const isLocked = !!(calculatedActs[actId]?.locked) || !!(calculatedActs[actId]?.calculated);
      input.disabled = isLocked;
      if (isLocked) input.classList.add('blocked-cell');

      applyCellColor(input);

      if (!isLocked) {
        input.addEventListener('input', () => applyCellColor(input));
        input.addEventListener('change', async (e) => {
          const newVal = e.target.value;
          try {
            input.disabled = true;
            await saveNote(studentId, actId, newVal);
            applyCellColor(input);
            renderAverages();
          } catch (err) {
            console.error('Error guardant nota:', err);
            alert('Error guardant la nota: ' + err.message);
          } finally {
            const nowLocked = !!(calculatedActs[actId]?.locked) || !!(calculatedActs[actId]?.calculated);
            input.disabled = nowLocked;
          }
        });
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
  });

  renderAverages();
}

// Helper th
function th(txt, cls=''){
  const el = document.createElement('th');
  el.className = 'border px-2 py-1 ' + cls;
  el.textContent = txt;
  return el;
}
/* ---------------- Menús i icones d’activitat ---------------- */
async function buildActivityHeader() {
  const classDoc = await db.collection('classes').doc(currentClassId).get();
  if (!classDoc.exists) return;
  const classData = classDoc.data();
  const calculatedActs = classData.calculatedActivities || {};

  const headRow = notesThead.querySelector('tr') || document.createElement('tr');

  // Limpiar abans de recrear
  headRow.innerHTML = '';
  headRow.appendChild(th('Alumne'));

  for (const actId of classActivities) {
    const actDoc = await db.collection('activitats').doc(actId).get();
    const name = actDoc.exists ? actDoc.data().nom : 'Desconegut';

    const thEl = th('');
    const container = document.createElement('div');
    container.className = 'flex items-center justify-between';

    const spanName = document.createElement('span');
    spanName.textContent = name;

    // Candau
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon cursor-pointer mr-1';
    lockIcon.innerHTML = calculatedActs[actId]?.locked ? '🔒' : '🔓';
    lockIcon.title = calculatedActs[actId]?.locked ? 'Activitat bloquejada' : 'Activitat desbloquejada';
    if (calculatedActs[actId]?.calculated) lockIcon.classList.add('hidden');

    lockIcon.addEventListener('click', async () => {
      try {
        const newLockState = !calculatedActs[actId]?.locked;
        await db.collection('classes').doc(currentClassId).update({
          [`calculatedActivities.${actId}.locked`]: newLockState
        });
        if (!calculatedActs[actId]) calculatedActs[actId] = {};
        calculatedActs[actId].locked = newLockState;
        await renderNotesGrid();
      } catch (e) {
        console.error('Error canviant bloqueig:', e);
        alert('Error canviant bloqueig: ' + e.message);
      }
    });

    // Icona refrescar (només si és calculada)
    const refreshIcon = document.createElement('span');
    refreshIcon.innerHTML = '🔄';
    refreshIcon.title = 'Refrescar columna';
    refreshIcon.className = 'ml-2 cursor-pointer hidden';
    if (calculatedActs[actId]?.calculated) refreshIcon.classList.remove('hidden');

    refreshIcon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const formulasRow = formulaTfoot.querySelector('.formulas-row');
      if (!formulasRow) return;
      const idx = Array.from(headRow.children).indexOf(thEl);
      const formulaTd = formulasRow.children[idx];
      if (!formulaTd) return;
      const formulaText = formulaTd.textContent.trim();
      if (!formulaText) return alert('No hi ha cap fórmula aplicada a aquesta activitat.');

      try {
        await Promise.all(classStudents.map(async sid => {
          const result = await evalFormulaAsync(formulaText, sid);
          await saveNote(sid, actId, result);
        }));
        await renderNotesGrid();
      } catch (err) {
        console.error('Error recalculant fórmula:', err);
        alert('Error recalculant la fórmula: ' + err.message);
      }
    });

    // Menú activitat
    const menuDiv = document.createElement('div');
    menuDiv.className = 'relative';
    menuDiv.innerHTML = `
      <button class="menu-btn text-gray-500 hover:text-gray-700 dark:hover:text-white tooltip">⋮</button>
      <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10">
        <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
        <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
        <button class="calc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Càlcul</button>
        <button class="clear-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Netejar</button>
      </div>
    `;

    container.prepend(lockIcon);
    container.appendChild(spanName);
    container.appendChild(refreshIcon);
    container.appendChild(menuDiv);
    thEl.appendChild(container);
    headRow.appendChild(thEl);

    // Menú funcionalitat
    const menuBtn = menuDiv.querySelector('.menu-btn');
    const menu = menuDiv.querySelector('.menu');
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
      menu.classList.toggle('hidden');
    });

    menuDiv.querySelector('.edit-btn').addEventListener('click', async () => {
      const newName = prompt('Nou nom activitat:', name);
      if (!newName || newName.trim() === name) return;
      await db.collection('activitats').doc(actId).update({ nom: newName.trim() });
      renderNotesGrid();
    });

    menuDiv.querySelector('.clear-btn').addEventListener('click', async () => {
      if (!confirm('Segur que vols esborrar totes les notes d’aquesta activitat?')) return;
      try {
        await Promise.all(classStudents.map(sid => saveNote(sid, actId, '')));
        await db.collection('classes').doc(currentClassId).update({
          [`calculatedActivities.${actId}`]: firebase.firestore.FieldValue.delete()
        });
        renderNotesGrid();
      } catch(e) {
        console.error('Error netejant notes:', e);
        alert('Error netejant les notes: ' + e.message);
      }
    });

    menuDiv.querySelector('.delete-btn').addEventListener('click', () => removeActivity(actId));
    menuDiv.querySelector('.calc-btn').addEventListener('click', () => openCalcModal(actId));
  }

  headRow.appendChild(th('Mitjana', 'text-right'));
  notesThead.appendChild(headRow);
}
// ─────────── Helpers de càlcul ───────────

// Numeric: aplica un valor numèric a tots els alumnes
async function applyNumeric(val) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => saveNote(sid, currentCalcActivityId, val)));
}

// Fórmula: aplica la fórmula a tots els alumnes
async function applyFormula(formula) {
  if (!formula.trim()) throw new Error('Formula buida');
  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid);
    await saveNote(sid, currentCalcActivityId, result);
  }));
}

// Arrodoniment: aplica arrodoniment a una activitat existent
async function applyRounding(formula) {
  if (!formula.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

  const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
  const selectedActivityDoc = activityDocs.find(doc => doc.exists && formula.startsWith(doc.data().nom));
  if (!selectedActivityDoc) throw new Error('Activitat no trobada');

  const selectedActivityName = selectedActivityDoc.data().nom;
  const multiplier = Number(formula.slice(selectedActivityName.length)) || 1;

  await Promise.all(classStudents.map(async sid => {
    const studentDoc = await db.collection('alumnes').doc(sid).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
    let val = Number(notes[selectedActivityDoc.id]) || 0;

    if (multiplier === 1) val = Math.round(val);
    else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

    await saveNote(sid, currentCalcActivityId, val);
  }));
}

// ─────────── Event Listener per modal ───────────
modalApplyCalcBtn.addEventListener('click', async () => {
  if (!currentCalcActivityId) return;

  try {
    let formulaText = '';
    let displayFormulaText = '';

    switch (calcTypeSelect.value) {
      case 'numeric':
        await applyNumeric(Number(numericField.value));
        formulaText = numericField.value;
        displayFormulaText = numericField.value;
        break;

      case 'formula':
        await applyFormula(formulaField.value);
        formulaText = formulaField.value;
        displayFormulaText = formulaField.value;
        break;

      case 'rounding':
        if (!formulaField.value.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

        const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
        const selectedActivityDoc = activityDocs.find(doc => doc.exists && formulaField.value.startsWith(doc.data().nom));
        if (!selectedActivityDoc) throw new Error('Activitat no trobada');

        const selectedActivityName = selectedActivityDoc.data().nom;
        const selectedActivityId = selectedActivityDoc.id;
        const multiplierStr = formulaField.value.slice(selectedActivityName.length).trim();
        const multiplier = multiplierStr === '' ? 1 : Number(multiplierStr);

        await Promise.all(classStudents.map(async sid => {
          const studentDoc = await db.collection('alumnes').doc(sid).get();
          const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
          let val = Number(notes[selectedActivityId]);
          if (isNaN(val)) val = 0;

          if (multiplier === 1) val = Math.round(val);
          else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

          await saveNote(sid, currentCalcActivityId, val);
        }));

        if (multiplier === 1) {
          formulaText = `Math.round(__ACT__${selectedActivityId})`;
          displayFormulaText = `Math.round(${selectedActivityName})`;
        } else if (multiplier === 0.5) {
          formulaText = `Math.round(__ACT__${selectedActivityId}*2)/2`;
          displayFormulaText = `Math.round(${selectedActivityName}*2)/2`;
        } else {
          formulaText = `__ACT__${selectedActivityId}`;
          displayFormulaText = `${selectedActivityName}`;
        }
        break;

      default:
        throw new Error('Tipus de càlcul desconegut');
    }

    if (currentClassId) {
      await db.collection('classes').doc(currentClassId).update({
        [`calculatedActivities.${currentCalcActivityId}`]: {
          calculated: true,
          formula: formulaText,
          displayFormula: displayFormulaText
        }
      });
    }

    closeModal('modalCalc');
    renderNotesGrid();
  } catch (e) {
    console.error(e);
    alert('Error en aplicar el càlcul: ' + e.message);
  }
});

// ---------------- Construcció de botons dins el modal ----------------
function buildFormulaButtons() {
  formulaButtonsDiv.innerHTML = '';

  // Botons activitats
  classActivities.forEach(aid => {
    db.collection('activitats').doc(aid).get().then(doc => {
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', () => addToFormula(name));
      formulaButtonsDiv.appendChild(btn);
    });
  });

  // Operadors
  ['+', '-', '*', '/', '(', ')'].forEach(op => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
    btn.textContent = op;
    btn.addEventListener('click', () => addToFormula(op));
    formulaButtonsDiv.appendChild(btn);
  });

  // Números 0-10
  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = i;
    btn.addEventListener('click', () => addToFormula(i));
    formulaButtonsDiv.appendChild(btn);
  }

  // Decimals
  ['.', ','].forEach(dec => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.textContent = dec;
    btn.addEventListener('click', () => addToFormula('.'));
    formulaButtonsDiv.appendChild(btn);
  });

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', () => formulaField.value = formulaField.value.slice(0, -1));
  formulaButtonsDiv.appendChild(backBtn);
}

// Afegir text al camp fórmula
function addToFormula(str) {
  formulaField.value += str;
}

// Botons per arrodoniment (0.5 o 1)
function buildRoundingButtons() {
  formulaButtonsDiv.innerHTML = '';

  classActivities.forEach(aid => {
    db.collection('activitats').doc(aid).get().then(doc => {
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', () => addToFormula(name));
      formulaButtonsDiv.appendChild(btn);
    });
  });

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', () => formulaField.value = formulaField.value.slice(0, -1));
  formulaButtonsDiv.appendChild(backBtn);

  // 0.5 i 1
  [0.5, 1].forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = v;
    btn.addEventListener('click', () => addToFormula(v));
    formulaButtonsDiv.appendChild(btn);
  });
}
// ---------------- Evaluar fórmula per un alumne ----------------
async function evalFormulaAsync(formula, studentId) {
  let evalStr = formula;

  // Carregar notes de l'alumne
  const studentDoc = await db.collection('alumnes').doc(studentId).get();
  const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

  // 1) Substituir marcadors __ACT__<id> per valor real
  for (const aid of classActivities) {
    const marker = `__ACT__${aid}`;
    const val = Number(notes[aid]);
    const safeVal = isNaN(val) ? 0 : val;
    const reMarker = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(reMarker, safeVal);
  }

  // 2) Substituir noms d'activitat antics per valor (compatibilitat)
  for (const aid of classActivities) {
    const actDoc = await db.collection('activitats').doc(aid).get();
    const actName = actDoc.exists ? actDoc.data().nom : '';
    if (!actName) continue;
    const val = Number(notes[aid]);
    const safeVal = isNaN(val) ? 0 : val;

    const regex = new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(regex, safeVal);
  }

  try {
    return Function('"use strict"; return (' + evalStr + ')')();
  } catch (e) {
    console.error('Error evaluating formula:', formula, e);
    return 0;
  }
}

// ---------------- Helper per trobar fila d’un alumne ----------------
function getStudentRowById(sid) {
  const studentIndex = classStudents.findIndex(id => id === sid);
  if (studentIndex === -1) return null;
  return notesTbody.children[studentIndex] || null;
}

// ---------------- Actualitzar cel·les calculades sense re-render total ----------------
function updateCalculatedCells() {
  db.collection('classes').doc(currentClassId).get().then(doc => {
    if (!doc.exists) return;
    const calculatedActs = doc.data().calculatedActivities || {};

    classStudents.forEach(sid => {
      const row = document.querySelector(`tr[data-student-id="${sid}"]`);
      if (!row) return;

      classActivities.forEach(aid => {
        if (!calculatedActs[aid]) return;
        const input = row.querySelector(`input[data-activity-id="${aid}"]`);
        if (!input) return;

        const val = computeCalculatedNote(sid, aid); // Funció local de càlcul
        input.value = val;
        input.disabled = true;
        input.style.backgroundColor = "#fca5a5"; // Indicatiu cel·la calculada
      });
    });
  });
}

// ---------------- Marcar activitat com calculada ----------------
async function markActivityAsCalculated(activityId) {
  if (!currentClassId) return;
  await db.collection('classes').doc(currentClassId).update({
    [`calculatedActivities.${activityId}`]: true
  });
  renderNotesGrid(); // Re-render per assegurar bloqueig i color
}

// ---------------- Drag & Drop per reordenar activitats ----------------
function enableActivityDrag() {
  const ths = notesThead.querySelectorAll('tr:first-child th');
  ths.forEach((thEl, idx) => {
    if (idx === 0 || idx === ths.length - 1) return; // No draggable: primera i última

    thEl.setAttribute('draggable', true);
    thEl.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', idx);
    });

    thEl.addEventListener('dragover', e => {
      e.preventDefault();
      thEl.classList.add('border-dashed', 'border-2');
    });

    thEl.addEventListener('dragleave', e => {
      thEl.classList.remove('border-dashed', 'border-2');
    });

    thEl.addEventListener('drop', e => {
      e.preventDefault();
      thEl.classList.remove('border-dashed', 'border-2');
      const fromIdx = Number(e.dataTransfer.getData('text/plain'));
      const toIdx = idx;
      if (fromIdx === toIdx) return;

      const arr = Array.from(classActivities);
      const moved = arr.splice(fromIdx - 1, 1)[0]; // -1 ignora columna Alumne
      arr.splice(toIdx - 1, 0, moved);
      classActivities = arr;

      if (currentClassId) {
        db.collection('classes').doc(currentClassId).update({ activitats: classActivities })
          .then(() => console.log('Ordre d’activitats actualitzat a Firestore'))
          .catch(e => console.error('Error guardant ordre activitats', e));
      }

      renderNotesGrid();
    });
  });
}
/* ---------------- Export Excel ---------------- */
btnExport.addEventListener('click', exportExcel);

async function exportExcel() {
  if (!currentClassId) return alert('No hi ha cap classe seleccionada.');

  try {
    // Carregar informació de la classe
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    if (!classDoc.exists) return alert('Classe no trobada.');
    const classData = classDoc.data();

    // Carregar activitats
    const actDocs = await Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()));

    // Carregar alumnes
    const studentDocs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));

    const ws_data = [];

    // Capçalera
    const header = ['Alumne', ...actDocs.map(a => a.exists ? a.data().nom : 'Sense nom'), 'Mitjana'];
    ws_data.push(header);

    // Files alumnes
    studentDocs.forEach(sdoc => {
      const notes = sdoc.exists ? sdoc.data().notes || {} : {};
      const row = [sdoc.exists ? sdoc.data().nom : 'Desconegut'];

      let sum = 0, count = 0;

      actDocs.forEach(adoc => {
        const aid = adoc.id;
        const val = (notes[aid] !== undefined) ? Number(notes[aid]) : '';
        row.push(val);
        if (val !== '') { sum += val; count++; }
      });

      row.push(count ? (sum / count).toFixed(2) : '');
      ws_data.push(row);
    });

    // Crear llibre Excel i full
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');

    // Nom del fitxer
    const fname = (document.getElementById('classTitle').textContent || 'classe') + '.xlsx';
    XLSX.writeFile(wb, fname);

  } catch (e) {
    console.error(e);
    alert('Error exportant Excel: ' + e.message);
  }
}

/* ---------------- Tancar menús si fas clic fora ---------------- */
document.addEventListener('click', function (e) {
  document.querySelectorAll('.menu').forEach(menu => {
    if (!menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      menu.classList.add('hidden');
    }
  });
});

const userMenuBtn = document.getElementById('userMenuBtn');
const userMenu = document.getElementById('userMenu');
const changePasswordBtn = document.getElementById('changePasswordBtn');

// Toggle menú usuari
userMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  userMenu.classList.toggle('hidden');
});

// Tancar menú usuari si clics fora
document.addEventListener('click', () => {
  userMenu.classList.add('hidden');
});

// Canviar contrasenya
changePasswordBtn.addEventListener('click', () => {
  const email = auth.currentUser?.email;
  if (!email) return alert('No hi ha usuari actiu.');
  const newPw = prompt('Introdueix la nova contrasenya:');
  if (!newPw) return;
  auth.currentUser.updatePassword(newPw)
    .then(() => alert('Contrasenya canviada correctament!'))
    .catch(e => alert('Error: ' + e.message));
});

/* ---------------- Importar alumnes ---------------- */
document.getElementById('btnImportALConfirm').addEventListener('click', () => {
  const fileInput = document.getElementById('fileImport');
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona un fitxer!");

  const reader = new FileReader();
  reader.onload = async (e) => {
    let data = e.target.result;
    let studentNames = [];

    // Llegir CSV
    if (file.name.endsWith('.csv')) {
      const lines = data.split(/\r?\n/);
      lines.forEach(line => {
        const name = line.trim();
        if (name) studentNames.push(name);
      });
    }
    // Llegir XLSX
    else if (file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      json.forEach(row => {
        const name = row[0];
        if (name) studentNames.push(name.trim());
      });
    }

    if (studentNames.length === 0) return alert('No s’ha trobat cap alumne al fitxer.');

    // Afegir alumnes a Firestore i classe
    await addImportedStudents(studentNames);
    closeModal('modalImportAL');
  };

  if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file);
  else reader.readAsText(file);
});

// Funció per afegir alumnes a Firestore i a la classe
async function addImportedStudents(names) {
  if (!currentClassId) return alert('No hi ha cap classe seleccionada.');

  const classRef = db.collection('classes').doc(currentClassId);

  try {
    for (const name of names) {
      const studentRef = db.collection('alumnes').doc();
      await studentRef.set({ nom: name, notes: {} });
      await classRef.update({
        alumnes: firebase.firestore.FieldValue.arrayUnion(studentRef.id)
      });
    }

    // Recarregar graella
    loadClassData();
    alert(`${names.length} alumne(s) importat(s) correctament!`);
  } catch (e) {
    console.error(e);
    alert('Error afegint alumnes: ' + e.message);
  }
}

// --------------Botó tancar llista alumnes mòbil
const closeBtn = document.getElementById('closeStudentsMobile');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    const container = document.getElementById('studentsListContainer');
    container.classList.remove('mobile-open');
  });
}
/* ---------------- Open Calculation Modal ---------------- */
function openCalcModal(activityId) {
  currentCalcActivityId = activityId;
  openModal('modalCalc');

  // Reset modal
  document.getElementById('calcType').value = 'numeric';
  document.getElementById('formulaInputs').classList.add('hidden');
  document.getElementById('numericInput').classList.remove('hidden');
  document.getElementById('numericField').value = '';
  document.getElementById('formulaField').value = '';
}

/* ---------------- Modal Calcul: Numeric / Formula / Rounding ---------------- */
const calcTypeSelect = document.getElementById('calcType');
const numericDiv = document.getElementById('numericInput');
const numericField = document.getElementById('numericField');
const formulaDiv = document.getElementById('formulaInputs');
const formulaField = document.getElementById('formulaField');
const formulaButtonsDiv = document.getElementById('formulaButtons');
const modalApplyCalcBtn = document.getElementById('modalApplyCalcBtn');

// Canvi tipus càlcul
calcTypeSelect.addEventListener('change', () => {
  if (calcTypeSelect.value === 'numeric') {
    numericDiv.classList.remove('hidden');
    formulaDiv.classList.add('hidden');
  } else if (calcTypeSelect.value === 'formula') {
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildFormulaButtons(); // activitats + operadors + números
  } else if (calcTypeSelect.value === 'rounding') {
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildRoundingButtons(); // activitats + 0.5 i 1
  }
});

/* ---------------- Construir botons de fórmules ---------------- */
function buildFormulaButtons() {
  formulaButtonsDiv.innerHTML = '';

  // Botons activitats
  classActivities.forEach(aid => {
    db.collection('activitats').doc(aid).get().then(doc => {
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', () => addToFormula(name));
      formulaButtonsDiv.appendChild(btn);
    });
  });

  // Botons operadors
  ['+', '-', '*', '/', '(', ')'].forEach(op => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-gray-200 rounded hover:bg-gray-300';
    btn.textContent = op;
    btn.addEventListener('click', () => addToFormula(op));
    formulaButtonsDiv.appendChild(btn);
  });

  // Botons números 0-10
  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = i;
    btn.addEventListener('click', () => addToFormula(i));
    formulaButtonsDiv.appendChild(btn);
  }

  // Botons decimals
  ['.', ','].forEach(dec => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-yellow-200 rounded hover:bg-yellow-300';
    btn.textContent = dec;
    btn.addEventListener('click', () => addToFormula('.')); // sempre converteix ',' a '.'
    formulaButtonsDiv.appendChild(btn);
  });

  // Botó Backspace
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', () => formulaField.value = formulaField.value.slice(0, -1));
  formulaButtonsDiv.appendChild(backBtn);
}

// Afegir text a formula
function addToFormula(str) {
  formulaField.value += str;
}

/* ---------------- Construir botons arrodoniment ---------------- */
function buildRoundingButtons() {
  formulaButtonsDiv.innerHTML = '';

  // Botons activitats
  classActivities.forEach(aid => {
    db.collection('activitats').doc(aid).get().then(doc => {
      const name = doc.exists ? doc.data().nom : '???';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'px-2 py-1 m-1 bg-indigo-200 rounded hover:bg-indigo-300';
      btn.textContent = name;
      btn.addEventListener('click', () => addToFormula(name));
      formulaButtonsDiv.appendChild(btn);
    });
  });

  // Botó Backspace
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'px-2 py-1 m-1 bg-red-200 rounded hover:bg-red-300';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', () => formulaField.value = formulaField.value.slice(0, -1));
  formulaButtonsDiv.appendChild(backBtn);

  // Botons 0.5 i 1
  [0.5, 1].forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 m-1 bg-green-200 rounded hover:bg-green-300';
    btn.textContent = v;
    btn.addEventListener('click', () => addToFormula(v));
    formulaButtonsDiv.appendChild(btn);
  });
}
// ─────────── Helpers ───────────

// Numeric
async function applyNumeric(val) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => saveNote(sid, currentCalcActivityId, val)));
}

// Formula
async function applyFormula(formula) {
  if (!formula.trim()) throw new Error('Fórmula buida');
  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid);
    await saveNote(sid, currentCalcActivityId, result);
  }));
}

// Rounding
async function applyRounding(formula) {
  if (!formula.trim()) throw new Error('Selecciona activitat i 0,5 o 1');

  // Llegim totes les activitats
  const activityDocs = await Promise.all(classActivities.map(aid => db.collection('activitats').doc(aid).get()));
  const selectedActivityDoc = activityDocs.find(doc => doc.exists && formula.startsWith(doc.data().nom));
  if (!selectedActivityDoc) throw new Error('Activitat no trobada');

  const selectedActivityName = selectedActivityDoc.data().nom;
  const multiplier = Number(formula.slice(selectedActivityName.length)) || 1;

  await Promise.all(classStudents.map(async sid => {
    const studentDoc = await db.collection('alumnes').doc(sid).get();
    const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};
    let val = Number(notes[selectedActivityDoc.id]) || 0;

    if (multiplier === 1) val = Math.round(val);
    else if (multiplier === 0.5) val = Math.round(val * 2) / 2;

    await saveNote(sid, currentCalcActivityId, val);
  }));
}

// ─────────── Evaluar fórmula ───────────
async function evalFormulaAsync(formula, studentId) {
  let evalStr = formula;

  // Primer carreguem totes les notes de l'alumne
  const studentDoc = await db.collection('alumnes').doc(studentId).get();
  const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

  // 1) Substituir marcadors per ID (ex: __ACT__<actId>)
  for (const aid of classActivities) {
    const marker = `__ACT__${aid}`;
    const val = Number(notes[aid]);
    const safeVal = isNaN(val) ? 0 : val;
    const reMarker = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(reMarker, safeVal);
  }

  // 2) Substituir noms d'activitat per valors (compatibilitat amb fórmules antigues)
  for (const aid of classActivities) {
    const actDoc = await db.collection('activitats').doc(aid).get();
    const actName = actDoc.exists ? actDoc.data().nom : '';
    if (!actName) continue;
    const val = Number(notes[aid]);
    const safeVal = isNaN(val) ? 0 : val;

    const regex = new RegExp(actName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    evalStr = evalStr.replace(regex, safeVal);
  }

  try {
    return Function('"use strict"; return (' + evalStr + ')')();
  } catch (e) {
    console.error('Error evaluating formula:', formula, e);
    return 0;
  }
}

// ─────────── Helper per trobar fila alumne per ID ───────────
function getStudentRowById(sid) {
  const studentIndex = classStudents.findIndex(id => id === sid);
  if (studentIndex === -1) return null;
  return notesTbody.children[studentIndex] || null;
}

// ─────────── Funcions per actualitzar cel·les calculades sense recrear tota la taula ───────────
function updateCalculatedCells() {
  db.collection('classes').doc(currentClassId).get().then(doc => {
    if (!doc.exists) return;
    const calculatedActs = doc.data().calculatedActivities || {};

    classStudents.forEach(sid => {
      const row = document.querySelector(`tr[data-student-id="${sid}"]`);
      if (!row) return;

      classActivities.forEach(aid => {
        if (!calculatedActs[aid]) return;
        const input = row.querySelector(`input[data-activity-id="${aid}"]`);
        if (!input) return;

        const val = computeCalculatedNote(sid, aid); // funció que calcula nota
        input.value = val;
        input.disabled = true;
        input.style.backgroundColor = "#fca5a5";
      });
    });
  });
}
/* ---------------- Drag & Drop per activitats ---------------- */
function enableActivityDrag(){
  const ths = notesThead.querySelectorAll('tr:first-child th');
  ths.forEach((thEl, idx)=>{
    if(idx === 0 || idx === ths.length-1) return; // No draggable: primera (Alumne) i última (Mitjana)
    
    thEl.setAttribute('draggable', true);
    thEl.addEventListener('dragstart', e=>{
      e.dataTransfer.setData('text/plain', idx);
    });

    thEl.addEventListener('dragover', e=>{
      e.preventDefault();
      thEl.classList.add('border-dashed', 'border-2');
    });

    thEl.addEventListener('dragleave', e=>{
      thEl.classList.remove('border-dashed', 'border-2');
    });

    thEl.addEventListener('drop', e=>{
      e.preventDefault();
      thEl.classList.remove('border-dashed', 'border-2');
      const fromIdx = Number(e.dataTransfer.getData('text/plain'));
      const toIdx = idx;

      if(fromIdx === toIdx) return;

      // Reordenar classActivities
      const arr = Array.from(classActivities);
      const moved = arr.splice(fromIdx-1, 1)[0]; // -1 per ignorar columna Alumne
      arr.splice(toIdx-1, 0, moved);
      classActivities = arr;

      // Guardar el nou ordre a Firestore
      if(currentClassId){
        db.collection('classes').doc(currentClassId).update({ activitats: classActivities })
          .then(() => console.log('Ordre d’activitats actualitzat a Firestore'))
          .catch(e => console.error('Error guardant ordre activitats', e));
      }

      renderNotesGrid();
    });
  });
}

/* ---------------- Marcar activitat com calculada ---------------- */
async function markActivityAsCalculated(activityId){
  if(!currentClassId) return;
  await db.collection('classes').doc(currentClassId).update({
    [`calculatedActivities.${activityId}`]: true
  });
  renderNotesGrid();
}

/* ---------------- Export Excel ---------------- */
btnExport.addEventListener('click', exportExcel);
async function exportExcel(){
  if(!currentClassId) return alert('No hi ha cap classe seleccionada.');

  try {
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    if(!classDoc.exists) return alert('Classe no trobada.');
    const classData = classDoc.data();

    const actDocs = await Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get()));
    const studentDocs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));

    const ws_data = [];
    const header = ['Alumne', ...actDocs.map(a => a.exists ? a.data().nom : 'Sense nom'), 'Mitjana'];
    ws_data.push(header);

    studentDocs.forEach(sdoc => {
      const notes = sdoc.exists ? sdoc.data().notes || {} : {};
      const row = [sdoc.exists ? sdoc.data().nom : 'Desconegut'];
      let sum = 0, count = 0;

      actDocs.forEach(adoc => {
        const aid = adoc.id;
        const val = (notes[aid] !== undefined) ? Number(notes[aid]) : '';
        row.push(val);
        if(val !== '') { sum += val; count++; }
      });

      row.push(count ? (sum/count).toFixed(2) : '');
      ws_data.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');

    const fname = (document.getElementById('classTitle').textContent || 'classe') + '.xlsx';
    XLSX.writeFile(wb, fname);

  } catch(e){
    console.error(e);
    alert('Error exportant Excel: ' + e.message);
  }
}

/* ---------------- Import alumnes ---------------- */
document.getElementById('btnImportALConfirm').addEventListener('click', () => {
  const fileInput = document.getElementById('fileImport');
  const file = fileInput.files[0];
  if (!file) return alert("Selecciona un fitxer!");

  const reader = new FileReader();
  reader.onload = async (e) => {
    let data = e.target.result;
    let studentNames = [];

    if (file.name.endsWith('.csv')) {
      const lines = data.split(/\r?\n/);
      lines.forEach(line => {
        const name = line.trim();
        if (name) studentNames.push(name);
      });
    } else if (file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      json.forEach(row => {
        const name = row[0];
        if (name) studentNames.push(name.trim());
      });
    }

    if(studentNames.length === 0) return alert('No s’ha trobat cap alumne al fitxer.');
    await addImportedStudents(studentNames);
    closeModal('modalImportAL');
  };

  if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file);
  else reader.readAsText(file);
});

async function addImportedStudents(names) {
  if (!currentClassId) return alert('No hi ha cap classe seleccionada.');
  const classRef = db.collection('classes').doc(currentClassId);

  try {
    for (const name of names) {
      const studentRef = db.collection('alumnes').doc();
      await studentRef.set({ nom: name, notes: {} });
      await classRef.update({
        alumnes: firebase.firestore.FieldValue.arrayUnion(studentRef.id)
      });
    }
    loadClassData();
    alert(`${names.length} alumne(s) importat(s) correctament!`);
  } catch(e) {
    console.error(e);
    alert('Error afegint alumnes: ' + e.message);
  }
}

/* ---------------- Menú usuari i contrasenya ---------------- */
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenu = document.getElementById('userMenu');
const changePasswordBtn = document.getElementById('changePasswordBtn');

userMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  userMenu.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  userMenu.classList.add('hidden');
});

changePasswordBtn.addEventListener('click', () => {
  const email = auth.currentUser?.email;
  if(!email) return alert('No hi ha usuari actiu.');
  const newPw = prompt('Introdueix la nova contrasenya:');
  if(!newPw) return;
  auth.currentUser.updatePassword(newPw)
    .then(()=> alert('Contrasenya canviada correctament!'))
    .catch(e=> alert('Error: ' + e.message));
});

/* ---------------- Tancar llista alumnes mòbil ---------------- */
const closeBtn = document.getElementById('closeStudentsMobile');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    const container = document.getElementById('studentsListContainer');
    container.classList.remove('mobile-open');
  });
}

/* ---------------- Tancar menús si clic fora ---------------- */
document.addEventListener('click', function(e) {
  document.querySelectorAll('.menu').forEach(menu => {
    if (!menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      menu.classList.add('hidden');
    }
  });
});
