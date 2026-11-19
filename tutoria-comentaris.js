// tutoria-comentaris.js v2 — net
// 1. Botó "✨ Generar per IA" al modal de comentaris
// 2. (el formulari és el de tutoria.js; aquí només s'hi enllaça)
// 3. Exportar Excel des de la capçalera Comentaris

console.log('✅ tutoria-comentaris.js v2 carregat');

// ============================================================
// ESTAT GLOBAL
// ============================================================
let _tcUID  = null;
let _tcDB   = null;

// IDs capturats en el moment d'obrir el modal
let _tcStudentId   = null;
let _tcStudentName = null;
let _tcClassId     = null;

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
      window._tcClassId = card.dataset.id;
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
      // Exposat a window (el fa servir aiGenerate per pseudonimitzar el nom)
      window._tcStudentId   = studentId;
      window._tcStudentName = studentName;
      // _tcClassId ja s'ha capturat via el click a la targeta

      // Cridar original
      original.apply(this, arguments);

      // Injectar botó IA al modal (amb delay per assegurar que el DOM existeix)
      setTimeout(() => {
        injectarBotoIA();
      }, 100);
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
    if (!window.openTutoriaModal) { notify('El generador encara no està disponible.'); return; }
    await window.openTutoriaModal({ studentId: _tcStudentId, studentName: _tcStudentName, classId: _tcClassId || window.AvaluApp?.getClassId?.() });
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
        btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:.9em;height:.9em;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-1px"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg> <span class="lbl">Excel</span>';
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
// ============================================================
// APÒSTROF CATALÀ: el/la → l' davant vocal o h muda
// Norma: s'apostrofa sempre davant vocal o h (l'Albert, l'Aina)
// Excepció àtona femenina (la iaia, la una) — poc freqüent en noms propis
// ============================================================
function _articleApostrof(nom) {
  if (!nom) return "l'";
  const esVocalOH = /^[aeiouàèéíïóòúüh]/i.test(nom.trim());
  return esVocalOH ? "l'" : null; // null = no apostrofar, usar el/la original
}

// Separar el comentari en ítems per paràgrafs
// Cada paràgraf = un ítem. La capçalera és el fragment fins a la primera coma.
function _parsarComentariItems(text) {
  if (!text) return [];
  return text.split(/\n\s*\n/).map(bloc => {
    const net = bloc.trim();
    if (!net) return null;
    const comaIdx = net.indexOf(',');
    const item = (comaIdx > 0 && comaIdx < 80) ? net.slice(0, comaIdx).trim() : '';
    return { item, comentari: net }; // comentari = bloc complet sempre
  }).filter(Boolean);
}

async function exportarComentarisExcel() {
  const classId = _tcClassId;
  if (!classId || !_tcDB) { notify('Selecciona una classe primer'); return; }

  try {
    const classDoc = await _tcDB.collection('classes').doc(classId).get();
    if (!classDoc.exists) { notify('Classe no trobada'); return; }
    const alumnesIds = classDoc.data().alumnes || [];
    if (alumnesIds.length === 0) { notify('No hi ha alumnes'); return; }

    const docs = await Promise.all(alumnesIds.map(id => _tcDB.collection('alumnes').doc(id).get()));
    const alumnes = docs.filter(d => d.exists).map(d => {
      const data = d.data();
      const comentari = (window.AvaluApp?.getComment ? window.AvaluApp.getComment(data, classId, window.AvaluApp.getActiveTermId()) : data.comentarios?.[classId]) || '';
      const metadades = data.comentarisItems?.[classId] || []; // títols + assoliments guardats
      const blocs = _parsarComentariItems(comentari);
      // Combinar blocs de text amb metadades (títol real + assoliment)
      const items = blocs.map((bloc, i) => ({
        titol: metadades[i]?.titol || bloc.item || `Ítem ${i+1}`,
        comentari: bloc.comentari,
        assoliment: metadades[i]?.assoliment || ''
      }));
      return { nom: data.nom || 'Desconegut', items };
    });

    if (!window.XLSX) { notify('La llibreria XLSX no està disponible'); return; }

    const maxItems = Math.max(1, ...alumnes.map(a => a.items.length));

    // Capçalera dinàmica amb títols reals del primer alumne que els tingui
    const titolsCapcalera = [];
    for (let i = 0; i < maxItems; i++) {
      const titol = alumnes.find(a => a.items[i]?.titol && !a.items[i].titol.startsWith('Ítem'))?.items[i].titol || `Ítem ${i+1}`;
      titolsCapcalera.push(titol);
    }

    const capcalera = ['Alumne'];
    for (let i = 1; i <= maxItems; i++) {
      capcalera.push(`Ítem ${i}`, `Comentari ${i}`, `Assoliment ${i}`);
    }

    // Files de dades
    const files = alumnes.map(a => {
      const fila = [a.nom];
      for (let i = 0; i < maxItems; i++) {
        const it = a.items[i];
        fila.push(it ? it.titol : '');
        fila.push(it ? it.comentari : '');
        fila.push(it ? it.assoliment : '');
      }
      return fila;
    });

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet([capcalera, ...files]);

    // Amplades: Alumne=25, Ítem=30, Comentari=80, Assoliment=20
    ws['!cols'] = [{ wch: 25 }];
    for (let i = 0; i < maxItems; i++) {
      ws['!cols'].push({ wch: 30 }, { wch: 90 }, { wch: 22 });
    }

    window.XLSX.utils.book_append_sheet(wb, ws, 'Comentaris');
    const avui = new Date();
    const data = `${avui.getFullYear()}${String(avui.getMonth()+1).padStart(2,'0')}${String(avui.getDate()).padStart(2,'0')}`;
    window.XLSX.writeFile(wb, `comentaris_${data}.xlsx`);
  } catch(e) {
    console.error('Error exportant:', e);
    notify('Error: ' + e.message);
  }
}
