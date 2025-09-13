/* ====== Stockage local ====== */
const LS = {
  get(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch{ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

let students = LS.get('cross.students', []);
let courses  = LS.get('cross.courses',  []);
const getEntries = cid => LS.get(`cross.entries.${cid}`, []);
const setEntries = (cid, arr) => LS.set(`cross.entries.${cid}`, arr);
/* résultats */
const getResLaps = cid => LS.get(`cross.res.laps.${cid}`, {lapsByBib:{}, last:{}, started:false});
const setResLaps = (cid, o) => LS.set(`cross.res.laps.${cid}`, o);
const getResTime = cid => LS.get(`cross.res.time.${cid}`, {startedAt:null, arrivals:[]});
const setResTime = (cid, o) => LS.set(`cross.res.time.${cid}`, o);

/* ====== Utils ====== */
const uid = () => Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(x=>x.trim().length);
  if(!lines.length) return [];
  const sep = (lines[0].includes(';') && !lines[0].includes(',')) ? ';' : ',';
  const head = lines[0].split(sep).map(h=>h.trim().toLowerCase());
  const idx = name => head.indexOf(name);
  const out=[];
  for(let i=1;i<lines.length;i++){
    const cells = lines[i].split(sep).map(c=>c.replace(/^"(.*)"$/,'$1').trim());
    const nom = (idx('nom')>-1 ? cells[idx('nom')] : '') || '';
    if(!nom) continue;
    out.push({
      id: uid(),
      nom,
      prenom: idx('prenom')>-1 ? (cells[idx('prenom')]||'') : '',
      classe: idx('classe')>-1 ? (cells[idx('classe')]||'') : '',
      naissance: idx('date_naissance')>-1 ? (cells[idx('date_naissance')]||'') : '',
      genre: idx('genre')>-1 ? (cells[idx('genre')]||'').toUpperCase() : ''
    });
  }
  return out;
}
function computeAge(isoBirth, refDateStr){
  if(!isoBirth) return null;
  const d = new Date(isoBirth); if(Number.isNaN(d.getTime())) return null;
  const ref = refDateStr? new Date(refDateStr) : new Date(new Date().getFullYear(),11,31);
  let age = ref.getFullYear()-d.getFullYear(); const m = ref.getMonth()-d.getMonth();
  if(m<0 || (m===0 && ref.getDate()<d.getDate())) age--;
  return age;
}
function fmtMinSec(ms){
  if(ms==null) return '00:00';
  const t = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(t/60), s = t%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
const $ = sel => document.querySelector(sel);
function setOptions(sel, arr, mapFn){
  sel.innerHTML = '';
  for(const it of arr){
    const opt = document.createElement('option');
    const {value,label} = mapFn(it);
    opt.value=value; opt.textContent=label;
    sel.appendChild(opt);
  }
}

/* ====== Focus manager (avec pause auto sur <select>) ====== */
function makeFocusManager(inputEl, dotEl){
  let lock=false, interval=null, paused=false;
  const updateDot = ()=> dotEl.style.background = (lock && !paused && document.activeElement===inputEl) ? '#22c55e' : '#ef4444';
  const tick = ()=>{
    if(!lock){ updateDot(); return; }
    const ae = document.activeElement;
    if(paused || (ae && ae.tagName && ae.tagName.toLowerCase()==='select') || ae?.closest('dialog[open]')){ updateDot(); return; }
    if(ae!==inputEl) inputEl.focus();
    updateDot();
  };
  return {
    start(){ lock=true; paused=false; inputEl.focus(); updateDot(); if(interval) clearInterval(interval); interval=setInterval(tick,250); },
    stop(){ lock=false; paused=false; if(interval){clearInterval(interval); interval=null;} updateDot(); },
    pause(){ paused=true; updateDot(); },
    resume(){ paused=false; updateDot(); }
  };
}
const lapsFM = makeFocusManager($('#scanInput'), $('#focusDot'));
const timeFM = makeFocusManager($('#finishInput'), $('#focusDot2'));
function guardSelect(selectEl, fm){
  if(!selectEl) return;
  selectEl.addEventListener('pointerdown', ()=> fm.pause());
  selectEl.addEventListener('focus', ()=> fm.pause());
  selectEl.addEventListener('blur', ()=> fm.resume());
  selectEl.addEventListener('change', ()=> fm.resume());
}

/* ====== Onglets ====== */
document.querySelectorAll('.tab-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    b.addEventListener; b.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    const id = b.dataset.tab;
    document.getElementById(id).classList.add('active');

    if(id==='t2') renderCoursesTable();
    if(id==='t3') fillCourseSelects();
    if(id==='t4'){ fillCourseSelects(); renderLapsTables(); setStateLaps('idle'); lapsFM.stop(); }
    if(id==='t5'){ fillCourseSelects(); renderPendingTable(); renderFinishTable(); setStateTime('idle'); stopChrono(); timeFM.stop(); $('#timeChrono').textContent='00:00'; }
    if(id==='t6'){ fillCourseSelects(); renderResults(); }
  });
});

