import { guessGender } from './gender-names.js';
// tutoria.js - Injector: Generador de comentaris de tutoria amb IA
// v3: matèries personalitzades + apartats personalitzats guardats a Firestore

console.log('✅ tutoria.js v3 carregat');

// ============================================================
// ESTAT GLOBAL
// ============================================================
let _tutoriaUID = null;
let _tutoriaDB = null;
let _materiesExtra = { eso: [], batxillerat: [] }; // carregades de Firestore
let _apartatsExtra = []; // [{id, nom, opcions:[{valor,label,color}]}]
let _llistaAlumnes = []; // [{id, nom}] per al mode «triar alumne»
let _ctx = null; // {studentId, studentName, classId} quan s'obre des d'una cel·la de comentari

// ============================================================
// ASSIGNATURES BASE (CURRICULUM CATALUNYA)
// ============================================================
const ASSIGNATURES = {
  eso: [
    'Llengua catalana i literatura','Llengua castellana i literatura',
    'Matemàtiques','Anglès','Ciències naturals','Ciències socials',
    'Educació física','Educació visual i plàstica','Música',
    'Tecnologia i digitalització','Religió / Valors cívics i ètics',
    'Tutoria','Optativa / Segona llengua estrangera',
    'Educació en valors cívics i ètics',
  ],
  batxillerat: [
    'Llengua catalana i literatura','Llengua castellana i literatura',
    'Anglès','Filosofia','Educació física',
    'Història / Història del món contemporani','Matemàtiques',
    'Matemàtiques aplicades a les CCSS','Física','Química','Biologia',
    "Economia i empresa","Història de l'art",
    'Dibuix artístic / Dibuix tècnic','Literatura catalana i castellana',
    'Llatí','Psicologia','Tecnologia industrial',
    'Ciències de la terra','Optativa pròpia de centre',
  ]
};

// Colors per als apartats personalitzats
const COLORS_OPCIO = ['green','yellow','orange','red','blue'];

// ============================================================
// INICIALITZACIÓ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initTutoria, 800);
});

async function initTutoria() {
  // Esperar Firebase auth
  const tryInit = () => {
    const auth = window.firebase?.auth?.();
    if (!auth) { setTimeout(tryInit, 500); return; }
    auth.onAuthStateChanged(user => {
      if (user) {
        _tutoriaUID = user.uid;
        _tutoriaDB = window.firebase.firestore();
        window._tutoriaUID = user.uid;
        window._tutoriaDB = window.firebase.firestore();
      }
    });
  };
  tryInit();
  injectTutoriaButton();
}

// ============================================================
// INJECCIÓ DEL BOTÓ
// ============================================================
function injectTutoriaButton() {
  if (document.getElementById('btnTutoria')) return;
  const btnAddActivity = document.getElementById('btnAddActivity');
  if (!btnAddActivity) { setTimeout(injectTutoriaButton, 500); return; }

  const btn = document.createElement('button');
  btn.id = 'btnTutoria';
  btn.className = 'bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded font-semibold text-sm flex items-center gap-1 transition-colors';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H11l-4 4v-4H4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/></svg><span class="lbl-main">Crear comentari</span>';
  btn.title = 'Generar comentaris de butlletí per a les famílies';
  btn.addEventListener('click', () => openTutoriaModal());
  btnAddActivity.parentNode.insertBefore(btn, btnAddActivity.nextSibling);
  
}

// ============================================================
// CARREGAR DADES DE FIRESTORE
// ============================================================
async function carregarDadesUsuari() {
  if (!_tutoriaDB || !_tutoriaUID) return;
  try {
    const doc = await _tutoriaDB.collection('tutoria_config').doc(_tutoriaUID).get();
    if (doc.exists) {
      const data = doc.data();
      _materiesExtra = data.materiesExtra || { eso: [], batxillerat: [] };
      _apartatsExtra = data.apartatsExtra || [];
    }
  } catch (e) {
    console.warn('tutoria: no s\'han pogut carregar dades', e);
  }
}

async function guardarDadesUsuari() {
  if (!_tutoriaDB || !_tutoriaUID) return;
  try {
    await _tutoriaDB.collection('tutoria_config').doc(_tutoriaUID).set({
      materiesExtra: _materiesExtra,
      apartatsExtra: _apartatsExtra,
    });
  } catch (e) {
    console.warn('tutoria: no s\'han pogut guardar dades', e);
  }
}

// ============================================================
// OBRIR MODAL
// ============================================================
async function openTutoriaModal(ctx) {
  _ctx = (ctx && ctx.studentId) ? ctx : null;
  _llistaAlumnes = [];
  if (!_ctx) {   // botó de dalt: es tria l'alumne d'una llista (si hi ha una classe oberta)
    await carregarLlistaAlumnes();
    if (_llistaAlumnes.length) _ctx = { studentId: '', studentName: '', classId: window.AvaluApp?.getClassId?.(), picker: true };
  }
  document.getElementById('tutoriaModal')?.remove();
  await carregarDadesUsuari();

  const modal = document.createElement('div');
  modal.id = 'tutoriaModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[10000] bg-black bg-opacity-60 p-4';
  modal.innerHTML = buildModalHTML();
  document.body.appendChild(modal);
  initModalInteractions(modal);
  { const sel = modal.querySelector('#tutoriaIdioma'); const l = window.AvaluConfig?.get().idioma; if (sel && l) sel.value = l; }
  omplirAlumnesDesar(modal);
  wireNomParts(modal);
  aplicaGenere(modal);
  modal.querySelector('#tutoriaNom')?.addEventListener('input', () => aplicaGenere(modal));
  const pick = modal.querySelector('#tutoriaPickStudent');
  pick?.addEventListener('change', () => {
    const a = _llistaAlumnes.find(x => x.id === pick.value);
    _ctx.studentId = a?.id || ''; _ctx.studentName = a?.nom || '';
    modal.querySelector('#tutoriaSaveStudent').value = _ctx.studentId;
    modal.querySelector('#tutoriaSaveName').textContent = _ctx.studentName;
    modal.querySelector('#nomPartsBox').innerHTML = nomPartsHTML();
    wireNomParts(modal);
    aplicaGenere(modal);
  });
}
window.openTutoriaModal = openTutoriaModal;

