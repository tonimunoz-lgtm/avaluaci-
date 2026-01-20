// backup-injector.js - Sistema de Backup (Guardado en Firestore)
// Funciona en index.html Y en administrador.html

console.log('✅ backup-injector.js cargado');

const BACKUP_CONFIG = {
  BACKUP_INTERVAL: 24 * 60 * 60 * 1000,
  MAX_BACKUPS: 30
};

// ============================================================
// COMPRIMIR JSON (Para ahorrar espacio)
// ============================================================

function compressJSON(obj) {
  const json = JSON.stringify(obj);
  // Eliminar espacios y saltos de línea
  return json.replace(/\s+/g, '');
}

function decompressJSON(compressed) {
  return JSON.parse(compressed);
}

// ============================================================
// SISTEMA DE LOGS
// ============================================================

async function logChange(action, data) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const professorUID = window.professorUID;
    if (!professorUID) return;

    await db.collection('logs').add({
      timestamp: firebase.firestore.Timestamp.now(),
      professorId: professorUID,
      action: action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      details: data.details || {}
    });

    console.log('📝 Log registrado:', action);
  } catch (err) {
    console.error('Error registrando log:', err);
  }
}

// ============================================================
// EXPORTAR DATOS
// ============================================================

async function exportAllClassData(classId) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) throw new Error('Firebase no disponible');

    const classDoc = await db.collection('classes').doc(classId).get();
    if (!classDoc.exists) throw new Error('Clase no encontrada');

    const classData = classDoc.data();
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      classId: classId,
      class: classData,
      activities: {},
      students: {},
      terms: {}
    };

    if (classData.activitats && classData.activitats.length > 0) {
      for (const actId of classData.activitats) {
        const actDoc = await db.collection('activitats').doc(actId).get();
        if (actDoc.exists) {
          backup.activities[actId] = { id: actId, ...actDoc.data() };
        }
      }
    }

    if (classData.alumnes && classData.alumnes.length > 0) {
      for (const stuId of classData.alumnes) {
        const stuDoc = await db.collection('alumnes').doc(stuId).get();
        if (stuDoc.exists) {
          backup.students[stuId] = { id: stuId, ...stuDoc.data() };
        }
      }
    }

    if (classData.terms) {
      backup.terms = classData.terms;
    }

    return backup;
  } catch (err) {
    console.error('Error exportando datos:', err);
    throw err;
  }
}

// ============================================================
// GUARDAR BACKUP EN FIRESTORE (No usa Storage)
// ============================================================

async function saveBackupToFirestore(classId, backupData) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) throw new Error('Firestore no disponible');

    console.log('📦 Guardando backup en Firestore...');

    // Comprimir JSON para ahorrar espacio
    const compressed = compressJSON(backupData);
    const backupSize = new Blob([compressed]).size;

    const backupRecord = {
      classId: classId,
      className: backupData.class.nom,
      timestamp: firebase.firestore.Timestamp.now(),
      data: compressed, // JSON comprimido
      fileSize: backupSize,
      itemCount: {
        activities: Object.keys(backupData.activities).length,
        students: Object.keys(backupData.students).length
      }
    };

    // Guardar en subcollección backups
    const docRef = await db.collection('backups').add(backupRecord);

    console.log('✅ Backup guardado en Firestore:', docRef.id);

    await cleanOldBackups(classId);

    return docRef.id;
  } catch (err) {
    console.error('Error guardando backup:', err);
    throw err;
  }
}

// ============================================================
// LIMPIAR BACKUPS ANTIGUOS
// ============================================================

async function cleanOldBackups(classId) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const snapshot = await db.collection('backups')
      .where('classId', '==', classId)
      .orderBy('timestamp', 'desc')
      .get();

    const backups = snapshot.docs;

    if (backups.length > BACKUP_CONFIG.MAX_BACKUPS) {
      const toDelete = backups.slice(BACKUP_CONFIG.MAX_BACKUPS);

      for (const doc of toDelete) {
        await db.collection('backups').doc(doc.id).delete();
      }

      console.log(`🗑️ Eliminados ${toDelete.length} backups antiguos`);
    }
  } catch (err) {
    console.error('Error limpiando backups:', err);
  }
}

// ============================================================
// BACKUP AUTOMÁTICO
// ============================================================

function setupAutoBackup() {
  if (!window.professorUID) {
    setTimeout(setupAutoBackup, 1000);
    return;
  }

  console.log('⏰ Configurando backups automáticos (cada 24 horas)');

  setInterval(async () => {
    await performDailyBackup();
  }, BACKUP_CONFIG.BACKUP_INTERVAL);

  // No ejecutar inmediatamente para que la app esté lista
  setTimeout(performDailyBackup, 10000);
}