/* ====== Bouton Aide ====== */
document.getElementById('btnHelp').addEventListener('click', ()=> {
  document.getElementById('helpDlg').showModal();
});

/* ====== Élèves ====== */
function renderStudents(){
  const tb = document.querySelector('#tblEleves tbody'); tb.innerHTML='';
  students.forEach((e,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td>
    <td>${e.nom||''}</td><td>${e.prenom||''}</td><td>${e.classe||''}</td>
    <td>${e.naissance||''}</td><td>${e.genre||''}</td>
    <td><button class="btn ghost" data-id="${e.id}">Supprimer</button></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('button[data-id]').forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.id;
      students = students.filter(s=>s.id!==id);
      LS.set('cross.students', students);
      renderStudents(); renderCoursesTable();
    };
  });
}
document.getElementById('btnAddEleve').onclick = ()=>{
  const nom = document.getElementById('iNom').value.trim();
  if(!nom){ alert('Le nom est requis'); return; }
  const el = {
    id: uid(),
    nom,
    prenom: document.getElementById('iPrenom').value.trim(),
    classe: document.getElementById('iClasse').value.trim(),
    naissance: document.getElementById('iNaissance').value || '',
    genre: (document.getElementById('iGenre').value||'').toUpperCase()
  };
  students.push(el); LS.set('cross.students', students);
  document.getElementById('iNom').value=''; document.getElementById('iPrenom').value='';
  document.getElementById('iClasse').value=''; document.getElementById('iNaissance').value='';
  document.getElementById('iGenre').value='';
  renderStudents();
};
document.getElementById('btnImportCsv').onclick = ()=>{
  const f = document.getElementById('csvFile').files?.[0];
  if(!f) return alert('Choisir un fichier CSV');
  f.text().then(txt=>{
    const rows = parseCSV(txt);
    if(!rows.length) return alert('CSV vide ou entêtes manquantes');
    students = students.concat(rows); LS.set('cross.students', students); renderStudents();
  });
};
document.getElementById('btnClearEleves').onclick = ()=>{
  if(confirm('Effacer tous les élèves ?')){ students=[]; LS.set('cross.students', students); renderStudents(); }
};
document.getElementById('btnResetAll').onclick = ()=>{
  if(!confirm('Réinitialiser TOUT : élèves, courses, inscriptions, résultats ?')) return;
  courses.map(c=>c.id).forEach(id=>{
    localStorage.removeItem(`cross.entries.${id}`);
    localStorage.removeItem(`cross.res.laps.${id}`);
    localStorage.removeItem(`cross.res.time.${id}`);
  });
  students=[]; courses=[];
  LS.set('cross.students', students); LS.set('cross.courses', courses);
  renderStudents(); renderCoursesTable(); fillCourseSelects();
  ['tblPreview','bibPreview','resultsWrap','tblLapsInd','tblLapsClass','tblPending','tblFinish'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    (el.querySelector('tbody')||el).innerHTML='';
  });
  stopChrono(); document.getElementById('timeChrono').textContent='00:00';
  alert('Base réinitialisée.');
};
renderStudents();

