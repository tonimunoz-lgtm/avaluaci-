// tutoria.js - Injector: Generador de comentaris de tutoria amb IA
// Afegeix un botó "📋 Tutoria" a la barra d'eines de la classe

console.log('✅ tutoria.js carregat - Generador de comentaris de butlletí');

// ============================================================
// ASSIGNATURES ESO I BATXILLERAT (CURRICULUM CATALUNYA)
// ============================================================
const ASSIGNATURES = {
  eso: {
    label: 'ESO',
    materies: [
      'Llengua catalana i literatura',
      'Llengua castellana i literatura',
      'Matemàtiques',
      'Anglès',
      'Ciències naturals',
      'Ciències socials',
      'Educació física',
      'Educació visual i plàstica',
      'Música',
      'Tecnologia i digitalització',
      'Religió / Valors cívics i ètics',
      'Tutoria',
      'Optativa / Segona llengua estrangera',
      'Educació en valors cívics i ètics',
    ]
  },
  batxillerat: {
    label: 'Batxillerat',
    materies: [
      'Llengua catalana i literatura',
      'Llengua castellana i literatura',
      'Anglès',
      'Filosofia',
      'Educació física',
      'Història / Història del món contemporani',
      'Matemàtiques',
      'Matemàtiques aplicades a les CCSS',
      'Física',
      'Química',
      'Biologia',
      'Economia i empresa',
      'Història de l\'art',
      'Dibuix artístic / Dibuix tècnic',
      'Literatura catalana i castellana',
      'Llatí',
      'Psicologia',
      'Tecnologia industrial',
      'Ciències de la terra',
      'Optativa pròpia de centre',
    ]
  }
};

// ============================================================
// INICIALITZACIÓ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(injectTutoriaButton, 800);
});

