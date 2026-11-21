// app.js - lògica principal (modules)
import { openModal, closeModal, confirmAction } from './modals.js';
import * as Terms from './terms.js';
window.Terms = Terms;

/* ---------------- FIREBASE CONFIG ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.firebasestorage.app",
  messagingSenderId: "324570393360",
  appId: "1:324570393360:web:13a65fcf948813805c5395"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


/* ---------------- Globals ---------------- */
let professorUID = null;
let currentClassId = null;
let classStudents = [];
let classActivities = [];
let deleteMode = false;
let currentCalcActivityId = null; // Activitat actual per fer càlculs
let isDeleteMode = false;
let currentCommentStudentId = null;
let currentCommentStudentName = null;
let currentCommentTermId = null;

// 🔥 FUNCIONES GLOBALES - Asignadas a window
window.openCommentsModal = function(studentId, studentName, currentComment, termId) {
  currentCommentStudentId = studentId;
  currentCommentStudentName = studentName;
  currentCommentTermId = termId || Terms.getActiveTermId() || null;
  
  // Crear modal dinámicamente si no existe
  let modal = document.getElementById('modalComments');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalComments';
    modal.className = 'fixed inset-0 hidden items-center justify-center z-50';
    modal.innerHTML = `
      <div class="modal-backdrop absolute inset-0" style="background: rgba(0,0,0,0.2);"></div>
      <div class="bg-white rounded shadow-lg z-10 w-full max-w-md p-6 flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <h2 id="modalCommentsTitle" class="text-xl font-bold"></h2>
          <button style="background: none; border: none; font-size: 28px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <textarea 
          id="commentTextarea" 
          class="border rounded p-3 w-full h-32 resize-none focus:ring-2 focus:ring-blue-400 focus:outline-none"
          placeholder="Escriu aquí els comentaris de l'alumne/a..."
          maxlength="500"
          style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
        ></textarea>
        
        <div class="text-xs text-gray-500">
          <span id="commentChars">0</span>/500 caràcters
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 px-3 py-2 rounded bg-gray-300 hover:bg-gray-400 text-black font-semibold cursor-pointer border-none">
            Cancelar
          </button>
          <button class="flex-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer border-none">
            Guardar
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Event listeners - AHORA SIN ATRIBUTOS ONCLICK
    const closeBtn = modal.querySelector('.bg-white button:first-of-type');
    const cancelBtn = modal.querySelector('.flex-1:nth-of-type(1)');
    const saveBtn = modal.querySelector('.flex-1:nth-of-type(2)');
    const backdropDiv = modal.querySelector('.modal-backdrop');
    const textarea = document.getElementById('commentTextarea');
    
    // Cerrar al pulsar X
    closeBtn.addEventListener('click', window.closeCommentsModal);
    
    // Cerrar al pulsar Cancelar
    cancelBtn.addEventListener('click', window.closeCommentsModal);
    
    // Guardar al pulsar Guardar
    saveBtn.addEventListener('click', window.saveComment);
    
    // Cerrar al pulsar en el fondo
    backdropDiv.addEventListener('click', window.closeCommentsModal);
    
    // Event listener para el textarea
    textarea.addEventListener('input', window.updateCommentChars);
  }
  
  // Poblar modal
  const _tn = termName(currentCommentTermId);
  document.getElementById('modalCommentsTitle').textContent = `Comentaris: ${studentName}` + (_tn ? ` · ${_tn}` : '');
  const textarea = document.getElementById('commentTextarea');
  textarea.value = currentComment;
  window.updateCommentChars();
  
  // Mostrar modal
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  textarea.focus();
};

/* ---- Comentaris per període d'avaluació (trimestre) ----
   Nou camp: alumnes/{id}.comentarisTrim.{classId}.{termId}. El camp antic
   comentarios.{classId} (un únic comentari per classe) es mostra al primer grup. */
function getStudentComment(sd, classId, termId, classData) {
  const nou = sd?.comentarisTrim?.[classId]?.[termId];
  if (typeof nou === 'string') return nou;
  const legacy = sd?.comentarios?.[classId];
  if (legacy) {
    const ids = Object.keys((classData || _classData)?.terms || {});
    if (!ids.length || !termId || termId === ids[0]) return legacy;
  }
  return '';
}
function termName(termId) {
  return (_classData?.terms?.[termId]?.name) || '';
}

window.closeCommentsModal = function() {
  const modal = document.getElementById('modalComments');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  currentCommentStudentId = null;
  currentCommentStudentName = null;
};

window.updateCommentChars = function() {
  const textarea = document.getElementById('commentTextarea');
  if (!textarea) return;
  const charsDiv = document.getElementById('commentChars');
  if (!charsDiv) return;
  const chars = textarea.value.length;
  charsDiv.textContent = chars;
};

window.saveComment = async function() {
  if (!currentCommentStudentId) {
    notify('Error: No hi ha estudiant seleccionat');
    return;
  }
  
  const textarea = document.getElementById('commentTextarea');
  if (!textarea) return;
  
  const comment = textarea.value.trim();
  
  try {
    // Guardar en Firestore
    const _tid = currentCommentTermId || Terms.getActiveTermId();
    await db.collection('alumnes').doc(currentCommentStudentId).update(
      _tid ? { [`comentarisTrim.${currentClassId}.${_tid}`]: comment }
           : { [`comentarios.${currentClassId}`]: comment }
    );
    
    console.log('Comentari guardat per:', currentCommentStudentName);
    
    // Cerrar modal
    window.closeCommentsModal();
    
    // Recargar la tabla para mostrar el nuevo comentario
    setTimeout(() => {
      renderNotesGrid();
    }, 100);
    
  } catch (e) {
    console.error('Error guardant comentari:', e);
    notify('Error guardant comentari: ' + e.message);
  }
};

// FIN DE FUNCIONES GLOBALES

/* Elements */
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const usuariNom = document.getElementById('usuariNom');

const btnLogout = document.getElementById('btnLogout');
const btnCreateClass = document.getElementById('btnCreateClass');

const screenClasses = document.getElementById('screen-classes');
const screenClass = document.getElementById('screen-class');
const classesGrid = document.getElementById('classesGrid');

const btnBack = document.getElementById('btnBack');
const btnAddStudent = document.getElementById('btnAddStudent');
const btnAddActivity = document.getElementById('btnAddActivity');
const btnSortAlpha = document.getElementById('btnSortAlpha');
const btnExport = document.getElementById('btnExport');


const notesThead = document.getElementById('notesThead');
const notesTbody = document.getElementById('notesTbody');
const notesTfoot = document.getElementById('notesTfoot');
const formulaTfoot = document.getElementById('formulaTfoot');

const modalCreateClassBtn = document.getElementById('modalCreateClassBtn');
const modalAddStudentBtn = document.getElementById('modalAddStudentBtn');
const modalAddActivityBtn = document.getElementById('modalAddActivityBtn');


/* ---------- UTILS ---------- */
function showLogin() {
  loginScreen.style.display = 'flex';
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}
function showApp() {
  loginScreen.style.display = 'none';
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
}

/* ---------- AUTH ---------- */
// Un únic punt d'entrada a l'app: onAuthStateChanged -> enterApp().
// Els botons només fan signIn/registre; la comprovació d'estat (eliminat/suspès)
// i la càrrega de la UI es fa sempre a enterApp().
let _creatingProfile = false; // mentre es crea el doc professors/{uid}, el listener espera
let _explicitLogin = false;   // només registrem a `logins` quan l'usuari fa login de debò
let _enteredUid = null;       // evita carregar l'app dues vegades per al mateix usuari

async function enterApp(user, { logLogin = false } = {}) {
  if (_enteredUid === user.uid) return;
  _enteredUid = user.uid;
  let snap;
  try {
    snap = await db.collection('professors').doc(user.uid).get();
  } catch (e) {
    console.error('No s\'ha pogut verificar el compte:', e);
    _enteredUid = null;
    await auth.signOut();
    return notify('⚠️ No s\'ha pogut verificar el compte: ' + e.message);
  }

  if (!snap.exists) {
    _enteredUid = null;
    await auth.signOut();
    return notify('⚠️ Usuari no trobat. Contacta amb l\'administrador.');
  }
  const data = snap.data() || {};
  if (data.deleted) {
    _enteredUid = null;
    await auth.signOut();
    return notify('⚠️ El teu compte ha estat eliminat. Contacta amb l\'administrador.');
  }
  if (data.suspended) {
    _enteredUid = null;
    await auth.signOut();
    return notify('⚠️ El teu compte està suspès.\nContacta amb l\'administrador.');
  }

  professorUID = user.uid;
  if (logLogin) {
    db.collection('professors').doc(user.uid).collection('logins')
      .add({ timestamp: firebase.firestore.Timestamp.now() })
      .catch(e => console.error('Error registrant login:', e));
  }
  setupAfterAuth(user, data);
}

// ---------------- LOGIN AMB GOOGLE I REGISTRE AUTOMÀTIC ----------------
async function signInWithGoogleGmail() {
  const provider = new firebase.auth.GoogleAuthProvider();

  _creatingProfile = true;
  _explicitLogin = true;
  try {
    const result = await firebase.auth().signInWithPopup(provider);

    const profRef = db.collection('professors').doc(result.user.uid);
    const docSnap = await profRef.get();
    if (!docSnap.exists) {
      await profRef.set({
        email: result.user.email,
        name: result.user.displayName || result.user.email.split('@')[0],
        google: true,
        isAdmin: false,
        suspended: false,
        deleted: false,
        classes: [],
        createdAt: firebase.firestore.Timestamp.now()
      });
    }
    _creatingProfile = false;
    await enterApp(result.user, { logLogin: true });
    _explicitLogin = false;
  } catch (error) {
    console.error(error);
    _explicitLogin = false;
    notify("Error iniciant sessió amb Google: " + error.message);
  } finally {
    _creatingProfile = false;
  }
}

document.getElementById("googleLoginBtn").addEventListener("click", signInWithGoogleGmail);


document.getElementById('btnLogoutIcon')?.addEventListener('click', () => btnLogout.click());
btnLogout.addEventListener('click', ()=> {
  auth.signOut().then(()=> {
    professorUID = null;
    currentClassId = null;
    _enteredUid = null;
    showLogin();
  });
});

auth.onAuthStateChanged(user => {
  if (user) {
    if (_creatingProfile) return; // el handler cridarà enterApp quan el perfil existeixi
    const log = _explicitLogin;
    _explicitLogin = false;
    enterApp(user, { logLogin: log });
  } else {
    professorUID = null;
    _enteredUid = null;
    showLogin();
  }
});

async function setupAfterAuth(user, profData) {
  showApp();
  const email = user.email || '';
  const displayName = user.displayName || email.split('@')[0] || email;
  usuariNom.textContent = displayName;
  const titleName = document.getElementById('usuariNomTitle');
  if (titleName) titleName.textContent = displayName.split(' ')[0];
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    avatar.innerHTML = '';
    if (user.photoURL) {
      const img = document.createElement('img');
      img.src = user.photoURL; img.alt = ''; img.referrerPolicy = 'no-referrer';
      img.onerror = () => { avatar.textContent = (displayName[0] || '?').toUpperCase(); };
      avatar.appendChild(img);
    } else {
      avatar.textContent = (displayName[0] || '?').toUpperCase();
    }
  }

  // ----------------- AFEGIR OPCIÓ ADMIN -----------------
  window.__avaluAdmin = !!(profData && profData.isAdmin);
  if (profData && profData.isAdmin) {
    if (!document.getElementById('btnAdminPanel')) {
      const adminBtn = document.createElement('button');
      adminBtn.id = 'btnAdminPanel';
      adminBtn.textContent = '⚙️ Administrar';
      adminBtn.addEventListener('click', () => {
        window.location.href = 'administrador.html';
      });
      document.getElementById('userMenu').appendChild(adminBtn);
    }
  }

  // Menú d'usuari: sempre té l'opció de sortir
  const um = document.getElementById('userMenu');
  if (um && !document.getElementById('btnLogoutMenu')) {
    const out = document.createElement('button');
    out.id = 'btnLogoutMenu';
    out.textContent = '🚪 Sortir';
    out.addEventListener('click', () => btnLogout.click());
    um.appendChild(out);
  }

  loadClassesScreen();
}

document.getElementById('navHome').addEventListener('click', () => {
  if (!professorUID) return;
  currentClassId = null;
  loadClassesScreen();
});

/* ---------------- Classes screen ---------------- */
btnCreateClass.addEventListener('click', ()=> openModal('modalCreateClass'));

/* ---------------- Classes Screen (cont.) ---------------- */
// Icona i il·lustració opcional segons el nom de la classe
const LOCK_SVG = '<svg viewBox="0 0 24 24" class="ic-sm"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const UNLOCK_SVG = '<svg viewBox="0 0 24 24" class="ic-sm"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>';
const REFRESH_SVG = '<svg viewBox="0 0 24 24" class="ic-sm"><path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/></svg>';
const _ic = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const ICON_DOC = _ic('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>');
const ICON_CHAT = _ic('<path d="M4 5h16v11H11l-4 4v-4H4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>');
const ICON_CHEV = _ic('<path d="m9 6 6 6-6 6"/>').replace('<svg', '<svg class="chev"');
const CLASS_SVG = {
  robot:   _ic('<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5M3 12v3M21 12v3"/>'),
  compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="19" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor" stroke="none" font-family="Georgia,serif">π</text></svg>',
  flask:   _ic('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M8 15h8"/>'),
  book:    _ic('<path d="M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5V19c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5zM12 6v13.5"/>'),
  chart:   _ic('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>'),
  default: _ic('<path d="M12 3 2 8l10 5 10-5zM6 10.5v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>')
};
// Icona i il·lustració opcional segons el nom de la classe
function classVisual(name) {
  const n = String(name || '').toLowerCase();
  const rules = [
    [/rob[oò]t|tecnol|inform[aà]t|program/, '🤖', 'robot'],
    [/b2f3|mat[eè]m|[àa]lgebra|geom|c[aà]lcul|\bmat\b/, 'π', 'compass'],
    [/b2f4|c[iì]en|qu[ií]m|f[ií]s|bio|lab|\bfem\b/, '🧪', 'flask'],
    [/llen|catal|cast|angl|liter|tutor|hist|soci|comentar/, '📖', 'book'],
    [/empres|econ|comer|compta|bd\b|dades|f4/, '📊', 'chart']
  ];
  for (const [re, ico, art] of rules) if (re.test(n)) return { ico, art, svg: CLASS_SVG[art] };
  return { ico: '🎓', art: 'default', svg: CLASS_SVG.default };
}

const ART_TONE = { robot: 0, book: 1, flask: 2, compass: 3, chart: 4 };
const QUOTES = [
  "La constància és la clau de l'aprenentatge.",
  "Educar no és omplir un got, sinó encendre un foc.",
  "Cada alumne té un camí; el nostre paper és il·luminar-lo.",
  "Els petits progressos d'avui són els grans èxits de demà.",
  "Avaluar és, abans de res, ajudar a créixer."
];

let _classSort = 'recent';
let _classCache = [];   // [{id, data}] de l'última càrrega, per a la cerca i el resum

function renderClassCards() {
  const q = (document.getElementById('classSearch')?.value || '').trim().toLowerCase();
  classesGrid.innerHTML = '';
  // El botó «Eliminar seleccionats» s'ha de treure sempre abans de pintar (també als estats buits)
  document.querySelectorAll('.delete-selected-btn').forEach(b => b.remove());
  let list = _classCache.filter(c => !q || String(c.data.nom || '').toLowerCase().includes(q));
  if (_classSort === 'az') list = [...list].sort((a, b) => String(a.data.nom).localeCompare(String(b.data.nom), 'ca'));
  else if (_classSort === 'za') list = [...list].sort((a, b) => String(b.data.nom).localeCompare(String(a.data.nom), 'ca'));
  else if (_classSort === 'students') list = [...list].sort((a, b) => (b.data.alumnes || []).length - (a.data.alumnes || []).length);
  screenClasses.classList.toggle('is-empty', _classCache.length === 0);
  if (_classCache.length === 0) {
    if (deleteMode) { deleteMode = false; setDeleteBtn(false); }
    classesGrid.innerHTML = `<div class="first-run">
      <div class="fr-ico">🎓</div>
      <h2>Comencem!</h2>
      <p>Encara no tens cap classe. Crea-la o importa-la i en pocs minuts podràs posar notes.</p>
      <div class="fr-btns">
        <button type="button" id="frCreate" class="btn btn-primary fr-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Crea la teva primera classe</button>
        <button type="button" id="frClassroom" class="btn fr-btn"><img src="img/classroom.png" alt="" class="btn-logo">Importa una classe des de Classroom</button>
      </div></div>`;
    document.getElementById('frCreate').onclick = () => openModal('modalCreateClass');
    document.getElementById('frClassroom').onclick = () => document.getElementById('btnClassroomImport')?.click();
    return;
  }
  if (list.length === 0) {
    classesGrid.innerHTML = `<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--c-muted)">Cap classe coincideix amb la cerca.</div>`;
    return;
  }

  list.forEach((c, i) => {
    const d = { id: c.id, data: () => c.data };
    const vis = classVisual(c.data.nom);
    let totalActivities = 0;
    Object.values(c.data.terms || {}).forEach(t => { totalActivities += (t.activities || []).length; });

    const card = document.createElement('div');
    card.className = `class-card tone-${ART_TONE[vis.art] ?? (_classCache.indexOf(c) % 6)}`;
    card.dataset.id = c.id;
    card.innerHTML = `
      ${deleteMode ? '<input type="checkbox" class="delete-checkbox" style="position:absolute;top:12px;right:14px;width:20px;height:20px;z-index:3">' : ''}
      <div class="card-top">
        <div class="card-ico">${vis.svg}</div>
        <div class="card-titles">
          <h3 translate="no">${esc(c.data.nom || 'Sense nom')}</h3>
          <p class="meta">${(c.data.alumnes || []).length} alumnes · ${totalActivities} activitats</p>
        </div>
      </div>
      <img class="card-art" src="img/card-${vis.art}.png" alt="" onerror="this.onerror=null;this.src='img/card-${vis.art}.svg'">
      <div class="card-links">
        <button type="button" class="card-link" data-go="notes">${ICON_DOC}<span>${deleteMode ? 'Selecciona per eliminar' : 'Fes les correccions'}</span>${ICON_CHEV}</button>
        <button type="button" class="card-link" data-go="comentaris">${ICON_CHAT}<span>Veure comentaris</span>${ICON_CHEV}</button>
      </div>
    `;

    if (!deleteMode) {
      const menuDiv = document.createElement('div');
      menuDiv.style.cssText = 'position:absolute;top:10px;right:12px;z-index:3';
      menuDiv.innerHTML = `
        <button class="menu-btn" type="button" aria-label="Opcions">⋮</button>
        <div class="menu hidden"><button class="edit-btn" type="button">Editar nom</button></div>
      `;
      card.appendChild(menuDiv);
      const menuBtn = menuDiv.querySelector('.menu-btn');
      const menu = menuDiv.querySelector('.menu');
      menuBtn.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
        menu.classList.toggle('hidden');
      });
      menuDiv.querySelector('.edit-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        menu.classList.add('hidden');
        const newName = await promptDialog('Introdueix el nou nom de la classe:', c.data.nom || '', { title: 'Editar classe' });
        if (!newName || newName.trim() === c.data.nom) return;
        db.collection('classes').doc(c.id).update({ nom: newName.trim() })
          .then(() => loadClassesScreen())
          .catch(err => notify('Error editant classe: ' + err.message, 'error'));
      });
      card.querySelectorAll('.card-link').forEach(l => l.addEventListener('click', e => {
        e.stopPropagation();
        openClass(c.id, l.dataset.go);
      }));
      card.addEventListener('click', () => openClass(c.id, 'notes'));
    }
    classesGrid.appendChild(card);
  });

  if (deleteMode) addDeleteSelectedButton();
}