/* ====== Filtres / création de course ====== */
function filterStudentsBy({genre, classes, ageMin, ageMax}, refDate){
  const setClasses = new Set((classes||[]).map(s=>s.trim()).filter(Boolean));
  return students.filter(s=>{
    if(genre && (s.genre||'')!==genre) return false;
    if(setClasses.size && !setClasses.has((s.classe||'').trim())) return false;
    if(ageMin!=null || ageMax!=null){
      const age = computeAge(s.naissance, refDate);
      if(age==null) return false;
      if(ageMin!=null && age < ageMin) return false;
      if(ageMax!=null && age > ageMax) return false;
    }
    return true;
  });
}
function readFilters(){
  return {
    genre: (document.getElementById('fGenre').value||''),
    classes: (document.getElementById('fClasses').value||'').split(',').map(s=>s.trim()).filter(Boolean),
    ageMin: document.getElementById('fAgeMin').value ? Number(document.getElementById('fAgeMin').value) : null,
    ageMax: document.getElementById('fAgeMax').value ? Number(document.getElementById('fAgeMax').value) : null
  };
}
document.getElementById('btnPreviewCourse').onclick = ()=>{
  const filters = readFilters();
  const refDate = document.getElementById('cDate').value || null;
  const list = filterStudentsBy(filters, refDate);
  document.getElementById('previewCount').textContent = String(list.length);
  const tb = document.querySelector('#tblPreview tbody'); tb.innerHTML='';
  list.forEach((e,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${e.nom}</td><td>${e.prenom||''}</td>
      <td>${e.classe||''}</td><td>${e.naissance||''}</td><td>${e.genre||''}</td>`;
    tb.appendChild(tr);
  });
};
document.getElementById('btnCreateCourse').onclick = ()=>{
  const nom = document.getElementById('cNom').value.trim();
  if(!nom) return alert('Nom de course requis');
  const c = { id:uid(), nom, type:document.getElementById('cType').value, date:document.getElementById('cDate').value||null, filters:readFilters(), entriesCount:0 };
  courses.push(c); LS.set('cross.courses', courses);
  const list = filterStudentsBy(c.filters, c.date);
  const entries = list.map(s=>({studentId:s.id, bib:null}));
  setEntries(c.id, entries); c.entriesCount=entries.length; LS.set('cross.courses', courses);
  // reset
  ['cNom','cDate','fClasses','fAgeMin','fAgeMax','fGenre'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.querySelector('#tblPreview tbody').innerHTML=''; document.getElementById('previewCount').textContent='0';
  renderCoursesTable(); fillCourseSelects();
  alert(`Course créée : ${c.nom} (${entries.length} participants)`);
};

/* ====== Tableau/édition des courses ====== */
let editingCourseId = null;
function renderCoursesTable(){
  const tb = document.querySelector('#tblCourses tbody'); tb.innerHTML='';
  courses.forEach((c,i)=>{
    const f=c.filters, fstr = [
      f.genre?`Genre=${f.genre}`:'Tous',
      (f.classes?.length)?`Classes=${f.classes.join('/')}`:'Toutes',
      (f.ageMin!=null)?`Âge≥${f.ageMin}`:'', (f.ageMax!=null)?`Âge≤${f.ageMax}`:''
    ].filter(Boolean).join(', ');
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${c.nom}</td><td>${c.type==='laps'?'Tours':'Temps'}</td>
      <td>${c.date||''}</td><td>${fstr||'—'}</td><td>${c.entriesCount||0}</td>
      <td>
        <button class="btn ghost" data-act="edit" data-id="${c.id}">Éditer</button>
        <button class="btn danger" data-act="del" data-id="${c.id}">Supprimer</button>
      </td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('button[data-act="del"]').forEach(b=>{
    b.onclick = ()=>{
      const id=b.dataset.id;
      if(confirm('Supprimer cette course et ses données locales ?')){
        courses=courses.filter(x=>x.id!==id); LS.set('cross.courses', courses);
        localStorage.removeItem(`cross.entries.${id}`);
        localStorage.removeItem(`cross.res.laps.${id}`);
        localStorage.removeItem(`cross.res.time.${id}`);
        renderCoursesTable(); fillCourseSelects();
      }
    };
  });
  tb.querySelectorAll('button[data-act="edit"]').forEach(b=>{
    b.onclick = ()=>{
      const id=b.dataset.id; const c=courses.find(x=>x.id===id); if(!c) return;
      editingCourseId=id;
      document.getElementById('eNom').value=c.nom;
      document.getElementById('eType').value=c.type;
      document.getElementById('eDate').value=c.date||'';
      document.getElementById('eGenre').value=c.filters.genre||'';
      document.getElementById('eClasses').value=(c.filters.classes||[]).join(',');
      document.getElementById('eAgeMin').value=c.filters.ageMin??'';
      document.getElementById('eAgeMax').value=c.filters.ageMax??'';
      document.getElementById('editCourseDlg').showModal();
    };
  });
}
document.getElementById('btnSaveEdit').addEventListener('click',(ev)=>{
  ev.preventDefault(); if(!editingCourseId) return;
  const idx=courses.findIndex(x=>x.id===editingCourseId); if(idx<0) return;
  if(!confirm('Confirmer : réécrire la liste participants et effacer les résultats ?')) return;
  const c=courses[idx];
  c.nom=document.getElementById('eNom').value.trim()||c.nom;
  c.type=document.getElementById('eType').value;
  c.date=document.getElementById('eDate').value||null;
  c.filters={
    genre:document.getElementById('eGenre').value||'',
    classes:(document.getElementById('eClasses').value||'').split(',').map(s=>s.trim()).filter(Boolean),
    ageMin:document.getElementById('eAgeMin').value?Number(document.getElementById('eAgeMin').value):null,
    ageMax:document.getElementById('eAgeMax').value?Number(document.getElementById('eAgeMax').value):null
  };
  const list = filterStudentsBy(c.filters, c.date);
  const entries = list.map(s=>({studentId:s.id, bib:null}));
  setEntries(c.id, entries); c.entriesCount=entries.length; LS.set('cross.courses', courses);
  localStorage.removeItem(`cross.res.laps.${c.id}`);
  localStorage.removeItem(`cross.res.time.${c.id}`);
  document.getElementById('editCourseDlg').close(); editingCourseId=null;
  renderCoursesTable(); fillCourseSelects();
  alert('Course mise à jour.');
});

/* ====== Selects ====== */
function fillCourseSelects(){
  const selD=document.getElementById('selCourseDossards');
  if(selD) setOptions(selD, courses, c=>({value:c.id, label:`${c.nom} (${c.type==='laps'?'Tours':'Temps'})`}));
  const laps=courses.filter(c=>c.type==='laps');
  setOptions(document.getElementById('selCourseLaps'), laps, c=>({value:c.id,label:c.nom}));
  const times=courses.filter(c=>c.type==='time');
  setOptions(document.getElementById('selCourseTime'), times, c=>({value:c.id,label:c.nom}));
  const selR=document.getElementById('selCourseResults');
  if(selR) setOptions(selR, courses, c=>({value:c.id, label:`${c.nom} (${c.type==='laps'?'Tours':'Temps'})`}));

  guardSelect(document.getElementById('selCourseLaps'), lapsFM);
  guardSelect(document.getElementById('selCourseTime'), timeFM);
}

/* ====== Dossards ====== */
document.getElementById('btnMakeBibs').onclick = ()=>{
  const cid = document.getElementById('selCourseDossards').value;
  if(!cid) return alert('Choisir une course');
  const entries = getEntries(cid); if(!entries.length) return alert('Aucun participant');
  const start = Number(document.getElementById('bibStart').value||1);
  const prefix = document.getElementById('bibPrefix').value||'';
  const event  = document.getElementById('eventName').value||'';
  entries.forEach((e,i)=> e.bib = prefix + String(start+i));
  setEntries(cid, entries);

  const mapStudent = Object.fromEntries(students.map(s=>[s.id,s]));
  const cont=document.getElementById('bibPreview'); cont.innerHTML='';
  entries.forEach((en,i)=>{
    const s=mapStudent[en.studentId]||{};
    const card=document.createElement('div'); card.className='bib-card';
    card.innerHTML=`<div class="bib-head"><div>${event?`<span>${event}</span>`:'<span>&nbsp;</span>'}</div><div><small>${(s.classe||'').toUpperCase()}</small></div></div>
      <div class="bib-number">${en.bib}</div>
      <div class="bib-meta"><div>${(s.nom||'').toUpperCase()} ${s.prenom||''}</div><div><small>${courses.find(c=>c.id===cid)?.nom||''}</small></div></div>
      <div class="bib-barcode"><svg id="bc_${i}"></svg></div>`;
    cont.appendChild(card);
    try{ JsBarcode(`#bc_${i}`, en.bib, {format:'CODE128', displayValue:true, fontSize:16, height:70, margin:4}); }catch(e){}
  });
  const c=courses.find(x=>x.id===cid); if(c){ c.entriesCount=entries.length; LS.set('cross.courses', courses); renderCoursesTable(); }
};
document.getElementById('btnPrintBibs').onclick = ()=> window.print();

