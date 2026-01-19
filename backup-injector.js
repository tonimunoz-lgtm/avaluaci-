// backup-injector.js - Sistema de Backup Automático (Inyector)
// Se ejecuta automáticamente sin modificar archivos existentes

console.log('✅ backup-injector.js cargado - Sistema de Backup Automático');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const BACKUP_CONFIG = {
  BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
  MAX_BACKUPS: 30,
  STORAGE_BUCKET: 'gestornotes-cc6d0.firebasestorage.app'
};

// ============================================================
// 1. SISTEMA DE LOGS
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
      details: data.details || {},
      userAgent: navigator.userAgent
    });

    console.log('📝 Log registrado:', action);
  } catch (err) {
    console.error('Error registrando log:', err);
  }
}

// ============================================================
// 2. EXPORTAR DATOS
// ============================================================

async function exportAllClassData(classId) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) throw new Error('Firebase no disponible');

    console.log('📦 Exportando clase:', classId);

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
          backup.activities[actId] = {
            id: actId,
            ...actDoc.data()
          };
        }
      }
    }

    if (classData.alumnes && classData.alumnes.length > 0) {
      for (const stuId of classData.alumnes) {
        const stuDoc = await db.collection('alumnes').doc(stuId).get();
        if (stuDoc.exists) {
          backup.students[stuId] = {
            id: stuId,
            ...stuDoc.data()
          };
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
// 3. GUARDAR BACKUP A STORAGE
// ============================================================

async function saveBackupToStorage(classId, backupData) {
  try {
    const storage = window.firebase?.storage?.();
    if (!storage) throw new Error('Storage no disponible');

    const fileName = `backups/${classId}/backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
    const backupRef = storage.ref(fileName);

    const jsonString = JSON.stringify(backupData);
    const blob = new Blob([jsonString], { type: 'application/json' });

    await backupRef.put(blob);

    console.log('✅ Backup guardado en Storage:', fileName);

    const db = window.firebase?.firestore?.();
    const backupRecord = {
      classId: classId,
      className: backupData.class.nom,
      fileName: fileName,
      fileSize: blob.size,
      timestamp: firebase.firestore.Timestamp.now(),
      itemCount: {
        activities: Object.keys(backupData.activities).length,
        students: Object.keys(backupData.students).length
      }
    };

    await db.collection('backups').add(backupRecord);

    await cleanOldBackups(classId);

    return fileName;
  } catch (err) {
    console.error('Error guardando backup:', err);
    throw err;
  }
}

// ============================================================
// 4. LIMPIAR BACKUPS ANTIGUOS
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
        const backupData = doc.data();
        
        try {
          const storage = window.firebase?.storage?.();
          const fileRef = storage.ref(backupData.fileName);
          await fileRef.delete();
        } catch (err) {
          console.warn('No se pudo eliminar archivo de Storage:', err);
        }

        await db.collection('backups').doc(doc.id).delete();
      }

      console.log(`🗑️ Eliminados ${toDelete.length} backups antiguos`);
    }
  } catch (err) {
    console.error('Error limpiando backups antiguos:', err);
  }
}

// ============================================================
// 5. BACKUP AUTOMÁTICO
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

  setTimeout(performDailyBackup, 5000);
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
        await saveBackupToStorage(classId, backupData);

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
        console.error(`Error haciendo backup de clase ${classId}:`, err);
      }
    }

    console.log('✅ Backup diario completado');
  } catch (err) {
    console.error('Error en backup diario:', err);
  }
}

// ============================================================
// 6. LISTAR BACKUPS
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
// 7. RESTAURAR DESDE BACKUP
// ============================================================

async function restoreFromBackup(backupId, classId) {
  try {
    const db = window.firebase?.firestore?.();
    const storage = window.firebase?.storage?.();
    if (!db || !storage) throw new Error('Firebase no disponible');

    console.log('📥 Iniciando restauración desde backup:', backupId);

    const backupDoc = await db.collection('backups').doc(backupId).get();
    if (!backupDoc.exists) throw new Error('Backup no encontrado');

    const backupInfo = backupDoc.data();
    const fileName = backupInfo.fileName;

    const fileRef = storage.ref(fileName);
    const url = await fileRef.getDownloadURL();
    const response = await fetch(url);
    const backupData = await response.json();

    if (!confirm(`¿Estás seguro de que quieres restaurar ${backupInfo.className} desde ${new Date(backupInfo.timestamp.toDate()).toLocaleString()}?\n\nEsto SOBRESCRIBIRÁ todos los datos actuales.`)) {
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
    console.error('Error restaurando backup:', err);
    alert('❌ Error restaurando backup: ' + err.message);
    return false;
  }
}

// ============================================================
// 8. HISTORIAL DE CAMBIOS
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
    console.error('Error obteniendo historial:', err);
    return [];
  }
}

// ============================================================
// 9. INYECTAR BOTÓN EN MENÚ DE USUARIO
// ============================================================

function injectBackupButton() {
  const userMenu = document.getElementById('userMenu');
  if (!userMenu) {
    setTimeout(injectBackupButton, 500);
    return;
  }

  // Verificar si el usuario es admin
  checkIfAdmin().then(isAdmin => {
    if (!isAdmin) {
      console.log('👤 Usuario no es admin - Botón de backup no visible');
      return;
    }

    // Verificar si el botón ya existe
    if (userMenu.querySelector('.backup-btn')) {
      return;
    }

    console.log('✅ Usuario es admin - Inyectando botón de backup');

    // Crear botón
    const backupBtn = document.createElement('button');
    backupBtn.className = 'backup-btn px-3 py-1 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2';
    backupBtn.innerHTML = '📦 Backups';
    backupBtn.addEventListener('click', () => {
      openBackupModal();
      userMenu.classList.add('hidden');
    });

    // Insertar antes del último elemento (que suele ser logout)
    const children = Array.from(userMenu.children);
    if (children.length > 0) {
      userMenu.insertBefore(backupBtn, children[children.length - 1]);
    } else {
      userMenu.appendChild(backupBtn);
    }
  });
}

async function checkIfAdmin() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db || !window.professorUID) return false;

    const userDoc = await db.collection('professors').doc(window.professorUID).get();
    return userDoc.exists && userDoc.data().isAdmin === true;
  } catch (err) {
    console.error('Error verificando admin:', err);
    return false;
  }
}

// ============================================================
// 10. CREAR MODAL DE BACKUP
// ============================================================

function createBackupModal() {
  if (document.getElementById('modalBackupInjected')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'modalBackupInjected';
  modal.className = 'fixed inset-0 hidden items-center justify-center z-50 bg-black bg-opacity-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-96 overflow-y-auto p-6">
      
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">📦 Backup y Restauración</h2>
        <button onclick="closeBackupModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">×</button>
      </div>

      <div id="backupTab" class="space-y-4">
        <div class="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-4">
          <p class="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Información:</strong> Los backups se crean automáticamente cada 24 horas. 
            Puedes restaurar cualquiera para recuperar datos anteriores.
          </p>
        </div>

        <div class="space-y-2">
          <h3 class="font-semibold text-gray-900 dark:text-white">Backups disponibles para esta clase:</h3>
          
          <div id="backupsList" class="space-y-2 max-h-64 overflow-y-auto">
            <div class="text-gray-500 text-center py-4">⏳ Cargando backups...</div>
          </div>
        </div>

        <div class="flex gap-2 mt-4">
          <button onclick="createManualBackupBtn()" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">
            💾 Crear Backup Ahora
          </button>
          <button onclick="closeBackupModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-semibold">
            Cerrar
          </button>
        </div>
      </div>

      <div id="historyTab" class="space-y-4 hidden">
        <h3 class="font-semibold text-gray-900 dark:text-white">Últimos cambios en esta clase:</h3>
        
        <div id="changeList" class="space-y-2 max-h-64 overflow-y-auto">
          <div class="text-gray-500 text-center py-4">⏳ Cargando historial...</div>
        </div>

        <button onclick="closeBackupModal()" class="w-full bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-semibold">
          Cerrar
        </button>
      </div>

      <div class="flex gap-2 mt-6 border-t pt-4">
        <button onclick="switchBackupTab('backups')" id="tabBackupsBtn" class="flex-1 bg-blue-600 text-white px-3 py-2 rounded font-semibold">
          📦 Backups
        </button>
        <button onclick="switchBackupTab('history')" id="tabHistoryBtn" class="flex-1 bg-gray-300 hover:bg-gray-400 text-black px-3 py-2 rounded font-semibold">
          📋 Historial
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  console.log('✅ Modal de backup inyectado');
}

// ============================================================
// 11. FUNCIONES UI
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
    modal.style.display = 'none';
  }
}

function switchBackupTab(tab) {
  const backupTab = document.getElementById('backupTab');
  const historyTab = document.getElementById('historyTab');
  const tabBackupsBtn = document.getElementById('tabBackupsBtn');
  const tabHistoryBtn = document.getElementById('tabHistoryBtn');

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
  if (!window.currentClassId) return;

  const backupsList = document.getElementById('backupsList');
  backupsList.innerHTML = '<div class="text-gray-500 text-center py-4">⏳ Cargando...</div>';

  try {
    const backups = await listBackupsForClass(window.currentClassId);

    if (backups.length === 0) {
      backupsList.innerHTML = '<div class="text-gray-500 text-center py-4">No hay backups disponibles aún</div>';
      return;
    }

    backupsList.innerHTML = '';
    backups.forEach(backup => {
      const date = new Date(backup.timestamp).toLocaleString();
      const sizeKB = (backup.fileSize / 1024).toFixed(2);

      const item = document.createElement('div');
      item.className = 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-3 flex justify-between items-center';
      item.innerHTML = `
        <div>
          <p class="font-semibold text-gray-900 dark:text-white">${date}</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">
            ${backup.itemCount.activities} actividades · ${backup.itemCount.students} alumnos · ${sizeKB} KB
          </p>
        </div>
        <button onclick="restoreBackupUI('${backup.id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-semibold">
          Restaurar
        </button>
      `;
      backupsList.appendChild(item);
    });

  } catch (err) {
    backupsList.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
  }
}

async function loadHistoryUI() {
  if (!window.currentClassId) return;

  const changeList = document.getElementById('changeList');
  changeList.innerHTML = '<div class="text-gray-500 text-center py-4">⏳ Cargando...</div>';

  try {
    const changes = await getChangeHistory(window.currentClassId, 20);

    if (changes.length === 0) {
      changeList.innerHTML = '<div class="text-gray-500 text-center py-4">No hay cambios registrados</div>';
      return;
    }

    changeList.innerHTML = '';
    changes.forEach(change => {
      const date = new Date(change.timestamp).toLocaleString();
      const actionEmoji = getActionEmoji(change.action);

      const item = document.createElement('div');
      item.className = 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-3';
      item.innerHTML = `
        <p class="font-semibold text-gray-900 dark:text-white">
          ${actionEmoji} ${change.action.replace(/_/g, ' ').toUpperCase()}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">${date}</p>
        <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">
          ${change.resourceName || change.resourceId}
        </p>
      `;
      changeList.appendChild(item);
    });

  } catch (err) {
    changeList.innerHTML = `<div class="text-red-500">Error: ${err.message}</div>`;
  }
}

async function createManualBackupBtn() {
  if (!window.currentClassId) return;

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Creando backup...';

  try {
    const backupData = await exportAllClassData(window.currentClassId);
    await saveBackupToStorage(window.currentClassId, backupData);

    alert('✅ Backup creado correctamente');
    await loadBackupsUI();
  } catch (err) {
    alert('❌ Error creando backup: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Crear Backup Ahora';
  }
}

async function restoreBackupUI(backupId) {
  if (!window.currentClassId) return;

  const result = await restoreFromBackup(backupId, window.currentClassId);
  
  if (result) {
    closeBackupModal();
  }
}

function getActionEmoji(action) {
  const emojis = {
    'auto_backup_created': '💾',
    'backup_restored': '📥',
    'create_class': '📚',
    'delete_note': '🗑️',
    'edit_activity': '✏️',
    'add_student': '👤',
    'delete_student': '❌'
  };
  return emojis[action] || '📋';
}

// ============================================================
// 12. INICIALIZACIÓN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    injectBackupButton();
    setupAutoBackup();
  }, 2000);
});

// Exportar funciones globales
window.BackupSystemInjector = {
  openBackupModal,
  closeBackupModal,
  switchBackupTab,
  loadBackupsUI,
  loadHistoryUI,
  createManualBackupBtn,
  restoreBackupUI,
  getActionEmoji,
  checkIfAdmin
};

console.log('🎓 Sistema de Backup Injector - Listo');