// ============================================================
// INJECCIÓ DEL BOTÓ
// ============================================================
function injectTutoriaButton() {
  if (document.getElementById('btnTutoria')) return;

  const btnAddActivity = document.getElementById('btnAddActivity');
  if (!btnAddActivity) {
    setTimeout(injectTutoriaButton, 500);
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'btnTutoria';
  btn.className = 'bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded font-semibold text-sm flex items-center gap-1 transition-colors';
  btn.innerHTML = '📋 Tutoria';
  btn.title = 'Generar comentaris de butlletí per a les famílies';
  btn.addEventListener('click', openTutoriaModal);

  btnAddActivity.parentNode.insertBefore(btn, btnAddActivity.nextSibling);
  console.log('✅ Botó Tutoria injectat');
}

// ============================================================
// MODAL PRINCIPAL
// ============================================================
function openTutoriaModal() {
  document.getElementById('tutoriaModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'tutoriaModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-60 p-4';
  modal.innerHTML = buildModalHTML();
  document.body.appendChild(modal);

  // Inicialitzar interaccions
  initModalInteractions(modal);
}

// ============================================================
// HTML DEL MODAL
// ============================================================
function buildModalHTML() {
  const esoOptions = ASSIGNATURES.eso.materies.map(m =>
    `<label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-rose-50 px-2 py-1 rounded">
      <input type="checkbox" class="assignatura-check w-4 h-4 accent-rose-500" value="${m}">
      <span>${m}</span>
    </label>`
  ).join('');

  const batxOptions = ASSIGNATURES.batxillerat.materies.map(m =>
    `<label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-rose-50 px-2 py-1 rounded">
      <input type="checkbox" class="assignatura-check w-4 h-4 accent-rose-500" value="${m}">
      <span>${m}</span>
    </label>`
  ).join('');

  return `
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
    
    <!-- HEADER -->
    <div class="sticky top-0 bg-rose-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
      <div>
        <h2 class="text-xl font-bold">📋 Generador de comentaris de tutoria</h2>
        <p class="text-rose-100 text-sm">Omple el formulari i la IA crearà un comentari personalitzat per a la família</p>
      </div>
      <button id="btnCloseTutoria" class="text-white hover:text-rose-200 text-3xl leading-none font-bold">✕</button>
    </div>

    <div class="p-6 space-y-6">

      <!-- NOM ALUMNE -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">👤 Nom de l'alumne/a</label>
        <input id="tutoriaNom" type="text" placeholder="Ex: Maria García" 
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm">
      </div>

      <!-- CURS -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">📚 Nivell educatiu</label>
        <div class="flex gap-3 mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="nivell" value="eso" id="radioESO" checked class="accent-rose-500">
            <span class="font-semibold text-gray-700">ESO</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="nivell" value="batxillerat" id="radioBatx" class="accent-rose-500">
            <span class="font-semibold text-gray-700">Batxillerat</span>
          </label>
        </div>
        <input id="tutoriaCurs" type="text" placeholder="Ex: 3r ESO A / 1r Batxillerat"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm">
      </div>

      <!-- ASSIGNATURES SUSPESES -->
      <div class="bg-red-50 border border-red-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-bold text-red-700">❌ Assignatures suspeses</label>
          <button type="button" id="btnDesmarcarSuspeses" class="text-xs text-gray-500 hover:text-red-600 underline">Desmarcar tot</button>
        </div>
        
        <!-- Pestanyes ESO / Batxillerat -->
        <div class="flex gap-2 mb-3">
          <button type="button" id="tabSuspESO" class="tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white">ESO</button>
          <button type="button" id="tabSuspBatx" class="tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600">Batxillerat</button>
        </div>
        
        <div id="suspesesESO" class="grid grid-cols-2 gap-1">${esoOptions}</div>
        <div id="suspesesBatx" class="grid grid-cols-2 gap-1 hidden">${batxOptions}</div>
      </div>

      <!-- COMPORTAMENT -->
      <div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-orange-700 mb-3">🧠 Comportament a l'aula</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('comportament', 'excel·lent', '⭐ Excel·lent', 'green')}
          ${buildOption('comportament', 'bo', '✅ Bo', 'green')}
          ${buildOption('comportament', 'neutre', '➖ Neutre', 'yellow')}
          ${buildOption('comportament', 'irregular', '⚠️ Irregular', 'orange')}
          ${buildOption('comportament', 'dolent', '❌ Dolent', 'red')}
          ${buildOption('comportament', 'disruptiu', '🚨 Disruptiu', 'red')}
        </div>
      </div>

      <!-- ESFORÇ I TREBALL -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-3">💪 Esforç i treball</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('esforc', 'molt alt', '🌟 Molt alt', 'green')}
          ${buildOption('esforc', 'alt', '✅ Alt', 'green')}
          ${buildOption('esforc', 'adequat', '➖ Adequat', 'yellow')}
          ${buildOption('esforc', 'baix', '⚠️ Baix', 'orange')}
          ${buildOption('esforc', 'molt baix', '❌ Molt baix', 'red')}
        </div>
      </div>

      <!-- TASQUES I DEURES -->
      <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-purple-700 mb-3">📝 Lliurament de tasques</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('tasques', 'sempre', '✅ Sempre lliura', 'green')}
          ${buildOption('tasques', 'gairebe', '🟡 Quasi sempre', 'yellow')}
          ${buildOption('tasques', 'vegades', '⚠️ A vegades', 'orange')}
          ${buildOption('tasques', 'rarament', '❌ Rarament', 'red')}
          ${buildOption('tasques', 'mai', '🚫 Mai lliura', 'red')}
        </div>
      </div>

      <!-- ASSISTÈNCIA -->
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-teal-700 mb-3">📅 Assistència</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('assistencia', 'perfecta', '✅ Perfecta', 'green')}
          ${buildOption('assistencia', 'bona', '🟡 Bona', 'yellow')}
          ${buildOption('assistencia', 'irregular', '⚠️ Irregular', 'orange')}
          ${buildOption('assistencia', 'moltes faltes', '❌ Moltes faltes', 'red')}
        </div>
      </div>

      <!-- ACTITUD -->
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-indigo-700 mb-3">🤝 Actitud i participació</label>
        <div class="grid grid-cols-2 gap-2">
          ${buildOption('actitud', 'participa molt', '🙋 Participa molt', 'green')}
          ${buildOption('actitud', 'participa', '✅ Participa', 'green')}
          ${buildOption('actitud', 'poc participativa', '➖ Poc participativa', 'yellow')}
          ${buildOption('actitud', 'passiva', '⚠️ Passiva', 'orange')}
          ${buildOption('actitud', 'negativa', '❌ Actitud negativa', 'red')}
        </div>
      </div>

      <!-- PUNTS FORTS (text lliure) -->
      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-green-700 mb-2">🌟 Punts forts destacables (opcional)</label>
        <textarea id="tutoriaPuntsForts" placeholder="Ex: Molt creatiu/va, bon sentit de l'humor, ajuda als companys..." 
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none text-sm h-20 resize-none"></textarea>
      </div>

      <!-- ÀREES DE MILLORA (text lliure) -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-yellow-700 mb-2">🎯 Àrees de millora específiques (opcional)</label>
        <textarea id="tutoriaMillora" placeholder="Ex: Ha de millorar l'organització, cal que estudii amb més antelació..." 
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:outline-none text-sm h-20 resize-none"></textarea>
      </div>

      <!-- IDIOMA DEL COMENTARI -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">🌐 Idioma del comentari</label>
        <select id="tutoriaIdioma" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm w-full">
          <option value="catala">Català</option>
          <option value="castella">Castellano</option>
        </select>
      </div>

      <!-- BOTÓ GENERAR -->
      <button id="btnGenerarComentari" 
        class="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
        ✨ Generar comentari amb IA
      </button>

      <!-- RESULTAT -->
      <div id="tutoriaResultat" class="hidden">
        <div class="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-rose-700 text-sm">💬 Comentari generat</h3>
            <button id="btnCopiarComentari" class="text-xs bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-lg transition-colors">📋 Copiar</button>
          </div>
          <div id="tutoriaComentariText" class="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border border-rose-100 min-h-[100px]"></div>
        </div>
        
        <!-- Regenerar -->
        <button id="btnRegenerarComentari" 
          class="w-full mt-3 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold py-2 rounded-xl text-sm transition-colors">
          🔄 Generar altra versió
        </button>
      </div>

    </div>
  </div>`;
}

// Helper: construir opció de checkbox estil botó
function buildOption(grup, valor, label, color) {
  const colors = {
    green: 'border-green-300 hover:bg-green-100 has-[:checked]:bg-green-500 has-[:checked]:text-white has-[:checked]:border-green-500',
    yellow: 'border-yellow-300 hover:bg-yellow-100 has-[:checked]:bg-yellow-400 has-[:checked]:text-white has-[:checked]:border-yellow-400',
    orange: 'border-orange-300 hover:bg-orange-100 has-[:checked]:bg-orange-500 has-[:checked]:text-white has-[:checked]:border-orange-500',
    red: 'border-red-300 hover:bg-red-100 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500',
  };
  return `
    <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${colors[color] || colors.green}">
      <input type="radio" name="${grup}" value="${valor}" class="sr-only">
      ${label}
    </label>`;
}

// ============================================================
// INTERACCIONS DEL MODAL
// ============================================================
function initModalInteractions(modal) {
  // Tancar
  modal.querySelector('#btnCloseTutoria').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Pestanyes assignatures suspeses
  const tabESO = modal.querySelector('#tabSuspESO');
  const tabBatx = modal.querySelector('#tabSuspBatx');
  const contESO = modal.querySelector('#suspesesESO');
  const contBatx = modal.querySelector('#suspesesBatx');

  tabESO.addEventListener('click', () => {
    tabESO.className = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabBatx.className = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    contESO.classList.remove('hidden');
    contBatx.classList.add('hidden');
  });

  tabBatx.addEventListener('click', () => {
    tabBatx.className = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabESO.className = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    contBatx.classList.remove('hidden');
    contESO.classList.add('hidden');
  });

  // Desmarcar suspeses
  modal.querySelector('#btnDesmarcarSuspeses').addEventListener('click', () => {
    modal.querySelectorAll('.assignatura-check').forEach(c => c.checked = false);
  });

  // Generar comentari
  modal.querySelector('#btnGenerarComentari').addEventListener('click', () => generarComentari(modal));
  
  // Regenerar
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'btnRegenerarComentari') generarComentari(modal);
  });

  // Copiar
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'btnCopiarComentari') {
      const text = modal.querySelector('#tutoriaComentariText').textContent;
      navigator.clipboard.writeText(text).then(() => {
        e.target.textContent = '✅ Copiat!';
        setTimeout(() => { e.target.textContent = '📋 Copiar'; }, 2000);
      });
    }
  });
}

