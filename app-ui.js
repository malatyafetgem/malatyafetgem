// app-ui.js — Tabs, navigation, dropdowns, search, filters, charts, exports

let currentPane = 'anasayfa_genel';

window.addEventListener('popstate', function(e) {
  let isMobile = window.innerWidth < 768;
  let loginVisible = getEl('loginScreen') && getEl('loginScreen').style.display !== 'none';
  if(loginVisible) return;

  if(isMobile) {
    if(currentPane === 'anasayfa_genel') {
      if(e.state && e.state.pane === 'anasayfa_genel') return;
      executeTabSwitch('anasayfa_genel', true);
      return;
    }
    executeTabSwitch('anasayfa_genel', true);
    window.history.replaceState({ pane: 'anasayfa_genel' }, '', window.location.pathname);
    return;
  }
  let targetPane = (e.state && e.state.pane) ? e.state.pane : 'anasayfa_genel';
  executeTabSwitch(targetPane, true);
});

function sTab(id, el) {
  try { if (window.event && window.event.preventDefault) window.event.preventDefault(); } catch(e){}
  if (id === currentPane) return false;
  executeTabSwitch(id, false);
  return false;
}

function executeTabSwitch(id, isPopState) {
  if(id === 'ayarlar' && !document.body.classList.contains('is-admin')) return;

  if (!isPopState) {
      let isMobile = window.innerWidth < 768;
      if (id === 'anasayfa_genel') {
          window.history.replaceState({ pane: 'anasayfa_genel' }, '', window.location.pathname);
      } else if (isMobile) {
          window.history.pushState({ pane: id }, '', '#' + id);
      } else if (currentPane === 'anasayfa_genel') {
          window.history.pushState({pane: id}, '', '#' + id);
      } else {
          window.history.replaceState({pane: id}, '', '#' + id);
      }
  }
  currentPane = id;

  document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active-pane')); 
  getEl(id).classList.add('active-pane');
  document.querySelectorAll('.nav-sidebar .nav-link').forEach(x=>x.classList.remove('active')); 
  
  let matchLink = document.getElementById('nav-' + id);
  if (matchLink) matchLink.classList.add('active');

  const titles={anasayfa_genel:'Ana Sayfa',anasayfa:'Öğrenci',sonuclar:'Sonuçlar & Analizler',rapor:'Toplu Rapor',ayarlar:'Ayarlar'};
  if(getEl('breadcrumb')) getEl('breadcrumb').textContent = titles[id] || id;

  if(id==='anasayfa_genel'){uStat();}
  if(id==='anasayfa'){if(aNo)reqProfile();}
  if(id==='sonuclar')reqUI();
  if(id==='rapor')raporInit();
  if(id==='ayarlar'){rTabS();rTabE();}
  
  if(window.innerWidth < 992){
      document.body.classList.remove('sidebar-open');
      document.body.classList.add('sidebar-collapse');
  }
}

async function sAct(no,clr=false){
  aNo=no; if(clr){let st=DB.s.find(x=>x.no===no); getEl('sInp').value=st?(st.name+' ('+st.class+')'):'';getEl('sRes').innerHTML='';getEl('sRes').style.display='none';}
  let s=DB.s.find(x=>x.no===aNo);
  getEl('aBadge').innerHTML=s?`<span class="badge badge-success badge-pill px-3 py-2"><i class="fas fa-check-circle mr-1"></i>Seçili Öğrenci: ${s.name} (${s.class})</span>`:'<span class="text-muted">Seçilmedi</span>';
  let ab=getEl('anlStuBadge'); if(ab)ab.innerHTML=s?`<span class="badge badge-success badge-pill px-2 py-1" style="font-size:0.8em;"><i class="fas fa-check-circle mr-1"></i>Seçili Öğrenci: ${s.name} (${s.class})</span>`:'';
  getEl('homeArea').innerHTML='';
  if(no) await reqProfile(); if(getEl('sonuclar').classList.contains('active-pane')) reqUI(); 
}

function getGrade(cls){ let m=String(cls||'').match(/^(\d+)/); return m?m[1]:''; }
function getBrVal(){ let el=getEl('aBr'); if(!el) return ''; let v=el.value; return (v==='__ALL__'||!v)?'':v; }

function mkChart(canvasId,labels,datasets,rev=false){
  let gCol='#e2e8f0';
  let txtCol='#475569';
  try { let _prev = Chart.getChart && Chart.getChart(canvasId); if(_prev) _prev.destroy(); } catch(e){}
  let _cv = getEl(canvasId); if(!_cv) return null;
  return new Chart(_cv,{
    type:'bar', data:{labels,datasets}, plugins: [ChartDataLabels],
    options:{ 
      responsive:true,maintainAspectRatio:false, animation:false, 
      plugins:{
        legend:{ position:'top', labels:{ font:{size:10}, boxWidth:12, padding:6, generateLabels: function(chart) { let orig = Chart.defaults.plugins.legend.labels.generateLabels(chart); orig.forEach(lbl => { if(lbl.text && lbl.text.length > 20) lbl.text = lbl.text.substring(0,18)+'…'; }); return orig; } } },
        datalabels: { display: false }
      }, 
      scales:{ x:{grid:{color:gCol}, ticks:{font:{size:9}}}, y:{reverse:rev,min:rev?1:undefined,grid:{color:gCol}, ticks:{font:{size:9}}} } 
    }
  });
}

