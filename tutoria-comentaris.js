// tutoria-comentaris.js v2 — net
// 1. Botó "✨ Generar per IA" al modal de comentaris
// 2. Formulari clon amb "💾 Guardar a l'alumne"
// 3. Exportar Excel des de la capçalera Comentaris

console.log('✅ tutoria-comentaris.js v2 carregat');

// ============================================================
// ESTAT GLOBAL
// ============================================================
let _tcUID  = null;
let _tcDB   = null;
let _tcMateriesExtra = { eso: [], batxillerat: [] };
let _tcApartatsExtra = [];

// IDs capturats en el moment d'obrir el modal
let _tcStudentId   = null;
let _tcStudentName = null;
let _tcClassId     = null;

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

// ============================================================
// INICIALITZACIÓ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(tcInit, 1000);
});

function tcInit() {
  // Auth
  const tryAuth = () => {
    const auth = window.firebase?.auth?.();
    if (!auth) { setTimeout(tryAuth, 500); return; }
    auth.onAuthStateChanged(user => {
      if (user) { _tcUID = user.uid; _tcDB = window.firebase.firestore(); }
    });
  };
  tryAuth();

  // Interceptar openCommentsModal per capturar studentId i classId
  interceptarOpenCommentsModal();

  // Capturar classId quan es fa click a una targeta de classe
  interceptarClickClasse();

  // Injectar botó exportar a la capçalera
  observeCapcaleraComentaris();
}

// ============================================================
// CAPTURAR classId VIA CLICK A TARGETA DE CLASSE
// El grid té cards amb card.dataset.id = classId (app.js línia 485)
// ============================================================
function interceptarClickClasse() {
  // Escolta a nivell document per capturar qualsevol click a targetes
  document.addEventListener('click', e => {
    const card = e.target.closest('#classesGrid [data-id]');
    if (card?.dataset?.id) {
      _tcClassId = card.dataset.id;
      console.log('✅ tc classId capturat:', _tcClassId);
    }
  }, true); // capture phase per capturar-ho abans que openClass ho processi
}

// ============================================================
// INTERCEPTAR openCommentsModal (és window — app.js línia 32)
// ============================================================
function interceptarOpenCommentsModal() {
  const tryIntercept = () => {
    if (!window.openCommentsModal) { setTimeout(tryIntercept, 300); return; }

    const original = window.openCommentsModal;
    window.openCommentsModal = function(studentId, studentName, currentComment) {
      // Capturar SEMPRE que s'obre el modal
      _tcStudentId   = studentId;
      _tcStudentName = studentName;
      // _tcClassId ja s'ha capturat via el click a la targeta

      // Cridar original
      original.apply(this, arguments);

      // Injectar botó IA al modal (amb delay per assegurar que el DOM existeix)
      setTimeout(() => injectarBotoIA(), 100);
    };
    console.log('✅ openCommentsModal interceptat');
  };
  setTimeout(tryIntercept, 500);
}

// ============================================================
// INJECTAR BOTÓ "✨ Generar per IA" AL MODAL DE COMENTARIS
// ============================================================
function injectarBotoIA() {
  const modal = document.getElementById('modalComments');
  if (!modal) return;
  if (modal.querySelector('#tcBtnGenerarIA')) return; // ja injectat

  const botoesDiv = modal.querySelector('.flex.gap-2');
  if (!botoesDiv) return;

  const btn = document.createElement('button');
  btn.id = 'tcBtnGenerarIA';
  btn.className = 'flex-1 px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-semibold cursor-pointer border-none text-sm';
  btn.innerHTML = '✨ Generar per IA';

  // Inserir entre Cancel·lar (1r) i Guardar (2n)
  const saveBtn = botoesDiv.querySelector('button:last-child');
  botoesDiv.insertBefore(btn, saveBtn);

  btn.addEventListener('click', async () => {
    console.log('🔍 Obrint formulari - studentId:', _tcStudentId, 'classId:', _tcClassId, 'nom:', _tcStudentName);
    await openTCFormulari();
  });
}

