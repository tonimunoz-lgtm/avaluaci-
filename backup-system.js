// backup-system.js - Sistema de Backup Automático y Logs
// Añade esto a tu proyecto

console.log('✅ backup-system.js cargado');

// ============================================================
// CONFIGURACIÓN
// ============================================================

const BACKUP_CONFIG = {
  BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas en ms
  MAX_BACKUPS: 30, // Guardar últimos 30 backups
  STORAGE_BUCKET: 'gestornotes-cc6d0.firebasestorage.app'
};

// ============================================================
// 1. SISTEMA DE LOGS - Registra TODOS los cambios
// ============================================================

async function logChange(action, data) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) return;

    const professorUID = window.professorUID;
    if (!professorUID) return;

    // Crear documento de log
    await db.collection('logs').add({
      timestamp: firebase.firestore.Timestamp.now(),
      professorId: professorUID,
      action: action, // 'create_class', 'delete_note', 'edit_activity', etc
      resourceType: data.resourceType, // 'class', 'activity', 'note', etc
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      details: data.details || {},
      ipAddress: await getIPAddress(),
      userAgent: navigator.userAgent
    });

    console.log('📝 Log registrado:', action);
  } catch (err) {
    console.error('Error registrando log:', err);
  }
}

async function getIPAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'desconocida';
  }
}

// ============================================================
// 2. EXPORTAR DATOS COMPLETOS
// ============================================================

async function exportAllClassData(classId) {
  try {
    const db = window.firebase?.firestore?.();
    if (!db) throw new Error('Firebase no disponible');

    console.log('📦 Exportando clase:', classId);

    // Obtener clase
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

    // Exportar actividades
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

    // Exportar alumnos
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

    // Exportar términos
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

    // Convertir a JSON y comprimir
    const jsonString = JSON.stringify(backupData);
    const blob = new Blob([jsonString], { type: 'application/json' });

    await backupRef.put(blob);

    console.log('✅ Backup guardado en Storage:', fileName);

    // Registrar en Firestore
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

    // Limpiar backups antiguos
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

    // Obtener todos los backups de esta clase ordenados por fecha
    const snapshot = await db.collection('backups')
      .where('classId', '==', classId)
      .orderBy('timestamp', 'desc')
      .get();

    const backups = snapshot.docs;

    // Si hay más de MAX_BACKUPS, eliminar los antiguos
    if (backups.length > BACKUP_CONFIG.MAX_BACKUPS) {
      const toDelete = backups.slice(BACKUP_CONFIG.MAX_BACKUPS);

      for (const doc of toDelete) {
        const backupData = doc.data();
        
        // Eliminar archivo de Storage
        try {
          const storage = window.firebase?.storage?.();
          const fileRef = storage.ref(backupData.fileName);
          await fileRef.delete();
        } catch (err) {
          console.warn('No se pudo eliminar archivo de Storage:', err);
        }

        // Eliminar registro de Firestore
        await db.collection('backups').doc(doc.id).delete();
      }

      console.log(`🗑️ Eliminados ${toDelete.length} backups antiguos`);
    }
  } catch (err) {
    console.error('Error limpiando backups antiguos:', err);
  }
}

// ============================================================
// 5. BACKUP AUTOMÁTICO PROGRAMADO
// ============================================================

function setupAutoBackup() {
  if (!window.professorUID) {
    setTimeout(setupAutoBackup, 1000);
    return;
  }

  console.log('⏰ Configurando backups automáticos (cada 24 horas)');

  // Ejecutar cada 24 horas
  setInterval(async () => {
    await performDailyBackup();
  }, BACKUP_CONFIG.BACKUP_INTERVAL);

  // También ejecutar al cargar por primera vez
  setTimeout(performDailyBackup, 5000);
}

async function performDailyBackup() {
  try {
    const db = window.firebase?.firestore?.();
    if (!db || !window.professorUID) return;

    console.log('🔄 Iniciando backup diario automático...');

    // Obtener todas las clases del profesor
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

// Iniciar backups automáticos al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupAutoBackup, 2000);
});

// ============================================================
// 6. LISTAR BACKUPS DISPONIBLES
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

    // Obtener información del backup
    const backupDoc = await db.collection('backups').doc(backupId).get();
    if (!backupDoc.exists) throw new Error('Backup no encontrado');

    const backupInfo = backupDoc.data();
    const fileName = backupInfo.fileName;

    // Descargar archivo del backup
    const fileRef = storage.ref(fileName);
    const url = await fileRef.getDownloadURL();
    const response = await fetch(url);
    const backupData = await response.json();

    // Confirmar restauración
    if (!confirm(`¿Estás seguro de que quieres restaurar ${backupInfo.className} desde ${new Date(backupInfo.timestamp.toDate()).toLocaleString()}?\n\nEsto SOBRESCRIBIRÁ todos los datos actuales.`)) {
      return false;
    }

    console.log('⏳ Restaurando datos...');

    // Restaurar clase
    await db.collection('classes').doc(classId).update(backupData.class);

    // Restaurar actividades
    for (const [actId, actData] of Object.entries(backupData.activities)) {
      const { id, ...data } = actData;
      await db.collection('activitats').doc(actId).set(data);
    }

    // Restaurar alumnos
    for (const [stuId, stuData] of Object.entries(backupData.students)) {
      const { id, ...data } = stuData;
      await db.collection('alumnes').doc(stuId).set(data);
    }

    // Registrar restauración en logs
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
    
    // Recargar página
    setTimeout(() => location.reload(), 1000);
    return true;

  } catch (err) {
    console.error('Error restaurando backup:', err);
    alert('❌ Error restaurando backup: ' + err.message);
    return false;
  }
}

// ============================================================
// 8. VER HISTORIAL DE CAMBIOS
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

// Exportar funciones globalmente
window.BackupSystem = {
  exportAllClassData,
  saveBackupToStorage,
  listBackupsForClass,
  restoreFromBackup,
  getChangeHistory,
  logChange,
  performDailyBackup
};

console.log('🎓 Sistema de Backup - Listo para usar');