function _tblToWsSafe(tbl){
  let aoa=[], rows=tbl.querySelectorAll('tr');
  rows.forEach(tr=>{
    let row=[], cells=tr.querySelectorAll('th,td');
    cells.forEach(td=>{
      let txt=(td.innerText||td.textContent||'').trim();
      row.push(txt);
    });
    aoa.push(row);
  });
  let ws=XLSX.utils.aoa_to_sheet(aoa, {dense:false});
  let range=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
  for(let R=range.s.r;R<=range.e.r;R++){
    for(let C=range.s.c;C<=range.e.c;C++){
      let ref=XLSX.utils.encode_cell({r:R,c:C});
      let cell=ws[ref];
      if(cell && cell.t!=='s'){ cell.t='s'; cell.v=String(cell.v); }
    }
  }
  let wscols=[];
  for(let C=range.s.c;C<=range.e.c;C++){
    let maxW=6;
    for(let R=range.s.r;R<=range.e.r;R++){
      let cell=ws[XLSX.utils.encode_cell({r:R,c:C})];
      if(cell&&cell.v) maxW=Math.max(maxW,String(cell.v).length+2);
    }
    wscols.push({wch:Math.min(maxW,32)});
  }
  ws['!cols']=wscols;
  return ws;
}

function xXL(id,fn){
  let tbl=getEl(id), wb=XLSX.utils.book_new();
  let ws=_tblToWsSafe(tbl);
  XLSX.utils.book_append_sheet(wb,ws,'Rapor');
  XLSX.writeFile(wb,fn+'.xlsx');
}

function xXLMul(cId,fn){
  let wb=XLSX.utils.book_new(), ts=getEl(cId).getElementsByTagName('table');
  for(let i=0;i<ts.length;i++){
    let ws=_tblToWsSafe(ts[i]);
    XLSX.utils.book_append_sheet(wb,ws,ts[i].getAttribute('data-sh')||('Sayfa'+i));
  }
  XLSX.writeFile(wb,fn+'.xlsx');
}