function updateClassSummary() {
  let students = 0, acts = 0;
  _classCache.forEach(c => {
    students += (c.data.alumnes || []).length;
    Object.values(c.data.terms || {}).forEach(t => { acts += (t.activities || []).length; });
  });
  document.getElementById('sumClasses').textContent = _classCache.length;
  document.getElementById('sumStudents').textContent = students;
  document.getElementById('sumActivities').textContent = acts;
  computePendingComments();
  const qt = document.getElementById('quoteText');
  if (qt) qt.textContent = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
}

// Comentaris pendents = alumnes sense comentari a la seva classe (càrrega diferida)
async function computePendingComments() {
  const el = document.getElementById('sumPending');
  if (!el) return;
  try {
    let pending = 0;
    const byClass = [];
    // Els comentaris només es posen a la classe de tutoria: només es llegeix aquella (estalvia lectures)
    const tutId = window.AvaluConfig?.get().tutoriaClassId || '';
    const target = _classCache.filter(c => c.id === tutId);
    if (!target.length) {
      el.textContent = '–';
      window.dispatchEvent(new CustomEvent('pending-comments', { detail: { total: 0, byClass: [], noTutoria: true } }));
      return;
    }
    await Promise.all(target.map(async c => {
      let cp = 0;
      const docs = await Promise.all((c.data.alumnes || []).map(id => db.collection('alumnes').doc(id).get()));
      // Un comentari pendent = alumne sense comentari en un grup amb activitats
      const termIds = Object.entries(c.data.terms || {}).filter(([, t]) => (t.activities || []).length).map(([id]) => id);
      const checkIds = termIds.length ? termIds : [Object.keys(c.data.terms || {})[0]];
      docs.forEach(d => {
        checkIds.forEach(tid => {
          const cm = d.exists ? getStudentComment(d.data(), c.id, tid, c.data) : '';
          if (!String(cm).trim()) { pending++; cp++; }
        });
      });
      byClass.push({ id: c.id, nom: c.data.nom || 'Sense nom', pending: cp });
    }));
    el.textContent = pending;
    window.dispatchEvent(new CustomEvent('pending-comments', { detail: { total: pending, byClass } }));
  } catch (e) { el.textContent = '–'; }
}

function loadClassesScreen() {
  if(!professorUID) { notify('Fes login primer.'); return; }
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
  classesGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--c-muted)">Carregant...</div>';

  db.collection('professors').doc(professorUID).get().then(doc => {
    if(!doc.exists) {
      classesGrid.innerHTML = '<div class="panel" style="color:#e11d48">Professor no trobat</div>';
      return;
    }
    const ids = doc.data().classes || [];
    return Promise.all(ids.map(id => db.collection('classes').doc(id).get())).then(docs => {
      _classCache = docs.filter(d => d.exists).map(d => ({ id: d.id, data: d.data() }));
      renderClassCards();
      updateClassSummary();
    });
  }).catch(e => {
    classesGrid.innerHTML = `<div class="panel" style="color:#e11d48">Error carregant classes</div>`;
    console.error(e);
  });
}

document.getElementById('classSearch').addEventListener('input', renderClassCards);
(function setupClassFilter() {
  const btn = document.getElementById('btnClassFilter');
  const menu = document.getElementById('classFilterMenu');
  btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
  menu.addEventListener('click', e => {
    const b = e.target.closest('button[data-sort]');
    if (!b) return;
    _classSort = b.dataset.sort;
    menu.classList.add('hidden');
    renderClassCards();
  });
  document.addEventListener('click', () => menu.classList.add('hidden'));
})();

// Exportar i imprimir la graella
document.getElementById('btnExportClass').addEventListener('click', () => exportExcel());
document.getElementById('btnPrintClass').addEventListener('click', () => window.print());
document.getElementById('viewCards').addEventListener('click', () => {
  classesGrid.classList.remove('list-view');
  document.getElementById('viewCards').classList.add('active');
  document.getElementById('viewList').classList.remove('active');
});
document.getElementById('viewList').addEventListener('click', () => {
  classesGrid.classList.add('list-view');
  document.getElementById('viewList').classList.add('active');
  document.getElementById('viewCards').classList.remove('active');
});

/* Selector de vista desplegable (mòbil) */
(function () {
  const btn = document.getElementById('viewDDBtn'), menu = document.getElementById('viewDDMenu'), ico = document.getElementById('viewDDIcon');
  if (!btn) return;
  const sync = () => {
    const src = document.getElementById(document.getElementById('viewList').classList.contains('active') ? 'viewList' : 'viewCards');
    ico.innerHTML = src.querySelector('svg').outerHTML;
  };
  sync();
  btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
  menu.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    menu.classList.add('hidden');
    document.getElementById(b.dataset.v === 'list' ? 'viewList' : 'viewCards').click();
  });
  document.getElementById('viewCards').addEventListener('click', sync);
  document.getElementById('viewList').addEventListener('click', sync);
  document.addEventListener('click', () => menu.classList.add('hidden'));
})();