async function performDailyBackup() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db || !window.professorUID) return;

    console.log('🔄 Iniciando backup diario automático...');

    const classesDoc = await db.collection('professors').doc(window.professorUID).get();
    if (!classesDoc.exists) return;

    const classIds = classesDoc.data().classes || [];

    for (const classId of classIds) {
      try {
        const backupData = await exportAllClassData(classId);
        await saveBackupToFirestore(classId, backupData);

        await logChange('auto_backup_created', {
          resourceType: 'class',
          resourceId: classId,
          resourceName: backupData.class.nom,
          details: {
            activities: Object.keys(backupData.activities).length,
            students: Object.keys(backupData.students).length
          }
        });
      } catch (err) {
        console.error(`Error backup ${classId}:`, err);
      }
    }

    console.log('✅ Backup diario completado');
  } catch (err) {
    console.error('Error en backup diario:', err);
  }
}

// ============================================================
// LISTAR BACKUPS
// ============================================================

async function listBackupsForClass(classId) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return [];

    const snapshot = await db.collection('backups')
      .where('classId', '==', classId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    }));
  } catch (err) {
    console.error('Error listando backups:', err);
    return [];
  }
}

// ============================================================
// RESTAURAR DESDE BACKUP
// ============================================================

async function restoreFromBackup(backupId, classId) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) throw new Error('Firestore no disponible');

    console.log('📥 Iniciando restauración...');

    const backupDoc = await db.collection('backups').doc(backupId).get();
    if (!backupDoc.exists) throw new Error('Backup no encontrado');

    const backupInfo = backupDoc.data();
    
    // Descomprimir JSON
    const backupData = decompressJSON(backupInfo.data);

    if (!confirm(`¿Restaurar ${backupInfo.className} desde ${new Date(backupInfo.timestamp.toDate()).toLocaleString()}?\n\nEsto SOBRESCRIBIRÁ todos los datos actuales.`)) {
      return false;
    }

    console.log('⏳ Restaurando datos...');

    await db.collection('classes').doc(classId).update(backupData.class);

    for (const [actId, actData] of Object.entries(backupData.activities)) {
      const { id, ...data } = actData;
      await db.collection('activitats').doc(actId).set(data);
    }

    for (const [stuId, stuData] of Object.entries(backupData.students)) {
      const { id, ...data } = stuData;
      await db.collection('alumnes').doc(stuId).set(data);
    }

    await logChange('backup_restored', {
      resourceType: 'class',
      resourceId: classId,
      resourceName: backupInfo.className,
      details: {
        backupId: backupId,
        backupDate: backupInfo.timestamp.toDate().toISOString()
      }
    });

    console.log('✅ Restauración completada');
    alert('✅ Datos restaurados correctamente. La página se recargará.');
    
    setTimeout(() => location.reload(), 1000);
    return true;

  } catch (err) {
    console.error('Error restaurando:', err);
    alert('❌ Error: ' + err.message);
    return false;
  }
}

// ============================================================
// HISTORIAL DE CAMBIOS
// ============================================================

async function getChangeHistory(resourceId, limit = 50) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return [];

    const snapshot = await db.collection('logs')
      .where('resourceId', '==', resourceId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    }));
  } catch (err) {
    console.error('Error historial:', err);
    return [];
  }
}

// ============================================================
// DETECTAR SI ESTAMOS EN ADMIN O USUARIO
// ============================================================

function isAdminPage() {
  return window.location.pathname.includes('administrador') || document.body.classList.contains('admin-page');
}

// ============================================================
// INYECTAR EN PÁGINA DE USUARIO
// ============================================================

function injectBackupButtonUserPage() {
  const userMenu = document.getElementById('userMenu');
  if (!userMenu) {
    setTimeout(injectBackupButtonUserPage, 500);
    return;
  }

  // Obtener UID directamente de Firebase Auth
  const auth = window.firebase?.auth?.();
  if (!auth) {
    setTimeout(injectBackupButtonUserPage, 1000);
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('⏳ Esperando autenticación...');
    setTimeout(injectBackupButtonUserPage, 1000);
    return;
  }

  checkIfAdmin(currentUser.uid).then(isAdmin => {
    console.log('🔐 checkIfAdmin result:', isAdmin);
    
    if (!isAdmin) {
      console.log('👤 No es admin');
      return;
    }

    if (userMenu.querySelector('.backup-btn')) {
      console.log('✅ Botón ya existe');
      return;
    }

    const backupBtn = document.createElement('button');
    backupBtn.className = 'backup-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700';
    backupBtn.innerHTML = '📦 Backups';
    backupBtn.addEventListener('click', () => {
      openBackupModal();
      userMenu.classList.add('hidden');
    });

    const children = Array.from(userMenu.children);
    if (children.length > 0) {
      userMenu.insertBefore(backupBtn, children[children.length - 1]);
    } else {
      userMenu.appendChild(backupBtn);
    }

    console.log('✅ Botón de backup inyectado correctamente');
  });
}

