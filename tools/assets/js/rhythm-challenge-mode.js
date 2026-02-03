// IC Rhythm Challenge Mode
// Scope: Rhythm tool only.
(function(){
  const scoreEl = document.getElementById('score');
  const toggleEl = document.getElementById('challengeModeToggle');
  const cursorToggleEl = document.getElementById('challengeCursorToggle');
  const metronomeToggleEl = document.getElementById('challengeMetronomeToggle');
  const hideToggleEl = document.getElementById('challengeHideToggle');
  const calibrationToggleEl = document.getElementById('challengeCalibrationToggle');
  const modalModeToggleEl = document.getElementById('challengeModeToggleModal');

  const svgns = 'http://www.w3.org/2000/svg';
  const CURSOR_WIDTH = 12;
  const CURSOR_HALF = CURSOR_WIDTH / 2;
  const CURSOR_COLOR_VAR = 'var(--primary-blue)';
  const CURSOR_FILL_OPACITY = 0.25;
  const CURSOR_STROKE_OPACITY = 0.4;
  const CURSOR_RADIUS = 4;

  const state = {
    active: false,
    rafId: null,
    countdownTimerId: null,
    countInTimerId: null,
    metronomeTimerId: null,
    schedulerId: null,
    jumpTimeouts: [],
    loopTimerId: null,
    observer: null,
    startTs: 0,
    measureRects: [],
    measureDuration: 0,
    beatsPerMeasure: 4,
    overlayEl: null,
    cursor1El: null,
    cursor2El: null,
    hideLayerEl: null,
    hiddenElements: new Map(),
    measureNoteRanges: null,
    masked: new Set(),
    lastIndex: -1,
    activeSvg: null,
    voiceLineYs: null,
    audioCtx: null,
    cursorEnabled: true,
    metronomeEnabled: true,
    hideEnabled: true,
    calibrationEnabled: false,
    lastBeatTimeMs: 0,
    anchorPerf: null,
    anchorAcTime: null,
    anchorPerfStart: null
  };

  function $(id){ return document.getElementById(id); }

  function getOsmdInstance(){
    return window.__rhythmOsmd || window.osmd || null;
  }

  function triggerGenerateRhythm(){
    if (typeof window.generateRhythm === 'function'){
      try { window.generateRhythm(); return true; } catch(_) { return false; }
    }
    const btn = document.getElementById('generateBtn');
    if (btn){
      try { btn.click(); return true; } catch(_) { return false; }
    }
    return false;
  }

  function isMidiConnected(){
    try {
      return !!(window.__icMidi && typeof window.__icMidi.getState === 'function' && window.__icMidi.getState().connected);
    } catch(_) {
      return false;
    }
  }

  function applyCalibrationAuto(connected){
    if (!calibrationToggleEl) return;
    if (!connected){
      if (calibrationToggleEl.checked){
        calibrationToggleEl.checked = false;
        updateToggleVisual(calibrationToggleEl);
      }
      state.calibrationEnabled = false;
      state.calibrationOffsetSec = 0;
      clearJudgeStyles();
      return;
    }
    state.calibrationEnabled = !!calibrationToggleEl.checked;
  }

  function getCurrentRhythmXML(){
    try {
      if (typeof window.__rhythmLastXml === 'string' && window.__rhythmLastXml.length > 0) {
        return window.__rhythmLastXml;
      }
      if (typeof rhythmHistory !== 'undefined' && typeof currentHistoryIndex !== 'undefined'){
        const entry = rhythmHistory[currentHistoryIndex];
        if (entry && typeof entry.xml === 'string' && entry.xml.length > 0) return entry.xml;
      }
    } catch (_) {}
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
    }catch(_){ }
    return null;
  }

  function parseMeasureDurationSec(bpm){
    const xml = getCurrentRhythmXML();
    let num = 4, den = 4;
    const ts = xml ? parseTimeSigFromXML(xml) : null;
    if (ts){ num = ts.num; den = ts.den; }
    const secPerQuarter = 60 / Math.max(1, bpm);
    const secPerMeasure = (num * (4/den)) * secPerQuarter;
    if (!isFinite(secPerMeasure) || secPerMeasure < 0.25){
      return 4 * secPerQuarter;
    }
    return secPerMeasure;
  }

  function getTimeSignatureInfo(){
    const xml = getCurrentRhythmXML();
    const ts = xml ? parseTimeSigFromXML(xml) : null;
    let beats = ts ? ts.num : 4;
    let den = ts ? ts.den : 4;
    if (!isFinite(beats) || beats <= 0) beats = 4;
    if (!isFinite(den) || den <= 0) den = 4;
    const is68 = beats === 6 && den === 8;
    return { beats, den, is68 };
  }

  function getVoiceMode(){
    const el = document.getElementById('voiceMode');
    return el ? String(el.value || '1') : '1';
  }

  function getSvgMetrics(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return null;
    const containerRect = scoreEl.getBoundingClientRect();
    const svgBBox = svg.getBoundingClientRect();
    let vb = { x: 0, y: 0, width: svgBBox.width, height: svgBBox.height };
    if (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
      vb = svg.viewBox.baseVal;
    }
    return {
      svg,
      vb,
      scaleX: svgBBox.width / (vb.width || 1),
      scaleY: svgBBox.height / (vb.height || 1),
      offsetX: svgBBox.left - containerRect.left + scoreEl.scrollLeft,
      offsetY: svgBBox.top - containerRect.top + scoreEl.scrollTop
    };
  }

  function getStaffLineSpacingSvgUnits(){
    const metrics = getSvgMetrics();
    if (!metrics) return 0;
    const { svg, vb } = metrics;
    const paths = Array.from(svg.querySelectorAll('path'));
    const ys = [];
    for (const p of paths){
      const d = p.getAttribute('d') || '';
      const nums = d.match(/-?\d+\.?\d*/g);
      if (!nums || nums.length < 4) continue;
      const y1 = parseFloat(nums[1]);
      const y2 = parseFloat(nums[3]);
      if (!isFinite(y1) || !isFinite(y2)) continue;
      if (Math.abs(y1 - y2) > 0.2) continue;
      ys.push(y1 - vb.y);
    }
    ys.sort((a,b)=>a-b);
    const uniq = [];
    const eps = 0.5;
    for (const y of ys){
      if (!uniq.length || Math.abs(y - uniq[uniq.length - 1]) > eps) uniq.push(y);
    }
    if (uniq.length < 2) return 0;
    const spacings = [];
    for (let i = 1; i < uniq.length; i += 1) spacings.push(uniq[i] - uniq[i - 1]);
    return spacings.reduce((sum, v) => sum + v, 0) / spacings.length;
  }

  function getOSMDUnitScale(){
    const metrics = getSvgMetrics();
    if (!metrics) return 0;
    const osmdInst = getOsmdInstance();
    if (osmdInst && osmdInst.EngravingRules && typeof osmdInst.EngravingRules.UnitInPixels === 'number') {
      return osmdInst.EngravingRules.UnitInPixels * (osmdInst.zoom || 1);
    }
    try {
      if (osmdInst && osmdInst.GraphicSheet && Array.isArray(osmdInst.GraphicSheet.MeasureList)) {
        const rawXs = [];
        const measures = osmdInst.GraphicSheet.MeasureList;
        for (const m of measures) {
          const gm = m && m[0];
          if (!gm || !gm.staffEntries) continue;
          gm.staffEntries.forEach(se => {
            const entries = se.graphicalVoiceEntries || se.GraphicalVoiceEntries || [];
            entries.forEach(ve => {
              const notes = ve.notes || ve.Notes || [];
              notes.forEach(n => {
                const bb = n && n.boundingBox;
                if (!bb || !bb.absolutePosition || !bb.size) return;
                const xRaw = bb.absolutePosition.x + bb.size.width * 0.5;
                if (isFinite(xRaw)) rawXs.push(xRaw);
              });
            });
          });
        }
        const metricsSvg = metrics.svg;
        const scoreRect = scoreEl.getBoundingClientRect();
        const noteEls = metricsSvg.querySelectorAll('[class*="notehead"], [class*="NoteHead"], [class*="stavenote"], use[href*="notehead" i]');
        const domXs = [];
        noteEls.forEach(el => {
          const r = el.getBoundingClientRect();
          if (!r || r.width <= 0) return;
          domXs.push(r.left - scoreRect.left + r.width / 2);
        });
        if (rawXs.length >= 2 && domXs.length >= 2) {
          rawXs.sort((a,b)=>a-b);
          domXs.sort((a,b)=>a-b);
          const rawSpan = rawXs[rawXs.length - 1] - rawXs[0];
          const domSpan = domXs[domXs.length - 1] - domXs[0];
          if (rawSpan > 0 && domSpan > 0) {
            const unitScale = domSpan / (rawSpan * metrics.scaleX);
            if (isFinite(unitScale) && unitScale > 0) return unitScale;
          }
        }
      }
    } catch(_) {}
    const spacing = getStaffLineSpacingSvgUnits();
    const osmdInst2 = getOsmdInstance();
    const osmdSpacing = (osmdInst2 && osmdInst2.EngravingRules && typeof osmdInst2.EngravingRules.BetweenStaffLinesDistance === 'number')
      ? osmdInst2.EngravingRules.BetweenStaffLinesDistance
      : 1;
    return spacing > 0 ? spacing / osmdSpacing : 0;
  }

  function osmdToScorePx(x, y){
    const metrics = getSvgMetrics();
    if (!metrics) return { x: 0, y: 0 };
    const { vb, scaleX, scaleY } = metrics;
    const pxX = (x - vb.x) * scaleX;
    const pxY = (y - vb.y) * scaleY;
    return { x: pxX, y: pxY };
  }

  function getOSMDMeasureRects(){
    try {
      const osmdInst = getOsmdInstance();
      if (!osmdInst || !osmdInst.GraphicSheet || !Array.isArray(osmdInst.GraphicSheet.MeasureList)) return [];
      const scale = getOSMDUnitScale();
      if (!scale) return [];
      const rects = [];
      const measures = osmdInst.GraphicSheet.MeasureList;
      for (let i = 0; i < measures.length; i += 1) {
        const gm = measures[i] && measures[i][0];
        if (!gm || !gm.boundingBox) continue;
        const bb = gm.boundingBox;
        if (!bb.absolutePosition || !bb.size) continue;
        const xSvg = bb.absolutePosition.x * scale;
        const ySvg = bb.absolutePosition.y * scale;
        const wSvg = bb.size.width * scale;
        const hSvg = bb.size.height * scale;
        const topLeft = osmdToScorePx(xSvg, ySvg);
        rects.push({ x: topLeft.x, y: topLeft.y, width: wSvg, height: hSvg });
      }
      return rects;
    } catch(_) { return []; }
  }


  function ensureOverlay(){
    if (!scoreEl) return null;
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
    let cursor = g.querySelector('#challengeCursorRect');
    if (!cursor){
      cursor = document.createElementNS(svgns, 'rect');
      cursor.setAttribute('id', 'challengeCursorRect');
      cursor.setAttribute('stroke-width', '1');
      cursor.setAttribute('rx', String(CURSOR_RADIUS));
      cursor.setAttribute('ry', String(CURSOR_RADIUS));
      cursor.setAttribute('width', String(CURSOR_WIDTH));
      cursor.setAttribute('height', '0');
      cursor.style.fill = CURSOR_COLOR_VAR;
      cursor.style.fillOpacity = String(CURSOR_FILL_OPACITY);
      cursor.style.stroke = CURSOR_COLOR_VAR;
      cursor.style.strokeOpacity = String(CURSOR_STROKE_OPACITY);
      cursor.style.transition = 'opacity 0.12s ease';
      g.appendChild(cursor);
    }
    state.overlayEl = g;
    state.cursor1El = cursor;
    state.cursor2El = null;
    return g;
  }

  function ensureHideLayer(){
    return null;
  }

  function clearOverlay(){
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
    state.masked.clear();
    state.lastIndex = -1;
    state.voiceLineYs = null;
    if (state.overlayEl && state.overlayEl.parentNode){ state.overlayEl.parentNode.removeChild(state.overlayEl); }
    state.overlayEl = null;
    state.cursor1El = null;
    state.cursor2El = null;
  }

  function clearHideLayer(){
    if (state.hideLayerEl && state.hideLayerEl.parentNode){
      state.hideLayerEl.parentNode.removeChild(state.hideLayerEl);
    }
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    const legacy = svg ? svg.querySelector('#challengeHideLayer') : null;
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
    restoreHiddenNotes();
    state.hideLayerEl = null;
    state.masked.clear();
  }

  function maskMeasure(index){
    hideMeasureNotes(index);
  }

  function hideMeasureNotes(index){
    if (!state.hideEnabled) return;
    if (!state.measureRects || !state.measureRects[index] || state.masked.has(index)) return;
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return;
    const selectors = [
      '.vf-stavenote', '.vf-note', '.vf-notehead', '.vf-stem', '.vf-flag',
      '.vf-beam', '.vf-stavetie', '.vf-modifiers', '.vf-accidental', '.vf-dot',
      '.vf-rest', '.vf-tuplet', '.vf-articulation', '.vf-ornament',
      '.vf-textnote', '.vf-gracenote', '.vf-gracenote-group', '.vf-ghost-note',
      '.vf-annotation', '.vf-lyric', '[class*="notehead"]', '[class*="NoteHead"]'
    ].join(',');
    const m = state.measureRects[index];
    const svgBBox = svg.getBoundingClientRect();
    const vPad = Math.max(24, m.height * 0.6);
    const hPad = Math.max(4, Math.min(10, m.width * 0.01));
    let leftBound = m.x - hPad;
    let rightBound = m.x + m.width + hPad;
    try {
      let headMap = collectNoteheadCentersByMeasure();
      if (!headMap || !headMap.size) headMap = collectNoteheadCentersByMeasureDom();
      const xs = headMap.get(index) || [];
      if (xs.length){
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const tightPad = Math.max(4, Math.min(8, hPad));
        leftBound = minX - tightPad;
        rightBound = maxX + tightPad;
      }
    } catch(_) {}
    const topBound = m.y - vPad;
    const bottomBound = m.y + m.height + vPad;
    const elements = svg.querySelectorAll(selectors);
    elements.forEach(el => {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (!r || (r.width <= 0 && r.height <= 0)) return;
      const left = r.left - svgBBox.left;
      const top = r.top - svgBBox.top;
      const cx = left + r.width / 2;
      const cy = top + r.height / 2;
      const within = (cx >= leftBound && cx <= rightBound && cy >= topBound && cy <= bottomBound);
      if (within){
        if (!state.hiddenElements.has(el)) {
          state.hiddenElements.set(el, el.style.visibility || '');
        }
        el.style.visibility = 'hidden';
      }
    });
    state.masked.add(index);
  }

  function restoreHiddenNotes(){
    if (!state.hiddenElements || !state.hiddenElements.size) return;
    state.hiddenElements.forEach((prev, el) => {
      el.style.visibility = prev;
    });
    state.hiddenElements.clear();
  }

  function computeVoiceLineYs(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return null;
    const containerRect = scoreEl.getBoundingClientRect();
    const heads = Array.from(svg.querySelectorAll('g.vf-notehead, .vf-notehead, use[href*="notehead" i]'));
    if (heads.length < 2) return null;
    const ys = heads.map(h => {
      try {
        const r = h.getBoundingClientRect();
        return r.top - containerRect.top + scoreEl.scrollTop + r.height / 2;
      } catch(_) { return null; }
    }).filter(v => Number.isFinite(v));
    if (ys.length < 2) return null;
    ys.sort((a,b)=>a-b);
    const clusters = [];
    const threshold = 6;
    ys.forEach(y => {
      if (!clusters.length || Math.abs(y - clusters[clusters.length - 1].mean) > threshold){
        clusters.push({ sum: y, count: 1, mean: y });
      } else {
        const c = clusters[clusters.length - 1];
        c.sum += y; c.count += 1; c.mean = c.sum / c.count;
      }
    });
    if (clusters.length < 2) return null;
    const top = clusters[0].mean;
    const bottom = clusters[clusters.length - 1].mean;
    return { v1: top, v2: bottom };
  }

  function setLine(line, x, y1, y2){
    if (!line) return;
    const isSvg = line instanceof SVGElement;
    if (isSvg){
      line.setAttribute('x1', String(x));
      line.setAttribute('x2', String(x));
      line.setAttribute('y1', String(y1));
      line.setAttribute('y2', String(y2));
      return;
    }
    const top = Math.min(y1, y2);
    const height = Math.max(2, Math.abs(y2 - y1));
    line.style.transform = `translateX(${x}px)`;
    line.style.top = `${top}px`;
    line.style.height = `${height}px`;
  }

  function animateCursor(startTs){
    let elapsedSec = 0;
    let md = 0;
    const met = (typeof window.getMetronomeState === 'function') ? window.getMetronomeState() : null;
    const ac = met && met.audioContext ? met.audioContext : null;
    const beatsPM = state.beatsPerMeasure || 4;
    if (ac){
      const beatDur = 60/Math.max(1, met.tempo || 60);
      md = beatsPM * beatDur;
      const nowAc = ac.currentTime;
      if (state.anchorAcTime == null) state.anchorAcTime = nowAc;
      elapsedSec = Math.max(0, nowAc - state.anchorAcTime);
    } else {
      const now = performance.now();
      const perfAnchor = state.anchorPerf || startTs || now;
      elapsedSec = Math.max(0, (now - perfAnchor) / 1000);
      md = state.measureDuration || (beatsPM * (60/80));
    }

    const totalMeasures = state.measureRects.length;
    let idx = Math.floor(elapsedSec / Math.max(1e-6, md));
    if (idx >= totalMeasures){
      maskMeasure(totalMeasures - 1);
      stopChallenge();
      return;
    }
    const within = elapsedSec - idx * md;
    const frac = Math.max(0, Math.min(1, md > 0 ? (within / md) : 0));
    const prev = idx - 1;
    if (prev >= 0 && frac >= 0.06) {
      maskMeasure(prev);
    }
    const m = state.measureRects[idx];
    const x = m.x + m.width * frac;

    if (!state.cursor1El || !state.cursor1El.parentNode){
      ensureOverlay();
    }
    if (state.cursor1El){
      const y1 = m.y + m.height * 0.05;
      const y2 = y1 + Math.max(2, m.height * 0.9);
      applyCursorAt(x, y1, y2, idx);
    }

    state.lastIndex = idx;
    state.rafId = requestAnimationFrame(()=>animateCursor(startTs));
  }

  // ===== Jump cursor (aligned with melody tool) =====
  function buildOsmdTimeline(bpm){
    try{
      const osmdInst = getOsmdInstance();
      const sheet = osmdInst && (osmdInst.sheet || osmdInst.MusicSheet);
      const sourceMeasures = sheet && Array.isArray(sheet.sourceMeasures) ? sheet.sourceMeasures : null;
      const measures = osmdInst && osmdInst.GraphicSheet && Array.isArray(osmdInst.GraphicSheet.MeasureList)
        ? osmdInst.GraphicSheet.MeasureList
        : null;
      const scale = getOSMDUnitScale();
      if (!sourceMeasures || !measures || !measures.length || !scale) return null;
      const secondsPerWhole = (60 / Math.max(1, bpm || 60)) * 4;
      const events = [];
      const measureStarts = [];
      for (let mi = 0; mi < measures.length; mi += 1){
        const baseAbs = sourceMeasures[mi] && sourceMeasures[mi].absoluteTimestamp
          ? sourceMeasures[mi].absoluteTimestamp.realValue
          : null;
        if (typeof baseAbs !== 'number') continue;
        measureStarts[mi] = baseAbs;
        const gm = measures[mi] && measures[mi][0];
        if (!gm || !gm.staffEntries) continue;
        gm.staffEntries.forEach(se => {
          const rel = se.relInMeasureTimestamp ? se.relInMeasureTimestamp.realValue : null;
          if (typeof rel !== 'number') return;
          const entries = se.graphicalVoiceEntries || se.GraphicalVoiceEntries || [];
          let hasPlayable = false;
          let bb = null;
          entries.forEach(ve => {
            const notes = ve.notes || ve.Notes || [];
            notes.forEach(n => {
              const src = n && n.sourceNote;
              if (src && src.isRestFlag) return;
              hasPlayable = true;
            });
            if (!bb && ve && ve.boundingBox && ve.boundingBox.size && ve.boundingBox.size.width > 0){
              bb = ve.boundingBox;
            }
          });
          if (!hasPlayable) return;
          if (!bb && se.boundingBox && se.boundingBox.size && se.boundingBox.size.width > 0){
            bb = se.boundingBox;
          }
          if (!bb || !bb.absolutePosition || !bb.size) return;
          const xSvg = (bb.absolutePosition.x + bb.size.width * 0.5) * scale;
          const x = osmdToScorePx(xSvg, 0).x;
          const timeSec = (baseAbs + rel) * secondsPerWhole;
          if (isFinite(x) && isFinite(timeSec)) events.push({ timeSec, x, measureIndex: mi });
        });
      }
      if (!events.length) return null;
      events.sort((a,b)=> a.timeSec - b.timeSec || a.x - b.x);
      const collapsed = [];
      const eps = 1e-4;
      for (const ev of events){
        const last = collapsed[collapsed.length - 1];
        if (last && Math.abs(ev.timeSec - last.timeSec) <= eps) continue;
        collapsed.push(ev);
      }
      return { events: collapsed, measureStarts };
    }catch(_){
      return null;
    }
  }

  function parseTimelineFromXML(){
    try{
      const xml = getCurrentRhythmXML();
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
      let absQN = 0;
      const tieOpenByVoice = new Map();
      for (let mi = 0; mi < measures.length; mi += 1){
        const m = measures[mi];
        const attr = m.querySelector('attributes');
        if (attr){
          const div = attr.querySelector('divisions');
          if (div) divisions = Math.max(1, parseInt(div.textContent || '1', 10) || 1);
          const time = attr.querySelector('time');
          if (time){
            const b = time.querySelector('beats');
            const bt = time.querySelector('beat-type');
            if (b && bt){
              beatsNum = parseInt(b.textContent || '4', 10) || 4;
              beatType = parseInt(bt.textContent || '4', 10) || 4;
            }
          }
        }
        measureStarts.push(absQN);
        const measureTotalQN = beatsNum * (4 / beatType);
        measureTotals.push(measureTotalQN);
        let posDiv = 0;
        const children = Array.from(m.children || []);
        for (let ni = 0; ni < children.length; ni += 1){
          const node = children[ni];
          if (!node || node.nodeType !== 1) continue;
          const tag = node.tagName.toLowerCase();
          if (tag === 'backup' || tag === 'forward'){
            const durEl = node.querySelector('duration');
            const durDiv = durEl ? Math.max(0, parseInt(durEl.textContent || '0', 10) || 0) : 0;
            if (tag === 'backup') posDiv = Math.max(0, posDiv - durDiv);
            else posDiv += durDiv;
            continue;
          }
          if (tag !== 'note') continue;
          const n = node;
          const isRest = !!n.querySelector('rest');
          const durEl = n.querySelector('duration');
          const durDiv = durEl ? Math.max(0, parseInt(durEl.textContent || '0', 10) || 0) : 0;
          const durQN = durDiv / divisions;
          const isChord = !!n.querySelector('chord');
          const ties = [];
          n.querySelectorAll('tie').forEach(x => {
            const t = x.getAttribute('type');
            if (t) ties.push(t);
          });
          n.querySelectorAll('notations tied').forEach(x => {
            const t = x.getAttribute('type');
            if (t) ties.push(t);
          });
          const hasStart = ties.includes('start');
          const hasStop = ties.includes('stop');
          const voiceEl = n.querySelector('voice');
          const voiceKey = voiceEl ? (voiceEl.textContent || '').trim() : '1';
          let pitchKey = null;
          if (!isRest){
            const pitch = n.querySelector('pitch');
            if (pitch){
              const step = (pitch.querySelector('step')?.textContent || '').trim();
              const alter = (pitch.querySelector('alter')?.textContent || '').trim();
              const octave = (pitch.querySelector('octave')?.textContent || '').trim();
              pitchKey = `${step}|${alter}|${octave}`;
            } else {
              const unp = n.querySelector('unpitched');
              const step = (unp?.querySelector('display-step')?.textContent || '').trim();
              const octave = (unp?.querySelector('display-octave')?.textContent || '').trim();
              if (step || octave) pitchKey = `unp|${step}|${octave}`;
            }
          }
          let openSet = tieOpenByVoice.get(voiceKey);
          if (!openSet){
            openSet = new Set();
            tieOpenByVoice.set(voiceKey, openSet);
          }
          const startQNAbs = absQN + (posDiv / divisions);
          const startQNInMeasure = (posDiv / divisions);

          if (!isChord && !isRest){
            if (hasStop && !hasStart){
              // tie end: no new event
              if (pitchKey && openSet.has(pitchKey)) openSet.delete(pitchKey);
            } else if (hasStart && hasStop){
              // tie continuation: keep open, no event
              if (pitchKey && !openSet.has(pitchKey)) openSet.add(pitchKey);
            } else if (hasStart){
              if (pitchKey){
                if (!openSet.has(pitchKey)) {
                  events.push({ measure: mi, posBeats: startQNInMeasure, absBeats: startQNAbs, durBeats: durQN, isRest: false });
                  openSet.add(pitchKey);
                }
              } else {
                events.push({ measure: mi, posBeats: startQNInMeasure, absBeats: startQNAbs, durBeats: durQN, isRest: false });
              }
            } else {
              events.push({ measure: mi, posBeats: startQNInMeasure, absBeats: startQNAbs, durBeats: durQN, isRest: false });
            }
          } else {
            if (pitchKey && hasStop && !hasStart && openSet.has(pitchKey)) openSet.delete(pitchKey);
          }
          if (!isChord) posDiv += durDiv;
        }
        absQN += measureTotalQN;
      }
      return { events, measureStarts, measureTotals };
    } catch(_){
      return { events: [], measureStarts: [], measureTotals: [] };
    }
  }

  function collectNoteheadCentersByMeasure(){
    const map = new Map();
    try {
      const osmdInst = getOsmdInstance();
      const measures = osmdInst && osmdInst.GraphicSheet && Array.isArray(osmdInst.GraphicSheet.MeasureList)
        ? osmdInst.GraphicSheet.MeasureList
        : null;
      const scale = getOSMDUnitScale();
      if (measures && measures.length && scale){
        for (let mi = 0; mi < measures.length; mi += 1){
          const gm = measures[mi] && measures[mi][0];
          if (!gm || !gm.staffEntries) continue;
          const xs = [];
          gm.staffEntries.forEach(se => {
            const entries = se.graphicalVoiceEntries || se.GraphicalVoiceEntries || [];
            entries.forEach(ve => {
              const notes = ve.notes || ve.Notes || [];
              notes.forEach(n => {
                const src = n && n.sourceNote;
                if (src && src.isRestFlag) return;
                const bb = n && n.boundingBox;
                if (!bb || !bb.absolutePosition || !bb.size) return;
                const xSvg = (bb.absolutePosition.x + bb.size.width * 0.5) * scale;
                const px = osmdToScorePx(xSvg, 0).x;
                if (isFinite(px)) xs.push(px);
              });
            });
          });
          xs.sort((a,b)=>a-b);
          const uniq = [];
          const eps = 0.8;
          xs.forEach(x=>{
            if (!uniq.length || Math.abs(x - uniq[uniq.length - 1]) > eps) uniq.push(x);
          });
          map.set(mi, uniq);
        }
        if (map.size) return map;
      }
    } catch(_) {}
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg || !state.measureRects || !state.measureRects.length) return map;
    const svgBBox = svg.getBoundingClientRect();
    const selector = '[class*="notehead"], [class*="NoteHead"], [class*="stavenote"], use[href*="notehead" i], g.vf-notehead, .vf-notehead';
    const headsAll = Array.from(svg.querySelectorAll(selector));
    for (let mi = 0; mi < state.measureRects.length; mi += 1){
      const mr = state.measureRects[mi];
      const xs = [];
      headsAll.forEach(el => {
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!r || r.width <= 0 || r.height <= 0) return;
        const cx = r.left - svgBBox.left + r.width / 2;
        const cy = r.top - svgBBox.top + r.height / 2;
        if (cx >= mr.x && cx <= mr.x + mr.width && cy >= mr.y && cy <= mr.y + mr.height){
          xs.push(cx);
        }
      });
      xs.sort((a,b)=>a-b);
      const uniq = [];
      const eps = 0.8;
      xs.forEach(x=>{
        if (!uniq.length || Math.abs(x - uniq[uniq.length - 1]) > eps) uniq.push(x);
      });
      map.set(mi, uniq);
    }
    return map;
  }

  function collectNoteheadCentersByMeasureDom(){
    const map = new Map();
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg || !state.measureRects || !state.measureRects.length) return map;
    const svgBBox = svg.getBoundingClientRect();
    const selector = '[class*="notehead"], [class*="NoteHead"], [class*="stavenote"], use[href*="notehead" i], g.vf-notehead, .vf-notehead';
    const headsAll = Array.from(svg.querySelectorAll(selector));
    for (let mi = 0; mi < state.measureRects.length; mi += 1){
      const mr = state.measureRects[mi];
      const xs = [];
      headsAll.forEach(el => {
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!r || r.width <= 0 || r.height <= 0) return;
        const cx = r.left - svgBBox.left + r.width / 2;
        const cy = r.top - svgBBox.top + r.height / 2;
        if (cx >= mr.x && cx <= mr.x + mr.width && cy >= mr.y && cy <= mr.y + mr.height){
          xs.push(cx);
        }
      });
      xs.sort((a,b)=>a-b);
      const uniq = [];
      const eps = 0.8;
      xs.forEach(x=>{
        if (!uniq.length || Math.abs(x - uniq[uniq.length - 1]) > eps) uniq.push(x);
      });
      map.set(mi, uniq);
    }
    return map;
  }

  function collectNoteRangesByMeasure(){
    const map = new Map();
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg || !state.measureRects || !state.measureRects.length) return map;
    const svgBBox = svg.getBoundingClientRect();
    const selector = '.vf-notehead, .vf-stem, [class*="notehead" i], [class*="stem" i], [class*="stavenote" i]';
    const elems = Array.from(svg.querySelectorAll(selector));
    for (let mi = 0; mi < state.measureRects.length; mi += 1){
      const mr = state.measureRects[mi];
      let minY = Infinity;
      let maxY = -Infinity;
      elems.forEach(el => {
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!r || (r.width <= 0 && r.height <= 0)) return;
        const cx = r.left - svgBBox.left + r.width / 2;
        const cy = r.top - svgBBox.top + r.height / 2;
        if (cx >= mr.x && cx <= mr.x + mr.width && cy >= mr.y && cy <= mr.y + mr.height){
          const top = r.top - svgBBox.top;
          const bottom = top + r.height;
          minY = Math.min(minY, top);
          maxY = Math.max(maxY, bottom);
        }
      });
      if (isFinite(minY) && isFinite(maxY) && maxY > minY){
        map.set(mi, { min: minY, max: maxY });
      }
    }
    return map;
  }

  function mapEventsToPositions(timeline){
    const events = Array.isArray(timeline) ? timeline : (timeline && timeline.events ? timeline.events : []);
    if (!events || !events.length || !state.measureRects || !state.measureRects.length){
      return { events: [], measureStarts: [], measureTotals: [] };
    }
    const measureTotals = (timeline && timeline.measureTotals && timeline.measureTotals.length) ? timeline.measureTotals : null;
    const mapped = events.map(ev => {
      const mr = state.measureRects[Math.min(ev.measure, state.measureRects.length - 1)];
      const perMeas = measureTotals ? measureTotals[Math.min(ev.measure, measureTotals.length - 1)] : (function(){
        const xml = getCurrentRhythmXML();
        const ts = xml ? parseTimeSigFromXML(xml) : null;
        return (ts ? ts.num : 4) * (4 / (ts ? ts.den : 4));
      })();
      const x = mr.x + Math.max(0, Math.min(1, (ev.posBeats / Math.max(0.0001, perMeas)))) * mr.width;
      const y1 = mr.y + mr.height * 0.05;
      const y2 = y1 + Math.max(2, mr.height * 0.9);
      return { ...ev, x, y1, y2 };
    });

    try {
      const headMap = collectNoteheadCentersByMeasure();
      const offsetPx = 0;
      const snapTol = 20;
      const defaultPerMeasure = (function(){
        const xml = getCurrentRhythmXML();
        const ts = xml ? parseTimeSigFromXML(xml) : null;
        return (ts ? ts.num : 4) * (4 / (ts ? ts.den : 4));
      })();
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
        for (const ev of noteEvents){
          const targetX = state.measureRects[mIndex].x + Math.max(0, Math.min(1, ev.posBeats / Math.max(0.0001, perMeas))) * state.measureRects[mIndex].width;
          let bestHead = null;
          let bestDist = Infinity;
          heads.forEach(hx => {
            const d = Math.abs(hx - targetX);
            if (d < bestDist){ bestDist = d; bestHead = hx; }
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

  function applyCursorAt(x, y1, y2, measureIndex){
    if (!state.cursor1El || !state.cursor1El.parentNode){
      ensureOverlay();
    }
    if (!state.cursor1El) return;
    if (!state.cursorEnabled){
      state.cursor1El.setAttribute('opacity', '0');
      return;
    }
    const top = Math.min(y1, y2);
    const height = Math.max(1, Math.abs(y2 - y1));
    let left = x - CURSOR_HALF;
    state.cursor1El.setAttribute('x', String(left));
    state.cursor1El.setAttribute('y', String(top));
    state.cursor1El.setAttribute('width', String(CURSOR_WIDTH));
    state.cursor1El.setAttribute('height', String(height));
    state.cursor1El.setAttribute('opacity', '1');
    if (state.overlayEl && state.cursor1El.parentNode === state.overlayEl) {
      try { state.overlayEl.appendChild(state.cursor1El); } catch(_) {}
    }
    state.lastIndex = measureIndex;
  }

  function startJumpCursor(bpm){
    const tempo = Math.max(1, bpm || 60);
    const secPerQuarter = 60 / tempo;
    const rawTimeline = parseTimelineFromXML();
    const mapped = mapEventsToPositions(rawTimeline);
    const events = (mapped && mapped.events) ? mapped.events.filter(ev => !ev.isRest) : [];
    const startsRaw = (rawTimeline && rawTimeline.measureStarts) ? rawTimeline.measureStarts : [];
    const totalsRaw = (rawTimeline && rawTimeline.measureTotals) ? rawTimeline.measureTotals : [];
    const osmdTimeline = buildOsmdTimeline(bpm);
    const defaultBeatsPerMeasure = state.beatsPerMeasure || 4;
    const noteRanges = collectNoteRangesByMeasure();
    const measures = [];
    for (let i = 0; i < state.measureRects.length; i += 1){
      const mr = state.measureRects[i];
      const range = noteRanges.get(i);
      const pad = Math.max(6, mr.height * 0.08);
      let y1 = mr.y + mr.height * 0.05;
      let y2 = mr.y + mr.height * 0.95;
      if (range && isFinite(range.min) && isFinite(range.max)){
        y1 = range.min - pad;
        y2 = range.max + pad;
      }
      const startQN = startsRaw[i] != null ? startsRaw[i] : (i > 0 ? (measures[i - 1].startQN + measures[i - 1].totalQN) : 0);
      const totalQN = totalsRaw[i] != null ? totalsRaw[i] : defaultBeatsPerMeasure;
      measures.push({
        index: i,
        startQN,
        totalQN,
        startSec: 0,
        endSec: 0,
        startX: mr.x,
        endX: mr.x + mr.width,
        y1,
        y2
      });
    }

    if (state.rafId) { try { cancelAnimationFrame(state.rafId); } catch(_) {} state.rafId = null; }
    if (state.schedulerId) { try { clearTimeout(state.schedulerId); } catch(_) {} state.schedulerId = null; }
    if (!state.jumpTimeouts) state.jumpTimeouts = [];
    state.jumpTimeouts.forEach(t => { try { clearTimeout(t); } catch(_) {} });
    state.jumpTimeouts = [];

    const met = (typeof window.getMetronomeState === 'function') ? window.getMetronomeState() : null;
    const ac = met && met.audioContext ? met.audioContext : null;
    const anchorAc = (ac && state.anchorAcTime != null) ? state.anchorAcTime : null;
    const anchorPerfStart = state.anchorPerfStart || performance.now();

    const anchorSecBase = (anchorAc != null) ? anchorAc : 0;
    const toSec = qn => qn * secPerQuarter;
    measures.forEach(m => {
      m.startSec = anchorSecBase + toSec(m.startQN);
      m.endSec = m.startSec + toSec(m.totalQN);
    });

    const nowBase = (anchorAc != null && ac) ? ac.currentTime : ((performance.now() - anchorPerfStart) / 1000);
    let measureShift = 0;
    if (measures.length && measures[0].startSec < nowBase){
      measureShift = (nowBase + 0.02) - measures[0].startSec;
      measures.forEach(m => { m.startSec += measureShift; m.endSec += measureShift; });
    }

    const jumpEvents = [];
    if (events && events.length){
      // Prefer OSMD time-aligned x to avoid proportional spacing drift (ties, syncopation)
      if (osmdTimeline && Array.isArray(osmdTimeline.events) && osmdTimeline.events.length){
        const byMeasure = new Map();
        osmdTimeline.events.forEach(ev => {
          const arr = byMeasure.get(ev.measureIndex) || [];
          arr.push(ev);
          byMeasure.set(ev.measureIndex, arr);
        });
        byMeasure.forEach(arr => arr.sort((a,b)=>a.timeSec - b.timeSec));
        for (const ev of events){
          const arr = byMeasure.get(ev.measure) || [];
          if (!arr.length) continue;
          const t = ev.absBeats * secPerQuarter;
          let best = arr[0];
          let bestDist = Math.abs(best.timeSec - t);
          for (let i = 1; i < arr.length; i += 1){
            const d = Math.abs(arr[i].timeSec - t);
            if (d < bestDist){ bestDist = d; best = arr[i]; }
          }
          if (best && isFinite(best.x)){
            ev.x = best.x;
          }
        }
      }

      // Final snap to nearest visible notehead in the same measure
      try {
        let headMap = collectNoteheadCentersByMeasure();
        if (!headMap || !headMap.size) headMap = collectNoteheadCentersByMeasureDom();
        const snapTol = 20;
        const offsetPx = 0;
        for (const ev of events){
          const heads = headMap.get(ev.measure) || [];
          if (!heads.length || !isFinite(ev.x)) continue;
          let bestHead = null;
          let bestDist = Infinity;
          heads.forEach(hx => {
            const d = Math.abs(hx - ev.x);
            if (d < bestDist){ bestDist = d; bestHead = hx; }
          });
          if (bestHead !== null && bestDist <= snapTol){
            ev.x = Math.max(0, bestHead - offsetPx);
          }
        }
      } catch(_) {}

      for (const ev of events){
        const m = measures[ev.measure];
        if (!m) continue;
        const startSec = anchorSecBase + toSec(ev.absBeats) + measureShift;
        const xPos = (typeof ev.x === 'number' && isFinite(ev.x))
          ? ev.x
          : (m.startX + (m.endX - m.startX) * (m.totalQN > 0 ? (ev.posBeats / m.totalQN) : 0));
        jumpEvents.push({ time: startSec, x: xPos, y1: m.y1, y2: m.y2, measure: ev.measure });
      }
    }

    if (!jumpEvents.length && osmdTimeline && Array.isArray(osmdTimeline.events) && osmdTimeline.events.length){
      let domMap = collectNoteheadCentersByMeasure();
      if (!domMap || !domMap.size) domMap = collectNoteheadCentersByMeasureDom();
      const takeNearest = (heads, targetX) => {
        if (!heads || !heads.length || !isFinite(targetX)) return null;
        let bestIdx = 0;
        let bestDist = Math.abs(heads[0] - targetX);
        for (let k = 1; k < heads.length; k += 1){
          const d = Math.abs(heads[k] - targetX);
          if (d < bestDist){ bestDist = d; bestIdx = k; }
        }
        const val = heads[bestIdx];
        heads.splice(bestIdx, 1);
        return val;
      };
      const headsByMeasure = new Map();
      domMap.forEach((xs, mi) => headsByMeasure.set(mi, xs.slice()));
      osmdTimeline.events.forEach(ev => {
        const m = measures[ev.measureIndex];
        if (!m) return;
        let xPos = ev.x;
        const domHeads = headsByMeasure.get(ev.measureIndex) || [];
        if (domHeads.length && isFinite(xPos)){
          const nearest = takeNearest(domHeads, xPos);
          if (isFinite(nearest)) xPos = nearest;
        }
        const startSec = anchorSecBase + ev.timeSec + measureShift;
        jumpEvents.push({ time: startSec, x: xPos, y1: m.y1, y2: m.y2, measure: ev.measureIndex });
      });
    }

    if (!jumpEvents.length){
      measures.forEach(m => {
        const perMeas = totalsRaw[m.index] != null ? totalsRaw[m.index] : m.totalQN;
        const stepBeats = 0.25;
        const steps = Math.max(1, Math.floor(perMeas / stepBeats));
        for (let s = 1; s <= steps; s += 1){
          const fracBeats = stepBeats * s;
          if (fracBeats >= perMeas) break;
          const t = m.startSec + toSec(fracBeats);
          const frac = fracBeats / perMeas;
          const xPos = m.startX + (m.endX - m.startX) * frac;
          jumpEvents.push({ time: t, x: xPos, y1: m.y1, y2: m.y2, measure: m.index });
        }
      });
    }

    if (!jumpEvents.length){
      for (const m of measures){
        jumpEvents.push({ time: m.startSec, x: m.startX, y1: m.y1, y2: m.y2, measure: m.index });
      }
    }
    jumpEvents.sort((a,b)=> a.time - b.time || a.x - b.x);
    const firstEventTime = jumpEvents.length ? jumpEvents[0].time : null;
    if (state.cursor1El) state.cursor1El.setAttribute('opacity', '0');

    let prevMeasure = -1;
    const finishAtEnd = (lastTimeSec, nowSecBase, useAc) => {
      const delayMs = Math.max(0, (lastTimeSec - nowSecBase + 0.2) * 1000);
      if (state.loopTimerId) { clearTimeout(state.loopTimerId); state.loopTimerId = null; }
      state.loopTimerId = setTimeout(()=>finishChallengeRound(), Math.round(delayMs));
    };

    if (ac){
      const acNow = ac.currentTime;
      if (firstEventTime != null && firstEventTime > acNow){
        if (state.cursor1El) state.cursor1El.setAttribute('opacity', '0');
      }
      const lastTime = jumpEvents[jumpEvents.length - 1].time;
      jumpEvents.forEach(ev => {
        const delayMs = Math.max(0, (ev.time - acNow) * 1000);
        const tid = setTimeout(() => {
          if (ev.measure !== prevMeasure){
            if (prevMeasure >= 0) maskMeasure(prevMeasure);
            prevMeasure = ev.measure;
          }
          applyCursorAt(ev.x, ev.y1, ev.y2, ev.measure);
        }, Math.round(delayMs));
        state.jumpTimeouts.push(tid);
      });
      finishAtEnd(lastTime, acNow, true);
      return;
    }

    if (firstEventTime != null){
      const nowSec = (performance.now() - anchorPerfStart) / 1000;
      if (firstEventTime > nowSec + 0.02){
        if (state.cursor1El) state.cursor1El.setAttribute('opacity', '0');
      }
    }

    function step(){
      const nowSec = (performance.now() - anchorPerfStart) / 1000;
      if (!jumpEvents.length){
        state.rafId = null;
        return;
      }
      if (firstEventTime != null && nowSec < firstEventTime){
        if (state.cursor1El) state.cursor1El.setAttribute('opacity', '0');
        state.rafId = requestAnimationFrame(step);
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
      applyCursorAt(ev.x, ev.y1, ev.y2, ev.measure);
      if (nowSec > (jumpEvents[jumpEvents.length - 1].time + 0.2)){
        state.rafId = null;
        finishChallengeRound();
        return;
      }
      state.rafId = requestAnimationFrame(step);
    }
    state.rafId = requestAnimationFrame(step);
  }

  function updateCountdownUI(seconds){
    const wrap = $('challengeCountdownUI');
    const val = $('challengeCountdownValue');
    if (!wrap || !val) return;
    wrap.style.display = 'inline-flex';
    val.textContent = String(seconds);
  }

  function hideCountdownUI(){
    const wrap = $('challengeCountdownUI');
    if (wrap) wrap.style.display = 'none';
  }

  async function ensureScoreReady(){
    let svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) {
      try { triggerGenerateRhythm(); } catch(_) {}
    }
    const t0 = Date.now();
    while (!svg && Date.now() - t0 < 6000){
      await new Promise(r => setTimeout(r, 100));
      svg = scoreEl ? scoreEl.querySelector('svg') : null;
    }
    const osmdInst = getOsmdInstance();
    if (osmdInst){
      const t1 = Date.now();
      while (Date.now() - t1 < 2500){
        try{
          if (osmdInst.GraphicSheet && Array.isArray(osmdInst.GraphicSheet.MeasureList) && osmdInst.GraphicSheet.MeasureList.length > 0) break;
        }catch(_){}
        await new Promise(r => setTimeout(r, 80));
      }
    }
    return !!svg;
  }

  async function waitForRhythmXML(maxWaitMs){
    const t0 = Date.now();
    let xml = getCurrentRhythmXML();
    while ((!xml || !xml.length) && Date.now() - t0 < maxWaitMs){
      await new Promise(r => setTimeout(r, 80));
      xml = getCurrentRhythmXML();
    }
    return xml;
  }

  async function waitForNoteheadsReady(maxWaitMs){
    const t0 = Date.now();
    while (Date.now() - t0 < maxWaitMs){
      const headMap = collectNoteheadCentersByMeasure();
      if (headMap && headMap.size) return headMap;
      const domMap = collectNoteheadCentersByMeasureDom();
      if (domMap && domMap.size) return domMap;
      await new Promise(r => setTimeout(r, 80));
    }
    return null;
  }

  function collectSystemRectsFromStaffLines(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return [];
    const svgBBox = svg.getBoundingClientRect();
    const elems = Array.from(svg.querySelectorAll('line, path, rect'));
    const horiz = [];
    for (const el of elems){
      let r = null;
      try { r = el.getBoundingClientRect(); } catch(_) { r = null; }
      if (!r || r.width <= 0 || r.height <= 0) continue;
      const w = r.width, h = r.height;
      if (w < 40) continue;
      if (h > 4) continue;
      const y = r.top - svgBBox.top + h / 2;
      const x1 = r.left - svgBBox.left;
      const x2 = x1 + w;
      horiz.push({ y, x1, x2 });
    }
    if (horiz.length < 5) return [];
    horiz.sort((a,b)=> a.y - b.y);
    const yLevels = [];
    const epsY = 3;
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
    for (let i = 0; i + 4 < yLevels.length; i += 5){
      const group = yLevels.slice(i, i + 5);
      const minY = group[0].y;
      const maxY = group[4].y;
      const spacing = (maxY - minY) / 4;
      const sysY = minY - Math.max(2, spacing * 0.6);
      const sysH = (maxY - minY) + Math.max(4, spacing * 1.2);
      const minX = Math.min(...group.map(g => g.minX));
      const maxX = Math.max(...group.map(g => g.maxX));
      rects.push({ x: minX, y: sysY, width: Math.max(10, maxX - minX), height: sysH });
    }
    return rects;
  }

  function collectSystemRects(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
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
        if (r && r.width > 30 && r.height > 10){
          rects.push({ x: r.left - svgBBox.left, y: r.top - svgBBox.top, width: r.width, height: r.height });
        }
      }catch(_){}
    });
    return rects;
  }

  function collectMeasureRects(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
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
          if (inside && w > 12 && h > 10) measures.push({ x: cx, y: cy, width: w, height: h });
        }
      });
      measures.sort((a,b)=> a.x - b.x);
      rects.push(...dedupRects(measures));
    });
    return rects;
  }

  function collectMeasureRectsByBarlines(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
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
          if (rr && rr.width > 0 && rr.height > 0){ r = rr; }
        }
        if (!r) return;
        const xCenter = r.left - svgBBox.left + r.width / 2;
        const yTop = r.top - svgBBox.top;
        const yBottom = yTop + r.height;
        const thinEnough = r.width <= Math.max(12, sys.width * 0.01);
        const insideX = xCenter >= left && xCenter <= right;
        const overlappingY = (yTop <= bottom) && (yBottom >= top);
        if (thinEnough && insideX && overlappingY){
          const segTop = Math.max(yTop, top);
          const segBottom = Math.min(yBottom, bottom);
          if (segBottom > segTop) segments.push({ x: xCenter, y1: segTop, y2: segBottom });
        }
      });
      const epsX = Math.max(4, sys.width * 0.008);
      segments.sort((a,b)=> a.x - b.x);
      const groups = [];
      for (const s of segments){
        const g = groups.length ? groups[groups.length - 1] : null;
        if (g && Math.abs(g.x - s.x) <= epsX){ g.parts.push(s); g.x = (g.x * g.count + s.x) / (g.count + 1); g.count++; }
        else groups.push({ x: s.x, parts: [s], count: 1 });
      }
      const barXs = [];
      for (const g of groups){
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
      barXs.sort((a,b)=>a-b).forEach(x => { if (uniq.length === 0 || Math.abs(x - uniq[uniq.length - 1]) > epsX) uniq.push(x); });
      if (uniq.length < 3) return;
      for (let i = 0; i < uniq.length - 1; i++){
        const x1 = uniq[i], x2 = uniq[i + 1];
        const w = x2 - x1; if (w <= 8) continue;
        measures.push({ x: x1, y: top, width: w, height: sys.height });
      }
    });
    return measures;
  }

  function getExpectedMeasureCountFromXML(){
    try{
      const osmdInst = getOsmdInstance();
      if (osmdInst && osmdInst.GraphicSheet && Array.isArray(osmdInst.GraphicSheet.MeasureList)){
        const n = osmdInst.GraphicSheet.MeasureList.length;
        if (n && n > 0) return n;
      }
      if (typeof rhythmHistory !== 'undefined' && typeof currentHistoryIndex !== 'undefined'){
        const md = rhythmHistory[currentHistoryIndex];
        if (md && md.config && typeof md.config.measures === 'number' && md.config.measures > 0) return md.config.measures;
        if (md && typeof md.measures === 'number' && md.measures > 0) return md.measures;
      }
      const xml = getCurrentRhythmXML();
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
      const svg = scoreEl ? scoreEl.querySelector('svg') : null;
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
      for (let row = 0; row < lines; row++){
        const thisCount = Math.min(perLine, remain);
        const segW = usableW / thisCount;
        for (let i = 0; i < thisCount; i++){
          const x = bx + leftMargin + i * segW;
          const y = by + row * lineHeight;
          out.push({ x, y, width: segW, height: lineHeight });
        }
        remain -= thisCount;
      }
      return out;
    }catch(_) { return []; }
  }

  function collectMeasureRectsBySystemSubdivision(){
    try {
      const systems = collectSystemRects();
      let totalMeasures = 0;
      const osmdInst = getOsmdInstance();
      if (osmdInst && osmdInst.GraphicSheet && Array.isArray(osmdInst.GraphicSheet.MeasureList)) {
        totalMeasures = osmdInst.GraphicSheet.MeasureList.length || 0;
      }
      if (!totalMeasures) totalMeasures = getExpectedMeasureCountFromXML() || 0;
      if (!systems.length || !totalMeasures) return [];
      const out = [];
      let remain = totalMeasures;
      systems.forEach(sys => {
        const thisCount = Math.min(remain, Math.min(4, totalMeasures));
        if (thisCount <= 0) return;
        const usableX = sys.x + Math.min(40, sys.width * 0.06);
        const usableW = Math.max(10, sys.width - (usableX - sys.x));
        const segW = usableW / thisCount;
        for (let i = 0; i < thisCount; i++){
          out.push({ x: usableX + i * segW, y: sys.y, width: segW, height: sys.height });
        }
        remain -= thisCount;
      });
      if (out.length > totalMeasures) return out.slice(0, totalMeasures);
      return out;
    } catch(_) { return []; }
  }

  function sampleBestMeasureRects(){
    try { const r0 = getOSMDMeasureRects(); if (Array.isArray(r0) && r0.length > 0) return r0; } catch(_) {}
    if (typeof window.getOSMDMeasureRects === 'function'){
      try { const r = window.getOSMDMeasureRects(); if (Array.isArray(r) && r.length > 0) return r; } catch(_) {}
    }
    let r = collectMeasureRectsByBarlines();
    if (!r.length) r = collectMeasureRectsBySystemSubdivision();
    if (!r.length) r = collectMeasureRectsByGlobalEqualSplit();
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
      if (!nowRects || nowRects.length === 0) continue;
      lastNonEmpty = nowRects;
      if (prev.length === nowRects.length){
        let stable = true;
        for (let i = 0; i < prev.length; i++){
          const a = prev[i], b = nowRects[i];
          if (!b || Math.abs(a.x - b.x) > eps || Math.abs(a.y - b.y) > eps ||
              Math.abs(a.width - b.width) > eps || Math.abs(a.height - b.height) > eps){
            stable = false; break;
          }
        }
        if (stable) return nowRects;
      }
      prev = nowRects;
    }
    return lastNonEmpty;
  }

  async function waitForMeasuresReady(maxWaitMs){
    const t0 = Date.now();
    let rects = sampleBestMeasureRects();
    while ((!rects.length) && Date.now() - t0 < maxWaitMs){
      await new Promise(r => setTimeout(r, 120));
      rects = sampleBestMeasureRects();
    }
    if (!rects.length) return [];
    return await waitForStableMeasures(rects, 400);
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
      const peak = isStrong ? 1.0 : 0.7;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch(_) {}
  }

  function startChallengeMetronome(bpm){
    if (!state.metronomeEnabled) return;
    if (state.metronomeTimerId) { clearInterval(state.metronomeTimerId); state.metronomeTimerId = null; }
    const tsInfo = getTimeSignatureInfo();
    const beatSec = (60/Math.max(1,bpm)) * (4/tsInfo.den);
    let patternInfo = null;
    try { if (typeof loadMetronomePatternSettings === 'function') loadMetronomePatternSettings(); } catch(_) {}
    try { if (typeof getMetronomePatternInfo === 'function') patternInfo = getMetronomePatternInfo(bpm); } catch(_) {}
    const usePattern = !!(patternInfo && patternInfo.usePattern && Array.isArray(patternInfo.steps) && patternInfo.steps.length);
    const subdivision = usePattern ? (patternInfo.subdivision || 1) : 1;
    const stepsPerBar = usePattern ? (patternInfo.stepsPerBar || (tsInfo.beats * subdivision)) : tsInfo.beats;
    const stepsPerPattern = usePattern ? (patternInfo.stepsPerPattern || stepsPerBar) : stepsPerBar;
    const steps = usePattern ? patternInfo.steps : new Array(stepsPerPattern).fill(1);
    const stepSec = usePattern && patternInfo && patternInfo.stepDuration ? patternInfo.stepDuration : beatSec;
    let stepIndex = 0;
    function strongBeat(n){
      if (tsInfo.is68) return n === 1 || n === 4;
      return n === 1;
    }
    function tick(){
      const stepInBar = stepsPerBar ? (stepIndex % stepsPerBar) : 0;
      const beatNumber = Math.floor(stepInBar / subdivision) + 1;
      const isBeatStart = (stepInBar % subdivision) === 0;
      const shouldPlay = !usePattern || steps[(stepIndex % stepsPerPattern)] === 1;
      state.lastBeatTimeMs = performance.now();
      if (shouldPlay) {
        ensureClickAudio();
        try { playClick(isBeatStart && strongBeat(beatNumber)); } catch(_) {}
      }
      stepIndex += 1;
    }
    tick();
    state.metronomeTimerId = setInterval(tick, stepSec * 1000);
  }

  function stopChallengeMetronome(){
    if (state.metronomeTimerId){
      clearInterval(state.metronomeTimerId);
      state.metronomeTimerId = null;
    }
  }

  function getChallengeSettings(){
    let settings = {
      prep: 0,
      bpm: 80,
      cursorEnabled: true,
      metronomeEnabled: true,
      hideEnabled: true,
      calibrationEnabled: false
    };
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('ic_rhythm_challenge_settings')||'{}');
      if (typeof saved.prep === 'number') settings.prep = saved.prep;
      if (typeof saved.bpm === 'number') settings.bpm = saved.bpm;
      if (typeof saved.cursor === 'boolean') settings.cursorEnabled = saved.cursor;
      if (typeof saved.metronome === 'boolean') settings.metronomeEnabled = saved.metronome;
      if (typeof saved.hide === 'boolean') settings.hideEnabled = saved.hide;
      if (typeof saved.calibration === 'boolean') settings.calibrationEnabled = saved.calibration;
    } catch(_) {}
    const prepEl = $('challengePrepTime');
    const bpmEl = $('challengeBPM');
    const modal = $('challengeModal');
    const modalOpen = modal && modal.style.display && modal.style.display !== 'none';
    if (!modalOpen && saved){
      if (prepEl && typeof saved.prep === 'number') prepEl.value = String(saved.prep);
      if (bpmEl && typeof saved.bpm === 'number') bpmEl.value = String(saved.bpm);
      const cursorToggle = $('challengeCursorToggle');
      const metronomeToggle = $('challengeMetronomeToggle');
      const hideToggle = $('challengeHideToggle');
      const calibrationToggle = $('challengeCalibrationToggle');
      if (cursorToggle && typeof saved.cursor === 'boolean') cursorToggle.checked = saved.cursor;
      if (metronomeToggle && typeof saved.metronome === 'boolean') metronomeToggle.checked = saved.metronome;
      if (hideToggle && typeof saved.hide === 'boolean') hideToggle.checked = saved.hide;
      if (calibrationToggle && typeof saved.calibration === 'boolean') calibrationToggle.checked = saved.calibration;
    }
    if (prepEl) settings.prep = Math.max(0, parseInt((prepEl.value || '0'), 10));
    if (bpmEl) settings.bpm = Math.max(40, Math.min(240, parseInt((bpmEl.value || '80'), 10)));
    const cursorToggle = $('challengeCursorToggle');
    const metronomeToggle = $('challengeMetronomeToggle');
    const hideToggle = $('challengeHideToggle');
    const calibrationToggle = $('challengeCalibrationToggle');
    if (cursorToggle) settings.cursorEnabled = cursorToggle.checked;
    if (metronomeToggle) settings.metronomeEnabled = metronomeToggle.checked;
    if (hideToggle) settings.hideEnabled = hideToggle.checked;
    if (calibrationToggle) settings.calibrationEnabled = calibrationToggle.checked;
    if (!isMidiConnected()) settings.calibrationEnabled = false;
    return settings;
  }

  function finishChallengeRound(){
    if (!state.active) return;
    if (typeof window.incrementPracticeCount === 'function') {
      try { window.incrementPracticeCount(); } catch(_) {}
    }
    stopChallenge();
    if (toggleEl && toggleEl.checked){
      const settings = getChallengeSettings();
      state.calibrationEnabled = settings.calibrationEnabled;
      state.loopTimerId = setTimeout(() => {
        if (toggleEl && toggleEl.checked){
          startChallenge(settings.prep, settings.bpm, settings.cursorEnabled, settings.metronomeEnabled, settings.hideEnabled);
        }
      }, 120);
    }
  }

  async function startChallenge(prepSec, bpm, cursorEnabled, metronomeEnabled, hideEnabled){
    if (state.active) stopChallenge();
    state.cursorEnabled = cursorEnabled;
    state.metronomeEnabled = metronomeEnabled;
    state.hideEnabled = hideEnabled;

    try { triggerGenerateRhythm(); } catch(_) {}
    await ensureScoreReady();

    state.measureRects = await waitForMeasuresReady(Math.max(3000, prepSec * 1000));
    if (!state.measureRects || !state.measureRects.length){
      // fallback: regenerate once
      try { triggerGenerateRhythm(); } catch(_) {}
      await ensureScoreReady();
      state.measureRects = await waitForMeasuresReady(4000);
    }
    if (!state.measureRects || !state.measureRects.length){
      stopChallenge();
      return;
    }

    const xml = getCurrentRhythmXML();
    const ts = xml ? parseTimeSigFromXML(xml) : null;
    const beats = ts ? ts.num : 4;
    state.beatsPerMeasure = beats;
    state.measureDuration = parseMeasureDurationSec(bpm);

    state.active = true;
    state.startTs = performance.now();
    state.voiceLineYs = null;

    ensureOverlay();
    clearHideLayer();

    let remaining = Math.max(0, prepSec | 0);
    if (remaining > 0){
      updateCountdownUI(remaining);
      state.countdownTimerId = setInterval(()=>{
        remaining -= 1;
        if (remaining <= 0){
          clearInterval(state.countdownTimerId);
          state.countdownTimerId = null;
          hideCountdownUI();
          if (state.metronomeEnabled) startChallengeMetronome(bpm);
          const met = (typeof window.getMetronomeState === 'function') ? window.getMetronomeState() : null;
          const ac = met && met.audioContext ? met.audioContext : null;
          if (ac){
            state.anchorAcTime = ac.currentTime + 0.02;
            state.anchorPerfStart = performance.now();
          } else {
            state.anchorAcTime = null;
            state.anchorPerfStart = performance.now();
          }
          state.anchorPerf = null;
          waitForRhythmXML(1200).then(()=>waitForNoteheadsReady(1600)).then(()=>startJumpCursor(bpm));
        } else {
          updateCountdownUI(remaining);
        }
      }, 1000);
    } else {
      hideCountdownUI();
      if (state.metronomeEnabled) startChallengeMetronome(bpm);
      const met = (typeof window.getMetronomeState === 'function') ? window.getMetronomeState() : null;
      const ac = met && met.audioContext ? met.audioContext : null;
      if (ac){
        state.anchorAcTime = ac.currentTime + 0.02;
        state.anchorPerfStart = performance.now();
      } else {
        state.anchorAcTime = null;
        state.anchorPerfStart = performance.now();
      }
      state.anchorPerf = null;
      await waitForRhythmXML(1200);
      await waitForNoteheadsReady(1600);
      startJumpCursor(bpm);
    }

    state.activeSvg = scoreEl.querySelector('svg');
    if (state.observer) { try { state.observer.disconnect(); } catch(_){} }
    state.observer = new MutationObserver(()=>{
      if (!state.active) return;
      const currentSvg = scoreEl.querySelector('svg');
      if (currentSvg !== state.activeSvg){ stopChallenge(); }
    });
    state.observer.observe(scoreEl, { childList: true, subtree: true });
    state.resizeHandler = ()=> stopChallenge();
    window.addEventListener('resize', state.resizeHandler);
  }

  function stopChallenge(){
    state.active = false;
    if (state.rafId){ cancelAnimationFrame(state.rafId); state.rafId = null; }
    if (state.schedulerId){ clearTimeout(state.schedulerId); state.schedulerId = null; }
    if (state.jumpTimeouts && state.jumpTimeouts.length){
      state.jumpTimeouts.forEach(t => { try { clearTimeout(t); } catch(_) {} });
      state.jumpTimeouts = [];
    }
    if (state.loopTimerId){ clearTimeout(state.loopTimerId); state.loopTimerId = null; }
    if (state.countdownTimerId){ clearInterval(state.countdownTimerId); state.countdownTimerId = null; }
    if (state.observer){ try { state.observer.disconnect(); } catch(_){} state.observer = null; }
    if (state.resizeHandler){ window.removeEventListener('resize', state.resizeHandler); state.resizeHandler = null; }
    state.anchorPerf = null;
    state.anchorAcTime = null;
    state.anchorPerfStart = null;
    stopChallengeMetronome();
    clearOverlay();
    clearHideLayer();
    hideCountdownUI();
  }

  function openChallengeModal(){
    const modal = $('challengeModal');
    const prep = $('challengePrepTime');
    const bpm = $('challengeBPM');
    const cursorToggle = $('challengeCursorToggle');
    const metronomeToggle = $('challengeMetronomeToggle');
    const hideToggle = $('challengeHideToggle');
    const calibrationToggle = $('challengeCalibrationToggle');
    const modalModeToggle = $('challengeModeToggleModal');
    let hasPref = false;
    try {
      const saved = JSON.parse(localStorage.getItem('ic_rhythm_challenge_settings')||'{}');
      if (typeof saved.prep === 'number') prep.value = saved.prep;
      if (typeof saved.bpm === 'number') bpm.value = saved.bpm;
      if (cursorToggle && typeof saved.cursor === 'boolean') { cursorToggle.checked = saved.cursor; hasPref = true; }
      if (metronomeToggle && typeof saved.metronome === 'boolean') { metronomeToggle.checked = saved.metronome; hasPref = true; }
      if (hideToggle && typeof saved.hide === 'boolean') { hideToggle.checked = saved.hide; hasPref = true; }
      if (calibrationToggle && typeof saved.calibration === 'boolean') { calibrationToggle.checked = saved.calibration; }
    } catch(_) {}
    if (modalModeToggle) modalModeToggle.checked = !!(toggleEl && toggleEl.checked);
    if (cursorToggle && !hasPref) cursorToggle.checked = true;
    if (metronomeToggle && !hasPref) metronomeToggle.checked = true;
    if (hideToggle && !hasPref) hideToggle.checked = true;
    if (calibrationToggle && !isMidiConnected()) {
      calibrationToggle.checked = false;
      state.calibrationEnabled = false;
    }
    updateToggleVisual(toggleEl);
    updateToggleVisual(cursorToggleEl);
    updateToggleVisual(metronomeToggleEl);
    updateToggleVisual(hideToggleEl);
    updateToggleVisual(calibrationToggleEl);
    if (calibrationToggleEl && !calibrationToggleEl.checked) clearJudgeStyles();
    updateToggleVisual(modalModeToggleEl);
    if (modal) modal.style.display = 'flex';
  }

  function hideChallengeModal(){
    const modal = $('challengeModal');
    if (modal) modal.style.display = 'none';
  }

  function cancelChallengeSetup(){
    hideChallengeModal();
    if (toggleEl){ toggleEl.checked = false; updateToggleVisual(toggleEl); }
    stopChallenge();
    if (modalModeToggleEl){ modalModeToggleEl.checked = false; updateToggleVisual(modalModeToggleEl); }
  }

  function closeChallengeModal(){
    autoSaveAndCloseChallengeModal();
  }

  function saveChallengeSettingsOnly(){
    const settings = getChallengeSettings();
    try { localStorage.setItem('ic_rhythm_challenge_settings', JSON.stringify({ prep: settings.prep, bpm: settings.bpm, cursor: settings.cursorEnabled, metronome: settings.metronomeEnabled, hide: settings.hideEnabled, calibration: settings.calibrationEnabled })); } catch(_) {}
    state.calibrationEnabled = settings.calibrationEnabled;
  }

  function autoSaveAndCloseChallengeModal(){
    saveChallengeSettingsOnly();
    if (modalModeToggleEl && !modalModeToggleEl.checked){
      cancelChallengeSetup();
      return;
    }
    if (toggleEl && modalModeToggleEl && modalModeToggleEl.checked && !toggleEl.checked){
      toggleEl.checked = true;
      updateToggleVisual(toggleEl);
    }
    hideChallengeModal();
    if (toggleEl && toggleEl.checked){
      const settings = getChallengeSettings();
      state.calibrationEnabled = settings.calibrationEnabled;
      startChallenge(settings.prep, settings.bpm, settings.cursorEnabled, settings.metronomeEnabled, settings.hideEnabled);
    }
  }

  async function confirmChallengeSetup(){
    const settings = getChallengeSettings();
    try { localStorage.setItem('ic_rhythm_challenge_settings', JSON.stringify({ prep: settings.prep, bpm: settings.bpm, cursor: settings.cursorEnabled, metronome: settings.metronomeEnabled, hide: settings.hideEnabled, calibration: settings.calibrationEnabled })); } catch(_) {}
    state.calibrationEnabled = settings.calibrationEnabled;
    hideChallengeModal();
    await startChallenge(settings.prep, settings.bpm, settings.cursorEnabled, settings.metronomeEnabled, settings.hideEnabled);
  }

  function updateToggleVisual(input){
    if (!input) return;
    const slider = input.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (input.checked){
      slider.style.backgroundColor = 'var(--primary-blue, #ff4fa3)';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
    }
  }

  function clearJudgeStyles(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return;
    const nodes = svg.querySelectorAll('.midi-judge-wrong, .midi-judge-correct');
    if (!nodes.length) return;
    nodes.forEach(el => el.classList.remove('midi-judge-wrong', 'midi-judge-correct'));
  }

  function handleToggle(){
    if (!toggleEl) return;
    updateToggleVisual(toggleEl);
    if (toggleEl.checked){
      openChallengeModal();
    } else {
      stopChallenge();
    }
  }

  if (toggleEl){
    toggleEl.addEventListener('change', handleToggle);
    updateToggleVisual(toggleEl);
  }
  if (cursorToggleEl) cursorToggleEl.addEventListener('change', ()=>updateToggleVisual(cursorToggleEl));
  if (metronomeToggleEl) metronomeToggleEl.addEventListener('change', ()=>updateToggleVisual(metronomeToggleEl));
  if (hideToggleEl) hideToggleEl.addEventListener('change', ()=>updateToggleVisual(hideToggleEl));
  if (calibrationToggleEl) calibrationToggleEl.addEventListener('change', ()=>{
    updateToggleVisual(calibrationToggleEl);
    if (!calibrationToggleEl.checked) clearJudgeStyles();
  });
  if (modalModeToggleEl){
    modalModeToggleEl.addEventListener('change', ()=>{
      updateToggleVisual(modalModeToggleEl);
      if (!modalModeToggleEl.checked){
        cancelChallengeSetup();
        return;
      }
      if (toggleEl && !toggleEl.checked){
        toggleEl.checked = true;
        updateToggleVisual(toggleEl);
      }
    });
  }

  const challengeModal = $('challengeModal');
  if (challengeModal){
    challengeModal.addEventListener('click', event => {
      if (event.target === challengeModal){
        autoSaveAndCloseChallengeModal();
      }
    });
  }

  window.addEventListener('ic-midi-connection', (ev) => {
    const connected = !!(ev && ev.detail && ev.detail.connected);
    applyCalibrationAuto(connected);
  });
  try {
    if (window.__icMidi && typeof window.__icMidi.getState === 'function') {
      applyCalibrationAuto(!!window.__icMidi.getState().connected);
    }
  } catch(_) {}

  window.openChallengeModal = openChallengeModal;
  window.closeChallengeModal = closeChallengeModal;
  window.cancelChallengeSetup = cancelChallengeSetup;
  window.confirmChallengeSetup = confirmChallengeSetup;
  window.getOSMDMeasureRects = getOSMDMeasureRects;
  window.stopChallenge = stopChallenge;
  window.__icChallenge = {
    isActive: () => state.active
  };
})();
