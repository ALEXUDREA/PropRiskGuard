// PropRisk Guard — script.js (FINAL, cu Stripe Payment Link integrat)
document.addEventListener('DOMContentLoaded', () => {
    // ====== CONFIG STRIPE ======
    // 1) Payment Link-ul tău (ai spus: test_7sYeV68KU3SPa0hcHLgA800)
    const STRIPE_LINK = "https://buy.stripe.com/test_7sYeV68KU3SPa0hcHLgA800";
  
    // 2) Recomandat: în Stripe > Payment Link > Success URL setează:
    //    https://domeniul-tau.com/?unlock=PRG-STRP-CHECK-42
    //    (sau localhost în dev). La întoarcere, asta va debloca aplicația.
  
    // ====== HELPERS ======
    const $  = (id) => document.getElementById(id);
    const qs = new URLSearchParams(location.search);
    const setText = (el, txt) => { if (el) el.textContent = txt; };
  
    // ====== YEAR ======
    const yr = $('yr'); if (yr) yr.textContent = new Date().getFullYear();
  
    // ====== LIVE BADGE ======
    const liveUsers = $('liveUsers'), liveChip = $('liveChip');
    if (liveUsers && liveChip) {
      liveChip.classList.remove('hidden');
      let n = 220 + (Math.random() * 40 | 0);
      setInterval(() => {
        n = Math.max(120, n + ((Math.random() * 5 | 0) - 2));
        liveUsers.textContent = String(n);
      }, 2500);
    }
  
    // ====== PAYWALL LOCK/UNLOCK ======
    const app = $('app'), paywall = $('paywall'), proBadge = $('proBadge');
    function lock() {
      try { localStorage.removeItem('prg_unlocked'); } catch(e){}
      if (paywall) paywall.style.display = 'flex';
      if (app) app.classList.add('blur-locked');
      $('hud')?.classList.add('hidden');
      proBadge?.classList.add('hidden');
    }
    function confetti() {
      for (let i=0;i<18;i++){
        const s=document.createElement('span');
        s.style.cssText=`position:fixed;left:50%;top:50%;width:6px;height:10px;border-radius:2px;background:hsl(${(i*20)%360} 90% 60%);transform:translate(-50%,-50%) rotate(${Math.random()*360}deg);pointer-events:none;z-index:9999;opacity:.9`;
        document.body.appendChild(s);
        const x=(Math.random()*2-1)*260, y=(Math.random()*-1-0.5)*240, r=600+Math.random()*400;
        s.animate(
          [{transform:`translate(0,0) rotate(0deg)`},
           {transform:`translate(${x}px,${y}px) rotate(${r}deg)`,opacity:.0}],
          {duration:1100+Math.random()*500,easing:'cubic-bezier(.2,.8,.2,1)'}
        ).onfinish=()=>s.remove();
      }
    }
    function unlock() {
      if (paywall) paywall.style.display = 'none';
      if (app) app.classList.remove('blur-locked');
      try { localStorage.setItem('prg_unlocked','1'); } catch(e){}
      $('hud')?.classList.remove('hidden');
      proBadge?.classList.remove('hidden');
      confetti();
    }
  
    // QA: re-lock
    $('resetLicense')?.addEventListener('click', lock);
  
    // ====== STRIPE: BUY & UNLOCK ======
    function gotoStripe() {
      if (!STRIPE_LINK || STRIPE_LINK === '#' ) {
        alert('STRIPE_LINK nu este setat.');
        return;
      }
      window.location.href = STRIPE_LINK;
    }
    const wireBuy = (el) => { if (!el) return; el.addEventListener('click', (e)=>{ e.preventDefault(); gotoStripe(); }); };
    wireBuy($('buyBtn'));
    wireBuy($('buyBtnTop'));
  
    // Deblocare din redirect (Success URL): ?unlock=PRG-STRP-CHECK-42
    if (qs.has('unlock')) {
      try { localStorage.setItem('prg_unlock_from_url', qs.get('unlock') || 'OK'); } catch(e){}
    }
    try {
      const k = localStorage.getItem('prg_unlock_from_url');
      if (k && validKey(k)) unlock();
    } catch(e){}
  
    // ====== LICENSE (fallback) ======
    const licenseInput=$('license'), redeemBtn=$('redeem');
    const keyChecksum=(s)=>{ let x=0; for(let i=0;i<s.length;i++){ x=(x*31+s.charCodeAt(i))%997; } return x%97; };
    function validKey(k){
      if(!k) return false;
      k = k.trim().toUpperCase();
      // chei QA
      if(k==='DEV-ASSIST-2025') return true;
      if(k==='DEV-UNLOCK-999') return true;
      if(k==='PRG-AB12-CD34-52') return true;
      if(k==='PRG-STRP-CHECK-42') return true; // folosită în Success URL
      const m=k.match(/^PRG-([A-Z0-9]{4})-([A-Z0-9]{4})-([0-9]{2})$/);
      if(!m) return false;
      return keyChecksum(`PRG-${m[1]}-${m[2]}`)===parseInt(m[3],10);
    }
    redeemBtn?.addEventListener('click', ()=>{
      const k=(licenseInput?.value||'').trim();
      if(k){ if(validKey(k)) unlock(); else alert('Invalid license key.'); return; }
      // fără cheie => du-l la Stripe
      gotoStripe();
    });
  
    // Dacă era deja deblocat pe acest device
    if(localStorage.getItem('prg_unlocked')==='1'){ unlock(); } else { lock(); }
  
    // ====== De aici în jos e LOGICA TA EXISTENTĂ (identică) ======
    const balanceEl=$('balance'), plTodayEl=$('plToday'), plSessionEl=$('plSession'), ccyEl=$('ccy');
    const riskPctEl=$('riskPct'), slPipsEl=$('slPips'), pipValEl=$('pipVal');
    const mdlPctEl=$('mdlPct'), molPctEl=$('molPct'), firmEl=$('firm');
  
    const remainEl=$('remainToday'), maxDailyEl=$('maxDaily');
    const usageBar=$('usageBar'), usagePct=$('usagePct'), alertPctEl=$('alertPct'), alertPctLabel=$('alertPctLabel'), alertNote=$('alertNote');
    const overallBar=$('overallBar'), overallPct=$('overallPct');
    const lotSizeEl=$('lotSize'), riskMoneyEl=$('riskMoney'), guardMsgEl=$('guardMsg');
    const resetTimer=$('resetTimer'), copyLotBtn=$('copyLot'), ckWarn=$('ckWarn');
  
    // Journal (CSV)
    const dropZone=$('dropZone'), pickCsv=$('pickCsv'), csvFile=$('csvFile'), journal=$('journal'), saveJournal=$('saveJournal'), exportJournal=$('exportJournal');
    const JOURNAL_KEY='prg_journal_'+(new Date().toISOString().slice(0,10));
    if(journal) journal.value=localStorage.getItem(JOURNAL_KEY)||'';
    const parseCSV=(text)=>{ const lines=text.split(/\r?\n/).filter(l=>l.trim()); const rows=lines.map(l=>l.split(',')); const formatted=rows.map(r=>`[${(r[0]||'date').trim()}] P/L: ${(r[1]||'0').trim()} — ${(r[2]||'').trim()}`).join('\n'); journal.value=(journal.value?journal.value+'\n':'')+formatted; };
    const handleFiles=(files)=>{ if(!files||!files[0]) return; const reader=new FileReader(); reader.onload=(e)=>parseCSV(String(e.target.result||'')); reader.readAsText(files[0]); };
    if(dropZone){ dropZone.addEventListener('dragover',(e)=>{ e.preventDefault(); dropZone.classList.add('ring-2','ring-emerald-500'); });
      dropZone.addEventListener('dragleave',()=> dropZone.classList.remove('ring-2','ring-emerald-500'));
      dropZone.addEventListener('drop',(e)=>{ e.preventDefault(); dropZone.classList.remove('ring-2','ring-emerald-500'); handleFiles(e.dataTransfer.files); });
      pickCsv?.addEventListener('click',()=> csvFile?.click()); csvFile?.addEventListener('change',()=> handleFiles(csvFile.files)); }
    saveJournal?.addEventListener('click',()=>{ if(journal) localStorage.setItem(JOURNAL_KEY, journal.value||''); alert('Saved.'); });
    exportJournal?.addEventListener('click',()=>{ const all={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('prg_journal_')) all[k]=localStorage.getItem(k); } const blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='prg_journal.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); });
  
    // Reviews
    const REV=[{n:'Marco • Italy',f:'FTMO 100k',q:'“Remaining Loss + timer literally stopped my overtrading.”'},
      {n:'Ahmed • UK',f:'FundedNext 50k',q:'“Clear and fast. No more guessing the daily cap.”'},
      {n:'Liam • Ireland',f:'TFT 200k',q:'“$9.99 to avoid a $500 mistake? No brainer.”'},
      {n:'Sara • Spain',f:'FTMO 50k',q:'“Coach tips are gold when I get emotional.”'},
      {n:'Jon • USA',f:'TFT 100k',q:'“Lot size math done right, every time.”'},
      {n:'Kenji • Japan',f:'FTMO 200k',q:'“Countdown + alerts = discipline upgrade.”'},
      {n:'Victor • RO',f:'5%ers 60k',q:'“Multi-currency helps a ton.”'},
      {n:'Emil • DE',f:'FundedNext 100k',q:'“Preset rules saved as profiles. Love it.”'},
      {n:'Amir • AE',f:'FTMO 100k',q:'“Session what-if prevents revenge trades.”'},
      {n:'Noah • CA',f:'TFT 50k',q:'“Clean UI. Does one thing extremely well.”'}];
    const tpl=$('revTpl'), container=$('reviews');
    if(tpl&&container){ REV.forEach(r=>{ const n=tpl.content.cloneNode(true); n.querySelector('.name').textContent=r.n; n.querySelector('.firm').textContent=r.f; n.querySelector('.quote').textContent=r.q; container.appendChild(n); });
      $('revPrev')?.addEventListener('click',()=> container.scrollBy({left:-300,behavior:'smooth'}));
      $('revNext')?.addEventListener('click',()=> container.scrollBy({left: 300,behavior:'smooth'}));
    }
  
    // FX + formatting
    let curCcy='USD', curSym='$';
    const FX={USD:1,EUR:0.92,GBP:0.78,JPY:156,AUD:1.50,CAD:1.37};
    const SYM={USD:'$',EUR:'€',GBP:'£',JPY:'¥',AUD:'A$',CAD:'C$'};
    const convert=(v,f,t)=>!isFinite(v)?v:v*((FX[t]||1)/(FX[f]||1));
    const fmt=(n)=>!isFinite(n)?'—':(n<0?'-':'')+curSym+Math.abs(n).toLocaleString('en-US',{maximumFractionDigits:0});
    function setCurrency(code,skip){
      const prev=curCcy; curCcy=code; curSym=SYM[code]||'$';
      document.querySelectorAll('.curSym').forEach(el=> el.textContent=curSym);
      const pipSym=$('pipSym'); if(pipSym) pipSym.textContent=curSym;
      const auto=$('autoFx');
      if(auto && auto.checked && !skip && prev!==curCcy){
        if(balanceEl) balanceEl.value=Math.round(convert(parseFloat(balanceEl.value||0),prev,curCcy));
        if(plTodayEl) plTodayEl.value=Math.round(convert(parseFloat(plTodayEl.value||0),prev,curCcy));
        if(plSessionEl) plSessionEl.value=Math.round(convert(parseFloat(plSessionEl.value||0),prev,curCcy));
        if(pipValEl) pipValEl.value=(convert(parseFloat(pipValEl.value||0),prev,curCcy)).toFixed(2);
      }
      calc();
    }
    ccyEl?.addEventListener('change',()=> setCurrency(ccyEl.value));
  
    // Firms presets
    const FIRMS={'FTMO':{mdl:5,mol:10},'The Funded Trader':{mdl:5,mol:10},'FundedNext':{mdl:5,mol:10},'The 5%ers':{mdl:4,mol:8},'Custom':{mdl:5,mol:10}};
    firmEl?.addEventListener('change',()=>{ const f=FIRMS[firmEl.value]||FIRMS.Custom; if(mdlPctEl) mdlPctEl.value=f.mdl; if(molPctEl) molPctEl.value=f.mol; calc(); });
  
    // Presets (local)
    const presetList=$('presetList'), presetName=$('presetName'), savePreset=$('savePreset'), loadPreset=$('loadPreset'), deletePreset=$('deletePreset');
    const refreshPresets=()=>{ const list=JSON.parse(localStorage.getItem('prg_presets')||'[]'); if(presetList) presetList.innerHTML=list.map((p,i)=>`<option value="${i}">${p.name}</option>`).join(''); };
    refreshPresets();
    savePreset?.addEventListener('click',()=>{ const name=(presetName?.value||'Preset').trim(); const list=JSON.parse(localStorage.getItem('prg_presets')||'[]'); list.push({name,firm:firmEl?.value,mdl:parseFloat(mdlPctEl?.value||0),mol:parseFloat(molPctEl?.value||0),ccy:curCcy,balance:parseFloat(balanceEl?.value||0),pip:parseFloat(pipValEl?.value||0)}); localStorage.setItem('prg_presets', JSON.stringify(list)); refreshPresets(); alert('Preset saved.'); });
    loadPreset?.addEventListener('click',()=>{ const list=JSON.parse(localStorage.getItem('prg_presets')||'[]'); const p=list[parseInt(presetList?.value||'-1',10)]; if(!p) return; if(firmEl) firmEl.value=p.firm||'Custom'; if(mdlPctEl) mdlPctEl.value=p.mdl||5; if(molPctEl) molPctEl.value=p.mol||10; setCurrency(p.ccy||'USD', true); if(balanceEl) balanceEl.value=p.balance||0; if(pipValEl) pipValEl.value=p.pip||10; calc(); });
    deletePreset?.addEventListener('click',()=>{ const list=JSON.parse(localStorage.getItem('prg_presets')||'[]'); const i=parseInt(presetList?.value||'-1',10); if(isNaN(i)||!list[i]) return; list.splice(i,1); localStorage.setItem('prg_presets', JSON.stringify(list)); refreshPresets(); });
  
    // Alerts + notifications
    let lastBeep=0; 
    function beep(){ const now=Date.now(); if(now-lastBeep<60000) return; lastBeep=now; try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25); o.start(); o.stop(ctx.currentTime+0.26);}catch(e){} }
    let notifOk=false; if("Notification" in window){ if(Notification.permission==="granted") notifOk=true; else Notification.requestPermission().then(p=>{ notifOk=(p==="granted"); }); }
    const notify=(msg)=>{ try{ if(notifOk) new Notification("PropRisk Guard", { body: msg }); }catch(e){} };
  
    // Checklist gating
    function checkChecklist(){
      const nodes=document.querySelectorAll('.ck'); const cks=[...nodes];
      const allOk=cks.length && cks.every(c=>c.checked);
      if(copyLotBtn){ copyLotBtn.disabled=!allOk; if(ckWarn) ckWarn.classList.toggle('hidden', allOk); }
    }
    document.querySelectorAll('.ck').forEach(c=> c.addEventListener('change', checkChecklist));
  
    // Chart
    let startEquity = null;
    const sodVal = $('sodVal'), setSod = $('setSod'), resetChart = $('resetChart'), canvas = $('equityChart');
    const MAX_POINTS = 60, TICK_MS = 5000; let chart = null, chartTimer = null;
    function ensureChart(){
      if(!canvas || chart) return;
      const ctx = canvas.getContext('2d');
      chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
          { label: 'Equity', data: [], tension: .25, borderWidth: 2, pointRadius: 0 },
          { label: 'Daily Loss Limit', data: [], borderWidth: 1.5, borderDash: [6,6], pointRadius: 0 }
        ]},
        options: {
          responsive:true, maintainAspectRatio:false, animation:false,
          scales:{ x:{ticks:{display:false},grid:{display:false}},
                   y:{ticks:{color:'#9CA3AF', callback:v=>v.toLocaleString()}, grid:{color:'rgba(255,255,255,0.06)'}}},
          plugins:{legend:{display:false}, tooltip:{mode:'index',intersect:false}}
        }
      });
    }
    function currentEquity(){ const bal=parseFloat(balanceEl?.value||0), pl=parseFloat(plTodayEl?.value||0), ses=parseFloat(plSessionEl?.value||0); return bal+pl+ses; }
    function setStartEquity(v){ startEquity=v; if(sodVal) setText(sodVal, fmt(v)); }
    function pushChartPoint(){
      if(!chart) return;
      if(startEquity==null) setStartEquity(parseFloat(balanceEl?.value||0)+parseFloat(plTodayEl?.value||0));
      const now=new Date();
      const labels=chart.data.labels, eqDs=chart.data.datasets[0].data, limDs=chart.data.datasets[1].data;
      labels.push(now.toLocaleTimeString()); if(labels.length>MAX_POINTS) labels.shift();
      const eq=currentEquity();
      const mdl=(parseFloat(mdlPctEl?.value||0)/100)*(startEquity||0);
      const lim=(startEquity||0)-mdl;
      eqDs.push(eq); if(eqDs.length>MAX_POINTS) eqDs.shift();
      limDs.push(lim); if(limDs.length>MAX_POINTS) limDs.shift();
      chart.update('none');
    }
    function startChartLoop(){ if(!chartTimer) chartTimer=setInterval(pushChartPoint, TICK_MS); }
    function stopChartLoop(){ clearInterval(chartTimer); chartTimer=null; }
    if (canvas){
      ensureChart();
      const io=new IntersectionObserver((entries)=>{ const visible=entries.some(e=>e.isIntersecting); if(visible) startChartLoop(); else stopChartLoop(); }, {threshold:.15});
      io.observe(canvas);
    }
    setSod?.addEventListener('click',()=> setStartEquity(currentEquity()));
    resetChart?.addEventListener('click',()=>{ if(!chart) return; chart.data.labels.length=0; chart.data.datasets[0].data.length=0; chart.data.datasets[1].data.length=0; chart.update(); });
  
    // Coach tips
    const coach=$('coach');
    function coachTips({pct, remaining, lot, riskMoney, sl, pip, session}){
      const tips=[];
      if(pct>=90) tips.push('⛔ Daily usage above 90%. Stop for today.');
      else if(pct>=75) tips.push('⚠ You’re above 75% of MDL. Only take A+ setups.');
      if(lot===0) tips.push('Set SL pips and $/pip to compute lot size.');
      if(riskMoney>0 && lot>0) tips.push(`Your risk per trade is <b>${fmt(riskMoney)}</b>. Keep it consistent.`);
      if(session<0 && Math.abs(session) > remaining*0.3) tips.push('Session loss large vs remaining. Consider pausing.');
      if(tips.length===0) tips.push('✅ Plan looks healthy. Avoid revenge trades.');
      if(coach) coach.innerHTML = tips.map(t=>`<li>• ${t}</li>`).join('');
    }
  
    // Scenario matrix
    function renderMatrix(){
      const scRisksStr=$('scRisks')?.value||'0.5,1,1.5,2';
      const scSLsStr=$('scSLs')?.value||'20,35,50,75';
      const scRisks=scRisksStr.split(',').map(s=>parseFloat(s.trim())).filter(v=>!isNaN(v));
      const scSLs=scSLsStr.split(',').map(s=>parseFloat(s.trim())).filter(v=>!isNaN(v));
      const bal=parseFloat(balanceEl?.value||0), pip=parseFloat(pipValEl?.value||0);
      let html='<table class="min-w-[420px] w-full text-sm [&_tr:hover]:bg-neutral-800/40 rounded-xl overflow-hidden"><thead><tr><th class="text-left py-2 px-3">Risk% \\ SL</th>';
      scSLs.forEach(sl=> html+=`<th class="text-right py-2 px-3">${sl} pips</th>`); html+='</tr></thead><tbody>';
      scRisks.forEach(r=>{ html+=`<tr class="border-t border-neutral-800"><td class="py-2 px-3 font-medium">${r}%</td>`;
        scSLs.forEach(sl=>{ const riskMoney=bal*(r/100); const lot=(sl>0&&pip>0)?(riskMoney/(sl*pip)):0; html+=`<td class="py-2 px-3 text-right tabular-nums">${isFinite(lot)?(lot>=1?lot.toFixed(2):lot.toFixed(3)):'—'}</td>`; });
        html+='</tr>'; });
      html+='</tbody></table>';
      const scTable=$('scTable'); if(scTable) scTable.innerHTML=html;
    }
  
    // Calc
    function calc(){
      const bal=parseFloat(balanceEl?.value||0);
      const mdl=parseFloat(mdlPctEl?.value||0)/100;
      const mol=parseFloat(molPctEl?.value||0)/100;
      const pl =parseFloat(plTodayEl?.value||0);
      const session=parseFloat(plSessionEl?.value||0);
      const sl =Math.max(0, parseFloat(slPipsEl?.value||0));
      const riskPct = Math.max(0, parseFloat(riskPctEl?.value||0))/100;
      const pip = Math.max(0, parseFloat(pipValEl?.value||0));
  
      const maxDaily=bal*mdl;
      const remaining=Math.max(0, maxDaily + pl);
      if(maxDailyEl) setText(maxDailyEl, fmt(maxDaily));
      if(remainEl) setText(remainEl, fmt(remaining));
      const hudRemain=$('hudRemain'); if(hudRemain) setText(hudRemain, fmt(remaining));
  
      const used=Math.max(0, maxDaily-remaining);
      const denom=(maxDaily+Math.max(0,pl))||maxDaily||1;
      const pct=Math.min(100, Math.round((used/denom)*100));
      if(usagePct) setText(usagePct, pct+'%');
      if(usageBar){ usageBar.style.width=pct+'%'; usageBar.className='h-full '+(pct<70?'bg-emerald-500':pct<90?'bg-amber-500':'bg-red-600'); }
  
      const overallMaxLoss=bal*mol;
      const overallRatio=Math.min(100, Math.max(0, Math.round((Math.abs(Math.min(0,pl))/(overallMaxLoss||1))*100)));
      if(overallPct) setText(overallPct, overallRatio+'%');
      if(overallBar) overallBar.style.width=overallRatio+'%';
  
      if(alertPctLabel && alertPctEl) setText(alertPctLabel, (alertPctEl.value||80)+'%');
      const hitAlert = pct>=parseInt(alertPctEl?.value||'80',10);
      if(alertNote){ if(hitAlert){ alertNote.classList.remove('hidden'); beep(); notify('Approaching daily loss threshold. Consider stopping.'); } else { alertNote.classList.add('hidden'); } }
  
      const riskMoney=bal*riskPct; if(riskMoneyEl) setText(riskMoneyEl, fmt(riskMoney));
      const lot=(sl>0 && pip>0) ? (riskMoney/(sl*pip)) : 0;
      if(lotSizeEl) setText(lotSizeEl, isFinite(lot) ? (lot>=1?lot.toFixed(2):lot.toFixed(3)) : '—');
  
      const plannedLoss=sl*pip*lot+Math.max(0,-session);
      let msg='';
      if(plannedLoss>=remaining && remaining>0){ msg=`⚠ Planned risk (${fmt(plannedLoss)}) exceeds remaining daily limit (${fmt(remaining)}). Reduce lot or stop.`; notify('Planned risk exceeds remaining daily limit.'); }
      else if(remaining===0){ msg=`⛔ No remaining loss for today. Stop trading.`; notify('No remaining loss for today. Stop.'); }
      else if(plannedLoss>=0.5*remaining){ msg=`⚠ High risk vs remaining (${fmt(plannedLoss)} vs ${fmt(remaining)}). Consider smaller lot.`; }
      else { msg=`✅ Within today's limit. Keep discipline.`; }
      if(guardMsgEl) setText(guardMsgEl, msg);
  
      coachTips({pct, remaining, lot, riskMoney, sl, pip, session});
      renderMatrix();
      checkChecklist();
    }
  
    // Countdown + HUD
    function tick(){
      const now=new Date(); const t=new Date(now); t.setHours(24,0,0,0);
      const ms=t-now; const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
      const txt = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if(resetTimer) setText(resetTimer, txt);
      const hudTimer=$('hudTimer'); if(hudTimer) setText(hudTimer, txt);
    }
  
    // Share / Print
    $('copyLink')?.addEventListener('click', async ()=>{
      const q=new URLSearchParams({ bal:balanceEl?.value, pl:plTodayEl?.value, c:curCcy, mdl:mdlPctEl?.value, mol:molPctEl?.value, rp:riskPctEl?.value, sl:slPipsEl?.value, pip:pipValEl?.value });
      const url=`${location.origin}${location.pathname}?${q}`;
      try{ await navigator.clipboard.writeText(url); alert('Link copied.'); }catch(e){ prompt('Copy link:', url); }
    });
    $('printBtn')?.addEventListener('click', ()=> window.print());
  
    // Copy lot (gated)
    copyLotBtn?.addEventListener('click', async ()=>{
      const cks=[...document.querySelectorAll('.ck')]; if(!cks.every(c=>c.checked)){ if(ckWarn) ckWarn.classList.remove('hidden'); return; }
      const txt = $('lotSize')?.textContent || '';
      try{ await navigator.clipboard.writeText(txt); copyLotBtn.textContent='Copied'; setTimeout(()=>copyLotBtn.textContent='Copy',1000); }catch(e){ alert('Copy failed'); }
    });
  
    // HUD drag
    (function hudDrag(){ const hud=$('hud'); if(!hud) return;
      const pos=JSON.parse(localStorage.getItem('prg_hud_pos')||'{}'); if(pos.x!=null && pos.y!=null){ hud.style.left=pos.x+'px'; hud.style.top=pos.y+'px'; hud.style.right='auto'; hud.style.bottom='auto'; }
      let a=false,sx=0,sy=0,ox=0,oy=0;
      const down=(e)=>{ a=true; const r=hud.getBoundingClientRect(); ox=r.left; oy=r.top; sx=(e.touches?e.touches[0].clientX:e.clientX); sy=(e.touches?e.touches[0].clientY:e.clientY); e.preventDefault(); };
      const move=(e)=>{ if(!a) return; const cx=(e.touches?e.touches[0].clientX:e.clientX), cy=(e.touches?e.touches[0].clientY:e.clientY); const nx=ox+(cx-sx), ny=oy+(cy-sy); hud.style.left=nx+'px'; hud.style.top=ny+'px'; hud.style.right='auto'; hud.style.bottom='auto'; };
      const up=()=>{ if(!a) return; a=false; const r=hud.getBoundingClientRect(); localStorage.setItem('prg_hud_pos', JSON.stringify({x:Math.max(8,r.left), y:Math.max(8,r.top)})); };
      hud.addEventListener('mousedown',down); hud.addEventListener('touchstart',down,{passive:false}); window.addEventListener('mousemove',move); window.addEventListener('touchmove',move,{passive:false}); window.addEventListener('mouseup',up); window.addEventListener('touchend',up);
    })();
  
    // Assistant (local)
    const chatLog=$('chatLog'), chatInput=$('chatInput'), chatSend=$('chatSend');
    function addMsg(txt,who){ const b=document.createElement('div'); b.className=`max-w-[85%] ${who==='me'?'ml-auto bg-emerald-600 text-white':'bg-neutral-900/70 text-neutral-100'} rounded-xl px-3 py-2`; b.innerHTML=txt; chatLog?.appendChild(b); chatLog.scrollTop=chatLog.scrollHeight; }
    function botReply(q){
      const ql=(q||'').toLowerCase();
      const bal=parseFloat(balanceEl?.value||0), mdl=parseFloat(mdlPctEl?.value||0)/100, mol=parseFloat(molPctEl?.value||0)/100, pl=parseFloat(plTodayEl?.value||0), sess=parseFloat(plSessionEl?.value||0);
      const maxDaily=bal*mdl, remaining=Math.max(0,maxDaily+pl), overallMax=bal*mol;
      const riskPct = Math.max(0, parseFloat(riskPctEl?.value||0))/100, sl = Math.max(0, parseFloat(slPipsEl?.value||0)), pip = Math.max(0, parseFloat(pipValEl?.value||0));
      const lot=(sl>0&&pip>0)?(bal*riskPct/(sl*pip)):0;
      if(ql.includes('help')||ql==='?') return 'Try: <b>remaining</b>, <b>max daily</b>, <b>overall</b>, <b>lot</b>, <b>timer</b>, or ask e.g. “risk 1% with 30 pips”.';
      if(ql.includes('remaining')) return `You can still lose <b>${fmt(remaining)}</b> today before breaching the daily limit.`;
      if(ql.includes('max daily')) return `Max Daily Loss is <b>${fmt(maxDaily)}</b>.`;
      if(ql.includes('overall')) return `Overall max loss allowed is <b>${fmt(overallMax)}</b>.`;
      if(ql.includes('timer')||ql.includes('reset')) return `Time to reset: <b>${$('resetTimer')?.textContent||'--:--:--'}</b>.`;
      if(ql.includes('lot')) return `With risk ${(riskPct*100).toFixed(2)}%, SL ${sl} pips, ${curSym}/pip=${pip}, lot ≈ <b>${ isFinite(lot)? (lot>=1?lot.toFixed(2):lot.toFixed(3)) : '—' }</b>.`;
      const m=ql.match(/risk\s*([0-9.]+)\s*%.*?(\d+)\s*(pip|pips)/); if(m){ const r=parseFloat(m[1])/100; const slGuess=parseFloat(m[2]); const lotG=(slGuess>0&&pip>0)?(bal*r/(slGuess*pip)):0; return `At risk ${m[1]}% and SL ${slGuess} pips, lot ≈ <b>${ isFinite(lotG)? (lotG>=1?lotG.toFixed(2):lotG.toFixed(3)) : '—' }</b>.`; }
      return 'Got it. Type <b>help</b> for examples.';
    }
    function send(){ const t=(chatInput?.value||'').trim(); if(!t) return; addMsg(t,'me'); addMsg(botReply(t),'bot'); if(chatInput) chatInput.value=''; }
    chatSend?.addEventListener('click',send);
    chatInput?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); send(); }});
  
    // URL state (share)
    (function fromQuery(){
      if(qs.has('bal')&&balanceEl) balanceEl.value=qs.get('bal');
      if(qs.has('pl')&&plTodayEl)  plTodayEl.value=qs.get('pl');
      if(qs.has('c')&&ccyEl){ ccyEl.value=qs.get('c'); setCurrency(qs.get('c'), true); }
      if(qs.has('mdl')&&mdlPctEl) mdlPctEl.value=qs.get('mdl');
      if(qs.has('mol')&&molPctEl) molPctEl.value=qs.get('mol');
      if(qs.has('rp')&&riskPctEl) riskPctEl.value=qs.get('rp');
      if(qs.has('sl')&&slPipsEl)  slPipsEl.value=qs.get('sl');
      if(qs.has('pip')&&pipValEl) pipValEl.value=qs.get('pip');
    })();
  
    // Init
    [balanceEl, plTodayEl, plSessionEl, riskPctEl, slPipsEl, pipValEl, mdlPctEl, molPctEl, alertPctEl].forEach(el=> el?.addEventListener('input', calc));
    if(ccyEl) setCurrency(ccyEl.value, true);
    calc(); renderMatrix(); 
    setInterval(()=>{ const now=new Date(); const t=new Date(now); t.setHours(24,0,0,0);
      const ms=t-now; const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
      const txt = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if(resetTimer) setText(resetTimer, txt);
      const hudTimer=$('hudTimer'); if(hudTimer) setText(hudTimer, txt);
    },1000);
  });