/* Mòbil: vista de llista per defecte (si l'usuari en tria una altra, es recorda) */
(function () {
  const mq = window.matchMedia('(max-width: 860px)'), K = 'avaluapp.vistaMobil';
  let applying = false;
  const pref = () => { try { return localStorage.getItem(K) === 'cards' ? 'cards' : 'list'; } catch { return 'list'; } };
  const apply = () => {
    if (!mq.matches) return;
    applying = true;
    document.getElementById(pref() === 'cards' ? 'viewCards' : 'viewList').click();
    applying = false;
  };
  [['viewCards', 'cards'], ['viewList', 'list']].forEach(([id, v]) =>
    document.getElementById(id).addEventListener('click', () => {
      if (applying || !mq.matches) return;
      try { localStorage.setItem(K, v); } catch {}
    }));
  apply();
  (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
})();

/* ---------------- Delete Mode Classes ---------------- */
const btnDeleteMode = document.getElementById('btnDeleteMode');
function setDeleteBtn(on) {
  btnDeleteMode.innerHTML = on
    ? '<span class="lbl-main">❌ Cancel·lar eliminar</span>'
    : '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg><span><span class="lbl-main">Eliminar</span><span class="lbl-x"> classe</span></span>';
}
btnDeleteMode.addEventListener('click', ()=> {
  deleteMode = !deleteMode;
  setDeleteBtn(deleteMode);
  loadClassesScreen();
});

function addDeleteSelectedButton(){
  const delBtn = document.createElement('button');
  delBtn.textContent = 'Eliminar seleccionats';
  delBtn.className = 'delete-selected-btn mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow';
  delBtn.onclick = confirmDeleteSelected;
  classesGrid.parentNode.insertBefore(delBtn, classesGrid.nextSibling);
}

/* ---------------- Helpers d'esborrat en cascada ---------------- */
async function batchDeleteRefs(refs){
  for (let i = 0; i < refs.length; i += 400) {
    const chunk = refs.slice(i, i + 400);
    try {
      const b = db.batch();
      chunk.forEach(r => b.delete(r));
      await b.commit();
    } catch (e) {
      console.warn('Lot fallit, reintentant doc a doc', e);
      for (const r of chunk) {
        try { await r.delete(); } catch (e2) { console.error('No s\'ha pogut esborrar', r.path, e2); }
      }
    }
  }
}

// Esborra una classe amb tot el que penja: alumnes, activitats i la referència del professor.
// Ordre: dades fills -> doc de la classe -> referència al professor (les rules necessiten
// que la classe encara sigui a professor.classes mentre s'esborra).
async function deleteClassCascade(classId){
  const ref = db.collection('classes').doc(classId);
  const snap = await ref.get();
  if (snap.exists) {
    const c = snap.data() || {};
    const alumnes = c.alumnes || [];
    const actIds = new Set(c.activitats || []);
    Object.values(c.terms || {}).forEach(t => (t.activities || []).forEach(a => actIds.add(a)));
    await batchDeleteRefs(alumnes.map(id => db.collection('alumnes').doc(id)));
    await batchDeleteRefs([...actIds].map(id => db.collection('activitats').doc(id)));
    await ref.delete();
  }
  await db.collection('professors').doc(professorUID).update({
    classes: firebase.firestore.FieldValue.arrayRemove(classId)
  });
}

// Esborra una activitat de TOTS els grups de la classe, el seu doc, els càlculs i les notes.
async function deleteActivityCascade(actId){
  const classRef = db.collection('classes').doc(currentClassId);
  const snap = await classRef.get();
  const c = snap.exists ? snap.data() : {};
  const upd = {
    activitats: firebase.firestore.FieldValue.arrayRemove(actId),
    [`calculatedActivities.${actId}`]: firebase.firestore.FieldValue.delete()
  };
  Object.entries(c.terms || {}).forEach(([tid, t]) => {
    if ((t.activities || []).includes(actId)) {
      upd[`terms.${tid}.activities`] = firebase.firestore.FieldValue.arrayRemove(actId);
    }
  });
  await classRef.update(upd);

  const alumnes = c.alumnes || classStudents || [];
  for (let i = 0; i < alumnes.length; i += 400) {
    const b = db.batch();
    alumnes.slice(i, i + 400).forEach(sid => {
      b.update(db.collection('alumnes').doc(sid), { [`notes.${actId}`]: firebase.firestore.FieldValue.delete() });
    });
    await b.commit();
  }
  await db.collection('activitats').doc(actId).delete();
}

// Esborra alumnes per ID (de la classe + doc de l'alumne)
async function deleteStudentsByIds(ids){
  if (!ids.length) return;
  await db.collection('classes').doc(currentClassId).update({
    alumnes: firebase.firestore.FieldValue.arrayRemove(...ids)
  });
  await batchDeleteRefs(ids.map(id => db.collection('alumnes').doc(id)));
}

function showSaveError(e){
  console.error('Error desant:', e);
  let t = document.getElementById('saveErrorToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'saveErrorToast';
    t.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;background:#dc2626;color:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.3);max-width:320px;font-size:14px';
    document.body.appendChild(t);
  }
  t.textContent = '⚠️ No s\'ha pogut desar: ' + (e && e.message ? e.message : e);
  clearTimeout(t._h);
  t._h = setTimeout(() => t.remove(), 6000);
}

function confirmDeleteSelected(){
  const selected = [...document.querySelectorAll('.delete-checkbox')]
    .filter(chk => chk.checked)
    .map(chk => chk.closest('.class-card'));

  if(selected.length === 0) return notify('Selecciona almenys una classe!');

  confirmAction(
    'Confirmació d\'eliminació',
    `Estàs segur que vols eliminar ${selected.length} classe(s)? Aquesta acció no té marxa enrere.`,
    async () => {
      const ids = selected.map(c => c.dataset.id).filter(Boolean);
      try {
        for (const id of ids) await deleteClassCascade(id);
      } catch (e) {
        notify('Error eliminant classe: ' + e.message);
      }
      deleteMode = false;
      setDeleteBtn(false);
      loadClassesScreen();
    }
  );
}

/* ---------------- Create Class ---------------- */
function createClassModal(){
  const name = document.getElementById('modalClassName').value.trim();
  if(!name) return notify('Posa un nom');
  const ref = db.collection('classes').doc();
  ref.set({ nom: name, alumnes: [], activitats: [], ownerUid: professorUID })
    .then(()=> db.collection('professors').doc(professorUID).update({ classes: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> {
      closeModal('modalCreateClass');
      document.getElementById('modalClassName').value = '';
      loadClassesScreen();
    }).catch(e=> notify('Error: ' + e.message));
}
modalCreateClassBtn.addEventListener('click', createClassModal);

/* ---------------- Open Class ---------------- */
function openClass(id, tab){
  currentClassId = id;
  screenClasses.classList.add('hidden');
  screenClass.classList.remove('hidden');
  loadClassData();
  window.dispatchEvent(new CustomEvent('class-opened', { detail: { id, tab: tab || 'notes' } }));
}

btnBack.addEventListener('click', ()=> {
  currentClassId = null;
  screenClass.classList.add('hidden');
  screenClasses.classList.remove('hidden');
  loadClassesScreen();
});

/* ---------------- Load Class Data ---------------- */
function loadClassData(){
  if(!currentClassId) return;
  db.collection('classes').doc(currentClassId).get().then(doc=>{
    if(!doc.exists) { notify('Classe no trobada'); return; }
    const data = doc.data();
    _classData = data; // 🔥 ASEGURATE QUE ESTO ESTÉ AQUÍ

    // Guardem dades locals com abans
    classStudents = data.alumnes || [];
    document.getElementById('classTitle').textContent = data.nom || 'Sense nom';
    document.getElementById('classSub').textContent = `ID: ${doc.id}`;

    // Inicialitzar Terms passant db, id i dades de la classe
    Terms.setup(db, currentClassId, data, {
      onChange: (activeTermId) => {
        // 🔥 NUEVO: Actualizar _classData cada vez que cambia el término
        db.collection('classes').doc(currentClassId).get().then(updatedDoc => {
          if(updatedDoc.exists) {
            _classData = updatedDoc.data(); // Actualizar con datos frescos
            window.dispatchEvent(new CustomEvent('classdata-updated', { detail: { classId: currentClassId } }));
          }
        });

        // Quan el terme actiu canvia, actualitzem classActivities i re-renderitzem la taula
        const acts = Terms.getActiveTermActivities();
        classActivities = Array.isArray(acts) ? acts : [];
        renderNotesGrid(); // renderitza la taula amb activitats del terme actiu
        
        // Actualitzar títol per incloure nom terme al costat de nom classe
        const titleEl = document.getElementById('classTitle');
        if(titleEl) titleEl.textContent = `${data.nom} - ${Terms.getActiveTermName() || ''}`;
      }
    });

  }).catch(e=> console.error(e));
}

/* ---------------- Students ---------------- */
btnAddStudent?.addEventListener('click', ()=> openModal('modalAddStudent'));
modalAddStudentBtn.addEventListener('click', createStudentModal);

function createStudentModal(){
  const name = document.getElementById('modalStudentName').value.trim();
  if(!name) return notify('Posa un nom');
  const ref = db.collection('alumnes').doc();
  ref.set({ nom: name, notes: {}, ownerUid: professorUID })
    .then(()=> db.collection('classes').doc(currentClassId).update({ alumnes: firebase.firestore.FieldValue.arrayUnion(ref.id) }))
    .then(()=> {
      closeModal('modalAddStudent');
      document.getElementById('modalStudentName').value = '';
      loadClassData();
    }).catch(e=> notify('Error: '+e.message));
}

function removeStudent(studentId) {
  confirmAction(
    'Eliminar alumne',
    'Estàs segur que vols eliminar aquest alumne?',
    () => {
      deleteStudentsByIds([studentId])
        .then(() => loadClassData())
        .catch(e => notify('Error eliminant alumne: ' + e.message));
    }
  );
}

function reorderStudents(fromIdx, toIdx){
  if(fromIdx===toIdx) return;
  const arr = Array.from(classStudents);
  const item = arr.splice(fromIdx,1)[0];
  arr.splice(toIdx,0,item);
  db.collection('classes').doc(currentClassId).update({ alumnes: arr })
    .then(()=> loadClassData())
    .catch(e=> console.error('Error reordenant', e));
}

/* ---------------- Ordenar alumnes (nom/cognom, A→Z / Z→A) ---------------- */
// Separa "Nom Cognom1 Cognom2" o "Cognoms, Nom"
function splitStudentName(full) {
  const t = String(full || '').trim();
  if (t.includes(',')) {
    const [cog, ...rest] = t.split(',');
    return { nom: rest.join(',').trim(), cognom: cog.trim() };
  }
  const parts = t.split(/\s+/);
  return { nom: parts[0] || '', cognom: parts.slice(1).join(' ') };
}

async function sortStudents(field, dir) {
  try {
    const docs = await Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()));
    const rows = docs.map(d => {
      const n = splitStudentName(d.exists ? d.data().nom : '');
      return { id: d.id, key: field === 'cognom' ? (n.cognom || n.nom) : n.nom, tie: n.nom + ' ' + n.cognom };
    });
    const sign = dir === 'desc' ? -1 : 1;
    rows.sort((a, b) =>
      sign * a.key.localeCompare(b.key, 'ca', { sensitivity: 'base' }) ||
      sign * a.tie.localeCompare(b.tie, 'ca', { sensitivity: 'base' }));
    await db.collection('classes').doc(currentClassId).update({ alumnes: rows.map(r => r.id) });
    loadClassData();
  } catch (e) {
    notify('Error ordenant alumnes: ' + e.message, 'error');
  }
}

(function setupSortMenu() {
  const btn = document.getElementById('btnSortAlpha');
  if (!btn) return;
  const menu = document.createElement('div');
  menu.id = 'sortMenu';
  menu.className = 'app-dropdown hidden';
  menu.innerHTML = [
    ['nom', 'asc',  'Nom (A → Z)'],
    ['nom', 'desc', 'Nom (Z → A)'],
    ['cognom', 'asc',  'Cognom (A → Z)'],
    ['cognom', 'desc', 'Cognom (Z → A)']
  ].map(([f, d, l]) => `<button type="button" data-field="${f}" data-dir="${d}">${l}</button>`).join('');
  btn.parentNode.style.position = btn.parentNode.style.position || 'relative';
  btn.insertAdjacentElement('afterend', menu);
  btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
  menu.addEventListener('click', e => {
    const b = e.target.closest('button[data-field]');
    if (!b) return;
    menu.classList.add('hidden');
    const sv = btn.querySelector('.sort-val');
    if (sv) sv.textContent = `${b.dataset.field === 'cognom' ? 'Cognom' : 'Nom'} ${b.dataset.dir === 'desc' ? '↓' : '↑'}`;
    sortStudents(b.dataset.field, b.dataset.dir);
  });
  document.addEventListener('click', () => menu.classList.add('hidden'));
})();

/* ---------------- Activities ---------------- */
btnAddActivity.addEventListener('click', ()=> openModal('modalAddActivity'));
modalAddActivityBtn.addEventListener('click', createActivityModal);

async function createActivityModal() {
    const name = document.getElementById("modalActivityName").value.trim();
    if (!name) return;

    const ref = db.collection("activitats").doc();

    await ref.set({
        nom: name,
        data: new Date().toISOString().split("T")[0],
        calcType: "numeric",
        formula: "",
        ownerUid: professorUID
    });

    // 🔥 Aquí afegim l'activitat al terme actiu
    if (window.Terms && Terms.addActivityToActiveTerm) {
        await Terms.addActivityToActiveTerm(ref.id);
    } else {
        console.error("❌ Terms no està carregat. Revisa l'import a app.js");
    }

    closeModal("modalAddActivity");
    document.getElementById("modalActivityName").value = "";

    // 🔥 NO posar loadClassData() si tens dubtes!
    // Si vols recarregar:
    //if (typeof loadClassData === "function") {
     //   loadClassData();
   // }
}

/* ================================================================
   ALUMNES DINS DE LA GRAELLA
   Cada fila de la graella permet: reordenar (arrossegar), editar el nom,
   introduir l'email, enviar notes i eliminar. El menú de la capçalera
   «Alumne» permet eliminar o enviar notes a diversos alumnes alhora.
================================================================ */
let _studentMode = null; // null | 'delete' | 'send'

function avatarHue(name) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
function studentInitials(name) {
  return (String(name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') || '?').toUpperCase();
}

function buildStudentCell(tr, studentId, data) {
  const name = data.nom || 'Desconegut';
  const td = document.createElement('td');
  td.className = 'stu-td';
  td.innerHTML = `
    <div class="stu-cell">
      <span class="drag-handle" draggable="true" title="Arrossega per reordenar">⠿</span>
      <span class="stu-avatar" style="--hue:${avatarHue(name)}">${esc(studentInitials(name))}</span>
      <span class="stu-name" translate="no">${esc(name)}</span>
      <button class="stu-menu-btn" type="button" aria-label="Opcions de l'alumne">⋮</button>
    </div>`;
  tr.dataset.email = data.email || '';

  td.querySelector('.stu-menu-btn').addEventListener('click', e => {
    e.stopPropagation();
    openStudentMenu(e.currentTarget, [
      ['edit', 'Editar nom'],
      ['email', tr.dataset.email ? 'Canviar email' : 'Introduir email'],
      ['send', 'Enviar notes'],
      ['delete', 'Eliminar', 'danger']
    ], action => studentRowAction(action, studentId, tr));
  });

  const handle = td.querySelector('.drag-handle');
  handle.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', studentId);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setDragImage(tr, 20, 20); } catch (_) {}
    tr.classList.add('dragging');
  });
  handle.addEventListener('dragend', () => {
    tr.classList.remove('dragging');
    notesTbody.querySelectorAll('.drop-target').forEach(r => r.classList.remove('drop-target'));
  });
  tr.addEventListener('dragover', e => { e.preventDefault(); tr.classList.add('drop-target'); });
  tr.addEventListener('dragleave', () => tr.classList.remove('drop-target'));
  tr.addEventListener('drop', e => {
    e.preventDefault();
    tr.classList.remove('drop-target');
    const fromId = e.dataTransfer.getData('text/plain');
    const fromIdx = classStudents.indexOf(fromId);
    const toIdx = classStudents.indexOf(studentId);
    if (fromIdx < 0 || toIdx < 0) return;
    reorderStudents(fromIdx, toIdx);
  });
  return td;
}

// Menú desplegable únic (posició fixa perquè la taula té scroll i el retallaria)
function openStudentMenu(anchor, items, onPick) {
  let m = document.getElementById('stuRowMenu');
  if (!m) {
    m = document.createElement('div');
    m.id = 'stuRowMenu';
    m.className = 'app-dropdown hidden';
    document.body.appendChild(m);
    document.addEventListener('click', () => m.classList.add('hidden'));
    window.addEventListener('scroll', () => m.classList.add('hidden'), true);
  }
  m.innerHTML = items.map(([k, label, cls]) =>
    `<button type="button" data-act="${k}" class="${cls || ''}">${esc(label)}</button>`).join('');
  m.onclick = e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    m.classList.add('hidden');
    onPick(b.dataset.act);
  };
  const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; // mode compacte (portàtil)
  const r = anchor.getBoundingClientRect();
  m.classList.remove('hidden');
  m.style.position = 'fixed';
  m.style.top = Math.min(r.bottom / z + 4, window.innerHeight / z - m.offsetHeight - 8) + 'px';
  m.style.left = Math.max(8, Math.min(r.left / z, window.innerWidth / z - m.offsetWidth - 8)) + 'px';
}