// ============================================================
// RECOLLIR DADES DEL FORMULARI
// ============================================================
function recollidaDades(modal) {
  const nom = modal.querySelector('#tutoriaNom').value.trim() || 'l\'alumne/a';
  const curs = modal.querySelector('#tutoriaCurs').value.trim();
  const idioma = modal.querySelector('#tutoriaIdioma').value;
  const puntsForts = modal.querySelector('#tutoriaPuntsForts').value.trim();
  const millora = modal.querySelector('#tutoriaMillora').value.trim();

  // Assignatures suspeses
  const suspeses = [...modal.querySelectorAll('.assignatura-check:checked')].map(c => c.value);

  // Comportament, esforç, tasques, assistència, actitud
  const getValue = (name) => {
    const el = modal.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  };

  return {
    nom,
    curs,
    idioma,
    suspeses,
    comportament: getValue('comportament'),
    esforc: getValue('esforc'),
    tasques: getValue('tasques'),
    assistencia: getValue('assistencia'),
    actitud: getValue('actitud'),
    puntsForts,
    millora,
  };
}

// ============================================================
// CONSTRUIR PROMPT PER A LA IA
// ============================================================
function buildPrompt(dades) {
  const suspesesTxt = dades.suspeses.length > 0
    ? `Ha suspès les següents assignatures: ${dades.suspeses.join(', ')}.`
    : 'No ha suspès cap assignatura.';

  const campOpcional = (label, val) => val ? `- ${label}: ${val}` : '';

  const context = [
    `Alumne/a: ${dades.nom}`,
    dades.curs ? `Curs: ${dades.curs}` : '',
    suspesesTxt,
    campOpcional('Comportament', dades.comportament),
    campOpcional('Esforç i treball', dades.esforc),
    campOpcional('Lliurament de tasques', dades.tasques),
    campOpcional('Assistència', dades.assistencia),
    campOpcional('Actitud i participació', dades.actitud),
    campOpcional('Punts forts', dades.puntsForts),
    campOpcional('Àrees de millora específiques', dades.millora),
  ].filter(Boolean).join('\n');

  const idiomaInstruccio = dades.idioma === 'castella'
    ? 'Escriu el comentari completament en castellano.'
    : 'Escriu el comentari completament en català.';

  return `Ets un tutor/a escolar que ha d'escriure un comentari personalitzat per al butlletí de notes que anirà dirigit a la família de l'alumne/a.

DADES DE L'ALUMNE/A:
${context}

INSTRUCCIONS:
- ${idiomaInstruccio}
- El to ha de ser SEMPRE positiu, empàtic i constructiu, fins i tot si hi ha suspesos o comportament dolent.
- Comença adreçant-te a la família de manera càlida.
- Menciona els punts positius primer.
- Si hi ha assignatures suspeses o aspectes a millorar, presenta-ho com una oportunitat de creixement, animant l'alumne/a a superar-ho.
- Acaba amb un missatge d'encoratjament per a l'alumne/a i la família.
- Longitud: entre 100 i 180 paraules.
- No facis llistes. Escriu en paràgrafs fluids.
- No mencions notes numèriques específiques.
- Personalitza el comentari amb el nom de l'alumne/a.

Escriu NOMÉS el comentari final, sense cap introducció, titol ni explicació addicional.`;
}

// ============================================================
// GENERAR COMENTARI AMB IA (API ANTHROPIC)
// ============================================================
async function generarComentari(modal) {
  const dades = recollidaDades(modal);
  const prompt = buildPrompt(dades);

  // UI: loading
  const btnGenerar = modal.querySelector('#btnGenerarComentari');
  const resultatDiv = modal.querySelector('#tutoriaResultat');
  const comentariText = modal.querySelector('#tutoriaComentariText');

  btnGenerar.disabled = true;
  btnGenerar.innerHTML = '<span class="animate-spin">⏳</span> Generant...';
  resultatDiv.classList.remove('hidden');
  comentariText.innerHTML = '<span class="text-gray-400 italic">La IA està escrivint el comentari...</span>';

  try {
    const response = await fetch('/api/tutoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Error API: ${response.status}`);
    }

    const data = await response.json();
    const text = data.text || 'No s\'ha pogut generar el comentari.';

    comentariText.textContent = text;

    // Scroll al resultat
    resultatDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Error generant comentari:', err);
    comentariText.innerHTML = `<span class="text-red-500">❌ Error: ${err.message}</span>`;
  } finally {
    btnGenerar.disabled = false;
    btnGenerar.innerHTML = '✨ Generar comentari amb IA';
  }
}