// ===== YAZDIRMA (PRINT) FONKSİYONU =====
function xPR(sourceId, title, btn, orientation) {
  if(window._karneCharts) window._karneCharts.forEach(ch => { try { ch.tooltip.setActiveElements([]); ch.update('none'); } catch(e){} });
  if(window._raporCharts) window._raporCharts.forEach(ch => { try { ch.tooltip.setActiveElements([]); ch.update('none'); } catch(e){} });
  if(c.a) { try { c.a.tooltip.setActiveElements([]); c.a.update('none'); } catch(e){} }
  if(c.h) { try { c.h.tooltip.setActiveElements([]); c.h.update('none'); } catch(e){} }

  let portraitSources =['pS','pC','pSubj','pSummary','pGenSummary'];
  let isPortrait = orientation === 'portrait' || portraitSources.includes(sourceId);
  let orig = btn.innerHTML; btn.innerHTML = "<i class='fas fa-spinner fa-spin mr-1'></i>"; btn.disabled = true;

  let sourceEl = getEl(sourceId); if (!sourceEl) { btn.innerHTML = orig; btn.disabled = false; return; }

  let canvasMap =[];
  sourceEl.querySelectorAll('canvas').forEach(cv => {
    try {
      let url = '';
      if (cv.width > 0 && cv.height > 0) { url = cv.toDataURL('image/png', 1.0); }
      if (!url || url === 'data:,' || url.length < 100) {
        let chInst = (window.Chart && Chart.getChart) ? Chart.getChart(cv) : null;
        if (chInst) {
          let parentRect = cv.parentElement ? cv.parentElement.getBoundingClientRect() : { width: 0, height: 0 };
          let w = parentRect.width  > 50 ? parentRect.width  : 720;
          let h = parentRect.height > 50 ? parentRect.height : 320;
          let oldStyle = cv.getAttribute('style') || '';
          cv.style.width  = w + 'px'; cv.style.height = h + 'px';
          try { chInst.resize(w, h); chInst.update('none'); } catch(e) {}
          url = cv.toDataURL('image/png', 1.0);
          cv.setAttribute('style', oldStyle);
          try { chInst.resize(); } catch(e) {}
        }
      }
      if (url && url !== 'data:,' && url.length > 100) canvasMap.push({ id: cv.id, url: url });
    } catch(e) {}
  });

  // SADECE STYLE.CSS'İ EKLİYORUZ - Başka satır içi stilleri temizledik!
  let cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(l => `<link rel="stylesheet" href="${l.href}">`).join('\n');

  let clone = sourceEl.cloneNode(true);
  clone.querySelectorAll('canvas').forEach((cv, idx) => {
    let mapEntry = canvasMap.find(m => m.id && m.id === cv.id) || canvasMap[idx];
    if (!mapEntry || !mapEntry.url) { cv.remove(); return; }
    let img = document.createElement('img');
    img.src = mapEntry.url;
    img.className = 'print-chart-img';
    cv.parentElement.replaceChild(img, cv);
  });

  clone.querySelectorAll('.no-print, .d-flex.justify-content-end, .scroll-hint').forEach(el => el.remove());
  clone.querySelectorAll('.report-header').forEach(el => el.style.display = 'flex');

  let examBlocks = clone.querySelectorAll('.exam-type-block');
  examBlocks.forEach((blk, idx) => {
    let stuName  = blk.getAttribute('data-stu-name')  || '';
    let stuClass = blk.getAttribute('data-stu-class') || '';
    let wrapper = blk.closest('.student-rapor-wrapper');
    let isFirstInScope = wrapper ? (wrapper.querySelectorAll('.exam-type-block')[0] === blk) : (idx === 0);

    if(isFirstInScope) {
      blk.style.cssText += '; page-break-inside: auto; break-inside: auto;';
      blk.classList.add('exam-type-first');
    } else {
      let isKarne = blk.classList.contains('karne-bolum');
      if(stuName && !isKarne) {
        let hdr = document.createElement('div');
        hdr.className = 'report-header print-page-hdr';
        hdr.style.cssText = 'margin-bottom:10px; margin-top:0; page-break-before:always; break-before:page;';
        hdr.innerHTML = `<span style="font-size:15px;"><i class="fas fa-user-graduate mr-2"></i><strong>${stuName}</strong></span><span style="font-size:12px;">Sınıf: ${stuClass} | ${new Date().toLocaleDateString('tr-TR')}</span>`;
        blk.parentNode.insertBefore(hdr, blk);
        blk.style.cssText += '; page-break-before: auto; break-before: auto; page-break-inside: auto; break-inside: auto;';
      } else {
        blk.style.cssText += '; page-break-before: always; break-before: page; page-break-inside: auto; break-inside: auto;';
      }
    }
    blk.querySelectorAll('.chart-box, .boxplot-card, .boxplot-wrap').forEach(el => {
      el.style.cssText += '; page-break-inside: avoid; break-inside: avoid;';
    });
  });

  let wrappers = clone.querySelectorAll('.student-rapor-wrapper');
  wrappers.forEach((w, i) => {
    if(i > 0) w.style.cssText += '; page-break-before: always; break-before: page;';
    w.style.cssText += '; page-break-inside: auto; break-inside: auto;';
  });

  clone.querySelectorAll('.karne-bolum').forEach((blk, idx) => {
    if(blk.classList.contains('exam-type-block')) return;
    if(idx > 0) blk.style.cssText += '; page-break-before: always; break-before: page;';
    blk.style.cssText += '; page-break-inside: auto; break-inside: auto;';
  });

  if(sourceId === 'pED' || sourceId === 'pEDAll') {
    clone.querySelectorAll('table').forEach(tbl => { tbl.style.pageBreakInside = 'auto'; tbl.style.breakInside = 'auto'; tbl.style.width = '100%'; });
    clone.querySelectorAll('tbody tr').forEach(tr => { tr.style.pageBreakInside = 'avoid'; tr.style.breakInside = 'avoid'; });
    clone.querySelectorAll('thead').forEach(h => { h.style.display = 'table-header-group'; });
  }

  // Çakışan karmaşık stiller yerine sadece yazdırma ızgarası (grid) ve boyutlandırma kuralları.
  // Ana tasarım style.css'ten alınacak.
  let printHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${cssLinks}
  <style>
    @page { margin: 7mm 6mm; size: ${isPortrait ? 'A4 portrait' : 'A4 landscape'}; }
    html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; font-size: 10px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    
    /* Layout (Flexbox Fallbacks) */
    .row { display: flex !important; flex-wrap: wrap !important; width: 100% !important; margin: 0 -5px !important; }
    .col-6, .col-sm-6, .col-md-6, .col-lg-6 { flex: 0 0 50% !important; max-width: 50% !important; width: 50% !important; padding: 0 5px !important; }
    .col-md-3, .col-sm-3 { flex: 0 0 25% !important; max-width: 25% !important; width: 25% !important; padding: 0 5px !important; }
    .col-md-4, .col-lg-4 { flex: 0 0 33.333% !important; max-width: 33.333% !important; width: 33.333% !important; padding: 0 5px !important; }
    .col-12, .col-sm-12, .col-lg-12 { flex: 0 0 100% !important; max-width: 100% !important; padding: 0 5px !important; }
    .col-md-4.col-sm-12 { flex: 0 0 33.333% !important; max-width: 33.333% !important; width: 33.333% !important; padding: 0 5px !important; }
    .col-md-2 { flex: 0 0 16.666% !important; max-width: 16.666% !important; width: 16.666% !important; padding: 0 5px !important; }

    /* Medya ve Grafik Boyutlandırma */
    .print-chart-img { max-width: 100%; width: 100%; max-height: ${isPortrait ? '170px' : '130px'}; height: auto; object-fit: contain; display: block; margin: 2px auto 5px; }
    .chart-box { height: auto !important; margin-bottom: 5px; page-break-inside: avoid !important; break-inside: avoid !important; }
    .boxplot-wrap { overflow: visible !important; }
    .boxplot-svg { max-height: ${isPortrait ? '120px' : '100px'} !important; width: 100% !important; height: auto !important; }

    /* Gereksizlerin Gizlenmesi */
    .no-print, button, .btn, .scroll-hint, .d-flex.justify-content-end, #riskPanel, .main-sidebar, .main-header, .content-wrapper > .overlay { display: none !important; }
  </style>
</head>
<body>
  <div style="padding:0 3px;">${clone.outerHTML}</div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});<\/script>