async function studentRowAction(action, studentId, tr) {
  const name = tr.querySelector('.stu-name')?.textContent || '';
  if (action === 'edit') {
    const newName = await promptDialog('Introdueix el nou nom:', name, { title: 'Editar alumne' });
    if (!newName || newName.trim() === name) return;
    db.collection('alumnes').doc(studentId).update({ nom: newName.trim() })
      .then(() => loadClassData())
      .catch(e => notify('Error editant alumne: ' + e.message, 'error'));
  } else if (action === 'email') {
    const newMail = await promptDialog('Introdueix l\'email de ' + name + ':', tr.dataset.email || '', { title: 'Email de l\'alumne' });
    if (!newMail) return;
    await db.collection('alumnes').doc(studentId).update({ email: newMail.trim() });
    tr.dataset.email = newMail.trim();
    notify('Email guardat.');
  } else if (action === 'send') {
    sendNotesTo([studentId]);
  } else if (action === 'delete') {
    removeStudent(studentId);
  }
}

// Menú de la capçalera «Alumne»
function openStudentHeadMenu(anchor) {
  openStudentMenu(anchor, [
    ['add', 'Afegir alumne'],
    ['import', 'Importar alumnes'],
    ['send', 'Enviar notes (massiu)'],
    ['delete', 'Eliminar alumnes (massiu)', 'danger']
  ], a => {
    if (a === 'add') openModal('modalAddStudent');
    else if (a === 'import') openModal('modalImportAL');
    else setStudentMode(a);
  });
}

document.getElementById('btnStudentsMenu')?.addEventListener('click', e => { e.stopPropagation(); openStudentHeadMenu(e.currentTarget); });

function setStudentMode(mode) {
  _studentMode = mode;
  applyStudentMode();
}

// (Re)pinta checkboxes i barra d'accions segons el mode actiu
function applyStudentMode() {
  const rows = [...notesTbody.querySelectorAll('tr[data-student-id]')];
  rows.forEach(tr => {
    const cell = tr.querySelector('.stu-cell');
    if (!cell) return;
    let cb = cell.querySelector('.stu-check');
    if (_studentMode && !cb) {
      cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'stu-check';
      cell.insertBefore(cb, cell.firstChild);
    } else if (!_studentMode && cb) {
      cb.remove();
    }
    const mb = cell.querySelector('.stu-menu-btn');
    if (mb) mb.style.visibility = _studentMode ? 'hidden' : '';
  });

  document.getElementById('studentsModeBar')?.remove();
  if (!_studentMode) return;

  const bar = document.createElement('div');
  bar.id = 'studentsModeBar';
  bar.className = _studentMode === 'delete' ? 'mode-bar danger' : 'mode-bar';
  bar.innerHTML = `
    <label><input type="checkbox" id="stuCheckAll"> Tots</label>
    <span class="mode-hint">${_studentMode === 'delete' ? 'Selecciona els alumnes a eliminar' : 'Selecciona els alumnes als quals enviar les notes'}</span>
    <button type="button" id="stuModeGo" class="btn ${_studentMode === 'delete' ? 'btn-danger' : 'btn-primary'}">${_studentMode === 'delete' ? 'Eliminar' : 'Enviar notes'}</button>
    <button type="button" id="stuModeCancel" class="btn btn-ghost">Cancel·lar</button>`;
  document.getElementById('gridWrapper').before(bar);

  bar.querySelector('#stuCheckAll').addEventListener('change', e => {
    notesTbody.querySelectorAll('.stu-check').forEach(c => { c.checked = e.target.checked; });
  });
  bar.querySelector('#stuModeCancel').addEventListener('click', () => setStudentMode(null));
  bar.querySelector('#stuModeGo').addEventListener('click', async () => {
    const ids = [...notesTbody.querySelectorAll('.stu-check:checked')]
      .map(c => c.closest('tr')?.dataset.studentId).filter(Boolean);
    if (!ids.length) { notify('No hi ha alumnes seleccionats.'); return; }
    if (_studentMode === 'delete') {
      if (!await confirmDialog(`Eliminar ${ids.length} alumne${ids.length === 1 ? '' : 's'}? Aquesta acció no es pot desfer.`, { title: 'Eliminar alumnes', okText: 'Sí, eliminar', danger: true })) return;
      try {
        await deleteStudentsByIds(ids);
        setStudentMode(null);
        loadClassData();
      } catch (e) { notify('Error eliminant alumnes: ' + e.message, 'error'); }
    } else {
      await sendNotesTo(ids);
      setStudentMode(null);
    }
  });
}

/* ---------------- Notes Grid amb menú activitats ---------------- */
let _gridCalculated = {};
async function renderNotesGrid() {
  // Neteja taula
  notesThead.innerHTML = '';
  notesTbody.innerHTML = '';
  notesTfoot.innerHTML = '';
  formulaTfoot.innerHTML = '';

  // Capçalera alumne
  const headRow = document.createElement('tr');
  const thName = th('');
  thName.innerHTML = `<div class="th-student"><span>Alumne</span><small id="studentsCount"></small><button type="button" id="stuHeadMenuBtn" class="opt-btn" aria-label="Opcions d'alumnes"><span class="lbl">Opcions</span><span class="ic-dots" aria-hidden="true">⋯</span></button></div>`;
  thName.querySelector('#stuHeadMenuBtn').addEventListener('click', e => { e.stopPropagation(); openStudentHeadMenu(e.currentTarget); });
  headRow.appendChild(thName);

  // ⚡ OPTIMITZACIÓ: Llançar totes les lectures en paral·lel (classDoc + actDocs + studentDocs)
  // Abans: 3 rondes sequencials → ara: 1 sola ronda concurrent
  const [classDoc, actDocs, studentDocs] = await Promise.all([
    db.collection('classes').doc(currentClassId).get(),
    Promise.all(classActivities.map(id => db.collection('activitats').doc(id).get())),
    Promise.all(classStudents.map(id => db.collection('alumnes').doc(id).get()))
  ]);

  if (!classDoc.exists) return;
  const classData = classDoc.data();
  const calculatedActs = classData.calculatedActivities || {};

  // Capçalera activitats amb icona refresh i candau
  actDocs.forEach(adoc => {
    const id = adoc.id;
    const name = adoc.exists ? (adoc.data().nom || 'Sense nom') : 'Desconegut';

    const thEl = th('');
    const container = document.createElement('div');
    container.className = 'flex items-center justify-between';

    const spanName = document.createElement('span');
    spanName.className = 'act-name';
    spanName.textContent = name;
    thEl.dataset.activityId = id;

   // Candau
const lockIcon = document.createElement('span');
lockIcon.className = 'lock-icon cursor-pointer mr-1';
lockIcon.innerHTML = calculatedActs[id]?.locked ? LOCK_SVG : UNLOCK_SVG;
lockIcon.title = calculatedActs[id]?.locked ? 'Activitat bloquejada' : 'Activitat desbloquejada';

// Amaguem el candau si és una activitat calculada
if (calculatedActs[id]?.calculated) {
    lockIcon.classList.add('hidden');
}

lockIcon.addEventListener('click', async () => {
  try {
    const newLockState = !calculatedActs[id]?.locked;

    // Guardar a Firestore
    await db.collection('classes').doc(currentClassId).update({
      // assegurem que l'objecte existeixi i calculem la propietat
      [`calculatedActivities.${id}.locked`]: newLockState
    });

    // Si no existia l'entrada a local, la creem per evitar undefined errors
    if (!calculatedActs[id]) calculatedActs[id] = {};
    calculatedActs[id].locked = newLockState;

    // 🔥 Afegir aquesta línia perquè la UI es torni a generar amb l’estat correcte
await renderNotesGrid();

    // Actualitzar icona
    lockIcon.innerHTML = newLockState ? LOCK_SVG : UNLOCK_SVG;
    lockIcon.title = newLockState ? 'Activitat bloquejada' : 'Activitat desbloquejada';

    // Estat de bloqueig real (si és calculada, també bloquejada)
    const locked = newLockState || Boolean(calculatedActs[id]?.calculated);

    // Actualitzar inputs IMMEDIATAMENT (sense esperar un render complet)
    document.querySelectorAll(`tr[data-student-id]`).forEach(tr => {
      const input = tr.querySelector(`input[data-activity-id="${id}"]`);
      if (!input) return;

      // Usem readOnly en lloc de disabled per no trencar reactivitat/estils
      input.readOnly = locked;

      // mantenim els colors de fons CRÍTIC: no sobreescrivim si ja té classes de color
      // si vols marcar visualment bloquejat, afegeix una classe mínima que no sobreescrigui colors
      if (locked) {
  input.disabled = true;
  input.classList.add('blocked-cell');
} else {
  input.disabled = false;
  input.classList.remove('blocked-cell');
}

      // Reapliquem la coloració basada en valor (applyCellColor) perquè no es perdin estils
      applyCellColor(input);
    });

    // Opcional: si vols re-renderitzar tota la taula per altres canvis, crida renderNotesGrid()
    // renderNotesGrid();
  } catch (e) {
    console.error('Error canviant bloqueig:', e);
    notify('Error canviant bloqueig: ' + e.message);
  }
});




    const recalcColumn = async () => {
      const formulasRow = formulaTfoot.querySelector('.formulas-row');
      if (!formulasRow) return;
      const idx = Array.from(headRow.children).indexOf(thEl);
      const formulaTd = formulasRow.children[idx];
      if (!formulaTd) return;
      const formulaText = formulaTd.textContent.trim();
      if (!formulaText) return notify('No hi ha cap fórmula aplicada a aquesta activitat.');

      try {
        // Aplicar fórmula a tots els alumnes i esperar que es guardi
        await Promise.all(classStudents.map(async sid => {
          const result = await evalFormulaAsync(formulaText, sid);
          if (result === null) return; // no es pot calcular per a aquest alumne
          await saveNote(sid, id, result);
        }));

        // Quan acabi, actualitzem la vista i reapliquem colors
        await renderNotesGrid();
      } catch(err) {
        console.error('Error recalculant fórmula:', err);
        notify('Error recalculant la fórmula: ' + err.message);
      }
    };

    const menuDiv = document.createElement('div');
    menuDiv.className = 'relative';
    menuDiv.innerHTML = `
      <button class="menu-btn opt-btn tooltip" type="button" aria-label="Opcions de l'activitat"><span class="dots-v" aria-hidden="true">⋮</span><span class="lbl">Opcions</span><span class="ic-dots" aria-hidden="true">⋯</span></button>
      <div class="menu hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 border rounded shadow z-10">
        <button class="edit-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Editar</button>
        <button class="delete-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Eliminar</button>
        <button class="calc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Càlcul</button>
        ${calculatedActs[id]?.calculated ? '<button class="recalc-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Recalcular fórmula</button>' : ''}
        <button class="clear-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700">Netejar</button>
      </div>
    `;

    container.prepend(lockIcon);
    container.appendChild(spanName);
    container.appendChild(menuDiv);
    thEl.appendChild(container);
    headRow.appendChild(thEl);

    // Estil per capçaleres calculades
    if (calculatedActs[id]?.calculated) {
      thEl.style.backgroundColor = "#dbeafe";
      thEl.style.borderBottom = "3px solid #1d4ed8";
      thEl.style.color = "black";
    }

    // Menú activitat
    const menuBtn = menuDiv.querySelector('.menu-btn');
    const menu = menuDiv.querySelector('.menu');
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden'));
      menu.classList.toggle('hidden');
    });

    menuDiv.querySelector('.edit-btn').addEventListener('click', async () => {
      const newName = await promptDialog('Nou nom activitat:', name);
      if (!newName || newName.trim() === name) return;
      db.collection('activitats').doc(id).update({ nom: newName.trim() }).then(() => renderNotesGrid());
    });

    menuDiv.querySelector('.recalc-btn')?.addEventListener('click', () => { menu.classList.add('hidden'); recalcColumn(); });

    menuDiv.querySelector('.clear-btn').addEventListener('click', async () => {
      if (!await confirmDialog('Segur que vols esborrar totes les notes d’aquesta activitat?')) return;
      try {
        await Promise.all(classStudents.map(sid => saveNote(sid, id, '')));
        await db.collection('classes').doc(currentClassId).update({
          [`calculatedActivities.${id}`]: firebase.firestore.FieldValue.delete()
        });
        renderNotesGrid();
      } catch(e) {
        console.error('Error netejant notes:', e);
        notify('Error netejant les notes: ' + e.message);
      }
    });

menuDiv.querySelector('.delete-btn').addEventListener('click', () => {
  confirmAction('Eliminar activitat', 'Esborrar activitat i totes les notes relacionades?', async () => {
    try {
      await deleteActivityCascade(id);
      loadClassData();
    } catch(e) {
      notify('Error esborrant activitat: ' + e.message);
    }
  });
});

    menuDiv.querySelector('.calc-btn').addEventListener('click', () => openCalcModal(id));

  });

  headRow.appendChild(th('Comentaris', 'text-center'));
  notesThead.appendChild(headRow);

  enableActivityDrag();

  if (classStudents.length === 0) {
    notesTbody.innerHTML = `<tr><td class="p-3 text-sm text-gray-400" colspan="${classActivities.length + 2}">No hi ha alumnes</td></tr>`;
    renderAverages();
    return;
  }

  studentDocs.forEach(sdoc => {
    const studentId = sdoc.id;
    const studentData = sdoc.exists ? sdoc.data() : { nom: 'Desconegut', notes: {} };

    const tr = document.createElement('tr');
    tr.dataset.studentId = studentId;

    const tdName = buildStudentCell(tr, studentId, studentData);
    tr.appendChild(tdName);

    // Per cada activitat afegim la cel·la i l'input
    actDocs.forEach(actDoc => {
      const actId = actDoc.id;
      const rawVal = (studentData.notes && studentData.notes[actId] !== undefined) ? studentData.notes[actId] : '';
      const val = (rawVal !== '' && !isNaN(Number(rawVal))) ? Math.round(Number(rawVal) * 10) / 10 : rawVal;

      const td = document.createElement('td');
      td.className = 'border px-2 py-1';

      if (calculatedActs[actId]?.calculated) {
        td.style.backgroundColor = "#dbeafe"; // capçalera blava i cel·la alguna cosa similar
      }

      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 10;
      input.step = 0.1;
      input.value = val;
      input.dataset.activityId = actId;
      input.className = 'table-input text-center rounded border p-1';

      // Estat bloquejat si és calculada o hi ha lock
      const isLocked = !!(calculatedActs[actId]?.locked) || !!(calculatedActs[actId]?.calculated);
      input.disabled = isLocked;
      // 🔥 IMPORTANT: Afegir la classe visual persistent
if (isLocked) {
    input.classList.add('blocked-cell');
} else {
    input.classList.remove('blocked-cell');
}

      // Reaplica color sempre (això evita que quedi en gris)
      applyCellColor(input);

      // HANDLER: quan l'usuari canvia la nota, fem un save i actualitzem UI només quan saveNote acaba.
      if (!isLocked) {
        input.addEventListener('input', () => {
          // color en viu mentre escriu
          applyCellColor(input);
        });

        input.addEventListener('change', async (e) => {
          const newVal = e.target.value;
          try {
            // Opcional: desactivar l'input mentre guardem per evitar múltiples clicks ràpids
            input.disabled = true;

            // Guardem la nota a Firestore (await)
            await saveNote(studentId, actId, newVal);

            // Quan ja està guardada: reapliquem color (i recalculs locals ràpids)
            applyCellColor(input);

            // Actualitza mitjanes i mitjanes per activitat (local)
            renderAverages();

            // Si vols forçar refresc de columnes calculades relatives, pots cridar updateCalculatedCells()
            // updateCalculatedCells(); // opcional

          } catch (err) {
            console.error('Error guardant nota:', err);
            notify('Error guardant la nota: ' + err.message);
          } finally {
            // Tornem a aplicar disabled si la columna està bloquejada ara
            const nowLocked = !!(calculatedActs[actId]?.locked) || !!(calculatedActs[actId]?.calculated);
            input.disabled = nowLocked;
          }
        });
      } else {
        // Si està bloquejat, però vols que el color reflecteixi el valor actual, ja està feta applyCellColor()
        // No afegim handlers
      }

// 🔽 Navegació amb Enter, Shift+Enter i fletxes
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();

        const currentAct = input.dataset.activityId;
        const currentStudent = tr.dataset.studentId;

        // Trobar la fila actual
        const rows = Array.from(notesTbody.querySelectorAll('tr[data-student-id]'));
        const rowIndex = rows.findIndex(r => r.dataset.studentId === currentStudent);

        const nextRowIndex = e.shiftKey ? rowIndex - 1 : rowIndex + 1;

        if (rows[nextRowIndex]) {
            const nextInput = rows[nextRowIndex].querySelector(`input[data-activity-id="${currentAct}"]`);
            if (nextInput && !nextInput.disabled) nextInput.focus();
        }
    }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); // evita increment automàtic
}
    // 🔼 Fletxa amunt
    if (e.key === 'ArrowUp') {
        const rows = Array.from(notesTbody.querySelectorAll('tr[data-student-id]'));
        const rowIndex = rows.findIndex(r => r.dataset.studentId === tr.dataset.studentId);
        if (rows[rowIndex - 1]) {
            const nextInput = rows[rowIndex - 1].querySelector(`input[data-activity-id="${input.dataset.activityId}"]`);
            if (nextInput && !nextInput.disabled) nextInput.focus();
        }
    }

    // 🔽 Fletxa avall
    if (e.key === 'ArrowDown') {
        const rows = Array.from(notesTbody.querySelectorAll('tr[data-student-id]'));
        const rowIndex = rows.findIndex(r => r.dataset.studentId === tr.dataset.studentId);
        if (rows[rowIndex + 1]) {
            const nextInput = rows[rowIndex + 1].querySelector(`input[data-activity-id="${input.dataset.activityId}"]`);
            if (nextInput && !nextInput.disabled) nextInput.focus();
        }
    }
});


      
      td.appendChild(input);
      tr.appendChild(td);
    });
    
    //----------------------------------------- Comentarios
    const commentTd = document.createElement('td');
    commentTd.className = 'border px-2 py-1 text-left cursor-pointer hover:bg-yellow-100 transition-colors';
    commentTd.style.maxWidth = '150px';
    commentTd.style.overflow = 'hidden';
    commentTd.style.textOverflow = 'ellipsis';
    commentTd.style.whiteSpace = 'nowrap';
    
    // Obtener comentario guardado
    const activeTermId = Terms.getActiveTermId();
    const comment = getStudentComment(studentData, currentClassId, activeTermId);
    const displayComment = comment || 'Sense comentari';
    
    // Crear un contenedor para ocultar el cálculo pero mostrar el comentario
    commentTd.innerHTML = `<span class="cm-cell${comment ? '' : ' empty'}">${ICON_CHAT}<span>${esc(displayComment)}</span></span>`;
    commentTd.title = comment || 'Fes clic per afegir comentari';
    
    // Click para abrir modal de comentarios
    commentTd.addEventListener('click', () => {
      openCommentsModal(studentId, studentData.nom, comment, activeTermId);
    });
    
    tr.appendChild(commentTd);

    
    notesTbody.appendChild(tr);

  });

 // Final: recalculs de mitjanes i fila fórmules (igual que abans)
  renderAverages();
  _gridCalculated = calculatedActs;
  const cnt = document.getElementById('studentsCount');
  if (cnt) cnt.textContent = `(${classStudents.length})`;
  applyStudentMode();
  const meta = document.getElementById('classMeta');
  if (meta) meta.textContent = `${classStudents.length} alumnes · ${classActivities.length} activitats`;
  const badge = document.getElementById('classBadge');
  if (badge) badge.innerHTML = classVisual(document.getElementById('classTitle').textContent).svg;
  window.dispatchEvent(new CustomEvent('grid-rendered', { detail: { classId: currentClassId } }));
}