/* ====== Aides état boutons ====== */
function setGroupDisabled(groupEl, disabled){ groupEl.setAttribute('aria-disabled', disabled?'true':'false'); groupEl.querySelectorAll('button,select').forEach(el=> el.disabled = !!disabled); }

/* ====== Course au tour : états & actions ====== */
function setStateLaps(state){
  // idle | loaded | running | finished
  setGroupDisabled(document.getElementById('g1Laps'), state==='running');
  const g2=document.getElementById('g2Laps');
  if(state==='idle'){ setGroupDisabled(g2, true); lapsFM.stop(); }
  if(state==='loaded'){ setGroupDisabled(g2, false); document.getElementById('btnStartLaps').disabled=false; document.getElementById('btnFinishLaps').disabled=true; lapsFM.stop(); }
  if(state==='running'){ setGroupDisabled(g2, false); document.getElementById('btnStartLaps').disabled=true; document.getElementById('btnFinishLaps').disabled=false; lapsFM.start(); }
  if(state==='finished'){ setGroupDisabled(g2, true); lapsFM.stop(); }
}
document.getElementById('btnLoadLaps').onclick = ()=>{
  const cid=document.getElementById('selCourseLaps').value; if(!cid) return alert('Choisir une course');
  renderLapsTables(); setStateLaps('loaded');
};
document.getElementById('btnStartLaps').onclick = ()=>{
  const cid=document.getElementById('selCourseLaps').value; if(!cid) return alert('Choisir une course');
  const res=getResLaps(cid); res.started=true; setResLaps(cid,res); setStateLaps('running');
};
document.getElementById('btnFinishLaps').onclick = ()=>{
  const cid=document.getElementById('selCourseLaps').value; if(!cid) return alert('Choisir une course');
  const res=getResLaps(cid); res.started=false; setResLaps(cid,res); setStateLaps('finished');
};
document.getElementById('btnResetLaps').onclick = ()=>{
  const cid=document.getElementById('selCourseLaps').value; if(!cid) return alert('Choisir une course');
  if(confirm('Effacer les résultats de cette course ?')){
    setResLaps(cid, {lapsByBib:{}, last:{}, started:false});
    renderLapsTables(); setStateLaps('loaded');
  }
};
document.getElementById('scanInput').addEventListener('keydown', e=>{
  if(e.key!=='Enter') return;
  const code = e.currentTarget.value.trim(); e.currentTarget.value=''; if(!code) return;
  const cid=document.getElementById('selCourseLaps').value; if(!cid) return alert('Choisir une course');
  const res=getResLaps(cid); if(!res.started) return;
  res.lapsByBib[code]=(res.lapsByBib[code]||0)+1; res.last[code]=nowISO(); setResLaps(cid,res); renderLapsTables();
});
function renderLapsTables(){
  const cid=document.getElementById('selCourseLaps').value;
  const tb1=document.querySelector('#tblLapsInd tbody'), tb2=document.querySelector('#tblLapsClass tbody');
  if(!cid){ tb1.innerHTML=''; tb2.innerHTML=''; return; }
  const entries=getEntries(cid), byBib=Object.fromEntries(entries.filter(e=>e.bib).map(e=>[e.bib,e]));
  const mapStudent=Object.fromEntries(students.map(s=>[s.id,s])); const res=getResLaps(cid);
  const rows=Object.keys(byBib).map(b=>{
    const e=byBib[b], s=mapStudent[e.studentId]||{}, tours=res.lapsByBib[b]||0, last=res.last[b]?new Date(res.last[b]):null;
    return {bib:b, nom:s.nom||'', prenom:s.prenom||'', classe:s.classe||'', tours, last};
  }).sort((a,b)=> b.tours!==a.tours ? b.tours-a.tours : ((a.last?.getTime()||0)-(b.last?.getTime()||0)));
  tb1.innerHTML=''; rows.forEach((r,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${r.bib}</td><td>${r.nom} ${r.prenom}</td><td>${r.classe}</td><td>${r.tours}</td><td>${r.last? r.last.toLocaleTimeString() : ''}</td>`;
    tb1.appendChild(tr);
  });
  const sums={}; rows.forEach(r=> sums[r.classe]=(sums[r.classe]||0)+r.tours);
  const cls=Object.keys(sums).map(k=>({classe:k||'—', total:sums[k]})).sort((a,b)=>b.total-a.total);
  tb2.innerHTML=''; cls.forEach((r,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${i+1}</td><td>${r.classe}</td><td>${r.total}</td>`; tb2.appendChild(tr); });
}