// ============================================================
// INJECTAR BOTÓ EXPORTAR A LA CAPÇALERA "Comentaris"
// ============================================================
function observeCapcaleraComentaris() {
  const injectar = () => {
    document.querySelectorAll('#notesThead th').forEach(th => {
      if (th.textContent.trim() === 'Comentaris' && !th.querySelector('#btnExportComentaris')) {
        const btn = document.createElement('button');
        btn.id = 'btnExportComentaris';
        btn.className = 'ml-2 text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded font-semibold';
        btn.innerHTML = '⬇ Excel';
        btn.title = 'Exportar tots els comentaris a Excel';
        btn.addEventListener('click', e => { e.stopPropagation(); exportarComentarisExcel(); });
        th.appendChild(btn);
        console.log('✅ Botó exportar injectat');
      }
    });
  };

  const thead = document.getElementById('notesThead');
  if (thead) {
    new MutationObserver(injectar).observe(thead, { childList: true, subtree: true });
  }
  new MutationObserver(() => {
    const t = document.getElementById('notesThead');
    if (t) injectar();
  }).observe(document.body, { childList: true, subtree: false });
}

// ============================================================
// EXPORTAR COMENTARIS A EXCEL
// ============================================================
async function exportarComentarisExcel() {
  const classId = _tcClassId;
  if (!classId || !_tcDB) { alert('Selecciona una classe primer'); return; }

  try {
    const classDoc = await _tcDB.collection('classes').doc(classId).get();
    if (!classDoc.exists) { alert('Classe no trobada'); return; }
    const alumnesIds = classDoc.data().alumnes || [];
    if (alumnesIds.length === 0) { alert('No hi ha alumnes'); return; }

    const docs = await Promise.all(alumnesIds.map(id => _tcDB.collection('alumnes').doc(id).get()));
    const files = docs
      .filter(d => d.exists)
      .map(d => {
        const data = d.data();
        return [data.nom || 'Desconegut', data.comentarios?.[classId] || ''];
      });

    if (!window.XLSX) { alert('La llibreria XLSX no està disponible'); return; }
    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet([['Alumne', 'Comentari'], ...files]);
    ws['!cols'] = [{ wch: 30 }, { wch: 100 }];
    window.XLSX.utils.book_append_sheet(wb, ws, 'Comentaris');
    const avui = new Date();
    const data = `${avui.getFullYear()}${String(avui.getMonth()+1).padStart(2,'0')}${String(avui.getDate()).padStart(2,'0')}`;
    window.XLSX.writeFile(wb, `comentaris_${data}.xlsx`);
  } catch(e) {
    console.error('Error exportant:', e);
    alert('Error: ' + e.message);
  }
}

// ============================================================
// CARREGAR / GUARDAR CONFIG FIRESTORE
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
  } catch(e) { console.warn('tc: error carregant config', e); }
}

// ============================================================
// OBRIR FORMULARI CLON
// ============================================================
async function openTCFormulari() {
  document.getElementById('tcFormulariModal')?.remove();
  await tcCarregarConfig();

  const modal = document.createElement('div');
  modal.id = 'tcFormulariModal';
  modal.className = 'fixed inset-0 flex items-center justify-center z-[10000] bg-black bg-opacity-60 p-4';
  modal.innerHTML = tcBuildHTML();
  document.body.appendChild(modal);
  tcInitInteraccions(modal);
}