async function checkIfAdmin(uid) {
  try {
    const db = window.firebase?.firestore?.();
    
    if (!db || !uid) {
      console.error('❌ DB o UID no disponible');
      return false;
    }

    console.log('🔍 Verificando admin para UID:', uid);

    const userDoc = await db.collection('professors').doc(uid).get();
    
    if (!userDoc.exists) {
      console.warn('⚠️ Documento de profesor no existe');
      return false;
    }

    const isAdmin = userDoc.data().isAdmin === true;
    console.log('✅ isAdmin:', isAdmin, 'Datos:', userDoc.data());
    
    return isAdmin;
  } catch (err) {
    console.error('❌ Error verificando admin:', err);
    return false;
  }
}

// ============================================================
// CREAR MODAL
// ============================================================

function createBackupModal() {
  if (document.getElementById('modalBackupInjected')) return;

  const modal = document.createElement('div');
  modal.id = 'modalBackupInjected';
  modal.className = 'fixed inset-0 hidden items-center justify-center z-50 bg-black bg-opacity-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-96 overflow-y-auto p-6">
      
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">📦 Backup y Restauración</h2>
        <button class="closeBackupBtn text-gray-500 hover:text-gray-700 text-2xl">×</button>
      </div>

      <div id="backupTab" class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded p-4">
          <p class="text-sm text-blue-900"><strong>💡</strong> Los backups se crean cada 24 horas automáticamente y se guardan en Firestore.</p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-gray-900 dark:text-white">Backups disponibles:</h3>
          
          <div id="backupsList" class="space-y-2 max-h-64 overflow-y-auto">
            <div class="text-gray-500 text-center py-4">⏳ Cargando...</div>
          </div>
        </div>

        <div class="flex gap-2 mt-4">
          <button class="createBackupBtn flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">
            💾 Crear Backup Ahora
          </button>
          <button class="closeBackupBtn2 flex-1 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-semibold">
            Cerrar
          </button>
        </div>
      </div>

      <div id="historyTab" class="space-y-4 hidden">
        <h3 class="font-semibold text-gray-900 dark:text-white">Últimos cambios:</h3>
        
        <div id="changeList" class="space-y-2 max-h-64 overflow-y-auto">
          <div class="text-gray-500 text-center py-4">⏳ Cargando...</div>
        </div>

        <button class="closeBackupBtn3 w-full bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-semibold">
          Cerrar
        </button>
      </div>

      <div class="flex gap-2 mt-6 border-t pt-4">
        <button class="tabBackupsBtn flex-1 bg-blue-600 text-white px-3 py-2 rounded font-semibold">
          📦 Backups
        </button>
        <button class="tabHistoryBtn flex-1 bg-gray-300 text-black px-3 py-2 rounded font-semibold">
          📋 Historial
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Asignar event listeners al modal
  const closeButtons = modal.querySelectorAll('.closeBackupBtn, .closeBackupBtn2, .closeBackupBtn3');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeBackupModal);
  });

  modal.querySelector('.createBackupBtn').addEventListener('click', createManualBackupBtn);
  modal.querySelector('.tabBackupsBtn').addEventListener('click', () => switchBackupTab('backups'));
  modal.querySelector('.tabHistoryBtn').addEventListener('click', () => switchBackupTab('history'));
}

// ============================================================
// FUNCIONES UI
// ============================================================

function openBackupModal() {
  createBackupModal();
  const modal = document.getElementById('modalBackupInjected');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  loadBackupsUI();
}

