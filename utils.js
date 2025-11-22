// utils.js
// ---------------- Helpers Notes & Taula ----------------

// Crea un TH amb text i classe opcional
export function th(txt, cls='') {
  const el = document.createElement('th');
  el.className = 'border px-2 py-1 ' + cls;
  el.textContent = txt;
  return el;
}

// Aplica color a una cel·la segons la nota
export function applyCellColor(inputEl) {
  const v = Number(inputEl.value);
  inputEl.classList.remove('bg-red-100','bg-yellow-100','bg-green-100');
  if(inputEl.value === '' || isNaN(v)) return;
  if(v < 5) inputEl.classList.add('bg-red-100');
  else if(v < 7) inputEl.classList.add('bg-yellow-100');
  else inputEl.classList.add('bg-green-100');
}

// Calcula la mitjana d'un alumne a partir de les notes de les activitats
export function computeStudentAverageText(studentData, classActivities) {
  const notesMap = (studentData && studentData.notes) ? studentData.notes : {};
  const vals = classActivities
    .map(aid => (notesMap[aid] !== undefined ? Number(notesMap[aid]) : null))
    .filter(v => v !== null && !isNaN(v));
  if(vals.length === 0) return '';
  return (vals.reduce((s,n)=> s+n,0)/vals.length).toFixed(2);
}

// Calcula la mitjana per columna i fila fórmules
export function renderAverages(notesTbody, notesTfoot, classActivities) {
  // Actualitzar mitjanes alumnes
  Array.from(notesTbody.children).forEach(tr => {
    const inputs = Array.from(tr.querySelectorAll('input'))
      .map(i => Number(i.value))
      .filter(v => !isNaN(v));
    const lastTd = tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 1];
    lastTd.textContent = inputs.length ? (inputs.reduce((a,b)=>a+b,0)/inputs.length).toFixed(2) : '';
  });

  const actCount = classActivities.length;
  notesTfoot.innerHTML = '';

  // ----------------- Mitjana per activitat -----------------
  const trAvg = document.createElement('tr');
  trAvg.className = 'text-sm';
  trAvg.appendChild(th('Mitjana activitat'));
  if(actCount === 0){
    trAvg.appendChild(th('',''));
    notesTfoot.appendChild(trAvg);
    return;
  }

  for(let i=0;i<actCount;i++){
    const inputs = Array.from(notesTbody.querySelectorAll('tr'))
      .map(r => r.querySelectorAll('input')[i])
      .filter(Boolean);
    const vals = inputs.map(inp => Number(inp.value)).filter(v=> !isNaN(v));
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : '';
    const td = document.createElement('td');
    td.className = 'border px-2 py-1 text-center font-semibold';
    td.textContent = avg;
    trAvg.appendChild(td);
  }
  trAvg.appendChild(th('',''));
  notesTfoot.appendChild(trAvg);
}