// ============================================================
// HTML DEL FORMULARI
// ============================================================
function tcBuildHTML() {
  const nom = _tcStudentName || 'alumne/a';

  const mkCheckboxes = nivell => {
    const base  = TC_ASSIGNATURES[nivell] || [];
    const extra = _tcMateriesExtra[nivell] || [];
    return [...base, ...extra].map(m => `
      <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-rose-50 px-2 py-1 rounded">
        <input type="checkbox" class="tc-check w-4 h-4 accent-rose-500" value="${m}">
        <span>${m}</span>
      </label>`).join('');
  };

  const apartatsHTML = _tcApartatsExtra.map(ap => `
    <div class="bg-violet-50 border border-violet-200 rounded-xl p-4">
      <label class="block text-sm font-bold text-violet-700 mb-3">🔧 ${ap.nom}</label>
      <div class="grid grid-cols-3 gap-2">
        ${ap.opcions.map(op => tcOpcio(`tc_ap_${ap.id}`, op.valor, op.label, op.color)).join('')}
      </div>
    </div>`).join('');

  return `
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
    <div class="sticky top-0 bg-rose-500 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
      <div>
        <h2 class="text-xl font-bold">✨ Generar comentari per IA</h2>
        <p class="text-rose-100 text-sm">Alumne/a: <strong>${nom}</strong></p>
      </div>
      <button id="tcBtnTancar" class="text-white hover:text-rose-200 text-3xl font-bold leading-none">✕</button>
    </div>

    <div class="p-6 space-y-6">

      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">👤 Gènere</label>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-blue-300 hover:bg-blue-50 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500">
            <input type="radio" name="tc_genere" value="noi" checked class="sr-only">👦 Noi (El...)
          </label>
          <label class="flex items-center gap-2 cursor-pointer border-2 rounded-lg px-3 py-2 flex-1 justify-center font-semibold text-sm transition-all border-pink-300 hover:bg-pink-50 has-[:checked]:bg-pink-500 has-[:checked]:text-white has-[:checked]:border-pink-500">
            <input type="radio" name="tc_genere" value="noia" class="sr-only">👧 Noia (La...)
          </label>
        </div>
      </div>

      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📅 Moment d'avaluació</label>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          ${tcOpcio('tc_trim','1r trimestre','1r Trimestre','blue')}
          ${tcOpcio('tc_trim','2n trimestre','2n Trimestre','blue')}
          ${tcOpcio('tc_trim','3r trimestre','3r Trimestre','blue')}
          ${tcOpcio('tc_trim','final de curs','Final de curs','blue')}
        </div>
      </div>

      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">📚 Nivell</label>
        <div class="flex gap-4 mb-3">
          <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="tc_nivell" value="eso" checked class="accent-rose-500"><span class="font-semibold">ESO</span></label>
          <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="tc_nivell" value="batxillerat" class="accent-rose-500"><span class="font-semibold">Batxillerat</span></label>
        </div>
        <input id="tcCurs" type="text" placeholder="Ex: 3r ESO A"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-400 focus:outline-none text-sm">
      </div>

      <div class="bg-red-50 border border-red-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-bold text-red-700">❌ Assignatures suspeses</label>
          <button type="button" id="tcDesmarcar" class="text-xs text-gray-400 hover:text-red-600 underline">Desmarcar tot</button>
        </div>
        <div class="flex gap-2 mb-3">
          <button type="button" id="tcTabESO"  class="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white">ESO</button>
          <button type="button" id="tcTabBatx" class="px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600">Batxillerat</button>
        </div>
        <div id="tcContESO"  class="grid grid-cols-2 gap-1">${mkCheckboxes('eso')}</div>
        <div id="tcContBatx" class="grid grid-cols-2 gap-1 hidden">${mkCheckboxes('batxillerat')}</div>
      </div>

      <div class="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-orange-700 mb-3">🧠 Comportament</label>
        <div class="grid grid-cols-3 gap-2">
          ${tcOpcio('tc_comp','excel·lent','⭐ Excel·lent','green')}${tcOpcio('tc_comp','bo','✅ Bo','green')}
          ${tcOpcio('tc_comp','neutre','➖ Neutre','yellow')}${tcOpcio('tc_comp','irregular','⚠️ Irregular','orange')}
          ${tcOpcio('tc_comp','dolent','❌ Dolent','red')}${tcOpcio('tc_comp','disruptiu','🚨 Disruptiu','red')}
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-3">💪 Esforç</label>
        <div class="grid grid-cols-3 gap-2">
          ${tcOpcio('tc_esf','molt alt','🌟 Molt alt','green')}${tcOpcio('tc_esf','alt','✅ Alt','green')}
          ${tcOpcio('tc_esf','adequat','➖ Adequat','yellow')}${tcOpcio('tc_esf','baix','⚠️ Baix','orange')}
          ${tcOpcio('tc_esf','molt baix','❌ Molt baix','red')}
        </div>
      </div>

      <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-purple-700 mb-3">📝 Tasques</label>
        <div class="grid grid-cols-3 gap-2">
          ${tcOpcio('tc_tas','sempre','✅ Sempre','green')}${tcOpcio('tc_tas','gairebé sempre','🟡 Quasi sempre','yellow')}
          ${tcOpcio('tc_tas','a vegades','⚠️ A vegades','orange')}${tcOpcio('tc_tas','rarament','❌ Rarament','red')}
          ${tcOpcio('tc_tas','mai','🚫 Mai','red')}
        </div>
      </div>

      <div class="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-teal-700 mb-3">📅 Assistència</label>
        <div class="grid grid-cols-2 gap-2">
          ${tcOpcio('tc_ass','perfecta','✅ Perfecta','green')}${tcOpcio('tc_ass','bona','🟡 Bona','yellow')}
          ${tcOpcio('tc_ass','irregular amb justificació','⚠️ Irregular (justificada)','orange')}
          ${tcOpcio('tc_ass','moltes faltes sense justificar','❌ Moltes faltes injustificades','red')}
        </div>
      </div>

      <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-indigo-700 mb-3">🤝 Actitud</label>
        <div class="grid grid-cols-2 gap-2">
          ${tcOpcio('tc_act','participa molt activament','🙋 Molt activa','green')}
          ${tcOpcio('tc_act','participa adequadament','✅ Adequada','green')}
          ${tcOpcio('tc_act','poc participativa','➖ Poc activa','yellow')}
          ${tcOpcio('tc_act','passiva i desinteressada','⚠️ Passiva','orange')}
          ${tcOpcio('tc_act','negativa i desmotivada','❌ Negativa','red')}
        </div>
      </div>

      ${apartatsHTML}

      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-green-700 mb-2">🌟 Punts forts (opcional)</label>
        <textarea id="tcPuntsForts" placeholder="Ex: Molt creatiu/va, ajuda als companys..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none text-sm h-16 resize-none"></textarea>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <label class="block text-sm font-bold text-blue-700 mb-2">💡 Recomanacions (opcional)</label>
        <textarea id="tcRecomanacions" placeholder="Ex: Classes particulars de matemàtiques..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm h-16 resize-none"></textarea>
      </div>

      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-3">📏 Llargada del comentari</label>
        <div class="grid grid-cols-3 gap-2">
          <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 justify-center text-xs font-semibold transition-all border-gray-300 hover:bg-gray-100 has-[:checked]:bg-gray-700 has-[:checked]:text-white has-[:checked]:border-gray-700">
            <input type="radio" name="tc_llarg" value="curt" class="sr-only">📝 Curt<br><span class="font-normal opacity-75">(50-80 p.)</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 justify-center text-xs font-semibold transition-all border-indigo-300 hover:bg-indigo-50 has-[:checked]:bg-indigo-500 has-[:checked]:text-white has-[:checked]:border-indigo-500">
            <input type="radio" name="tc_llarg" value="mitja" checked class="sr-only">📄 Mitjà<br><span class="font-normal opacity-75">(80-150 p.)</span>
          </label>
          <label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-2 justify-center text-xs font-semibold transition-all border-violet-300 hover:bg-violet-50 has-[:checked]:bg-violet-500 has-[:checked]:text-white has-[:checked]:border-violet-500">
            <input type="radio" name="tc_llarg" value="llarg" class="sr-only">📃 Llarg<br><span class="font-normal opacity-75">(150-250 p.)</span>
          </label>
        </div>
      </div>

      <div class="bg-gray-50 rounded-xl p-4">
        <label class="block text-sm font-bold text-gray-700 mb-2">🌐 Idioma</label>
        <select id="tcIdioma" class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full">
          <option value="catala">Català</option>
          <option value="castella">Castellano</option>
        </select>
      </div>

      <button id="tcBtnGenerar" class="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
        ✨ Generar comentari amb IA
      </button>

      <div id="tcResultat" class="hidden">
        <div class="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-rose-700 text-sm">💬 Comentari generat</h3>
            <div class="flex gap-2">
              <button id="tcBtnCopiar" class="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg">📋 Copiar</button>
              <button id="tcBtnGuardar" class="hidden text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">💾 Guardar a l'alumne</button>
            </div>
          </div>
          <div id="tcText" class="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border border-rose-100 min-h-[80px]"></div>
        </div>
        <button id="tcBtnRegen" class="w-full mt-3 border-2 border-rose-300 text-rose-600 hover:bg-rose-50 font-semibold py-2 rounded-xl text-sm transition-colors">
          🔄 Generar altra versió
        </button>
      </div>

    </div>
  </div>`;
}

