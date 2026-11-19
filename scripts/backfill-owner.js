#!/usr/bin/env node
// Assigna ownerUid a classes, alumnes i activitats existents.
// Propietari = el professor que té la classe a professors/{uid}.classes[].
//
// Ús (des d'aquesta carpeta):
//   npm i firebase-admin
//   export GOOGLE_APPLICATION_CREDENTIALS=/ruta/clau-de-servei.json
//   node backfill-owner.js                 # simulació (no escriu res)
//   node backfill-owner.js --apply         # aplica els canvis
//   node backfill-owner.js --report-orphans  # a més, compta documents sense propietari
//
// És idempotent: no toca documents que ja tenen ownerUid.

const admin = require('firebase-admin');
const APPLY = process.argv.includes('--apply');
const ORPHANS = process.argv.includes('--report-orphans');

admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'gestornotes-cc6d0' });
const db = admin.firestore();

const owners = { classes: new Map(), alumnes: new Map(), activitats: new Map() };
const conflicts = [];

function claim(col, id, uid, via) {
  const prev = owners[col].get(id);
  if (prev && prev !== uid) { conflicts.push({ col, id, prev, uid, via }); return; }
  owners[col].set(id, uid);
}

async function main() {
  console.log(APPLY ? 'MODE: APLICAR' : 'MODE: SIMULACIÓ (afegeix --apply per escriure)');

  const profs = await db.collection('professors').get();
  console.log(`Professors: ${profs.size}`);

  for (const p of profs.docs) {
    const classIds = p.data().classes || [];
    const snaps = await Promise.all(classIds.map(id => db.collection('classes').doc(id).get()));
    for (const c of snaps) {
      if (!c.exists) continue;
      const d = c.data();
      claim('classes', c.id, p.id, 'professors.classes');
      (d.alumnes || []).forEach(id => claim('alumnes', id, p.id, `classe ${c.id}`));
      const acts = new Set(d.activitats || []);
      Object.values(d.terms || {}).forEach(t => (t.activities || []).forEach(a => acts.add(a)));
      acts.forEach(id => claim('activitats', id, p.id, `classe ${c.id}`));
    }
  }

  console.log(`Detectats: classes=${owners.classes.size} alumnes=${owners.alumnes.size} activitats=${owners.activitats.size}`);
  if (conflicts.length) {
    console.log(`\nATENCIÓ: ${conflicts.length} documents referenciats per més d'un professor (es manté el primer):`);
    conflicts.slice(0, 20).forEach(c => console.log(`  ${c.col}/${c.id}: ${c.prev} vs ${c.uid} (${c.via})`));
  }

  let toWrite = 0, already = 0, missing = 0;
  for (const col of Object.keys(owners)) {
    const entries = [...owners[col]];
    for (let i = 0; i < entries.length; i += 300) {
      const chunk = entries.slice(i, i + 300);
      const snaps = await db.getAll(...chunk.map(([id]) => db.collection(col).doc(id)));
      const batch = db.batch();
      let n = 0;
      snaps.forEach((s, k) => {
        if (!s.exists) { missing++; return; }
        if (s.data().ownerUid) { already++; return; }
        toWrite++; n++;
        batch.update(s.ref, { ownerUid: chunk[k][1] });
      });
      if (APPLY && n > 0) await batch.commit();
    }
  }
  console.log(`\nPer escriure: ${toWrite} | ja amb propietari: ${already} | referenciats però inexistents: ${missing}`);

  if (ORPHANS) {
    for (const col of ['alumnes', 'activitats', 'classes']) {
      const snap = await db.collection(col).get();
      const orphan = snap.docs.filter(d => !d.data().ownerUid && !owners[col].has(d.id));
      console.log(`Orfes a ${col} (sense propietari i sense cap classe que els referenciï): ${orphan.length}`);
    }
  }
  console.log(APPLY ? '\nFet.' : '\nSimulació acabada. Revisa i torna a executar amb --apply.');
}

main().catch(e => { console.error(e); process.exit(1); });
