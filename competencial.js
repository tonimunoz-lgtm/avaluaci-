console.log('✅ competencial.js cargado');

const COMPETENCIES = ['NA','AS','AN','AE'];
const COLORS = { NA:'#ef4444', AS:'#f97316', AN:'#eab308', AE:'#22c55e' };

document.addEventListener('DOMContentLoaded', () => waitBtn());

function waitBtn(){
  const btn = document.getElementById('modalAddActivityBtn');
  if(!btn) return setTimeout(waitBtn,300);

  btn.removeAttribute('onclick');

  btn.addEventListener('click', async (e)=>{
    e.preventDefault(); e.stopPropagation();

    const name = modalActivityName.value.trim();
    if(!name) return alert('Posa un nom');

    const type = await dialog();
    if(!type) return;

    await create(name,type);
  }, true);

  console.log('✅ Injector activo');
}

function dialog(){
  return new Promise(res=>{
    const d=document.createElement('div');
    d.innerHTML=`
    <div style="position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;z-index:9999">
      <div style="background:white;padding:20px">
        <h3>Tipus d'avaluació</h3>
        <label><input type="radio" name="t" value="numeric"> Numèrica</label><br>
        <label><input type="radio" name="t" value="competency"> Competencial</label><br><br>
        <button id="ok">OK</button> <button id="no">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(d);
    ok.onclick=()=>{const v=d.querySelector('input:checked')?.value;d.remove();res(v||null)};
    no.onclick=()=>{d.remove();res(null)};
  });
}

async function create(name,type){
  const db=firebase.firestore();
  const ref=db.collection('activitats').doc();

  await ref.set({nom:name,data:new Date().toISOString().split('T')[0],calcType:type,evaluationType:type});
  await Terms.addActivityToActiveTerm(ref.id);
  closeModal('modalAddActivity'); loadClassData();
  alert('Creada '+type);
}

// ================== PARCHE TABLA ==================

const obs=new MutationObserver(()=>patch());
obs.observe(document.body,{childList:true,subtree:true});

async function patch(){
  const db=firebase.firestore();
  const ths=[...document.querySelectorAll('#notesThead th')];

  for(let i=1;i<ths.length-1;i++){
    const name=ths[i].innerText.trim();
    const s=await db.collection('activitats').where('nom','==',name).limit(1).get();
    if(s.empty||s.docs[0].data().evaluationType!=='competency') continue;

    document.querySelectorAll('#notesTbody tr').forEach(r=>{
      if(r.querySelector(`select[data-i="${i}"]`)) return;
      const inp=r.querySelectorAll('input')[i-1]; if(!inp) return;

      const sel=document.createElement('select');
      sel.dataset.i=i; sel.dataset.sid=r.dataset.studentId; sel.dataset.aid=s.docs[0].id;
      sel.innerHTML='<option></option>'+COMPETENCIES.map(c=>`<option>${c}</option>`).join('');
      sel.value=inp.value;
      sel.onchange=()=>save(sel);
      inp.replaceWith(sel);
    });
  }
}

async function save(sel){
  await firebase.firestore().collection('alumnes').doc(sel.dataset.sid)
    .update({[`notes.${sel.dataset.aid}`]:sel.value||firebase.firestore.FieldValue.delete()});
}
