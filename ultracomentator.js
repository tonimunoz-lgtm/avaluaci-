// ultracomentator.js — Injector: Gestor visual de plantilles de comentaris per ítems
// Transforma el botó "📋 Tutoria" en un desplegable amb "Comentari IA" i "Ultracomentator"

console.log('⚡ ultracomentator.js carregat');

// ============================================================
// ESPERAR QUE tutoria.js HAGI INJECTAT EL BOTÓ
// ============================================================
function initUltracomentator() {
  const btn = document.getElementById('btnTutoria');
  if (!btn) { setTimeout(initUltracomentator, 600); return; }
  transformarBotoTutoria(btn);
}

// ============================================================
// TRANSFORMAR BOTÓ SIMPLE → DESPLEGABLE (un clic = menú)
// Igual que el botó ⋮ verd de l'app
// ============================================================
function transformarBotoTutoria(originalBtn) {
  if (document.getElementById('btnTutoriaWrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'btnTutoriaWrapper';
  wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;';

  // Un sol botó — un clic obre el menú (com el ⋮ verd)
  const btnMain = document.createElement('button');
  btnMain.id = 'btnTutoriaMain';
  btnMain.className = originalBtn.className;
  btnMain.innerHTML = '📋 Tutoria ▾';
  btnMain.title = 'Opcions de tutoria';

  // Menú desplegable
  const menu = document.createElement('div');
  menu.id = 'tutoriaDropdownMenu';
  menu.className = 'hidden';
  menu.style.cssText = `
    position:absolute;top:calc(100% + 4px);left:0;min-width:210px;
    background:#fff;border:1px solid #e5e7eb;border-radius:8px;
    box-shadow:0 8px 24px rgba(0,0,0,0.13);z-index:9999;overflow:hidden;
  `;
  menu.innerHTML = `
    <div style="padding:4px 0;">
      <button id="ucOptIA" style="width:100%;text-align:left;padding:10px 16px;background:none;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:10px;color:#374151;font-family:inherit;">
        <span style="font-size:16px;">🤖</span>
        <div>
          <div style="font-weight:600;">Comentari IA</div>
          <div style="font-size:12px;color:#6b7280;">Genera comentari de tutoria</div>
        </div>
      </button>
      <div style="height:1px;background:#f3f4f6;"></div>
      <button id="ucOptUltra" style="width:100%;text-align:left;padding:10px 16px;background:none;border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:10px;color:#374151;font-family:inherit;">
        <span style="font-size:16px;">⚡</span>
        <div>
          <div style="font-weight:600;color:#7c3aed;">Ultracomentator</div>
          <div style="font-size:12px;color:#6b7280;">Plantilles de comentaris per ítems</div>
        </div>
      </button>
    </div>
  `;

  // Amagar el botó original
  originalBtn.id = 'btnTutoria_hidden';
  originalBtn.style.display = 'none';
  originalBtn.parentNode.insertBefore(wrapper, originalBtn);
  wrapper.appendChild(originalBtn);
  wrapper.appendChild(btnMain);
  wrapper.appendChild(menu);

  // Hover effects
  menu.querySelectorAll('button').forEach(b => {
    b.addEventListener('mouseenter', () => { b.style.background = '#f5f3ff'; });
    b.addEventListener('mouseleave', () => { b.style.background = 'none'; });
  });

  // Un clic al botó → toggle menú (igual que el ⋮ verd)
  btnMain.addEventListener('click', (e) => {
    e.stopPropagation();
    // Tancar altres menús oberts a l'app
    document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
    menu.classList.toggle('hidden');
  });

  // Tancar en clicar fora
  document.addEventListener('click', () => { menu.classList.add('hidden'); });

  // Opció 1: Comentari IA
  document.getElementById('ucOptIA').addEventListener('click', () => {
    menu.classList.add('hidden');
    document.getElementById('btnTutoria_hidden').click();
  });

  // Opció 2: Ultracomentator
  document.getElementById('ucOptUltra').addEventListener('click', () => {
    menu.classList.add('hidden');
    openUltracomentatorModal();
  });

  console.log('✅ Botó Tutoria transformat en desplegable (un clic)');
}

// ============================================================
// MODAL PRINCIPAL ULTRACOMENTATOR
// ============================================================
function openUltracomentatorModal() {
  if (document.getElementById('ucMainModal')) {
    document.getElementById('ucMainModal').style.display = 'flex';
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'ucMainModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
  `;
  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;padding:40px;max-width:480px;width:90%;
      box-shadow:0 24px 64px rgba(0,0,0,0.18);text-align:center;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <div style="font-size:48px;margin-bottom:12px;">⚡</div>
      <h2 style="font-size:24px;font-weight:800;color:#1a1a2e;margin:0 0 8px;">Ultracomentator</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 32px;line-height:1.5;">
        Sistema de plantilles de comentaris per ítems. Crea la teva pròpia plantilla o accedeix a una ja creada.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button id="ucBtnCrear" style="
          background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:12px;
          padding:20px 16px;cursor:pointer;font-family:inherit;transition:all .2s;
        ">
          <div style="font-size:28px;margin-bottom:8px;">✨</div>
          <div style="font-weight:700;font-size:15px;">Crear nova</div>
          <div style="font-size:12px;opacity:.8;margin-top:4px;">Dissenya una plantilla</div>
        </button>
        <button id="ucBtnCarregar" style="
          background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border:none;border-radius:12px;
          padding:20px 16px;cursor:pointer;font-family:inherit;transition:all .2s;
        ">
          <div style="font-size:28px;margin-bottom:8px;">🔑</div>
          <div style="font-weight:700;font-size:15px;">Carregar existent</div>
          <div style="font-size:12px;opacity:.8;margin-top:4px;">Introdueix codi d'accés</div>
        </button>
      </div>
      <button id="ucBtnClose" style="
        margin-top:20px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:13px;font-family:inherit;
      ">✕ Tancar</button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll('button[id^=ucBtn]:not(#ucBtnClose)').forEach(b => {
    b.addEventListener('mouseenter', () => { b.style.transform = 'translateY(-2px)'; b.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'; });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; b.style.boxShadow = ''; });
  });

  document.getElementById('ucBtnClose').addEventListener('click', () => { modal.style.display = 'none'; });
  document.getElementById('ucBtnCrear').addEventListener('click', () => {
    modal.style.display = 'none';
    openCrearPlantillaModal();
  });
  document.getElementById('ucBtnCarregar').addEventListener('click', () => {
    modal.style.display = 'none';
    openCarregarPlantillaModal();
  });
}

// ============================================================
// MODAL CREAR PLANTILLA
// ============================================================
function openCrearPlantillaModal() {
  // Estructura temporal de la plantilla en construcció
  window._ucPlantilla = {
    nom: '',
    descripcio: '',
    items: [] // [ { id, titol, comentaris: [ { id, text, nivell } ] } ]
  };

  const modal = document.createElement('div');
  modal.id = 'ucCrearModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10001;display:flex;align-items:flex-start;justify-content:center;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);overflow-y:auto;padding:20px 0;
  `;

  modal.innerHTML = `
    <div style="
      background:#fafafa;border-radius:20px;width:min(820px,95vw);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 24px 80px rgba(0,0,0,0.2);overflow:hidden;
    ">
      <!-- HEADER -->
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:24px 28px;color:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:13px;opacity:.8;margin-bottom:4px;">⚡ ULTRACOMENTATOR</div>
            <h2 style="margin:0;font-size:22px;font-weight:800;">Crea una nova plantilla</h2>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="ucImportarExcel" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:6px;">
              📊 Importar Excel
            </button>
            <button id="ucCrearClose" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>
      </div>

      <div style="padding:28px;">
        <!-- NOM I DESCRIPCIÓ -->
        <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #e5e7eb;">
          <h3 style="margin:0 0 16px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">📝 Informació de la plantilla</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:6px;">Nom de la plantilla *</label>
              <input id="ucPlantillaNom" type="text" placeholder="Ex: Com es mouen les coses?" style="
                width:100%;box-sizing:border-box;border:1.5px solid #e5e7eb;border-radius:8px;
                padding:10px 12px;font-size:14px;font-family:inherit;outline:none;
                transition:border-color .2s;
              ">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#6b7280;display:block;margin-bottom:6px;">Descripció (opcional)</label>
              <input id="ucPlantillaDesc" type="text" placeholder="Ex: Física - 2n ESO" style="
                width:100%;box-sizing:border-box;border:1.5px solid #e5e7eb;border-radius:8px;
                padding:10px 12px;font-size:14px;font-family:inherit;outline:none;
                transition:border-color .2s;
              ">
            </div>
          </div>
        </div>

        <!-- ÍTEMS -->
        <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="margin:0;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">🧩 Ítems d'avaluació</h3>
            <button id="ucAfegirItem" style="
              background:#7c3aed;color:#fff;border:none;border-radius:8px;
              padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;gap:6px;transition:background .2s;
            ">+ Afegir ítem</button>
          </div>
          <div id="ucItemsContainer" style="display:flex;flex-direction:column;gap:12px;">
            <div id="ucItemsEmpty" style="text-align:center;padding:32px;color:#9ca3af;font-size:14px;">
              <div style="font-size:32px;margin-bottom:8px;">📭</div>
              Encara no hi ha ítems. Clica "Afegir ítem" per començar.
            </div>
          </div>
        </div>

        <!-- BOTONS FINALS -->
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
          <button id="ucCrearCancel" style="
            background:#f3f4f6;color:#374151;border:none;border-radius:8px;
            padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;
          ">Cancelar</button>
          <button id="ucGuardarPlantilla" style="
            background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:8px;
            padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;
            display:flex;align-items:center;gap:8px;
          ">💾 Guardar plantilla</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('ucCrearClose').addEventListener('click', () => { modal.remove(); openUltracomentatorModal(); });
  document.getElementById('ucImportarExcel').addEventListener('click', () => importarExcelModal());
  document.getElementById('ucCrearCancel').addEventListener('click', () => { modal.remove(); openUltracomentatorModal(); });
  document.getElementById('ucAfegirItem').addEventListener('click', () => afegirItemUI());
  document.getElementById('ucGuardarPlantilla').addEventListener('click', guardarPlantilla);

  // Focus effect inputs
  modal.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('focus', () => { inp.style.borderColor = '#7c3aed'; });
    inp.addEventListener('blur', () => { inp.style.borderColor = '#e5e7eb'; });
  });
}

// ============================================================
// UI: AFEGIR ÍTEM
// ============================================================
function afegirItemUI(itemData = null) {
  const container = document.getElementById('ucItemsContainer');
  const empty = document.getElementById('ucItemsEmpty');
  if (empty) empty.style.display = 'none';

  const itemId = itemData ? itemData.id : 'item_' + Date.now();
  const titol = itemData ? itemData.titol : '';

  const itemDiv = document.createElement('div');
  itemDiv.id = 'ucItem_' + itemId;
  itemDiv.dataset.itemId = itemId;
  itemDiv.style.cssText = `
    border:1.5px solid #e5e7eb;border-radius:12px;overflow:hidden;
    transition:border-color .2s;
  `;
  itemDiv.innerHTML = `
    <div style="
      background:linear-gradient(135deg,#f5f3ff,#ede9fe);
      padding:12px 16px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid #e5e7eb;
    ">
      <div style="display:flex;align-items:center;gap:10px;flex:1;">
        <span style="color:#7c3aed;font-size:14px;">🧩</span>
        <input 
          class="ucItemTitol"
          data-item-id="${itemId}"
          type="text" 
          placeholder="Títol de l'ítem (ex: Mètode científic)" 
          value="${titol}"
          style="
            flex:1;border:none;background:transparent;font-size:15px;font-weight:700;
            color:#374151;font-family:inherit;outline:none;
          "
        >
      </div>
      <div style="display:flex;gap:8px;">
        <button class="ucBtnAfegirCom" data-item-id="${itemId}" style="
          background:#7c3aed;color:#fff;border:none;border-radius:6px;
          padding:5px 10px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600;
        ">+ Comentari</button>
        <button class="ucBtnEliminarItem" data-item-id="${itemId}" style="
          background:#fee2e2;color:#ef4444;border:none;border-radius:6px;
          padding:5px 10px;font-size:12px;cursor:pointer;font-family:inherit;
        ">🗑</button>
      </div>
    </div>
    <div id="ucComs_${itemId}" style="padding:12px;display:flex;flex-direction:column;gap:8px;background:#fff;">
      <div class="ucComsEmpty" style="text-align:center;padding:16px;color:#9ca3af;font-size:13px;">
        Sense comentaris. Clica "+ Comentari" per afegir.
      </div>
    </div>
  `;

  container.appendChild(itemDiv);

  // Events
  itemDiv.querySelector('.ucBtnAfegirCom').addEventListener('click', () => afegirComentariUI(itemId));
  itemDiv.querySelector('.ucBtnEliminarItem').addEventListener('click', () => {
    itemDiv.remove();
    if (!container.querySelector('[data-item-id]')) {
      document.getElementById('ucItemsEmpty').style.display = 'block';
    }
  });

  // Si té comentaris, renderitzar-los
  if (itemData && itemData.comentaris) {
    itemData.comentaris.forEach(com => afegirComentariUI(itemId, com));
  }
}

// ============================================================
// UI: AFEGIR COMENTARI A UN ÍTEM
// ============================================================
const UC_NIVELLS = [
  { val: 'excel·lent', label: 'Excel·lent', color: '#059669', bg: '#d1fae5' },
  { val: 'assolit', label: 'Assolit', color: '#2563eb', bg: '#dbeafe' },
  { val: 'assolit_parcial', label: 'Assolit parcial', color: '#d97706', bg: '#fef3c7' },
  { val: 'no_assolit', label: 'No assolit', color: '#dc2626', bg: '#fee2e2' },
  { val: 'general', label: 'General', color: '#6b7280', bg: '#f3f4f6' },
];

function afegirComentariUI(itemId, comData = null) {
  const comsDiv = document.getElementById('ucComs_' + itemId);
  const empty = comsDiv.querySelector('.ucComsEmpty');
  if (empty) empty.style.display = 'none';

  const comId = comData ? comData.id : 'com_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const text = comData ? comData.text : '';
  const nivell = comData ? comData.nivell : 'general';

  const nivellInfo = UC_NIVELLS.find(n => n.val === nivell) || UC_NIVELLS[4];

  const comDiv = document.createElement('div');
  comDiv.id = 'ucCom_' + comId;
  comDiv.dataset.comId = comId;
  comDiv.dataset.itemId = itemId;
  comDiv.style.cssText = `
    display:flex;align-items:flex-start;gap:8px;padding:10px;
    background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;
  `;

  const nivellOptions = UC_NIVELLS.map(n =>
    `<option value="${n.val}" ${n.val === nivell ? 'selected' : ''}>${n.label}</option>`
  ).join('');

  comDiv.innerHTML = `
    <select class="ucNivellSel" data-com-id="${comId}" style="
      border:1.5px solid ${nivellInfo.color}33;border-radius:6px;padding:4px 8px;
      font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;
      background:${nivellInfo.bg};color:${nivellInfo.color};outline:none;
      white-space:nowrap;min-width:130px;
    ">${nivellOptions}</select>
    <textarea class="ucComText" data-com-id="${comId}" data-item-id="${itemId}" 
      placeholder="Escriu el comentari per a aquest nivell..."
      rows="2"
      style="
        flex:1;border:1.5px solid #e5e7eb;border-radius:6px;padding:8px 10px;
        font-size:13px;font-family:inherit;resize:vertical;outline:none;
        transition:border-color .2s;line-height:1.5;
      "
    >${text}</textarea>
    <button class="ucBtnEliminarCom" data-com-id="${comId}" style="
      background:none;border:none;cursor:pointer;color:#d1d5db;font-size:16px;
      padding:4px;line-height:1;transition:color .2s;flex-shrink:0;
    ">✕</button>
  `;

  comsDiv.appendChild(comDiv);

  // Events
  const sel = comDiv.querySelector('.ucNivellSel');
  sel.addEventListener('change', () => {
    const nInfo = UC_NIVELLS.find(n => n.val === sel.value) || UC_NIVELLS[4];
    sel.style.borderColor = nInfo.color + '33';
    sel.style.background = nInfo.bg;
    sel.style.color = nInfo.color;
  });

  const ta = comDiv.querySelector('.ucComText');
  ta.addEventListener('focus', () => { ta.style.borderColor = '#7c3aed'; });
  ta.addEventListener('blur', () => { ta.style.borderColor = '#e5e7eb'; });

  comDiv.querySelector('.ucBtnEliminarCom').addEventListener('click', () => {
    comDiv.remove();
    if (!comsDiv.querySelector('[data-com-id]')) {
      comsDiv.querySelector('.ucComsEmpty').style.display = 'block';
    }
  });
  comDiv.querySelector('.ucBtnEliminarCom').addEventListener('mouseenter', (e) => { e.target.style.color = '#ef4444'; });
  comDiv.querySelector('.ucBtnEliminarCom').addEventListener('mouseleave', (e) => { e.target.style.color = '#d1d5db'; });
}

// ============================================================
// RECOLLIR DADES DE LA PLANTILLA
// ============================================================
function recollirDadesPlantilla() {
  const nom = document.getElementById('ucPlantillaNom').value.trim();
  const desc = document.getElementById('ucPlantillaDesc').value.trim();

  if (!nom) {
    alert('Cal introduir un nom per a la plantilla!');
    return null;
  }

  const items = [];
  document.querySelectorAll('#ucItemsContainer [data-item-id]').forEach(itemDiv => {
    const itemId = itemDiv.dataset.itemId;
    const titol = itemDiv.querySelector('.ucItemTitol').value.trim();
    if (!titol) return;

    const comentaris = [];
    itemDiv.querySelectorAll('[data-com-id]').forEach(comDiv => {
      const text = comDiv.querySelector('.ucComText').value.trim();
      const nivell = comDiv.querySelector('.ucNivellSel').value;
      if (text) {
        comentaris.push({ id: comDiv.dataset.comId, text, nivell });
      }
    });

    items.push({ id: itemId, titol, comentaris });
  });

  if (items.length === 0) {
    alert('Cal afegir almenys un ítem amb comentaris!');
    return null;
  }

  return { nom, descripcio: desc, items };
}

// ============================================================
// GUARDAR PLANTILLA A FIREBASE
// ============================================================
async function guardarPlantilla() {
  const dades = recollirDadesPlantilla();
  if (!dades) return;

  const btn = document.getElementById('ucGuardarPlantilla');
  btn.innerHTML = '⏳ Guardant...';
  btn.disabled = true;

  try {
    const db = window._tutoriaDB || (window.firebase && window.firebase.firestore && window.firebase.firestore());
    if (!db) throw new Error('Firebase no disponible');

    // Generar codi d'accés de 6 caràcters
    const codi = generarCodi();
    dades.codi = codi;
    dades.creatEn = new Date().toISOString();
    dades.creatPer = window._tutoriaUID || 'anon';

    await db.collection('ultracomentator_plantilles').doc(codi).set(dades);

    btn.innerHTML = '✅ Guardada!';
    setTimeout(() => {
      document.getElementById('ucCrearModal').remove();
      mostrarCodiModal(codi, dades.nom);
    }, 600);

  } catch (err) {
    console.error('Error guardant plantilla:', err);
    alert('Error guardant la plantilla: ' + err.message);
    btn.innerHTML = '💾 Guardar plantilla';
    btn.disabled = false;
  }
}

function generarCodi() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codi = '';
  for (let i = 0; i < 6; i++) codi += chars[Math.floor(Math.random() * chars.length)];
  return codi;
}

// ============================================================
// MODAL MOSTRAR CODI D'ACCÉS
// ============================================================
function mostrarCodiModal(codi, nomPlantilla) {
  const modal = document.createElement('div');
  modal.id = 'ucCodiModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
  `;
  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;padding:40px;max-width:420px;width:90%;
      text-align:center;box-shadow:0 24px 64px rgba(0,0,0,0.2);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <div style="font-size:48px;margin-bottom:16px;">🎉</div>
      <h2 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#1a1a2e;">Plantilla guardada!</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">${nomPlantilla}</p>

      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px;padding:28px;margin-bottom:24px;">
        <div style="color:rgba(255,255,255,.7);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">CODI D'ACCÉS</div>
        <div id="ucCodiText" style="
          font-size:42px;font-weight:900;color:#fff;letter-spacing:8px;
          font-family:'Courier New',monospace;cursor:pointer;
        ">${codi}</div>
        <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:8px;">Clica per copiar</div>
      </div>

      <div style="background:#fef3c7;border-radius:10px;padding:12px 16px;margin-bottom:24px;text-align:left;">
        <div style="font-size:13px;color:#92400e;font-weight:500;">
          💡 Comparteix aquest codi amb altres professors perquè puguin accedir a la plantilla amb "Carregar existent".
        </div>
      </div>

      <button id="ucCodiUsarAra" style="
        background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:10px;
        padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;
        width:100%;margin-bottom:10px;
      ">⚡ Usar ara aquesta plantilla</button>
      <button id="ucCodiTancar" style="
        background:none;border:none;color:#9ca3af;font-size:13px;cursor:pointer;font-family:inherit;
      ">Tancar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Copiar codi
  document.getElementById('ucCodiText').addEventListener('click', () => {
    navigator.clipboard.writeText(codi).then(() => {
      document.getElementById('ucCodiText').style.opacity = '.6';
      setTimeout(() => { document.getElementById('ucCodiText').style.opacity = '1'; }, 400);
    });
  });

  document.getElementById('ucCodiTancar').addEventListener('click', () => { modal.remove(); });
  document.getElementById('ucCodiUsarAra').addEventListener('click', () => {
    modal.remove();
    carregarIUsarPlantilla(codi);
  });
}

// ============================================================
// MODAL CARREGAR PLANTILLA AMB CODI
// ============================================================
function openCarregarPlantillaModal() {
  const modal = document.createElement('div');
  modal.id = 'ucCarregarModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
  `;
  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;padding:40px;max-width:420px;width:90%;
      text-align:center;box-shadow:0 24px 64px rgba(0,0,0,0.2);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">
      <div style="font-size:40px;margin-bottom:12px;">🔑</div>
      <h2 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#1a1a2e;">Carregar plantilla</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 28px;">Introdueix el codi d'accés de 6 caràcters</p>

      <input id="ucCodiInput" type="text" maxlength="6"
        placeholder="Exemple: AB3X7K"
        style="
          width:100%;box-sizing:border-box;border:2px solid #e5e7eb;border-radius:12px;
          padding:16px;font-size:28px;font-weight:800;text-align:center;letter-spacing:6px;
          font-family:'Courier New',monospace;outline:none;text-transform:uppercase;
          transition:border-color .2s;margin-bottom:16px;
        "
      >
      <div id="ucCarregarError" style="color:#ef4444;font-size:13px;margin-bottom:12px;display:none;"></div>
      <button id="ucBtnCarregarOk" style="
        background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border:none;border-radius:10px;
        padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;
        width:100%;margin-bottom:10px;
      ">Accedir a la plantilla</button>
      <button id="ucCarregarCancel" style="
        background:none;border:none;color:#9ca3af;font-size:13px;cursor:pointer;font-family:inherit;
      ">← Tornar</button>
    </div>
  `;

  document.body.appendChild(modal);

  const input = document.getElementById('ucCodiInput');
  input.addEventListener('focus', () => { input.style.borderColor = '#7c3aed'; });
  input.addEventListener('blur', () => { input.style.borderColor = '#e5e7eb'; });
  input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('ucBtnCarregarOk').click(); });

  document.getElementById('ucCarregarCancel').addEventListener('click', () => { modal.remove(); openUltracomentatorModal(); });
  document.getElementById('ucBtnCarregarOk').addEventListener('click', async () => {
    const codi = input.value.trim().toUpperCase();
    if (codi.length < 4) {
      document.getElementById('ucCarregarError').textContent = 'El codi ha de tenir com a mínim 4 caràcters.';
      document.getElementById('ucCarregarError').style.display = 'block';
      return;
    }
    const btn = document.getElementById('ucBtnCarregarOk');
    btn.innerHTML = '⏳ Cercant...';
    btn.disabled = true;
    document.getElementById('ucCarregarError').style.display = 'none';

    try {
      const db = window._tutoriaDB || (window.firebase && window.firebase.firestore && window.firebase.firestore());
      if (!db) throw new Error('Firebase no disponible');
      const doc = await db.collection('ultracomentator_plantilles').doc(codi).get();
      if (!doc.exists) {
        document.getElementById('ucCarregarError').textContent = '❌ No s\'ha trobat cap plantilla amb aquest codi.';
        document.getElementById('ucCarregarError').style.display = 'block';
        btn.innerHTML = 'Accedir a la plantilla';
        btn.disabled = false;
        return;
      }
      modal.remove();
      carregarIUsarPlantilla(codi, doc.data());
    } catch (err) {
      document.getElementById('ucCarregarError').textContent = 'Error: ' + err.message;
      document.getElementById('ucCarregarError').style.display = 'block';
      btn.innerHTML = 'Accedir a la plantilla';
      btn.disabled = false;
    }
  });
}

// ============================================================
// MODAL US DE PLANTILLA (selecció comentaris + generar amb IA)
// ============================================================
async function carregarIUsarPlantilla(codi, plantillaData = null) {
  if (!plantillaData) {
    try {
      const db = window._tutoriaDB || (window.firebase && window.firebase.firestore && window.firebase.firestore());
      const doc = await db.collection('ultracomentator_plantilles').doc(codi).get();
      if (doc.exists) plantillaData = doc.data();
    } catch (e) { console.error(e); }
  }
  if (!plantillaData) { alert('No s\'ha pogut carregar la plantilla.'); return; }

  window._ucPlantillaActiva = plantillaData;

  const modal = document.createElement('div');
  modal.id = 'ucUsarModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10001;display:flex;align-items:flex-start;justify-content:center;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);overflow-y:auto;padding:20px 0;
  `;

  // Construir HTML dels ítems
  const itemsHTML = plantillaData.items.map(item => {
    const comsPerNivell = {};
    item.comentaris.forEach(com => {
      if (!comsPerNivell[com.nivell]) comsPerNivell[com.nivell] = [];
      comsPerNivell[com.nivell].push(com);
    });

    const nivellsUsats = UC_NIVELLS.filter(n => comsPerNivell[n.val] && comsPerNivell[n.val].length > 0);

    const pestanyesHTML = nivellsUsats.map((n, idx) =>
      `<button class="ucPestanya" data-item="${item.id}" data-nivell="${n.val}"
        style="
          padding:5px 12px;border:1.5px solid ${n.color}44;border-radius:20px;
          background:${idx === 0 ? n.bg : '#fff'};color:${idx === 0 ? n.color : '#6b7280'};
          font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
          transition:all .15s;white-space:nowrap;
        "
      >${n.label}</button>`
    ).join('');

    const checkboxesPerNivell = nivellsUsats.map((n, idx) => {
      const coms = comsPerNivell[n.val];
      return `
        <div class="ucNivellGroup" data-item="${item.id}" data-nivell="${n.val}"
          style="display:${idx === 0 ? 'flex' : 'none'};flex-direction:column;gap:6px;">
          ${coms.map(com => `
            <label style="
              display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
              border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;
              background:#fff;transition:all .15s;
            " class="ucComLabel">
              <input type="checkbox" class="ucComCheck" 
                data-item-id="${item.id}" data-item-titol="${item.titol.replace(/"/g,'&quot;')}"
                data-com-text="${com.text.replace(/"/g,'&quot;')}" data-nivell="${n.val}"
                style="margin-top:2px;accent-color:#7c3aed;width:16px;height:16px;flex-shrink:0;">
              <span style="font-size:13px;line-height:1.5;color:#374151;">${com.text}</span>
            </label>
          `).join('')}
        </div>
      `;
    }).join('');

    return `
      <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:12px;">
        <div style="
          padding:14px 16px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);
          border-bottom:1px solid #e5e7eb;
        ">
          <div style="font-weight:700;font-size:15px;color:#374151;margin-bottom:10px;">🧩 ${item.titol}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${pestanyesHTML}
          </div>
        </div>
        <div style="padding:12px;">
          ${checkboxesPerNivell}
        </div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="
      background:#fafafa;border-radius:20px;width:min(780px,95vw);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 24px 80px rgba(0,0,0,0.2);overflow:hidden;
    ">
      <!-- HEADER -->
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:20px 28px;color:#fff;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:12px;opacity:.7;margin-bottom:2px;">⚡ ULTRACOMENTATOR · ${codi}</div>
            <h2 style="margin:0;font-size:20px;font-weight:800;">${plantillaData.nom}</h2>
            ${plantillaData.descripcio ? `<div style="font-size:13px;opacity:.75;margin-top:2px;">${plantillaData.descripcio}</div>` : ''}
          </div>
          <button id="ucUsarClose" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;">✕</button>
        </div>
      </div>

      <div style="padding:20px 24px;">
        <!-- INFO ALUMNE -->
        <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e5e7eb;">
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <div style="flex:1;min-width:150px;">
              <label style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">Nom de l'alumne/a</label>
              <input id="ucAlumneNom" type="text" placeholder="Ex: Júlia Martínez"
                style="width:100%;box-sizing:border-box;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:14px;font-family:inherit;outline:none;">
            </div>
            <div style="min-width:120px;">
              <label style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">Idioma</label>
              <select id="ucIdioma" style="width:100%;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:14px;font-family:inherit;outline:none;background:#fff;">
                <option value="catala">Català</option>
                <option value="castella">Castellà</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ÍTEMS I COMENTARIS -->
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">
            Selecciona els comentaris que vols incloure:
          </div>
          ${itemsHTML}
        </div>

        <!-- RESULTAT IA -->
        <div id="ucResultatWrap" style="display:none;background:#fff;border-radius:12px;border:1.5px solid #7c3aed33;padding:16px;margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">✨ Comentari generat per IA</div>
          <div id="ucResultatText" style="font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;"></div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button id="ucCopiarResultat" style="
              background:#f3f4f6;color:#374151;border:none;border-radius:8px;
              padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
            ">📋 Copiar</button>
            <button id="ucGuardarAlumne" style="
              background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:8px;
              padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
              display:none;
            ">💾 Guardar a l'alumne</button>
          </div>
        </div>

        <!-- BOTONS ACCIONS -->
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button id="ucSelTots" style="background:#f3f4f6;color:#374151;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Seleccionar tot</button>
          <button id="ucDeselTots" style="background:#f3f4f6;color:#374151;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Desseleccionar</button>
          <button id="ucGenerar" style="
            background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:8px;
            padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;
            display:flex;align-items:center;gap:8px;
          ">✨ Generar amb IA</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // ---- EVENTS ----

  // Tancar
  document.getElementById('ucUsarClose').addEventListener('click', () => { modal.remove(); });

  // Pestanyes per ítem
  modal.querySelectorAll('.ucPestanya').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.item;
      const nivell = btn.dataset.nivell;
      const nInfo = UC_NIVELLS.find(n => n.val === nivell);

      // Reset pestanyes d'aquest ítem
      modal.querySelectorAll(`.ucPestanya[data-item="${itemId}"]`).forEach(p => {
        const pNivell = p.dataset.nivell;
        const pInfo = UC_NIVELLS.find(n => n.val === pNivell);
        p.style.background = '#fff'; p.style.color = '#6b7280';
      });
      btn.style.background = nInfo.bg; btn.style.color = nInfo.color;

      // Mostrar grup correcte
      modal.querySelectorAll(`.ucNivellGroup[data-item="${itemId}"]`).forEach(g => { g.style.display = 'none'; });
      modal.querySelector(`.ucNivellGroup[data-item="${itemId}"][data-nivell="${nivell}"]`).style.display = 'flex';
    });
  });

  // Hover labels
  modal.querySelectorAll('.ucComLabel').forEach(lbl => {
    lbl.addEventListener('mouseenter', () => { lbl.style.borderColor = '#a78bfa'; lbl.style.background = '#faf5ff'; });
    lbl.addEventListener('mouseleave', () => {
      const chk = lbl.querySelector('input');
      lbl.style.borderColor = chk.checked ? '#7c3aed' : '#e5e7eb';
      lbl.style.background = chk.checked ? '#faf5ff' : '#fff';
    });
    const chk = lbl.querySelector('input');
    chk.addEventListener('change', () => {
      lbl.style.borderColor = chk.checked ? '#7c3aed' : '#e5e7eb';
      lbl.style.background = chk.checked ? '#faf5ff' : '#fff';
    });
  });

  // Seleccionar / Desseleccionar tots
  document.getElementById('ucSelTots').addEventListener('click', () => {
    modal.querySelectorAll('.ucComCheck').forEach(chk => {
      chk.checked = true;
      const lbl = chk.closest('label');
      if (lbl) { lbl.style.borderColor = '#7c3aed'; lbl.style.background = '#faf5ff'; }
    });
  });
  document.getElementById('ucDeselTots').addEventListener('click', () => {
    modal.querySelectorAll('.ucComCheck').forEach(chk => {
      chk.checked = false;
      const lbl = chk.closest('label');
      if (lbl) { lbl.style.borderColor = '#e5e7eb'; lbl.style.background = '#fff'; }
    });
  });

  // Inputs focus
  document.getElementById('ucAlumneNom').addEventListener('focus', (e) => { e.target.style.borderColor = '#7c3aed'; });
  document.getElementById('ucAlumneNom').addEventListener('blur', (e) => { e.target.style.borderColor = '#e5e7eb'; });

  // Copiar
  document.getElementById('ucCopiarResultat').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('ucResultatText').textContent);
    document.getElementById('ucCopiarResultat').innerHTML = '✅ Copiat!';
    setTimeout(() => { document.getElementById('ucCopiarResultat').innerHTML = '📋 Copiar'; }, 1500);
  });

  // GENERAR AMB IA
  document.getElementById('ucGenerar').addEventListener('click', () => generarAmbIA(modal));
}