</body>
</html>`;

  let printWin = window.open('', '_blank', `width=${isPortrait ? 900 : 1200},height=800,scrollbars=yes`);
  if (!printWin) { showToast('Açılır pencere engellendi!', 'warning', 6000); btn.innerHTML = orig; btn.disabled = false; return; }
  printWin.document.write(printHtml); printWin.document.close();
  btn.innerHTML = orig; btn.disabled = false;
}

function debounceSearch(){clearTimeout(searchDebounceTimer);searchDebounceTimer=setTimeout(sSearch,280);}

function sSearch(){
  let v=getEl('sInp').value.trim(),r=getEl('sRes'); if(!v){r.innerHTML='';r.style.display='none';return;}
  let trm=normTR(v).split(/\s+/), m=DB.s.filter(x=>{let txt=normTR(x.no+' '+x.name+' '+x.class);return trm.every(t=>txt.includes(t));});
  if(!m.length){r.innerHTML='<div class="s-item text-muted">Bulunamadı.</div>';r.style.display='block';return;}
  let h=''; m.slice(0,20).forEach(x=>h+=`<div class="s-item" onclick="if(event.target.closest('button'))return;sAct('${x.no}',true);"><div class="s-info"><strong>${x.no}</strong> — ${x.name} <span class="text-muted">(${x.class})</span></div><div class="s-actions"><button class="btn btn-sm btn-warning admin-only" onclick="event.stopPropagation();eStu('${x.no}')"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger admin-only" onclick="event.stopPropagation();cDel('student','${x.no} silinsin mi?','${x.no}')"><i class="fas fa-trash"></i></button></div></div>`);
  r.innerHTML=h; r.style.display='block';
}

function clrS(){getEl('sInp').value='';getEl('sRes').innerHTML='';getEl('sRes').style.display='none';sAct(null,false);}

function anlStuDoSearch(){clearTimeout(anlDebounceTimer);anlDebounceTimer=setTimeout(execAnlStuSearch,280);}

function execAnlStuSearch(){
  let v=getEl('anlStuInp').value.trim(), res=getEl('anlStuRes'); if(!v){res.style.display='none';res.innerHTML='';return;}
  let trm=normTR(v).split(/\s+/), m=DB.s.filter(x=>{let txt=normTR(x.no+' '+x.name+' '+x.class);return trm.every(t=>txt.includes(t));});
  if(!m.length){res.innerHTML='<div class="anlStu-item text-muted">Bulunamadı.</div>';res.style.display='block';return;}
  res.innerHTML=m.slice(0,20).map(x=>`<div class="anlStu-item" onclick="anlStuSelect('${x.no}')"><div style="flex:1; min-width:0;"><strong>${x.no}</strong> — ${x.name} <span class="text-muted">(${x.class})</span></div></div>`).join(''); res.style.display='block';
}

function anlStuSelect(no){
  getEl('anlStuRes').style.display='none'; let s=DB.s.find(x=>x.no===no); if(s) getEl('anlStuInp').value=s.name+' ('+s.class+')'; aNo = no;
  let ab=getEl('anlStuBadge'); if(ab) ab.innerHTML=s?`<span class="badge badge-success badge-pill px-2 py-1" style="font-size:0.8em;"><i class="fas fa-check-circle mr-1"></i>Seçili Öğrenci: ${s.name} (${s.class})</span>`:'';
  getEl('aBadge').innerHTML=s?`<span class="badge badge-success badge-pill px-3 py-2"><i class="fas fa-check-circle mr-1"></i>Seçili Öğrenci: ${s.name} (${s.class})</span>`:'<span class="text-muted">Seçilmedi</span>'; reqUI(); 
}

function anlStuClear(){ getEl('anlStuInp').value=''; getEl('anlStuRes').style.display='none'; getEl('anlStuRes').innerHTML=''; getEl('anlStuBadge').innerHTML=''; sAct(null,false); }

document.addEventListener('click',e=>{ let res=getEl('anlStuRes'),inp=getEl('anlStuInp'); if(res&&inp&&!res.contains(e.target)&&e.target!==inp)res.style.display='none'; let res2=getEl('sRes'),inp2=getEl('sInp'); if(res2&&inp2&&!res2.contains(e.target)&&e.target!==inp2)res2.style.display='none'; });