function closeBackupModal() {
  const modal = document.getElementById('modalBackupInjected');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function switchBackupTab(tab) {
  const backupTab = document.getElementById('backupTab');
  const historyTab = document.getElementById('historyTab');
  const tabBackupsBtn = document.querySelector('.tabBackupsBtn');
  const tabHistoryBtn = document.querySelector('.tabHistoryBtn');

  if (tab === 'backups') {
    backupTab.classList.remove('hidden');
    historyTab.classList.add('hidden');
    tabBackupsBtn.classList.add('bg-blue-600');
    tabBackupsBtn.classList.remove('bg-gray-300');
    tabHistoryBtn.classList.remove('bg-blue-600');
    tabHistoryBtn.classList.add('bg-gray-300');
    loadBackupsUI();
  } else {
    backupTab.classList.add('hidden');
    historyTab.classList.remove('hidden');
    tabBackupsBtn.classList.remove('bg-blue-600');
    tabBackupsBtn.classList.add('bg-gray-300');
    tabHistoryBtn.classList.add('bg-blue-600');
    tabHistoryBtn.classList.remove('bg-gray-300');
    loadHistoryUI();
  }
}

async function loadBackupsUI() {
  // Obtener currentClassId de app.js
  const classId = window.currentClassId || (typeof currentClassId !== 'undefined' ? currentClassId : null);
  
  if (!classId) {
    console.warn('⚠️ No classId disponible. currentClassId:', window.currentClassId);
    console.warn('Elementos con class-related data:', {
      classTitle: document.getElementById('classTitle')?.textContent,
      screenClassVisible: !document.getElementById('screen-class')?.classList.contains('hidden')
    });
    return;
  }

  const backupsList = document.getElementById('backupsList');
  if (!backupsList) return;

  backupsList.innerHTML = '<div class="text-gray-500 text-center py-4">⏳ Cargando...</div>';

  try {
    const backups = await listBackupsForClass(classId);

    if (backups.length === 0) {
      backupsList.innerHTML = '<div class="text-gray-500 text-center py-4">No hay backups aún</div>';
      return;
    }

    backupsList.innerHTML = '';
    backups.forEach(backup => {
      const date = new Date(backup.timestamp).toLocaleString();
      const sizeKB = (backup.fileSize / 1024).toFixed(2);

      const item = document.createElement('div');
      item.className = 'bg-gray-50 border rounded p-3 flex justify-between items-center';
      
      const infoDiv = document.createElement('div');
      infoDiv.innerHTML = `
        <p class="font-semibold">${date}</p>
        <p class="text-xs text-gray-600">
          ${backup.itemCount.activities} acts · ${backup.itemCount.students} alumnos · ${sizeKB} KB
        </p>
      `;
      
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm';
      restoreBtn.textContent = 'Restaurar';
      restoreBtn.addEventListener('click', () => restoreBackupUI(backup.id, classId));

      item.appendChild(infoDiv);
      item.appendChild(restoreBtn);
      backupsList.appendChild(item);
    });

  } catch (err) {
    backupsList.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
  }
}

async function loadHistoryUI() {
  const classId = window.currentClassId || (typeof currentClassId !== 'undefined' ? currentClassId : null);
  
  if (!classId) {
    console.warn('⚠️ No classId disponible');
    return;
  }

  const changeList = document.getElementById('changeList');
  if (!changeList) return;

  changeList.innerHTML = '<div class="text-gray-500 text-center py-4">⏳ Cargando...</div>';

  try {
    const changes = await getChangeHistory(classId, 20);

    if (changes.length === 0) {
      changeList.innerHTML = '<div class="text-gray-500 text-center py-4">Sin cambios registrados</div>';
      return;
    }

    changeList.innerHTML = '';
    changes.forEach(change => {
      const date = new Date(change.timestamp).toLocaleString();

      const item = document.createElement('div');
      item.className = 'bg-gray-50 border rounded p-3';
      item.innerHTML = `
        <p class="font-semibold text-gray-900">${change.action.replace(/_/g, ' ').toUpperCase()}</p>
        <p class="text-xs text-gray-600 mt-1">${date}</p>
        <p class="text-sm text-gray-700 mt-1">${change.resourceName || change.resourceId}</p>
      `;
      changeList.appendChild(item);
    });

  } catch (err) {
    changeList.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
  }
}

async function createManualBackupBtn() {
  if (!window.currentClassId) {
    alert('❌ No hay clase seleccionada');
    return;
  }

  const btn = document.querySelector('.createBackupBtn');
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = '⏳ Creando...';

  try {
    const backupData = await exportAllClassData(window.currentClassId);
    await saveBackupToFirestore(window.currentClassId, backupData);
    alert('✅ Backup creado correctamente');
    await loadBackupsUI();
  } catch (err) {
    console.error('Error creando backup:', err);
    alert('❌ Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Crear Backup Ahora';
  }
}

async function restoreBackupUI(backupId) {
  if (!window.currentClassId) return;
  await restoreFromBackup(backupId, window.currentClassId);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Usar Firebase Auth directamente
  const auth = window.firebase?.auth?.();
  
  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user && !isAdminPage()) {
        console.log('👤 Usuario autenticado:', user.email);
        console.log('📱 Página de usuario - Inyectando botón...');
        injectBackupButtonUserPage();
      }
    });
  }

  // Iniciar backups de todas formas
  setTimeout(() => {
    setupAutoBackup();
  }, 2000);
});

window.BackupSystemInjector = {
  openBackupModal,
  closeBackupModal,
  switchBackupTab,
  checkIfAdmin
};

console.log('🎓 Backup Injector (Firestore) - Listo');