// Funció per actualitzar cel·les calculades sense recrear tota la taula
//--------------nou per incloure buscador am filtre
const gridStudentSearch = document.getElementById('gridStudentSearch');
gridStudentSearch.addEventListener('input', () => {
  const filter = gridStudentSearch.value.toLowerCase();
  notesTbody.querySelectorAll('tr').forEach(tr => {
    const studentName = (tr.querySelector('.stu-name')?.textContent || tr.children[0].textContent).toLowerCase();
    tr.style.display = studentName.includes(filter) ? '' : 'none';
  });
});



/* ---------------- Helpers Notes & Excel ---------------- */
function th(txt, cls=''){
  const el = document.createElement('th');
  el.className = 'border px-2 py-1 ' + cls;
  el.textContent = txt;
  return el;
}

// Canvia saveNote perquè NO re-renderitzi la taula
function saveNote(studentId, activityId, value){
  let num = value === '' ? null : Number(value);
  if (num !== null && !isNaN(num)) num = Math.round(num * 10) / 10; // màxim 1 decimal
  const updateObj = {};
  if(num === null || isNaN(num)) updateObj[`notes.${activityId}`] = firebase.firestore.FieldValue.delete();
  else updateObj[`notes.${activityId}`] = num;

  return db.collection('alumnes').doc(studentId).update(updateObj)
    .catch(e=> { showSaveError(e); throw e; });
}


function applyCellColor(inputEl){
  const v = Number(inputEl.value);
  inputEl.classList.remove('cell-red','cell-yellow','cell-lgreen','cell-green');
  if(inputEl.value === '' || isNaN(v)) return;
  const th = window.AvaluConfig?.get().th || { red: 5, yellow: 7, green: 9 };
  if(v < th.red) inputEl.classList.add('cell-red');
  else if(v < th.yellow) inputEl.classList.add('cell-yellow');
  else if(v < th.green) inputEl.classList.add('cell-lgreen');
  else inputEl.classList.add('cell-green');
}

// 🔥 CORRECCIÓN EN renderAverages() - Ignorar columna de comentarios
function renderAverages(){
  // Actualitzar mitjanes alumnes
  //Array.from(notesTbody.children).forEach(tr=>{
   // const inputs = Array.from(tr.querySelectorAll('input')).map(i=> Number(i.value)).filter(v=> !isNaN(v));
  //  const lastTd = tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 1];
  //  lastTd.textContent = inputs.length ? (inputs.reduce((a,b)=>a+b,0)/inputs.length).toFixed(2) : '';
 // });

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
    const inputs = Array.from(notesTbody.querySelectorAll('tr')).map(r => r.querySelectorAll('input')[i]).filter(Boolean);
    const vals = inputs.map(inp => Number(inp.value)).filter(v=> !isNaN(v));
    const avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '';
    const td = document.createElement('td');
    td.className = 'border px-2 py-1 text-center font-semibold';
    td.textContent = avg;
    trAvg.appendChild(td);
  }
  trAvg.appendChild(th('',''));
  notesTfoot.appendChild(trAvg);

  // ----------------- Fila fórmules -----------------
  const trForm = document.createElement('tr');
  trForm.className = 'formulas-row text-sm bg-gray-100';
  const td0 = document.createElement('td');
  td0.textContent = 'Fórmula';
  td0.className = 'border px-2 py-1 font-medium text-center';
  trForm.appendChild(td0);

  // Llegim fórmules de Firestore
  db.collection('classes').doc(currentClassId).get().then(doc=>{
    if(!doc.exists) return;
    const calculatedActs = doc.data().calculatedActivities || {};

    for(let i=0;i<actCount;i++){
      const actId = classActivities[i];
      const td = document.createElement('td');
      td.className = 'border px-2 py-1 text-center font-medium';
      td.textContent = calculatedActs[actId]?.formula || '';
      trForm.appendChild(td);
    }

    const tdLast = document.createElement('td');
    tdLast.textContent = '';
    tdLast.className = 'border px-2 py-1 text-center font-medium';
    trForm.appendChild(tdLast);

    formulaTfoot.appendChild(trForm);
  });
}





/* ============================================================
   MODAL CÁLCULO - Con Asistente de Fórmulas Mejorado
   ============================================================ */

let _classData = null;
let _selectedTermForFormula = null;
let _activityNameMap = {}; // 🔥 mapa id -> nom per al camp visual de fórmules

function openCalcModal(activityId){
  currentCalcActivityId = activityId; 
  openModal('modalCalc');
  document.getElementById('calcType').value = 'numeric';
  document.querySelectorAll('#calcSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === 'numeric'));
  document.getElementById('formulaInputs').classList.add('hidden');
  document.getElementById('numericInput').classList.remove('hidden');
  weightedDiv?.classList.add('hidden');
  _wPrefill = null;
  document.getElementById('numericField').value = '';
  document.getElementById('formulaField').value = '';
  _fCaret = null;
  if (document.getElementById('formulaFieldHidden')) document.getElementById('formulaFieldHidden').value = '';
  _selectedTermForFormula = null;
  
  // 🔥 NUEVO: Limpiar validación
  clearFormulaValidation();
}

/* ---------------- Mitjana ponderada ---------------- */
const weightedDiv = document.getElementById('weightedInputs');
let _wRows = [];        // [{id, name, on, w}]
let _wPrefill = null;   // pesos per recuperar en editar {activitatId: pes}
const _wColors = ['#534AB7', '#7F77DD', '#AFA9EC', '#CECBF6', '#0F6E56', '#5DCAA5', '#BA7517', '#EF9F27'];
const _wFmt = n => String(Math.round(n * 100) / 100).replace('.', ',');
const _wTotal = () => _wRows.filter(r => r.on).reduce((s, r) => s + (Number(r.w) || 0), 0);

async function buildWeighted() {
  const ids = [...classActivities].filter(id => id !== currentCalcActivityId);
  const docs = await Promise.all(ids.map(id => db.collection('activitats').doc(id).get()));
  const prefill = _wPrefill; _wPrefill = null;
  _wRows = docs.filter(d => d.exists).map(d => ({ id: d.id, name: d.data().nom || '?', on: false, w: 0 }));
  if (prefill) _wRows.forEach(r => { if (prefill[r.id] != null) { r.on = true; r.w = Number(prefill[r.id]); } });
  renderWeighted();
}

function renderWeighted() {
  const list = document.getElementById('wList');
  if (!list) return;
  list.innerHTML = '';
  if (!_wRows.length) { list.innerHTML = '<p class="muted" style="padding:.6rem 0">Cap activitat en aquest període.</p>'; updateWeightedSummary(); return; }
  _wRows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'w-row' + (r.on ? '' : ' off');
    row.innerHTML = `<input type="checkbox" ${r.on ? 'checked' : ''} aria-label="Inclou">
      <span class="w-name" translate="no">${esc(r.name)}</span>
      <span class="w-pct"><input type="number" min="0" max="100" step="any" inputmode="decimal" value="${r.on ? r.w : ''}" placeholder="—" aria-label="Pes en %"> %</span>`;
    const cb = row.querySelector('input[type=checkbox]');
    const num = row.querySelector('input[type=number]');
    cb.addEventListener('change', () => {
      r.on = cb.checked;
      if (r.on && !Number(r.w)) r.w = Math.max(0, Math.round((100 - _wTotal()) * 100) / 100);   // omple el que falta fins a 100
      if (!r.on) r.w = 0;
      renderWeighted();
    });
    num.addEventListener('input', () => { r.w = Math.max(0, Number(num.value) || 0); updateWeightedSummary(); });
    list.appendChild(row);
  });
  updateWeightedSummary();
}

