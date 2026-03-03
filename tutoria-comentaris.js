// tutoria-comentaris.js
// Injector que afegeix:
// 1. Botó "✨ Generar per IA" al modal de comentaris d'alumne
// 2. Formulari clon de tutoria amb "💾 Guardar a l'alumne"
// 3. Botó exportar Excel a la capçalera de la columna Comentaris
// NO toca res de l'existent (app.js, tutoria.js, etc.)

console.log('✅ tutoria-comentaris.js carregat');

// ============================================================
// ESTAT
// ============================================================
let _tcUID = null;
let _tcDB  = null;
let _tcMateriesExtra = { eso: [], batxillerat: [] };
let _tcApartatsExtra = [];
let _tcStudentId   = null;
let _tcStudentName = null;

// ============================================================
// ASSIGNATURES BASE
// ============================================================
const TC_ASSIGNATURES = {
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

const TC_COLORS = ['green','yellow','orange','red','blue'];

// ============================================================
// INICIALITZACIÓ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(tcInit, 1000);
});

function tcInit() {
  const tryAuth = () => {
    const auth = window.firebase?.auth?.();
    if (!auth) { setTimeout(tryAuth, 500); return; }
    auth.onAuthStateChanged(user => {
      if (user) { _tcUID = user.uid; _tcDB = window.firebase.firestore(); }
    });
  };
  tryAuth();

  // Observar quan s'obre el modal de comentaris per injectar el botó
  observeCommentsModal();

  // Observar la graella per injectar el botó d'exportar
  observeCapcaleraComentaris();
}

// ============================================================
// CARREGAR CONFIG DE FIRESTORE (compartida amb tutoria.js)
// ============================================================
async function tcCarregarConfig() {
  if (!_tcDB || !_tcUID) return;
  try {
    const doc = await _tcDB.collection('tutoria_config').doc(_tcUID).get();
    if (doc.exists) {
      const data = doc.data();
      _tcMateriesExtra = data.materiesExtra || { eso: [], batxillerat: [] };
      _tcApartatsExtra = data.apartatsExtra || [];
    }
  } catch(e) { console.warn('tcComentaris: no s\'han pogut carregar dades', e); }
}

async function tcGuardarConfig() {
  if (!_tcDB || !_tcUID) return;
  try {
    await _tcDB.collection('tutoria_config').doc(_tcUID).set({
      materiesExtra: _tcMateriesExtra,
      apartatsExtra: _tcApartatsExtra,
    });
  } catch(e) { console.warn('tcComentaris: no s\'han pogut guardar dades', e); }
}

