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
        <p class="text-rose-100 text-sm">Omple el formulari i la IA crearà un comentari per al butlletí</p>
      </div>
      <button id="btnCloseTutoria" class="text-white hover:text-rose-200 text-3xl leading-none font-bold">✕</button>
    </div>

    <div class="p-6 space-y-6">

      <!-- NOM I GÈNERE -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">👤 Alumne/a</label>
        <div class="flex gap-3 mb-3">
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-blue-300 hover:bg-blue-50 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500">
            <input type="radio" name="genere" value="noi" checked class="sr-only">
            👦 Noi (El...)
          </label>
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-pink-300 hover:bg-pink-50 has-[:checked]:bg-pink-500 has-[:checked]:text-white has-[:checked]:border-pink-500">
            <input type="radio" name="genere" value="noia" class="sr-only">
            👧 Noia (La...)
          </label>
        </div>
        <input id="tutoriaNom" type="text" placeholder="Nom de l'alumne/a (ex: Toni, Júlia...)" 
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm">
      </div>

      <!-- TRIMESTRE / MOMENT AVALUACIÓ -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📅 Moment d'avaluació</label>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          ${buildOption('trimestre', '1r trimestre', '1r Trimestre', 'blue')}
          ${buildOption('trimestre', '2n trimestre', '2n Trimestre', 'blue')}
          ${buildOption('trimestre', '3r trimestre', '3r Trimestre', 'blue')}
          ${buildOption('trimestre', 'final de curs', 'Final de curs', 'blue')}
        </div>
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
          ${buildOption('tasques', 'gairebé sempre', '🟡 Quasi sempre', 'yellow')}
          ${buildOption('tasques', 'a vegades', '⚠️ A vegades', 'orange')}
          ${buildOption('tasques', 'rarament', '❌ Rarament', 'red')}
          ${buildOption('tasques', 'mai', '🚫 Mai lliura', 'red')}
        </div>
      </div>

      <!-- ASSISTÈNCIA -->
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-teal-700 mb-3">📅 Assistència</label>
        <div class="grid grid-cols-2 gap-2">
          ${buildOption('assistencia', 'perfecta', '✅ Perfecta', 'green')}
          ${buildOption('assistencia', 'bona', '🟡 Bona', 'yellow')}
          ${buildOption('assistencia', 'irregular amb justificació', '⚠️ Irregular (justificada)', 'orange')}
          ${buildOption('assistencia', 'moltes faltes sense justificar', '❌ Moltes faltes injustificades', 'red')}
        </div>
      </div>

      <!-- ACTITUD -->
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-indigo-700 mb-3">🤝 Actitud i participació</label>
        <div class="grid grid-cols-2 gap-2">
          ${buildOption('actitud', 'participa molt activament', '🙋 Molt activa', 'green')}
          ${buildOption('actitud', 'participa adequadament', '✅ Adequada', 'green')}
          ${buildOption('actitud', 'poc participativa', '➖ Poc activa', 'yellow')}
          ${buildOption('actitud', 'passiva i desinteressada', '⚠️ Passiva', 'orange')}
          ${buildOption('actitud', 'negativa i desmotivada', '❌ Negativa', 'red')}
        </div>
      </div>

      <!-- PUNTS FORTS -->
      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-green-700 mb-2">🌟 Punts forts destacables (opcional)</label>
        <textarea id="tutoriaPuntsForts" placeholder="Ex: Molt creatiu/va, bon sentit de l'humor, ajuda als companys, destaca en ..." 
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none text-sm h-20 resize-none"></textarea>
      </div>

      <!-- RECOMANACIONS -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-2">💡 Recomanacions per millorar (opcional)</label>
        <p class="text-xs text-blue-500 mb-2">Ex: Classes particulars de matemàtiques, millorar la comprensió lectora, hàbit de lectura diària, reforç d'anglès...</p>
        <textarea id="tutoriaRecomanacions" placeholder="Escriu les recomanacions específiques..." 
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm h-20 resize-none"></textarea>
      </div>

      <!-- LLARGADA -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📏 Llargada del comentari</label>
        <div class="grid grid-cols-3 gap-2">
          <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 justify-center text-xs font-semibold transition-all border-gray-300 hover:bg-gray-100 has-[:checked]:bg-gray-700 has-[:checked]:text-white has-[:checked]:border-gray-700">
            <input type="radio" name="llargada" value="curt" class="sr-only">📝 Curt<br><span class="font-normal opacity-75">(50-80 p.)</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 justify-center text-xs font-semibold transition-all border-indigo-300 hover:bg-indigo-50 has-[:checked]:bg-indigo-500 has-[:checked]:text-white has-[:checked]:border-indigo-500">
            <input type="radio" name="llargada" value="mitja" checked class="sr-only">📄 Mitjà<br><span class="font-normal opacity-75">(80-150 p.)</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 justify-center text-xs font-semibold transition-all border-violet-300 hover:bg-violet-50 has-[:checked]:bg-violet-500 has-[:checked]:text-white has-[:checked]:border-violet-500">
            <input type="radio" name="llargada" value="llarg" class="sr-only">📃 Llarg<br><span class="font-normal opacity-75">(150-250 p.)</span>
          </label>
        </div>
      </div>

      <!-- IDIOMA -->
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
        <button id="btnRegenerarComentari" 
          class="w-full mt-3 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold py-2 rounded-xl text-sm transition-colors">
          🔄 Generar altra versió
        </button>
      </div>

    </div>
  </div>`;
}

// Helper: construir opció estil botó seleccionable
function buildOption(grup, valor, label, color) {
  const colors = {
    blue:   'border-blue-300 hover:bg-blue-100 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500',
    green:  'border-green-300 hover:bg-green-100 has-[:checked]:bg-green-500 has-[:checked]:text-white has-[:checked]:border-green-500',
    yellow: 'border-yellow-300 hover:bg-yellow-100 has-[:checked]:bg-yellow-400 has-[:checked]:text-white has-[:checked]:border-yellow-400',
    orange: 'border-orange-300 hover:bg-orange-100 has-[:checked]:bg-orange-500 has-[:checked]:text-white has-[:checked]:border-orange-500',
    red:    'border-red-300 hover:bg-red-100 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500',
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
  modal.querySelector('#btnCloseTutoria').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

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

  modal.querySelector('#btnDesmarcarSuspeses').addEventListener('click', () => {
    modal.querySelectorAll('.assignatura-check').forEach(c => c.checked = false);
  });

  modal.querySelector('#btnGenerarComentari').addEventListener('click', () => generarComentari(modal));

  modal.addEventListener('click', (e) => {
    if (e.target.id === 'btnRegenerarComentari') generarComentari(modal);
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
  const recomanacions = modal.querySelector('#tutoriaRecomanacions').value.trim();
  const llargada = modal.querySelector('input[name="llargada"]:checked')?.value || 'mitja';

  const suspeses = [...modal.querySelectorAll('.assignatura-check:checked')].map(c => c.value);

  const getValue = (name) => {
    const el = modal.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  };

  const genere = getValue('genere') || 'noi';
  const article = genere === 'noia' ? 'La' : 'El';

  return {
    nom,
    nomAmbArticle: `${article} ${nom}`,
    genere,
    article,
    curs,
    idioma,
    trimestre: getValue('trimestre'),
    suspeses,
    comportament: getValue('comportament'),
    esforc: getValue('esforc'),
    tasques: getValue('tasques'),
    assistencia: getValue('assistencia'),
    actitud: getValue('actitud'),
    puntsForts,
    recomanacions,
  };
}

// ============================================================
// CONSTRUIR PROMPT PER A LA IA
// ============================================================
function buildPrompt(dades) {
  const { nom, nomAmbArticle, genere, article } = dades;
  const ell_ella = genere === 'noia' ? 'ella' : 'ell';
  const el_la = genere === 'noia' ? 'la' : 'el';
  const del_de_la = genere === 'noia' ? 'de la' : 'del';

  const suspesesTxt = dades.suspeses.length > 0
    ? `Assignatures suspeses: ${dades.suspeses.join(', ')}.`
    : 'No té cap assignatura suspesa.';

  const trimestreTxt = dades.trimestre
    ? `Moment d'avaluació: ${dades.trimestre}.`
    : '';

  const campOpcional = (label, val) => val ? `- ${label}: ${val}` : '';

  // Avaluació de la gravetat per ajustar el to
  const aspectesNegatius = [
    dades.comportament === 'dolent' || dades.comportament === 'disruptiu',
    dades.esforc === 'baix' || dades.esforc === 'molt baix',
    dades.tasques === 'rarament' || dades.tasques === 'mai',
    dades.assistencia === 'moltes faltes sense justificar',
    dades.actitud === 'passiva i desinteressada' || dades.actitud === 'negativa i desmotivada',
  ].filter(Boolean).length;

  const teSuspeses = dades.suspeses.length > 0;
  const situacioGreu = aspectesNegatius >= 3 || (teSuspeses && aspectesNegatius >= 2);

  const context = [
    `Nom de l'alumne/a: ${nom} (article: "${article} ${nom}")`,
    `Gènere: ${genere}`,
    trimestreTxt,
    dades.curs ? `Curs: ${dades.curs}` : '',
    suspesesTxt,
    campOpcional('Comportament a l\'aula', dades.comportament),
    campOpcional('Esforç i treball', dades.esforc),
    campOpcional('Lliurament de tasques', dades.tasques),
    campOpcional('Assistència', dades.assistencia),
    campOpcional('Actitud i participació', dades.actitud),
    campOpcional('Punts forts', dades.puntsForts),
    campOpcional('Recomanacions específiques per millorar', dades.recomanacions),
  ].filter(Boolean).join('\n');

  const idiomaInstruccio = dades.idioma === 'castella'
    ? `Escriu el comentari completament en castellano. Usa "El ${nom}" o "La ${nom}" segons el gènere. Usa els pronoms "él/ella" correctament.`
    : `Escriu el comentari completament en català correcte. Usa "${article} ${nom}" per referir-te a l'alumne/a. Usa "ell/ella" correctament.`;

  const trimestreContext = dades.trimestre
    ? `El comentari és per al ${dades.trimestre}, per tant adapta el missatge final: si és un trimestre intermedi, anima'l/la a continuar o millorar de cara als propers trimestres; si és final de curs, reflexiona sobre l'any.`
    : '';

  const toGreu = situacioGreu
    ? `L'alumne/a té múltiples aspectes preocupants. El comentari ha de ser honest i directe: menciona clarament que la manca de treball, les faltes o el comportament han contribuït als resultats, però sempre des d'un punt de vista constructiu i animant a millorar. NO amaguis els problemes amb eufemismes excessius.`
    : `El comentari pot ser més positiu, però si hi ha suspesos o aspectes a millorar, esmenta'ls clarament com a reptes a superar.`;

  return `Ets un tutor/a escolar experimentat que escriu comentaris per al butlletí de notes.

DADES:
${context}

INSTRUCCIONS OBLIGATÒRIES:
- ${idiomaInstruccio}
- Comença SEMPRE amb "${nomAmbArticle}" (mai amb "Estimada família" ni cap altre salut).
- El comentari és sobre l'alumne/a, NO adreçat a la família.
- Longitud: ${dades.llargada === 'curt' ? 'entre 50 i 80 paraules (molt concís)' : dades.llargada === 'llarg' ? 'entre 150 i 250 paraules (desenvolupat)' : 'entre 80 i 150 paraules'}. Màxim 2-3 frases per paràgraf.
- No facis llistes. Escriu en paràgrafs fluids i naturals.
- No mencions notes numèriques.
- ${trimestreContext}
- ${toGreu}
- Si hi ha assignatures suspeses, menciona-les específicament i explica breument quines carències o mancances han portat a aquest resultat (falta de treball, poca assistència, no lliura tasques...).
- Si hi ha recomanacions específiques, inclou-les de forma natural al text (ex: "Et recomanem reforçar la comprensió lectora amb lectures diàries" o "Seria beneficiós comptar amb suport de classes particulars de matemàtiques").
- Acaba sempre amb una frase d'encoratjament genuïna i realista, no buida.
- Usa concordança de gènere correcta en tots els adjectius i pronoms.

EXEMPLES DE COM COMENÇA:
- "El Marc ha mostrat..." / "La Sara presenta..."
- "El Toni, tot i tenir capacitat, ha demostrat poc esforç aquest trimestre..."
- "La Júlia ha tingut un trimestre irregular..."

Escriu NOMÉS el comentari final, sense cap títol, introducció ni explicació.`;
}

// ============================================================
// GENERAR COMENTARI AMB IA
// ============================================================
async function generarComentari(modal) {
  const dades = recollidaDades(modal);

  if (!dades.nom || dades.nom === 'l\'alumne/a') {
    alert('⚠️ Si us plau, escriu el nom de l\'alumne/a');
    return;
  }

  const prompt = buildPrompt(dades);

  const btnGenerar = modal.querySelector('#btnGenerarComentari');
  const resultatDiv = modal.querySelector('#tutoriaResultat');
  const comentariText = modal.querySelector('#tutoriaComentariText');

  btnGenerar.disabled = true;
  btnGenerar.innerHTML = '⏳ Generant...';
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
    resultatDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Error generant comentari:', err);
    comentariText.innerHTML = `<span class="text-red-500">❌ Error: ${err.message}</span>`;
  } finally {
    btnGenerar.disabled = false;
    btnGenerar.innerHTML = '✨ Generar comentari amb IA';
  }
}