function tcOpcio(grup, valor, label, color) {
  const cls = {
    blue:   'border-blue-300 hover:bg-blue-100 has-[:checked]:bg-blue-500 has-[:checked]:text-white has-[:checked]:border-blue-500',
    green:  'border-green-300 hover:bg-green-100 has-[:checked]:bg-green-500 has-[:checked]:text-white has-[:checked]:border-green-500',
    yellow: 'border-yellow-300 hover:bg-yellow-100 has-[:checked]:bg-yellow-400 has-[:checked]:text-white has-[:checked]:border-yellow-400',
    orange: 'border-orange-300 hover:bg-orange-100 has-[:checked]:bg-orange-500 has-[:checked]:text-white has-[:checked]:border-orange-500',
    red:    'border-red-300 hover:bg-red-100 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500',
    violet: 'border-violet-300 hover:bg-violet-100 has-[:checked]:bg-violet-500 has-[:checked]:text-white has-[:checked]:border-violet-500',
  };
  return `<label class="flex items-center gap-1 cursor-pointer border-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${cls[color]||cls.green}">
    <input type="radio" name="${grup}" value="${valor}" class="sr-only">${label}</label>`;
}

// ============================================================
// INTERACCIONS DEL FORMULARI
// ============================================================
function tcInitInteraccions(modal) {
  modal.querySelector('#tcBtnTancar').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const tabESO  = modal.querySelector('#tcTabESO');
  const tabBatx = modal.querySelector('#tcTabBatx');
  const cESO    = modal.querySelector('#tcContESO');
  const cBatx   = modal.querySelector('#tcContBatx');

  tabESO.addEventListener('click', () => {
    tabESO.className  = 'px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabBatx.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    cESO.classList.remove('hidden'); cBatx.classList.add('hidden');
  });
  tabBatx.addEventListener('click', () => {
    tabBatx.className = 'px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white';
    tabESO.className  = 'px-3 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600';
    cBatx.classList.remove('hidden'); cESO.classList.add('hidden');
  });

  modal.querySelector('#tcDesmarcar').addEventListener('click', () => {
    modal.querySelectorAll('.tc-check').forEach(c => c.checked = false);
  });

  modal.querySelector('#tcBtnGenerar').addEventListener('click', () => tcGenerar(modal));

  modal.addEventListener('click', e => {
    if (e.target.id === 'tcBtnRegen')    tcGenerar(modal);
    if (e.target.id === 'tcBtnCopiar')   tcCopiar(modal, e.target);
    if (e.target.id === 'tcBtnGuardar')  tcGuardar(modal, e.target);
  });
}