/* ====== Course au temps : états & actions ====== */
let timeTimer=null;
function stopChrono(){ if(timeTimer){ clearInterval(timeTimer); timeTimer=null; } }
function updateChronoDisplay(){
  const cid=document.getElementById('selCourseTime').value; const el=document.getElementById('timeChrono'); if(!el) return;
  if(!cid){ el.textContent='00:00'; return; }
  const res=getResTime(cid); if(!res.startedAt){ el.textContent='00:00'; return; }
  const tick=()=>{ el.textContent=fmtMinSec(Date.now()-res.startedAt); };
  tick(); stopChrono(); timeTimer=setInterval(tick,1000);
}
function setStateTime(state){
  // idle | loaded | running | finished
  setGroupDisabled(document.getElementById('g1Time'), state==='running');
  const g2=document.getElementById('g2Time');
  if(state==='idle'){ setGroupDisabled(g2, true); timeFM.stop(); stopChrono(); document.getElementById('timeChrono').textContent='00:00'; }
  if(state==='loaded'){ setGroupDisabled(g2, false); document.getElementById('btnStartTime').disabled=false; document.getElementById('btnFinishTime').disabled=true; timeFM.stop(); stopChrono(); document.getElementById('timeChrono').textContent='00:00'; }
  if(state==='running'){ setGroupDisabled(g2, false); document.getElementById('btnStartTime').disabled=true; document.getElementById('btnFinishTime').disabled=false; timeFM.start(); }
  if(state==='finished'){ setGroupDisabled(g2, true); timeFM.stop(); stopChrono(); }
}
document.getElementById('btnLoadTime').onclick = ()=>{
  const cid=document.getElementById('selCourseTime').value; if(!cid) return alert('Choisir une course');
  renderPendingTable(); renderFinishTable(); setStateTime('loaded');
};
document.getElementById('btnStartTime').onclick = ()=>{
  const cid=document.getElementById('selCourseTime').value; if(!cid) return alert('Choisir une course');
  const res={startedAt:Date.now(), arrivals:[]}; setResTime(cid,res);
  renderPendingTable(); renderFinishTable(); updateChronoDisplay(); setStateTime('running');
};
document.getElementById('btnFinishTime').onclick = ()=>{
  const cid=document.getElementById('selCourseTime').value; if(!cid) return alert('Choisir une course');
  setStateTime('finished');
};
document.getElementById('btnResetTime').onclick = ()=>{
  const cid=document.getElementById('selCourseTime').value; if(!cid) return alert('Choisir une course');
  if(confirm('Effacer les arrivées et remettre le chrono à zéro ?')){
    setResTime(cid,{startedAt:null, arrivals:[]});
    renderPendingTable(); renderFinishTable(); setStateTime('loaded');
  }
};
document.getElementById('finishInput').addEventListener('keydown', e=>{
  if(e.key!=='Enter') return;
  const code=e.currentTarget.value.trim(); e.currentTarget.value=''; if(!code) return;
  const cid=document.getElementById('selCourseTime').value; if(!cid) return alert('Choisir une course');
  const res=getResTime(cid); if(!res.startedAt) return alert('Départ non lancé');
  if(res.arrivals.some(a=>a.bib===code)) return;
  const t=Date.now()-res.startedAt;
  res.arrivals.push({bib:code, ms:t, at:new Date().toISOString()}); setResTime(cid,res);
  renderPendingTable(); renderFinishTable();
});
function renderPendingTable(){
  const cid=document.getElementById('selCourseTime').value; const tb=document.querySelector('#tblPending tbody'); if(!tb){return;}
  tb.innerHTML=''; if(!cid) return;
  const entries=getEntries(cid).filter(e=>e.bib);
  const res=getResTime(cid); const arrived=new Set(res.arrivals.map(a=>a.bib));
  const mapStudent=Object.fromEntries(students.map(s=>[s.id,s]));
  entries.filter(e=>!arrived.has(e.bib)).forEach((e,i)=>{
    const s=mapStudent[e.studentId]||{}; const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${e.bib}</td><td>${s.nom||''} ${s.prenom||''}</td><td>${s.classe||''}</td>`;
    tb.appendChild(tr);
  });
}
function renderFinishTable(){
  const cid=document.getElementById('selCourseTime').value; const tb=document.querySelector('#tblFinish tbody'); if(!tb){return;}
  tb.innerHTML=''; if(!cid) return;
  const entries=getEntries(cid); const mapByBib=Object.fromEntries(entries.filter(e=>e.bib).map(e=>[e.bib,e]));
  const mapStudent=Object.fromEntries(students.map(s=>[s.id,s]));
  const res=getResTime(cid);
  res.arrivals.forEach((a,i)=>{
    const st=mapStudent[ mapByBib[a.bib]?.studentId ] || {};
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${a.bib}</td><td>${st.nom||''} ${st.prenom||''}</td><td>${st.classe||''}</td><td>${fmtMinSec(a.ms)}</td><td>${new Date(a.at).toLocaleTimeString()}</td>`;
    tb.appendChild(tr);
  });
}