// ============================================================
// GENERAR COMENTARI AMB IA (Groq via /api/tutoria)
// ============================================================
async function generarAmbIA(modal) {
  const alumne = document.getElementById('ucAlumneNom').value.trim() || "l'alumne/a";
  const idioma = document.getElementById('ucIdioma').value;

  // Recollir comentaris seleccionats agrupats per ítem
  const seleccionats = {};
  modal.querySelectorAll('.ucComCheck:checked').forEach(chk => {
    const itemId = chk.dataset.itemId;
    const itemTitol = chk.dataset.itemTitol;
    if (!seleccionats[itemId]) seleccionats[itemId] = { titol: itemTitol, comentaris: [] };
    seleccionats[itemId].comentaris.push(chk.dataset.comText);
  });

  if (Object.keys(seleccionats).length === 0) {
    alert('Cal seleccionar almenys un comentari!');
    return;
  }

  const btn = document.getElementById('ucGenerar');
  btn.innerHTML = '⏳ Generant...';
  btn.disabled = true;

  const resultWrap = document.getElementById('ucResultatWrap');
  const resultText = document.getElementById('ucResultatText');
  resultWrap.style.display = 'block';
  resultText.textContent = 'Generant comentari...';

  // Construir el prompt
  const idiomaStr = idioma === 'catala' ? 'català' : 'castellà';
  let promptItems = '';
  Object.values(seleccionats).forEach(item => {
    promptItems += `\n- ÍTEM "${item.titol}":\n`;
    item.comentaris.forEach(c => { promptItems += `  · ${c}\n`; });
  });

  const prompt = `Ets un professor expert en redacció de comentaris per a butlletins de notes.

Alumne/a: ${alumne}
Idioma de sortida: ${idiomaStr}

Tens els següents comentaris predefinits per a cada ítem d'avaluació:
${promptItems}

La teva tasca: Crea UN ÚNIC comentari de butlletí fluid i natural que:
1. Integri l'essència de TOTS els comentaris seleccionats
2. Suoni com un text continuat escrit per un professor, no com una llista
3. Mantingui el nivell d'avaluació de cada ítem (no inflis ni baixes les valoracions)
4. Tingui entre 80 i 180 paraules
5. Estigui en ${idiomaStr}
6. Comenci amb el nom "${alumne}"
7. No faci servir punt i a part entre ítems — ha de fluir naturalment

Escriu ÚNICAMENT el comentari final, sense cap introducció ni explicació.`;

  try {
    const response = await fetch('/api/tutoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 400,
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error API');

    const comentari = data.choices[0].message.content.trim();
    resultText.textContent = comentari;

    // Mostrar botó guardar si hi ha alumne actiu
    if (window._tcStudentId && window._tcStudentName) {
      const btnGuardar = document.getElementById('ucGuardarAlumne');
      btnGuardar.style.display = 'inline-flex';
      btnGuardar.onclick = () => guardarComentariAlumne(comentari, modal);
    }

  } catch (err) {
    resultText.textContent = '❌ Error: ' + err.message;
    console.error('ucIA error:', err);
  }

  btn.innerHTML = '✨ Tornar a generar';
  btn.disabled = false;
}

// ============================================================
// GUARDAR COMENTARI A L'ALUMNE (integració tutoria-comentaris.js)
// ============================================================
async function guardarComentariAlumne(comentari, modal) {
  if (!window._tcStudentId || !window._tcClassId) {
    alert('No hi ha cap alumne actiu. Obre primer el modal de comentaris d\'un alumne.');
    return;
  }

  const btn = document.getElementById('ucGuardarAlumne');
  btn.innerHTML = '⏳ Guardant...';
  btn.disabled = true;

  try {
    const db = window._tutoriaDB;
    if (!db) throw new Error('Firebase no disponible');

    await db.collection('classes').doc(window._tcClassId)
      .collection('students').doc(window._tcStudentId)
      .update({ comment: comentari });

    // Omplir textarea del modal si està obert
    const taComment = document.querySelector('#commentsModal textarea, textarea[name="comment"]');
    if (taComment) taComment.value = comentari;

    btn.innerHTML = '✅ Guardat!';
    setTimeout(() => { modal.remove(); }, 800);

  } catch (err) {
    alert('Error guardant: ' + err.message);
    btn.innerHTML = '💾 Guardar a l\'alumne';
    btn.disabled = false;
  }
}

// ============================================================
// INICIALITZAR
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUltracomentator);
} else {
  initUltracomentator();
}