// ============================================================
// CONSTRUIR HTML DEL MODAL
// ============================================================
function buildModalHTML() {
  return `
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">

    <!-- HEADER -->
    <div class="sticky top-0 bg-rose-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
      <div>
        <h2 class="text-xl font-bold">📋 Generador de comentaris de tutoria</h2>
        <p class="text-rose-100 text-sm">${_ctx && !_ctx.picker ? `Alumne/a: <b translate="no">${esc(_ctx.studentName || '')}</b>` : 'Omple el formulari i la IA crearà un comentari per al butlletí'}</p>
      </div>
      <button id="btnCloseTutoria" class="text-white hover:text-rose-200 text-3xl leading-none font-bold">✕</button>
    </div>

    <div class="p-6 space-y-6">

      <!-- NOM I GÈNERE -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">👤 Alumne/a</label>
        <div class="flex gap-3 mb-3">
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-blue-300 hover:bg-blue-50 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500">
            <input type="radio" name="genere" value="noi" checked class="sr-only">👦 Noi (El...)
          </label>
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-pink-300 hover:bg-pink-50 has-[:checked]:bg-pink-500 has-[:checked]:text-white has-[:checked]:border-pink-500">
            <input type="radio" name="genere" value="noia" class="sr-only">👧 Noia (La...)
          </label>
        </div>
        ${_ctx?.picker ? `<select id="tutoriaPickStudent" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" translate="no"><option value="">— Tria l'alumne —</option>${_llistaAlumnes.map(a => `<option value="${esc(a.id)}">${esc(a.nom)}</option>`).join('')}</select><div id="nomPartsBox"></div>`
          : _ctx ? `<div id="nomPartsBox">${nomPartsHTML()}</div>` : `<input id="tutoriaNom" type="text" placeholder="Nom de l'alumne/a (ex: Toni, Júlia...)"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm">`}
      </div>

      <!-- TRIMESTRE -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📅 Moment d'avaluació</label>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          ${buildTrimOptions()}
        </div>
      </div>

      <!-- CURS -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">📚 Curs</label>
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
        <div id="suspesesESO" class="grid grid-cols-2 gap-1">
          ${renderMateriesCheckboxes('eso')}
        </div>
        <div id="suspesesBatx" class="grid grid-cols-2 gap-1 hidden">
          ${renderMateriesCheckboxes('batxillerat')}
        </div>
        <!-- Botó afegir matèria -->
        <button type="button" id="btnAfegirMateria"
          class="mt-3 flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
          ＋ Afegir matèria optativa
        </button>
      </div>

      <!-- COMPORTAMENT -->
      <div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-orange-700 mb-3">🧠 Comportament a l'aula</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('comportament','excel·lent','⭐ Excel·lent','green')}
          ${buildOption('comportament','bo','✅ Bo','green')}
          ${buildOption('comportament','neutre','➖ Neutre','yellow')}
          ${buildOption('comportament','irregular','⚠️ Irregular','orange')}
          ${buildOption('comportament','dolent','❌ Dolent','red')}
          ${buildOption('comportament','disruptiu','🚨 Disruptiu','red')}
        </div>
      </div>

      <!-- ESFORÇ -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-3">💪 Esforç i treball</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('esforc','molt alt','🌟 Molt alt','green')}
          ${buildOption('esforc','alt','✅ Alt','green')}
          ${buildOption('esforc','adequat','➖ Adequat','yellow')}
          ${buildOption('esforc','baix','⚠️ Baix','orange')}
          ${buildOption('esforc','molt baix','❌ Molt baix','red')}
        </div>
      </div>

      <!-- TASQUES -->
      <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-purple-700 mb-3">📝 Lliurament de tasques</label>
        <div class="grid grid-cols-3 gap-2">
          ${buildOption('tasques','sempre','✅ Sempre lliura','green')}
          ${buildOption('tasques','gairebé sempre','🟡 Quasi sempre','yellow')}
          ${buildOption('tasques','a vegades','⚠️ A vegades','orange')}
          ${buildOption('tasques','rarament','❌ Rarament','red')}
          ${buildOption('tasques','mai','🚫 Mai lliura','red')}
        </div>
      </div>

      <!-- ASSISTÈNCIA -->
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-teal-700 mb-3">📅 Assistència</label>
        <div class="grid grid-cols-2 gap-2">
          ${buildOption('assistencia','perfecta','✅ Perfecta','green')}
          ${buildOption('assistencia','bona','🟡 Bona','yellow')}
          ${buildOption('assistencia','irregular amb justificació','⚠️ Irregular (justificada)','orange')}
          ${buildOption('assistencia','moltes faltes sense justificar','❌ Moltes faltes injustificades','red')}
        </div>
      </div>

      <!-- ACTITUD -->
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-indigo-700 mb-3">🤝 Actitud i participació</label>
        <div class="grid grid-cols-2 gap-2">
          ${buildOption('actitud','participa molt activament','🙋 Molt activa','green')}
          ${buildOption('actitud','participa adequadament','✅ Adequada','green')}
          ${buildOption('actitud','poc participativa','➖ Poc activa','yellow')}
          ${buildOption('actitud','passiva i desinteressada','⚠️ Passiva','orange')}
          ${buildOption('actitud','negativa i desmotivada','❌ Negativa','red')}
        </div>
      </div>

      <!-- APARTATS PERSONALITZATS (carregats de Firestore) -->
      <div id="apartatsPersonalitzatsContainer">
        ${renderApartatsExtra()}
      </div>

      <!-- BOTÓ AFEGIR APARTAT PERSONALITZAT -->
      <button type="button" id="btnAfegirApartat"
        class="w-full flex items-center justify-center gap-2 text-sm font-semibold text-violet-600 border-2 border-dashed border-violet-300 hover:bg-violet-50 px-4 py-3 rounded-xl transition-colors">
        ＋ Afegir apartat personalitzat (Treball cooperatiu, Projectes...)
      </button>

      <!-- TO DEL MISSATGE -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-amber-700 mb-3">🎭 To del comentari</label>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-yellow-300 hover:bg-yellow-50 has-[:checked]:bg-yellow-400 has-[:checked]:text-white has-[:checked]:border-yellow-400">
            <input type="radio" name="to_missatge" value="felicitacio" class="sr-only">
            🏆 Felicitació<span class="font-normal opacity-75">Notes excel·lents</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-green-300 hover:bg-green-50 has-[:checked]:bg-green-500 has-[:checked]:text-white has-[:checked]:border-green-500">
            <input type="radio" name="to_missatge" value="positiu" class="sr-only">
            ✅ Positiu<span class="font-normal opacity-75">Bon rendiment</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-gray-300 hover:bg-gray-100 has-[:checked]:bg-gray-500 has-[:checked]:text-white has-[:checked]:border-gray-500">
            <input type="radio" name="to_missatge" value="neutre" checked class="sr-only">
            ➖ Neutre<span class="font-normal opacity-75">Estàndard</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-blue-300 hover:bg-blue-50 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500">
            <input type="radio" name="to_missatge" value="anims" class="sr-only">
            💪 Ànim<span class="font-normal opacity-75">Cal millorar</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-orange-300 hover:bg-orange-50 has-[:checked]:bg-orange-500 has-[:checked]:text-white has-[:checked]:border-orange-500">
            <input type="radio" name="to_missatge" value="avertencia" class="sr-only">
            ⚠️ Advertència<span class="font-normal opacity-75">Situació greu</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-purple-300 hover:bg-purple-50 has-[:checked]:bg-purple-500 has-[:checked]:text-white has-[:checked]:border-purple-500">
            <input type="radio" name="to_missatge" value="segueix" class="sr-only">
            🚀 Segueix així!<span class="font-normal opacity-75">Manten el ritme</span>
          </label>
        </div>
      </div>

      <!-- LLARGADA -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📏 Llargada del comentari</label>
        <div class="grid grid-cols-3 gap-2">
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-gray-300 hover:bg-gray-100 has-[:checked]:bg-gray-700 has-[:checked]:text-white has-[:checked]:border-gray-700">
            <input type="radio" name="llargada" value="curt" class="sr-only">📝 Curt<span class="font-normal opacity-75">(50-80 p.)</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-indigo-300 hover:bg-indigo-50 has-[:checked]:bg-indigo-500 has-[:checked]:text-white has-[:checked]:border-indigo-500">
            <input type="radio" name="llargada" value="mitja" checked class="sr-only">📄 Mitjà<span class="font-normal opacity-75">(80-150 p.)</span>
          </label>
          <label class="flex flex-col items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 text-center text-xs font-semibold transition-all border-violet-300 hover:bg-violet-50 has-[:checked]:bg-violet-500 has-[:checked]:text-white has-[:checked]:border-violet-500">
            <input type="radio" name="llargada" value="llarg" class="sr-only">📃 Llarg<span class="font-normal opacity-75">(150-250 p.)</span>
          </label>
        </div>
      </div>

      <!-- PUNTS FORTS -->
      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-green-700 mb-2">🌟 Punts forts destacables (opcional)</label>
        <textarea id="tutoriaPuntsForts" placeholder="Ex: Molt creatiu/va, bon sentit de l'humor, ajuda als companys..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none text-sm h-20 resize-none"></textarea>
      </div>

      <!-- RECOMANACIONS -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-2">💡 Recomanacions per millorar (opcional)</label>
        <p class="text-xs text-blue-500 mb-2">Ex: Classes particulars de matemàtiques, hàbit de lectura, reforç d'anglès...</p>
        <textarea id="tutoriaRecomanacions" placeholder="Escriu les recomanacions específiques..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm h-20 resize-none"></textarea>
      </div>

      <!-- IDIOMA -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">🌐 Idioma del comentari</label>
        <select id="tutoriaIdioma" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm w-full">
          <option value="catala">Català</option>
          <option value="castella">Castellano</option>
          <option value="angles">English</option>
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
        <div class="mt-3 bg-white border border-rose-200 rounded-xl p-3">
          <label class="block text-xs font-bold text-gray-600 mb-2">💾 Desar com a comentari de l'alumne (al període d'avaluació triat)</label>
          <div class="flex gap-2">
            ${_ctx ? '<div id="tutoriaSaveName" class="flex-1 text-sm text-gray-700 self-center" translate="no">' + esc(_ctx.studentName || '') + '</div><input type="hidden" id="tutoriaSaveStudent" value="' + esc(_ctx.studentId) + '">' : '<select id="tutoriaSaveStudent" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"></select>'}
            <button id="btnGuardarComentari" type="button" class="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">Desar</button>
          </div>
          <p id="tutoriaSaveInfo" class="text-xs text-gray-500 mt-2"></p>
        </div>
        <button id="btnRegenerarComentari"
          class="w-full mt-3 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold py-2 rounded-xl text-sm transition-colors">
          🔄 Generar altra versió
        </button>
      </div>

    </div>
  </div>`;
}

// ============================================================
// RENDER CHECKBOXES MATÈRIES (base + extra)
// ============================================================
function renderMateriesCheckboxes(nivell) {
  const base = ASSIGNATURES[nivell] || [];
  const extra = _materiesExtra[nivell] || [];
  const totes = [...base, ...extra];
  return totes.map(m => `
    <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-rose-50 px-2 py-1 rounded group">
      <input type="checkbox" class="assignatura-check w-4 h-4 accent-rose-500" value="${esc(m)}">
      <span class="flex-1">${esc(m)}</span>
      ${extra.includes(m) ? `<button type="button" class="btn-delete-materia hidden group-hover:inline text-red-400 hover:text-red-600 text-xs" data-nivell="${esc(nivell)}" data-materia="${esc(m)}">✕</button>` : ''}
    </label>`).join('');
}

// ============================================================
// RENDER APARTATS EXTRA
// ============================================================
function renderApartatsExtra() {
  if (_apartatsExtra.length === 0) return '';
  return _apartatsExtra.map(ap => `
    <div class="bg-violet-50 border border-violet-200 rounded-xl p-4" id="apartat-${esc(ap.id)}">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-bold text-violet-700">🔧 ${esc(ap.nom)}</label>
        <button type="button" class="btn-delete-apartat text-xs text-gray-400 hover:text-red-500 underline" data-id="${esc(ap.id)}">Eliminar apartat</button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        ${ap.opcions.map(op => buildOption(`apartat_${ap.id}`, op.valor, op.label, op.color)).join('')}
      </div>
    </div>`).join('');
}

// ============================================================
// HELPERS HTML
// ============================================================
// Moment d'avaluació = grups creats a la classe (value = id del grup)
function buildTrimOptions() {
  const terms = window.AvaluApp?.getTerms?.() || [];
  const cur = (_ctx && window.AvaluApp?.getCommentTermId?.()) || window.AvaluApp?.getActiveTermId?.();
  if (!terms.length) {
    return ['1r Trimestre', '2n Trimestre', '3r Trimestre', 'Final de curs']
      .map(n => buildOption('trimestre', n.toLowerCase(), n, 'blue')).join('');
  }
  return terms.map(t => buildOption('trimestre', t.id, t.name, 'blue', t.id === cur)).join('');
}

function buildOption(grup, valor, label, color, checked) {
  const colors = {
    blue:   'border-blue-300 hover:bg-blue-100 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500',
    green:  'border-green-300 hover:bg-green-100 has-[:checked]:bg-green-500 has-[:checked]:text-white has-[:checked]:border-green-500',
    yellow: 'border-yellow-300 hover:bg-yellow-100 has-[:checked]:bg-yellow-400 has-[:checked]:text-white has-[:checked]:border-yellow-400',
    orange: 'border-orange-300 hover:bg-orange-100 has-[:checked]:bg-orange-500 has-[:checked]:text-white has-[:checked]:border-orange-500',
    red:    'border-red-300 hover:bg-red-100 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500',
    violet: 'border-violet-300 hover:bg-violet-100 has-[:checked]:bg-violet-500 has-[:checked]:text-white has-[:checked]:border-violet-500',
  };
  return `
    <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${colors[color] || colors.green}">
      <input type="radio" name="${esc(grup)}" value="${esc(valor)}" data-name="${esc(label)}" ${checked ? 'checked' : ''} class="sr-only">${esc(label)}
    </label>`;
}

// ============================================================
// INTERACCIONS DEL MODAL
// ============================================================
function initModalInteractions(modal) {
  modal.querySelector('#btnCloseTutoria').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Pestanyes suspeses
  const tabESO  = modal.querySelector('#tabSuspESO');
  const tabBatx = modal.querySelector('#tabSuspBatx');
  const contESO  = modal.querySelector('#suspesesESO');
  const contBatx = modal.querySelector('#suspesesBatx');

  tabESO.addEventListener('click', () => {
    tabESO.className  = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabBatx.className = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    contESO.classList.remove('hidden'); contBatx.classList.add('hidden');
  });
  tabBatx.addEventListener('click', () => {
    tabBatx.className = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabESO.className  = 'tab-susp-btn px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    contBatx.classList.remove('hidden'); contESO.classList.add('hidden');
  });

  // Desmarcar
  modal.querySelector('#btnDesmarcarSuspeses').addEventListener('click', () => {
    modal.querySelectorAll('.assignatura-check').forEach(c => c.checked = false);
  });

  // Afegir matèria optativa
  modal.querySelector('#btnAfegirMateria').addEventListener('click', () => {
    openAfegirMateriaModal(modal);
  });

  // Eliminar matèria extra (delegació d'events)
  modal.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-delete-materia');
    if (btn) {
      const nivell  = btn.dataset.nivell;
      const materia = btn.dataset.materia;
      if (!await confirmDialog(`Eliminar "${materia}" de la llista?`)) return;
      _materiesExtra[nivell] = (_materiesExtra[nivell] || []).filter(m => m !== materia);
      await guardarDadesUsuari();
      refreshMateriesCheckboxes(modal, nivell);
    }
  });

  // Afegir apartat personalitzat
  modal.querySelector('#btnAfegirApartat').addEventListener('click', () => {
    openAfegirApartatModal(modal);
  });

  // Eliminar apartat personalitzat
  modal.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-delete-apartat');
    if (btn) {
      const id = btn.dataset.id;
      if (!await confirmDialog('Eliminar aquest apartat?')) return;
      _apartatsExtra = _apartatsExtra.filter(a => a.id !== id);
      await guardarDadesUsuari();
      modal.querySelector('#apartatsPersonalitzatsContainer').innerHTML = renderApartatsExtra();
    }
  });

  // Les tries (comportament, esforç…) es poden desmarcar tornant a clicar: així l'aspecte no surt al comentari
  const _grupsOpc = new Set(['comportament', 'esforc', 'tasques', 'assistencia', 'actitud']);
  modal.addEventListener('mousedown', e => {
    const r = e.target.closest('label')?.querySelector('input[type="radio"]');
    if (r && (_grupsOpc.has(r.name) || r.name.startsWith('apartat_'))) r.dataset.was = r.checked ? '1' : '';
  });
  modal.addEventListener('click', e => {
    const r = e.target.closest('label')?.querySelector('input[type="radio"]');
    if (r && r.dataset.was === '1') { r.checked = false; r.dataset.was = ''; e.preventDefault(); }
  });

  // Generar / Regenerar / Copiar
  modal.querySelector('#btnGenerarComentari').addEventListener('click', () => generarComentari(modal));
  modal.addEventListener('click', e => {
    if (e.target.id === 'btnRegenerarComentari') generarComentari(modal);
    if (e.target.id === 'btnGuardarComentari') guardarComentariAlumne(modal, e.target);
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
// DESAR EL COMENTARI A L'ALUMNE (al període d'avaluació triat)
// ============================================================
async function carregarLlistaAlumnes() {
  const ids = window.AvaluApp?.getStudentIds?.() || [];
  if (!ids.length || !_tutoriaDB) return;
  try {
    const docs = await Promise.all(ids.map(id => _tutoriaDB.collection('alumnes').doc(id).get()));
    _llistaAlumnes = docs.filter(d => d.exists).map(d => ({ id: d.id, nom: d.data().nom || '' }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
  } catch (e) { console.warn('tutoria: no s\'han pogut carregar els alumnes', e); }
}

async function omplirAlumnesDesar(modal) {
  const sel = modal.querySelector('#tutoriaSaveStudent');
  const ids = window.AvaluApp?.getStudentIds?.() || [];
  if (!sel || _ctx) return;
  if (!ids.length || !_tutoriaDB) { sel.innerHTML = '<option value="">(obre una classe per poder desar)</option>'; return; }
  const docs = await Promise.all(ids.map(id => _tutoriaDB.collection('alumnes').doc(id).get()));
  sel.innerHTML = '<option value="">— Tria l\'alumne —</option>' +
    docs.filter(d => d.exists).map(d => `<option value="${esc(d.id)}">${esc(d.data().nom || '')}</option>`).join('');
}

function triaAlumneSegonsNom(modal) {
  const nom = (modal.querySelector('#tutoriaNom')?.value || '').trim().toLowerCase();
  const sel = modal.querySelector('#tutoriaSaveStudent');
  if (!nom || !sel) return;
  const opt = [...sel.options].find(o => o.value && o.textContent.toLowerCase().includes(nom));
  if (opt) sel.value = opt.value;
}

async function guardarComentariAlumne(modal, btn) {
  const sid = modal.querySelector('#tutoriaSaveStudent')?.value;
  const text = modal.querySelector('#tutoriaComentariText')?.textContent?.trim();
  const info = modal.querySelector('#tutoriaSaveInfo');
  const classId = _ctx?.classId || window.AvaluApp?.getClassId?.();
  if (!sid) { notify('Tria l\'alumne al qual vols desar el comentari.'); return; }
  if (!text || text.includes('La IA està') || text.startsWith('❌')) return;
  const terms = window.AvaluApp?.getTerms?.() || [];
  const sel = modal.querySelector('input[name="trimestre"]:checked')?.value;
  const termId = terms.some(t => t.id === sel) ? sel : window.AvaluApp?.getActiveTermId?.();
  try {
    btn.disabled = true;
    await _tutoriaDB.collection('alumnes').doc(sid).update(
      termId ? { [`comentarisTrim.${classId}.${termId}`]: text } : { [`comentarios.${classId}`]: text });
    const tn = terms.find(t => t.id === termId)?.name;
    if (info) info.textContent = `✅ Desat${tn ? ' a «' + tn + '»' : ''}.`;
    const ta = document.getElementById('commentTextarea');
    if (_ctx && ta) { ta.value = text; ta.dispatchEvent(new Event('input')); }
    if (typeof window.renderNotesGrid === 'function') window.renderNotesGrid();
    if (_ctx) setTimeout(() => modal.remove(), 700);
  } catch (e) {
    notify('Error desant el comentari: ' + e.message);
  } finally { btn.disabled = false; }
}

// ============================================================
// NOM DE L'ALUMNE (mode cel·la): quines parts del nom es mostren al comentari
// ============================================================
const _cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const _prefsNom = () => { try { return JSON.parse(localStorage.getItem('uc_nom_parts') || '{"nom":true,"cognom1":false,"cognom2":false}'); } catch { return { nom: true, cognom1: false, cognom2: false }; } };
// Format dels noms de la llista: es desa al perfil (segueix l'usuari entre dispositius) i a localStorage
const _ordreNom = () => { try { return window.AvaluConfig?.get().ordreNom || localStorage.getItem('uc_nom_order') || 'nc'; } catch { return 'nc'; } };
// Separa el nom complet segons el format de la llista: 'nc' = «Nom Cognom1 Cognom2», 'cn' = «Cognom1 Cognom2 Nom»
function parteixNom(full, ordre) {
  full = (full || '').trim();
  if (full.includes(',')) {                       // «Cognoms, Nom»
    const [cog, nom] = full.split(',').map(x => x.trim());
    const c = cog.split(/\s+/);
    return { nom: nom || '', cognom1: c[0] || '' };
  }
  const p = full.split(/\s+/).filter(Boolean);
  if (ordre === 'cn' && p.length > 1) {
    return { nom: p[p.length - 1], cognom1: p[0] };
  }
  return { nom: p[0] || '', cognom1: p[1] || '' };
}
function nomPartsHTML() {
  if (!_ctx?.studentName) return '';
  const ordre = _ordreNom();
  const pt = parteixNom(_ctx.studentName, ordre);
  const prefs = _prefsNom();
  const mk = (key, label, val) => val ? `
    <label class="nom-chip flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" class="nom-part-check w-4 h-4 accent-violet-600" data-key="${key}" data-val="${esc(_cap(val))}" ${prefs[key] ? 'checked' : ''}>
      <span class="nm font-semibold" translate="no">${esc(_cap(val))}</span>
      <span class="text-gray-400 text-xs">(${label})</span>
    </label>` : '';
  return `<div class="border-t border-gray-200 pt-3">
    <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
      <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Mostrar al comentari</div>
      <label class="nom-chip text-xs text-gray-500 flex items-center gap-2">Format del nom a la llista
        <select id="tutoriaNomOrdre" class="border border-gray-300 rounded-lg px-2 py-1 text-xs">
          <option value="nc" ${ordre === 'nc' ? 'selected' : ''}>Nom Cognoms</option>
          <option value="cn" ${ordre === 'cn' ? 'selected' : ''}>Cognoms Nom</option>
        </select></label>
    </div>
    <div class="flex gap-4 flex-wrap">${mk('nom', 'nom', pt.nom)}${mk('cognom1', '1r cognom', pt.cognom1)}</div></div>`;
}
// Marca «Noi» / «Noia» segons el nom de pila (si el nom no es reconeix, es deixa la tria com està)
function aplicaGenere(modal) {
  const nom = _ctx ? parteixNom(_ctx.studentName, _ordreNom()).nom : modal.querySelector('#tutoriaNom')?.value;
  const g = guessGender(nom);
  if (!g) return;
  const r = modal.querySelector(`input[name="genere"][value="${g}"]`);
  if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
}
function wireNomParts(modal) {
  const box = modal.querySelector('#nomPartsBox');
  const sel = box?.querySelector('#tutoriaNomOrdre');
  sel?.addEventListener('change', () => {
    try { localStorage.setItem('uc_nom_order', sel.value); } catch {}
    try { window.AvaluConfig?.set({ ordreNom: sel.value }); } catch {}
    box.innerHTML = nomPartsHTML(); wireNomParts(modal); aplicaGenere(modal);
  });
}
function nomSegonsChecks(modal) {
  const prefs = {};
  const parts = [];
  modal.querySelectorAll('.nom-part-check').forEach(c => { prefs[c.dataset.key] = c.checked; if (c.checked) parts.push(c.dataset.val); });
  try { localStorage.setItem('uc_nom_parts', JSON.stringify({ ..._prefsNom(), ...prefs })); } catch {}
  return parts.join(' ');
}

// ============================================================
// REFRESC CHECKBOXES MATÈRIES
// ============================================================
function refreshMateriesCheckboxes(modal, nivell) {
  const cont = modal.querySelector(nivell === 'eso' ? '#suspesesESO' : '#suspesesBatx');
  if (cont) cont.innerHTML = renderMateriesCheckboxes(nivell);
}

// ============================================================
// MODAL: AFEGIR MATÈRIA OPTATIVA
// ============================================================
function openAfegirMateriaModal(parentModal) {
  // Detectar quin nivell és visible
  const nivellVisible = parentModal.querySelector('#suspesesBatx:not(.hidden)') ? 'batxillerat' : 'eso';

  const m = document.createElement('div');
  m.className = 'fixed inset-0 flex items-center justify-center z-[10000] bg-black bg-opacity-50 p-4';
  m.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
      <h3 class="font-bold text-lg mb-4">➕ Nova matèria optativa</h3>
      <div class="mb-3">
        <label class="text-sm font-semibold text-gray-700 mb-1 block">Nivell</label>
        <div class="flex gap-2">
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center text-sm font-semibold has-[:checked]:bg-rose-500 has-[:checked]:text-white border-rose-300">
            <input type="radio" name="nivell_nova" value="eso" ${nivellVisible === 'eso' ? 'checked' : ''} class="sr-only">ESO
          </label>
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center text-sm font-semibold has-[:checked]:bg-rose-500 has-[:checked]:text-white border-rose-300">
            <input type="radio" name="nivell_nova" value="batxillerat" ${nivellVisible === 'batxillerat' ? 'checked' : ''} class="sr-only">Batxillerat
          </label>
        </div>
      </div>
      <label class="text-sm font-semibold text-gray-700 mb-1 block">Nom de la matèria</label>
      <input id="inputNovaMateria" type="text" placeholder="Ex: Robòtica, Emprenedoria, Teatre..."
        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 focus:outline-none mb-4">
      <div class="flex gap-2">
        <button id="btnCancelMateria" class="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">Cancel·lar</button>
        <button id="btnConfirmMateria" class="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg py-2 text-sm font-semibold">Guardar</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  m.querySelector('#btnCancelMateria').addEventListener('click', () => m.remove());
  m.querySelector('#btnConfirmMateria').addEventListener('click', async () => {
    const nom = m.querySelector('#inputNovaMateria').value.trim();
    const nivell = m.querySelector('input[name="nivell_nova"]:checked').value;
    if (!nom) { notify('Escriu el nom de la matèria'); return; }
    if (!_materiesExtra[nivell]) _materiesExtra[nivell] = [];
    if (_materiesExtra[nivell].includes(nom) || ASSIGNATURES[nivell].includes(nom)) {
      notify('Aquesta matèria ja existeix'); return;
    }
    _materiesExtra[nivell].push(nom);
    await guardarDadesUsuari();
    refreshMateriesCheckboxes(parentModal, nivell);
    m.remove();
  });
}

// ============================================================
// MODAL: AFEGIR APARTAT PERSONALITZAT
// ============================================================
function openAfegirApartatModal(parentModal) {
  let opcions = [
    { valor: 'excel·lent', label: '⭐ Excel·lent', color: 'green' },
    { valor: 'adequat',    label: '✅ Adequat',    color: 'yellow' },
    { valor: 'a millorar', label: '⚠️ A millorar', color: 'orange' },
    { valor: 'insuficient','label': '❌ Insuficient','color': 'red' },
  ];

  const m = document.createElement('div');
  m.className = 'fixed inset-0 flex items-center justify-center z-[10000] bg-black bg-opacity-50 p-4';
  m.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="font-bold text-lg mb-1">➕ Nou apartat personalitzat</h3>
      <p class="text-xs text-gray-500 mb-4">Ex: Treball cooperatiu, Projectes, Autonomia...</p>

      <label class="text-sm font-semibold text-gray-700 mb-1 block">Nom de l'apartat</label>
      <input id="inputNomApartat" type="text" placeholder="Ex: Treball cooperatiu"
        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none mb-4">

      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-semibold text-gray-700">Opcions de valoració</label>
        <button type="button" id="btnAfegirOpcio" class="text-xs text-violet-600 border border-violet-300 hover:bg-violet-50 px-2 py-1 rounded-lg">＋ Afegir opció</button>
      </div>

      <div id="opcionsContainer" class="space-y-2 mb-4">
        <!-- es renderitza dinàmicament -->
      </div>

      <div class="flex gap-2 mt-4">
        <button id="btnCancelApartat" class="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50">Cancel·lar</button>
        <button id="btnConfirmApartat" class="flex-1 bg-violet-500 hover:bg-violet-600 text-white rounded-lg py-2 text-sm font-semibold">Guardar apartat</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  const renderOpcions = () => {
    const cont = m.querySelector('#opcionsContainer');
    cont.innerHTML = opcions.map((op, i) => `
      <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
        <input type="text" value="${esc(op.label)}" placeholder="Etiqueta (ex: ⭐ Molt bé)"
          class="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 opcio-label" data-i="${i}">
        <input type="text" value="${esc(op.valor)}" placeholder="Valor intern"
          class="w-28 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 opcio-valor" data-i="${i}">
        <select class="border border-gray-200 rounded px-1 py-1 text-xs opcio-color" data-i="${i}">
          ${COLORS_OPCIO.map(c => `<option value="${c}" ${op.color === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <button type="button" class="text-red-400 hover:text-red-600 text-lg leading-none opcio-delete" data-i="${i}">✕</button>
      </div>`).join('');

    cont.querySelectorAll('.opcio-label').forEach(el => {
      el.addEventListener('input', e => { opcions[+e.target.dataset.i].label = e.target.value; });
    });
    cont.querySelectorAll('.opcio-valor').forEach(el => {
      el.addEventListener('input', e => { opcions[+e.target.dataset.i].valor = e.target.value; });
    });
    cont.querySelectorAll('.opcio-color').forEach(el => {
      el.addEventListener('change', e => { opcions[+e.target.dataset.i].color = e.target.value; });
    });
    cont.querySelectorAll('.opcio-delete').forEach(el => {
      el.addEventListener('click', e => {
        opcions.splice(+e.target.dataset.i, 1);
        renderOpcions();
      });
    });
  };
  renderOpcions();

  m.querySelector('#btnAfegirOpcio').addEventListener('click', () => {
    opcions.push({ valor: 'nova opció', label: '🔹 Nova opció', color: 'blue' });
    renderOpcions();
  });

  m.querySelector('#btnCancelApartat').addEventListener('click', () => m.remove());

  m.querySelector('#btnConfirmApartat').addEventListener('click', async () => {
    const nom = m.querySelector('#inputNomApartat').value.trim();
    if (!nom) { notify('Escriu el nom de l\'apartat'); return; }
    if (opcions.length === 0) { notify('Afegeix almenys una opció'); return; }

    const nouApartat = {
      id: 'ap_' + Date.now(),
      nom,
      opcions: opcions.map(op => ({
        valor: op.valor || op.label.replace(/[^\w\s]/g, '').trim().toLowerCase(),
        label: op.label,
        color: op.color,
      })),
    };
    _apartatsExtra.push(nouApartat);
    await guardarDadesUsuari();
    parentModal.querySelector('#apartatsPersonalitzatsContainer').innerHTML = renderApartatsExtra();

    // Reinicialitzar events dels nous apartats
    parentModal.querySelectorAll('.btn-delete-apartat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!await confirmDialog('Eliminar aquest apartat?')) return;
        _apartatsExtra = _apartatsExtra.filter(a => a.id !== id);
        await guardarDadesUsuari();
        parentModal.querySelector('#apartatsPersonalitzatsContainer').innerHTML = renderApartatsExtra();
      });
    });
    m.remove();
  });
}