// ============================================================
// RECOLLIR DADES
// ============================================================
function tcDades(modal) {
  const g = (n) => { const el = modal.querySelector(`input[name="${n}"]:checked`); return el?.value || null; };
  const genere  = g('tc_genere') || 'noi';
  const article = genere === 'noia' ? 'La' : 'El';
  const nom     = _tcStudentName || 'alumne/a';
  return {
    nom, nomAmbArticle: `${article} ${nom}`, genere, article,
    curs:      modal.querySelector('#tcCurs').value.trim(),
    idioma:    modal.querySelector('#tcIdioma').value,
    llargada:  modal.querySelector('input[name="tc_llarg"]:checked')?.value || 'mitja',
    trimestre: g('tc_trim'),
    suspeses:  [...modal.querySelectorAll('.tc-check:checked')].map(c => c.value),
    comportament: g('tc_comp'),
    esforc:       g('tc_esf'),
    tasques:      g('tc_tas'),
    assistencia:  g('tc_ass'),
    actitud:      g('tc_act'),
    puntsForts:    modal.querySelector('#tcPuntsForts').value.trim(),
    recomanacions: modal.querySelector('#tcRecomanacions').value.trim(),
    apartats: _tcApartatsExtra.map(ap => ({ nom: ap.nom, valor: g(`tc_ap_${ap.id}`) })).filter(a => a.valor),
  };
}

