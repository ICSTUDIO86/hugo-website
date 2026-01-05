// IC Jianpu Challenge Mode (extracted from jianpu-generator.html)
// Scope: Jianpu tool only. Does not touch other tools.
// Changes vs original inline script:
// - waitForStableMeasures() now samples using a unified best-source function
//   that prefers window.getOSMDMeasureRects(), and never degrades from non-empty to empty.

(function(){
  const scoreEl = document.getElementById('score');
  const toggleEl = document.getElementById('challengeModeToggle');
  const cursorToggleEl = document.getElementById('challengeCursorToggle');
  const metronomeToggleEl = document.getElementById('challengeMetronomeToggle');
  const hideToggleEl = document.getElementById('challengeHideToggle');

  const state = {
    active: false,
    rafId: null,
    countdownTimerId: null,
    countInTimerId: null,
    noteTimerId: null,
    beatTimerId: null,
    metronomeTimerId: null,
    schedulerId: null,
    jumpTimeouts: null,
    observer: null,
    startTs: 0,
    measureRects: [],
    measureDuration: 0,
    cursorEl: null,
    overlayEl: null, // <g> inside SVG (cursor)
    hideLayerEl: null,
    hideOverlayEl: null,
    cursorWidth: 16,
    cursorHeight: null,
    cursorEnabled: true,
    metronomeEnabled: true,
    hideEnabled: true,
    autoRestart: false,
    metronomeWasRunning: false,
    lastBeatTimeMs: 0,
    nextCountInDelayMs: 0,
    beatsPerMeasure: 4,
    anchorAcTime: null,
    anchorPerfStart: 0,
    anchorPerf: null,
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
    textMedianHeight: null,
    bucketRebuildId: null,
  };

  function $(id){ return document.getElementById(id); }

  const svgns = 'http://www.w3.org/2000/svg';

  function openChallengeModal(){
    const modal = $('challengeModal');
    const prep = $('challengePrepTime');
    const bpm = $('challengeBPM');
    const cursorToggle = $('challengeCursorToggle');
    const metronomeToggle = $('challengeMetronomeToggle');
    const hideToggle = $('challengeHideToggle');
    let hasCursorPref = false;
    let hasMetronomePref = false;
    let hasHidePref = false;
    try {
      const saved = JSON.parse(localStorage.getItem('ic_jianpu_challenge_settings')||'{}');
      if (typeof saved.prep === 'number') prep.value = saved.prep;
      if (typeof saved.bpm === 'number') bpm.value = saved.bpm;
      if (cursorToggle && typeof saved.cursor === 'boolean') { cursorToggle.checked = saved.cursor; hasCursorPref = true; }
      if (metronomeToggle && typeof saved.metronome === 'boolean') { metronomeToggle.checked = saved.metronome; hasMetronomePref = true; }
      if (hideToggle && typeof saved.hide === 'boolean') { hideToggle.checked = saved.hide; hasHidePref = true; }
    } catch(_) {}
    if (cursorToggle && !hasCursorPref) cursorToggle.checked = true;
    if (metronomeToggle && !hasMetronomePref) metronomeToggle.checked = true;
    if (hideToggle && !hasHidePref) hideToggle.checked = true;
    updateCursorToggleVisual();
    updateMetronomeToggleVisual();
    updateHideToggleVisual();
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
    const cursorEnabled = $('challengeCursorToggle') ? $('challengeCursorToggle').checked : true;
    const metronomeEnabled = $('challengeMetronomeToggle') ? $('challengeMetronomeToggle').checked : true;
    const hideEnabled = $('challengeHideToggle') ? $('challengeHideToggle').checked : true;
    try { localStorage.setItem('ic_jianpu_challenge_settings', JSON.stringify({ prep, bpm, cursor: cursorEnabled, metronome: metronomeEnabled, hide: hideEnabled })); } catch(_) {}
    closeChallengeModal();
    try { ensureClickAudio(); } catch(_) {}
    await startChallenge(prep, bpm, cursorEnabled, metronomeEnabled, hideEnabled);
  }

  function updateSwitcherVisual(){
    const slider = toggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (toggleEl.checked){
      slider.style.backgroundColor = '#e53935';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function updateCursorToggleVisual(){
    const slider = cursorToggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (cursorToggleEl.checked){
      slider.style.backgroundColor = '#e53935';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function updateMetronomeToggleVisual(){
    const slider = metronomeToggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (metronomeToggleEl.checked){
      slider.style.backgroundColor = '#e53935';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function updateHideToggleVisual(){
    const slider = hideToggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (hideToggleEl.checked){
      slider.style.backgroundColor = '#e53935';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function ensureOverlay(){
    const svg = scoreEl.querySelector('svg');
    if (!svg) return null;
    let hideG = (state.hideLayerEl && state.hideLayerEl.parentNode) ? state.hideLayerEl : svg.querySelector('#challengeHideG');
    if (!hideG){
      hideG = document.createElementNS(svgns, 'g');
      hideG.setAttribute('id', 'challengeHideG');
      hideG.setAttribute('style', 'pointer-events:none');
      svg.appendChild(hideG);
    }
    let g = (state.overlayEl && state.overlayEl.parentNode) ? state.overlayEl : svg.querySelector('#challengeOverlayG');
    if (!g){
      g = document.createElementNS(svgns, 'g');
      g.setAttribute('id', 'challengeOverlayG');
      g.setAttribute('style', 'pointer-events:none');
      svg.appendChild(g);
    }
    try {
      svg.appendChild(hideG);
      svg.appendChild(g);
    } catch(_) {}
    let cursor = g.querySelector('#challengeCursor');
    if (cursor && !state.cursorEnabled){
      cursor.remove();
      cursor = null;
    }
    if (!cursor && state.cursorEnabled){
      cursor = document.createElementNS(svgns, 'rect');
      cursor.setAttribute('id', 'challengeCursor');
      cursor.setAttribute('fill', 'rgba(229,57,53,0.25)');
      cursor.setAttribute('stroke', 'rgba(229,57,53,0.45)');
      cursor.setAttribute('stroke-width', '1');
      cursor.setAttribute('rx', '0');
      cursor.setAttribute('ry', '0');
      g.appendChild(cursor);
    }
    state.overlayEl = g;
    state.hideLayerEl = hideG;
    state.cursorEl = cursor;
    return g;
  }

  function positionCursorRect(x, y, width, height){
    if (!state.cursorEl) return;
    state.cursorEl.setAttribute('x', String(x));
    state.cursorEl.setAttribute('y', String(y));
    state.cursorEl.setAttribute('width', String(Math.max(1, width)));
    state.cursorEl.setAttribute('height', String(Math.max(1, height)));
    if (state.overlayEl && state.cursorEl.parentNode === state.overlayEl) {
      try { state.overlayEl.appendChild(state.cursorEl); } catch(_) {}
    }
  }

  function clearOverlay(){
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
    state.masked.clear();
    state.lastIndex = -1;
    if (state.overlayEl && state.overlayEl.parentNode){ state.overlayEl.parentNode.removeChild(state.overlayEl); }
    state.overlayEl = null;
    if (state.hideLayerEl && state.hideLayerEl.parentNode){ state.hideLayerEl.parentNode.removeChild(state.hideLayerEl); }
    state.hideLayerEl = null;
    if (state.hideOverlayEl && state.hideOverlayEl.parentNode){ state.hideOverlayEl.parentNode.removeChild(state.hideOverlayEl); }
    state.hideOverlayEl = null;
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
    if (!state.hideEnabled) return;
    if (!state.measureRects[index]) return;
    if (state.masked.has(index)) return;
    hideMeasureBucket(index);
    state.masked.add(index);
  }

  function resolveScoreBackground(){
    const isTransparent = (val) => {
      if (!val) return true;
      const v = val.trim().toLowerCase();
      return v === 'transparent' || v === 'rgba(0, 0, 0, 0)' || v === 'rgba(0,0,0,0)';
    };
    let el = scoreEl;
    while (el && el !== document.body){
      try {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && !isTransparent(bg)) return bg;
      } catch(_) {}
      el = el.parentElement;
    }
    return '#fff';
  }

  function ensureHideOverlayContainer(){
    if (state.hideOverlayEl && state.hideOverlayEl.parentNode) return state.hideOverlayEl;
    const container = document.createElement('div');
    container.setAttribute('data-challenge-hide-layer', '1');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    state.hideOverlayEl = container;
    return container;
  }

  function hideMeasureBucket(index){
    if (!state.hideEnabled) return false;
    if (!state.measureBuckets || !state.measureBuckets[index]) return false;
    const svg = scoreEl.querySelector('svg');
    const boundsInfo = svg ? computeMeasureScreenBounds(svg) : null;
    const guardBounds = boundsInfo ? (boundsInfo.barBounds || boundsInfo.bounds) : null;
    const nextBound = guardBounds ? guardBounds[index + 1] : null;
    const currentBound = guardBounds ? guardBounds[index] : null;
    const currentScreen = boundsInfo && boundsInfo.screens ? boundsInfo.screens[index] : null;
    const nextGuard = 2;
    const currentGuard = 2;
    const measureH = currentScreen ? (currentScreen.bottom - currentScreen.top) : 0;
    const boundaryTol = 4;
    let hid = false;
    const bucket = state.measureBuckets[index];
    const medianHeight = boundsInfo ? (boundsInfo.textMedianHeight || state.textMedianHeight) : state.textMedianHeight;
    const barlineXs = guardBounds ? guardBounds.map(b => b.left) : null;
    for (const el of bucket){
      if (!el) continue;
      try{
        if (svg){
          const sr = getElementScreenRect(el, svg);
          if (sr){
            const cx = (sr.left + sr.right) / 2;
            const cy = (sr.top + sr.bottom) / 2;
            if (medianHeight && isMeasureNumberCandidate(el, sr, medianHeight)){
              const nearBar = barlineXs ? barlineXs.some(x => Math.abs(cx - x) <= boundaryTol) : false;
              if (nearBar) continue;
            }
            const insideCurrent = currentBound ? (cx >= currentBound.left - currentGuard && cx <= currentBound.right + currentGuard && cy >= currentBound.top - currentGuard && cy <= currentBound.bottom + currentGuard) : false;
            const insideNext = nextBound ? (cx >= nextBound.left - nextGuard && cx <= nextBound.right + nextGuard && cy >= nextBound.top - nextGuard && cy <= nextBound.bottom + nextGuard) : false;
            const elWidth = sr.right - sr.left;
            const elHeight = sr.bottom - sr.top;
            const minBarHeight = Math.max(14, measureH > 0 ? measureH * 0.12 : 18);
            const isVerticalLine = elWidth <= 3 && elHeight >= minBarHeight;
            const area = Math.max(1, elWidth * elHeight);
            let ratioCurrent = 0;
            let ratioNext = 0;
            if (currentScreen){
              const left = currentBound ? currentBound.left : currentScreen.left;
              const right = currentBound ? currentBound.right : currentScreen.right;
              const interX = Math.max(0, Math.min(sr.right, right) - Math.max(sr.left, left));
              const interY = Math.max(0, Math.min(sr.bottom, currentScreen.bottom) - Math.max(sr.top, currentScreen.top));
              ratioCurrent = (interX * interY) / area;
            }
            if (nextBound){
              const interX = Math.max(0, Math.min(sr.right, nextBound.right) - Math.max(sr.left, nextBound.left));
              const interY = Math.max(0, Math.min(sr.bottom, nextBound.bottom) - Math.max(sr.top, nextBound.top));
              ratioNext = (interX * interY) / area;
            }
            const nearNextLeft = nextBound && Math.abs(cx - nextBound.left) <= boundaryTol && cy >= nextBound.top - nextGuard && cy <= nextBound.bottom + nextGuard;
            const nearCurrentRight = currentBound && Math.abs(cx - currentBound.right) <= boundaryTol && cy >= currentBound.top - currentGuard && cy <= currentBound.bottom + currentGuard;
            const beyondNextStart = nextBound && cx >= nextBound.left - boundaryTol && cy >= nextBound.top - nextGuard && cy <= nextBound.bottom + nextGuard;
            if (isVerticalLine && nextBound && (nearNextLeft || nearCurrentRight)) continue;
            if (!insideCurrent && beyondNextStart) continue;
            if (!insideCurrent && (insideNext || ratioNext > ratioCurrent)) continue;
            if (!insideCurrent && ratioCurrent < 0.12) continue;
          }
        }
        if (el.dataset && !('challengeHidden' in el.dataset)){
          el.dataset.challengeHidden = el.style.display || '';
        }
        el.style.display = 'none';
        state.hiddenNodes.add(el);
        hid = true;
      }catch(_){}
    }
    const extraHidden = hideMeasureByIntersection(index);
    return hid || extraHidden;
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
    for (const el of state.hiddenNodes){
      if (!el) continue;
      try{
        if (el.dataset && Object.prototype.hasOwnProperty.call(el.dataset, 'challengeHidden')){
          el.style.display = el.dataset.challengeHidden;
          delete el.dataset.challengeHidden;
        } else {
          el.style.display = '';
        }
      }catch(_){}
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
      const y = m.y + m.height * 0.05;
      const height = state.cursorHeight ? Math.max(state.cursorHeight, m.height * 0.9) : Math.max(2, m.height * 0.9);
      const side = state.cursorWidth || Math.min(height, 16);
      const top = y + (height - side) / 2;
      positionCursorRect(x - side / 2, top, side, side);
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
    if (state.contentGroup && !state.contentGroup.isConnected) state.contentGroup = null;
    if (!state.contentGroup) state.contentGroup = findContentGroup();
    // 兼容：抓取所有顶层内容组（排除 defs 与 overlay）
    if (state.contentGroups && state.contentGroups.some(g => !g || !g.isConnected)) state.contentGroups = null;
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
    if (!state.hideEnabled) return;
    if (!state.measureRects || !state.measureRects.length) return;
    const idx = Math.max(-1, Math.min(lastHiddenIndex, state.measureRects.length - 1));
    if (idx < 0){
      restoreHiddenElements();
      if (state.hideOverlayEl && state.hideOverlayEl.parentNode){ state.hideOverlayEl.parentNode.removeChild(state.hideOverlayEl); }
      state.hideOverlayEl = null;
      if (state.hideLayerEl) { while (state.hideLayerEl.firstChild) state.hideLayerEl.removeChild(state.hideLayerEl.firstChild); }
      state.masked.clear();
      clearContentClip();
      return;
    }
    clearContentClip();
    for (let i = 0; i <= idx; i++){
      maskMeasure(i);
    }
  }

  function getElementScreenRect(el, svg){
    try{
      if (typeof el.getBBox === 'function' && typeof el.getScreenCTM === 'function'){
        const bbox = el.getBBox();
        const ctm = el.getScreenCTM();
        if (!bbox || !ctm || (bbox.width<=0 && bbox.height<=0)) return null;
        const pt = svg.createSVGPoint();
        const corners = [
          [bbox.x, bbox.y],
          [bbox.x + bbox.width, bbox.y],
          [bbox.x, bbox.y + bbox.height],
          [bbox.x + bbox.width, bbox.y + bbox.height]
        ];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x,y] of corners){
          pt.x=x; pt.y=y;
          const p = pt.matrixTransform(ctm);
          minX=Math.min(minX,p.x); minY=Math.min(minY,p.y);
          maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y);
        }
        const minSize = 0.5;
        if ((maxX - minX) < minSize){ minX -= minSize/2; maxX += minSize/2; }
        if ((maxY - minY) < minSize){ minY -= minSize/2; maxY += minSize/2; }
        return {left:minX, top:minY, right:maxX, bottom:maxY};
      }
    }catch(_){ }
    try{
      const r = el.getBoundingClientRect();
      if (r && (r.width>0 || r.height>0)) {
        const minSize = 0.5;
        let left = r.left, right = r.right, top = r.top, bottom = r.bottom;
        if (r.width < minSize){ left -= minSize/2; right += minSize/2; }
        if (r.height < minSize){ top -= minSize/2; bottom += minSize/2; }
        return {left, top, right, bottom};
      }
    }catch(_){ }
    return null;
  }

  function getNumericTextValue(el){
    if (!el || !el.tagName) return null;
    const tag = el.tagName.toLowerCase();
    if (tag !== 'text' && tag !== 'tspan') return null;
    const t = (el.textContent || '').trim();
    if (!/^\d+$/.test(t)) return null;
    return t;
  }

  function isMeasureNumberCandidate(el, sr, medianHeight){
    if (!medianHeight || !sr) return false;
    if (!getNumericTextValue(el)) return false;
    const h = sr.bottom - sr.top;
    return h > 0 && h <= medianHeight * 0.85;
  }

  function computeMeasureScreenBounds(svg){
    const svgCTM = svg.getScreenCTM();
    if (!svgCTM || !state.measureRects || !state.measureRects.length) return null;
    const toScreen = (x,y)=>{
      const pt = svg.createSVGPoint();
      pt.x = x; pt.y = y; return pt.matrixTransform(svgCTM);
    };
    const screens = state.measureRects.map(m=>{
      const p1 = toScreen(m.x, m.y);
      const p2 = toScreen(m.x + m.width, m.y + m.height);
      const left = Math.min(p1.x, p2.x), top = Math.min(p1.y, p2.y);
      const right = Math.max(p1.x, p2.x), bottom = Math.max(p1.y, p2.y);
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      return { left, top, right, bottom, cx, cy };
    });
    const inset = 1;
    const bounds = screens.map(r => {
      let left = r.left + inset;
      let right = r.right - inset;
      if (right <= left){
        left = r.left;
        right = r.right;
      }
      return { left, right, top: r.top, bottom: r.bottom };
    });
    let barBounds = null;
    let barlineAdjusted = false;
    const heights = screens.map(r => r.bottom - r.top).filter(h => h > 0);
    const rowHeight = heights.length ? heights.sort((a,b)=>a-b)[Math.floor(heights.length/2)] : 0;
    const barlines = [];
    const lineEls = Array.from(svg.querySelectorAll('line'));
    const verticalHeights = [];
    for (const el of lineEls){
      const sr = getElementScreenRect(el, svg);
      if (!sr) continue;
      const w = sr.right - sr.left;
      const h = sr.bottom - sr.top;
      if (w <= 3 && h > 0) verticalHeights.push(h);
    }
    let minBarHeight = Math.max(14, rowHeight > 0 ? rowHeight * 0.12 : 18);
    if (verticalHeights.length){
      verticalHeights.sort((a,b)=>a-b);
      const p80 = verticalHeights[Math.max(0, Math.floor((verticalHeights.length - 1) * 0.8))];
      minBarHeight = Math.max(minBarHeight, p80 * 0.7);
    }
    for (const el of lineEls){
      const sr = getElementScreenRect(el, svg);
      if (!sr) continue;
      const w = sr.right - sr.left;
      const h = sr.bottom - sr.top;
      if (w <= 3 && h >= minBarHeight){
        barlines.push({ x: (sr.left + sr.right) / 2, top: sr.top, bottom: sr.bottom });
      }
    }
    if (barlines.length){
      const epsY = 6;
      const rows = [];
      screens.forEach((r, idx) => {
        let row = rows.find(g => Math.abs(g.cy - r.cy) < epsY);
        if (!row){
          row = { cy: r.cy, indices: [], top: r.top, bottom: r.bottom };
          rows.push(row);
        }
        row.indices.push(idx);
        row.top = Math.min(row.top, r.top);
        row.bottom = Math.max(row.bottom, r.bottom);
      });
      rows.forEach(row => {
        row.indices.sort((a,b)=> screens[a].left - screens[b].left);
        const rowBars = barlines
          .filter(b => b.bottom >= row.top - 2 && b.top <= row.bottom + 2)
          .sort((a,b)=>a.x-b.x);
        if (rowBars.length < 2) return;
        let barIdx = 0;
        const tol = 2;
        for (const idx of row.indices){
          const m = screens[idx];
          while (barIdx + 1 < rowBars.length && rowBars[barIdx + 1].x <= m.left + tol){
            barIdx += 1;
          }
          const left = rowBars[barIdx].x + 0.5;
          const right = rowBars[barIdx + 1] ? rowBars[barIdx + 1].x - 0.5 : m.right;
          if (right > left){
            bounds[idx] = { left, right, top: m.top, bottom: m.bottom };
            barlineAdjusted = true;
          }
        }
      });
    }
    if (barlineAdjusted){
      barBounds = bounds.map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
    }
    const noteBounds = state.noteEvents && state.noteEvents.length ? state.measureRects.map(()=>({ min: Infinity, max: -Infinity })) : null;
    if (noteBounds){
      for (const ev of state.noteEvents){
        if (!isFinite(ev.x)) continue;
        const mi = ev.measureIndex != null ? ev.measureIndex : ev.measure;
        if (mi == null || mi < 0 || mi >= noteBounds.length) continue;
        const pt = toScreen(ev.x, state.measureRects[mi].y);
        if (!pt) continue;
        noteBounds[mi].min = Math.min(noteBounds[mi].min, pt.x);
        noteBounds[mi].max = Math.max(noteBounds[mi].max, pt.x);
      }
    }
    if (noteBounds && !barlineAdjusted){
      const epsY = 6;
      const rows = [];
      screens.forEach((r, idx) => {
        let row = rows.find(g => Math.abs(g.cy - r.cy) < epsY);
        if (!row){
          row = { cy: r.cy, indices: [] };
          rows.push(row);
        }
        row.indices.push(idx);
      });
      rows.forEach(row => {
        row.indices.sort((a,b)=> screens[a].left - screens[b].left);
        for (let i=0;i<row.indices.length;i++){
          const idx = row.indices[i];
          let left = bounds[idx].left;
          let right = bounds[idx].right;
          const prevIdx = i > 0 ? row.indices[i-1] : null;
          const nextIdx = i < row.indices.length - 1 ? row.indices[i+1] : null;
          if (prevIdx != null && isFinite(noteBounds[prevIdx].max)){
            left = Math.max(left, noteBounds[prevIdx].max + 6);
          }
          if (nextIdx != null && isFinite(noteBounds[nextIdx].min)){
            right = Math.min(right, noteBounds[nextIdx].min - 6);
          }
          if (right > left){
            bounds[idx] = { left, right, top: bounds[idx].top, bottom: bounds[idx].bottom };
          }
        }
      });
    }
    let textMedianHeight = state.textMedianHeight;
    if (!textMedianHeight && svg){
      const heights = [];
      const textEls = Array.from(svg.querySelectorAll('text'));
      for (const el of textEls){
        if (!getNumericTextValue(el)) continue;
        const sr = getElementScreenRect(el, svg);
        if (!sr) continue;
        const h = sr.bottom - sr.top;
        if (h > 0) heights.push(h);
      }
      if (!heights.length){
        for (const el of textEls){
          const sr = getElementScreenRect(el, svg);
          if (!sr) continue;
          const h = sr.bottom - sr.top;
          if (h > 0) heights.push(h);
        }
      }
      if (heights.length){
        heights.sort((a,b)=>a-b);
        textMedianHeight = heights[Math.floor(heights.length * 0.5)];
        if (isFinite(textMedianHeight) && textMedianHeight > 0){
          state.textMedianHeight = textMedianHeight;
        }
      }
    }
    return { screens, bounds, barBounds, textMedianHeight };
  }

  // Build a precise element index: group SVG drawable elements by measure (between barlines)
  function buildMeasureElementIndex(){
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects.length) return [];
    const overlayG = svg.querySelector('#challengeOverlayG');
    const boundsInfo = computeMeasureScreenBounds(svg);
    if (!boundsInfo) return [];
    const measureScreens = boundsInfo.screens;
    const bounds = boundsInfo.bounds;
    const guardBounds = boundsInfo.barBounds || boundsInfo.bounds;
    if (boundsInfo.textMedianHeight && !state.textMedianHeight) state.textMedianHeight = boundsInfo.textMedianHeight;
    const buckets = state.measureRects.map(()=>[]);
    const candidates = svg.querySelectorAll('path, line, rect, circle, ellipse, polygon, polyline, text, use');
    const isOverlay = (el)=> overlayG && (overlayG === el || overlayG.contains(el));
    const maxMeasureWidth = measureScreens.reduce((m, r)=> Math.max(m, r.right - r.left), 0);
    const maxMeasureHeight = measureScreens.reduce((m, r)=> Math.max(m, r.bottom - r.top), 0);
    const maxAllowedWidth = maxMeasureWidth * 1.25;
    const maxAllowedHeight = maxMeasureHeight * 1.25;
    const boundaryTol = 4;
    for (const el of candidates){
      if (isOverlay(el)) continue;
      const sr = getElementScreenRect(el, svg);
      if (!sr) continue;
      const elWidth = sr.right - sr.left;
      const elHeight = sr.bottom - sr.top;
      if (elWidth > maxAllowedWidth || elHeight > maxAllowedHeight) continue;
      const isThin = elWidth <= 2 || elHeight <= 2;
      const isVerticalLine = elWidth <= 2 && elHeight >= maxMeasureHeight * 0.35;
      if (isVerticalLine){
        const x = (sr.left + sr.right) / 2;
        let bestIdx = -1;
        let bestSide = 'left';
        let bestDist = Infinity;
        for (let i=0;i<measureScreens.length;i++){
          const mr = measureScreens[i];
          const dl = Math.abs(x - mr.left);
          if (dl < bestDist){
            bestDist = dl;
            bestIdx = i;
            bestSide = 'left';
          }
          const dr = Math.abs(x - mr.right);
          if (dr < bestDist){
            bestDist = dr;
            bestIdx = i;
            bestSide = 'right';
          }
        }
        if (bestIdx >= 0){
          const target = (bestSide === 'right' && bestIdx + 1 < measureScreens.length) ? bestIdx + 1 : bestIdx;
          buckets[target].push(el);
          continue;
        }
      }
      const cx = (sr.left + sr.right)/2;
      const cy = (sr.top + sr.bottom)/2;
      if (guardBounds && isMeasureNumberCandidate(el, sr, state.textMedianHeight)){
        let nearIdx = -1;
        let nearDist = Infinity;
        for (let i=0;i<guardBounds.length;i++){
          const br = guardBounds[i];
          const mr = measureScreens[i];
          if (cy < mr.top || cy > mr.bottom) continue;
          const d = Math.abs(cx - br.left);
          if (d < nearDist){
            nearDist = d;
            nearIdx = i;
          }
        }
        if (nearIdx >= 0 && nearDist <= boundaryTol){
          buckets[nearIdx].push(el);
          continue;
        }
      }
      // assign by center inside guard bounds first
      let bestIdx = -1;
      let bestDist = Infinity;
      if (guardBounds){
        for (let i=0;i<measureScreens.length;i++){
          const mr = measureScreens[i];
          const br = guardBounds[i];
          if (cy < mr.top || cy > mr.bottom) continue;
          if (cx < br.left || cx > br.right) continue;
          const d = Math.abs(cx - mr.cx);
          if (d < bestDist){
            bestDist = d;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0){
          buckets[bestIdx].push(el);
          continue;
        }
      }
      // assign by max intersection ratio against guarded bounds
      bestIdx = -1;
      let bestRatio = 0;
      const area = Math.max(1, elWidth * elHeight);
      for (let i=0;i<measureScreens.length;i++){
        const mr = measureScreens[i];
        const br = guardBounds ? guardBounds[i] : bounds[i];
        const left = br.left;
        const right = br.right;
        const top = mr.top;
        const bottom = mr.bottom;
        const interX = Math.max(0, Math.min(sr.right, right) - Math.max(sr.left, left));
        const interY = Math.max(0, Math.min(sr.bottom, bottom) - Math.max(sr.top, top));
        if (interX <= 0 || interY <= 0) continue;
        const ratio = (interX * interY) / area;
        if (ratio > bestRatio){
          bestRatio = ratio;
          bestIdx = i;
        }
      }
      const minRatio = isThin ? 0.16 : 0.1;
      if (bestIdx >= 0 && bestRatio >= minRatio){
        buckets[bestIdx].push(el);
      }
    }
    return buckets;
  }

  function scheduleBucketRebuild(){
    if (state.bucketRebuildId) return;
    state.bucketRebuildId = setTimeout(() => {
      state.bucketRebuildId = null;
      if (!state.active) return;
      state.textMedianHeight = null;
      state.measureBuckets = buildMeasureElementIndex();
      if (state.hideEnabled && state.masked && state.masked.size){
        for (const idx of state.masked){
          hideMeasureBucket(idx);
        }
      }
    }, 60);
  }

  function hideMeasureByIntersection(index){
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects[index]) return;
    const overlayG = svg.querySelector('#challengeOverlayG');
    const boundsInfo = computeMeasureScreenBounds(svg);
    if (!boundsInfo) return;
    const guardBounds = boundsInfo.barBounds || boundsInfo.bounds;
    const nextBound = guardBounds ? guardBounds[index + 1] : null;
    const currentBound = guardBounds ? guardBounds[index] : null;
    const currentScreen = boundsInfo.screens ? boundsInfo.screens[index] : null;
    const nextGuard = 2;
    const currentGuard = 2;
    const screen = boundsInfo.screens[index];
    const bound = currentBound || boundsInfo.bounds[index];
    const medianHeight = boundsInfo.textMedianHeight || state.textMedianHeight;
    const barlineXs = guardBounds ? guardBounds.map(b => b.left) : null;
    const mLeft = screen.left;
    const mTop = screen.top;
    const mRight = screen.right;
    const mBottom = screen.bottom;
    const bLeft = bound.left;
    const bRight = bound.right;
    const measureW = mRight - mLeft;
    const measureH = mBottom - mTop;
    const maxAllowedWidth = measureW * 1.35;
    const maxAllowedHeight = measureH * 1.35;
    const candidates = svg.querySelectorAll('path, line, rect, circle, ellipse, polygon, polyline, text, use');
    let hid = false;
    for (const el of candidates){
      if (el.id === 'challengeCursor') continue;
      if (overlayG && (overlayG === el || overlayG.contains(el))) continue;
      if (el.style && el.style.display === 'none') continue;
      const sr = getElementScreenRect(el, svg);
      if (!sr) continue;
      const elWidth = sr.right - sr.left;
      const elHeight = sr.bottom - sr.top;
      if (elWidth > maxAllowedWidth || elHeight > maxAllowedHeight) continue;
      const cx = (sr.left + sr.right) / 2;
      const cy = (sr.top + sr.bottom) / 2;
      if (medianHeight && isMeasureNumberCandidate(el, sr, medianHeight)){
        const nearBar = barlineXs ? barlineXs.some(x => Math.abs(cx - x) <= 4) : false;
        if (nearBar) continue;
      }
      const insideCurrent = currentBound ? (cx >= currentBound.left - currentGuard && cx <= currentBound.right + currentGuard && cy >= currentBound.top - currentGuard && cy <= currentBound.bottom + currentGuard) : false;
      const insideNext = nextBound ? (cx >= nextBound.left - nextGuard && cx <= nextBound.right + nextGuard && cy >= nextBound.top - nextGuard && cy <= nextBound.bottom + nextGuard) : false;
      const beyondNextStart = nextBound && cx >= nextBound.left - 4 && cy >= nextBound.top - nextGuard && cy <= nextBound.bottom + nextGuard;
      if (!insideCurrent && (insideNext || beyondNextStart)) continue;
      const minBarHeight = Math.max(14, measureH > 0 ? measureH * 0.12 : 18);
      const isVerticalLine = elWidth <= 3 && elHeight >= minBarHeight;
      if (isVerticalLine){
        const boundaryTol = 4;
        const nearNextLeft = nextBound && Math.abs(cx - nextBound.left) <= boundaryTol && cy >= nextBound.top - nextGuard && cy <= nextBound.bottom + nextGuard;
        const nearCurrentRight = currentBound && Math.abs(cx - currentBound.right) <= boundaryTol && cy >= currentBound.top - currentGuard && cy <= currentBound.bottom + currentGuard;
        if (nextBound && (nearNextLeft || nearCurrentRight)) continue;
        continue;
      }
      const centerInside = cx >= bLeft && cx <= bRight && cy >= mTop && cy <= mBottom;
      const interX = Math.max(0, Math.min(sr.right, bRight) - Math.max(sr.left, bLeft));
      const interY = Math.max(0, Math.min(sr.bottom, mBottom) - Math.max(sr.top, mTop));
      if (interX <= 0 || interY <= 0) continue;
      const area = Math.max(1, elWidth * elHeight);
      const ratio = (interX * interY) / area;
      let ratioNext = 0;
      if (nextBound){
        const nx = Math.max(0, Math.min(sr.right, nextBound.right) - Math.max(sr.left, nextBound.left));
        const ny = Math.max(0, Math.min(sr.bottom, nextBound.bottom) - Math.max(sr.top, nextBound.top));
        ratioNext = (nx * ny) / area;
      }
      const isThin = elWidth <= 2 || elHeight <= 2;
      if (!centerInside && ratio < (isThin ? 0.08 : 0.12)) continue;
      if (ratioNext > ratio && ratioNext > 0.2) continue;
      const keep = ratio >= 0.1 || isThin;
      if (keep){
        try{
          if (el.dataset && !('challengeHidden' in el.dataset)){
            el.dataset.challengeHidden = el.style.display || '';
          }
          el.style.display = 'none';
          state.hiddenNodes.add(el);
          hid = true;
        }catch(_){}
      }
    }
    return hid;
  }

  function getTimeSignatureInfo(){
    let beats = 4;
    let den = 4;
    const xml = getCurrentMelodyXML();
    const ts = xml ? parseTimeSigFromXML(xml) : null;
    if (ts){
      beats = ts.num;
      den = ts.den;
    } else {
      const tsStr = getCurrentTimeSignature();
      const parts = String(tsStr || '4/4').split('/');
      beats = parseInt(parts[0] || '4', 10);
      den = parseInt(parts[1] || '4', 10);
    }
    if (!isFinite(beats) || !isFinite(den) || beats <= 0 || den <= 0){
      beats = 4;
      den = 4;
    }
    const is68 = beats === 6 && den === 8;
    return { beats, den, is68 };
  }

  function removeCountInLabel(){
    const label = document.getElementById('challengeCountInLabel');
    if (label && label.parentNode) label.parentNode.removeChild(label);
  }

  function createCountInLabel(){
    removeCountInLabel();
    if (!scoreEl) return null;
    const label = document.createElement('div');
    label.id = 'challengeCountInLabel';
    label.style.position = 'absolute';
    label.style.top = '8px';
    label.style.left = '50%';
    label.style.transform = 'translateX(-50%)';
    label.style.fontSize = '18px';
    label.style.fontWeight = '700';
    label.style.color = 'var(--text-color)';
    label.style.background = 'rgba(0,0,0,0.05)';
    label.style.padding = '4px 10px';
    label.style.borderRadius = '999px';
    label.style.backdropFilter = 'blur(2px)';
    scoreEl.appendChild(label);
    return label;
  }

  function startCountIn(bpm){
    const tsInfo = getTimeSignatureInfo();
    const beats = tsInfo.beats;
    const denVal = tsInfo.den;
    const beatSec = (60/Math.max(1,bpm)) * (4/denVal);
    const beatMs = beatSec * 1000;
    state.beatsPerMeasure = beats;
    state.measureDuration = beats * beatSec;
    ensureOverlay();
    if (state.cursorEl) state.cursorEl.style.display = 'none';
    const first = state.measureRects[0];
    if (first && state.cursorEl){
      const startX = first.x;
      const y = first.y + first.height * 0.05;
      const height = state.cursorHeight ? Math.max(state.cursorHeight, first.height * 0.9) : Math.max(2, first.height * 0.9);
      const side = state.cursorWidth || Math.min(height, 16);
      const top = y + (height - side) / 2;
      positionCursorRect(startX - side / 2, top, side, side);
    }
    const label = createCountInLabel();
    let i = 0;
    function strongBeat(n){
      if (tsInfo.is68) return n === 1 || n === 4;
      return n === 1;
    }
    function finishCountIn(anchorPerf){
      if (state.countInTimerId) { clearTimeout(state.countInTimerId); state.countInTimerId = null; }
      if (!state.active) return;
      const removeDelay = Math.max(0, anchorPerf - performance.now());
      const removeLabel = () => {
        removeCountInLabel();
        if (state.cursorEl) state.cursorEl.style.display = 'none';
      };
      if (removeDelay <= 16){
        removeLabel();
      } else {
        state.countInTimerId = setTimeout(removeLabel, removeDelay);
      }
      state.anchorAcTime = null;
      state.anchorPerf = null;
      state.anchorPerfStart = anchorPerf;
      if (state.metronomeEnabled){
        startChallengeMetronome(bpm, anchorPerf);
      }
      try { startJumpCursor(bpm); } catch(_) {}
    }
    function tick(targetTimeMs){
      ensureClickAudio();
      i += 1;
      const beatNum = i > beats ? beats : i;
      state.lastBeatTimeMs = targetTimeMs;
      playClick(strongBeat(beatNum));
      if (label) label.textContent = String(beatNum);
      if (i >= beats){
        finishCountIn(targetTimeMs + beatMs);
      }
    }
    const delayMs = Math.max(0, state.nextCountInDelayMs || 0);
    state.nextCountInDelayMs = 0;
    const startPerf = performance.now() + delayMs;
    function scheduleNext(){
      if (!state.active) return;
      const target = startPerf + i * beatMs;
      const delay = Math.max(0, target - performance.now());
      state.countInTimerId = setTimeout(() => {
        if (!state.active) return;
        tick(target);
        if (i < beats) scheduleNext();
      }, delay);
    }
    scheduleNext();
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

  function durationToQuarterSimple(duration){
    const d = String(duration || '').toLowerCase();
    if (d.includes('whole')) return 4;
    if (d.includes('half')) return 2;
    if (d.includes('quarter')) return 1;
    if (d.includes('eighth')) return 0.5;
    if (d.includes('16th') || d.includes('sixteenth')) return 0.25;
    if (d.includes('32nd') || d.includes('thirty')) return 0.125;
    if (d.includes('64th')) return 0.0625;
    return 1;
  }

  function parseTimelineFromMelodyData(){
    try{
      const md = window.lastRenderedMelody;
      if (!md || !Array.isArray(md.melody)) return null;
      const tsStr = md.config?.timeSignature || '4/4';
      const parts = String(tsStr).split('/');
      let beatsNum = parseInt(parts[0] || '4', 10);
      let beatType = parseInt(parts[1] || '4', 10);
      if (!isFinite(beatsNum) || !isFinite(beatType) || beatsNum <= 0 || beatType <= 0){
        beatsNum = 4; beatType = 4;
      }
      const events = [];
      const measureStarts = [];
      const measureTotals = [];
      const noteSlotsByMeasure = [];
      let absQN = 0;
      const measures = md.melody || [];
      const globalNotes = [];
      const noteToGlobalIndex = new Map();
      for (const m of measures){
        const ns = Array.isArray(m && m.notes) ? m.notes : [];
        for (const n of ns){
          noteToGlobalIndex.set(n, globalNotes.length);
          globalNotes.push(n);
        }
      }
      const getTieTypeBasic = (note) => {
        if (note && note.tieType) return note.tieType;
        if (note && typeof note.tie === 'string' && note.tie !== 'none') return note.tie;
        if (note && note.tied && note.tieInfo){
          const info = note.tieInfo || {};
          if (info.isStart && info.isStop) return 'continue';
          if (info.isStart) return 'start';
          if (info.isStop) return 'stop';
        }
        return null;
      };
      const inferTieType = (notes, idx) => {
        const note = notes[idx];
        const explicit = getTieTypeBasic(note);
        if (explicit) return explicit;
        const tiedFlag = note && (note.tied === true || note.tie === true);
        if (!tiedFlag) return null;
        const midi = note ? note.midi : undefined;
        const gidx = noteToGlobalIndex.get(note);
        const prev = (gidx != null && gidx > 0) ? globalNotes[gidx - 1] : notes[idx - 1];
        const next = (gidx != null && gidx < globalNotes.length - 1) ? globalNotes[gidx + 1] : notes[idx + 1];
        const prevTied = prev && prev.type === 'note' && prev.midi === midi &&
          (getTieTypeBasic(prev) || prev.tied === true || prev.tie === true);
        const nextTied = next && next.type === 'note' && next.midi === midi &&
          (getTieTypeBasic(next) || next.tied === true || next.tie === true);
        if (prevTied && nextTied) return 'continue';
        if (prevTied) return 'stop';
        if (nextTied) return 'start';
        return null;
      };
      for (let mi=0; mi<measures.length; mi++){
        const measure = measures[mi] || {};
        const notes = Array.isArray(measure.notes) ? measure.notes : [];
        const measureTotalQN = beatsNum * (4/beatType);
        measureStarts.push(absQN);
        measureTotals.push(measureTotalQN);
        let pos = 0;
        const noteSlots = [];
        for (let ni=0; ni<notes.length; ni++){
          const n = notes[ni] || {};
          const beats = (typeof n.beats === 'number' && isFinite(n.beats)) ? n.beats : durationToQuarterSimple(n.duration);
          if (n.type === 'note'){
            const noteIndex = noteSlots.length;
            const tieType = inferTieType(notes, ni);
            noteSlots.push({ tieType, tied: n.tied, midi: n.midi, posBeats: pos });
            const isTieStart = tieType === 'start';
            const isTieContinue = tieType === 'continue' || tieType === 'stop';
            if (!isTieContinue){
              let dur = beats;
              if (isTieStart){
                for (let j = ni + 1; j < notes.length; j++){
                  const nn = notes[j] || {};
                  const nnBeats = (typeof nn.beats === 'number' && isFinite(nn.beats)) ? nn.beats : durationToQuarterSimple(nn.duration);
                  if (nn.type !== 'note') break;
                  const nnTie = inferTieType(notes, j);
                  const nnIsCont = nnTie === 'continue' || nnTie === 'stop';
                  if (!nnIsCont) break;
                  if (typeof n.midi === 'number' && typeof nn.midi === 'number' && n.midi !== nn.midi) break;
                  dur += nnBeats;
                  if (nnTie === 'stop') break;
                }
              }
              events.push({ measure: mi, posBeats: pos, absBeats: absQN + pos, durBeats: dur, isRest: false, noteIndex });
            }
          }
          pos += beats;
        }
        noteSlotsByMeasure.push(noteSlots);
        absQN += measureTotalQN;
      }
      return { events, measureStarts, measureTotals, tieStops: [], noteSlotsByMeasure };
    } catch(_){
      return null;
    }
  }

  // ===== 跳停式光标：解析时间线 =====
  function parseTimelineFromXML(){
    try{
      const melodyTimeline = parseTimelineFromMelodyData();
      if (melodyTimeline && melodyTimeline.events && melodyTimeline.events.length){
        return melodyTimeline;
      }
      const xml = getCurrentMelodyXML();
      if (!xml) return { events: [], measureStarts: [], measureTotals: [] };
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const part = doc.querySelector('part');
      if (!part) return { events: [], measureStarts: [], measureTotals: [] };
      const measures = Array.from(part.querySelectorAll('measure'));
      let divisions = 1;
      let beatsNum = 4, beatType = 4;
      const events = [];
      const tieStops = [];
      const measureStarts = [];
      const measureTotals = [];
      let absQN = 0; // 四分音符为单位的绝对时间
      // 跨小节tie累积
      let tieOpen = false; let tieDurDiv = 0; let tieIsRest = false; let tieStartAbsQN = 0; let tieStartMeasure = 0; let tieStartPosBeats = 0;
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
            if (!tieOpen){ tieOpen = true; tieDurDiv = durDiv; tieIsRest = isRest; tieStartAbsQN = startQNAbs; tieStartMeasure = mi; tieStartPosBeats = startQNInMeasure; }
            else { tieDurDiv += durDiv; }
          } else if (hasStop && tieOpen){
            tieStops.push({ measure: mi, posBeats: startQNInMeasure });
            tieDurDiv += durDiv;
            const durQNsum = tieDurDiv / divisions;
            events.push({ measure: tieStartMeasure, posBeats: tieStartPosBeats, absBeats: tieStartAbsQN, durBeats: durQNsum, isRest: tieIsRest });
            tieOpen = false; tieDurDiv = 0; tieIsRest = false; tieStartMeasure = 0; tieStartPosBeats = 0;
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
      return { events, measureStarts, measureTotals, tieStops };
    } catch(_){ return { events: [], measureStarts: [], measureTotals: [], tieStops: [] }; }
  }

  function collectIndexedNoteRects(){
    const out = [];
    const svg = scoreEl.querySelector('svg');
    if (!svg) return out;
    const svgBBox = svg.getBoundingClientRect();
    const nodes = Array.from(svg.querySelectorAll('[note-index]'));
    if (!nodes.length) return out;
    const measures = state.measureRects || [];
    const findMeasureIndex = (cx, cy) => {
      for (let i=0; i<measures.length; i++){
        const m = measures[i];
        if (!m) continue;
        if (cx >= m.x - 1 && cx <= m.x + m.width + 1 && cy >= m.y - 1 && cy <= m.y + m.height + 1) return i;
      }
      return -1;
    };
    nodes.forEach(node => {
      const dataStr = node.getAttribute('note-data');
      if (!dataStr) return;
      let data = null;
      try { data = JSON.parse(dataStr); } catch(_) { data = null; }
      if (!data) return;
      const noteVal = data.note;
      const noteData = data.noteData || '';
      const isDash = noteVal === '-' || noteData === '-' || noteData === '--';
      const isRest = noteVal === '0' || noteVal === 0 || data.isRest;
      const isTieEnd = !!data.isTieEnd && !data.isTieStart;
      if (isDash || isRest || isTieEnd) return;
      const r = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (!r || (r.width <= 0 && r.height <= 0)) return;
      const left = r.left - svgBBox.left;
      const top = r.top - svgBBox.top;
      const cx = left + r.width / 2;
      const cy = top + r.height / 2;
      const idxNum = Number(data.index);
      const idx = Number.isFinite(idxNum) ? idxNum : out.length;
      out.push({
        index: idx,
        x: cx,
        y: cy,
        width: r.width,
        height: r.height,
        measureIndex: findMeasureIndex(cx, cy)
      });
    });
    out.sort((a,b)=> a.index - b.index);
    return out;
  }

  function computeMeasureClipRects(){
    const rects = state.measureRects || [];
    if (!rects.length) return rects;
    const svg = scoreEl.querySelector('svg');
    if (!svg) return rects;
    const svgBBox = svg.getBoundingClientRect();
    const nodes = Array.from(svg.querySelectorAll('[note-index]'));
    if (!nodes.length) return rects;
    const boxes = nodes.map(node => {
      const r = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (!r || (r.width <= 0 && r.height <= 0)) return null;
      const left = r.left - svgBBox.left;
      const top = r.top - svgBBox.top;
      return {
        left,
        right: left + r.width,
        top,
        bottom: top + r.height,
        cx: left + r.width / 2,
        cy: top + r.height / 2
      };
    }).filter(Boolean);
    if (!boxes.length) return rects;
    const padY = 6;
    return rects.map(m => {
      const inMeasure = boxes.filter(b => b.cx >= m.x && b.cx <= m.x + m.width && b.cy >= m.y && b.cy <= m.y + m.height);
      if (!inMeasure.length) return m;
      const minY = Math.min(m.y, ...inMeasure.map(b => b.top));
      const maxY = Math.max(m.y + m.height, ...inMeasure.map(b => b.bottom));
      return {
        x: m.x,
        y: Math.max(0, minY - padY),
        width: m.width,
        height: (maxY - minY) + padY * 2
      };
    });
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
      const globalHeads = collectNoteheadCentersGlobal();
      const tieStops = (timeline && timeline.tieStops && timeline.tieStops.length) ? timeline.tieStops : [];
      const noteSlotsByMeasure = (timeline && timeline.noteSlotsByMeasure && timeline.noteSlotsByMeasure.length) ? timeline.noteSlotsByMeasure : null;
      const defaultPerMeasure = (function(){
        const xml = getCurrentMelodyXML();
        const ts = xml ? parseTimeSigFromXML(xml) : null;
        return (ts ? ts.num : 4) * (4/(ts ? ts.den : 4));
      })();
      const noteEventsAll = mapped.filter(e => !e.isRest);
      const indexedNotes = collectIndexedNoteRects();
      if (indexedNotes.length && indexedNotes.length === noteEventsAll.length){
        const sortedEvents = noteEventsAll.slice().sort((a,b)=> (a.absBeats - b.absBeats) || (a.measure - b.measure) || (a.posBeats - b.posBeats));
        for (let i=0; i<sortedEvents.length; i++){
          const head = indexedNotes[i];
          const side = Math.max(2, Math.max(head.width, head.height));
          sortedEvents[i].x = head.x;
          sortedEvents[i].cursorSize = side;
          sortedEvents[i].top = head.y - (side / 2);
          sortedEvents[i].height = side;
        }
        return { events: mapped, measureTotals: measureTotals || [], measureStarts: (timeline && timeline.measureStarts) ? timeline.measureStarts : [] };
      }
      if (globalHeads.length && globalHeads.length === noteEventsAll.length){
        const sortedEvents = noteEventsAll.slice().sort((a,b)=> (a.absBeats - b.absBeats) || (a.measure - b.measure) || (a.posBeats - b.posBeats));
        for (let i=0; i<sortedEvents.length; i++){
          const head = globalHeads[i];
          const side = Math.max(2, Math.max(head.width, head.height));
          sortedEvents[i].x = head.x;
          sortedEvents[i].cursorSize = side;
          sortedEvents[i].top = head.y - (side / 2);
          sortedEvents[i].height = side;
        }
        return { events: mapped, measureTotals: measureTotals || [], measureStarts: (timeline && timeline.measureStarts) ? timeline.measureStarts : [] };
      }
      if (!noteSlotsByMeasure && tieStops.length){
        const tieByMeasure = new Map();
        for (const ts of tieStops){
          const arr = tieByMeasure.get(ts.measure) || [];
          arr.push(ts);
          tieByMeasure.set(ts.measure, arr);
        }
        for (const [mIndex, stops] of tieByMeasure.entries()){
          const heads = headMap.get(mIndex) || [];
          if (!heads.length) continue;
          const mr = state.measureRects[mIndex];
          if (!mr) continue;
          const perMeas = (measureTotals && measureTotals[mIndex] != null) ? measureTotals[mIndex] : defaultPerMeasure;
          const filtered = heads.slice();
          let tol = 16;
          const xs = filtered.map(h => h.x).sort((a,b)=>a-b);
          if (xs.length >= 2){
            const gaps = [];
            for (let i=1;i<xs.length;i++) gaps.push(xs[i] - xs[i-1]);
            gaps.sort((a,b)=>a-b);
            const mid = Math.floor(gaps.length/2);
            const medianGap = gaps[mid];
            if (isFinite(medianGap) && medianGap > 0) tol = Math.max(tol, medianGap * 0.45);
          }
          const orderedStops = stops.slice().sort((a,b)=>a.posBeats - b.posBeats);
          let startIdx = 0;
          orderedStops.forEach(stop => {
            const frac = Math.max(0, Math.min(1, stop.posBeats / Math.max(0.0001, perMeas)));
            const targetX = mr.x + frac * mr.width;
            let bestIdx = -1;
            let bestDist = Infinity;
            for (let i=startIdx; i<filtered.length; i++){
              const d = Math.abs(filtered[i].x - targetX);
              if (d < bestDist){
                bestDist = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0 && bestDist <= tol){
              filtered.splice(bestIdx, 1);
              startIdx = bestIdx;
            }
          });
          headMap.set(mIndex, filtered);
        }
      }
      const eventsByMeasure = new Map();
      for (const ev of mapped){
        const arr = eventsByMeasure.get(ev.measure) || [];
        arr.push(ev);
        eventsByMeasure.set(ev.measure, arr);
      }
      for (const [mIndex, evs] of eventsByMeasure.entries()){
        const heads = headMap.get(mIndex) || [];
        if (!heads.length) continue;
        const perMeas = (measureTotals && measureTotals[mIndex] != null) ? measureTotals[mIndex] : defaultPerMeasure;
        const noteEvents = evs.filter(e => !e.isRest);
        if (!noteEvents.length) continue;
        let headStart = 0;
        const ys = heads.map(h => h.y).sort((a,b)=>a-b);
        const sizes = heads.map(h => Math.max(h.width, h.height)).sort((a,b)=>a-b);
        const mid = Math.floor(ys.length/2);
        const fallbackY = ys.length ? ys[mid] : null;
        const fallbackSize = sizes.length ? Math.max(2, sizes[mid]) : null;
        const slots = noteSlotsByMeasure ? noteSlotsByMeasure[mIndex] : null;
        if (slots && heads.length >= slots.length){
          const slotHeads = [];
          for (let i=0; i<slots.length; i++){
            slotHeads[i] = heads[i];
          }
          for (const ev of noteEvents){
            if (typeof ev.noteIndex === 'number' && slotHeads[ev.noteIndex]){
              const head = slotHeads[ev.noteIndex];
              const side = Math.max(2, Math.max(head.width, head.height));
              ev.x = head.x;
              ev.cursorSize = side;
              ev.top = head.y - (side / 2);
              ev.height = side;
            }
          }
        } else if (heads.length === noteEvents.length){
          for (let i=0; i<noteEvents.length; i++){
            const ev = noteEvents[i];
            const head = heads[i];
            const side = Math.max(2, Math.max(head.width, head.height));
            ev.x = head.x;
            ev.cursorSize = side;
            ev.top = head.y - (side / 2);
            ev.height = side;
          }
        } else {
          let snapTol = Math.max(12, state.measureRects[mIndex].width * 0.05);
          if (heads.length >= 2){
            const xs = heads.map(h => h.x).sort((a,b)=>a-b);
            const gaps = [];
            for (let i=1;i<xs.length;i++) gaps.push(xs[i] - xs[i-1]);
            gaps.sort((a,b)=>a-b);
            const mg = gaps[Math.floor(gaps.length/2)];
            if (isFinite(mg) && mg > 0) snapTol = Math.max(snapTol, mg * 0.7);
          }
          for (const ev of noteEvents){
            const targetX = state.measureRects[mIndex].x + Math.max(0, Math.min(1, ev.posBeats/Math.max(0.0001, perMeas))) * state.measureRects[mIndex].width;
            if (headStart >= heads.length) { ev.x = targetX; continue; }
            let bestHead = null;
            let bestIdx = -1;
            let bestDist = Infinity;
            for (let h = headStart; h < heads.length; h++){
              const head = heads[h];
              const d = Math.abs(head.x - targetX);
              if (d < bestDist){
                bestDist = d;
                bestHead = head;
                bestIdx = h;
              }
            }
            if (!bestHead || bestDist > snapTol){
              ev.x = targetX;
              if (fallbackY != null && fallbackSize != null){
                ev.cursorSize = fallbackSize;
                ev.top = fallbackY - (fallbackSize / 2);
                ev.height = fallbackSize;
              }
              continue;
            }
            headStart = Math.max(headStart, bestIdx + 1);
            const side = Math.max(2, Math.max(bestHead.width, bestHead.height));
            ev.x = bestHead.x;
            ev.cursorSize = side;
            ev.top = bestHead.y - (side / 2);
            ev.height = side;
          }
        }
        for (const ev of noteEvents){
          if (!isFinite(ev.top) && fallbackY != null && fallbackSize != null){
            ev.cursorSize = fallbackSize;
            ev.top = fallbackY - (fallbackSize / 2);
            ev.height = fallbackSize;
          }
        }
      }
    } catch(_) {}
    return { events: mapped, measureTotals: measureTotals || [], measureStarts: (timeline && timeline.measureStarts) ? timeline.measureStarts : [] };
  }

  function collectNoteheadCentersGlobal(){
    const out = [];
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects.length) return out;
    const svgBBox = svg.getBoundingClientRect();
    const digitTexts = Array.from(svg.querySelectorAll('text')).map(el => {
      const txt = (el.textContent || '').trim();
      if (!/^[0-9]+$/.test(txt)) return null;
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width<=0 || r.height<=0) return null;
      return {
        txt,
        cx: (r.left - svgBBox.left) + r.width/2,
        cy: (r.top - svgBBox.top) + r.height/2,
        width: r.width,
        height: r.height
      };
    }).filter(Boolean);
    let globalMaxDigitH = 0;
    digitTexts.forEach(d => { if (d.height > globalMaxDigitH) globalMaxDigitH = d.height; });
    if (!globalMaxDigitH) return out;
    const threshold = globalMaxDigitH * 0.85;
    const candidates = digitTexts.filter(d => d.height >= threshold && /^[1-7]$/.test(d.txt));
    if (!candidates.length) return out;
    const minX = Math.min(...state.measureRects.map(r => r.x));
    const maxX = Math.max(...state.measureRects.map(r => r.x + r.width));
    const margin = Math.max(6, Math.min(16, state.measureRects[0].width * 0.04));
    const systems = (state.systems && state.systems.length) ? state.systems : computeSystemsFromMeasures(state.measureRects);
    const bySystem = systems.map(() => []);
    for (const d of candidates){
      if (d.cx < minX - margin || d.cx > maxX + margin) continue;
      let sysIndex = -1;
      for (let i=0;i<systems.length;i++){
        const sys = systems[i];
        if (d.cy >= sys.y && d.cy <= sys.y + sys.height){
          sysIndex = i;
          break;
        }
      }
      if (sysIndex < 0) continue;
      bySystem[sysIndex].push(d);
    }
    for (let i=0;i<bySystem.length;i++){
      const items = bySystem[i];
      if (!items.length) continue;
      const ys = items.map(d => d.cy).sort((a,b)=>a-b);
      const hs = items.map(d => d.height).sort((a,b)=>a-b);
      const mid = Math.floor(ys.length / 2);
      const medianY = ys[mid];
      const medianH = hs[Math.floor(hs.length / 2)];
      const yTol = Math.max(medianH * 1.2, systems[i].height * 0.22);
      const filtered = items.filter(d => Math.abs(d.cy - medianY) <= yTol);
      const useSet = filtered.length ? filtered : items;
      useSet.sort((a,b)=>a.cx-b.cx);
      useSet.forEach(d => {
        out.push({ x: d.cx, y: d.cy, width: d.width, height: d.height });
      });
    }
    return out;
  }

  function collectNoteheadCentersByMeasure(){
    const map = new Map();
    const svg = scoreEl.querySelector('svg');
    if (!svg || !state.measureRects || !state.measureRects.length) return map;
    const svgBBox = svg.getBoundingClientRect();
    const digitTexts = Array.from(svg.querySelectorAll('text')).map(el => {
      const txt = (el.textContent || '').trim();
      if (!/^[0-9]+$/.test(txt)) return null;
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width<=0 || r.height<=0) return null;
      return {
        el,
        txt,
        left: r.left - svgBBox.left,
        top: r.top - svgBBox.top,
        width: r.width,
        height: r.height,
        cx: (r.left - svgBBox.left) + r.width/2,
        cy: (r.top - svgBBox.top) + r.height/2
      };
    }).filter(Boolean);
    let globalMaxDigitH = 0;
    digitTexts.forEach(d => { if (d.height > globalMaxDigitH) globalMaxDigitH = d.height; });
    const fallbackHeads = Array.from(svg.querySelectorAll('[class*="notehead"], [class*="NoteHead"], [class*="stavenote"], use[href*="notehead" i]'))
      .filter(el => (el.tagName || '').toLowerCase() !== 'g');
    const assigned = Array.from({ length: state.measureRects.length }, () => []);
    if (digitTexts.length && globalMaxDigitH > 0){
      const threshold = globalMaxDigitH * 0.85;
      const candidates = digitTexts.filter(d => d.height >= threshold && /^[1-7]$/.test(d.txt));
      const margin = Math.max(6, Math.min(16, state.measureRects[0].width * 0.04));
      for (const d of candidates){
        let best = null;
        let bestScore = Infinity;
        for (let mi=0; mi<state.measureRects.length; mi++){
          const mr = state.measureRects[mi];
          if (d.cy < mr.y || d.cy > mr.y + mr.height) continue;
          if (d.cx < mr.x - margin || d.cx > mr.x + mr.width + margin) continue;
          const inCore = d.cx >= mr.x && d.cx <= mr.x + mr.width;
          const center = mr.x + mr.width / 2;
          const distCenter = Math.abs(d.cx - center);
          const distEdge = d.cx < mr.x ? (mr.x - d.cx) : (d.cx > mr.x + mr.width ? (d.cx - (mr.x + mr.width)) : 0);
          const score = (inCore ? 0 : 1000) + distEdge * 2 + distCenter * 0.5;
          if (score < bestScore){
            bestScore = score;
            best = mi;
          }
        }
        if (best != null){
          assigned[best].push(d);
        }
      }
    }
    for (let mi=0; mi<state.measureRects.length; mi++){
      const mr = state.measureRects[mi];
      const items = [];
      const inMeasure = assigned[mi] || [];
      if (inMeasure.length){
        const ys = inMeasure.map(d => d.cy).sort((a,b)=>a-b);
        const hs = inMeasure.map(d => d.height).sort((a,b)=>a-b);
        const mid = Math.floor(ys.length / 2);
        const medianY = ys[mid];
        const medianH = hs[Math.floor(hs.length / 2)];
        const yTol = Math.max(medianH * 1.2, mr.height * 0.22);
        const yFiltered = inMeasure.filter(d => Math.abs(d.cy - medianY) <= yTol);
        const useSet = yFiltered.length ? yFiltered : inMeasure;
        useSet.forEach(d => {
          items.push({ x: d.cx, y: d.cy, width: d.width, height: d.height, left: d.left, top: d.top });
        });
      }
      if (!items.length){
        fallbackHeads.forEach(el=>{
          const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
          if (!r || (r.width<=0 && r.height<=0)) return;
          if (r.width > mr.width * 0.6 || r.height > mr.height * 0.8) return;
          const left = r.left - svgBBox.left;
          const top = r.top - svgBBox.top;
          const cx = left + r.width/2;
          const cy = top + r.height/2;
          if (cx >= mr.x && cx <= mr.x + mr.width && cy >= mr.y && cy <= mr.y + mr.height){
            items.push({ x: cx, y: cy, width: r.width, height: r.height, left, top });
          }
        });
      }
      items.sort((a,b)=>a.x-b.x);
      const uniq = [];
      const eps = 0.8; // 适度去重，保留密集音头
      items.forEach(item=>{
        const last = uniq.length ? uniq[uniq.length - 1] : null;
        if (!last || Math.abs(item.x - last.x) > eps){
          uniq.push(item);
        } else {
          const lastArea = last.width * last.height;
          const itemArea = item.width * item.height;
          if (itemArea > lastArea) uniq[uniq.length - 1] = item;
        }
      });
      map.set(mi, uniq);
    }
    return map;
  }

  function buildNoteTimeline(bpm){
    const tempo = Math.max(1, bpm || 60);
    const secPerQuarter = 60 / tempo;
    const rawTimeline = parseTimelineFromXML();
    const mapped = mapEventsToPositions(rawTimeline);
    const events = (mapped && mapped.events) ? mapped.events.filter(ev => !ev.isRest) : [];
    return events.map(ev => {
      const top = isFinite(ev.top) ? ev.top : (isFinite(ev.y1) ? ev.y1 : null);
      const height = isFinite(ev.height) ? ev.height : (isFinite(ev.y2) && isFinite(ev.y1) ? Math.max(2, ev.y2 - ev.y1) : null);
      const size = isFinite(ev.cursorSize) ? ev.cursorSize : null;
      return {
        measureIndex: ev.measure,
        x: ev.x,
        top,
        height,
        size,
        timeSec: (ev.absBeats || 0) * secPerQuarter
      };
    }).sort((a,b)=> a.timeSec - b.timeSec);
  }

  function getCursorPlacementForMeasure(m){
    const top = m.y + m.height * 0.05;
    const height = state.cursorHeight ? Math.max(state.cursorHeight, m.height * 0.9) : Math.max(2, m.height * 0.9);
    return { top, height };
  }

  function startBeatCursor(bpm, beatsPerMeasure, denVal){
    if (state.beatTimerId) { clearInterval(state.beatTimerId); state.beatTimerId = null; }
    const beatSec = (60/Math.max(1,bpm)) * (4/denVal);
    let measureIndex = 0;
    let beatIndex = 0;
    const totalMeasures = state.measureRects.length;

    function placeCursor(mIdx, bIdx){
      const m = state.measureRects[mIdx];
      if (!m || !state.cursorEl) return;
      const x = m.x + (m.width * (bIdx / Math.max(1, beatsPerMeasure)));
      const { top, height } = getCursorPlacementForMeasure(m);
      const side = state.cursorWidth || Math.min(height, 16);
      const y = top + (height - side) / 2;
      positionCursorRect(x - side / 2, y, side, side);
    }

    function tick(){
      if (!state.active) return;
      if (measureIndex >= totalMeasures){
        if (totalMeasures > 0) applyClipForIndex(totalMeasures - 1);
        completeChallengeCycle();
        return;
      }
      if (beatIndex === 0 && measureIndex > 0){
        applyClipForIndex(measureIndex - 1);
      }
      if (state.cursorEnabled) placeCursor(measureIndex, beatIndex);
      beatIndex++;
      if (beatIndex >= beatsPerMeasure){
        beatIndex = 0;
        measureIndex++;
      }
    }

    tick();
    state.beatTimerId = setInterval(tick, beatSec * 1000);
  }

  function startNoteCursor(bpm){
    if (state.noteTimerId) { clearTimeout(state.noteTimerId); state.noteTimerId = null; }
    if (state.beatTimerId) { clearInterval(state.beatTimerId); state.beatTimerId = null; }
    if (state.cursorEl) state.cursorEl.style.display = state.cursorEnabled ? 'block' : 'none';
    const events = Array.isArray(state.noteEvents) ? state.noteEvents : [];
    if (!events.length){
      const tsInfo = getTimeSignatureInfo();
      startBeatCursor(bpm, tsInfo.beats, tsInfo.den);
      return;
    }

    const startTs = performance.now();
    let idx = 0;
    state.lastNoteMeasure = -1;

    function placeAtEvent(ev){
      const m = state.measureRects[ev.measureIndex];
      if (!m || !state.cursorEl) return;
      const fallback = getCursorPlacementForMeasure(m);
      const size = isFinite(ev.size) && ev.size > 0 ? ev.size : (state.cursorWidth || Math.min(fallback.height, 16));
      const top = isFinite(ev.top) ? ev.top : (fallback.top + (fallback.height - size) / 2);
      positionCursorRect(ev.x - size / 2, top, size, size);
    }

    function scheduleNext(){
      if (idx >= events.length){
        if (state.measureRects.length > 0) applyClipForIndex(state.measureRects.length - 1);
        completeChallengeCycle();
        return;
      }
      const ev = events[idx];
      const delay = Math.max(0, ev.timeSec * 1000 - (performance.now() - startTs));
      state.noteTimerId = setTimeout(() => {
        if (!state.active) return;
        if (ev.measureIndex > 0 && ev.measureIndex !== state.lastNoteMeasure){
          applyClipForIndex(ev.measureIndex - 1);
        }
        if (state.cursorEnabled) placeAtEvent(ev);
        state.lastNoteMeasure = ev.measureIndex;
        idx++;
        if (idx >= events.length){
          const totalSec = (state.measureRects.length || 0) * (state.measureDuration || 0);
          const remainSec = totalSec > 0 ? Math.max(0, totalSec - ev.timeSec) : 0;
          const holdMs = Math.max(220, remainSec * 1000);
          state.noteTimerId = setTimeout(() => {
            if (state.measureRects.length > 0) applyClipForIndex(state.measureRects.length - 1);
            completeChallengeCycle();
          }, holdMs);
          return;
        }
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  }

  function startChallengeMetronome(bpm, anchorPerf){
    if (!state.metronomeEnabled) return;
    if (state.metronomeTimerId) { clearTimeout(state.metronomeTimerId); state.metronomeTimerId = null; }
    const tsInfo = getTimeSignatureInfo();
    const beatMs = (60/Math.max(1,bpm)) * (4/tsInfo.den) * 1000;
    let beat = 1;
    let tickIndex = 0;
    function strongBeat(n){
      if (tsInfo.is68) return n === 1 || n === 4;
      return n === 1;
    }
    function scheduleTick(){
      if (!state.active || !state.metronomeEnabled) return;
      const target = anchorPerf + tickIndex * beatMs;
      const delay = Math.max(0, target - performance.now());
      state.metronomeTimerId = setTimeout(() => {
        if (!state.active || !state.metronomeEnabled) return;
        ensureClickAudio();
        state.lastBeatTimeMs = target;
        try { playClick(strongBeat(beat)); } catch(_) {}
        beat = (beat % tsInfo.beats) + 1;
        tickIndex += 1;
        scheduleTick();
      }, delay);
    }
    scheduleTick();
  }

  function startJumpCursor(bpm){
    const tempo = Math.max(1, bpm || 60);
    const secPerQuarter = 60 / tempo;

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
      const placement = getCursorPlacementForMeasure(mr);
      measures.push({
        index: i,
        startQN,
        totalQN,
        startSec: 0,
        endSec: 0,
        startX: mr.x,
        endX: mr.x + mr.width,
        top: placement.top,
        height: placement.height
      });
    }

    if (state.noteTimerId) { try { clearTimeout(state.noteTimerId); } catch(_) {} state.noteTimerId = null; }
    if (state.beatTimerId) { try { clearInterval(state.beatTimerId); } catch(_) {} state.beatTimerId = null; }
    if (state.rafId) { try { cancelAnimationFrame(state.rafId); } catch(_) {} state.rafId = null; }
    if (state.schedulerId) { try { clearTimeout(state.schedulerId); } catch(_) {} state.schedulerId = null; }
    if (!state.jumpTimeouts) state.jumpTimeouts = [];
    state.jumpTimeouts.forEach(t=>{ try{ clearTimeout(t);}catch(_){}});
    state.jumpTimeouts = [];

    const phase = (typeof window.getMetronomePhase === 'function') ? window.getMetronomePhase() : null;
    const ac = phase && phase.audioContext ? phase.audioContext : null;
    const anchorAc = (ac && state.anchorAcTime != null) ? state.anchorAcTime : null;
    const anchorPerfStart = state.anchorPerfStart || performance.now();

    const anchorSecBase = (anchorAc!=null) ? anchorAc : 0;
    const toSec = qn => qn * secPerQuarter;
    measures.forEach(m => {
      m.startSec = anchorSecBase + toSec(m.startQN);
      m.endSec = m.startSec + toSec(m.totalQN);
    });

    const nowBase = anchorAc!=null && ac ? ac.currentTime : ((performance.now() - anchorPerfStart)/1000);
    let measureShift = 0;
    if (measures.length && measures[0].startSec < nowBase){
      measureShift = (nowBase + 0.02) - measures[0].startSec;
      measures.forEach(m => { m.startSec += measureShift; m.endSec += measureShift; });
    }

    const measureEvents = [];
    measures.forEach(m => {
      measureEvents.push({ time: m.startSec, measure: m.index });
    });

    const noteEvents = [];
    if (events && events.length){
      for (const ev of events){
        const m = measures[ev.measure];
        if (!m) continue;
        const perMeas = totalsRaw[ev.measure] != null ? totalsRaw[ev.measure] : m.totalQN;
        const startSec = anchorSecBase + toSec(ev.absBeats) + measureShift;
        let xPos = ev.x;
        if (!isFinite(xPos)){
          const frac = Math.max(0, Math.min(1, ev.posBeats / Math.max(0.0001, perMeas)));
          xPos = m.startX + (m.endX - m.startX) * frac;
        }
        const size = isFinite(ev.cursorSize) && ev.cursorSize > 0 ? ev.cursorSize : (state.cursorWidth || Math.min(m.height, 16));
        const top = isFinite(ev.top) ? ev.top : (m.top + (m.height - size) / 2);
        const durSec = isFinite(ev.durBeats) && ev.durBeats > 0 ? toSec(ev.durBeats) : 0;
        noteEvents.push({ time: startSec, end: startSec + durSec, x: xPos, top, size, measure: ev.measure });
      }
    }
    noteEvents.sort((a,b)=> (a.time - b.time) || ((a.x || 0) - (b.x || 0)));
    measureEvents.sort((a,b)=> a.time - b.time);

    const endTime = measures.length ? measures[measures.length - 1].endSec : (noteEvents.length ? noteEvents[noteEvents.length - 1].time : 0);
    const basePerf = anchorPerfStart || performance.now();
    const timeouts = [];
    let lastMaskedMeasure = -1;

    if (state.rafId) { try { cancelAnimationFrame(state.rafId); } catch(_) {} state.rafId = null; }

    measureEvents.forEach(ev => {
      if (ev.measure <= 0) return;
      const t = basePerf + ev.time * 1000;
      const delay = Math.max(0, t - performance.now()) + 20;
      const tid = setTimeout(() => {
        if (!state.active) return;
        maskMeasure(ev.measure - 1);
      }, delay);
      timeouts.push(tid);
    });

    for (let i=0; i<noteEvents.length; i++){
      const ev = noteEvents[i];
      const t = basePerf + ev.time * 1000;
      const delay = Math.max(0, t - performance.now());
      const tid = setTimeout(() => {
        if (!state.active || !state.cursorEnabled || !state.cursorEl) return;
        if (state.hideEnabled && ev.measure > 0 && ev.measure !== lastMaskedMeasure){
          maskMeasure(ev.measure - 1);
          lastMaskedMeasure = ev.measure;
        }
        if (state.cursorEl.style.display !== 'block') state.cursorEl.style.display = 'block';
        positionCursorRect(ev.x - ev.size / 2, ev.top, ev.size, ev.size);
        try { state.overlayEl.appendChild(state.cursorEl); } catch(_){}
      }, delay);
      timeouts.push(tid);

      const next = noteEvents[i+1];
      if (isFinite(ev.end) && ev.end > ev.time){
        const nextTime = next ? next.time : null;
        if (nextTime == null || nextTime - ev.end > 0.02){
          const hideT = basePerf + ev.end * 1000;
          const hideDelay = Math.max(0, hideT - performance.now());
          const hid = setTimeout(() => {
            if (!state.active || !state.cursorEl || !state.cursorEnabled) return;
            state.cursorEl.style.display = 'none';
          }, hideDelay);
          timeouts.push(hid);
        }
      }
    }

    const endDelayMs = Math.max(0, (basePerf + (endTime + 0.22) * 1000) - performance.now());
    state.schedulerId = setTimeout(() => {
      if (!state.active) return;
      if (state.measureRects.length > 0) applyClipForIndex(state.measureRects.length - 1);
      completeChallengeCycle();
    }, endDelayMs);
    state.jumpTimeouts = timeouts;
    return;
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

  async function startChallenge(prepSec, bpm, cursorEnabled, metronomeEnabled, hideEnabled){
    if (state.active) stopChallenge({ keepToggle: true, keepAuto: true });
    state.active = true;
    state.autoRestart = true;
    state.cursorEnabled = cursorEnabled !== false;
    state.metronomeEnabled = metronomeEnabled !== false;
    state.hideEnabled = hideEnabled !== false;
    state.metronomeWasRunning = false;

    showCountdownUI(prepSec);
    const tStart = Date.now();
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); }
    state.countdownTimerId = setInterval(()=>{
      const elapsed = (Date.now() - tStart)/1000;
      updateCountdownUI(Math.max(0, prepSec - elapsed));
    }, 200);

    if (typeof window.generateMelody === 'function') {
      try { await window.generateMelody(); } catch(_) {}
    }
    await ensureScoreReady();
    const rects = await waitForMeasuresReady(Math.max(3000, prepSec*1000));
    state.measureRects = rects;
    state.measureRects = await waitForStableMeasures(state.measureRects, 500);

    const nowMs = Date.now();
    const remainMs = Math.max(0, prepSec*1000 - (nowMs - tStart));
    await new Promise(r => setTimeout(r, remainMs));
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); state.countdownTimerId = null; }
    hideCountdownUI();

    if (!state.measureRects || !state.measureRects.length){
      if (typeof window.generateMelody === 'function') {
        try { await window.generateMelody(); } catch(_) {}
      }
      await ensureScoreReady();
      state.measureRects = await waitForMeasuresReady(5000);
      state.measureRects = await waitForStableMeasures(state.measureRects, 400);
    }

    if (!state.measureRects || !state.measureRects.length){
      alert('未检测到小节，无法启动挑战');
      stopChallenge();
      return;
    }

    state.contentGroup = null;
    state.contentGroups = null;
    state.textMedianHeight = null;
    state.systems = computeSystemsFromMeasures(state.measureRects);
    state.measureBuckets = buildMeasureElementIndex();
    state.measureClipRects = computeMeasureClipRects();
    state.measureDuration = parseMeasureDurationSec(bpm);
    state.noteEvents = buildNoteTimeline(bpm);
    const heights = state.measureRects.map(r => r.height).filter(h => isFinite(h) && h > 0);
    if (heights.length){
      const minH = Math.min(...heights);
      state.cursorHeight = Math.max(2, minH * 0.9);
    }

    ensureOverlay();
    applyClipForIndex(-1);

    if (state.observer) { try { state.observer.disconnect(); } catch(_){} }
    state.activeSvg = scoreEl.querySelector('svg');
    state.observer = new MutationObserver((mutations) => {
      const currentSvg = scoreEl.querySelector('svg');
      if (currentSvg !== state.activeSvg) { stopChallenge(); return; }
      if (!state.active) return;
      let needsRebuild = false;
      for (const m of mutations){
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)){
          needsRebuild = true;
          break;
        }
      }
      if (needsRebuild) scheduleBucketRebuild();
    });
    state.observer.observe(scoreEl, { childList: true, subtree: true });
    state.resizeHandler = ()=> stopChallenge();
    window.addEventListener('resize', state.resizeHandler, { passive: true });
    startCountIn(bpm);
  }

  function stopChallenge(options){
    const opts = options || {};
    if (state.observer) { try { state.observer.disconnect(); } catch(_){} state.observer = null; }
    if (state.resizeHandler) { window.removeEventListener('resize', state.resizeHandler); state.resizeHandler = null; }
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); state.countdownTimerId = null; }
    if (state.countInTimerId) { clearTimeout(state.countInTimerId); state.countInTimerId = null; }
    if (state.noteTimerId) { clearTimeout(state.noteTimerId); state.noteTimerId = null; }
    if (state.beatTimerId) { clearInterval(state.beatTimerId); state.beatTimerId = null; }
    if (state.metronomeTimerId) { clearInterval(state.metronomeTimerId); state.metronomeTimerId = null; }
    if (state.schedulerId) { clearTimeout(state.schedulerId); state.schedulerId = null; }
    if (state.jumpTimeouts && state.jumpTimeouts.length){
      state.jumpTimeouts.forEach(t=>{ try{ clearTimeout(t);}catch(_){} });
      state.jumpTimeouts = [];
    }
    if (state.bucketRebuildId) { clearTimeout(state.bucketRebuildId); state.bucketRebuildId = null; }
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
    removeCountInLabel();
    restoreHiddenElements();
    clearOverlay();
    clearContentClip();
    hideCountdownUI();
    state.measureBuckets = null;
    state.measureClipRects = null;
    state.contentGroup = null;
    state.contentGroups = null;
    state.noteEvents = [];
    state.active = false;
    if (!opts.keepAuto) state.autoRestart = false;
    if (!opts.keepToggle && toggleEl){ toggleEl.checked = false; updateSwitcherVisual(); }
  }

  function completeChallengeCycle(){
    if (typeof window.incrementPracticeCount === 'function') {
      window.incrementPracticeCount();
    }
    if (toggleEl && toggleEl.checked && state.autoRestart){
      const prep = Math.max(0, parseInt(($('challengePrepTime')?.value || '0'), 10));
      const bpm = Math.max(40, Math.min(240, parseInt(($('challengeBPM')?.value || '80'), 10)));
      if (prep === 0 && state.lastBeatTimeMs){
        const tsInfo = getTimeSignatureInfo();
        const beatMs = (60/Math.max(1,bpm)) * (4/tsInfo.den) * 1000;
        const nextBeat = state.lastBeatTimeMs + beatMs;
        state.nextCountInDelayMs = Math.max(0, nextBeat - performance.now());
      } else {
        state.nextCountInDelayMs = 0;
      }
      stopChallenge({ keepToggle: true, keepAuto: true });
      const cursorEnabled = $('challengeCursorToggle') ? $('challengeCursorToggle').checked : true;
      const metronomeEnabled = $('challengeMetronomeToggle') ? $('challengeMetronomeToggle').checked : true;
      const hideEnabled = $('challengeHideToggle') ? $('challengeHideToggle').checked : true;
      if (toggleEl.checked) startChallenge(prep, bpm, cursorEnabled, metronomeEnabled, hideEnabled);
    } else {
      stopChallenge();
    }
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
  if (cursorToggleEl){
    cursorToggleEl.addEventListener('change', updateCursorToggleVisual);
    updateCursorToggleVisual();
  }
  if (metronomeToggleEl){
    metronomeToggleEl.addEventListener('change', updateMetronomeToggleVisual);
    updateMetronomeToggleVisual();
  }
  if (hideToggleEl){
    hideToggleEl.addEventListener('change', updateHideToggleVisual);
    updateHideToggleVisual();
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