// ============================================================
// RECOLLIR DADES DEL FORMULARI
// ============================================================
function recollidaDades(modal) {
  const getValue = name => {
    const el = modal.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  };

  const nom   = (_ctx ? nomSegonsChecks(modal) : modal.querySelector('#tutoriaNom').value.trim()) || 'l\'alumne/a';
  const curs  = modal.querySelector('#tutoriaCurs').value.trim();
  const idioma = modal.querySelector('#tutoriaIdioma').value;
  const puntsForts    = modal.querySelector('#tutoriaPuntsForts').value.trim();
  const to       = getValue('to_missatge') || 'neutre';
  const llargada = getValue('llargada') || 'mitja';
  const recomanacions = modal.querySelector('#tutoriaRecomanacions').value.trim();
  const suspeses = [...modal.querySelectorAll('.assignatura-check:checked')].map(c => c.value);

  const genere  = getValue('genere') || 'noi';
  // Apòstrof català: l'Albert, l'Aina (davant vocal o h muda)
  const _esVH   = nom && nom !== "l'alumne/a" && /^[aeiouàèéíïóòúüh]/i.test(nom.trim());
  const article = _esVH ? "l'" : (genere === 'noia' ? 'La' : 'El');
  const nomAmbArticle = nom === "l'alumne/a" ? nom : (_esVH ? `l'${nom}` : `${article} ${nom}`);

  // Recollir apartats personalitzats
  const apartatsValors = _apartatsExtra.map(ap => ({
    nom: ap.nom,
    valor: getValue(`apartat_${ap.id}`),
  })).filter(a => a.valor);

  return {
    nom, nomAmbArticle,
    genere, article, curs, idioma,
    trimestre: modal.querySelector('input[name="trimestre"]:checked')?.dataset.name || null,
    suspeses,
    comportament: getValue('comportament'),
    esforc:       getValue('esforc'),
    tasques:      getValue('tasques'),
    assistencia:  getValue('assistencia'),
    actitud:      getValue('actitud'),
    puntsForts, recomanacions,
    to, llargada,
    apartatsValors,
  };
}

