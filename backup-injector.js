// backup-injector-firestore.js - PARTE 1 / 6
// ============================================================
// Backup Injector - Firestore Version (sin Storage)
// Compatible con plan gratuito de Firebase
// ============================================================

console.log('✅ backup-injector-firestore.js cargado');

// ============================================================
// CONFIG
// ============================================================

const BackupSystemInjector = {
  backupCollection: 'backups', // colección Firestore para backups
  maxDailyBackups: 7,          // máximo backups por clase
  autoBackupIntervalMs: 24*60*60*1000, // backup diario
  currentUserUid: null,
  currentClassId: null,
  modal: null,
  backupsListDiv: null,
  historyListDiv: null,
  currentTab: 'backups'
};

// ============================================================
// UTIL: generar ID de backup
// ============================================================

function generateBackupId() {
  return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

// ============================================================
// UTIL: formato fecha
// ============================================================

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

// ============================================================
// OBTENER REFERENCIA A BACKUPS DE UNA CLASE
// ============================================================

function getBackupsRef(classId) {
  return firebase.firestore().collection(BackupSystemInjector.backupCollection)
         .doc(classId)
         .collection('history');
}

// ============================================================
// DETECTAR USUARIO Y ACTIVAR BACKUP
// ============================================================

firebase.auth().onAuthStateChanged(user => {
  if(!user) return;
  BackupSystemInjector.currentUserUid = user.uid;

  // Inyectar botón de backup solo si admin
  firebase.firestore().collection('professors').doc(user.uid).get()
    .then(doc => {
      if(doc.exists && doc.data().isAdmin) {
        injectBackupButton();
        setupAutoBackup();
      }
    }).catch(e => console.error('Error detectando admin para backup:', e));
});

// ============================================================
// INYECTAR BOTÓN BACKUP
// ============================================================

function injectBackupButton() {
  const menu = document.getElementById('userMenu');
  if(!menu) return;

  if(document.getElementById('backupBtnInjected')) return;

  const btn = document.createElement('button');
  btn.id = 'backupBtnInjected';
  btn.className = 'w-full text-left px-2 py-1 hover:bg-gray-100';
  btn.textContent = 'Backup 🔄';
  btn.addEventListener('click', openBackupModal);
  menu.appendChild(btn);

  console.log('✅ Botón de backup inyectado en usuario');
}
// ============================================================
// PARTE 2 / 6
// ============================================================

// ============================================================
// FUNCION: abrir modal de backup
// ============================================================

function openBackupModal() {
  if(!BackupSystemInjector.modal) createBackupModal();

  // refrescar lista de backups
  BackupSystemInjector.currentClassId = currentClassId; // usar la clase actual de app.js
  renderBackupsList();

  BackupSystemInjector.modal.style.display = 'flex';
}

// ============================================================
// FUNCION: cerrar modal de backup
// ============================================================

function closeBackupModal() {
  if(!BackupSystemInjector.modal) return;
  BackupSystemInjector.modal.style.display = 'none';
}

// ============================================================
// CREAR MODAL DINÁMICO
// ============================================================

function createBackupModal() {
  const modal = document.createElement('div');
  modal.id = 'backupModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.3);';
  
  modal.innerHTML = `
    <div style="background:white;border-radius:8px;width:90%;max-width:600px;padding:20px;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h2>Backup de Clase</h2>
        <button id="backupModalCloseBtn" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>

      <div style="display:flex;gap:10px;">
        <button id="tabBackupsBtn" class="backup-tab active">Backups</button>
        <button id="tabHistoryBtn" class="backup-tab">Historial</button>
      </div>

      <div id="backupContent" style="flex:1;overflow-y:auto;margin-top:10px;">
        <div id="backupsList"></div>
        <div id="historyList" style="display:none;"></div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
        <button id="createBackupBtn" style="padding:6px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">Crear Backup</button>
        <button id="closeBackupModalBtn" style="padding:6px 12px;background:#f3f4f6;border:none;border-radius:4px;cursor:pointer;">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  BackupSystemInjector.modal = modal;
  BackupSystemInjector.backupsListDiv = document.getElementById('backupsList');
  BackupSystemInjector.historyListDiv = document.getElementById('historyList');

  // event listeners
  modal.querySelector('#backupModalCloseBtn').addEventListener('click', closeBackupModal);
  modal.querySelector('#closeBackupModalBtn').addEventListener('click', closeBackupModal);
  modal.querySelector('#createBackupBtn').addEventListener('click', createManualBackup);

  modal.querySelector('#tabBackupsBtn').addEventListener('click', () => switchBackupTab('backups'));
  modal.querySelector('#tabHistoryBtn').addEventListener('click', () => switchBackupTab('history'));
}

// ============================================================
// FUNCION: cambiar pestañas del modal
// ============================================================

function switchBackupTab(tab) {
  BackupSystemInjector.currentTab = tab;
  const tabs = BackupSystemInjector.modal.querySelectorAll('.backup-tab');
  tabs.forEach(t => t.classList.remove('active'));

  if(tab === 'backups') {
    BackupSystemInjector.backupsListDiv.style.display = 'block';
    BackupSystemInjector.historyListDiv.style.display = 'none';
    BackupSystemInjector.modal.querySelector('#tabBackupsBtn').classList.add('active');
    renderBackupsList();
  } else {
    BackupSystemInjector.backupsListDiv.style.display = 'none';
    BackupSystemInjector.historyListDiv.style.display = 'block';
    BackupSystemInjector.modal.querySelector('#tabHistoryBtn').classList.add('active');
    renderHistoryList();
  }
}

// ============================================================
// FUNCION: render lista de backups
// ============================================================

async function renderBackupsList() {
  if(!BackupSystemInjector.currentClassId) return;
  const listDiv = BackupSystemInjector.backupsListDiv;
  listDiv.innerHTML = '<div>Cargando backups...</div>';

  try {
    const snapshot = await getBackupsRef(BackupSystemInjector.currentClassId).orderBy('timestamp','desc').get();
    if(snapshot.empty) {
      listDiv.innerHTML = '<div>No hay backups aún.</div>';
      return;
    }

    listDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const item = document.createElement('div');
      item.style.cssText = 'border:1px solid #e5e7eb;padding:8px;margin-bottom:6px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;';
      item.innerHTML = `
        <span>${formatDate(data.timestamp.toMillis())} - ${doc.id}</span>
        <div>
          <button class="restoreBackupBtn" data-id="${doc.id}" style="margin-right:5px;padding:2px 6px;background:#10b981;color:white;border:none;border-radius:3px;cursor:pointer;">Restaurar</button>
          <button class="deleteBackupBtn" data-id="${doc.id}" style="padding:2px 6px;background:#ef4444;color:white;border:none;border-radius:3px;cursor:pointer;">Eliminar</button>
        </div>
      `;
      listDiv.appendChild(item);
    });

    // event listeners botones restaurar y eliminar
    listDiv.querySelectorAll('.restoreBackupBtn').forEach(btn => {
      btn.addEventListener('click', () => restoreBackup(btn.dataset.id));
    });
    listDiv.querySelectorAll('.deleteBackupBtn').forEach(btn => {
      btn.addEventListener('click', () => deleteBackup(btn.dataset.id));
    });

  } catch(e) {
    console.error('Error cargando backups:', e);
    listDiv.innerHTML = '<div>Error cargando backups.</div>';
  }
}
// ============================================================
// PARTE 3 / 6
// ============================================================

// ============================================================
// FUNCION: crear backup manual
// ============================================================

async function createManualBackup() {
  if(!BackupSystemInjector.currentClassId) {
    alert('No hay clase seleccionada.');
    return;
  }

  try {
    const backupId = generateBackupId();

    // 🔹 Obtenemos datos actuales de la clase
    const classDoc = await firebase.firestore().collection('classes')
                      .doc(BackupSystemInjector.currentClassId).get();
    if(!classDoc.exists) {
      alert('Clase no encontrada.');
      return;
    }
    const classData = classDoc.data();

    // 🔹 Guardamos backup en Firestore
    await getBackupsRef(BackupSystemInjector.currentClassId)
          .doc(backupId)
          .set({
            timestamp: firebase.firestore.Timestamp.now(),
            data: classData,
            createdBy: BackupSystemInjector.currentUserUid
          });

    console.log(`✅ Backup creado: ${backupId}`);
    alert('Backup creado correctamente.');

    // refrescar lista
    renderBackupsList();

  } catch(e) {
    console.error('Error creando backup:', e);
    alert('Error creando backup: ' + e.message);
  }
}

// ============================================================
// FUNCION: restaurar backup
// ============================================================

async function restoreBackup(backupId) {
  if(!BackupSystemInjector.currentClassId) return;
  const confirmRestore = confirm('⚠️ Esto reemplazará los datos actuales de la clase. ¿Deseas continuar?');
  if(!confirmRestore) return;

  try {
    const doc = await getBackupsRef(BackupSystemInjector.currentClassId).doc(backupId).get();
    if(!doc.exists) {
      alert('Backup no encontrado.');
      return;
    }
    const backupData = doc.data().data;

    // 🔹 Reemplazar datos de la clase
    await firebase.firestore().collection('classes')
          .doc(BackupSystemInjector.currentClassId)
          .set(backupData, { merge: true });

    alert('Backup restaurado correctamente.');
    console.log(`✅ Backup restaurado: ${backupId}`);

    // refrescar la app (llamar renderNotesGrid o similar desde app.js)
    if(typeof renderNotesGrid === 'function') renderNotesGrid();

  } catch(e) {
    console.error('Error restaurando backup:', e);
    alert('Error restaurando backup: ' + e.message);
  }
}

// ============================================================
// FUNCION: eliminar backup
// ============================================================

async function deleteBackup(backupId) {
  if(!BackupSystemInjector.currentClassId) return;
  const confirmDelete = confirm('¿Deseas eliminar este backup permanentemente?');
  if(!confirmDelete) return;

  try {
    await getBackupsRef(BackupSystemInjector.currentClassId)
          .doc(backupId)
          .delete();
    console.log(`✅ Backup eliminado: ${backupId}`);
    renderBackupsList();
  } catch(e) {
    console.error('Error eliminando backup:', e);
    alert('Error eliminando backup: ' + e.message);
  }
}

// ============================================================
// FUNCION: render historial de backups (meta-info)
// ============================================================

async function renderHistoryList() {
  if(!BackupSystemInjector.currentClassId) return;
  const listDiv = BackupSystemInjector.historyListDiv;
  listDiv.innerHTML = '<div>Cargando historial...</div>';

  try {
    const snapshot = await getBackupsRef(BackupSystemInjector.currentClassId).orderBy('timestamp','desc').get();
    if(snapshot.empty) {
      listDiv.innerHTML = '<div>No hay historial de backups.</div>';
      return;
    }

    listDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const item = document.createElement('div');
      item.style.cssText = 'border:1px solid #e5e7eb;padding:6px;margin-bottom:4px;border-radius:4px;';
      item.innerHTML = `
        <span>${formatDate(data.timestamp.toMillis())} - creado por: ${data.createdBy}</span>
      `;
      listDiv.appendChild(item);
    });

  } catch(e) {
    console.error('Error cargando historial de backups:', e);
    listDiv.innerHTML = '<div>Error cargando historial.</div>';
  }
}
// ============================================================
// PARTE 4 / 6
// ============================================================

// ============================================================
// FUNCION: crear backup automático
// ============================================================

async function performAutoBackup() {
  if(!BackupSystemInjector.currentClassId) return;

  try {
    const backupId = generateBackupId();

    // 🔹 Obtener datos actuales de la clase
    const classDoc = await firebase.firestore().collection('classes')
                        .doc(BackupSystemInjector.currentClassId).get();
    if(!classDoc.exists) return;

    const classData = classDoc.data();

    // 🔹 Guardar backup en Firestore
    await getBackupsRef(BackupSystemInjector.currentClassId)
          .doc(backupId)
          .set({
            timestamp: firebase.firestore.Timestamp.now(),
            data: classData,
            createdBy: BackupSystemInjector.currentUserUid
          });

    console.log(`🤖 Backup automático creado: ${backupId}`);

    // 🔹 Limitar backups a maxDailyBackups
    await cleanOldBackups();

  } catch(e) {
    console.error('Error creando backup automático:', e);
  }
}

// ============================================================
// FUNCION: eliminar backups antiguos si excede máximo
// ============================================================

async function cleanOldBackups() {
  if(!BackupSystemInjector.currentClassId) return;

  try {
    const snapshot = await getBackupsRef(BackupSystemInjector.currentClassId)
                        .orderBy('timestamp','desc').get();
    const backups = snapshot.docs;

    if(backups.length <= BackupSystemInjector.maxDailyBackups) return;

    const toDelete = backups.slice(BackupSystemInjector.maxDailyBackups);
    for(const doc of toDelete) {
      await doc.ref.delete();
      console.log(`🗑️ Backup antiguo eliminado: ${doc.id}`);
    }
  } catch(e) {
    console.error('Error limpiando backups antiguos:', e);
  }
}

// ============================================================
// FUNCION: inicializar backup automático diario
// ============================================================

function setupAutoBackup() {
  if(!BackupSystemInjector.currentClassId) return;

  // ejecutar una vez al iniciar
  performAutoBackup();

  // programar backups diarios
  setInterval(() => {
    performAutoBackup();
  }, BackupSystemInjector.autoBackupIntervalMs);
}

// ============================================================
// OBSERVER: detectar cambio de clase y reiniciar auto-backup
// ============================================================

let lastClassId = null;

setInterval(() => {
  if(currentClassId && currentClassId !== lastClassId) {
    lastClassId = currentClassId;
    BackupSystemInjector.currentClassId = currentClassId;
    console.log('🔄 Clase cambiada, reiniciando backup automático.');
    setupAutoBackup();
  }
}, 5000); // cada 5 segundos detectamos cambio de clase
// ============================================================
// PARTE 5 / 6
// ============================================================

// ============================================================
// FUNCION: render mensajes de estado dentro del modal
// ============================================================

function showBackupMessage(msg, type='info') {
  if(!BackupSystemInjector.modal) return;
  let msgDiv = BackupSystemInjector.modal.querySelector('#backupMessageDiv');
  if(!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.id = 'backupMessageDiv';
    msgDiv.style.cssText = 'margin-top:6px;padding:6px;border-radius:4px;';
    BackupSystemInjector.modal.querySelector('div[style*="flex-direction:column"]').prepend(msgDiv);
  }
  msgDiv.textContent = msg;
  msgDiv.style.background = type==='error' ? '#f87171' : '#d1fae5';
  msgDiv.style.color = type==='error' ? 'white' : 'black';
}

// ============================================================
// FUNCION: generar ID único para backup
// ============================================================

function generateBackupId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `backup_${timestamp}_${random}`;
}

// ============================================================
// FUNCION: obtener referencia Firestore de backups
// ============================================================

function getBackupsRef(classId) {
  return firebase.firestore()
          .collection('backups')
          .doc(classId)
          .collection('daily');
}

// ============================================================
// FUNCION: formatear fecha
// ============================================================

function formatDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n) { return n.toString().padStart(2,'0'); }

// ============================================================
// OBSERVER: actualizar lista de backups en tiempo real
// ============================================================

function setupRealtimeBackupsListener() {
  if(!BackupSystemInjector.currentClassId) return;

  // limpiar listener anterior
  if(BackupSystemInjector.unsubscribeBackups) BackupSystemInjector.unsubscribeBackups();

  const ref = getBackupsRef(BackupSystemInjector.currentClassId).orderBy('timestamp','desc');
  BackupSystemInjector.unsubscribeBackups = ref.onSnapshot(snapshot => {
    renderBackupsList();
    renderHistoryList();
  });
}

// ============================================================
// INICIALIZACION DE SISTEMA
// ============================================================

function initBackupInjector() {
  BackupSystemInjector = {
    modal: null,
    currentClassId: currentClassId || null,
    currentUserUid: professorUID || null,
    currentTab: 'backups',
    backupsListDiv: null,
    historyListDiv: null,
    maxDailyBackups: 7,
    autoBackupIntervalMs: 24*60*60*1000, // 24h
    unsubscribeBackups: null
  };

  console.log('🎓 Backup Injector Firestore listo ✅');

  // crear botón en UI
  injectBackupButton();

  // iniciar listener real-time
  setupRealtimeBackupsListener();

  // iniciar backup automático
  setupAutoBackup();
}

// ============================================================
// FUNCION: inyectar botón de backup en la UI
// ============================================================

function injectBackupButton() {
  const btnId = 'btnBackupInjector';
  if(document.getElementById(btnId)) return; // ya existe

  const btn = document.createElement('button');
  btn.id = btnId;
  btn.textContent = 'Backup';
  btn.style.cssText = 'padding:6px 12px;margin-left:10px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;';
  btn.addEventListener('click', openBackupModal);

  // añadir a header o toolbar existente
  const toolbar = document.querySelector('#userMenu') || document.body;
  toolbar.appendChild(btn);

  console.log('✅ Botón de backup inyectado en UI');
}
// ============================================================
// PARTE 6 / 6
// ============================================================

// ============================================================
// FUNCION: abrir modal de backup
// ============================================================

function openBackupModal() {
  if(!BackupSystemInjector.modal) {
    // Crear modal dinámico
    const modal = document.createElement('div');
    modal.id = 'backupModal';
    modal.style.cssText = `
      position: fixed; top:0; left:0; width:100%; height:100%;
      background: rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;
      z-index: 9999;
    `;
    modal.innerHTML = `
      <div style="background:white;padding:20px;border-radius:8px;max-width:500px;width:100%;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h2>Backups de la clase</h2>
          <button id="backupModalClose" style="font-size:20px;border:none;background:none;cursor:pointer;">×</button>
        </div>

        <div style="display:flex;gap:10px;">
          <button id="backupTabBtn">Backups</button>
          <button id="historyTabBtn">Historial</button>
        </div>

        <div id="backupMessageDiv"></div>

        <div id="backupsList" style="max-height:300px;overflow:auto;border:1px solid #e5e7eb;padding:6px;border-radius:4px;"></div>
        <div id="historyList" style="display:none;max-height:300px;overflow:auto;border:1px solid #e5e7eb;padding:6px;border-radius:4px;"></div>

        <div style="display:flex;gap:10px;margin-top:10px;">
          <button id="createBackupBtn" style="flex:1;padding:6px;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;">Crear Backup</button>
          <button id="closeBackupBtn" style="flex:1;padding:6px;background:#f87171;color:white;border:none;border-radius:4px;cursor:pointer;">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    BackupSystemInjector.modal = modal;

    // Elementos
    BackupSystemInjector.backupsListDiv = modal.querySelector('#backupsList');
    BackupSystemInjector.historyListDiv = modal.querySelector('#historyList');

    // Eventos
    modal.querySelector('#backupModalClose').addEventListener('click', closeBackupModal);
    modal.querySelector('#closeBackupBtn').addEventListener('click', closeBackupModal);
    modal.querySelector('#createBackupBtn').addEventListener('click', createManualBackup);
    modal.querySelector('#backupTabBtn').addEventListener('click', () => switchBackupTab('backups'));
    modal.querySelector('#historyTabBtn').addEventListener('click', () => switchBackupTab('history'));
  }

  renderBackupsList();
  renderHistoryList();
  BackupSystemInjector.modal.style.display = 'flex';
}