function updateWeightedSummary() {
  const on = _wRows.filter(r => r.on);
  const total = _wTotal();
  const ok = on.length > 0 && Math.abs(total - 100) < 0.01;
  const bar = document.getElementById('wBar');
  bar.innerHTML = on.filter(r => r.w > 0).map((r, i) => `<i style="width:${Math.min(100, r.w)}%;background:${_wColors[i % _wColors.length]}" title="${esc(r.name)}"></i>`).join('');
  const tot = document.getElementById('wTotal');
  tot.className = 'w-total' + (ok ? '' : ' bad');
  tot.innerHTML = ok
    ? `<span>✓ Total dels pesos</span><span>100 %</span>`
    : `<span>${on.length ? 'Els pesos sumen ' + _wFmt(total) + ' %' : 'Marca almenys una activitat'}</span>${on.length ? '<button type="button" id="wFix">Ajusta a 100 %</button>' : ''}`;
  document.getElementById('wFix')?.addEventListener('click', () => {
    const t = _wTotal(); if (!t) return;
    const act = on.filter(r => r.w > 0);
    let acc = 0;
    act.forEach((r, i) => { r.w = i === act.length - 1 ? Math.round((100 - acc) * 100) / 100 : Math.round(r.w * 100 / t * 100) / 100; acc += r.w; });
    renderWeighted();
  });
  const ex = document.getElementById('wExample');
  if (ok) {
    const samples = [8, 7, 9, 6, 5, 10, 7.5, 8.5];
    const act = on.filter(r => r.w > 0);
    const notes = act.map((_, i) => samples[i % samples.length]);
    const res = act.reduce((s, r, i) => s + notes[i] * r.w / 100, 0);
    ex.textContent = `Exemple amb un alumne que té ${notes.map(_wFmt).join(', ')}: nota final ${_wFmt(res)}`;
  } else ex.textContent = '';
}

document.getElementById('wEqual')?.addEventListener('click', () => {
  if (!_wRows.length) return;
  if (!_wRows.some(r => r.on)) _wRows.forEach(r => r.on = true);
  const on = _wRows.filter(r => r.on);
  const each = Math.floor(10000 / on.length) / 100;
  let acc = 0;
  on.forEach((r, i) => { r.w = i === on.length - 1 ? Math.round((100 - acc) * 100) / 100 : each; acc += r.w; });
  renderWeighted();
});

// Obre el modal de càlcul amb la fórmula actual d'una activitat per poder-la modificar
function openFormulaEditor(activityId, displayFormula, rawFormula) {
  openCalcModal(activityId);
  const raw = String(rawFormula ?? '').trim();
  const disp = String(displayFormula ?? raw).trim();
  const setType = t => { calcTypeSelect.value = t; calcTypeSelect.dispatchEvent(new Event('change')); };
  if (/^-?\d+([.,]\d+)?$/.test(raw)) {                       // nota fixa
    setType('numeric');
    numericField.value = raw.replace(',', '.');
    return;
  }
  const wts = _gridCalculated?.[activityId]?.weights;
  if (wts && _gridCalculated[activityId].formula === raw) {      // mitjana ponderada: es reobre amb els seus pesos
    _wPrefill = wts;
    setType('weighted');
    return;
  }
  const rd = disp.match(/^Math\.round\((.+?)(\*2)?\)(\/2)?$/);   // arrodoniment
  if (rd) {
    setType('rounding');
    formulaField.value = rd[2] ? `${rd[1]} 0.5` : rd[1];
    return;
  }
  setType('formula');                                           // fórmula
  formulaField.value = disp;
  if (formulaFieldHidden) formulaFieldHidden.value = raw;
  _fCaret = null;
  validateFormula();
}

const calcTypeSelect = document.getElementById('calcType');
// Selector segmentat (Numèric / Fórmula / Arrodoniment) sincronitzat amb el select amagat
function syncCalcSeg() {
  document.querySelectorAll('#calcSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === calcTypeSelect.value));
}
document.querySelectorAll('#calcSeg button').forEach(b => b.addEventListener('click', () => {
  calcTypeSelect.value = b.dataset.v;
  calcTypeSelect.dispatchEvent(new Event('change'));
}));
const numericDiv = document.getElementById('numericInput');
const numericField = document.getElementById('numericField');
const formulaDiv = document.getElementById('formulaInputs');
const formulaField = document.getElementById('formulaField');
const formulaFieldHidden = document.getElementById('formulaFieldHidden'); // 🔥 camp ocult amb IDs reals
const formulaButtonsDiv = document.getElementById('formulaButtons');
const modalApplyCalcBtn = document.getElementById('modalApplyCalcBtn');

// 🔥 NUEVO: Contenedores de validación
let formulaValidationDiv = null;
let formulaPreviewDiv = null;

// Cambio tipo cálculo
calcTypeSelect.addEventListener('change', ()=>{
  syncCalcSeg();
  weightedDiv?.classList.toggle('hidden', calcTypeSelect.value !== 'weighted');
  if(calcTypeSelect.value==='weighted'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.add('hidden');
    buildWeighted();
  } else if(calcTypeSelect.value==='numeric'){
    numericDiv.classList.remove('hidden');
    formulaDiv.classList.add('hidden');
  } else if(calcTypeSelect.value==='formula'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildFormulaButtons(); 
    setupFormulaValidation(); // 🔥 NUEVO
  } else if(calcTypeSelect.value==='rounding'){
    numericDiv.classList.add('hidden');
    formulaDiv.classList.remove('hidden');
    buildRoundingButtons();
  }
});

// ============================================================
// 🔥 NUEVO: Sistema de Validación en Tiempo Real
// ============================================================

function setupFormulaValidation() {
  // Crear contenedores si no existen
  if (!formulaValidationDiv) {
    formulaValidationDiv = document.createElement('div');
    formulaValidationDiv.id = 'formulaValidation';
    formulaValidationDiv.className = 'calc-valid';
    formulaField.parentNode.insertBefore(formulaValidationDiv, formulaField.nextSibling);
  }
  
  if (!formulaPreviewDiv) {
    formulaPreviewDiv = document.createElement('div');
    formulaPreviewDiv.id = 'formulaPreview';
    formulaPreviewDiv.className = 'calc-preview hidden';
    formulaValidationDiv.parentNode.insertBefore(formulaPreviewDiv, formulaValidationDiv.nextSibling);
  }

  // Permetre cursor visible i teclat físic
  formulaField.removeAttribute('readonly');
  // Sense teclat virtual al mòbil: s'escriu només amb els botons (el cursor continua visible)
  formulaField.setAttribute('inputmode', 'none');
  formulaField.setAttribute('autocomplete', 'off');

  if (formulaField.dataset.valInit) return;   // els listeners només es posen una vegada
  formulaField.dataset.valInit = '1';
  formulaField.addEventListener('input', validateFormula);
  ['click', 'keyup', 'select', 'mouseup', 'touchend'].forEach(ev =>
    formulaField.addEventListener(ev, rememberCaret));
  ['paste', 'drop', 'cut'].forEach(ev => formulaField.addEventListener(ev, e => e.preventDefault()));

  formulaField.addEventListener('keydown', e => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      deleteAtCursor();
      return;
    }
    if (['+', '-', '*', '/', '(', ')'].includes(e.key)) {
      e.preventDefault();
      insertAtCursor(e.key);
      return;
    }
    if (e.key === '.' || e.key === ',') {
      e.preventDefault();
      insertAtCursor('.');
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      insertAtCursor(e.key);
      return;
    }
    // Bloquejar qualsevol altra tecla que escrigui text (lletres, etc.)
    if (e.key.length === 1) {
      e.preventDefault();
    }
  });
}
// Posició del cursor recordada: al mòbil, en tocar un botó el camp perd el focus i
// selectionStart pot tornar 0 (feia que «2+5» es convertís en «52+»).
let _fCaret = null;
function rememberCaret() {
  if (document.activeElement === formulaField && formulaField.selectionStart != null) _fCaret = formulaField.selectionStart;
}
function getCaretRange() {
  const len = formulaField.value.length;
  if (document.activeElement === formulaField && formulaField.selectionStart != null && formulaField.selectionStart !== formulaField.selectionEnd)
    return [formulaField.selectionStart, formulaField.selectionEnd];
  let p = _fCaret;
  if (document.activeElement === formulaField && formulaField.selectionStart != null && _fCaret == null) p = formulaField.selectionStart;
  if (p == null || p > len) p = len;
  return [p, p];
}
function clearFormulaValidation() {
  if (formulaValidationDiv) formulaValidationDiv.innerHTML = '';
  if (formulaPreviewDiv) formulaPreviewDiv.classList.add('hidden');
}

function validateFormula() {
  const formula = formulaField.value.trim();
  
  if (!formula) {
    clearFormulaValidation();
    return;
  }

  // Validació visual (noms) - la regex de chars vàlids
  const validation = checkFormulaValidity(formula);
  
  // Mostrar validación
  if (formulaValidationDiv) {
    if (validation.valid) {
      formulaValidationDiv.innerHTML = `<span>✓ Fórmula vàlida</span>`;
      formulaValidationDiv.className = 'calc-valid ok';
      
      // Preview usa el camp ocult (amb IDs) que sí es pot avaluar
      const hidFormula = formulaFieldHidden ? formulaFieldHidden.value : formula;
      showFormulaPreview(hidFormula);
    } else {
      formulaValidationDiv.innerHTML = `<span>${esc(validation.error)}</span>`;
      formulaValidationDiv.className = 'calc-valid bad';
      
      if (formulaPreviewDiv) {
        formulaPreviewDiv.classList.add('hidden');
      }
    }
  }
}

function checkFormulaValidity(formula) {
  // Contar paréntesis
  const openParens = (formula.match(/\(/g) || []).length;
  const closeParens = (formula.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    return {
      valid: false,
      error: `Paréntesis desbalanceados (abrir: ${openParens}, cerrar: ${closeParens})`
    };
  }

  // Validar caracteres permitidos
  const validChars = /^[a-zA-Z0-9+\-*/(). ,áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜñÑçÇ·\[\]_]*$/;
  if (!validChars.test(formula)) {
    return {
      valid: false,
      error: 'Caracteres inválidos detectados'
    };
  }

  // Validar que no termine en operador
  if (/[+\-*/]$/.test(formula.trim())) {
    return {
      valid: false,
      error: 'La fórmula no puede terminar en un operador'
    };
  }

  // Validar operadores duplicados
  if (/[+\-*/]{2,}/.test(formula)) {
    return {
      valid: false,
      error: 'Operadores duplicados detectados'
    };
  }

  return { valid: true, error: null };
}

function showFormulaPreview(formula) {
  if (!formulaPreviewDiv) return;

  // Simular cálculo con valores de ejemplo
  const exampleResult = simulateFormulaWithExamples(formula);
  
  if (exampleResult !== null && !isNaN(exampleResult)) {
    formulaPreviewDiv.innerHTML = `
      Exemple: si tothom tingués un <strong>6</strong>, el resultat seria <strong>${exampleResult.toFixed(1)}</strong>
    `;
    formulaPreviewDiv.classList.remove('hidden');
  }
}

function simulateFormulaWithExamples(formula) {
  // Totes les activitats valen 6 (només per a la previsualització)
  return window.FormulaEngine.evalSafe(formula, () => 6);
}

// ============================================================
// HELPERS (sin cambios)
// ============================================================

async function applyNumeric(val) {
  if (isNaN(val)) throw new Error('Introdueix un número vàlid');
  await Promise.all(classStudents.map(sid => saveNote(sid, currentCalcActivityId, val)));
}

async function applyFormula(formula) {
  if (!formula.trim()) throw new Error('Formula buida');
  
  // Validar antes de aplicar
  const validation = checkFormulaValidity(formula);
  if (!validation.valid) {
    throw new Error('Fórmula inválida: ' + validation.error);
  }
  
  await Promise.all(classStudents.map(async sid => {
    const result = await evalFormulaAsync(formula, sid);
    if (result === null) return; // no es pot calcular per a aquest alumne
    await saveNote(sid, currentCalcActivityId, result);
  }));
}

// Event Listener Principal
modalApplyCalcBtn.addEventListener('click', async () => {
  if (!currentCalcActivityId) return;

  try {
    let formulaText = '';
    let displayFormulaText = '';
    let weights = null;

    switch (calcTypeSelect.value) {
      case 'numeric':
        await applyNumeric(Number(numericField.value));
        formulaText = numericField.value;
        displayFormulaText = numericField.value;
        break;

      case 'formula':
        // 🔥 FIX: Usem el camp ocult (amb IDs) per al càlcul real
        const realFormula = formulaFieldHidden ? formulaFieldHidden.value : formulaField.value;
        await applyFormula(realFormula);
        formulaText = realFormula;
        // 🔥 FIX: Traduir __ACT__id a noms per al displayFormula
        displayFormulaText = formulaField.value; // el camp visual ja té els noms
        break;

      case 'weighted': {
        const sel = _wRows.filter(r => r.on && r.w > 0);
        const tt = s => (window.t ? window.t(s) : s);
        if (!sel.length) throw new Error(tt('Marca almenys una activitat amb pes'));
        const tot = sel.reduce((s, r) => s + r.w, 0);
        if (Math.abs(tot - 100) > 0.01) throw new Error(tt(`Els pesos han de sumar 100 % (ara sumen ${_wFmt(tot)} %). Prem «Ajusta a 100 %».`));
        const k = r => +(r.w / 100).toFixed(4);
        const wf = '(' + sel.map(r => `__ACT__${r.id}*${k(r)}`).join('+') + ')';
        await applyFormula(wf);
        formulaText = wf;
        displayFormulaText = '(' + sel.map(r => `${r.name}*${k(r)}`).join('+') + ')';
        weights = Object.fromEntries(sel.map(r => [r.id, r.w]));
        break;
      }

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
          displayFormula: displayFormulaText,
          ...(weights ? { weights } : {})
        }
      });
    }

    closeModal('modalCalc');
    renderNotesGrid();
  } catch (e) {
    console.error(e);
    notify('Error en aplicar el càlcul: ' + e.message);
  }
});