function examColorIdx(name){
  let s = String(name||''); let h = 0;
  for(let i=0;i<s.length;i++){ h = ((h<<5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h) % 8;
}
function toExamLabel(t){
  let s = String(t||'').trim();
  if(!s) return '';
  return s.split(/\s+/).map(w => {
    if(!w) return w;
    if(w.length <= 4 && w === w.toLocaleUpperCase('tr')) return w;
    let first = w.charAt(0).toLocaleUpperCase('tr');
    let rest  = w.slice(1).toLocaleLowerCase('tr');
    return first + rest;
  }).join(' ');
}

function uStat(){
  const g=getEl('dynamicStatsGrid'); if(!g) return;
  const u = {};
  Object.values(EXAM_META).forEach(m => {
    const t = m.examType; if(!t) return;
    if(!u[t]) u[t] = { total:0, grades:{} };
    u[t].total += 1;
    let gs =[];
    if(Array.isArray(m.grades) && m.grades.length) gs = m.grades.map(String);
    else if(m.grade) gs = [String(m.grade)];
    gs.forEach(gr => {
      if(!gr) return;
      u[t].grades[gr] = (u[t].grades[gr]||0) + 1;
    });
  });

  const ic =['fas fa-file-alt','fas fa-check-circle','fas fa-star','fas fa-trophy','fas fa-bookmark','fas fa-graduation-cap','fas fa-clipboard-list','fas fa-chart-line'];
  const entries = Object.entries(u).sort((a,b)=> a[0].localeCompare(b[0],'tr'));
  let h = '';
  entries.forEach(([t, info]) => {
    const colorIdx = examColorIdx(t);
    const label = toExamLabel(t);
    const gradeKeys = Object.keys(info.grades).sort((a,b)=> Number(a)-Number(b));
    const gradesHtml = gradeKeys.length
      ? gradeKeys.map(gr => `<span class="hsc-grade"><strong>${gr}. Sınıf:</strong> ${info.grades[gr]} <small>Sınav</small></span>`).join('')
      : '<span class="hsc-empty">Sınıf bilgisi yok</span>';
    
    h += `<div class="col-md-4 col-sm-6 col-12 mb-3">
      <div class="home-stat-card exam-color-${colorIdx}">
        <div class="hsc-head">
          <span class="hsc-title"><i class="${ic[colorIdx % ic.length]}"></i>${label}</span>
          <span class="hsc-count" style="font-weight: bold;">${info.total} Sınav</span>
        </div>
        <div class="hsc-grades" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">${gradesHtml}</div>
      </div>
    </div>`;
  });
  g.innerHTML = h;
}

function uDrp(){
  uExamTypes(); if(aNo){ let s=DB.s.find(x=>x.no===aNo); if(s&&getEl('anlStuInp'))getEl('anlStuInp').value=s.name+' ('+s.class+')'; }
}

function uBranches(){
  let aT = getEl('aType') ? getEl('aType').value : '';
  if(!(aT==='class'||aT==='subject'||aT==='examdetail')) return;
  let brSel = getEl('aBr'); if(!brSel) return;
  let lvlF = getEl('aLvl') ? getEl('aLvl').value : '';
  let prev = brSel.value, branches = new Set();
  DB.s.forEach(s => {
    let m = String(s.class||'').match(/^(\d+)([a-zA-ZğüşıöçĞÜŞİÖÇ]+)$/);
    if(!m) return;
    if(lvlF && m[1] !== lvlF) return;
    branches.add(m[2].toLocaleUpperCase('tr-TR'));
  });
  let sorted = [...branches].sort();
  brSel.innerHTML = `<option value="" disabled${prev?'':' selected'}>Şube Seç</option><option value="__ALL__"${prev==='__ALL__'?' selected':''}>Tümü</option>`+sorted.map(x=>`<option value="${x}"${prev===x?' selected':''}>${x}</option>`).join('');
  if(prev==='__ALL__' || sorted.includes(prev)) brSel.value = prev;
  else brSel.value = '';
}

function uExamTypes(){
  let types=new Set();
  let aT = getEl('aType') ? getEl('aType').value : '';
  let lvlF = (aT==='class'||aT==='subject'||aT==='examdetail') && getEl('aLvl') ? getEl('aLvl').value : '';
  let brF  = (aT==='class'||aT==='subject'||aT==='examdetail') ? getBrVal() : '';

  if(lvlF || brF){
    let lvlsInBranch = new Set();
    if(brF){
      DB.s.forEach(s => {
        let m = String(s.class||'').match(/^(\d+)([a-zA-ZğüşıöçĞÜŞİÖÇ]+)$/);
        if(!m) return;
        if(lvlF && m[1]!==lvlF) return;
        if(m[2].toLocaleUpperCase('tr-TR')===brF) lvlsInBranch.add(m[1]);
      });
    }
    Object.values(EXAM_META).forEach(m => {
      if(!m.examType) return;
      let gs = (m.grades && m.grades.length) ? m.grades : null;
      if(lvlF){ if(gs && !gs.includes(lvlF)) return; }
      if(brF){
        if(lvlsInBranch.size === 0) return; 
        if(gs && ![...lvlsInBranch].some(g=>gs.includes(g))) return;
      }
      types.add(m.examType);
    });
  } else {
    Object.values(EXAM_META).forEach(m => types.add(m.examType));
  }
  let sortedTypes = [...types].sort(), prev=getEl('aEx').value;
  getEl('aEx').innerHTML='<option value="" disabled' + (prev && sortedTypes.includes(prev) ? '' : ' selected') + '>Sınav Türü Seç</option>'+sortedTypes.map(x=>`<option value="${x}">${x}</option>`).join('');
  if(sortedTypes.includes(prev)) getEl('aEx').value=prev;
  else if(prev){ getEl('aEx').value=''; }
}

function uSub(){
  let aT=getEl('aType')?getEl('aType').value:'', t=getEl('aEx').value, s=new Set();
  let lvlF = (aT==='class'||aT==='subject'||aT==='examdetail') && getEl('aLvl') ? getEl('aLvl').value : '';
  let brF  = (aT==='class'||aT==='subject'||aT==='examdetail') ? getBrVal() : '';
  let dtF  = (aT==='class'||aT==='subject'||aT==='examdetail') && getEl('aDate') ? getEl('aDate').value : '';

  Object.values(EXAM_META).forEach(m => {
    if(m.examType !== t || !m.subjects) return;
    if(dtF && m.date !== dtF) return;
    if(lvlF){
      let gs = (m.grades && m.grades.length) ? m.grades : null;
      if(gs && !gs.includes(lvlF)) return;
    }
    m.subjects.forEach(subj => s.add(subj.toLocaleLowerCase('tr-TR')));
  });
  
  if(brF && DB.e.length > 0){
    let filteredS = new Set();
    DB.e.forEach(x => {
      if(x.examType !== t || !x.subs) return;
      if(dtF && x.date !== dtF) return;
      let m = String(x.studentClass||'').match(/^(\d+)([a-zA-ZğüşıöçĞÜŞİÖÇ]+)$/); if(!m) return;
      if(lvlF && m[1] !== lvlF) return;
      if(m[2].toLocaleUpperCase('tr-TR') !== brF) return;
      Object.keys(x.subs).forEach(subj => filteredS.add(subj.toLocaleLowerCase('tr-TR')));
    });
    s = new Set([...s].filter(x => filteredS.has(x)));
  }
  
  if(aT === 'student' || aT === 'class') {
    let _prev = getEl('aSub').value;
    let _defaultVal = (aT === 'class') ? 'score' : 'totalNet';
    let _selVal = _prev || _defaultVal;
    let o = `<option value="" disabled${_selVal?'':' selected'}>Veri Seç</option><option value="totalNet"${_selVal==='totalNet'?' selected':''}>Toplam Net</option><option value="score"${_selVal==='score'?' selected':''}>Puan</option>`;
    if (aT === 'student') { o += `<option value="rank_c"${_selVal==='rank_c'?' selected':''}>Sınıf Sıralaması</option><option value="rank_i"${_selVal==='rank_i'?' selected':''}>Kurum Sıralaması</option><option value="rank_g"${_selVal==='rank_g'?' selected':''}>Genel Sıralama</option>`; }
    [...s].sort().forEach(x=> o += `<option value="s_${x}"${_selVal==='s_'+x?' selected':''}>${toTitleCase(x)} Neti</option>`); getEl('aSub').innerHTML = o;
    if(_selVal) { let _opt=[...getEl('aSub').options].find(o=>o.value===_selVal); if(_opt) getEl('aSub').value=_selVal; }
  } else if (aT === 'examdetail') {
    let prev = getEl('aSub').value;
    let _validVals = ['summary','general_summary','list_single','list_all'];
    let _selVal = _validVals.includes(prev) ? prev : 'summary';
    getEl('aSub').innerHTML = `<option value="summary"${_selVal==='summary'?' selected':''}>Sınav Özeti (Tek Sınav)</option><option value="general_summary"${_selVal==='general_summary'?' selected':''}>Genel Sınav Özeti (Tüm Sınavlar)</option><option value="list_single"${_selVal==='list_single'?' selected':''}>Toplu Liste (Tek Sınav)</option><option value="list_all"${_selVal==='list_all'?' selected':''}>Toplu Liste (Tüm Sınavlar)</option>`;
    getEl('aSub').value = _selVal;
  } else if (aT === 'subject') {
    let prev = getEl('aSub').value, opts =[...s].sort().map(x=>`<option value="${x}">${toTitleCase(x)}</option>`).join('');
    let ph = `<option value="" disabled${prev?'':' selected'}>Ders Seç</option>`;
    getEl('aSub').innerHTML = opts ? (ph + opts) : '<option value="" disabled selected>Ders bulunamadı</option>';
    if([...s].includes(prev)) getEl('aSub').value = prev;
  } else {
    getEl('aSub').innerHTML='<option value="" disabled selected>Veri Seç</option>'+[...s].sort().map(x=>`<option value="${x}">${toTitleCase(x)}</option>`).join('');
  }
}

function _updateGDateVisibility() {
  let t = getEl('aType') ? getEl('aType').value : '';
  let sub = getEl('aSub') ? getEl('aSub').value : '';
  if(t === 'examdetail') {
    getEl('gDate').style.display = (sub === 'general_summary' || sub === 'list_all') ? 'none' : 'block';
  } else if(t === 'student') {
    getEl('gDate').style.display = 'none';
  } else if(t === 'class' || t === 'subject') {
    getEl('gDate').style.display = 'block';
  }
}

function _resetSel(id){
  let el = getEl(id); if(!el) return;
  el.value = '';
  if(el.options.length && el.options[0].disabled){ el.options[0].selected = true; }
}

function onLvlChange(){
  _resetSel('aBr'); _resetSel('aEx'); _resetSel('aDate'); _resetSel('aSub');
  uBranches(); uExamTypes(); uExamDates(); uSub(); _updateGDateVisibility(); reqAnl();
}

function onBrChange(){
  _resetSel('aEx'); _resetSel('aDate'); _resetSel('aSub');
  uExamTypes(); uExamDates(); uSub(); _updateGDateVisibility(); reqAnl();
}

function onExTypeChange(){
  _resetSel('aDate'); _resetSel('aSub');
  let _aExDate = getEl('aExDate'); if(_aExDate) _aExDate.value = '';
  uExamDates(); uStudentExamDates(); uSub(); _updateGDateVisibility();
  applyExamColorToFilters(); reqAnl();
}

function onExDateStudentChange(){
  applyExamColorToFilters();
  reqAnl();
}

function uStudentExamDates(){
  let el = getEl('aExDate'); if(!el) return;
  let aT = getEl('aType') ? getEl('aType').value : '';
  let eT = getEl('aEx')   ? getEl('aEx').value   : '';
  if(aT !== 'student' || !eT){
    el.innerHTML = '<option value="">Tümü</option>';
    el.value = '';
    return;
  }
  let stuGrade = null;
  if(aNo){ let st = DB.s.find(x=>x.no===aNo); if(st) stuGrade = getGrade(st.class); }
  let entries =[];
  Object.values(EXAM_META).forEach(m => {
    if(m.examType !== eT) return;
    if(stuGrade && m.grades && m.grades.length > 0 && !m.grades.includes(stuGrade)) return;
    entries.push({ date: m.date, publisher: m.publisher || '' });
  });
  let seen = new Set(), unique =[];
  entries.forEach(x => { let k = x.date+'||'+x.publisher; if(!seen.has(k)){ seen.add(k); unique.push(x); } });
  unique.sort((a,b) => srt(b.date, a.date));
  let prev = el.value;
  let opts = '<option value="">Tümü</option>' + unique.map(x => {
    let pub = x.publisher ? ` (${toTitleCase(x.publisher)})` : '';
    return `<option value="${x.date}||${x.publisher}">${x.date}${pub}</option>`;
  }).join('');
  el.innerHTML = opts;
  if(prev && [...el.options].some(o=>o.value===prev)) el.value = prev;
  else el.value = '';
}

function applyExamColorToFilters(){
  let aT = getEl('aType') ? getEl('aType').value : '';
  let eT = getEl('aEx')   ? getEl('aEx').value   : '';
  let filter = getEl('anlFilterCard');
  let res    = getEl('anlRes');
  let risk   = getEl('riskPanel');
  let aExWrap = getEl('aEx') ? getEl('aEx').closest('.aex-wrap') : null;

  [filter, res, risk, aExWrap].forEach(el => {
    if(!el) return;
    for(let i=0;i<8;i++) el.classList.remove('exam-color-'+i);
    el.removeAttribute('data-exam-color');
    if(aExWrap && el === aExWrap) el.removeAttribute('data-active');
  });

  if(!eT) return;
  let idx = (typeof examColorIdx === 'function') ? examColorIdx(eT) : 0;

  [filter, res].forEach(el => {
    if(!el) return;
    el.classList.add('exam-color-'+idx);
    el.setAttribute('data-exam-color', String(idx));
  });
  if(risk){
    let riskET = (getEl('riskExTypeFilter')||{}).value || '';
    if(aT === 'risk' && riskET){
      let rIdx = (typeof examColorIdx === 'function') ? examColorIdx(riskET) : 0;
      risk.classList.add('exam-color-'+rIdx);
      risk.setAttribute('data-exam-color', String(rIdx));
    }
  }
  if(aExWrap){
    aExWrap.classList.add('exam-color-'+idx);
    aExWrap.setAttribute('data-active','1');
  }
}

function onDateChange(){
  _resetSel('aSub');
  uSub(); _updateGDateVisibility(); reqAnl();
}

function uExamDates(){
  let t=getEl('aEx').value, dates=[], datePublisherMap = {}, aT = getEl('aType') ? getEl('aType').value : '', sub = getEl('aSub') ? getEl('aSub').value : '';
  let stuGrade = null;
  if(aNo && aT === 'examdetail' && (sub === 'summary' || sub === 'list_single')) {
    let st = DB.s.find(x=>x.no===aNo); if(st) stuGrade = getGrade(st.class);
  }
  let lvlGrade = '';
  if(aT === 'subject' || aT === 'class' || aT === 'examdetail') {
    lvlGrade = getEl('aLvl') ? getEl('aLvl').value : '';
  }

  Object.values(EXAM_META).forEach(m => {
    if(m.examType !== t) return;
    if(stuGrade && m.grades && m.grades.length > 0 && !m.grades.includes(stuGrade)) return;
    if(lvlGrade && m.grades && m.grades.length > 0 && !m.grades.includes(lvlGrade)) return;
    dates.push(m.date); if(m.publisher) datePublisherMap[m.date] = m.publisher;
  });
  
  dates = [...new Set(dates)].sort((a,b) => srt(b,a)); let prev=getEl('aDate').value;
  let placeholderOpt = `<option value="" disabled${prev?'':' selected'}>Sınav Seç</option>`;
  let allOpt = (aT === 'class' || aT === 'subject') ? '<option value="">Tüm Sınavlar</option>' : '';
  getEl('aDate').innerHTML = placeholderOpt + allOpt + dates.map(x => { let pub = datePublisherMap[x] ? ` (${toTitleCase(datePublisherMap[x])})` : ''; return `<option value="${x}">${x}${pub}</option>`; }).join('');
  if(dates.includes(prev)) getEl('aDate').value=prev;
  else if(aT === 'class' || aT === 'subject') getEl('aDate').value='';
  else if(aT === 'examdetail' && dates.length > 0) getEl('aDate').value = dates[0];
}

function uUI(){
  let t=getEl('aType').value;
  let isRisk = t === 'risk';

  getEl('gStu').style.display=(t==='student')?'block':'none';
  getEl('gLvl').style.display=(t==='class'||t==='examdetail'||t==='subject')?'block':'none';
  getEl('gBr').style.display=(t==='class'||t==='subject'||t==='examdetail')?'block':'none';

  let aExWrapper = getEl('aEx') ? getEl('aEx').closest('.form-group').parentElement : null;
  if(aExWrapper) aExWrapper.style.display = isRisk ? 'none' : '';
  getEl('gDate').style.display = isRisk ? 'none' : (t==='student' ? 'none' : 'block');
  getEl('gSub').style.display = isRisk ? 'none' : 'block';
  let gExDateEl = getEl('gExDate');
  if(gExDateEl) gExDateEl.style.display = (!isRisk && t === 'student') ? 'block' : 'none';

  ['gRiskGrade','gRiskBranch','gRiskExType','gRiskLevel'].forEach(id => {
    let el = getEl(id); if(el) el.style.display = isRisk ? 'block' : 'none';
  });

  getEl('anlRes').style.display = isRisk ? 'none' : 'block';
  getEl('riskPanel').style.display = isRisk ? 'block' : 'none';

  if(!isRisk){
    if(t==='class'){
      getEl('gDate').style.display='block';
      let dateLbl=getEl('lblDate'); if(dateLbl) dateLbl.textContent='Sınav Seç';
      getEl('gSub').style.display='block'; getEl('lblSub').textContent='Veri';
    } else if(t==='subject'){
      getEl('gDate').style.display='block';
      let dateLbl=getEl('lblDate'); if(dateLbl) dateLbl.textContent='Sınav Seç';
      getEl('gSub').style.display='block'; getEl('lblSub').textContent='Ders';
    } else if(t==='examdetail'){
      getEl('gSub').style.display='block'; getEl('lblSub').textContent='Veri';
      let sub=getEl('aSub')?getEl('aSub').value:'';
      getEl('gDate').style.display=(sub==='general_summary'||sub==='list_all')?'none':'block';
      let dateLbl=getEl('lblDate'); if(dateLbl) dateLbl.textContent='Sınav Seç';
    } else if(t==='student'){
      getEl('gDate').style.display='none';
      getEl('gSub').style.display='block'; getEl('lblSub').textContent='Veri';
    }

    if(t==='class'){
      let l=new Set(),b=new Set(); DB.s.forEach(s=>{let m=s.class.match(/^(\d+)([a-zA-ZğüşıöçĞÜŞİÖÇ]+)$/);if(m){l.add(m[1]);b.add(m[2].toLocaleUpperCase('tr-TR'));}});
      let _pL=getEl('aLvl').value, _pB=getEl('aBr').value;
      getEl('aLvl').innerHTML=`<option value="" disabled${_pL?'':' selected'}>Sınıf Seviyesi Seç</option>`+[...l].sort((a,b)=>parseInt(a)-parseInt(b)).map(x=>`<option value="${x}">${x}. Sınıf</option>`).join('');
      if(_pL && [...l].includes(_pL)) getEl('aLvl').value=_pL;
    } else if (t==='examdetail' || t==='subject') {
      let l=new Set(); DB.s.forEach(s=>{ let m=s.class.match(/^(\d+)([a-zA-ZğüşıöçĞÜŞİÖÇ]+)$/); if(m) l.add(m[1]); });
      let _pL=getEl('aLvl').value;
      getEl('aLvl').innerHTML=`<option value="" disabled${_pL?'':' selected'}>Sınıf Seviyesi Seç</option>`+[...l].sort((a,b)=>parseInt(a)-parseInt(b)).map(x=>`<option value="${x}">${x}. Sınıf</option>`).join('');
      if(_pL && [...l].includes(_pL)) getEl('aLvl').value=_pL;
    }
    uBranches(); uExamTypes(); uExamDates(); uSub();
  } else {
    _populateRiskFilterDropdowns();
    renderRiskPanel();
  }
}

function _populateRiskFilterDropdowns() {
  let gradeEl = getEl('riskGradeFilter');
  if(gradeEl) {
    let prevG = gradeEl.value;
    let grades = new Set();
    DB.s.forEach(s => { let m = s.class.match(/^(\d+)/); if(m) grades.add(m[1]); });
    gradeEl.innerHTML = '<option value="">Tüm Sınıflar</option>' + [...grades].sort((a,b)=>parseInt(a)-parseInt(b)).map(g=>`<option value="${g}">${g}. Sınıf</option>`).join('');
    if(prevG && [...grades].includes(prevG)) gradeEl.value = prevG;
  }
  let branchEl = getEl('riskBranchFilter');
  if(branchEl) {
    let prevB = branchEl.value;
    let gradeF = getEl('riskGradeFilter') ? getEl('riskGradeFilter').value : '';
    let branches = new Set();
    DB.s.forEach(s => { let m = s.class.match(/^(\d+)([a-zA-ZğüşıöçĞÜŞİÖÇ]+)$/); if(m && (!gradeF||m[1]===gradeF)) branches.add(m[2].toLocaleUpperCase('tr-TR')); });
    branchEl.innerHTML = '<option value="">Tüm Şubeler</option>' + [...branches].sort().map(b=>`<option value="${b}">${b} Şubesi</option>`).join('');
    if(prevB && [...branches].includes(prevB)) branchEl.value = prevB;
  }
  let exTypeEl = getEl('riskExTypeFilter');
  if(exTypeEl) {
    let prevET = exTypeEl.value;
    let gradeF = getEl('riskGradeFilter') ? getEl('riskGradeFilter').value : '';
    let risks = (_riskCache && _riskCache.results) ? _riskCache.results :[];
    let allTypes;
    if(risks.length > 0) {
      let filteredRisks = risks;
      if(gradeF) filteredRisks = filteredRisks.filter(r => { let m=String(r.cls||'').match(/^(\d+)/); return m && m[1]===gradeF; });
      allTypes = [...new Set(filteredRisks.flatMap(r=>r.examTypes))].sort();
    }
    if(!allTypes || !allTypes.length) {
      let typesFromMeta = new Set();
      Object.values(EXAM_META).forEach(m => {
        if(!m.examType) return;
        if(gradeF && m.grades && m.grades.length && !m.grades.includes(gradeF)) return;
        typesFromMeta.add(m.examType);
      });
      allTypes = [...typesFromMeta].sort();
    }
    exTypeEl.innerHTML = '<option value="">Tüm Sınav Türleri</option>' + allTypes.map(t=>`<option value="${t}">${t}</option>`).join('');
    if(prevET && allTypes.includes(prevET)) exTypeEl.value = prevET;
  }
}

function handleSubChange(){ 
  let t = getEl('aType').value, sub = getEl('aSub').value; 
  if(t === 'examdetail') { 
    getEl('gDate').style.display = (sub === 'general_summary' || sub === 'list_all') ? 'none' : 'block'; 
    uExamDates(); 
  } 
  _updateGDateVisibility();
  reqAnl(); 
}