// ============================================================
// TO DEL COMENTARI → INSTRUCCIONS PER AL PROMPT
// ============================================================
function toInstruccio(to, situacioGreu) {
  const tos = {
    felicitacio: `TO FELICITACIÓ: Comença amb una felicitació explícita i entusiasta. Celebra els èxits concrets i ressalta els punts forts. Acaba animant a mantenir aquest nivell.`,
    positiu:     `TO POSITIU: Destaca els aspectes bons per sobre dels negatius. Si hi ha suspesos o aspectes fluixos, presenta'ls breument com a reptes superables sense que dominin el missatge. Acaba amb confiança en les capacitats de l'alumne/a.`,
    neutre:      `TO EQUILIBRAT: Presenta punts forts i aspectes a millorar de forma proporcionada. ${situacioGreu ? "Menciona les mancances clarament però de forma constructiva." : "Menciona els reptes com a oportunitats de creixement."} Acaba amb encoratjament realista.`,
    anims:       `TO ÀNIM: L'alumne/a necessita motivació. Reconeix l'esforç fet, per petit que sigui. Si hi ha suspesos, emfatitza que és possible superar-los. El final ha de ser un missatge d'ànim sincer.`,
    avertencia:  `TO SERIÓS (respectuós però directe): La situació és preocupant. Digues clarament que els aspectes negatius indicats a DADES han perjudicat el rendiment. Transmet preocupació real i necessitat de canvi. Acaba demanant esforç concret.`,
    segueix:     `TO SEGUEIX AIXÍ: L'alumne/a ho fa bé; reconeix-ho i anima'l a mantenir el ritme (pots usar expressions com "Segueix així!"). Que se senti valorat i motivat a continuar.`,
  };
  return tos[to] || tos.neutre;
}