// ============================================================
// OBSERVAR EL MODAL DE COMENTARIS I INJECTAR BOTÓ IA
// ============================================================
function observeCommentsModal() {
  const observer = new MutationObserver(() => {
    const modal = document.getElementById('modalComments');
    if (!modal) return;
    if (modal.dataset.tcInjected) return;
    modal.dataset.tcInjected = 'true';
    injectIAButtonInModal(modal);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Si ja existeix el modal al DOM
  const modal = document.getElementById('modalComments');
  if (modal && !modal.dataset.tcInjected) {
    modal.dataset.tcInjected = 'true';
    injectIAButtonInModal(modal);
  }
}

function injectIAButtonInModal(modal) {
  // Esperar que el modal tingui els botons
  const tryInject = () => {
    const botoesDiv = modal.querySelector('.flex.gap-2');
    if (!botoesDiv) { setTimeout(tryInject, 300); return; }
    if (botoesDiv.querySelector('#btnGenerarIA')) return;

    const btnIA = document.createElement('button');
    btnIA.id = 'btnGenerarIA';
    btnIA.className = 'flex-1 px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-semibold cursor-pointer border-none text-sm';
    btnIA.innerHTML = '✨ Generar per IA';
    btnIA.title = 'Genera el comentari amb intel·ligència artificial';

    // Inserir entre Cancel·lar i Guardar
    const cancelBtn = botoesDiv.querySelector('.flex-1:first-child');
    const saveBtn   = botoesDiv.querySelector('.flex-1:last-child');
    botoesDiv.insertBefore(btnIA, saveBtn);

    btnIA.addEventListener('click', () => {
      // Llegir qui és l'alumne actual
      const title = document.getElementById('modalCommentsTitle');
      const nomRaw = title?.textContent?.replace('Comentaris:', '').trim() || '';
      _tcStudentName = nomRaw;
      _tcStudentId   = window.currentCommentStudentId || null;
      openTCFormulari();
    });

    console.log('✅ Botó IA injectat al modal de comentaris');
  };
  setTimeout(tryInject, 200);
}

// ============================================================
// OBSERVAR CAPÇALERA COMENTARIS PER INJECTAR BOTÓ EXPORTAR
// ============================================================
function observeCapcaleraComentaris() {
  const observer = new MutationObserver(() => {
    injectExportButton();
  });
  const thead = document.getElementById('notesThead');
  if (thead) {
    observer.observe(thead, { childList: true, subtree: true });
  } else {
    // Esperar que el thead existeixi
    const bodyObserver = new MutationObserver(() => {
      const t = document.getElementById('notesThead');
      if (t) {
        bodyObserver.disconnect();
        observer.observe(t, { childList: true, subtree: true });
        injectExportButton();
      }
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
}

function injectExportButton() {
  // Buscar la th de "Comentaris"
  const ths = document.querySelectorAll('#notesThead th');
  let commentsTh = null;
  ths.forEach(th => {
    if (th.textContent.trim() === 'Comentaris' && !th.querySelector('#btnExportComentaris')) {
      commentsTh = th;
    }
  });
  if (!commentsTh) return;

  const btn = document.createElement('button');
  btn.id = 'btnExportComentaris';
  btn.className = 'ml-2 text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded font-semibold';
  btn.innerHTML = '⬇ Excel';
  btn.title = 'Exportar tots els comentaris a Excel';
  btn.addEventListener('click', e => { e.stopPropagation(); exportarComentarisExcel(); });

  commentsTh.appendChild(btn);
  console.log('✅ Botó exportar comentaris injectat');
}

// ============================================================
// EXPORTAR COMENTARIS A EXCEL
// ============================================================
async function exportarComentarisExcel() {
  const classId = window.currentClassId;
  const db = _tcDB;
  if (!classId || !db) { alert('No hi ha cap classe seleccionada'); return; }

  try {
    // Obtenir alumnes de la classe
    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) { alert('Classe no trobada'); return; }
    const alumnesIds = classDoc.data().alumnes || [];

    if (alumnesIds.length === 0) { alert('No hi ha alumnes a la classe'); return; }

    // Obtenir dades dels alumnes
    const alumnesDocs = await Promise.all(
      alumnesIds.map(id => db.collection('alumnes').doc(id).get())
    );

    const files = [];
    alumnesDocs.forEach(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      const nom = data.nom || 'Desconegut';
      const comentari = data.comentarios?.[classId] || '';
      files.push([nom, comentari]);
    });

    if (!window.XLSX) { alert('La llibreria XLSX no està disponible'); return; }

    const wb = window.XLSX.utils.book_new();
    const wsData = [['Alumne', 'Comentari'], ...files];
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);

    // Amplada de columnes
    ws['!cols'] = [{ wch: 30 }, { wch: 100 }];

    // Estil capçalera (negreta)
    ['A1','B1'].forEach(cell => {
      if (ws[cell]) ws[cell].s = { font: { bold: true } };
    });

    window.XLSX.utils.book_append_sheet(wb, ws, 'Comentaris');

    // Nom del fitxer amb data
    const data = new Date();
    const dataStr = `${data.getFullYear()}${String(data.getMonth()+1).padStart(2,'0')}${String(data.getDate()).padStart(2,'0')}`;
    window.XLSX.writeFile(wb, `comentaris_${dataStr}.xlsx`);

    console.log('✅ Comentaris exportats');
  } catch(e) {
    console.error('Error exportant comentaris:', e);
    alert('Error exportant: ' + e.message);
  }
}

// ============================================================
// OBRIR FORMULARI CLON DE TUTORIA (AMB GUARDAR A L'ALUMNE)
// ============================================================
async function openTCFormulari() {
  document.getElementById('tcFormulariModal')?.remove();
  await tcCarregarConfig();

  const modal = document.createElement('div');
  modal.id = 'tcFormulariModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[10000] bg-black bg-opacity-60 p-4';
  modal.innerHTML = tcBuildFormulariHTML();
  document.body.appendChild(modal);
  tcInitFormulariInteractions(modal);
}

// ============================================================
// HTML DEL FORMULARI CLON
// ============================================================
function tcBuildFormulariHTML() {
  const nomAlumne = _tcStudentName || 'alumne/a';

  const esoOptions = [...(TC_ASSIGNATURES.eso), ...(_tcMateriesExtra.eso || [])].map(m =>
    `<label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-rose-50 px-2 py-1 rounded">
      <input type="checkbox" class="tc-assignatura-check w-4 h-4 accent-rose-500" value="${m}">
      <span>${m}</span>
    </label>`).join('');

  const batxOptions = [...(TC_ASSIGNATURES.batxillerat), ...(_tcMateriesExtra.batxillerat || [])].map(m =>
    `<label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-rose-50 px-2 py-1 rounded">
      <input type="checkbox" class="tc-assignatura-check w-4 h-4 accent-rose-500" value="${m}">
      <span>${m}</span>
    </label>`).join('');

  const apartatsHTML = _tcApartatsExtra.map(ap => `
    <div class="bg-violet-50 border border-violet-200 rounded-xl p-4">
      <label class="block text-sm font-bold text-violet-700 mb-3">🔧 ${ap.nom}</label>
      <div class="grid grid-cols-3 gap-2">
        ${ap.opcions.map(op => tcBuildOption(`tc_apartat_${ap.id}`, op.valor, op.label, op.color)).join('')}
      </div>
    </div>`).join('');

  return `
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">

    <!-- HEADER -->
    <div class="sticky top-0 bg-rose-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
      <div>
        <h2 class="text-xl font-bold">✨ Generar comentari per IA</h2>
        <p class="text-rose-100 text-sm">Comentari per a: <strong>${nomAlumne}</strong></p>
      </div>
      <button id="btnCloseTCFormulari" class="text-white hover:text-rose-200 text-3xl leading-none font-bold">✕</button>
    </div>

    <div class="p-6 space-y-6">

      <!-- NOM I GÈNERE -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">👤 Gènere de l'alumne/a</label>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-blue-300 hover:bg-blue-50 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500">
            <input type="radio" name="tc_genere" value="noi" checked class="sr-only">👦 Noi (El...)
          </label>
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-pink-300 hover:bg-pink-50 has-[:checked]:bg-pink-500 has-[:checked]:text-white has-[:checked]:border-pink-500">
            <input type="radio" name="tc_genere" value="noia" class="sr-only">👧 Noia (La...)
          </label>
        </div>
      </div>

      <!-- TRIMESTRE -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📅 Moment d'avaluació</label>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          ${tcBuildOption('tc_trimestre','1r trimestre','1r Trimestre','blue')}
          ${tcBuildOption('tc_trimestre','2n trimestre','2n Trimestre','blue')}
          ${tcBuildOption('tc_trimestre','3r trimestre','3r Trimestre','blue')}
          ${tcBuildOption('tc_trimestre','final de curs','Final de curs','blue')}
        </div>
      </div>

      <!-- CURS -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">📚 Nivell educatiu</label>
        <div class="flex gap-3 mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="tc_nivell" value="eso" checked class="accent-rose-500">
            <span class="font-semibold text-gray-700">ESO</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="tc_nivell" value="batxillerat" class="accent-rose-500">
            <span class="font-semibold text-gray-700">Batxillerat</span>
          </label>
        </div>
        <input id="tcCurs" type="text" placeholder="Ex: 3r ESO A / 1r Batxillerat"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm">
      </div>

      <!-- ASSIGNATURES SUSPESES -->
      <div class="bg-red-50 border border-red-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-bold text-red-700">❌ Assignatures suspeses</label>
          <button type="button" id="tcBtnDesmarcar" class="text-xs text-gray-500 hover:text-red-600 underline">Desmarcar tot</button>
        </div>
        <div class="flex gap-2 mb-3">
          <button type="button" id="tcTabESO" class="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white">ESO</button>
          <button type="button" id="tcTabBatx" class="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600">Batxillerat</button>
        </div>
        <div id="tcSuspesesESO" class="grid grid-cols-2 gap-1">${esoOptions}</div>
        <div id="tcSuspesesBatx" class="grid grid-cols-2 gap-1 hidden">${batxOptions}</div>
      </div>

      <!-- COMPORTAMENT -->
      <div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-orange-700 mb-3">🧠 Comportament a l'aula</label>
        <div class="grid grid-cols-3 gap-2">
          ${tcBuildOption('tc_comportament','excel·lent','⭐ Excel·lent','green')}
          ${tcBuildOption('tc_comportament','bo','✅ Bo','green')}
          ${tcBuildOption('tc_comportament','neutre','➖ Neutre','yellow')}
          ${tcBuildOption('tc_comportament','irregular','⚠️ Irregular','orange')}
          ${tcBuildOption('tc_comportament','dolent','❌ Dolent','red')}
          ${tcBuildOption('tc_comportament','disruptiu','🚨 Disruptiu','red')}
        </div>
      </div>

      <!-- ESFORÇ -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-3">💪 Esforç i treball</label>
        <div class="grid grid-cols-3 gap-2">
          ${tcBuildOption('tc_esforc','molt alt','🌟 Molt alt','green')}
          ${tcBuildOption('tc_esforc','alt','✅ Alt','green')}
          ${tcBuildOption('tc_esforc','adequat','➖ Adequat','yellow')}
          ${tcBuildOption('tc_esforc','baix','⚠️ Baix','orange')}
          ${tcBuildOption('tc_esforc','molt baix','❌ Molt baix','red')}
        </div>
      </div>

      <!-- TASQUES -->
      <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-purple-700 mb-3">📝 Lliurament de tasques</label>
        <div class="grid grid-cols-3 gap-2">
          ${tcBuildOption('tc_tasques','sempre','✅ Sempre lliura','green')}
          ${tcBuildOption('tc_tasques','gairebé sempre','🟡 Quasi sempre','yellow')}
          ${tcBuildOption('tc_tasques','a vegades','⚠️ A vegades','orange')}
          ${tcBuildOption('tc_tasques','rarament','❌ Rarament','red')}
          ${tcBuildOption('tc_tasques','mai','🚫 Mai lliura','red')}
        </div>
      </div>

      <!-- ASSISTÈNCIA -->
      <div class="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-teal-700 mb-3">📅 Assistència</label>
        <div class="grid grid-cols-2 gap-2">
          ${tcBuildOption('tc_assistencia','perfecta','✅ Perfecta','green')}
          ${tcBuildOption('tc_assistencia','bona','🟡 Bona','yellow')}
          ${tcBuildOption('tc_assistencia','irregular amb justificació','⚠️ Irregular (justificada)','orange')}
          ${tcBuildOption('tc_assistencia','moltes faltes sense justificar','❌ Moltes faltes injustificades','red')}
        </div>
      </div>

      <!-- ACTITUD -->
      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-indigo-700 mb-3">🤝 Actitud i participació</label>
        <div class="grid grid-cols-2 gap-2">
          ${tcBuildOption('tc_actitud','participa molt activament','🙋 Molt activa','green')}
          ${tcBuildOption('tc_actitud','participa adequadament','✅ Adequada','green')}
          ${tcBuildOption('tc_actitud','poc participativa','➖ Poc activa','yellow')}
          ${tcBuildOption('tc_actitud','passiva i desinteressada','⚠️ Passiva','orange')}
          ${tcBuildOption('tc_actitud','negativa i desmotivada','❌ Negativa','red')}
        </div>
      </div>

      <!-- APARTATS PERSONALITZATS -->
      ${apartatsHTML}

      <!-- PUNTS FORTS -->
      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-green-700 mb-2">🌟 Punts forts (opcional)</label>
        <textarea id="tcPuntsForts" placeholder="Ex: Molt creatiu/va, ajuda als companys..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none text-sm h-16 resize-none"></textarea>
      </div>

      <!-- RECOMANACIONS -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-2">💡 Recomanacions (opcional)</label>
        <textarea id="tcRecomanacions" placeholder="Ex: Classes particulars de matemàtiques, hàbit de lectura..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm h-16 resize-none"></textarea>
      </div>

      <!-- IDIOMA -->
      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">🌐 Idioma</label>
        <select id="tcIdioma" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm w-full">
          <option value="catala">Català</option>
          <option value="castella">Castellano</option>
        </select>
      </div>

      <!-- BOTÓ GENERAR -->
      <button id="tcBtnGenerar"
        class="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
        ✨ Generar comentari amb IA
      </button>

      <!-- RESULTAT -->
      <div id="tcResultat" class="hidden">
        <div class="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-rose-700 text-sm">💬 Comentari generat</h3>
            <div class="flex gap-2">
              <button id="tcBtnCopiar" class="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors">📋 Copiar</button>
              <button id="tcBtnGuardarAlumne" class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                💾 Guardar a l'alumne
              </button>
            </div>
          </div>
          <div id="tcComentariText" class="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border border-rose-100 min-h-[80px]"></div>
        </div>
        <button id="tcBtnRegenenar"
          class="w-full mt-3 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold py-2 rounded-xl text-sm transition-colors">
          🔄 Generar altra versió
        </button>
      </div>

    </div>
  </div>`;
}

function tcBuildOption(grup, valor, label, color) {
  const colors = {
    blue:   'border-blue-300 hover:bg-blue-100 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500',
    green:  'border-green-300 hover:bg-green-100 has-[:checked]:bg-green-500 has-[:checked]:text-white has-[:checked]:border-green-500',
    yellow: 'border-yellow-300 hover:bg-yellow-100 has-[:checked]:bg-yellow-400 has-[:checked]:text-white has-[:checked]:border-yellow-400',
    orange: 'border-orange-300 hover:bg-orange-100 has-[:checked]:bg-orange-500 has-[:checked]:text-white has-[:checked]:border-orange-500',
    red:    'border-red-300 hover:bg-red-100 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500',
    violet: 'border-violet-300 hover:bg-violet-100 has-[:checked]:bg-violet-500 has-[:checked]:text-white has-[:checked]:border-violet-500',
  };
  return `
    <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${colors[color]||colors.green}">
      <input type="radio" name="${grup}" value="${valor}" class="sr-only">${label}
    </label>`;
}

// ============================================================
// INTERACCIONS DEL FORMULARI CLON
// ============================================================
function tcInitFormulariInteractions(modal) {
  modal.querySelector('#btnCloseTCFormulari').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Pestanyes assignatures
  const tabESO  = modal.querySelector('#tcTabESO');
  const tabBatx = modal.querySelector('#tcTabBatx');
  const contESO  = modal.querySelector('#tcSuspesesESO');
  const contBatx = modal.querySelector('#tcSuspesesBatx');

  tabESO.addEventListener('click', () => {
    tabESO.className  = 'px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabBatx.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    contESO.classList.remove('hidden'); contBatx.classList.add('hidden');
  });
  tabBatx.addEventListener('click', () => {
    tabBatx.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabESO.className  = 'px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    contBatx.classList.remove('hidden'); contESO.classList.add('hidden');
  });

  modal.querySelector('#tcBtnDesmarcar').addEventListener('click', () => {
    modal.querySelectorAll('.tc-assignatura-check').forEach(c => c.checked = false);
  });

  // Generar
  modal.querySelector('#tcBtnGenerar').addEventListener('click', () => tcGenerar(modal));

  modal.addEventListener('click', e => {
    // Regenerar
    if (e.target.id === 'tcBtnRegenenar') tcGenerar(modal);

    // Copiar
    if (e.target.id === 'tcBtnCopiar') {
      const text = modal.querySelector('#tcComentariText').textContent;
      navigator.clipboard.writeText(text).then(() => {
        e.target.textContent = '✅ Copiat!';
        setTimeout(() => { e.target.textContent = '📋 Copiar'; }, 2000);
      });
    }

    // Guardar a l'alumne
    if (e.target.id === 'tcBtnGuardarAlumne') {
      tcGuardarAAlumne(modal);
    }
  });
}

// ============================================================
// RECOLLIR DADES DEL FORMULARI CLON
// ============================================================
function tcRecollidaDades(modal) {
  const nom    = _tcStudentName || 'l\'alumne/a';
  const curs   = modal.querySelector('#tcCurs').value.trim();
  const idioma = modal.querySelector('#tcIdioma').value;
  const puntsForts    = modal.querySelector('#tcPuntsForts').value.trim();
  const recomanacions = modal.querySelector('#tcRecomanacions').value.trim();
  const suspeses = [...modal.querySelectorAll('.tc-assignatura-check:checked')].map(c => c.value);

  const getVal = name => {
    const el = modal.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  };

  const genere  = getVal('tc_genere') || 'noi';
  const article = genere === 'noia' ? 'La' : 'El';

  const apartatsValors = _tcApartatsExtra.map(ap => ({
    nom: ap.nom,
    valor: getVal(`tc_apartat_${ap.id}`),
  })).filter(a => a.valor);

  return {
    nom, nomAmbArticle: `${article} ${nom}`,
    genere, article, curs, idioma,
    trimestre: getVal('tc_trimestre'),
    suspeses,
    comportament: getVal('tc_comportament'),
    esforc:       getVal('tc_esforc'),
    tasques:      getVal('tc_tasques'),
    assistencia:  getVal('tc_assistencia'),
    actitud:      getVal('tc_actitud'),
    puntsForts, recomanacions, apartatsValors,
  };
}

// ============================================================
// CONSTRUIR PROMPT (idèntic al de tutoria.js)
// ============================================================
function tcBuildPrompt(d) {
  const suspesesTxt = d.suspeses.length > 0
    ? `Assignatures suspeses: ${d.suspeses.join(', ')}.`
    : 'No té cap assignatura suspesa.';

  const camp = (label, val) => val ? `- ${label}: ${val}` : '';

  const neg = [
    d.comportament === 'dolent' || d.comportament === 'disruptiu',
    d.esforc === 'baix' || d.esforc === 'molt baix',
    d.tasques === 'rarament' || d.tasques === 'mai',
    d.assistencia === 'moltes faltes sense justificar',
    d.actitud === 'passiva i desinteressada' || d.actitud === 'negativa i desmotivada',
  ].filter(Boolean).length;

  const greu = neg >= 3 || (d.suspeses.length > 0 && neg >= 2);

  const context = [
    `Nom: ${d.nom} (usar "${d.nomAmbArticle}")`,
    `Gènere: ${d.genere}`,
    d.trimestre ? `Moment d'avaluació: ${d.trimestre}.` : '',
    d.curs ? `Curs: ${d.curs}` : '',
    suspesesTxt,
    camp('Comportament', d.comportament),
    camp('Esforç', d.esforc),
    camp('Tasques', d.tasques),
    camp('Assistència', d.assistencia),
    camp('Actitud', d.actitud),
    ...d.apartatsValors.map(a => camp(a.nom, a.valor)),
    camp('Punts forts', d.puntsForts),
    camp('Recomanacions', d.recomanacions),
  ].filter(Boolean).join('\n');

  const idioma = d.idioma === 'castella'
    ? `Escriu en castellano. Usa "${d.article === 'El' ? 'El' : 'La'} ${d.nom}" i pronoms él/ella.`
    : `Escriu en català. Usa "${d.nomAmbArticle}" i pronoms ell/ella.`;

  const trCtx = d.trimestre
    ? `És el ${d.trimestre}: ${d.trimestre === 'final de curs' ? 'reflexiona sobre tot el curs' : 'anima a millorar de cara als propers trimestres'}.`
    : '';

  return `Ets un tutor/a escolar que escriu comentaris per al butlletí de notes.

DADES:
${context}

INSTRUCCIONS:
- ${idioma}
- Comença SEMPRE amb "${d.nomAmbArticle}" (mai amb "Estimada família").
- El comentari és sobre l'alumne/a, no adreçat a la família.
- Entre 80 i 150 paraules. Paràgrafs fluids, sense llistes.
- No mencions notes numèriques.
- ${trCtx}
- ${greu ? 'Situació preocupant: sigues honest/a, menciona les mancances clarament però de forma constructiva.' : 'Menciona els aspectes a millorar com a reptes, no com a fracassos.'}
- Si hi ha assignatures suspeses, menciona-les i explica les carències.
- Si hi ha apartats personalitzats, integra\'ls naturalment.
- Si hi ha recomanacions, inclou-les de forma natural.
- Acaba amb encoratjament genuí.

Escriu NOMÉS el comentari final, sense títol ni explicació.`;
}

// ============================================================
// GENERAR COMENTARI
// ============================================================
async function tcGenerar(modal) {
  const dades = tcRecollidaDades(modal);
  const btnGen    = modal.querySelector('#tcBtnGenerar');
  const resultat  = modal.querySelector('#tcResultat');
  const textDiv   = modal.querySelector('#tcComentariText');

  btnGen.disabled = true;
  btnGen.innerHTML = '⏳ Generant...';
  resultat.classList.remove('hidden');
  textDiv.innerHTML = '<span class="text-gray-400 italic">La IA està escrivint el comentari...</span>';

  // Amagar el botó guardar fins que hi hagi resultat
  modal.querySelector('#tcBtnGuardarAlumne').classList.add('hidden');

  try {
    const res = await fetch('/api/tutoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: tcBuildPrompt(dades) }),
    });
    if (!res.ok) throw new Error(`Error API: ${res.status}`);
    const data = await res.json();
    const text = data.text || 'No s\'ha pogut generar el comentari.';
    textDiv.textContent = text;
    resultat.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Mostrar botó guardar
    modal.querySelector('#tcBtnGuardarAlumne').classList.remove('hidden');
  } catch(err) {
    console.error('Error:', err);
    textDiv.innerHTML = `<span class="text-red-500">❌ Error: ${err.message}</span>`;
  } finally {
    btnGen.disabled = false;
    btnGen.innerHTML = '✨ Generar comentari amb IA';
  }
}

// ============================================================
// GUARDAR COMENTARI A L'ALUMNE
// ============================================================
async function tcGuardarAAlumne(modal) {
  const text = modal.querySelector('#tcComentariText').textContent;
  if (!text || text.startsWith('❌') || text.includes('La IA està escrivint')) return;

  const studentId = _tcStudentId || window.currentCommentStudentId;
  const classId   = window.currentClassId;

  if (!studentId || !classId || !_tcDB) {
    alert('Error: no es pot identificar l\'alumne o la classe');
    return;
  }

  try {
    // 1. Guardar a Firestore
    await _tcDB.collection('alumnes').doc(studentId).update({
      [`comentarios.${classId}`]: text,
    });

    // 2. Posar el text al textarea del modal de comentaris
    const textarea = document.getElementById('commentTextarea');
    if (textarea) {
      textarea.value = text;
      // Disparar event per actualitzar el comptador de caràcters
      textarea.dispatchEvent(new Event('input'));
    }

    // 3. Feedback visual
    const btn = modal.querySelector('#tcBtnGuardarAlumne');
    btn.textContent = '✅ Guardat!';
    btn.className = btn.className.replace('bg-green-500 hover:bg-green-600', 'bg-gray-400');
    btn.disabled = true;

    // 4. Tancar el formulari i refrescar la graella
    setTimeout(() => {
      modal.remove();
      // Refrescar graella si la funció existeix
      if (typeof window.renderNotesGrid === 'function') {
        window.renderNotesGrid();
      }
    }, 800);

  } catch(e) {
    console.error('Error guardant:', e);
    alert('Error guardant el comentari: ' + e.message);
  }
}