// ============================================================
// CONSTRUIR PROMPT
// ============================================================
function tcPrompt(d) {
  const c = (l, v) => v ? `- ${l}: ${v}` : '';
  const neg = [
    d.comportament === 'dolent' || d.comportament === 'disruptiu',
    d.esforc === 'baix' || d.esforc === 'molt baix',
    d.tasques === 'rarament' || d.tasques === 'mai',
    d.assistencia === 'moltes faltes sense justificar',
    d.actitud === 'passiva i desinteressada' || d.actitud === 'negativa i desmotivada',
  ].filter(Boolean).length;
  const greu = neg >= 3 || (d.suspeses.length > 0 && neg >= 2);

  const ctx = [
    `Nom: ${d.nom} (usar "${d.nomAmbArticle}")`, `Gènere: ${d.genere}`,
    d.trimestre ? `Avaluació: ${d.trimestre}` : '',
    d.curs ? `Curs: ${d.curs}` : '',
    d.suspeses.length ? `Suspeses: ${d.suspeses.join(', ')}` : 'Cap suspesa',
    c('Comportament', d.comportament), c('Esforç', d.esforc),
    c('Tasques', d.tasques), c('Assistència', d.assistencia), c('Actitud', d.actitud),
    ...d.apartats.map(a => c(a.nom, a.valor)),
    c('Punts forts', d.puntsForts), c('Recomanacions', d.recomanacions),
  ].filter(Boolean).join('\n');

  const idioma = d.idioma === 'castella'
    ? `Escriu en castellano. Usa "${d.nomAmbArticle}" i pronoms él/ella.`
    : `Escriu en català. Usa "${d.nomAmbArticle}" i pronoms ell/ella.`;

  return `Ets un tutor/a que escriu comentaris per al butlletí de notes.

DADES:
${ctx}

INSTRUCCIONS:
- ${idioma}
- Comença SEMPRE amb "${d.nomAmbArticle}". Mai amb "Estimada família".
- ${d.llargada === 'curt' ? '50-80 paraules (molt concís)' : d.llargada === 'llarg' ? '150-250 paraules (desenvolupat)' : '80-150 paraules'}. Paràgrafs fluids, sense llistes, sense notes numèriques.
- ${d.trimestre === 'final de curs' ? 'Reflexiona sobre tot el curs.' : d.trimestre ? `Anima a millorar de cara als propers trimestres.` : ''}
- ${greu ? 'Sigues honest/a: menciona les mancances clarament però de forma constructiva.' : 'Tracta els aspectes a millorar com a reptes.'}
- Si hi ha suspeses, menciona-les i explica les carències concretes.
- Integra recomanacions i apartats personalitzats de forma natural.
- Acaba amb encoratjament genuí. Usa concordança de gènere correcta.

Escriu NOMÉS el comentari final.`;
}

// ============================================================
// GENERAR
// ============================================================
async function tcGenerar(modal) {
  const dades   = tcDades(modal);
  const btnGen  = modal.querySelector('#tcBtnGenerar');
  const resultat = modal.querySelector('#tcResultat');
  const textDiv  = modal.querySelector('#tcText');
  const btnGu   = modal.querySelector('#tcBtnGuardar');

  btnGen.disabled = true;
  btnGen.innerHTML = '⏳ Generant...';
  resultat.classList.remove('hidden');
  btnGu.classList.add('hidden');
  textDiv.innerHTML = '<span class="text-gray-400 italic">La IA està escrivint...</span>';

  try {
    const res = await fetch('/api/tutoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: tcPrompt(dades) }),
    });
    if (!res.ok) throw new Error(`Error API: ${res.status}`);
    const data = await res.json();
    textDiv.textContent = data.text || 'No s\'ha pogut generar.';
    resultat.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    btnGu.classList.remove('hidden');
  } catch(e) {
    textDiv.innerHTML = `<span class="text-red-500">❌ ${e.message}</span>`;
  } finally {
    btnGen.disabled = false;
    btnGen.innerHTML = '✨ Generar comentari amb IA';
  }
}

// ============================================================
// COPIAR
// ============================================================
function tcCopiar(modal, btn) {
  const text = modal.querySelector('#tcText').textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Copiat!';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
  });
}

// ============================================================
// GUARDAR A L'ALUMNE
// ============================================================
async function tcGuardar(modal, btn) {
  const text = modal.querySelector('#tcText').textContent;
  if (!text || text.startsWith('❌') || text.includes('La IA està')) return;

  console.log('💾 Guardar - studentId:', _tcStudentId, 'classId:', _tcClassId, 'db:', !!_tcDB);

  if (!_tcStudentId || !_tcClassId || !_tcDB) {
    alert(`Error: no es pot identificar l'alumne o la classe.\nstudentId: ${_tcStudentId}\nclassId: ${_tcClassId}`);
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = '⏳ Guardant...';

    await _tcDB.collection('alumnes').doc(_tcStudentId).update({
      [`comentarios.${_tcClassId}`]: text,
    });

    // Posar el text al textarea del modal de comentaris
    const textarea = document.getElementById('commentTextarea');
    if (textarea) {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input'));
    }

    btn.textContent = '✅ Guardat!';
    btn.className = btn.className.replace('bg-green-500 hover:bg-green-600', 'bg-gray-400');

    // Tancar i refrescar
    setTimeout(() => {
      modal.remove();
      if (typeof window.renderNotesGrid === 'function') window.renderNotesGrid();
    }, 700);

  } catch(e) {
    console.error('Error guardant:', e);
    btn.disabled = false;
    btn.textContent = '💾 Guardar a l\'alumne';
    alert('Error guardant: ' + e.message);
  }
}