// ============================================================
// IMPORTACIÓ EXCEL
// ============================================================

function importarExcelModal() {
  // Necessitem SheetJS (XLSX) — carregar-lo si no està disponible
  if (!window.XLSX) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => { _mostrarModalImport(); };
    script.onerror = () => { alert('Error carregant la llibreria Excel. Comprova la connexió.'); };
    document.head.appendChild(script);
  } else {
    _mostrarModalImport();
  }
}

function _mostrarModalImport() {
  // Eliminar si ja existeix
  const old = document.getElementById('ucImportModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'ucImportModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10003;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
  `;
  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;padding:36px;max-width:500px;width:90%;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      box-shadow:0 24px 64px rgba(0,0,0,0.2);
    ">
      <h2 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#1a1a2e;">📊 Importar des d'Excel</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.5;">
        Importa una plantilla des d'un fitxer Excel amb el format Ultracomentator.<br>
        El full ha de tenir els ítems a la <strong>fila 2</strong> i els comentaris a la <strong>fila 4</strong>.
      </p>

      <!-- ZONA DROP -->
      <div id="ucDropZone" style="
        border:2px dashed #a78bfa;border-radius:12px;padding:32px;text-align:center;
        background:#faf5ff;cursor:pointer;transition:all .2s;margin-bottom:16px;
      ">
        <div style="font-size:40px;margin-bottom:10px;">📂</div>
        <div style="font-weight:700;color:#7c3aed;font-size:15px;margin-bottom:6px;">Arrossega l'Excel aquí</div>
        <div style="color:#9ca3af;font-size:13px;">o clica per seleccionar fitxer</div>
        <input type="file" id="ucFileInput" accept=".xlsx,.xls" style="display:none;">
      </div>

      <!-- FORMAT INFO -->
      <div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:13px;color:#166534;font-weight:600;margin-bottom:6px;">📋 Format esperat:</div>
        <div style="font-size:12px;color:#15803d;line-height:1.7;">
          • <strong>Fila 2:</strong> Títols dels ítems (ex: "Mètode científic", "Velocitat"...)<br>
          • <strong>Fila 4:</strong> Introducció de l'ítem + comentaris per nivell en columnes seguides<br>
          • Compatible amb el format EXPERIMENTA/Ultracomentator
        </div>
      </div>

      <div id="ucImportError" style="color:#ef4444;font-size:13px;margin-bottom:12px;display:none;padding:10px;background:#fef2f2;border-radius:8px;"></div>
      <div id="ucImportPreview" style="display:none;"></div>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="ucImportCancel" style="background:#f3f4f6;color:#374151;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Cancelar</button>
        <button id="ucImportOk" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:none;">✅ Importar plantilla</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let plantillaImportada = null;

  // Drag & Drop
  const dropZone = document.getElementById('ucDropZone');
  const fileInput = document.getElementById('ucFileInput');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.background = '#ede9fe';
    dropZone.style.borderColor = '#7c3aed';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.background = '#faf5ff';
    dropZone.style.borderColor = '#a78bfa';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '#faf5ff';
    dropZone.style.borderColor = '#a78bfa';
    const file = e.dataTransfer.files[0];
    if (file) processarFitxer(file);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processarFitxer(e.target.files[0]);
  });

  function processarFitxer(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      mostrarError('El fitxer ha de ser .xlsx o .xls');
      return;
    }

    dropZone.innerHTML = `<div style="font-size:24px;margin-bottom:8px;">⏳</div><div style="color:#7c3aed;font-weight:600;">Llegint fitxer...</div>`;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });

        // Buscar el full adequat (preferim RECULL, sinó el primer)
        const sheetName = wb.SheetNames.includes('RECULL') ? 'RECULL' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        plantillaImportada = parsejarFullExcel(ws, file.name.replace(/\.(xlsx|xls)$/i, ''));

        if (!plantillaImportada || plantillaImportada.items.length === 0) {
          mostrarError('No s\'han pogut trobar ítems al fitxer. Comprova que el format sigui correcte (títols a fila 2, comentaris a fila 4).');
          dropZone.innerHTML = `<div style="font-size:40px;margin-bottom:10px;">📂</div><div style="font-weight:700;color:#7c3aed;font-size:15px;margin-bottom:6px;">Arrossega l'Excel aquí</div><div style="color:#9ca3af;font-size:13px;">o clica per seleccionar fitxer</div><input type="file" id="ucFileInput" accept=".xlsx,.xls" style="display:none;">`;
          return;
        }

        mostrarPreview(plantillaImportada);
        document.getElementById('ucImportOk').style.display = 'inline-block';
        dropZone.innerHTML = `<div style="font-size:28px;margin-bottom:8px;">✅</div><div style="color:#059669;font-weight:700;">${file.name}</div><div style="color:#6b7280;font-size:12px;margin-top:4px;">${plantillaImportada.items.length} ítems trobats</div>`;
        dropZone.style.borderColor = '#34d399';
        dropZone.style.background = '#f0fdf4';

      } catch (err) {
        mostrarError('Error llegint el fitxer: ' + err.message);
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function mostrarError(msg) {
    const el = document.getElementById('ucImportError');
    el.textContent = '❌ ' + msg;
    el.style.display = 'block';
  }

  function mostrarPreview(plantilla) {
    const preview = document.getElementById('ucImportPreview');
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px;max-height:200px;overflow-y:auto;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Previsualització (${plantilla.items.length} ítems):</div>
        ${plantilla.items.map(item => `
          <div style="margin-bottom:8px;">
            <div style="font-weight:600;font-size:13px;color:#374151;">🧩 ${item.titol}</div>
            <div style="font-size:12px;color:#6b7280;margin-left:16px;">${item.comentaris.length} comentaris</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  document.getElementById('ucImportCancel').addEventListener('click', () => { modal.remove(); });
  document.getElementById('ucImportOk').addEventListener('click', () => {
    if (!plantillaImportada) return;
    modal.remove();

    // Omplir el formulari de crear amb les dades importades
    document.getElementById('ucPlantillaNom').value = plantillaImportada.nom;
    document.getElementById('ucPlantillaDesc').value = plantillaImportada.descripcio || '';

    // Netejar ítems existents
    const container = document.getElementById('ucItemsContainer');
    container.querySelectorAll('[data-item-id]').forEach(el => el.remove());
    const empty = document.getElementById('ucItemsEmpty');
    if (empty) empty.style.display = 'none';

    // Afegir ítems importats
    plantillaImportada.items.forEach(item => afegirItemUI(item));

    // Scroll cap amunt
    document.getElementById('ucCrearModal').scrollTop = 0;
  });
}

// ============================================================
// PARSEJAR FULL EXCEL → ESTRUCTURA PLANTILLA
// ============================================================
function parsejarFullExcel(ws, nomFitxer) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z10');
  const maxCol = range.e.c + 1;

  // Llegir fila 2 (índex 1) i fila 4 (índex 3)
  const fila2 = {};
  const fila4 = {};

  for (let c = 0; c < maxCol; c++) {
    const addr2 = XLSX.utils.encode_cell({ r: 1, c });
    const addr4 = XLSX.utils.encode_cell({ r: 3, c });
    const cell2 = ws[addr2];
    const cell4 = ws[addr4];

    if (cell2 && cell2.v && typeof cell2.v === 'string' && !cell2.v.startsWith('=')) {
      fila2[c] = cell2.v.trim();
    }
    if (cell4 && cell4.v && typeof cell4.v === 'string' && !cell4.v.startsWith('=')) {
      const text = cell4.v.trim().replace(/\\n$/, '').trim();
      if (text && !text.startsWith('TÍTOL') && !text.startsWith('COMENTARI') && !text.startsWith('ASSOLIMENT') && text !== 'EXPERIMENTA (alumnes)') {
        fila4[c] = text;
      }
    }
  }

  // Nom de la plantilla: buscar a fila 2 columna C (índex 2) o nom del fitxer
  const nomPlantilla = fila2[2] || nomFitxer || 'Plantilla importada';

  // Detectar els grups d'ítems
  // La fila 2 té els títols dels ítems en columnes específiques
  // Les columnes que tenen títol a fila 2 i NO comencen per majúscula sola ni "EXPERIMENTA"...
  // Estratègia: els títols reals d'ítems son les columnes fila2 que NO son "COM ES MOUEN..." etc.

  const columnesItem = Object.entries(fila2)
    .filter(([col, val]) => {
      const c = parseInt(col);
      // Excloure col 2 (títol projecte) i valors genèrics
      if (c <= 2) return false;
      if (val.startsWith('TÍTOL') || val.startsWith('COMENTARI') || val.startsWith('ASSOLIMENT')) return false;
      if (val.toUpperCase() === val && val.length > 5) return false; // tot majúscules = títol secció
      return true;
    })
    .map(([col]) => parseInt(col))
    .sort((a, b) => a - b);

  if (columnesItem.length === 0) return null;

  const items = [];
  const nivellsDefaults = ['excel·lent', 'assolit', 'assolit_parcial', 'no_assolit', 'general'];

  columnesItem.forEach((colInici, idx) => {
    const titol = fila2[colInici];
    const colFi = columnesItem[idx + 1] ? columnesItem[idx + 1] : colInici + 10;

    // Recollir comentaris de fila 4 per a les columnes d'aquest ítem
    const comentaris = [];

    // La primera columna pot ser un text introductori (no és un comentari)
    // Els comentaris reals comencen a colInici + 1
    for (let c = colInici; c < colFi && c < maxCol; c++) {
      const text = fila4[c];
      if (!text) continue;

      // Si és el text introductori (acaba en ":"), saltar-lo
      if (text.endsWith(':') && c === colInici) continue;

      // Assignar nivell basat en la posició relativa
      const posRel = c - colInici;
      let nivell = 'general';
      if (posRel === 1 || posRel === 0) nivell = 'excel·lent';
      else if (posRel === 2) nivell = 'assolit';
      else if (posRel === 3) nivell = 'assolit_parcial';
      else if (posRel >= 4) nivell = 'no_assolit';

      // Si hi ha 6+ comentaris, els últims son "no_assolit"
      if (posRel >= 5) nivell = 'no_assolit';

      comentaris.push({
        id: 'com_' + Date.now() + '_' + c,
        text: text.replace(/\\n/g, ' ').trim(),
        nivell
      });
    }

    if (titol && comentaris.length > 0) {
      items.push({
        id: 'item_' + Date.now() + '_' + colInici,
        titol,
        comentaris
      });
    }
  });

  return {
    nom: nomPlantilla,
    descripcio: '',
    items
  };
}
