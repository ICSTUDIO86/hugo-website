// IC Melody Challenge Mode (extracted from melody-generator.html)
// Scope: Melody tool only. Does not touch other tools.
// Changes vs original inline script:
// - waitForStableMeasures() now samples using a unified best-source function
//   that prefers window.getOSMDMeasureRects(), and never degrades from non-empty to empty.

(function(){
  const scoreEl = document.getElementById('score');
  const toggleEl = document.getElementById('challengeModeToggle');

  const HIDE_MEASURES_ENABLED = false; // 临时关闭隐藏模式，避免干扰

  const state = {
    active: false,
    rafId: null,
    countdownTimerId: null,
    countInTimerId: null,
    observer: null,
    startTs: 0,
    measureRects: [],
    measureDuration: 0,
    cursorEl: null,
    overlayEl: null, // <g> inside SVG
    // for clip-based hiding
    contentGroup: null,
    contentGroups: null,
    clipPathEl: null,
    systems: null,
    masked: new Set(),
    lastIndex: -1,
    resizeHandler: null,
    activeSvg: null,
    audioCtx: null,
    hiddenNodes: new Set(),
  };

  function $(id){ return document.getElementById(id); }

  const svgns = 'http://www.w3.org/2000/svg';

  function openChallengeModal(){
    const modal = $('challengeModal');
    const prep = $('challengePrepTime');
    const bpm = $('challengeBPM');
    try {
      const saved = JSON.parse(localStorage.getItem('ic_challenge_settings')||'{}');
      if (typeof saved.prep === 'number') prep.value = saved.prep;
      if (typeof saved.bpm === 'number') bpm.value = saved.bpm;
    } catch(_) {}
    if (modal) modal.style.display = 'flex';
  }

  function closeChallengeModal(){
    const modal = $('challengeModal');
    if (modal) modal.style.display = 'none';
  }

  function cancelChallengeSetup(){
    closeChallengeModal();
    if (toggleEl) { toggleEl.checked = false; updateSwitcherVisual(); }
  }

  async function confirmChallengeSetup(){
    const prep = Math.max(0, parseInt(($('challengePrepTime').value||'0'), 10));
    const bpm = Math.max(40, Math.min(240, parseInt(($('challengeBPM').value||'80'), 10)));
    try { localStorage.setItem('ic_challenge_settings', JSON.stringify({ prep, bpm })); } catch(_) {}
    closeChallengeModal();
    try { ensureClickAudio(); } catch(_) {}
    await startChallenge(prep, bpm);
  }

  function updateSwitcherVisual(){
    const slider = toggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (toggleEl.checked){
      slider.style.backgroundColor = 'var(--primary-orange, #ff9500)';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function ensureOverlay(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return null;
    if (state.overlayEl && state.overlayEl.parentNode) return state.overlayEl;
    let g = svg.querySelector('#challengeOverlayG');
    if (!g){
      g = document.createElementNS(svgns, 'g');
      g.setAttribute('id', 'challengeOverlayG');
      g.setAttribute('style', 'pointer-events:none');
      svg.appendChild(g);
    }
    let cursor = g.querySelector('#challengeCursorLine');
    if (!cursor){
      cursor = document.createElementNS(svgns, 'line');
      cursor.setAttribute('id', 'challengeCursorLine');
      cursor.setAttribute('stroke', '#0a84ff');
      cursor.setAttribute('stroke-width', '2');
      cursor.setAttribute('stroke-linecap', 'round');
      cursor.setAttribute('opacity', '0.95');
      g.appendChild(cursor);
    }
    state.overlayEl = g;
    state.cursorEl = cursor;
    return g;
  }

  function clearOverlay(){
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
    state.masked.clear();
    state.lastIndex = -1;
    if (state.overlayEl && state.overlayEl.parentNode){ state.overlayEl.parentNode.removeChild(state.overlayEl); }
    state.overlayEl = null;
    state.cursorEl = null;
  }

  async function ensureScoreReady(){
    // ensure svg exists
    let svg = scoreEl.querySelector('svg');
    if (!svg && typeof window.generateMelody === 'function') {
      try { window.generateMelody(); } catch(_) {}
    }
    const t0 = Date.now();
    while (!svg && Date.now() - t0 < 6000){
      await new Promise(r => setTimeout(r, 100));
      svg = scoreEl.querySelector('svg');
    }
    // also wait a bit for OSMD graphics if present
    if (typeof osmd !== 'undefined' && osmd){
      const t1 = Date.now();
      while (Date.now() - t1 < 2000){
        try{
          if (osmd.GraphicSheet && Array.isArray(osmd.GraphicSheet.MeasureList) && osmd.GraphicSheet.MeasureList.length > 0) break;
        }catch(_){}
        await new Promise(r => setTimeout(r, 80));
      }
    }
    return !!svg;
  }

  function getCurrentTimeSignature(){
    let timeSig = '4/4';
    try{
      if (typeof melodyHistory !== 'undefined' && typeof currentHistoryIndex !== 'undefined'){
        const md = melodyHistory[currentHistoryIndex];
        if (md && md.config && md.config.timeSignature){ timeSig = md.config.timeSignature; }
      }
    }catch(_){}
    return String(timeSig);
  }

  function getCurrentMelodyXML(){
    try{
      if (typeof melodyHistory !== 'undefined' && typeof currentHistoryIndex !== 'undefined'){
        const md = melodyHistory[currentHistoryIndex];
        if (md && typeof md.musicXML === 'string' && md.musicXML.length > 0) return md.musicXML;
      }
    }catch(_){}
    return null;
  }

  function parseTimeSigFromXML(xml){
    try{
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const timeEl = doc.querySelector('measure attributes time');
      if (timeEl){
        const b = timeEl.querySelector('beats');
        const bt = timeEl.querySelector('beat-type');
        const num = parseInt((b && b.textContent)||'4',10);
        const den = parseInt((bt && bt.textContent)||'4',10);
        if (!isNaN(num) && !isNaN(den) && num>0 && den>0){ return { num, den }; }
      }
    }catch(_){}
    return null;
  }

  function parseMeasureDurationSec(bpm){
    const xml = getCurrentMelodyXML();
    let num, den;
    const ts = xml ? parseTimeSigFromXML(xml) : null;
    if (ts){ num = ts.num; den = ts.den; }
    else {
      const timeSig = getCurrentTimeSignature();
      const parts = String(timeSig||'4/4').split('/');
      num = parseInt(parts[0]||'4',10);
      den = parseInt(parts[1]||'4',10);
      if (!isFinite(num) || !isFinite(den)) { num = 4; den = 4; }
    }
    const secPerQuarter = 60 / Math.max(1, bpm);
    const secPerMeasure = (num * (4/den)) * secPerQuarter;
    if (!isFinite(secPerMeasure) || secPerMeasure < 0.25){
      return 4 * secPerQuarter;
    }
    return secPerMeasure;
  }

  // Geometry collectors (ported from inline script)
  function collectMeasureRects(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return [];
    const svgBBox = svg.getBoundingClientRect();

    function getScreenRectForElement(el){
      try {
        if (typeof el.getBBox === 'function') {
          const bbox = el.getBBox();
          if (bbox && bbox.width > 0 && bbox.height > 0 && typeof el.getScreenCTM === 'function') {
            const ctm = el.getScreenCTM();
            if (ctm) {
              const pt = svg.createSVGPoint();
              const corners = [
                [bbox.x, bbox.y],
                [bbox.x + bbox.width, bbox.y],
                [bbox.x, bbox.y + bbox.height],
                [bbox.x + bbox.width, bbox.y + bbox.height]
              ];
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const [x, y] of corners) {
                pt.x = x; pt.y = y;
                const res = pt.matrixTransform(ctm);
                if (!isNaN(res.x) && !isNaN(res.y)) {
                  minX = Math.min(minX, res.x);
                  minY = Math.min(minY, res.y);
                  maxX = Math.max(maxX, res.x);
                  maxY = Math.max(maxY, res.y);
                }
              }
              if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
                return { left: minX, top: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
              }
            }
          }
        }
      } catch(_) {}
      if (typeof el.getBoundingClientRect === 'function') {
        const r = el.getBoundingClientRect();
        if (r && r.width > 0 && r.height > 0) {
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        }
      }
      return null;
    }

    function dedupRects(rects){
      const eps = 2;
      const dedup = [];
      for (const m of rects){
        const last = dedup[dedup.length - 1];
        if (!last) { dedup.push(m); continue; }
        const almostSame = Math.abs(m.x - last.x) < eps && Math.abs(m.y - last.y) < eps && Math.abs(m.width - last.width) < eps && Math.abs(m.height - last.height) < eps;
        if (!almostSame) dedup.push(m);
      }
      return dedup;
    }

    const systems = collectSystemRects();
    if (!systems.length) return [];
    const rects = [];
    systems.forEach(sys => {
      const x1 = sys.x, x2 = sys.x + sys.width;
      const y1 = sys.y, y2 = sys.y + sys.height;
      const allG = svg.querySelectorAll('g');
      const measures = [];
      allG.forEach(g => {
        const r = getScreenRectForElement(g);
        if (r) {
          const cx = r.left - svgBBox.left;
          const cy = r.top - svgBBox.top;
          const w = r.width, h = r.height;
          const inside = (cx >= x1 && (cx + w) <= x2 && cy >= y1 && (cy + h) <= y2);
          if (inside && w>12 && h>10) measures.push({ x: cx, y: cy, width: w, height: h });
        }
      });
      measures.sort((a,b)=> a.x - b.x);
      rects.push(...dedupRects(measures));
    });
    return rects;
  }

  function collectSystemRectsFromStaffLines(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return [];
    const svgBBox = svg.getBoundingClientRect();
    // 直接用像素级 bbox 识别“宽而扁”的水平线段
    const elems = Array.from(svg.querySelectorAll('line, path, rect'));
    const horiz = [];
    for (const el of elems){
      let r = null;
      try { r = el.getBoundingClientRect(); } catch(_) { r = null; }
      if (!r || r.width <= 0 || r.height <= 0) continue;
      const w = r.width, h = r.height;
      if (w < 40) continue;               // 过滤短线段
      if (h > 4) continue;                // 近似水平（很扁）
      const y = r.top - svgBBox.top + h/2;
      const x1 = r.left - svgBBox.left;
      const x2 = x1 + w;
      horiz.push({ y, x1, x2 });
    }
    if (horiz.length < 5) return [];
    horiz.sort((a,b)=> a.y - b.y);
    // 聚类到 5 条一组
    const yLevels = [];
    const epsY = 3; // 像素容差更宽松
    for (const ln of horiz){
      let found = yLevels.find(l => Math.abs(l.y - ln.y) < epsY);
      if (!found){
        yLevels.push({ y: ln.y, minX: Math.min(ln.x1, ln.x2), maxX: Math.max(ln.x1, ln.x2) });
      } else {
        found.minX = Math.min(found.minX, ln.x1, ln.x2);
        found.maxX = Math.max(found.maxX, ln.x1, ln.x2);
      }
    }
    yLevels.sort((a,b)=> a.y - b.y);
    if (yLevels.length < 5) return [];
    const rects = [];
    for (let i=0; i+4 < yLevels.length; i+=5){
      const group = yLevels.slice(i, i+5);
      const minY = group[0].y;
      const maxY = group[4].y;
      const spacing = (maxY - minY) / 4;
      const sysY = minY - Math.max(2, spacing*0.6);
      const sysH = (maxY - minY) + Math.max(4, spacing*1.2);
      const minX = Math.min(...group.map(g => g.minX));
      const maxX = Math.max(...group.map(g => g.maxX));
      rects.push({ x: minX, y: sysY, width: Math.max(10, maxX - minX), height: sysH });
    }
    return rects;
  }

  function collectSystemRects(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return [];
    const systemsByStaff = collectSystemRectsFromStaffLines();
    if (systemsByStaff.length) return systemsByStaff;
    const allG = svg.querySelectorAll('g');
    const rects = [];
    const svgBBox = svg.getBoundingClientRect();
    allG.forEach(g => {
      const id = (g.getAttribute('id') || '').toLowerCase();
      const cls = (g.getAttribute('class') || '').toLowerCase();
      const looksLikeSystem = id.includes('system') || cls.includes('system');
      if (!looksLikeSystem) return;
      try{
        const r = g.getBoundingClientRect();
        if (r && r.width>30 && r.height>10){
          rects.push({ x: r.left - svgBBox.left, y: r.top - svgBBox.top, width: r.width, height: r.height });
        }
      }catch(_){}
    });
    return rects;
  }

  function collectMeasureRectsByBarlines(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return [];
    const systems = collectSystemRects();
    if (!systems.length) return [];
    const svgBBox = svg.getBoundingClientRect();
    const measures = [];
    const lines = Array.from(svg.querySelectorAll('line, path, rect'));
    systems.forEach(sys => {
      const segments = [];
      const left = sys.x, right = sys.x + sys.width, top = sys.y, bottom = sys.y + sys.height;
      lines.forEach(el => {
        let r = null;
        try {
          if (typeof el.getBBox === 'function' && typeof el.getScreenCTM === 'function'){
            const bbox = el.getBBox();
            const ctm = el.getScreenCTM();
            if (bbox && ctm){
              const pt = svg.createSVGPoint();
              const corners = [
                [bbox.x, bbox.y],
                [bbox.x + bbox.width, bbox.y],
                [bbox.x, bbox.y + bbox.height],
                [bbox.x + bbox.width, bbox.y + bbox.height]
              ];
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              for (const [x, y] of corners){
                pt.x = x; pt.y = y;
                const res = pt.matrixTransform(ctm);
                minX = Math.min(minX, res.x); minY = Math.min(minY, res.y);
                maxX = Math.max(maxX, res.x); maxY = Math.max(maxY, res.y);
              }
              r = { left: minX, top: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
            }
          }
        } catch(_) {}
        if (!r && typeof el.getBoundingClientRect === 'function'){
          const rr = el.getBoundingClientRect();
          if (rr && rr.width>0 && rr.height>0){ r = rr; }
        }
        if (!r) return;
        const xCenter = r.left - svgBBox.left + r.width/2;
        const yTop = r.top - svgBBox.top;
        const yBottom = yTop + r.height;
        const thinEnough = r.width <= Math.max(12, sys.width * 0.01);
        const insideX = xCenter >= left && xCenter <= right;
        const overlappingY = (yTop <= bottom) && (yBottom >= top);
        if (thinEnough && insideX && overlappingY){
          // 记录该x处的一段竖向覆盖（不再要求单段覆盖整系统）
          const segTop = Math.max(yTop, top);
          const segBottom = Math.min(yBottom, bottom);
          if (segBottom > segTop) segments.push({ x: xCenter, y1: segTop, y2: segBottom });
        }
      });
      // 按x聚类，将同一x处的多段（上下两行）合并计算覆盖比例
      const epsX = Math.max(4, sys.width * 0.008);
      segments.sort((a,b)=> a.x - b.x);
      const groups = [];
      for (const s of segments){
        const g = groups.length ? groups[groups.length-1] : null;
        if (g && Math.abs(g.x - s.x) <= epsX){ g.parts.push(s); g.x = (g.x * g.count + s.x) / (g.count + 1); g.count++; }
        else groups.push({ x: s.x, parts: [s], count: 1 });
      }
      const barXs = [];
      for (const g of groups){
        // 合并y段并计算覆盖比例
        const parts = g.parts.sort((a,b)=> a.y1 - b.y1);
        let covered = 0;
        let curStart = null, curEnd = null;
        for (const p of parts){
          if (curStart === null){ curStart = p.y1; curEnd = p.y2; continue; }
          if (p.y1 <= curEnd + 2){ curEnd = Math.max(curEnd, p.y2); }
          else { covered += (curEnd - curStart); curStart = p.y1; curEnd = p.y2; }
        }
        if (curStart !== null) covered += (curEnd - curStart);
        const coverageRatio = covered / Math.max(1, (bottom - top));
        if (coverageRatio >= 0.75){ barXs.push(g.x); }
      }
      if (barXs.length < 1) return;
      barXs.unshift(left); barXs.push(right);
      const uniq = [];
      barXs.sort((a,b)=>a-b).forEach(x => { if (uniq.length===0 || Math.abs(x - uniq[uniq.length-1]) > epsX) uniq.push(x); });
      if (uniq.length < 3) return;
      for (let i=0;i<uniq.length-1;i++){
        const x1 = uniq[i], x2 = uniq[i+1];
        const w = x2 - x1; if (w <= 8) continue;
        measures.push({ x:x1, y: top, width: w, height: sys.height });
      }
    });
    return measures;
  }

  function getExpectedMeasureCountFromXML(){
    try{
      if (typeof osmd !== 'undefined' && osmd && osmd.GraphicSheet && Array.isArray(osmd.GraphicSheet.MeasureList)){
        const n = osmd.GraphicSheet.MeasureList.length;
        if (n && n > 0) return n;
      }
      if (typeof melodyHistory !== 'undefined' && typeof currentHistoryIndex !== 'undefined'){
        const md = melodyHistory[currentHistoryIndex];
        if (md && md.config && typeof md.config.measures === 'number' && md.config.measures > 0) return md.config.measures;
      }
      const xml = getCurrentMelodyXML();
      if (!xml) return 0;
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const measures = doc.querySelectorAll('part measure');
        if (measures && measures.length > 0) return measures.length;
      } catch(_) {}
      const m = xml.match(/<measure\b/gi);
      return m ? m.length : 0;
    }catch(_) { return 0; }
  }

  function collectMeasureRectsByGlobalEqualSplit(){
    try{
      const svg = scoreEl.querySelector('svg');
      if (!svg) return [];
      let expected = getExpectedMeasureCountFromXML();
      if (!expected || expected <= 0) expected = 4;
      const bbox = svg.getBBox ? svg.getBBox() : null;
      const totalMeasures = expected;
      const perLine = totalMeasures <= 4 ? totalMeasures : 4;
      const lines = Math.ceil(totalMeasures / perLine);
      const useWidth = (bbox && bbox.width > 0) ? bbox.width : Math.max(10, scoreEl.clientWidth - 20);
      const useHeight = (bbox && bbox.height > 0) ? bbox.height : Math.max(40, scoreEl.clientHeight || 120);
      const bx = (bbox ? bbox.x : 0);
      const by = (bbox ? bbox.y : 0);
      const lineHeight = useHeight / Math.max(1, lines);
      const leftMargin = Math.min(40, useWidth * 0.06);
      const usableW = Math.max(10, useWidth - leftMargin);
      const out = [];
      let remain = totalMeasures;
      for (let row=0; row<lines; row++){
        const thisCount = Math.min(perLine, remain);
        const segW = usableW / thisCount;
        for (let i=0;i<thisCount;i++){
          const x = bx + leftMargin + i*segW;
          const y = by + row*lineHeight;
          out.push({ x, y, width: segW, height: lineHeight });
        }
        remain -= thisCount;
      }
      return out;
    }catch(_) { return []; }
  }

  function findFirstBeatXWithinFirstMeasure(){
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || state.measureRects.length === 0) return null;
    const m0 = state.measureRects[0];
    const svgBBox = svg.getBoundingClientRect();
    const candidates = svg.querySelectorAll('[class*="stavenote"], [class*="notehead"], [class*="StaveNote"], [class*="NoteHead"]');
    let bestX = null;
    candidates.forEach(el => {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width<=0 || r.height<=0) return;
      const cx = r.left - svgBBox.left + r.width/2;
      const cy = r.top - svgBBox.top + r.height/2;
      const withinY = cy >= m0.y && cy <= (m0.y + m0.height);
      const withinX = cx >= (m0.x + Math.min(20, m0.width*0.05)) && cx <= (m0.x + m0.width);
      if (withinY && withinX){ if (bestX === null || cx < bestX) bestX = cx; }
    });
    return bestX;
  }

  function showCountdownUI(totalSec){
    const wrap = document.getElementById('challengeCountdownUI');
    const val = document.getElementById('challengeCountdownValue');
    if (wrap && val){
      wrap.style.display = 'inline-flex';
      val.textContent = String(Math.max(0, Math.ceil(totalSec)));
    }
  }

  function updateCountdownUI(remainSec){
    const val = document.getElementById('challengeCountdownValue');
    if (val){ val.textContent = String(Math.max(0, Math.ceil(remainSec))); }
  }

  function hideCountdownUI(){
    const wrap = document.getElementById('challengeCountdownUI');
    if (wrap){ wrap.style.display = 'none'; }
  }

  function ensureClickAudio(){
    try {
      if (!state.audioCtx) { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      if (state.audioCtx && state.audioCtx.state === 'suspended') { state.audioCtx.resume().catch(()=>{}); }
    } catch(_) {}
  }

  function playClick(isStrong){
    if (!state.audioCtx) return;
    try {
      const ctx = state.audioCtx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = isStrong ? 880 : 660;
      const now = ctx.currentTime;
      const dur = isStrong ? 0.09 : 0.06;
      const peak = isStrong ? 0.5 : 0.35;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch(_) {}
  }

  function maskMeasure(index){
    if (!HIDE_MEASURES_ENABLED) return;
    if (!state.measureRects[index] || state.masked.has(index)) return;
    const bucketHidden = hideMeasureBucket(index);
    if (!bucketHidden){
      const g = ensureOverlay();
      if (g){
        const m = state.measureRects[index];
        const rect = document.createElementNS(svgns, 'rect');
        rect.setAttribute('x', String(m.x));
        rect.setAttribute('y', String(m.y));
        rect.setAttribute('width', String(Math.max(1, m.width)));
        rect.setAttribute('height', String(Math.max(1, m.height)));
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('class', 'measure-mask');
        g.appendChild(rect);
      }
    }
    state.masked.add(index);
  }

  function hideMeasureBucket(index){
    if (!HIDE_MEASURES_ENABLED) return false;
    if (!state.measureBuckets || !state.measureBuckets[index]) return false;
    let hid = false;
    const bucket = state.measureBuckets[index];
    for (const el of bucket){
      if (!el) continue;
      try{
        if (el.dataset && !('challengeHidden' in el.dataset)){
          el.dataset.challengeHidden = el.style.display || '';
        }
        el.style.display = 'none';
        state.hiddenNodes.add(el);
        hid = true;
      }catch(_){}
    }
    return hid;
  }

  function restoreHiddenElements(){
    if (!state.measureBuckets || !state.measureBuckets.length) return;
    for (const bucket of state.measureBuckets){
      if (!bucket) continue;
      for (const el of bucket){
        if (!el) continue;
        try{
          if (el.dataset && Object.prototype.hasOwnProperty.call(el.dataset, 'challengeHidden')){
            el.style.display = el.dataset.challengeHidden;
            delete el.dataset.challengeHidden;
          } else if (state.hiddenNodes.has(el)){
            el.style.display = '';
          }
          state.hiddenNodes.delete(el);
        }catch(_){}
      }
    }
    state.hiddenNodes.clear();
  }

  // Debug helper: visualize detected measure rects
  function debugShowMeasureRects(){
    if (!state.measureRects || !state.measureRects.length) return;
    const overlay = ensureOverlay();
    // clear previous marks
    Array.from(overlay.querySelectorAll('.dbg-measure-box')).forEach(n=>n.remove());
    state.measureRects.forEach((m, i)=>{
      const box = document.createElementNS(svgns, 'rect');
      box.setAttribute('x', String(m.x));
      box.setAttribute('y', String(m.y));
      box.setAttribute('width', String(Math.max(1, m.width)));
      box.setAttribute('height', String(Math.max(1, m.height)));
      box.setAttribute('fill', 'none');
      box.setAttribute('stroke', 'orange');
      box.setAttribute('stroke-dasharray', '4,3');
      box.setAttribute('stroke-width', '1');
      box.setAttribute('class', 'dbg-measure-box');
      box.setAttribute('data-i', String(i+1));
      overlay.appendChild(box);
    });
  }

  function animateCursor(startTs){
    // 若有页面节拍器，使用其AudioContext时钟与BPM驱动；否则退回性能时钟
    let elapsedSec = 0;
    let md = 0;
    const met = (typeof window.getMetronomeState === 'function') ? window.getMetronomeState() : null;
    const ac = met && met.audioContext ? met.audioContext : null;
    const beatsPM = state.beatsPerMeasure || 4;
    if (ac){
      const beatDur = 60/Math.max(1, met.tempo || 60);
      md = beatsPM * beatDur;
      const nowAc = ac.currentTime;
      const anchor = state.anchorAcTime != null ? state.anchorAcTime : nowAc;
      if (nowAc >= anchor) {
        elapsedSec = nowAc - anchor; // 已进入节拍网格，严格对齐
      } else {
        // 还没到第一个整拍，先用performance计时做平滑过渡，避免蓝线静止
        const nowPerf = performance.now();
        const perfAnchor = state.anchorPerfStart || startTs || nowPerf;
        elapsedSec = Math.max(0, (nowPerf - perfAnchor) / 1000);
      }
    } else {
      const now = performance.now();
      const perfAnchor = state.anchorPerf || startTs || now;
      elapsedSec = Math.max(0, (now - perfAnchor) / 1000);
      // Fallback measure duration：若未设置，使用默认80BPM
      md = state.measureDuration || (beatsPM * (60/80));
    }
    const totalMeasures = state.measureRects.length;
    let idx = Math.floor(elapsedSec / Math.max(1e-6, md));
    if (idx >= totalMeasures){
      maskMeasure(totalMeasures-1);
      stopChallenge();
      return;
    }
    const within = elapsedSec - idx * md;
    const frac = Math.max(0, Math.min(1, md > 0 ? (within / md) : 0));
    const prev = idx - 1;
    if (prev >= 0 && frac >= 0.06) {
      applyClipForIndex(prev);
    }
    const m = state.measureRects[idx];
    // 在每个小节内部使用节拍线性插值，减少因 measureRects 宽度波动造成的漂移
    const x = m.x + m.width * frac;
    if (!state.cursorEl || !state.cursorEl.parentNode){
      // 兜底：若光标被移除/未创建，重新创建并放到当前位置
      ensureOverlay();
    }
    if (state.cursorEl){
      const y1 = m.y + m.height * 0.05;
      const y2 = y1 + Math.max(2, m.height * 0.9);
      state.cursorEl.setAttribute('x1', String(x));
      state.cursorEl.setAttribute('x2', String(x));
      state.cursorEl.setAttribute('y1', String(y1));
      state.cursorEl.setAttribute('y2', String(y2));
      // 确保光标在最上层，不被擦除矩形覆盖
      if (state.overlayEl && state.cursorEl.parentNode === state.overlayEl) {
        try { state.overlayEl.appendChild(state.cursorEl); } catch(_) {}
      }
    }
    state.lastIndex = idx;
    // 对齐到节拍网格：下一帧基于当前节拍锚点刷新
    state.rafId = requestAnimationFrame(()=>animateCursor(startTs));
  }

  // Find the main content group of the OSMD-rendered SVG (exclude our overlay)
  function findContentGroup(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return null;
    const topGroups = Array.from(svg.querySelectorAll(':scope > g'));
    for (const g of topGroups){
      if (g.id === 'challengeOverlayG') continue;
      // Heuristic: content group contains many drawable nodes
      const hasDrawable = g.querySelector('path, rect, line, text, use, polygon, polyline, g');
      if (hasDrawable) return g;
    }
    // fallback: closest g around a stavenote
    const sn = svg.querySelector('[class*="stavenote"], [class*="StaveNote"], [id*="measure" i]');
    return sn ? sn.closest('g') : null;
  }

  // Ensure clipPath is ready and applied to the content group only
  function ensureContentClipSetup(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return;
    if (!state.contentGroup) state.contentGroup = findContentGroup();
    // 兼容：抓取所有顶层内容组（排除 defs 与 overlay）
    if (!state.contentGroups){
      const groups = Array.from(svg.children).filter(el => el.tagName && el.tagName.toLowerCase() === 'g');
      state.contentGroups = groups.filter(g => g.id !== 'challengeOverlayG');
    }
    // 不再使用 clipPath（避免准备期误隐藏）。仅确保 overlay 在最上层
    const overlay = ensureOverlay();
    if (overlay && overlay.parentNode){ overlay.parentNode.appendChild(overlay); }
  }

  function clearContentClip(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return;
    // 移除 clip-path 属性
    if (state.contentGroup) try{ state.contentGroup.removeAttribute('clip-path'); }catch(_){ }
    if (state.contentGroups && state.contentGroups.length){
      for (const g of state.contentGroups){ try{ g.removeAttribute('clip-path'); }catch(_){ } }
    }
    // 删除 clipPath 元素（如果之前存在）
    try{
      const cp = svg.querySelector('#challengeClip');
      if (cp && cp.parentNode) cp.parentNode.removeChild(cp);
    }catch(_){ }
  }

  // Cluster measures into systems (rows) using y proximity
  function computeSystemsFromMeasures(rects){
    const epsY = 6;
    const rows = [];
    const sorted = (rects || []).slice().sort((a,b)=> a.y - b.y || a.x - b.x);
    for (const r of sorted){
      let row = rows.find(it => Math.abs(it.y - r.y) < epsY);
      if (!row){
        row = { y: r.y, height: r.height, x1: r.x, x2: r.x + r.width };
        rows.push(row);
      } else {
        row.y = Math.min(row.y, r.y);
        row.height = Math.max(row.height, r.height);
        row.x1 = Math.min(row.x1, r.x);
        row.x2 = Math.max(row.x2, r.x + r.width);
      }
    }
    return rows.map(r => ({ x: r.x1, y: r.y, width: r.x2 - r.x1, height: r.height }));
  }

  // Update clip to hide all measures up to lastHiddenIndex
  function applyClipForIndex(lastHiddenIndex){
    if (!HIDE_MEASURES_ENABLED) return;
    // 新策略：不再依赖 clipPath，改为在 overlay 层绘制“系统级擦除矩形”
    // - 对于已完全经过的行：整行覆盖
    // - 对于当前行：从行起点到上一小节右边界覆盖
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects.length) return;
    if (!state.systems || !state.systems.length) state.systems = computeSystemsFromMeasures(state.measureRects);
    const overlay = ensureOverlay();
    if (!overlay) return;
    // 清理之前的擦除块
    Array.from(overlay.querySelectorAll('.eraser-rect')).forEach(n => n.remove());

    const idx = Math.max(-1, Math.min(lastHiddenIndex, state.measureRects.length - 1));
    if (idx < 0) return; // 不遮挡任何内容

    const prevM = state.measureRects[idx];
    // 找到 prev 所在行
    let sysIndex = 0;
    for (let s=0; s<state.systems.length; s++){
      const sys = state.systems[s];
      if (prevM.y >= sys.y && prevM.y <= sys.y + sys.height){ sysIndex = s; break; }
    }
    // 1) 覆盖所有在当前行之前的整行
    for (let s=0; s<sysIndex; s++){
      const rs = state.systems[s];
      const rr = document.createElementNS(svgns, 'rect');
      rr.setAttribute('x', String(rs.x));
      rr.setAttribute('y', String(rs.y));
      rr.setAttribute('width', String(rs.width));
      rr.setAttribute('height', String(rs.height));
      rr.setAttribute('fill', '#ffffff');
      rr.setAttribute('class', 'eraser-rect');
      overlay.appendChild(rr);
    }
    // 2) 在当前行，从行起点到 prev 小节右边界覆盖
    const sys = state.systems[sysIndex];
    const prevEndX = prevM.x + prevM.width; // 上一小节右边界
    const cover = document.createElementNS(svgns, 'rect');
    cover.setAttribute('x', String(sys.x));
    cover.setAttribute('y', String(sys.y));
    cover.setAttribute('width', String(Math.max(0, prevEndX - sys.x)));
    cover.setAttribute('height', String(sys.height));
    cover.setAttribute('fill', '#ffffff');
    cover.setAttribute('class', 'eraser-rect');
    overlay.appendChild(cover);
  }

  // Build a precise element index: group SVG drawable elements by measure (between barlines)
  function buildMeasureElementIndex(){
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects.length) return [];
    const overlayG = svg.querySelector('#challengeOverlayG');
    const svgCTM = svg.getScreenCTM();
    if (!svgCTM) return [];
    const toScreen = (x,y)=>{
      const pt = svg.createSVGPoint();
      pt.x = x; pt.y = y; return pt.matrixTransform(svgCTM);
    };
    // Convert measure rects (svg coords) to screen rects once
    const measureScreens = state.measureRects.map(m=>{
      const p1 = toScreen(m.x, m.y);
      const p2 = toScreen(m.x + m.width, m.y + m.height);
      const left = Math.min(p1.x, p2.x), top = Math.min(p1.y, p2.y);
      const right = Math.max(p1.x, p2.x), bottom = Math.max(p1.y, p2.y);
      return { left, top, right, bottom };
    });
    const buckets = state.measureRects.map(()=>[]);
    const candidates = svg.querySelectorAll('path, line, rect, circle, ellipse, polygon, polyline, text, use, g');
    const isOverlay = (el)=> overlayG && (overlayG === el || overlayG.contains(el));
    const getScreenRect = (el)=>{
      try{
        if (typeof el.getBBox === 'function' && typeof el.getScreenCTM === 'function'){
          const bbox = el.getBBox();
          const ctm = el.getScreenCTM();
          if (!bbox || !ctm || bbox.width<=0 || bbox.height<=0) return null;
          const pt = svg.createSVGPoint();
          const corners = [
            [bbox.x, bbox.y],
            [bbox.x + bbox.width, bbox.y],
            [bbox.x, bbox.y + bbox.height],
            [bbox.x + bbox.width, bbox.y + bbox.height]
          ];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const [x,y] of corners){ pt.x=x; pt.y=y; const p = pt.matrixTransform(ctm); minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y);} 
          return {left:minX, top:minY, right:maxX, bottom:maxY};
        }
      }catch(_){ }
      try{
        const r = el.getBoundingClientRect();
        if (r && r.width>0 && r.height>0) return {left:r.left, top:r.top, right:r.right, bottom:r.bottom};
      }catch(_){ }
      return null;
    };
    for (const el of candidates){
      if (isOverlay(el)) continue;
      const sr = getScreenRect(el);
      if (!sr) continue;
      // assign to the first measure whose horizontal span contains element center
      const cx = (sr.left + sr.right)/2;
      const cy = (sr.top + sr.bottom)/2;
      for (let i=0;i<measureScreens.length;i++){
        const mr = measureScreens[i];
        if (cx >= mr.left && cx <= mr.right && cy >= mr.top && cy <= mr.bottom){
          buckets[i].push(el);
          break;
        }
      }
    }
    return buckets;
  }

  function startCountIn(bpm){
    let beats = 4, denVal = 4;
    const xml = getCurrentMelodyXML();
    const ts = xml ? parseTimeSigFromXML(xml) : null;
    if (ts){ beats = ts.num; denVal = ts.den; }
    else {
      const tsStr = getCurrentTimeSignature();
      const parts = String(tsStr||'4/4').split('/');
      beats = parseInt(parts[0]||'4',10);
      denVal = parseInt(parts[1]||'4',10);
      if (!isFinite(beats) || !isFinite(denVal)) { beats = 4; denVal = 4; }
    }
    const beatSec = (60/Math.max(1,bpm)) * (4/denVal);
    // 记录每小节拍数；measureDuration 将在有节拍器时用AC时钟计算
    state.beatsPerMeasure = beats;
    // 若有节拍器相位，后续将在 animateCursor 内使用 AC 时钟；此处也缓存物理时长作为兜底
    state.measureDuration = beats * beatSec;
    const first = state.measureRects[0];
    if (first && state.cursorEl){
      const startX = first.x; // 对齐到小节起点
      const y1 = first.y + first.height * 0.05;
      const y2 = y1 + Math.max(2, first.height * 0.9);
      state.cursorEl.setAttribute('x1', String(startX));
      state.cursorEl.setAttribute('x2', String(startX));
      state.cursorEl.setAttribute('y1', String(y1));
      state.cursorEl.setAttribute('y2', String(y2));
    }
    ensureOverlay();
    let i = 0;
    function tick(){
      // 准备/倒计时阶段不启用页面节拍器
      const strong = (i % beats) === 0;
      playClick(strong);
      i++;
      if (i >= beats){
        // 倒计时结束：开启页面节拍器，并对齐挑战进度到下一个整拍
        try {
          if (typeof setMetronomeTempo === 'function') setMetronomeTempo(bpm);
          const headerBpm = document.getElementById('headerMetronomeBpm');
          if (headerBpm) headerBpm.value = String(bpm);
          if (typeof startMetronome === 'function') startMetronome();
        } catch(_) {}

        const met = (typeof window.getMetronomeState === 'function') ? window.getMetronomeState() : null;
        // 精确与节拍器网格对齐：使用节拍器网格起点 + 当前拍号
        const phase = (typeof window.getMetronomePhase === 'function') ? window.getMetronomePhase() : null;
        const ac = phase && phase.audioContext ? phase.audioContext : (met && met.audioContext ? met.audioContext : null);
        const beatDur = phase && typeof phase.beatDuration === 'number' && phase.beatDuration > 0 ? phase.beatDuration : beatSec;
        if (ac){
          // 节拍器网格时间 = startTime + currentBeat*beatDur
          const gridBase = (phase && typeof phase.startTime === 'number') ? phase.startTime : 0;
          const gridBeat = (phase && typeof phase.currentBeat === 'number') ? phase.currentBeat : 0;
          const now = ac.currentTime;
          // 将锚点推到“未来最近拍”，保证所有事件在未来且与网格对齐，避免初始落在过去导致追赶/卡顿
          let anchor = gridBase + gridBeat * beatDur;
          const nextGrid = Math.ceil((now + 0.03 - gridBase) / beatDur) * beatDur + gridBase;
          if (!isFinite(anchor) || anchor < now + 0.01) anchor = nextGrid;
          state.anchorAcTime = anchor;
          state.anchorPerf = null;
          state.anchorPerfStart = performance.now();
        } else {
          state.anchorAcTime = null;
          const nowPerf = performance.now();
          state.anchorPerfStart = nowPerf;
          state.anchorPerf = null;
        }
        // 启动跳停式光标（按音符时值/位置跳停）
        try { startJumpCursor(bpm); } catch(_) {}
        if (state.countInTimerId) { clearInterval(state.countInTimerId); state.countInTimerId = null; }
      }
    }
    tick();
    state.countInTimerId = setInterval(tick, beatSec*1000);
  }

  async function waitForMeasuresReady(maxWaitMs){
    const t0 = Date.now();
    let rects = [];
    // 1) OSMD 图形层
    if (typeof window.getOSMDMeasureRects === 'function'){
      try { const r = window.getOSMDMeasureRects(); if (Array.isArray(r) && r.length>0) rects = r; } catch(_) {}
    }
    // 2) 小节线推断（优先于通用 g 解析）
    if (rects.length === 0){ rects = collectMeasureRectsByBarlines(); }
    // 3) 系统等分
    if (rects.length === 0){ rects = collectMeasureRectsBySystemSubdivision(); }
    // 4) 全局等分兜底
    if (rects.length === 0){ rects = collectMeasureRectsByGlobalEqualSplit(); }
    // 等待期重复上述顺序
    while ((rects.length === 0 || rects.every(r => r.width === 0 || r.height === 0)) && Date.now() - t0 < maxWaitMs){
      await new Promise(r => setTimeout(r, 120));
      rects = [];
      if (typeof window.getOSMDMeasureRects === 'function'){
        try { const r = window.getOSMDMeasureRects(); if (Array.isArray(r) && r.length>0) rects = r; } catch(_) {}
      }
      if (rects.length === 0) rects = collectMeasureRectsByBarlines();
      if (rects.length === 0) rects = collectMeasureRectsBySystemSubdivision();
      if (rects.length === 0) rects = collectMeasureRectsByGlobalEqualSplit();
    }
    // 若仍不稳定，后续步骤会再稳定化处理
    rects = await waitForStableMeasures(rects, 400);
    const expected = getExpectedMeasureCountFromXML();
    if (expected > 0 && rects.length !== expected){
      const bars = collectMeasureRectsByBarlines();
      if (bars.length === expected) return bars;
      const sys = collectMeasureRectsBySystemSubdivision();
      if (sys.length === expected) return sys;
    }
    return rects;
  }

  // ===== 跳停式光标：解析时间线 =====
  function parseTimelineFromXML(){
    try{
      const xml = getCurrentMelodyXML();
      if (!xml) return { events: [], measureStarts: [], measureTotals: [] };
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const part = doc.querySelector('part');
      if (!part) return { events: [], measureStarts: [], measureTotals: [] };
      const measures = Array.from(part.querySelectorAll('measure'));
      let divisions = 1;
      let beatsNum = 4, beatType = 4;
      const events = [];
      const measureStarts = [];
      const measureTotals = [];
      let absQN = 0; // 四分音符为单位的绝对时间
      // 跨小节tie累积
      let tieOpen = false; let tieDurDiv = 0; let tieIsRest = false; let tieStartAbsQN = 0;
      for (let mi=0; mi<measures.length; mi++){
        const m = measures[mi];
        const attr = m.querySelector('attributes');
        if (attr){
          const div = attr.querySelector('divisions');
          if (div) divisions = Math.max(1, parseInt(div.textContent||'1',10)||1);
          const time = attr.querySelector('time');
          if (time){
            const b = time.querySelector('beats');
            const bt = time.querySelector('beat-type');
            if (b && bt){
              beatsNum = parseInt(b.textContent||'4',10)||4;
              beatType = parseInt(bt.textContent||'4',10)||4;
            }
          }
        }
        measureStarts.push(absQN);
        const measureTotalQN = beatsNum * (4/beatType); // 一小节的四分拍总数
        measureTotals.push(measureTotalQN);
        let posDiv = 0;
        const notes = Array.from(m.querySelectorAll('note'));
        for (let ni=0; ni<notes.length; ni++){
          const n = notes[ni];
          const isRest = !!n.querySelector('rest');
          const durEl = n.querySelector('duration');
          const durDiv = durEl ? Math.max(0, parseInt(durEl.textContent||'0',10)||0) : 0;
          const durQN = durDiv / divisions; // 四分拍单位
          const isChord = !!n.querySelector('chord');
          const ties = Array.from(n.querySelectorAll('tie')).map(x=>x.getAttribute('type'));
          const hasStart = ties.includes('start');
          const hasStop = ties.includes('stop');
          const startQNAbs = absQN + (posDiv/divisions);
          const startQNInMeasure = (posDiv/divisions);
          if (hasStart){
            if (!tieOpen){ tieOpen = true; tieDurDiv = durDiv; tieIsRest = isRest; tieStartAbsQN = startQNAbs; }
            else { tieDurDiv += durDiv; }
          } else if (hasStop && tieOpen){
            tieDurDiv += durDiv;
            const durQNsum = tieDurDiv / divisions;
            events.push({ measure: mi, posBeats: startQNInMeasure, absBeats: tieStartAbsQN, durBeats: durQNsum, isRest: tieIsRest });
            tieOpen = false; tieDurDiv = 0; tieIsRest = false;
          } else if (tieOpen){
            tieDurDiv += durDiv; // tie延续
          } else {
            if (!isChord){
              events.push({ measure: mi, posBeats: startQNInMeasure, absBeats: startQNAbs, durBeats: durQN, isRest });
            }
          }
          if (!isChord) posDiv += durDiv; // chord后续音不推进时间
        }
        absQN += measureTotalQN;
      }
      return { events, measureStarts, measureTotals };
    } catch(_){ return { events: [], measureStarts: [], measureTotals: [] }; }
  }

  function mapEventsToPositions(timeline){
    const events = Array.isArray(timeline) ? timeline : (timeline && timeline.events ? timeline.events : []);
    if (!events || !events.length || !state.measureRects || !state.measureRects.length) return { events: [], measureStarts: [], measureTotals: [] };
    const measureTotals = (timeline && timeline.measureTotals && timeline.measureTotals.length) ? timeline.measureTotals : null;
    // 先用比例位置作为回退
    const mapped = events.map(ev => {
      const mr = state.measureRects[Math.min(ev.measure, state.measureRects.length-1)];
      const perMeas = measureTotals ? measureTotals[Math.min(ev.measure, measureTotals.length-1)] : (function(){ const xml = getCurrentMelodyXML(); const ts = xml ? parseTimeSigFromXML(xml) : null; return (ts ? ts.num : 4) * (4/(ts ? ts.den : 4)); })();
      const x = mr.x + Math.max(0, Math.min(1, (ev.posBeats / Math.max(0.0001, perMeas)))) * mr.width;
      const y1 = mr.y + mr.height * 0.05;
      const y2 = y1 + Math.max(2, mr.height * 0.9);
      return { ...ev, x, y1, y2 };
    });
    // 用真实 notehead 细化位置（按拍点就近匹配音头），休止符保持比例位置
    try {
      const headMap = collectNoteheadCentersByMeasure();
      const offsetPx = 4; // 固定在音符前方的距离（更靠近音符）
      const snapTol = 15; // 与音头的最近吸附阈值（像素）
      const defaultPerMeasure = (function(){
        const xml = getCurrentMelodyXML();
        const ts = xml ? parseTimeSigFromXML(xml) : null;
        return (ts ? ts.num : 4) * (4/(ts ? ts.den : 4));
      })();
      const eventsByMeasure = new Map();
      for (const ev of mapped){
        const arr = eventsByMeasure.get(ev.measure) || [];
        arr.push(ev);
        eventsByMeasure.set(ev.measure, arr);
      }
      for (const [mIndex, evs] of eventsByMeasure.entries()){
        const heads = headMap.get(mIndex) || [];
        const perMeas = (measureTotals && measureTotals[mIndex] != null) ? measureTotals[mIndex] : defaultPerMeasure;
        const noteEvents = evs.filter(e => !e.isRest);

        for (const ev of noteEvents){
          const targetX = state.measureRects[mIndex].x + Math.max(0, Math.min(1, ev.posBeats/Math.max(0.0001, perMeas))) * state.measureRects[mIndex].width;
          let bestHead = null;
          let bestDist = Infinity;
          heads.forEach(hx => {
            const d = Math.abs(hx - targetX);
            if (d < bestDist){
              bestDist = d;
              bestHead = hx;
            }
          });

          if (bestHead !== null && bestDist <= snapTol){
            ev.x = Math.max(0, bestHead - offsetPx);
          } else {
            ev.x = targetX;
          }
        }
      }
    } catch(_) {}
    return { events: mapped, measureTotals: measureTotals || [], measureStarts: (timeline && timeline.measureStarts) ? timeline.measureStarts : [] };
  }

  function collectNoteheadCentersByMeasure(){
    const map = new Map();
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects.length) return map;
    const selector = '[class*="notehead"], [class*="NoteHead"], [class*="stavenote"], use[href*="notehead" i]';
    const svgBBox = svg.getBoundingClientRect();
    const headsAll = Array.from(svg.querySelectorAll(selector));
    for (let mi=0; mi<state.measureRects.length; mi++){
      const mr = state.measureRects[mi];
      const xs = [];
      headsAll.forEach(el=>{
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!r || r.width<=0 || r.height<=0) return;
        const cx = r.left - svgBBox.left + r.width/2;
        const cy = r.top - svgBBox.top + r.height/2;
        if (cx >= mr.x && cx <= mr.x + mr.width && cy >= mr.y && cy <= mr.y + mr.height){
          xs.push(cx);
        }
      });
      xs.sort((a,b)=>a-b);
      const uniq = [];
      const eps = 0.8; // 适度去重，保留密集音头
      xs.forEach(x=>{
        if (!uniq.length || Math.abs(x - uniq[uniq.length-1]) > eps) uniq.push(x);
      });
      map.set(mi, uniq);
    }
    return map;
  }

  function startJumpCursor(bpm){
    const tempo = Math.max(1, bpm || 60);
    const secPerQuarter = 60/tempo; // QN -> 秒

    // 解析XML并映射到坐标（仅音符事件，避免休止驱动错位）
    const rawTimeline = parseTimelineFromXML();
    const mapped = mapEventsToPositions(rawTimeline);
    const events = (mapped && mapped.events) ? mapped.events.filter(ev => !ev.isRest) : [];

    const startsRaw = rawTimeline && rawTimeline.measureStarts ? rawTimeline.measureStarts : [];
    const totalsRaw = rawTimeline && rawTimeline.measureTotals ? rawTimeline.measureTotals : [];
    const defaultBeatsPerMeasure = state.beatsPerMeasure || 4;
    const measures = [];
    for (let i=0;i<state.measureRects.length;i++){
      const mr = state.measureRects[i];
      const startQN = startsRaw[i] != null ? startsRaw[i] : (i>0 ? (measures[i-1].startQN + measures[i-1].totalQN) : 0);
      const totalQN = totalsRaw[i] != null ? totalsRaw[i] : defaultBeatsPerMeasure;
      measures.push({
        index: i,
        startQN,
        totalQN,
        startSec: 0,
        endSec: 0,
        startX: mr.x,
        endX: mr.x + mr.width,
        y1: mr.y + mr.height*0.05,
        y2: mr.y + mr.height*0.95
      });
    }

    // 清理旧调度
    if (state.rafId) { try { cancelAnimationFrame(state.rafId); } catch(_) {} state.rafId = null; }
    if (state.schedulerId) { try { clearInterval(state.schedulerId);} catch(_) {} state.schedulerId = null; }
    if (!state.jumpTimeouts) state.jumpTimeouts = [];
    state.jumpTimeouts.forEach(t=>{ try{ clearTimeout(t);}catch(_){}});
    state.jumpTimeouts = [];

    const phase = (typeof window.getMetronomePhase === 'function') ? window.getMetronomePhase() : null;
    const ac = phase && phase.audioContext ? phase.audioContext : null;
    const anchorAc = (ac && state.anchorAcTime!=null) ? state.anchorAcTime : null;
    const anchorPerfStart = state.anchorPerfStart || performance.now();

    // 计算每小节绝对秒
    const anchorSecBase = (anchorAc!=null) ? anchorAc : 0;
    const toSec = qn => qn * secPerQuarter;
    measures.forEach(m => {
      m.startSec = anchorSecBase + toSec(m.startQN);
      m.endSec = m.startSec + toSec(m.totalQN);
    });

    // 若首小节已在当前时间之前，整体平移到未来
    const nowBase = anchorAc!=null && ac ? ac.currentTime : ((performance.now() - anchorPerfStart)/1000);
    let measureShift = 0;
    if (measures.length && measures[0].startSec < nowBase){
      measureShift = (nowBase + 0.02) - measures[0].startSec;
      measures.forEach(m => { m.startSec += measureShift; m.endSec += measureShift; });
    }

    // 构建跳停事件列表：小节起点 + 音符事件（优先音头，缺失时用比例）+ 网格事件（覆盖休止/空白）
    const headMap = collectNoteheadCentersByMeasure();
    const offsetPx = 3; // 轻微前移
    const jumpEvents = [];
    measures.forEach(m => {
      jumpEvents.push({ time: m.startSec, x: m.startX, y1: m.y1, y2: m.y2, measure: m.index });
    });
    if (events && events.length){
      for (const ev of events){
        const m = measures[ev.measure];
        if (!m) continue;
        const perMeas = totalsRaw[ev.measure] != null ? totalsRaw[ev.measure] : m.totalQN;
        const startSec = anchorSecBase + toSec(ev.absBeats) + measureShift;
        let xPos;
        const heads = headMap.get(ev.measure) || [];
        if (heads.length){
          const hx = heads.shift(); // 顺序匹配
          xPos = Math.min(m.endX, Math.max(m.startX, hx - offsetPx));
          // 放回剩余头
          if (heads.length) headMap.set(ev.measure, heads);
        } else {
          const frac = Math.max(0, Math.min(1, ev.posBeats / Math.max(0.0001, perMeas)));
          xPos = m.startX + (m.endX - m.startX) * frac;
        }
        jumpEvents.push({ time: startSec, x: xPos, y1: m.y1, y2: m.y2, measure: ev.measure });
      }
    }

    // 网格事件：按小节内最小时值或默认16分网格，覆盖休止/空白
    measures.forEach(m => {
      const perMeas = totalsRaw[m.index] != null ? totalsRaw[m.index] : m.totalQN;
      const evs = events.filter(ev => ev.measure === m.index);
      const minDur = evs.reduce((min, ev) => (ev.durBeats && ev.durBeats > 0 ? Math.min(min, ev.durBeats) : min), Infinity);
      const stepBeats = (isFinite(minDur) && minDur > 0) ? Math.max(0.125, Math.min(1, minDur)) : 0.25; // 至少十六分
      const steps = Math.max(1, Math.floor(perMeas / stepBeats));
      for (let s=1; s<=steps; s++){
        const fracBeats = stepBeats * s;
        if (fracBeats >= perMeas) break;
        const t = m.startSec + toSec(fracBeats);
        const frac = fracBeats / perMeas;
        const xPos = m.startX + (m.endX - m.startX) * frac;
        jumpEvents.push({ time: t, x: xPos, y1: m.y1, y2: m.y2, measure: m.index });
      }
    });

    // 如果没有任何事件，兜底小节起点
    if (!jumpEvents.length){
      for (const m of measures){
        jumpEvents.push({ time: m.startSec, x: m.startX, y1: m.y1, y2: m.y2, measure: m.index });
      }
    }
    jumpEvents.sort((a,b)=> a.time - b.time || a.x - b.x);

    let prevMeasure = -1;
    // 使用AudioContext进行精确调度；无AC则退回raf
    if (ac){
      const acNow = ac.currentTime;
      const lastTime = jumpEvents[jumpEvents.length-1].time;
      jumpEvents.forEach(ev => {
        const delayMs = Math.max(0, (ev.time - acNow) * 1000);
        const tid = setTimeout(()=>{
          if (ev.measure !== prevMeasure){
            if (prevMeasure >= 0) maskMeasure(prevMeasure);
            prevMeasure = ev.measure;
          }
          if (state.cursorEl){
            state.cursorEl.setAttribute('x1', String(ev.x));
            state.cursorEl.setAttribute('x2', String(ev.x));
            state.cursorEl.setAttribute('y1', String(ev.y1));
            state.cursorEl.setAttribute('y2', String(ev.y2));
            try { state.overlayEl.appendChild(state.cursorEl); } catch(_){}
          }
        }, Math.round(delayMs));
        state.jumpTimeouts.push(tid);
      });
      const endDelayMs = Math.max(0, (lastTime - acNow + 0.2) * 1000);
      state.schedulerId = setTimeout(()=>{ state.rafId = null; }, Math.round(endDelayMs));
      return;
    } else {
      function step(){
        const nowSec = anchorAc!=null && ac ? ac.currentTime : ((performance.now() - anchorPerfStart)/1000);
        if (!jumpEvents.length){
          state.rafId = null;
          return;
        }
        let idx = jumpEvents.findIndex(ev => ev.time > nowSec);
        if (idx === -1) idx = jumpEvents.length;
        idx = Math.max(0, idx - 1);
        const ev = jumpEvents[idx];
        if (ev.measure !== prevMeasure){
          if (prevMeasure >= 0) maskMeasure(prevMeasure);
          prevMeasure = ev.measure;
        }
        if (state.cursorEl){
          state.cursorEl.setAttribute('x1', String(ev.x));
          state.cursorEl.setAttribute('x2', String(ev.x));
          state.cursorEl.setAttribute('y1', String(ev.y1));
          state.cursorEl.setAttribute('y2', String(ev.y2));
          try { state.overlayEl.appendChild(state.cursorEl); } catch(_){}
        }
        if (nowSec > (jumpEvents[jumpEvents.length-1].time + 0.2)){
          state.rafId = null;
          return;
        }
        state.rafId = requestAnimationFrame(step);
      }
      state.rafId = requestAnimationFrame(step);
    }
  }

  // New: best-source sampler used by waitForStableMeasures
  function sampleBestMeasureRects(){
    if (typeof window.getOSMDMeasureRects === 'function'){
      try { const r = window.getOSMDMeasureRects(); if (Array.isArray(r) && r.length>0) return r; } catch(_) {}
    }
    let r = collectMeasureRectsByBarlines();
    if (!r.length) r = collectMeasureRectsBySystemSubdivision();
    if (!r.length) r = collectMeasureRectsByGlobalEqualSplit();
    // 最后才尝试通用 g 解析（可能产生“音符级”矩形）
    if (!r.length) r = collectMeasureRects();
    return r;
  }

  async function waitForStableMeasures(initialRects, maxWaitMs){
    const eps = 2;
    const start = Date.now();
    let prev = (initialRects && initialRects.length) ? initialRects : sampleBestMeasureRects();
    let lastNonEmpty = Array.isArray(prev) && prev.length ? prev : [];
    while (Date.now() - start < maxWaitMs){
      await new Promise(r => requestAnimationFrame(()=>r()));
      const nowRects = sampleBestMeasureRects();
      if (!nowRects || nowRects.length === 0) continue; // do not degrade to empty
      lastNonEmpty = nowRects;
      if (prev.length === nowRects.length){
        let stable = true;
        for (let i=0;i<prev.length;i++){
          const a = prev[i], b = nowRects[i];
          if (!b || Math.abs(a.x-b.x)>eps || Math.abs(a.y-b.y)>eps || Math.abs(a.width-b.width)>eps || Math.abs(a.height-b.height)>eps){ stable = false; break; }
        }
        if (stable) return nowRects;
      }
      prev = nowRects;
    }
    return lastNonEmpty;
  }

  function collectMeasureRectsBySystemSubdivision(){
    try {
      const systems = collectSystemRects();
      let totalMeasures = 0;
      if (typeof osmd !== 'undefined' && osmd && osmd.GraphicSheet && Array.isArray(osmd.GraphicSheet.MeasureList)) {
        totalMeasures = osmd.GraphicSheet.MeasureList.length || 0;
      }
      if (!totalMeasures) totalMeasures = getExpectedMeasureCountFromXML() || 0;
      if (!systems.length || !totalMeasures) return [];
      const out = [];
      let remain = totalMeasures;
      systems.forEach(sys => {
        const thisCount = Math.min(remain, Math.min(4, totalMeasures));
        if (thisCount <= 0) return;
        const usableX = sys.x + Math.min(40, sys.width*0.06);
        const usableW = Math.max(10, sys.width - (usableX - sys.x));
        const segW = usableW / thisCount;
        for (let i=0;i<thisCount;i++){
          out.push({ x: usableX + i*segW, y: sys.y, width: segW, height: sys.height });
        }
        remain -= thisCount;
      });
      if (out.length > totalMeasures) return out.slice(0, totalMeasures);
      return out;
    } catch(_) { return []; }
  }

  async function startChallenge(prepSec, bpm){
    if (state.active) stopChallenge();
    state.active = true;
    showCountdownUI(prepSec);
    // 若页面节拍器此时已开启，挑战准备期内先关闭，待count-in结束再开启
    try {
      const headerToggleBtn = document.getElementById('headerMetronomeBtn');
      const wasActive = !!(headerToggleBtn && headerToggleBtn.classList.contains('active'));
      state.metronomeWasRunning = wasActive;
      if (wasActive && typeof stopMetronome === 'function') {
        stopMetronome();
      }
    } catch(_) {}
    const tStart = Date.now();
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); }
    state.countdownTimerId = setInterval(()=>{
      const elapsed = (Date.now() - tStart)/1000;
      updateCountdownUI(Math.max(0, prepSec - elapsed));
    }, 200);
    // Keep original behavior: force regenerate to fit current settings
    if (typeof window.generateMelody === 'function') {
      try { window.generateMelody(); } catch(_) {}
    }
    await ensureScoreReady();
    const rects = await waitForMeasuresReady(Math.max(1000, prepSec*1000));
    state.measureRects = rects;
    state.measureRects = await waitForStableMeasures(state.measureRects, 500);
    // 基于小节矩形推导每一行(system)的范围，用于擦除矩形计算
    state.systems = computeSystemsFromMeasures(state.measureRects);
    // 预先索引小节元素，用于精准隐藏
    state.measureBuckets = buildMeasureElementIndex();
    // 初始化覆盖层（不使用 clipPath，避免准备期误隐藏）
    ensureOverlay();
    applyClipForIndex(-1); // 初始不覆盖
    // 准备阶段不启动页面节拍器；仅在count-in结束后再启动

    const nowMs = Date.now();
    const remainMs = Math.max(0, prepSec*1000 - (nowMs - tStart));
    await new Promise(r => setTimeout(r, remainMs));
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); state.countdownTimerId = null; }
    hideCountdownUI();
    if (!state.measureRects || !state.measureRects.length){
      alert('未检测到小节，无法启动挑战');
      stopChallenge();
      return;
    }
    // 由 startCountIn 统一设置 measureDuration，避免重复计算产生偏差
    ensureOverlay();
    if (state.observer) { try { state.observer.disconnect(); } catch(_){} }
    state.activeSvg = scoreEl.querySelector('svg');
    state.observer = new MutationObserver(() => {
      const currentSvg = scoreEl.querySelector('svg');
      if (currentSvg !== state.activeSvg) { stopChallenge(); }
    });
    state.observer.observe(scoreEl, { childList: true, subtree: false });
    state.resizeHandler = ()=> stopChallenge();
    window.addEventListener('resize', state.resizeHandler, { passive: true });
    startCountIn(bpm);
  }

  function stopChallenge(){
    if (state.observer) { try { state.observer.disconnect(); } catch(_){} state.observer = null; }
    if (state.resizeHandler) { window.removeEventListener('resize', state.resizeHandler); state.resizeHandler = null; }
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); state.countdownTimerId = null; }
    if (state.countInTimerId) { clearInterval(state.countInTimerId); state.countInTimerId = null; }
    restoreHiddenElements();
    clearOverlay();
    clearContentClip();
    hideCountdownUI();
    state.measureBuckets = null;
    state.active = false;
    if (toggleEl){ toggleEl.checked = false; updateSwitcherVisual(); }
  }

  function onToggleChanged(){
    if (!toggleEl) return;
    updateSwitcherVisual();
    if (toggleEl.checked){
      openChallengeModal();
    } else {
      stopChallenge();
    }
  }

  // wire events
  if (toggleEl){
    toggleEl.addEventListener('change', onToggleChanged);
    updateSwitcherVisual();
  }

  // expose APIs
  window.openChallengeModal = openChallengeModal;
  window.closeChallengeModal = closeChallengeModal;
  window.cancelChallengeSetup = cancelChallengeSetup;
  window.confirmChallengeSetup = confirmChallengeSetup;
  window.stopChallenge = stopChallenge;
  window.debugChallengeMeasures = debugShowMeasureRects;
  window._challengeState = state;
  window._applyClipForIndex = applyClipForIndex;

})();