// ============================================================
// CONSTRUIR PROMPT
// ============================================================
const _NEG = {
  comportament: ['irregular', 'dolent', 'disruptiu'],
  esforc: ['baix', 'molt baix'],
  tasques: ['a vegades', 'rarament', 'mai'],
  assistencia: ['irregular amb justificació', 'moltes faltes sense justificar'],
  actitud: ['poc participativa', 'passiva i desinteressada', 'negativa i desmotivada'],
};
const _NEG_GREU = {
  comportament: ['dolent', 'disruptiu'], esforc: ['baix', 'molt baix'], tasques: ['rarament', 'mai'],
  assistencia: ['moltes faltes sense justificar'], actitud: ['passiva i desinteressada', 'negativa i desmotivada'],
};

function buildPrompt(dades) {
  const { nom, nomAmbArticle, genere, article } = dades;
  const ca = !dades.idioma || dades.idioma === 'catala';
  const sensNom = !nom || nom === "l'alumne/a";          // no s'ha pogut triar cap nom
  const ref = sensNom ? "l'alumne/a" : (ca ? nomAmbArticle : nom);   // com cal anomenar-lo
  const nSusp = dades.suspeses.length;
  // Només importa QUANTES n'ha suspès (les famílies ja veuen les notes al butlletí)
  const quantitat = n => n === 0 ? 'cap' : n === 1 ? 'una' : n === 2 ? 'dues' : n === 3 ? 'tres' : n <= 5 ? 'quatre o cinc (força)' : 'moltes (la majoria)';
  const suspesesTxt = nSusp > 0
    ? `Matèries suspeses: ${quantitat(nSusp)}.`
    : 'Matèries suspeses: cap.';
  const campOpcional = (label, val) => val ? `- ${label}: ${val}` : '';

  const grups = ['comportament', 'esforc', 'tasques', 'assistencia', 'actitud'];
  const negatius = grups.filter(g => (_NEG[g] || []).includes(dades[g])).length;
  const greus = grups.filter(g => (_NEG_GREU[g] || []).includes(dades[g])).length;
  const situacioGreu = greus >= 3 || (nSusp > 0 && greus >= 2);
  const hiHaProblemes = nSusp > 0 || negatius >= 2;
  const nomesPositiu = grups.every(g => !(_NEG[g] || []).includes(dades[g])) && nSusp === 0;

  const apartatsExtraTxt = dades.apartatsValors.map(a => campOpcional(a.nom, a.valor)).join('\n');

  const context = [
    sensNom ? '' : `Nom: ${nom} (usar "${ref}")`,
    `Gènere: ${genere === 'noia' ? 'noia' : 'noi'}`,
    dades.trimestre ? `Moment d'avaluació: ${dades.trimestre}.` : '',
    dades.curs ? `Curs: ${dades.curs}` : '',
    suspesesTxt,
    campOpcional('Comportament', dades.comportament),
    campOpcional('Esforç i treball', dades.esforc),
    campOpcional('Lliurament de tasques', dades.tasques),
    campOpcional('Assistència', dades.assistencia),
    campOpcional('Actitud i participació', dades.actitud),
    apartatsExtraTxt,
    campOpcional('Punts forts (del tutor)', dades.puntsForts),
    campOpcional('Recomanacions (del tutor)', dades.recomanacions),
  ].filter(Boolean).join('\n');

  const fem = genere === 'noia';
  const idiomaInstruccio = dades.idioma === 'angles'
    ? `Write the comment in English. ${sensNom ? 'Refer to the student as "the student"' : `Refer to the student as "${nom}"`} and use the pronouns ${fem ? 'she/her' : 'he/him'}.`
    : dades.idioma === 'castella'
    ? `Escribe el comentario en castellano. ${sensNom ? 'Refiérete al alumno/a de forma neutra' : `Llama al alumno "${nom}" (sin artículo delante del nombre)`} y usa los pronombres ${fem ? 'ella' : 'él'}.`
    : `Escriu en català. ${sensNom ? "Anomena l'alumne/a «l'alumne/a»" : `Usa "${ref}"`}. Omet el pronom subjecte ell/ella quan el subjecte és conegut.`;

  const t = dades.trimestre || '';
  const trimestreCtx = !t ? '' : /final|curs/i.test(t)
    ? `El moment és «${t}»: dona una visió global del curs.`
    : `El moment és «${t}» (no és el final de curs): mira cap al període següent.`;

  const paraules = dades.llargada === 'curt' ? ['50', '80', 'molt concís: 2-3 frases amb el més important']
    : dades.llargada === 'llarg' ? ['150', '250', 'desenvolupat, en 2-3 paràgrafs']
    : ['80', '150', 'un o dos paràgrafs'];

  const graduacio = nSusp === 0 ? ''
    : nSusp <= 2 ? "Té poques matèries suspeses: presenta-ho com un repte concret i recuperable."
    : nSusp <= 5 ? "Té diverses matèries suspeses: cal que la família vegi que és una situació que s'ha de revertir amb constància."
    : "Té moltes matèries suspeses: transmet preocupació sincera i la necessitat d'un canvi important i d'un treball conjunt família-centre.";

  const regles = [
    idiomaInstruccio,
    "Escrius com el tutor/a de l'alumne/a, amb un text que llegiran els pares i mares al butlletí. Parla de l'alumne/a en tercera persona, amb un to proper i professional, com ho faria un professor de debò.",
    sensNom ? '' : (ca ? `Comença el comentari amb "${ref}".` : dades.idioma === 'angles' ? `Start the comment with "${nom}".` : `Empieza el comentario con "${nom}".`),
    `Extensió: entre ${paraules[0]} i ${paraules[1]} paraules (${paraules[2]}).`,
    "DADES és només el perfil de l'alumne/a perquè sàpigues com és: NO és una llista per reproduir. No repeteixis cada característica una per una. Tria els aspectes més rellevants per al to i teixeix-los en un relat coherent, ometent o agrupant els detalls menors.",
    "Redacta amb prosa natural i fluida: frases completes que tinguin sentit per a una família, connectors naturals, sense enumeracions i sense encadenar «però» seguits. Evita expressions artificials, tòpics buits i frases que una persona no diria mai.",
    "No deduïs ni afegeixis trets de caràcter o de personalitat (introvertit, tímid, inquiet…) ni fets, anècdotes o motius que no surtin a DADES.",
    'No mencions notes numèriques ni noms d\'assignatures concretes: la família ja té el butlletí.',
    trimestreCtx,
    toInstruccio(dades.to, situacioGreu),
    nSusp > 0
      ? `Hi ha matèries suspeses. NO diguis quines ni en facis una llista; només fes-hi referència de manera general («les matèries pendents») i orienta el comentari a com superar-les. ${graduacio}`
      : 'No hi ha cap matèria suspesa: no en parlis.',
    (['felicitacio', 'segueix'].includes(dades.to) && hiHaProblemes)
      ? "A DADES també hi ha aspectes fluixos o matèries suspeses: felicita només el que és realment bo i esmenta la resta amb tacte i breument, sense felicitar de manera global."
      : '',
    (dades.to === 'avertencia' && nomesPositiu)
      ? "A DADES no hi ha cap aspecte negatiu: mantén un to formal però no inventis problemes; insisteix en la importància de mantenir l'esforç."
      : '',
    dades.apartatsValors.length ? "Si hi ha apartats personalitzats, integra'ls amb naturalitat dins del text (no com a llista)." : '',
    dades.puntsForts ? "Aprofita els punts forts indicats pel tutor, reformulats amb naturalitat." : '',
    dades.recomanacions ? "Inclou les recomanacions del tutor com un consell concret per a la família." : '',
    "Acaba amb una frase final orientada cap al futur, coherent amb el to triat (per exemple, superar les matèries pendents si n'hi ha, o mantenir el bon ritme).",
    'Concordança de gènere correcta.',
  ].filter(Boolean);

  return `Ets un tutor/a escolar que escriu el comentari de tutoria del butlletí de notes, dirigit a les famílies.

DADES DE L'ALUMNE/A:
${context}

INSTRUCCIONS:
${regles.map(r => '- ' + r).join('\n')}

Escriu NOMÉS el comentari final, sense títol ni explicació.`;
}

