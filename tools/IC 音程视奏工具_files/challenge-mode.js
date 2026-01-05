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
    restTimeouts: null,
    metronomeTimerId: null,
    observer: null,
    startTs: 0,
    measureRects: [],
    measureDuration: 0,
    musicXML: null,
    cursorEl: null,
    overlayEl: null, // HTML overlay on score container
    cursorWidth: 12,
    cursorHeight: null,
    cursorEnabled: true,
    metronomeEnabled: true,
    hideEnabled: true,
    autoRestart: false,
    lastBeatTimeMs: 0,
    nextCountInDelayMs: 0,
    beatsPerMeasure: 4,
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
    const cursorToggle = $('challengeCursorToggle');
    const metronomeToggle = $('challengeMetronomeToggle');
    const hideToggle = $('challengeHideToggle');
    let hasCursorPref = false;
    let hasMetronomePref = false;
    let hasHidePref = false;
    try {
      const saved = JSON.parse(localStorage.getItem('ic_interval_challenge_settings')||'{}');
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
    try { localStorage.setItem('ic_interval_challenge_settings', JSON.stringify({ prep, bpm, cursor: cursorEnabled, metronome: metronomeEnabled, hide: hideEnabled })); } catch(_) {}
    closeChallengeModal();
    try { ensureClickAudio(); } catch(_) {}
    await startChallenge(prep, bpm, cursorEnabled, metronomeEnabled, hideEnabled);
  }

  function updateSwitcherVisual(){
    const slider = toggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (toggleEl.checked){
      slider.style.backgroundColor = '#34C759';
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
      slider.style.backgroundColor = '#34C759';
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
      slider.style.backgroundColor = '#34C759';
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
      slider.style.backgroundColor = '#34C759';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function ensureOverlay(){
    if (state.overlayEl && state.overlayEl.parentNode){
      if (state.cursorEnabled && !state.cursorEl){
        const cursor = document.createElement('div');
        cursor.id = 'challengeCursor';
        cursor.style.position = 'absolute';
        cursor.style.top = '0';
        cursor.style.left = '0';
        cursor.style.width = `${state.cursorWidth || 12}px`;
        cursor.style.height = '100%';
        cursor.style.background = 'rgba(52,199,89,0.25)';
        cursor.style.border = '1px solid rgba(52,199,89,0.45)';
        cursor.style.borderRadius = '4px';
        cursor.style.boxShadow = '0 0 0 0 rgba(52,199,89,0.35)';
        cursor.style.transition = 'box-shadow 0.12s ease';
        state.overlayEl.appendChild(cursor);
        state.cursorEl = cursor;
      } else if (!state.cursorEnabled && state.cursorEl){
        state.cursorEl.remove();
        state.cursorEl = null;
      }
      return state.overlayEl;
    }
    const overlay = document.createElement('div');
    overlay.id = 'challengeOverlay';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '5';
    scoreEl.appendChild(overlay);
    if (state.cursorEnabled){
      const cursor = document.createElement('div');
      cursor.id = 'challengeCursor';
      cursor.style.position = 'absolute';
      cursor.style.top = '0';
      cursor.style.left = '0';
      cursor.style.width = `${state.cursorWidth || 12}px`;
      cursor.style.height = '100%';
      cursor.style.background = 'rgba(52,199,89,0.25)';
      cursor.style.border = '1px solid rgba(52,199,89,0.45)';
      cursor.style.borderRadius = '4px';
      cursor.style.boxShadow = '0 0 0 0 rgba(52,199,89,0.35)';
      cursor.style.transition = 'box-shadow 0.12s ease';
      overlay.appendChild(cursor);
      state.cursorEl = cursor;
    }
    state.overlayEl = overlay;
    return overlay;
  }

  function positionCursorRect(x, y, width, height){
    if (!state.cursorEl) return;
    let offsetX = 0;
    let offsetY = 0;
    try{
      const svg = scoreEl.querySelector('svg');
      if (svg){
        const svgRect = svg.getBoundingClientRect();
        const scoreRect = scoreEl.getBoundingClientRect();
        offsetX = svgRect.left - scoreRect.left;
        offsetY = svgRect.top - scoreRect.top;
      }
    }catch(_){}
    state.cursorEl.style.transform = `translateX(${x + offsetX}px)`;
    state.cursorEl.style.top = `${y + offsetY}px`;
    state.cursorEl.style.width = `${Math.max(1, width)}px`;
    state.cursorEl.style.height = `${Math.max(1, height)}px`;
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
    if (!svg && typeof window.generateIntervals === 'function') {
      try { window.generateIntervals(); } catch(_) {}
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
      const ts = (window.currentIntervalProgression && window.currentIntervalProgression.timeSignature)
        ? window.currentIntervalProgression.timeSignature
        : window.intervalPlaybackTimeSignature;
      if (ts){
        if (typeof ts === 'string'){
          timeSig = ts;
        } else {
          const beats = ts.beats ?? ts.numerator ?? ts.num;
          const beatType = ts.beatType ?? ts.denominator ?? ts.den;
          if (beats && beatType) timeSig = `${beats}/${beatType}`;
        }
      }
    }catch(_){}
    return String(timeSig);
  }

  function getCurrentMelodyXML(){
    try{
      if (window.currentIntervalProgression && window.intervalGenerator && typeof window.intervalGenerator.generateMusicXML === 'function'){
        const xml = window.intervalGenerator.generateMusicXML(window.currentIntervalProgression);
        if (typeof xml === 'string' && xml.length > 0){
          state.musicXML = xml;
          return xml;
        }
      }
    }catch(_){}
    return state.musicXML || null;
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
      const eps = 6;
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

  function getMeasureRectsForMapping(){
    const base = Array.isArray(state.measureRects) ? state.measureRects : [];
    if (!base.length) return base;
    let bars = [];
    try { bars = collectMeasureRectsByBarlines(); } catch(_) { bars = []; }
    if (Array.isArray(bars) && bars.length === base.length && bars.every(r => r && r.width > 0 && r.height > 0)){
      return bars;
    }
    return base;
  }

  function getExpectedMeasureCountFromXML(){
    try{
      if (typeof osmd !== 'undefined' && osmd && osmd.GraphicSheet && Array.isArray(osmd.GraphicSheet.MeasureList)){
        const n = osmd.GraphicSheet.MeasureList.length;
        if (n && n > 0) return n;
      }
      if (window.currentIntervalProgression && Array.isArray(window.currentIntervalProgression.measures)){
        const n = window.currentIntervalProgression.measures.length;
        if (n && n > 0) return n;
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
    if (!state.hideEnabled) return false;
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
      const y = m.y + m.height * 0.05;
      const height = state.cursorHeight ? Math.max(state.cursorHeight, m.height * 0.9) : Math.max(2, m.height * 0.9);
      const width = state.cursorWidth || 12;
      positionCursorRect(x - width / 2, y, width, height);
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
    if (!state.hideEnabled) return;
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
    const overlay = ensureOverlay() || scoreEl;
    if (!overlay) return null;
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
    overlay.appendChild(label);
    return label;
  }

  function startCountIn(bpm){
    const tsInfo = getTimeSignatureInfo();
    const beats = tsInfo.beats;
    const denVal = tsInfo.den;
    const beatSec = (60/Math.max(1,bpm)) * (4/denVal);
    state.beatsPerMeasure = beats;
    state.measureDuration = beats * beatSec;
    ensureOverlay();
    if (state.cursorEl) state.cursorEl.style.display = 'none';
    const first = state.measureRects[0];
    if (first && state.cursorEl){
      const startX = first.x;
      const y = first.y + first.height * 0.05;
      const height = state.cursorHeight ? Math.max(state.cursorHeight, first.height * 0.9) : Math.max(2, first.height * 0.9);
      const width = state.cursorWidth || 12;
      positionCursorRect(startX, y, width, height);
    }
    const label = createCountInLabel();
    let i = 0;
    function strongBeat(n){
      if (tsInfo.is68) return n === 1 || n === 4;
      return n === 1;
    }
    function tick(){
      ensureClickAudio();
      i++;
      const beatNum = i > beats ? beats : i;
      state.lastBeatTimeMs = performance.now();
      playClick(strongBeat(beatNum));
      if (label) label.textContent = String(beatNum);
      if (state.cursorEl){
        if (strongBeat(beatNum)){
          state.cursorEl.style.boxShadow = '0 0 0 8px rgba(52,199,89,0.20)';
          if (label) label.style.color = '#34C759';
          if (label) label.style.opacity = '1';
        } else {
          state.cursorEl.style.boxShadow = '0 0 0 4px rgba(52,199,89,0.10)';
          if (label) label.style.color = 'var(--text-color)';
          if (label) label.style.opacity = '0.75';
        }
        setTimeout(() => {
          if (state.cursorEl) state.cursorEl.style.boxShadow = '0 0 0 0 rgba(52,199,89,0)';
        }, Math.min(220, beatSec * 800));
      }
      if (i >= beats){
        if (state.countInTimerId) { clearInterval(state.countInTimerId); state.countInTimerId = null; }
        setTimeout(() => {
          if (!state.active) return;
          removeCountInLabel();
          if (state.cursorEl) state.cursorEl.style.display = state.cursorEnabled ? 'block' : 'none';
          startChallengeMetronome(bpm);
          startNoteCursor(bpm);
        }, beatSec * 1000);
      }
    }
    const delayMs = Math.max(0, state.nextCountInDelayMs || 0);
    state.nextCountInDelayMs = 0;
    if (delayMs > 0){
      state.countInTimerId = setTimeout(() => {
        if (!state.active) return;
        tick();
        state.countInTimerId = setInterval(tick, beatSec * 1000);
      }, delayMs);
    } else {
      tick();
      state.countInTimerId = setInterval(tick, beatSec * 1000);
    }
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
    const measureRectsForMapping = getMeasureRectsForMapping();
    if (!events || !events.length || !measureRectsForMapping || !measureRectsForMapping.length) return { events: [], measureStarts: [], measureTotals: [] };
    const measureTotals = (timeline && timeline.measureTotals && timeline.measureTotals.length) ? timeline.measureTotals : null;
    // 先用比例位置作为回退
    const mapped = events.map(ev => {
      const mr = measureRectsForMapping[Math.min(ev.measure, measureRectsForMapping.length-1)];
      const perMeas = measureTotals ? measureTotals[Math.min(ev.measure, measureTotals.length-1)] : (function(){ const xml = getCurrentMelodyXML(); const ts = xml ? parseTimeSigFromXML(xml) : null; return (ts ? ts.num : 4) * (4/(ts ? ts.den : 4)); })();
      const x = mr.x + Math.max(0, Math.min(1, (ev.posBeats / Math.max(0.0001, perMeas)))) * mr.width;
      const y1 = mr.y + mr.height * 0.05;
      const y2 = y1 + Math.max(2, mr.height * 0.9);
      return { ...ev, x, y1, y2 };
    });
    // 用真实 notehead 细化位置（按拍点就近匹配音头），休止符保持比例位置
    try {
      const osmdEntryMap = collectOsmdEntriesByMeasure();
      const headMap = collectNoteheadGroupsByMeasure();
      const staveMap = collectStavenoteGroupsByMeasure();
      const offsetPx = 0; // 对齐到音头中心
      const snapTolBase = 28; // 与音头的最近吸附阈值（像素）
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
        const headsRaw = headMap.get(mIndex) || [];
        const perMeas = (measureTotals && measureTotals[mIndex] != null) ? measureTotals[mIndex] : defaultPerMeasure;
        const noteEvents = evs.filter(e => !e.isRest);
        const restEvents = evs.filter(e => e.isRest);
        const ordered = noteEvents.slice().sort((a,b)=> (a.posBeats - b.posBeats) || (a.absBeats - b.absBeats));
        const orderedAll = evs.slice().sort((a,b)=> (a.posBeats - b.posBeats) || (a.absBeats - b.absBeats));

        const osmdEntries = osmdEntryMap.get(mIndex) || [];
        const osmdRestTargets = osmdEntries.filter(e => e && e.isRest && isFinite(e.x)).map(e => e.x);
        if (osmdEntries.length){
          const entryOrder = osmdEntries.slice().sort((a,b)=> (a.relVal ?? 0) - (b.relVal ?? 0) || a.x - b.x);
          const restEntryXs = entryOrder.filter(e => e.isRest).map(e => e.x);
          if (entryOrder.length === orderedAll.length && orderedAll.length){
            for (let k = 0; k < orderedAll.length; k++){
              const ev = orderedAll[k];
              const entry = entryOrder[k];
              if (!entry) continue;
              if (!ev.isRest){
                ev.x = Math.max(0, entry.x - offsetPx);
                if (isFinite(entry.top) && isFinite(entry.bottom)){
                  const pad = Math.max(2, (entry.bottom - entry.top) * 0.2);
                  ev.y1 = entry.top - pad;
                  ev.y2 = entry.bottom + pad;
                }
                if (isFinite(entry.width)){
                  ev.width = Math.max(6, entry.width + 2);
                }
              } else {
                ev.x = entry.x;
              }
            }
            continue;
          }
          const entryNotes = entryOrder.filter(e => !e.isRest);
          if (entryNotes.length === ordered.length && ordered.length){
            for (let k = 0; k < ordered.length; k++){
              const ev = ordered[k];
              const entry = entryNotes[k];
              if (!entry) continue;
              ev.x = Math.max(0, entry.x - offsetPx);
              if (isFinite(entry.top) && isFinite(entry.bottom)){
                const pad = Math.max(2, (entry.bottom - entry.top) * 0.2);
                ev.y1 = entry.top - pad;
                ev.y2 = entry.bottom + pad;
              }
              if (isFinite(entry.width)){
                ev.width = Math.max(6, entry.width + 2);
              }
              if (restEntryXs.length){
                const restAvoid = Math.max(10, measureRectsForMapping[mIndex].width * 0.04);
                let distRest = Infinity;
                for (const rx of restEntryXs){ distRest = Math.min(distRest, Math.abs(ev.x - rx)); }
                if (distRest <= restAvoid){
                  const targetX = measureRectsForMapping[mIndex].x +
                    Math.max(0, Math.min(1, ev.posBeats / Math.max(0.0001, perMeas))) * measureRectsForMapping[mIndex].width;
                  if (Math.abs(targetX - ev.x) > 4) ev.x = targetX;
                }
              }
            }
            continue;
          }
        }

        const stavesNotes = (staveMap.get(mIndex) || []).filter(s => s && s.hasNotehead).sort((a,b)=>a.x-b.x);
        if (stavesNotes.length === ordered.length && ordered.length){
          for (let k = 0; k < ordered.length; k++){
            const ev = ordered[k];
            const sn = stavesNotes[k];
            if (!sn) continue;
            ev.x = Math.max(0, sn.x - offsetPx);
            if (isFinite(sn.top) && isFinite(sn.bottom)){
              const pad = Math.max(2, (sn.bottom - sn.top) * 0.2);
              ev.y1 = sn.top - pad;
              ev.y2 = sn.bottom + pad;
            }
            if (isFinite(sn.width)){
              ev.width = Math.max(6, sn.width + 2);
            }
          }
          continue;
        }

        if (!headsRaw.length || !ordered.length) continue;
        const targets = ordered.map(ev => (
          measureRectsForMapping[mIndex].x +
          Math.max(0, Math.min(1, ev.posBeats / Math.max(0.0001, perMeas))) * measureRectsForMapping[mIndex].width
        ));
        const restTargets = osmdRestTargets.length ? osmdRestTargets : restEvents.map(ev => (
          measureRectsForMapping[mIndex].x +
          Math.max(0, Math.min(1, ev.posBeats / Math.max(0.0001, perMeas))) * measureRectsForMapping[mIndex].width
        ));
        let heads = headsRaw;
        if (restTargets.length && headsRaw.length > ordered.length){
          const restSnapTol = Math.max(18, measureRectsForMapping[mIndex].width * 0.18);
          const restBias = 4;
          const candidates = headsRaw.map(h => {
            let distNote = Infinity;
            for (const nx of targets){ distNote = Math.min(distNote, Math.abs(h.x - nx)); }
            let distRest = Infinity;
            for (const rx of restTargets){ distRest = Math.min(distRest, Math.abs(h.x - rx)); }
            return { h, distNote, distRest };
          });
          candidates.sort((a,b) => (a.distRest - a.distNote) - (b.distRest - b.distNote));
          let toRemove = headsRaw.length - ordered.length;
          const kept = [];
          for (const c of candidates){
            const restLike = isFinite(c.distRest) && c.distRest <= restSnapTol && (c.distRest + restBias) < c.distNote;
            if (restLike && toRemove > 0){
              toRemove -= 1;
              continue;
            }
            kept.push(c.h);
          }
          heads = kept.length >= ordered.length ? kept : headsRaw;
        }

        let finalHeads = heads;
        if (heads.length > ordered.length && ordered.length){
          const buckets = Array.from({ length: ordered.length }, () => []);
          for (const h of heads){
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < targets.length; i++){
              const d = Math.abs(h.x - targets[i]);
              if (d < bestDist){
                bestDist = d;
                bestIdx = i;
              }
            }
            buckets[bestIdx].push(h);
          }
          const merged = buckets.map((arr, idx) => {
            if (!arr.length) return null;
            let minX = Infinity;
            let maxX = -Infinity;
            let top = Infinity;
            let bottom = -Infinity;
            let best = null;
            let bestDist = Infinity;
            arr.forEach(h => {
              const half = (isFinite(h.width) && h.width > 0) ? (h.width / 2) : 4;
              minX = Math.min(minX, h.x - half);
              maxX = Math.max(maxX, h.x + half);
              if (isFinite(h.top)) top = Math.min(top, h.top);
              if (isFinite(h.bottom)) bottom = Math.max(bottom, h.bottom);
              const d = Math.abs(h.x - targets[idx]);
              if (d < bestDist){
                bestDist = d;
                best = h;
              }
            });
            const width = Math.max(2, maxX - minX);
            const x = best ? best.x : (minX + maxX) / 2;
            return { x, top, bottom, width };
          }).filter(Boolean);
          if (merged.length === ordered.length) finalHeads = merged;
        }

        const restAvoid = Math.max(10, measureRectsForMapping[mIndex].width * 0.04);

        if (finalHeads.length === ordered.length){
          for (let k = 0; k < ordered.length; k++){
            const ev = ordered[k];
            const head = finalHeads[k];
            if (head){
              ev.x = Math.max(0, head.x - offsetPx);
              if (isFinite(head.top) && isFinite(head.bottom)){
                const pad = Math.max(2, (head.bottom - head.top) * 0.2);
                ev.y1 = head.top - pad;
                ev.y2 = head.bottom + pad;
              }
              if (isFinite(head.width)){
                ev.width = Math.max(6, head.width + 2);
              }
              if (restTargets.length){
                const targetX = targets[k];
                let distRest = Infinity;
                let distTarget = Infinity;
                for (const rx of restTargets){
                  distRest = Math.min(distRest, Math.abs(ev.x - rx));
                  distTarget = Math.min(distTarget, Math.abs(targetX - rx));
                }
                if (distRest <= restAvoid && distTarget > distRest + 6){
                  ev.x = targetX;
                }
              }
            } else {
              ev.x = targets[k];
            }
          }
        } else if (finalHeads.length >= ordered.length){
          const m = ordered.length;
          const n = finalHeads.length;
          const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(Infinity));
          const choose = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
          for (let j = 0; j <= n; j++) dp[0][j] = 0;
          for (let i = 1; i <= m; i++){
            for (let j = 1; j <= n; j++){
              const skip = dp[i][j - 1];
              const use = dp[i - 1][j - 1] + Math.abs(finalHeads[j - 1].x - targets[i - 1]);
              if (use <= skip){
                dp[i][j] = use;
                choose[i][j] = true;
              } else {
                dp[i][j] = skip;
              }
            }
          }
          const matched = Array(m).fill(null);
          let i = m, j = n;
          while (i > 0 && j > 0){
            if (choose[i][j]){
              matched[i - 1] = finalHeads[j - 1];
              i--; j--;
            } else {
              j--;
            }
          }
          for (let k = 0; k < m; k++){
            const ev = ordered[k];
            const head = matched[k];
            if (head){
              ev.x = Math.max(0, head.x - offsetPx);
              if (isFinite(head.top) && isFinite(head.bottom)){
                const pad = Math.max(2, (head.bottom - head.top) * 0.2);
                ev.y1 = head.top - pad;
                ev.y2 = head.bottom + pad;
              }
              if (isFinite(head.width)){
                ev.width = Math.max(6, head.width + 2);
              }
              if (restTargets.length){
                const targetX = targets[k];
                let distRest = Infinity;
                let distTarget = Infinity;
                for (const rx of restTargets){
                  distRest = Math.min(distRest, Math.abs(ev.x - rx));
                  distTarget = Math.min(distTarget, Math.abs(targetX - rx));
                }
                if (distRest <= restAvoid && distTarget > distRest + 6){
                  ev.x = targetX;
                }
              }
            } else {
              ev.x = targets[k];
            }
          }
        } else {
          for (let k = 0; k < ordered.length; k++){
            const ev = ordered[k];
            const targetX = targets[k];
            let bestHead = null;
            let bestDist = Infinity;
            for (const h of heads){
              const d = Math.abs(h.x - targetX);
              if (d < bestDist){
                bestDist = d;
                bestHead = h;
              }
            }
            if (bestHead){
              ev.x = Math.max(0, bestHead.x - offsetPx);
              if (isFinite(bestHead.top) && isFinite(bestHead.bottom)){
                const pad = Math.max(2, (bestHead.bottom - bestHead.top) * 0.2);
                ev.y1 = bestHead.top - pad;
                ev.y2 = bestHead.bottom + pad;
              }
              if (isFinite(bestHead.width)){
                ev.width = Math.max(6, bestHead.width + 2);
              }
              if (restTargets.length){
                let distRest = Infinity;
                let distTarget = Infinity;
                for (const rx of restTargets){
                  distRest = Math.min(distRest, Math.abs(ev.x - rx));
                  distTarget = Math.min(distTarget, Math.abs(targetX - rx));
                }
                if (distRest <= restAvoid && distTarget > distRest + 6){
                  ev.x = targetX;
                }
              }
            } else {
              ev.x = targetX;
            }
          }
        }
      }
    } catch(_) {}
    return { events: mapped, measureTotals: measureTotals || [], measureStarts: (timeline && timeline.measureStarts) ? timeline.measureStarts : [] };
  }

  function collectNoteheadGroupsByMeasure(){
    const map = new Map();
    const svg = scoreEl.querySelector('svg');
    const measureRects = getMeasureRectsForMapping();
    if (!svg || !measureRects || !measureRects.length) return map;
    const selector = '[class*="notehead"], [class*="NoteHead"], use[href*="notehead" i]';
    const svgBBox = svg.getBoundingClientRect();
    const headsAll = Array.from(svg.querySelectorAll(selector));
    const groupsByNote = new Map();
    headsAll.forEach(el => {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width <= 0 || r.height <= 0) return;
      const left = r.left - svgBBox.left;
      const right = r.right - svgBBox.left;
      const top = r.top - svgBBox.top;
      const bottom = r.bottom - svgBBox.top;
      const stavenote = (typeof el.closest === 'function')
        ? (el.closest('.vf-stavenote') || el.closest('[class*="StaveNote"]'))
        : null;
      const key = stavenote || el;
      let g = groupsByNote.get(key);
      if (!g){
        g = { minX: left, maxX: right, top, bottom };
        groupsByNote.set(key, g);
      } else {
        g.minX = Math.min(g.minX, left);
        g.maxX = Math.max(g.maxX, right);
        g.top = Math.min(g.top, top);
        g.bottom = Math.max(g.bottom, bottom);
      }
    });
    const baseGroups = Array.from(groupsByNote.values()).map(g => ({
      x: (g.minX + g.maxX) / 2,
      top: g.top,
      bottom: g.bottom,
      width: Math.max(2, g.maxX - g.minX)
    }));
    for (let mi=0; mi<measureRects.length; mi++){
      const mr = measureRects[mi];
      const prev = mi > 0 ? measureRects[mi - 1] : null;
      const next = mi < measureRects.length - 1 ? measureRects[mi + 1] : null;
      const leftBound = prev ? (prev.x + prev.width + mr.x) / 2 : (mr.x - 2);
      const rightBound = next ? (mr.x + mr.width + next.x) / 2 : (mr.x + mr.width + 2);
      const padY = Math.max(8, Math.min(24, mr.height * 0.25));
      const heads = [];
      baseGroups.forEach(g=>{
        const cx = g.x;
        const top = g.top;
        const bottom = g.bottom;
        const cy = (top + bottom) / 2;
        if (cx >= (leftBound - 1) && cx <= (rightBound + 1) && cy >= (mr.y - padY) && cy <= (mr.y + mr.height + padY)){
          heads.push({ x: cx, top, bottom, width: g.width });
        }
      });
      heads.sort((a,b)=>a.x-b.x);
      const groups = [];
      const eps = 6;
      heads.forEach(h=>{
        const last = groups[groups.length - 1];
        if (last && Math.abs(h.x - last.x) <= eps){
          last.x = (last.x + h.x) / 2;
          last.top = Math.min(last.top, h.top);
          last.bottom = Math.max(last.bottom, h.bottom);
          last.width = Math.max(last.width, h.width || 0);
        } else {
          groups.push({ x: h.x, top: h.top, bottom: h.bottom, width: h.width || 0 });
        }
      });
      map.set(mi, groups.map(g => ({ x: g.x, top: g.top, bottom: g.bottom, width: g.width })));
    }
    return map;
  }

  function collectOsmdEntriesByMeasure(){
    const map = new Map();
    try{
      const osmd = window.intervalRenderer && window.intervalRenderer.osmd;
      const ml = osmd && osmd.GraphicSheet && Array.isArray(osmd.GraphicSheet.MeasureList) ? osmd.GraphicSheet.MeasureList : null;
      if (!ml || !ml.length) return map;
      for (let mi = 0; mi < ml.length; mi++){
        const gm = ml[mi] && ml[mi][0];
        if (!gm || !Array.isArray(gm.staffEntries)) continue;
        const entries = [];
        gm.staffEntries.forEach(se => {
          const gves = Array.isArray(se.graphicalVoiceEntries) ? se.graphicalVoiceEntries : [];
          if (!gves.length) return;
          let vex = null;
          let bbox = null;
          for (const gve of gves){
            const v = gve && gve.mVexFlowStaveNote;
            if (!v) continue;
            const bb = (typeof v.getBoundingBox === 'function') ? v.getBoundingBox() : null;
            vex = v;
            bbox = bb || bbox;
            if (bb) break;
          }
          if (!vex) return;
          const x = bbox ? (bbox.getX() + bbox.getW()/2) : (typeof vex.getAbsoluteX === 'function' ? vex.getAbsoluteX() : null);
          if (!isFinite(x)) return;
          const top = bbox ? bbox.getY() : null;
          const bottom = bbox ? (bbox.getY() + bbox.getH()) : null;
          const width = bbox ? bbox.getW() : null;
          let hasNote = false;
          let hasRest = false;
          gves.forEach(gve => {
            const notes = gve && gve.parentVoiceEntry && Array.isArray(gve.parentVoiceEntry.notes) ? gve.parentVoiceEntry.notes : [];
            notes.forEach(n => {
              let isRest = false;
              if (n && typeof n.isRest === 'function') isRest = n.isRest();
              else if (n && typeof n.isRestFlag === 'boolean') isRest = n.isRestFlag;
              if (isRest) hasRest = true;
              else hasNote = true;
            });
          });
          const isRest = !hasNote && hasRest;
          const ts = se.relInMeasureTimestamp;
          const relVal = ts ? (ts.RealValue != null ? ts.RealValue : (ts.Numerator != null && ts.Denominator ? ts.Numerator / ts.Denominator : null)) : null;
          entries.push({ x, top, bottom, width, isRest, relVal });
        });
        if (entries.length) map.set(mi, entries);
      }
    }catch(_){}
    return map;
  }

  function collectStavenoteGroupsByMeasure(){
    const map = new Map();
    const svg = scoreEl.querySelector('svg');
    const measureRects = getMeasureRectsForMapping();
    if (!svg || !measureRects || !measureRects.length) return map;
    const svgBBox = svg.getBoundingClientRect();
    const noteheadSelector = '[class*="notehead"], [class*="NoteHead"], use[href*="notehead" i]';
    const stavesAll = Array.from(svg.querySelectorAll('.vf-stavenote, [class*="StaveNote"]'));
    const items = [];
    stavesAll.forEach(el => {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || r.width <= 0 || r.height <= 0) return;
      let headMinX = Infinity;
      let headMaxX = -Infinity;
      let headTop = Infinity;
      let headBottom = -Infinity;
      if (el.querySelectorAll){
        const heads = el.querySelectorAll(noteheadSelector);
        heads.forEach(h => {
          const hr = h.getBoundingClientRect ? h.getBoundingClientRect() : null;
          if (!hr || hr.width <= 0 || hr.height <= 0) return;
          const left = hr.left - svgBBox.left;
          const right = hr.right - svgBBox.left;
          const top = hr.top - svgBBox.top;
          const bottom = hr.bottom - svgBBox.top;
          headMinX = Math.min(headMinX, left);
          headMaxX = Math.max(headMaxX, right);
          headTop = Math.min(headTop, top);
          headBottom = Math.max(headBottom, bottom);
        });
      }
      const hasNotehead = isFinite(headMinX) && isFinite(headMaxX) && headMaxX > headMinX;
      if (hasNotehead){
        items.push({
          x: (headMinX + headMaxX) / 2,
          top: headTop,
          bottom: headBottom,
          width: Math.max(2, headMaxX - headMinX),
          hasNotehead: true
        });
      } else {
        const left = r.left - svgBBox.left;
        const right = r.right - svgBBox.left;
        const top = r.top - svgBBox.top;
        const bottom = r.bottom - svgBBox.top;
        items.push({
          x: (left + right) / 2,
          top,
          bottom,
          width: Math.max(2, right - left),
          hasNotehead: false
        });
      }
    });
    for (let mi=0; mi<measureRects.length; mi++){
      const mr = measureRects[mi];
      const prev = mi > 0 ? measureRects[mi - 1] : null;
      const next = mi < measureRects.length - 1 ? measureRects[mi + 1] : null;
      const leftBound = prev ? (prev.x + prev.width + mr.x) / 2 : (mr.x - 2);
      const rightBound = next ? (mr.x + mr.width + next.x) / 2 : (mr.x + mr.width + 2);
      const padY = Math.max(8, Math.min(24, mr.height * 0.25));
      const staves = [];
      items.forEach(it => {
        const cx = it.x;
        const cy = (it.top + it.bottom) / 2;
        if (cx >= (leftBound - 1) && cx <= (rightBound + 1) && cy >= (mr.y - padY) && cy <= (mr.y + mr.height + padY)){
          staves.push(it);
        }
      });
      staves.sort((a,b)=>a.x-b.x);
      map.set(mi, staves);
    }
    return map;
  }

  function buildNoteTimeline(bpm){
    const tempo = Math.max(1, bpm || 60);
    const secPerQuarter = 60 / tempo;
    const rawTimeline = parseTimelineFromXML();
    const mapped = mapEventsToPositions(rawTimeline);
    const events = (mapped && mapped.events) ? mapped.events : [];
    return events.map(ev => {
      const isRest = !!ev.isRest;
      const top = (!isRest && isFinite(ev.y1)) ? ev.y1 : null;
      const height = (!isRest && isFinite(ev.y2) && isFinite(ev.y1)) ? Math.max(2, ev.y2 - ev.y1) : null;
      const width = (!isRest && isFinite(ev.width)) ? Math.max(4, ev.width) : null;
      const durBeats = isFinite(ev.durBeats) ? Math.max(0, ev.durBeats) : 0;
      const durSec = durBeats * secPerQuarter;
      return {
        measureIndex: ev.measure,
        x: ev.x,
        top,
        height,
        width,
        isRest,
        durBeats,
        durSec,
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
      const width = state.cursorWidth || 12;
      positionCursorRect(x - width / 2, top, width, height);
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
    if (state.cursorEl) state.cursorEl.style.display = 'none';
    const events = Array.isArray(state.noteEvents) ? state.noteEvents : [];
    const noteEvents = events.filter(ev => !ev.isRest);
    const hasNote = noteEvents.length > 0;
    if (!events.length || !hasNote){
      if (state.cursorEl) state.cursorEl.style.display = 'none';
      const totalSec = (state.measureRects.length || 0) * (state.measureDuration || 0);
      const holdMs = Math.max(220, totalSec * 1000);
      state.noteTimerId = setTimeout(() => {
        if (state.measureRects.length > 0) applyClipForIndex(state.measureRects.length - 1);
        completeChallengeCycle();
      }, holdMs);
      return;
    }

    if (!state.restTimeouts) state.restTimeouts = [];
    state.restTimeouts.forEach(t => { try { clearTimeout(t); } catch(_) {} });
    state.restTimeouts = [];

    const startTs = performance.now();
    let idx = 0;
    state.lastNoteMeasure = -1;

    function placeAtEvent(ev){
      if (!state.cursorEl) return;
      if (ev.isRest){
        state.cursorEl.style.display = 'none';
        return;
      }
      if (!state.cursorEnabled) return;
      const m = state.measureRects[ev.measureIndex];
      if (!m) return;
      state.cursorEl.style.display = 'block';
      const fallback = getCursorPlacementForMeasure(m);
      const top = isFinite(ev.top) ? ev.top : fallback.top;
      const height = isFinite(ev.height) && ev.height > 0 ? ev.height : fallback.height;
      const width = (isFinite(ev.width) && ev.width > 0) ? ev.width : (state.cursorWidth || 12);
      positionCursorRect(ev.x - width / 2, top, width, height);
    }

    function scheduleNext(){
      if (idx >= noteEvents.length){
        if (state.measureRects.length > 0) applyClipForIndex(state.measureRects.length - 1);
        completeChallengeCycle();
        return;
      }
      const ev = noteEvents[idx];
      const delay = Math.max(0, ev.timeSec * 1000 - (performance.now() - startTs));
      state.noteTimerId = setTimeout(() => {
        if (!state.active) return;
        if (ev.measureIndex > 0 && ev.measureIndex !== state.lastNoteMeasure){
          applyClipForIndex(ev.measureIndex - 1);
        }
        placeAtEvent(ev);
        state.lastNoteMeasure = ev.measureIndex;
        idx++;
        if (idx >= noteEvents.length){
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

    // Hide cursor during gaps between notes (rests)
    if (state.cursorEl){
      const eps = 1e-4;
      for (let i=0; i<noteEvents.length; i++){
        const current = noteEvents[i];
        const next = noteEvents[i+1];
        const end = current.timeSec + (current.durSec || 0);
        const startGap = Math.max(0, end);
        const endGap = next ? next.timeSec : null;
        if (endGap != null && (endGap - startGap) > eps){
          const hideDelay = Math.max(0, startGap * 1000 - (performance.now() - startTs));
          const tid = setTimeout(() => {
            if (!state.active || !state.cursorEl) return;
            state.cursorEl.style.display = 'none';
          }, hideDelay);
          state.restTimeouts.push(tid);
        } else if (endGap == null && (current.durSec || 0) > eps){
          const hideDelay = Math.max(0, (current.timeSec + current.durSec) * 1000 - (performance.now() - startTs));
          const tid = setTimeout(() => {
            if (!state.active || !state.cursorEl) return;
            state.cursorEl.style.display = 'none';
          }, hideDelay);
          state.restTimeouts.push(tid);
        }
      }
      // If the first note starts after time 0, hide until it appears
      if (noteEvents[0].timeSec > eps){
        const tid = setTimeout(() => {
          if (!state.active || !state.cursorEl) return;
          state.cursorEl.style.display = 'none';
        }, 0);
        state.restTimeouts.push(tid);
      }
    }
    scheduleNext();
  }

  function startChallengeMetronome(bpm){
    if (!state.metronomeEnabled) return;
    if (state.metronomeTimerId) { clearInterval(state.metronomeTimerId); state.metronomeTimerId = null; }
    const tsInfo = getTimeSignatureInfo();
    const beatSec = (60/Math.max(1,bpm)) * (4/tsInfo.den);
    let beat = 0;
    function strongBeat(n){
      if (tsInfo.is68) return n === 1 || n === 4;
      return n === 1;
    }
    function tick(){
      beat = (beat % tsInfo.beats) + 1;
      ensureClickAudio();
      state.lastBeatTimeMs = performance.now();
      try { playClick(strongBeat(beat)); } catch(_) {}
    }
    tick();
    state.metronomeTimerId = setInterval(tick, beatSec * 1000);
  }

  function startJumpCursor(bpm){
    startNoteCursor(bpm);
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

    if (typeof setMetronomeTempo === 'function') {
      setMetronomeTempo(bpm);
    } else {
      const headerInput = document.getElementById('headerMetronomeBpm');
      if (headerInput) headerInput.value = String(bpm);
    }

    showCountdownUI(prepSec);
    const tStart = Date.now();
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); }
    state.countdownTimerId = setInterval(()=>{
      const elapsed = (Date.now() - tStart)/1000;
      updateCountdownUI(Math.max(0, prepSec - elapsed));
    }, 200);

    state.musicXML = null;
    if (typeof window.generateIntervals === 'function') {
      try { await window.generateIntervals(); } catch(_) {}
    }
    state.musicXML = getCurrentMelodyXML();
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
      state.musicXML = null;
      if (typeof window.generateIntervals === 'function') {
        try { await window.generateIntervals(); } catch(_) {}
      }
      state.musicXML = getCurrentMelodyXML();
      await ensureScoreReady();
      state.measureRects = await waitForMeasuresReady(5000);
      state.measureRects = await waitForStableMeasures(state.measureRects, 400);
    }

    if (!state.measureRects || !state.measureRects.length){
      alert('未检测到小节，无法启动挑战');
      stopChallenge();
      return;
    }

    state.systems = computeSystemsFromMeasures(state.measureRects);
    state.measureBuckets = buildMeasureElementIndex();
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
    state.observer = new MutationObserver(() => {
      const currentSvg = scoreEl.querySelector('svg');
      if (currentSvg !== state.activeSvg) { stopChallenge(); }
    });
    state.observer.observe(scoreEl, { childList: true, subtree: false });
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
    if (state.restTimeouts && state.restTimeouts.length){
      state.restTimeouts.forEach(t => { try { clearTimeout(t); } catch(_) {} });
      state.restTimeouts = [];
    }
    if (state.beatTimerId) { clearInterval(state.beatTimerId); state.beatTimerId = null; }
    if (state.metronomeTimerId) { clearInterval(state.metronomeTimerId); state.metronomeTimerId = null; }
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
    removeCountInLabel();
    restoreHiddenElements();
    clearOverlay();
    clearContentClip();
    hideCountdownUI();
    state.measureBuckets = null;
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