// Build Formula Buttons (sin cambios respecto a versión anterior)
function buildFormulaButtons(){
  formulaButtonsDiv.innerHTML = '';

  console.log('buildFormulaButtons - _classData:', _classData);
  
  const allTerms = _classData?.terms || {};
  const termIds = Object.keys(allTerms);
  
  console.log('Términos encontrados:', termIds);

  if (termIds.length > 1) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'calc-term-sel';
    selectorContainer.innerHTML = '<label class="calc-label">Activitats de quin període?</label>';

    const termSelect = document.createElement('select');
    termSelect.className = 'pill-select';

    const optionAll = document.createElement('option');
    optionAll.value = '';
    optionAll.textContent = 'Període actual';
    termSelect.appendChild(optionAll);

    termIds.forEach(termId => {
      const opt = document.createElement('option');
      opt.value = termId;
      const termName = allTerms[termId].name || termId;
      opt.textContent = termName;
      termSelect.appendChild(opt);
    });

    termSelect.addEventListener('change', (e) => {
      _selectedTermForFormula = e.target.value || null;
      const currentButtons = formulaButtonsDiv.querySelectorAll('.activity-buttons-container');
      if (currentButtons.length > 0) {
        currentButtons.forEach(btn => btn.remove());
      }
      buildActivityButtons();
    });

    selectorContainer.appendChild(termSelect);
    formulaButtonsDiv.appendChild(selectorContainer);
  }

  // Operadores
  const operatorsContainer = document.createElement('div');
  operatorsContainer.className = 'operators-container kb-row';
  ['+', '-', '*', '/', '(', ')'].forEach(op=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='kb kb-op';
    btn.textContent = op;
    btn.addEventListener('click', ()=> insertAtCursor(op));
    operatorsContainer.appendChild(btn);
  });
  formulaButtonsDiv.appendChild(operatorsContainer);

  // Números
  const numbersContainer = document.createElement('div');
  numbersContainer.className = 'numbers-container kb-row';
  for(let i=0;i<=10;i++){
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='kb kb-num';
    btn.textContent = i;
    btn.addEventListener('click', ()=> insertAtCursor(i));
    numbersContainer.appendChild(btn);
  }
  formulaButtonsDiv.appendChild(numbersContainer);

  // Decimales
  const decimalsContainer = document.createElement('div');
  decimalsContainer.className = 'decimals-container kb-row';
  ['.', ','].forEach(dec=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='kb kb-dec';
    btn.textContent = dec;
    btn.addEventListener('click', ()=> insertAtCursor('.'));
    decimalsContainer.appendChild(btn);
  });
  formulaButtonsDiv.appendChild(decimalsContainer);

  // Backspace
  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='kb kb-back';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', deleteAtCursor);
  formulaButtonsDiv.appendChild(backBtn);

  buildActivityButtons();
}

// 🔥 Insertar en la posición del cursor
// str = text a inserir al camp OCULT (IDs)
// displayStr = text a mostrar al camp VISIBLE (noms). Si és null, usa str.
function insertAtCursor(str, displayStr) {
  str = String(str);   // els dígits arribaven com a número: display.length era undefined → cursor NaN → 0
  const display = displayStr !== undefined ? String(displayStr) : str;
  
  // -- Camp visual (noms) --
  const [startVis, endVis] = getCaretRange();
  const textVis = formulaField.value;
  formulaField.value = textVis.substring(0, startVis) + display + textVis.substring(endVis);
  
  // -- Camp ocult (IDs) --
  // Com que readonly no permet selectionStart fiable per al hidden,
  // mantentem una posició en paral·lel basada en la mateixa lògica
  const textHid = formulaFieldHidden ? formulaFieldHidden.value : '';
  // Calculem quants caràcters hi havia al camp visual abans del cursor
  // i busquem la posició equivalent al camp ocult
  const visBeforeCursor = textVis.substring(0, startVis);
  const hidPos = getHiddenPosition(visBeforeCursor, textHid);
  
  if (formulaFieldHidden) {
    formulaFieldHidden.value = textHid.substring(0, hidPos) + str + textHid.substring(hidPos + (endVis - startVis > 0 ? getSelectionLengthInHidden(textVis, startVis, endVis, textHid) : 0));
  }
  
  // Mover el cursor después del texto insertado
  _fCaret = startVis + display.length;
  try { formulaField.setSelectionRange(_fCaret, _fCaret); } catch {}
  formulaField.focus({ preventScroll: true });
  try { formulaField.setSelectionRange(_fCaret, _fCaret); } catch {}
  _fCaret = startVis + display.length;
  
  validateFormula();
}

// Calcula la posició al camp ocult corresponent a un prefix del camp visual
function getHiddenPosition(visPrefix, hidValue) {
  // Anem reconstruint el visual a partir del hidden per trobar on estem
  let hidIdx = 0;
  let visBuilt = '';
  
  // Substituïm __ACT__id pel nom corresponent al mapa
  // Recorrem el hidden i anem construint el visual
  while (hidIdx < hidValue.length && visBuilt.length < visPrefix.length) {
    const remaining = hidValue.substring(hidIdx);
    const actMatch = remaining.match(/^__ACT__([a-zA-Z0-9_]+)/);
    if (actMatch) {
      const actId = actMatch[1];
      const actName = _activityNameMap[actId] || actMatch[0];
      if (visBuilt.length + actName.length <= visPrefix.length) {
        visBuilt += actName;
        hidIdx += actMatch[0].length;
      } else {
        break;
      }
    } else {
      visBuilt += hidValue[hidIdx];
      hidIdx++;
    }
  }
  return hidIdx;
}

function getSelectionLengthInHidden(visText, visStart, visEnd, hidValue) {
  const visBefore = visText.substring(0, visStart);
  const visSelected = visText.substring(visStart, visEnd);
  const hidStart = getHiddenPosition(visBefore, hidValue);
  const hidEnd = getHiddenPosition(visBefore + visSelected, hidValue);
  return hidEnd - hidStart;
}

// 🔥 Borrar el último token al cursor (si és __ACT__id esborra tot el token)
function deleteAtCursor() {
  const start = getCaretRange()[0];
  if (start > 0) {
    const visText = formulaField.value;
    const hidText = formulaFieldHidden ? formulaFieldHidden.value : '';
    
    // Trobar el token al final del visual (pot ser un nom d'activitat o un caràcter)
    // Busquem si el text visual que acaba al cursor correspon a un nom d'activitat
    let tokenToDeleteVis = 1; // per defecte 1 caràcter
    let tokenToDeleteHid = 1;
    
    // Comprovar si el cursor acaba just després d'un nom d'activitat
    const visBefore = visText.substring(0, start);
    for (const [actId, actName] of Object.entries(_activityNameMap)) {
      if (actName && visBefore.endsWith(actName)) {
        tokenToDeleteVis = actName.length;
        tokenToDeleteHid = `__ACT__${actId}`.length;
        break;
      }
    }
    
    formulaField.value = visText.substring(0, start - tokenToDeleteVis) + visText.substring(start);
    
    if (formulaFieldHidden) {
      const hidPos = getHiddenPosition(visBefore, hidText);
      formulaFieldHidden.value = hidText.substring(0, hidPos - tokenToDeleteHid) + hidText.substring(hidPos);
    }
    
    _fCaret = start - tokenToDeleteVis;
    try { formulaField.setSelectionRange(_fCaret, _fCaret); } catch {}
    formulaField.focus({ preventScroll: true });
    try { formulaField.setSelectionRange(_fCaret, _fCaret); } catch {}
    _fCaret = start - tokenToDeleteVis;
    
    validateFormula();
  }
}

function buildActivityButtons(){
  console.log('buildActivityButtons - _selectedTermForFormula:', _selectedTermForFormula);

  const activitiesContainer = document.createElement('div');
  activitiesContainer.className = 'activity-buttons-container mb-2 p-2 bg-indigo-50 rounded';

  let activitiesToShow = [];

  if (_selectedTermForFormula && _classData?.terms?.[_selectedTermForFormula]) {
    activitiesToShow = _classData.terms[_selectedTermForFormula].activities || [];
  } else {
    activitiesToShow = classActivities;
  }

  if (activitiesToShow.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-sm text-gray-600 text-center';
    emptyMsg.textContent = 'Cap activitat en aquesta pestanya';
    activitiesContainer.appendChild(emptyMsg);
  } else {
    activitiesToShow.forEach(aid => {
      db.collection('activitats').doc(aid).get().then(doc => {
        if (!doc.exists) return;
        const name = doc.data().nom;
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='chip-act';
        
        let buttonText = name;
        if (_selectedTermForFormula) {
          const termName = _classData.terms[_selectedTermForFormula].name;
          buttonText = `[${termName}] ${name}`;
        }
        btn.textContent = buttonText;
        btn.title = `ID: ${aid}`; // tooltip per depurar si cal
        
        // 🔥 FIX: Guardem el nom al mapa per poder fer backspace intel·ligent
        _activityNameMap[aid] = name;
        
        // 🔥 FIX: Visible = nom, Ocult = __ACT__id
        btn.addEventListener('click', () => insertAtCursor(`__ACT__${aid}`, name));
        activitiesContainer.appendChild(btn);
      });
    });
  }

  formulaButtonsDiv.appendChild(activitiesContainer);
}

function buildRoundingButtons(){
  formulaButtonsDiv.innerHTML = '';

  const allTerms = _classData?.terms || {};
  const termIds = Object.keys(allTerms);

  if (termIds.length > 1) {
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'calc-term-sel';
    selectorContainer.innerHTML = '<label class="calc-label">Activitats de quin període?</label>';

    const termSelect = document.createElement('select');
    termSelect.className = 'pill-select';

    const optionAll = document.createElement('option');
    optionAll.value = '';
    optionAll.textContent = 'Període actual';
    termSelect.appendChild(optionAll);

    termIds.forEach(termId => {
      const opt = document.createElement('option');
      opt.value = termId;
      opt.textContent = allTerms[termId].name || termId;
      termSelect.appendChild(opt);
    });

    termSelect.addEventListener('change', (e) => {
      _selectedTermForFormula = e.target.value || null;
      const currentActivities = formulaButtonsDiv.querySelectorAll('.rounding-activities-container');
      if (currentActivities.length > 0) {
        currentActivities.forEach(act => act.remove());
      }
      buildRoundingActivityButtons();
    });

    selectorContainer.appendChild(termSelect);
    formulaButtonsDiv.appendChild(selectorContainer);
  }

  const roundingValuesContainer = document.createElement('div');
  roundingValuesContainer.className = 'rounding-values-container kb-row';
  [0.5, 1].forEach(v => {
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='kb kb-num';
    btn.textContent = v;
    btn.addEventListener('click', () => insertAtCursor(v));
    roundingValuesContainer.appendChild(btn);
  });
  formulaButtonsDiv.appendChild(roundingValuesContainer);

  const backBtn = document.createElement('button');
  backBtn.type='button';
  backBtn.className='kb kb-back';
  backBtn.textContent = '⌫';
  backBtn.addEventListener('click', deleteAtCursor);
  formulaButtonsDiv.appendChild(backBtn);

  buildRoundingActivityButtons();
}

function buildRoundingActivityButtons(){
  const activitiesContainer = document.createElement('div');
  activitiesContainer.className = 'rounding-activities-container chip-box';

  let activitiesToShow = [];

  if (_selectedTermForFormula && _classData?.terms?.[_selectedTermForFormula]) {
    activitiesToShow = _classData.terms[_selectedTermForFormula].activities || [];
  } else {
    activitiesToShow = classActivities;
  }

  if (activitiesToShow.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-sm text-gray-600 text-center';
    emptyMsg.textContent = 'Cap activitat en aquesta pestanya';
    activitiesContainer.appendChild(emptyMsg);
  } else {
    activitiesToShow.forEach(aid => {
      db.collection('activitats').doc(aid).get().then(doc => {
        if (!doc.exists) return;
        const name = doc.data().nom;
        const btn = document.createElement('button');
        btn.type='button';
        btn.className='chip-act';
        
        let buttonText = name;
        if (_selectedTermForFormula) {
          const termName = _classData.terms[_selectedTermForFormula].name;
          buttonText = `[${termName}] ${name}`;
        }
        btn.textContent = buttonText;
        
        btn.addEventListener('click', () => insertAtCursor(name));
        activitiesContainer.appendChild(btn);
      });
    });
  }

  formulaButtonsDiv.appendChild(activitiesContainer);
}

// Retorna un número finit, o null si la fórmula no es pot avaluar per a aquest alumne
// (p. ex. divisió per zero). Llença error si la fórmula és sintàcticament invàlida.
let _legacyNamesCache = null;
window.addEventListener('grid-rendered', () => { _legacyNamesCache = null; });
async function evalFormulaAsync(formula, studentId){
  const studentDoc = await db.collection('alumnes').doc(studentId).get();
  const notes = studentDoc.exists ? studentDoc.data().notes || {} : {};

  // Fórmules antigues escrites amb NOMS d'activitat: els convertim a marcadors __ACT__id
  let src = formula;
  if (!/__ACT__/.test(src)) {
    // Mapa nom→id calculat UNA vegada (abans: A lectures per CADA alumne)
    if (!_legacyNamesCache || _legacyNamesCache.classId !== currentClassId) {
      const classId = currentClassId;
      const p = (async () => {
        const allIds = new Set();
        Object.values(_classData?.terms || {}).forEach(t => (t.activities || []).forEach(a => allIds.add(a)));
        classActivities.forEach(a => allIds.add(a));
        const docs = await Promise.all([...allIds].map(aid => db.collection('activitats').doc(aid).get()));
        const list = [];
        docs.forEach(d => { if (d.exists && d.data().nom) list.push({ aid: d.id, nom: d.data().nom }); });
        list.sort((x, y) => y.nom.length - x.nom.length); // noms llargs primer
        return list;
      })();
      _legacyNamesCache = { classId, p };   // es guarda la promesa: les crides concurrents la comparteixen
    }
    const named = await _legacyNamesCache.p;
    named.forEach(({ aid, nom }) => {
      src = src.split(nom).join('__ACT__' + aid);
    });
  }

  const resolve = id => { const v = Number(notes[id]); return isNaN(v) ? 0 : v; };
  window.FormulaEngine.evaluate(src, resolve); // llença si és invàlida
  return window.FormulaEngine.evalSafe(src, resolve);
}