// ============================================================
// GENERAR COMENTARI
// ============================================================
async function generarComentari(modal) {
  const dades = recollidaDades(modal);
  if (_ctx?.picker && !_ctx.studentId) { notify('Tria l\'alumne.'); return; }
  if (!_ctx && (!dades.nom || dades.nom === 'l\'alumne/a')) {
    notify('⚠️ Si us plau, escriu el nom de l\'alumne/a'); return;
  }

  const btnGenerar    = modal.querySelector('#btnGenerarComentari');
  const resultatDiv   = modal.querySelector('#tutoriaResultat');
  const comentariText = modal.querySelector('#tutoriaComentariText');

  btnGenerar.disabled = true;
  btnGenerar.innerHTML = '⏳ Generant...';
  resultatDiv.classList.remove('hidden');
  comentariText.innerHTML = '<span class="text-gray-400 italic">La IA està escrivint el comentari...</span>';

  try {
    const text = await window.aiGenerate(buildPrompt(dades), _ctx ? [_ctx.studentName, dades.nom] : [dades.nom]);
    comentariText.textContent = text || 'No s\'ha pogut generar el comentari.';
    if (!_ctx) triaAlumneSegonsNom(modal);
    resultatDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error('Error:', err);
    comentariText.innerHTML = `<span class="text-red-500">❌ Error: ${esc(err.message)}</span>`;
  } finally {
    btnGenerar.disabled = false;
    btnGenerar.innerHTML = '✨ Generar comentari amb IA';
  }
}