// ============================================================
// FUNCION: cerrar modal
// ============================================================

function closeBackupModal() {
  if(BackupSystemInjector.modal) BackupSystemInjector.modal.style.display = 'none';
}

// ============================================================
// FUNCION: cambiar pestañas
// ============================================================

function switchBackupTab(tab) {
  BackupSystemInjector.currentTab = tab;
  BackupSystemInjector.backupsListDiv.style.display = tab==='backups' ? 'block' : 'none';
  BackupSystemInjector.historyListDiv.style.display = tab==='history' ? 'block' : 'none';
}

// ============================================================
// FUNCION: renderizar lista de backups
// ============================================================

async function renderBackupsList() {
  if(!BackupSystemInjector.currentClassId || !BackupSystemInjector.backupsListDiv) return;
  const div = BackupSystemInjector.backupsListDiv;
  div.innerHTML = '<div>Cargando backups...</div>';

  try {
    const snapshot = await getBackupsRef(BackupSystemInjector.currentClassId)
                        .orderBy('timestamp','desc')
                        .get();
    if(snapshot.empty) {
      div.innerHTML = '<div>No hay backups disponibles.</div>';
      return;
    }

    div.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const item = document.createElement('div');
      item.style.cssText = 'border:1px solid #e5e7eb;padding:6px;margin-bottom:4px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;';
      item.innerHTML = `
        <span>${formatDate(data.timestamp.toMillis())}</span>
        <div style="display:flex;gap:4px;">
          <button data-id="${doc.id}" class="restoreBtn" style="padding:2px 4px;background:#3b82f6;color:white;border:none;border-radius:3px;cursor:pointer;">Restaurar</button>
          <button data-id="${doc.id}" class="deleteBtn" style="padding:2px 4px;background:#f87171;color:white;border:none;border-radius:3px;cursor:pointer;">Eliminar</button>
        </div>
      `;
      div.appendChild(item);
    });

    // eventos restaurar
    div.querySelectorAll('.restoreBtn').forEach(btn => {
      btn.addEventListener('click', () => restoreBackup(btn.dataset.id));
    });

    // eventos eliminar
    div.querySelectorAll('.deleteBtn').forEach(btn => {
      btn.addEventListener('click', () => deleteBackup(btn.dataset.id));
    });

  } catch(e) {
    console.error('Error renderizando backups:', e);
    div.innerHTML = '<div>Error cargando backups.</div>';
  }
}

// ============================================================
// INICIAR SISTEMA AUTOMATICAMENTE
// ============================================================

setTimeout(() => {
  if(professorUID) {
    BackupSystemInjector.currentUserUid = professorUID;
    BackupSystemInjector.currentClassId = currentClassId || null;
    initBackupInjector();
  }
}, 1000);