// ============================================================
// FIN MODAL CÁLCULO
// ============================================================




// ---------------- Helper per trobar nom alumne per ID ----------------
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

      // 🔥 Guardar el nou ordre a Firestore
      if(currentClassId){
  const path = `terms.${Terms.getActiveTerm()}.activities`;
  db.collection('classes').doc(currentClassId).update({ [path]: classActivities })
    .then(() => console.log('Ordre d’activitats actualitzat a Firestore'))
    .catch(e => console.error('Error guardant ordre activitats', e));
}


      renderNotesGrid();
    });
  });
}




/* ---------------- Tancar menús si fas clic fora ---------------- */
document.addEventListener('click', function(e) {
  document.querySelectorAll('.menu').forEach(menu => {
    if (!menu.contains(e.target) && !e.target.classList.contains('menu-btn')) {
      menu.classList.add('hidden');
    }
  });
});
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenu = document.getElementById('userMenu');
// Menú d'usuari
userMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  userMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => {
  userMenu.classList.add('hidden');
});

// ---------------------- Importar alumnes ------------------------
document.getElementById('btnImportALConfirm').addEventListener('click', () => {
  const fileInput = document.getElementById('fileImport');
  const file = fileInput.files[0];
  if (!file) return notify("Selecciona un fitxer!");

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

    if(studentNames.length === 0) return notify('No s’ha trobat cap alumne al fitxer.');

    // Cridar funció per afegir alumnes a Firestore i classe
    await addImportedStudents(studentNames);

    closeModal('modalImportAL');
  };

  if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file);
  else reader.readAsText(file);
});

// Funció per afegir alumnes a Firestore i a la classe
// ⚡ OPTIMITZACIÓ: Batch write en lloc de bucle seqüencial
// Abans: 2 crides Firestore per alumne (set + update) en sèrie → N*2 rondes
// Ara: 1 batch.commit() per tots els alumnes + 1 update de la classe = 2 crides totals
async function addImportedStudents(names) {
  if (!currentClassId) return notify('No hi ha cap classe seleccionada.');

  const classRef = db.collection('classes').doc(currentClassId);

  try {
    // Firestore batch té límit de 500 operacions → dividim si cal
    const BATCH_SIZE = 490;
    const chunks = [];
    for (let i = 0; i < names.length; i += BATCH_SIZE) {
      chunks.push(names.slice(i, i + BATCH_SIZE));
    }

    const allStudentIds = [];

    for (const chunk of chunks) {
      const batch = db.batch();
      const chunkIds = [];

      // Crear tots els documents d'alumnes en un sol batch
      chunk.forEach(name => {
        const studentRef = db.collection('alumnes').doc();
        batch.set(studentRef, { nom: name, notes: {}, ownerUid: professorUID });
        chunkIds.push(studentRef.id);
      });

      // Un sol commit per tot el chunk
      await batch.commit();
      allStudentIds.push(...chunkIds);
    }

    // Una sola actualització per afegir tots els IDs a la classe
    await classRef.update({
      alumnes: firebase.firestore.FieldValue.arrayUnion(...allStudentIds)
    });

    // Recarregar la graella perquè apareguin amb menú i drag & drop
    loadClassData();

    notify(`${names.length} alumne(s) importat(s) correctament!`);
  } catch(e) {
    console.error(e);
    notify('Error afegint alumnes: ' + e.message);
  }
}

// ----------------------Fer funcionar el botó + (afegir terme)
const btnAddTerm = document.getElementById('btnAddTerm');
btnAddTerm.addEventListener('click', async () => {
  const name = await promptDialog('Nom del nou període (p. ex. 2TRIM):', window.AvaluConfig?.nextTermName() || '');
  if(!name) return;
  try {
    const newId = await Terms.addNewTermWithName(name);
    // Quan acaba, Terms ja cridarà l'onChange que actualitza la graella i el dropdown
  } catch(e) {
    console.error('Error creant terme:', e);
    notify('Error creant terme: ' + e.message);
  }
});

const btnAddTerm2 = document.getElementById('btnAddTerm2');
btnAddTerm2.addEventListener('click', async () => {
  const name = await promptDialog('Nom del nou període (p. ex. 2TRIM):', window.AvaluConfig?.nextTermName() || '');
  if(!name) return;
  try {
    const newId = await Terms.addNewTermWithName(name);
    // Quan acaba, Terms ja cridarà l'onChange que actualitza la graella i el dropdown
  } catch(e) {
    console.error('Error creant terme:', e);
    notify('Error creant terme: ' + e.message);
  }
});

// Botó de menú de graella
const termMenuBtn = document.getElementById('termMenuBtn');
const termMenu = document.getElementById('termMenu');

termMenuBtn.addEventListener('click', e => {
  e.stopPropagation();
  termMenu.classList.toggle('hidden');
});

// Tancar menú si clicques fora
document.addEventListener('click', () => {
  termMenu.classList.add('hidden');
});

// Editar nom de graella
termMenu.querySelector('.edit-term-btn').addEventListener('click', async () => {
  const currentTermId = Terms.getActiveTermId();
  const currentName = Terms.getActiveTermName();
  const newName = await promptDialog('Nou nom de la graella:', currentName);
  if (newName && newName.trim() !== '') {
    await Terms.renameTerm(currentTermId, newName.trim());
  }
  termMenu.classList.add('hidden');
});

// Eliminar graella
termMenu.querySelector('.delete-term-btn').addEventListener('click', async () => {
  const currentTermId = Terms.getActiveTermId();
  if (!currentTermId) return;
  if (!await confirmDialog('Segur que vols eliminar aquesta graella i totes les seves activitats?')) return;

  try {
    await Terms.deleteTerm(currentTermId); // <-- Aquí utilitzem la funció de terms.js
  } catch(e) {
    notify('Error eliminant graella: ' + e.message);
  }

  termMenu.classList.add('hidden');
});

// Copiar estructura
termMenu.querySelector('.copy-structure-btn').addEventListener('click', () => {
  const currentTermId = Terms.getActiveTermId();
  if (!currentTermId) return;
  Terms.copyGridStructure(currentTermId);
  notify('Estructura copiada!');
  termMenu.classList.add('hidden');
});

// Enganxar estructura
termMenu.querySelector('.paste-structure-btn').addEventListener('click', async () => {
  const currentTermId = Terms.getActiveTermId();
  if (!currentTermId) return;

  await Terms.pasteGridStructure(currentTermId);
  notify('Estructura enganxada a la graella!');
  termMenu.classList.add('hidden');
});

// Exportar graella
termMenu.querySelector('.export-structure-btn').addEventListener('click', exportExcel);
async function exportExcel(){
  if(!currentClassId) return notify('No hi ha cap classe seleccionada.');

  try {
    // Carregar informació de la classe
    const classDoc = await db.collection('classes').doc(currentClassId).get();
    if(!classDoc.exists) return notify('Classe no trobada.');
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
        if(val !== '') { sum += val; count++; }
      });

      row.push(count ? (sum/count).toFixed(1) : '');
      ws_data.push(row);
    });

    // Crear llibre Excel i full
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Notes');

    // Nom del fitxer
    const fname = (document.getElementById('classTitle').textContent || 'classe') + '.xlsx';
    XLSX.writeFile(wb, fname);

  } catch(e){
    console.error(e);
    notify('Error exportant Excel: ' + e.message);
  }
}


// ----------- SCRIPT PER MARCAR USUARIS COM A ADMIN -----------
// ELIMINAT: setAdmins() s'ha mogut al panell d'administrador (administrador.js)
// ja que requeria permisos de 'list' sobre /professors que no tenen usuaris normals.

// Funció per formatar les notes d’un alumne per enviar per mail------------------------------

async function formatStudentNotesForEmail(studentId) {
  const doc = await db.collection('alumnes').doc(studentId).get();
  if (!doc.exists) return 'No hi ha dades.';

  const data = doc.data();
  const notes = data.notes || {};

  let lines = [];

  for (const actId of classActivities) {
    let actName = actId;

    try {
      const aDoc = await db.collection('activitats').doc(actId).get();
      if (aDoc.exists) actName = aDoc.data().nom || actId;
    } catch {}

    const val = notes[actId] ?? '';
    lines.push(`${actName}: ${val}`);
  }

 // if (typeof computeStudentAverageText === "function") {
  //  lines.push(`Mitjana: ${computeStudentAverageText(data)}`);
 // }

  return lines.join('\n');
}

//-------Enviar notes (a un o diversos alumnes, per id)
async function sendNotesTo(ids) {
  if (!ids.length) { notify('Selecciona algun alumne.'); return; }
  let sent = 0;
  const failed = [];
  for (const studentId of ids) {
    const tr = notesTbody.querySelector(`tr[data-student-id="${CSS.escape(studentId)}"]`);
    if (!tr) continue;
    const name = tr.querySelector('.stu-name')?.textContent || '';
    let email = tr.dataset.email || '';

    // Si no hi ha email → demanar-lo
    if (!email) {
      const newMail = await promptDialog(`Email per ${name}:`, '', { title: 'Email de l\'alumne' });
      if (!newMail) continue;
      email = newMail.trim();
      tr.dataset.email = email;
      await db.collection('alumnes').doc(studentId).update({ email });
    }

    const C = window.AvaluConfig, cf = C?.get() || {};
    const vars = { nom: name, classe: _classData?.nom || '' };
    let body = await formatStudentNotesForEmail(studentId);
    if (cf.intro) body = C.fill(cf.intro, vars) + '\n\n' + body;
    if (cf.signatura) body += '\n\n' + cf.signatura;
    try {
      await gmailSendEmail(email, C ? C.fill(cf.assumpte || 'Notes de {nom}', vars) : `Notes de ${name}`, body);
      sent++;
    } catch (e) {
      console.error(e);
      failed.push(`${name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  notify(failed.length
    ? `⚠️ Enviats: ${sent}. Han fallat ${failed.length}:\n` + failed.join('\n')
    : `Correus enviats correctament: ${sent}`);
}

//-----------Funció per ENVIAR MAIL directament des del Gmail de l’usuari----------------
// El permís de Gmail es demana NOMÉS quan s'envia (no a cada login) i el token es renova
// automàticament quan caduca. Token separat del de Classroom.
const GMAIL_CLIENT_ID = '324570393360-2ib4925pbobfbggu8t0nnj14q5n414nv.apps.googleusercontent.com';
let _gmailToken = null;      // { token, expiresAt }

function getGmailToken() {
  if (_gmailToken && Date.now() < _gmailToken.expiresAt - 60000) return Promise.resolve(_gmailToken.token);
  return new Promise((resolve, reject) => {
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      return reject(new Error('Google Identity Services no està carregat'));
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GMAIL_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/gmail.send',
      callback: (r) => {
        if (r && r.access_token) {
          _gmailToken = { token: r.access_token, expiresAt: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
          resolve(_gmailToken.token);
        } else {
          reject(new Error((r && r.error) || 'No s\'ha obtingut permís per enviar correus'));
        }
      },
      error_callback: (e) => reject(new Error((e && e.message) || 'Permís de Gmail cancel·lat'))
    });
    client.requestAccessToken({ prompt: _gmailToken ? '' : 'consent' });
  });
}

const _b64 = (str) => btoa(unescape(encodeURIComponent(str)));
const _b64url = (str) => _b64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Retorna true si s'ha enviat; llença Error si no (sense alert: ho gestiona qui crida)
async function gmailSendEmail(to, subject, message) {
  to = String(to || '').trim();
  subject = String(subject || '');
  // Evitar injecció de capçaleres (salts de línia) i adreces invàlides
  if (/[\r\n]/.test(to) || /[\r\n]/.test(subject)) throw new Error('Capçalera invàlida');
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(to)) throw new Error(`Email invàlid: ${to}`);

  const token = await getGmailToken();

  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${_b64(subject)}?=`,       // assumpte codificat (accents, ç, ·...)
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    _b64(String(message || '')).replace(/(.{76})/g, '$1\r\n')
  ].join('\r\n');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: _b64url(mime) })
  });
  if (response.status === 401) { _gmailToken = null; throw new Error('Permís de Gmail caducat, torna-ho a provar'); }
  if (!response.ok) throw new Error('Gmail ha respost ' + response.status + ': ' + (await response.text()));
  return true;
}

// Globals que altres mòduls ja esperaven (abans mai s'assignaven)
window.loadClassData = loadClassData;
window.renderNotesGrid = renderNotesGrid;
window.applyCellColor = applyCellColor;

window.showSaveError = showSaveError;

// ---------------- API pública per a la resta de mòduls ----------------
// Substitueix els window.currentClassId & cia. que ningú assignava, i els
// MutationObserver/setInterval: els mòduls escolten 'grid-rendered' i consulten aquesta API.
window.AvaluApp = {
  getActiveTermId: () => Terms.getActiveTermId(),
  getTerms: () => Object.entries(_classData?.terms || {}).map(([id, t]) => ({ id, name: t.name || id })),
  getTermName: termName,
  getComment: (sd, classId, termId) => getStudentComment(sd, classId, termId),
  getCommentTermId: () => currentCommentTermId || Terms.getActiveTermId() || null,
  openClass: (id, tab) => openClass(id, tab),
  getClassId: () => currentClassId,
  getClassData: () => _classData,
  getClasses: () => _classCache.map(c => ({ id: c.id, nom: c.data.nom || 'Sense nom' })),
  refreshPending: () => computePendingComments(),
  getCalculatedActivities: () => _gridCalculated,
  getStudentIds: () => Array.from(classStudents),
  getActivityIds: () => Array.from(classActivities),
  editFormula: (id, display, raw) => openFormulaEditor(id, display, raw)
};