/* ====== Résultats ====== */
function renderResults(mode=null){
  const cid=document.getElementById('selCourseResults').value;
  const wrap=document.getElementById('resultsWrap'); wrap.innerHTML='';
  const btnDefault=document.getElementById('btnPrintResults');
  const btnInd=document.getElementById('btnPrintLapsInd');
  const btnCls=document.getElementById('btnPrintLapsClass');
  btnDefault.style.display='none'; btnInd.style.display='none'; btnCls.style.display='none';
  if(!cid) return;
  const c=courses.find(x=>x.id===cid);
  if(c.type==='laps'){
    btnInd.style.display='inline-block'; btnCls.style.display='inline-block';
    if(mode==='laps-class'){ renderResultsLapsClass(c, wrap); } else { renderResultsLapsInd(c, wrap); }
  }else{
    btnDefault.style.display='inline-block'; renderResultsTime(c, wrap);
  }
}
function renderResultsLapsInd(c, wrap){
  const entries=getEntries(c.id); const mapByBib=Object.fromEntries(entries.filter(e=>e.bib).map(e=>[e.bib,e]));
  const mapStudent=Object.fromEntries(students.map(s=>[s.id,s]));
  const res=getResLaps(c.id);
  const rows=Object.keys(mapByBib).map(b=>{
    const e=mapByBib[b], s=mapStudent[e.studentId]||{}, tours=res.lapsByBib[b]||0, last=res.last[b]?new Date(res.last[b]):null;
    return {bib:b, nom:s.nom||'', prenom:s.prenom||'', classe:s.classe||'', tours, last};
  }).sort((a,b)=> b.tours!==a.tours ? b.tours-a.tours : ((a.last?.getTime()||0)-(b.last?.getTime()||0)));
  const div=document.createElement('div'); div.className='printable card';
  div.innerHTML=`<h3>Résultats – ${c.nom} (Individuel – Tours)</h3>`;
  const t=document.createElement('table');
  t.innerHTML=`<thead><tr><th>Rang</th><th>Dossard</th><th>Nom</th><th>Classe</th><th>Tours</th></tr></thead><tbody></tbody>`;
  rows.forEach((r,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${i+1}</td><td>${r.bib}</td><td>${r.nom} ${r.prenom}</td><td>${r.classe}</td><td>${r.tours}</td>`; t.querySelector('tbody').appendChild(tr); });
  div.appendChild(t); wrap.appendChild(div);
}
function renderResultsLapsClass(c, wrap){
  const entries=getEntries(c.id); const mapByBib=Object.fromEntries(entries.filter(e=>e.bib).map(e=>[e.bib,e]));
  const mapStudent=Object.fromEntries(students.map(s=>[s.id,s]));
  const res=getResLaps(c.id);
  const rows=Object.keys(mapByBib).map(b=>{
    const e=mapByBib[b], s=mapStudent[e.studentId]||{}, tours=res.lapsByBib[b]||0;
    return {classe:s.classe||'', tours};
  });
  const sums={}; rows.forEach(r=> sums[r.classe]=(sums[r.classe]||0)+r.tours);
  const cls=Object.keys(sums).map(k=>({classe:k||'—', total:sums[k]})).sort((a,b)=>b.total-a.total);
  const div=document.createElement('div'); div.className='printable card';
  div.innerHTML=`<h3>Résultats – ${c.nom} (Par classe – Tours cumulés)</h3>`;
  const t=document.createElement('table');
  t.innerHTML=`<thead><tr><th>Rang</th><th>Classe</th><th>Tours cumulés</th></tr></thead><tbody></tbody>`;
  cls.forEach((r,i)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${i+1}</td><td>${r.classe}</td><td>${r.total}</td>`; t.querySelector('tbody').appendChild(tr); });
  div.appendChild(t); wrap.appendChild(div);
}
function renderResultsTime(c, wrap){
  const entries=getEntries(c.id); const mapByBib=Object.fromEntries(entries.filter(e=>e.bib).map(e=>[e.bib,e]));
  const mapStudent=Object.fromEntries(students.map(s=>[s.id,s]));
  const res=getResTime(c.id);
  const div=document.createElement('div'); div.className='printable card';
  div.innerHTML=`<h3>Résultats – ${c.nom} (Temps / ordre d’arrivée)</h3>`;
  const t=document.createElement('table');
  t.innerHTML=`<thead><tr><th>Rang</th><th>Dossard</th><th>Nom</th><th>Classe</th><th>Temps</th></tr></thead><tbody></tbody>`;
  res.arrivals.forEach((a,i)=>{
    const st=mapStudent[ mapByBib[a.bib]?.studentId ] || {};
    const tr=document.createElement('tr'); tr.innerHTML=`<td>${i+1}</td><td>${a.bib}</td><td>${st.nom||''} ${st.prenom||''}</td><td>${st.classe||''}</td><td>${fmtMinSec(a.ms)}</td>`;
    t.querySelector('tbody').appendChild(tr);
  });
  div.appendChild(t); wrap.appendChild(div);
}

/* Impression boutons */
document.getElementById('btnPrintResults').onclick = ()=>{ renderResults(); window.print(); };
document.getElementById('btnPrintLapsInd').onclick = ()=>{ renderResults('laps-ind'); window.print(); };
document.getElementById('btnPrintLapsClass').onclick = ()=>{ renderResults('laps-class'); window.print(); };

/* Listeners neutres pour selects */
document.getElementById('selCourseLaps').addEventListener('change', ()=>{});
document.getElementById('selCourseTime').addEventListener('change', ()=>{});
document.getElementById('selCourseResults').addEventListener('change', ()=> renderResults());

/* Init */
fillCourseSelects();
