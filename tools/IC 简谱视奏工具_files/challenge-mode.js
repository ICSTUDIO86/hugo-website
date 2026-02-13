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
  const calibrationToggleEl = document.getElementById('challengeCalibrationToggle');
  const modalModeToggleEl = document.getElementById('challengeModeToggleModal');

  const state = {
    active: false,
    runId: 0,
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
    hideEnabled: false,
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
    calibrationEnabled: false,
    calibrationOffsetSec: 0,
    judgeEvents: [],
    judgeIndex: 0,
    judgeStartMs: 0,
    judgeTimerId: null,
    judgeWindowMs: 160,
    judgeBeatDurationSec: 0,
    judgeOctShift: null,
    judgeOctShiftCandidate: null,
    judgeOctShiftCandidateCount: 0,
    judgeGateUntilSec: 0,
    judgedElements: new Set(),
  };

  function $(id){ return document.getElementById(id); }

  const micStorageKey = 'ic_jianpu_mic_enabled';
  const micDeviceStorageKey = 'ic_jianpu_mic_device';
  const crepeModelBaseUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models@main/models/pitch-detection/crepe/';

  const micEngine = {
    running: false,
    loopId: null,
    stream: null,
    audioCtx: null,
    source: null,
    analyser: null,
    buffer: null,
    lastProcessMs: 0,
    stableMidi: null,
    stableCount: 0,
    lastEmittedMidi: null,
    lastEmitMs: 0,
    prevVoiced: false,
    prevRms: 0,
    permissionDenied: false,
    lastError: false,
    lastErrorName: '',
    lastErrorSummary: '',
    devices: [],
    deviceLabelCache: {},
    autoWarmupTried: false,
    warmupInFlight: false,
    activeTrackLabel: '',
    selectedDeviceId: '',
    selectedDeviceLabel: '',
    smoothedFreq: null,
    smoothedFreqAtMs: 0,
    lastWarmupAtMs: 0,
    selectedPitchEngine: 'crepe',
    lastDetectedFreq: null,
    lastDetectedMidi: null,
    lastDetectedConfidence: 0,
    lastDetectedEngine: '',
    lastDetectedAtMs: 0,
    history: [],
    historyMax: 260,
    crepe: {
      detector: null,
      loading: false,
      ready: false,
      pollToken: 0,
      lastFreq: null,
      lastAtMs: 0,
      lastConf: 0,
      modelUnavailable: false
    }
  };

  function tLocal(key, fallback){
    try{
      if (typeof translations !== 'undefined' && translations){
        const lang = (typeof currentLanguage !== 'undefined' && currentLanguage) ? currentLanguage : 'zh-CN';
        const table = translations[lang] || translations['zh-CN'] || {};
        if (table && Object.prototype.hasOwnProperty.call(table, key)) return table[key];
      }
    }catch(_){}
    return fallback || key;
  }

  function tLocalWithParams(key, fallback, params){
    let text = tLocal(key, fallback);
    if (!params || typeof params !== 'object') return text;
    Object.keys(params).forEach((k) => {
      const v = params[k];
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
    return text;
  }

  function setMicStatus(key, tone, params){
    const statusEl = $('micStatusText');
    if (!statusEl) return;
    statusEl.textContent = tLocalWithParams(key, statusEl.textContent || key, params);
    statusEl.classList.remove('ok', 'warn', 'error');
    if (tone) statusEl.classList.add(tone);
  }

  function isMidiEnabledConfigured(){
    const midiToggle = $('midiEnableToggle');
    return !!(midiToggle && midiToggle.checked);
  }

  function isMicSupported(){
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
  }

  function isMicEnabledConfigured(){
    const micToggle = $('micEnableToggle');
    return !!(micToggle && micToggle.checked);
  }

  function hasAnyJudgeInputConfigured(){
    return isMidiEnabledConfigured() || isMicEnabledConfigured();
  }

  function shouldUseMicJudgeInput(){
    return !!(state.active && toggleEl && toggleEl.checked && state.calibrationEnabled && isMicEnabledConfigured());
  }

  function readMicEnabledStored(){
    try {
      const raw = localStorage.getItem(micStorageKey);
      return raw === '1' || raw === 'true';
    } catch(_) {
      return false;
    }
  }

  function writeMicEnabledStored(next){
    try { localStorage.setItem(micStorageKey, next ? '1' : '0'); } catch(_) {}
  }

  function readMicDeviceStored(){
    try {
      return localStorage.getItem(micDeviceStorageKey) || '';
    } catch(_) {
      return '';
    }
  }

  function writeMicDeviceStored(deviceId){
    try { localStorage.setItem(micDeviceStorageKey, deviceId || ''); } catch(_) {}
  }

  function getUnknownMicLabel(index){
    return tLocalWithParams('mic.device.unknown', `Microphone ${index + 1}`, { index: index + 1 });
  }

  function rememberMicDeviceLabels(devices){
    if (!Array.isArray(devices)) return;
    devices.forEach((d) => {
      if (!d || !d.deviceId) return;
      const label = (d.label || '').trim();
      if (!label) return;
      micEngine.deviceLabelCache[d.deviceId] = label;
    });
  }

  function getCachedMicDeviceLabel(deviceId){
    if (!deviceId) return '';
    return micEngine.deviceLabelCache[deviceId] || '';
  }

  function cacheTrackLabelToDevice(track, fallbackLabel){
    try {
      const label = ((track && track.label) ? track.label : fallbackLabel || '').trim();
      if (!label) return;
      micEngine.activeTrackLabel = label;
      const settings = track && typeof track.getSettings === 'function' ? track.getSettings() : null;
      const deviceId = settings && settings.deviceId ? String(settings.deviceId).trim() : '';
      if (deviceId){
        micEngine.deviceLabelCache[deviceId] = label;
      }
    } catch(_) {}
  }

  function resolveMicDeviceLabel(device, index){
    if (!device) return getUnknownMicLabel(index || 0);
    const raw = (device.label || '').trim();
    if (raw) return raw;
    const cached = getCachedMicDeviceLabel(device.deviceId || '');
    if (cached) return cached;
    return getUnknownMicLabel(index || 0);
  }

  function hasNamedMicDevices(devices){
    if (!Array.isArray(devices) || !devices.length) return false;
    return devices.some((d) => {
      if (!d) return false;
      const label = (d.label || '').trim();
      if (label) return true;
      const cached = getCachedMicDeviceLabel(d.deviceId || '');
      return !!(cached && cached.trim());
    });
  }

  function hasOnlyAnonymousMicDevices(devices){
    if (!Array.isArray(devices) || !devices.length) return false;
    return devices.every((d) => {
      if (!d) return true;
      const label = (d.label || '').trim();
      const cached = getCachedMicDeviceLabel(d.deviceId || '');
      const id = (d.deviceId || '').trim();
      return !label && !cached && !id;
    });
  }

  async function enumerateMicInputDevices(){
    const timeout = 1800;
    let timer = null;
    try {
      const listPromise = navigator.mediaDevices.enumerateDevices()
        .then((all) => Array.isArray(all) ? all.filter(d => d && d.kind === 'audioinput') : [])
        .catch(() => []);
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve([]), timeout);
      });
      return await Promise.race([listPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function updateSelectedMicLabel(){
    if (!micEngine.selectedDeviceId){
      micEngine.selectedDeviceLabel = '';
      return;
    }
    const idx = micEngine.devices.findIndex(d => d.deviceId === micEngine.selectedDeviceId);
    if (idx < 0){
      micEngine.selectedDeviceLabel = '';
      return;
    }
    const d = micEngine.devices[idx];
    micEngine.selectedDeviceLabel = resolveMicDeviceLabel(d, idx);
  }

  async function updateMicDeviceList(){
    const selectEl = $('micDeviceSelect');
    if (!selectEl) return;

    if (!isMicSupported()){
      micEngine.devices = [];
      micEngine.selectedDeviceId = '';
      micEngine.selectedDeviceLabel = '';
      selectEl.innerHTML = '<option value="">-</option>';
      selectEl.disabled = true;
      return;
    }

    let devices = await enumerateMicInputDevices();
    rememberMicDeviceLabels(micEngine.devices);
    rememberMicDeviceLabels(devices);
    const shouldAutoWarmup =
      isMicEnabledConfigured() &&
      !micEngine.stream &&
      !micEngine.permissionDenied &&
      !hasNamedMicDevices(devices) &&
      !micEngine.autoWarmupTried;
    if (shouldAutoWarmup){
      await warmupMicPermissionForDeviceLabels();
      devices = await enumerateMicInputDevices();
      rememberMicDeviceLabels(devices);
    }
    micEngine.devices = devices;
    selectEl.innerHTML = '';

    if (!devices.length){
      micEngine.selectedDeviceId = '';
      micEngine.selectedDeviceLabel = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-';
      selectEl.appendChild(opt);
      selectEl.disabled = true;
      return;
    }

    const current = micEngine.selectedDeviceId || '';
    const stored = readMicDeviceStored();
    let selected = '';
    if (current && devices.some(d => d.deviceId === current)) selected = current;
    else if (stored && devices.some(d => d.deviceId === stored)) selected = stored;
    else selected = devices[0].deviceId || '';

    devices.forEach((d, idx) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId || '';
      let label = resolveMicDeviceLabel(d, idx);
      const isUnknown = !label || /^microphone\s+\d+$/i.test(label) || /^麥克風\s+\d+$/i.test(label) || /^麦克风\s+\d+$/i.test(label);
      if (isUnknown && micEngine.activeTrackLabel){
        const isSelectedHint = (selected && d.deviceId === selected) || (!selected && idx === 0) || !d.deviceId;
        if (isSelectedHint){
          label = micEngine.activeTrackLabel;
          if (d.deviceId){
            micEngine.deviceLabelCache[d.deviceId] = label;
          }
        }
      }
      opt.textContent = label;
      selectEl.appendChild(opt);
    });

    if (!selected && devices[0]) selected = devices[0].deviceId || '';
    selectEl.value = selected;
    micEngine.selectedDeviceId = selected;
    updateSelectedMicLabel();
    if (!micEngine.selectedDeviceLabel && micEngine.activeTrackLabel){
      micEngine.selectedDeviceLabel = micEngine.activeTrackLabel;
    }
    writeMicDeviceStored(selected);
    selectEl.disabled = !isMicEnabledConfigured();
  }

  function isMidiConnected(){
    try {
      return !!(window.__icMidi && typeof window.__icMidi.getState === 'function' && window.__icMidi.getState().connected);
    } catch(_) {
      return false;
    }
  }

  function clearJudgementStyles(){
    if (state.judgedElements && state.judgedElements.size){
      state.judgedElements.forEach(el => {
        el.classList.remove('midi-judge-correct', 'midi-judge-wrong');
      });
      state.judgedElements.clear();
    }
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return;
    const nodes = svg.querySelectorAll('.midi-judge-wrong, .midi-judge-correct');
    if (!nodes.length) return;
    nodes.forEach(el => el.classList.remove('midi-judge-wrong', 'midi-judge-correct'));
  }

  function getNotePaintTarget(el){
    if (!el) return null;
    const idx = el.getAttribute ? el.getAttribute('note-index') : null;
    if (idx) {
      const svg = el.ownerSVGElement || (scoreEl ? scoreEl.querySelector('svg') : null);
      if (svg) {
        const group = svg.querySelector(`[sn-tag="note-${idx}"]`);
        if (group) return group;
      }
    }
    if (el.tagName && el.tagName.toLowerCase() === 'text') return el;
    const text = el.closest ? el.closest('text') : null;
    return text || el;
  }

  function markJudgeEvent(ev, status){
    if (!ev || ev.judged) return;
    ev.judged = true;
    const cls = status === 'correct' ? 'midi-judge-correct' : 'midi-judge-wrong';
    const els = Array.isArray(ev.elements) ? ev.elements : [];
    els.forEach(el => {
      const target = getNotePaintTarget(el);
      if (!target) return;
      target.classList.remove('midi-judge-correct', 'midi-judge-wrong');
      target.classList.add(cls);
      state.judgedElements.add(target);
    });
  }

  function clamp(value, min, max){
    const v = isFinite(value) ? value : min;
    return Math.min(max, Math.max(min, v));
  }

  function computeJudgeWindows(bpm){
    const beatSec = 60 / Math.max(1, bpm || 80);
    const strict = clamp(0.08 * beatSec, 0.03, 0.09);
    return { beatSec, strict };
  }

  function getMicJudgeToleranceSec(bpm){
    const beatSec = 60 / Math.max(1, bpm || 80);
    const fromBeat = 0.29 * beatSec;
    const fromWindow = Math.max(0.14, (state.judgeWindowMs || 160) / 1000);
    return clamp(Math.max(fromBeat, fromWindow), 0.14, 0.38);
  }

  function getJudgeEventWindow(ev, bpmVal, inputSource){
    const judgeWindows = computeJudgeWindows(bpmVal);
    const strictTolSec = (isFinite(ev?.strictTolSec) && ev.strictTolSec > 0)
      ? ev.strictTolSec
      : judgeWindows.strict;
    const startBase = (typeof ev?.startWindowSec === 'number') ? ev.startWindowSec : (ev.timeSec - strictTolSec);
    const endBase = (typeof ev?.endWindowSec === 'number') ? ev.endWindowSec : (ev.timeSec + strictTolSec);
    const onlyMicMode = inputSource === 'mic' && shouldUseMicJudgeInput() && !isMidiEnabledConfigured();
    if (!onlyMicMode){
      return { startSec: startBase, endSec: endBase, strictTolSec, onlyMicMode: false };
    }
    const micTolSec = getMicJudgeToleranceSec(bpmVal);
    const endGraceSec = 0.08;
    return {
      startSec: Math.min(startBase, ev.timeSec - micTolSec),
      endSec: Math.max(endBase, ev.timeSec + micTolSec + endGraceSec),
      strictTolSec: Math.max(strictTolSec, micTolSec),
      onlyMicMode: true
    };
  }

  function getCentsDistanceToMidi(freq, midi){
    if (!isFinite(freq) || !isFinite(midi)) return Infinity;
    const target = 440 * Math.pow(2, (midi - 69) / 12);
    if (!isFinite(target) || target <= 0) return Infinity;
    const cents = 1200 * Math.log2(freq / target);
    return Math.abs(cents);
  }

  function isMicFreqNearMidi(freq, midi, centsTol){
    const dist = getCentsDistanceToMidi(freq, midi);
    if (!isFinite(dist)) return false;
    return dist <= Math.max(20, centsTol || 45);
  }

  function findMicFreqExpectedMatch(expectedMidis, observedMidi, micFreq, preferredShift, centsTol){
    if (!Array.isArray(expectedMidis) || !expectedMidis.length) return null;
    if (!isFinite(micFreq) || micFreq <= 0) return null;
    const tol = Math.max(22, centsTol || 45);
    let best = null;
    expectedMidis.forEach((target) => {
      if (!isFinite(target)) return;
      const baseShift = isFinite(preferredShift)
        ? Math.round(preferredShift)
        : Math.round((observedMidi - target) / 12);
      const shifts = isFinite(preferredShift)
        ? [baseShift, baseShift - 1, baseShift + 1]
        : [baseShift - 1, baseShift, baseShift + 1];
      shifts.forEach((shift) => {
        const shiftedMidi = target + (12 * shift);
        const cents = getCentsDistanceToMidi(micFreq, shiftedMidi);
        if (!isFinite(cents)) return;
        if (!best || cents < best.cents){
          best = { target, shift, shiftedMidi, cents };
        }
      });
    });
    if (!best || best.cents > tol) return null;
    return best;
  }

  function pushMicHistorySample(atMs, midi, freq, conf, engine){
    if (!isFinite(atMs)) return;
    if (!isFinite(freq) || freq <= 0) return;
    const sample = {
      atMs,
      midi: isFinite(midi) ? midi : null,
      freq,
      conf: isFinite(conf) ? conf : 0,
      engine: engine || ''
    };
    micEngine.history.push(sample);
    if (micEngine.history.length > micEngine.historyMax){
      micEngine.history.splice(0, micEngine.history.length - micEngine.historyMax);
    }
    const keepAfter = atMs - 2800;
    let dropCount = 0;
    while (dropCount < micEngine.history.length && micEngine.history[dropCount].atMs < keepAfter){
      dropCount++;
    }
    if (dropCount > 0){
      micEngine.history.splice(0, dropCount);
    }
  }

  function findBufferedMicMatchForEvent(ev, centsTol){
    if (!ev || !Array.isArray(ev.expectedMidis) || !ev.expectedMidis.length) return null;
    if (!state.judgeStartMs || !micEngine.history.length) return null;
    const bpmVal = $('challengeBPM')?.value ? parseInt($('challengeBPM').value, 10) : 80;
    const windowInfo = getJudgeEventWindow(ev, bpmVal, 'mic');
    const fromSec = (isFinite(windowInfo.startSec) ? windowInfo.startSec : ev.timeSec) - 0.1;
    const toSec = (isFinite(windowInfo.endSec) ? windowInfo.endSec : ev.timeSec) + 0.16;
    const expected = ev.expectedMidis;
    const preferredShift = isFinite(state.judgeOctShift) ? state.judgeOctShift : null;
    const tol = Math.max(26, centsTol || 68);
    let best = null;

    for (let i = micEngine.history.length - 1; i >= 0; i--){
      const s = micEngine.history[i];
      if (!s || !isFinite(s.atMs)) continue;
      const sampleSecRaw = (s.atMs - state.judgeStartMs) / 1000;
      const sampleSec = (state.calibrationEnabled && state.calibrationOffsetSec)
        ? (sampleSecRaw - state.calibrationOffsetSec)
        : sampleSecRaw;
      if (!isFinite(sampleSec) || sampleSec < fromSec || sampleSec > toSec) continue;

      const observedMidi = isFinite(s.midi) ? s.midi : micEngine.lastDetectedMidi;
      const freqMatch = findMicFreqExpectedMatch(expected, observedMidi, s.freq, preferredShift, tol);
      if (freqMatch){
        const score = (Math.max(0.3, s.conf) * 1000) - Math.min(400, freqMatch.cents) - Math.abs(sampleSec - ev.timeSec) * 120;
        if (!best || score > best.score){
          best = { ...freqMatch, score, sampleSec, conf: s.conf };
        }
        continue;
      }

      if (isFinite(observedMidi) && (s.conf || 0) >= 0.54){
        const pc = ((observedMidi % 12) + 12) % 12;
        const pcMatch = expected.find((target) => (((target % 12) + 12) % 12) === pc);
        if (pcMatch != null){
          const shift = Math.round((observedMidi - pcMatch) / 12);
          const score = ((s.conf || 0) * 800) - Math.abs(sampleSec - ev.timeSec) * 150;
          if (!best || score > best.score){
            best = { target: pcMatch, shift, shiftedMidi: pcMatch + (12 * shift), cents: Infinity, score, sampleSec, conf: s.conf, pcFallback: true };
          }
        }
      }
    }
    return best;
  }

  function getMicExpectedMatchForEvent(ev, observedMidi, centsTol){
    const expected = Array.isArray(ev?.expectedMidis) ? ev.expectedMidis : [];
    if (!expected.length) return null;
    const micFreq = micEngine.lastDetectedFreq;
    const micConf = isFinite(micEngine.lastDetectedConfidence) ? micEngine.lastDetectedConfidence : 0;
    const ageMs = performance.now() - (micEngine.lastDetectedAtMs || 0);
    if (!isFinite(micFreq) || micFreq <= 0 || !isFinite(ageMs) || ageMs > 260 || micConf < 0.42){
      return null;
    }
    const observed = isFinite(observedMidi) ? observedMidi : micEngine.lastDetectedMidi;
    const preferredShift = isFinite(state.judgeOctShift) ? state.judgeOctShift : null;
    const freqMatch = findMicFreqExpectedMatch(expected, observed, micFreq, preferredShift, centsTol || 62);
    if (freqMatch) return freqMatch;
    if (!isFinite(observed) || micConf < 0.62) return null;
    const pc = ((observed % 12) + 12) % 12;
    const pcMatch = expected.find((target) => (((target % 12) + 12) % 12) === pc);
    if (pcMatch == null) return null;
    const shift = Math.round((observed - pcMatch) / 12);
    return {
      target: pcMatch,
      shift,
      shiftedMidi: pcMatch + (12 * shift),
      cents: Infinity,
      pcFallback: true
    };
  }

  function registerOctShiftObservation(observedShift, inputSource){
    if (!isFinite(observedShift)) return;
    const shift = Math.round(observedShift);
    if (state.judgeOctShift == null){
      if (state.judgeOctShiftCandidate === shift){
        state.judgeOctShiftCandidateCount += 1;
      } else {
        state.judgeOctShiftCandidate = shift;
        state.judgeOctShiftCandidateCount = 1;
      }
      if (state.judgeOctShiftCandidateCount >= 2){
        state.judgeOctShift = state.judgeOctShiftCandidate;
      }
      return;
    }
    if (shift === state.judgeOctShift){
      state.judgeOctShiftCandidate = shift;
      state.judgeOctShiftCandidateCount = 0;
      return;
    }
    if (inputSource !== 'mic') return;
    if (state.judgeOctShiftCandidate === shift){
      state.judgeOctShiftCandidateCount += 1;
    } else {
      state.judgeOctShiftCandidate = shift;
      state.judgeOctShiftCandidateCount = 1;
    }
    if (state.judgeOctShiftCandidateCount >= 3){
      state.judgeOctShift = shift;
      state.judgeOctShiftCandidateCount = 0;
    }
  }

  function settleExpiredJudgeEvent(ev, inputSource){
    if (!ev || ev.judged) return;
    if (!state.calibrationEnabled){
      ev.judged = true;
      return;
    }
    const hasMidiInput = isMidiEnabledConfigured();
    const expectMic = shouldUseMicJudgeInput();
    const micDown = expectMic && !micEngine.running;
    if (micDown && !hasMidiInput){
      ev.judged = true;
      return;
    }
    if (inputSource === 'mic'){
      const bufferedMatch = findBufferedMicMatchForEvent(ev, 74);
      if (bufferedMatch){
        markJudgeEvent(ev, 'correct');
        if (isFinite(bufferedMatch.shift)){
          registerOctShiftObservation(bufferedMatch.shift, 'mic');
        }
        const nowSecRaw = (performance.now() - state.judgeStartMs) / 1000;
        const delta = clamp(nowSecRaw - ev.timeSec, -0.16, 0.16);
        const nextOffset = (state.calibrationOffsetSec * 0.84) + (delta * 0.16);
        state.calibrationOffsetSec = Math.max(-0.25, Math.min(0.25, nextOffset));
        return;
      }
      const lateMatch = getMicExpectedMatchForEvent(ev, micEngine.lastDetectedMidi, 70);
      if (lateMatch){
        markJudgeEvent(ev, 'correct');
        if (isFinite(lateMatch.shift)){
          registerOctShiftObservation(lateMatch.shift, 'mic');
        }
        const nowSecRaw = (performance.now() - state.judgeStartMs) / 1000;
        const delta = clamp(nowSecRaw - ev.timeSec, -0.16, 0.16);
        const nextOffset = (state.calibrationOffsetSec * 0.84) + (delta * 0.16);
        state.calibrationOffsetSec = Math.max(-0.25, Math.min(0.25, nextOffset));
        return;
      }
    }
    markJudgeEvent(ev, 'wrong');
  }

  function correlationAtLag(buf, lag){
    let sum = 0;
    for (let i = 0; i < buf.length - lag; i++){
      sum += buf[i] * buf[i + lag];
    }
    return sum;
  }

  function detectPitchFromBuffer(buf, sampleRate){
    const size = buf.length;
    let energy = 0;
    for (let i = 0; i < size; i++){
      const v = buf[i];
      energy += v * v;
    }
    const rms = Math.sqrt(energy / Math.max(1, size));
    if (!isFinite(rms) || rms < 0.004) return { freq: null, rms, confidence: 0 };

    const minFreq = 60;
    const maxFreq = 1400;
    const minLag = Math.max(2, Math.floor(sampleRate / maxFreq));
    const maxLag = Math.min(size - 2, Math.floor(sampleRate / minFreq));

    let bestLag = -1;
    let bestCorr = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++){
      const corr = correlationAtLag(buf, lag);
      if (corr > bestCorr){
        bestCorr = corr;
        bestLag = lag;
      }
    }
    if (bestLag <= 0) return { freq: null, rms, confidence: 0 };

    const norm = bestCorr / Math.max(1e-9, energy);
    if (!isFinite(norm) || norm < 0.22) {
      return { freq: null, rms, confidence: Math.max(0, Math.min(1, norm || 0)) };
    }

    const prev = correlationAtLag(buf, bestLag - 1);
    const next = correlationAtLag(buf, bestLag + 1);
    const denom = prev - (2 * bestCorr) + next;
    let refinedLag = bestLag;
    if (Math.abs(denom) > 1e-9){
      refinedLag = bestLag + (0.5 * (prev - next) / denom);
    }
    if (!isFinite(refinedLag) || refinedLag <= 0) {
      return { freq: null, rms, confidence: Math.max(0, Math.min(1, norm || 0)) };
    }

    const freq = sampleRate / refinedLag;
    if (!isFinite(freq) || freq < minFreq || freq > maxFreq) {
      return { freq: null, rms, confidence: Math.max(0, Math.min(1, norm || 0)) };
    }
    return {
      freq,
      rms,
      confidence: Math.max(0, Math.min(1, norm))
    };
  }

  function getSmoothedMicFreq(rawFreq, nowMs){
    if (!isFinite(rawFreq) || rawFreq <= 0){
      const age = nowMs - (micEngine.smoothedFreqAtMs || 0);
      if (isFinite(micEngine.smoothedFreq) && age < 95){
        return micEngine.smoothedFreq;
      }
      micEngine.smoothedFreq = null;
      micEngine.smoothedFreqAtMs = 0;
      return null;
    }
    if (!isFinite(micEngine.smoothedFreq) || micEngine.smoothedFreq <= 0){
      micEngine.smoothedFreq = rawFreq;
    } else {
      const driftSemi = Math.abs(12 * Math.log2(rawFreq / micEngine.smoothedFreq));
      const alpha = driftSemi > 1.2 ? 0.46 : 0.28;
      micEngine.smoothedFreq = (micEngine.smoothedFreq * (1 - alpha)) + (rawFreq * alpha);
    }
    micEngine.smoothedFreqAtMs = nowMs;
    return micEngine.smoothedFreq;
  }

  function freqToStableMidi(freq, referenceMidi){
    if (!isFinite(freq) || freq <= 0) return null;
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    if (!isFinite(midiFloat)) return null;
    let midi = Math.round(midiFloat);
    if (isFinite(referenceMidi)){
      const diff = Math.abs(midiFloat - referenceMidi);
      if (diff <= 0.46){
        midi = Math.round(referenceMidi);
      }
    }
    return midi;
  }

  function runMicCaptureLoop(){
    if (!micEngine.running || !micEngine.analyser || !micEngine.audioCtx) return;
    micEngine.loopId = requestAnimationFrame(runMicCaptureLoop);
    const now = performance.now();
    if (now - micEngine.lastProcessMs < 34) return;
    micEngine.lastProcessMs = now;

    micEngine.analyser.getFloatTimeDomainData(micEngine.buffer);
    const detected = detectPitchFromBuffer(micEngine.buffer, micEngine.audioCtx.sampleRate);
    const stableAutoFreq = getSmoothedMicFreq(detected?.freq, now);
    if (micEngine.selectedPitchEngine === 'crepe' && micEngine.crepe.ready){
      startCrepePolling();
    }
    const resolved = resolvePitchByEngine(now, stableAutoFreq, detected?.confidence ?? 0, detected?.freq ?? null);
    const resolvedConf = isFinite(resolved?.confidence) ? resolved.confidence : 0;
    const minConf = (resolved?.engine === 'crepe') ? 0.55 : 0.18;
    const voiced = !!(resolved && isFinite(resolved.freq) && resolvedConf >= minConf);
    let midi = null;
    if (voiced){
      const refMidi = isFinite(micEngine.lastEmittedMidi) ? micEngine.lastEmittedMidi : micEngine.stableMidi;
      midi = freqToStableMidi(resolved.freq, refMidi);
      if (!isFinite(midi) || midi < 24 || midi > 108){
        midi = null;
      }
    }
    micEngine.lastDetectedFreq = voiced ? resolved.freq : null;
    micEngine.lastDetectedMidi = midi;
    micEngine.lastDetectedConfidence = resolvedConf;
    micEngine.lastDetectedEngine = resolved?.engine || '';
    micEngine.lastDetectedAtMs = now;
    if (voiced){
      pushMicHistorySample(now, midi, resolved.freq, resolvedConf, resolved?.engine || '');
    }

    const prevRms = micEngine.prevRms || 0;
    const currRms = detected ? detected.rms : 0;
    const onset = voiced && (
      !micEngine.prevVoiced ||
      (currRms > prevRms * 1.25 && (currRms - prevRms) > 0.008)
    );

    if (midi != null){
      if (midi === micEngine.stableMidi){
        micEngine.stableCount += 1;
      } else {
        micEngine.stableMidi = midi;
        micEngine.stableCount = 1;
      }

      const pitchChanged = (micEngine.lastEmittedMidi == null) || (midi !== micEngine.lastEmittedMidi);
      const micMode = shouldUseMicJudgeInput();
      const quickAccept = micMode && pitchChanged && resolvedConf >= 0.82;
      if (micEngine.stableCount >= 2 || quickAccept){
        const minEmitGapMs = micMode ? 65 : 90;
        const retriggerSamePitch = !pitchChanged && (now - micEngine.lastEmitMs > minEmitGapMs) && (micMode || onset);
        if (pitchChanged || retriggerSamePitch){
          micEngine.lastEmittedMidi = midi;
          micEngine.lastEmitMs = now;
          handleJudgeInput(midi, 'mic');
        }
      }
    } else {
      micEngine.stableMidi = null;
      micEngine.stableCount = 0;
    }

    micEngine.prevVoiced = voiced;
    micEngine.prevRms = currRms;
  }

  function getMicAudioConstraints(preferredDeviceId){
    const constraints = {
      sampleRate: 48000,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    };
    if (preferredDeviceId){
      constraints.deviceId = { exact: preferredDeviceId };
    }
    return constraints;
  }

  function getBasicAudioConstraints(preferredDeviceId){
    if (preferredDeviceId) return { deviceId: { exact: preferredDeviceId } };
    return true;
  }

  function getFallbackMicAttempts(preferredDeviceId){
    const attempts = [];
    const preferred = (preferredDeviceId || '').trim();
    if (preferred) {
      attempts.push({
        id: 'preferred-basic',
        label: 'preferred-basic',
        constraints: getBasicAudioConstraints(preferred)
      });
    }
    attempts.push({
      id: 'default-advanced',
      label: 'default-advanced',
      constraints: getMicAudioConstraints('')
    });
    attempts.push({
      id: 'default-basic',
      label: 'default-basic',
      constraints: true
    });
    if (preferred) {
      attempts.push({
        id: 'preferred-advanced',
        label: 'preferred-advanced',
        constraints: getMicAudioConstraints(preferred)
      });
    }
    return attempts;
  }

  function getErrorName(err){
    return (err && err.name ? String(err.name) : 'UnknownError');
  }

  function summarizeAttemptFailures(failures){
    if (!Array.isArray(failures) || !failures.length) return '';
    const text = failures.map((f) => `${f.label}:${f.errorName}`).join('|');
    if (text.length <= 200) return text;
    return `${text.slice(0, 197)}...`;
  }

  function isRetryableMicError(errorName){
    return (
      errorName === 'NotFoundError' ||
      errorName === 'OverconstrainedError' ||
      errorName === 'ConstraintNotSatisfiedError' ||
      errorName === 'AbortError' ||
      errorName === 'NotReadableError' ||
      errorName === 'TrackStartError' ||
      errorName === 'TimeoutError'
    );
  }

  async function getUserMediaDirect(audioConstraints){
    return navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
  }

  async function getUserMediaWithTimeout(audioConstraints, timeoutMs){
    const timeout = Math.max(3500, parseInt(timeoutMs || 12000, 10) || 12000);
    let timer = null;
    let timedOut = false;
    let requestPromise = null;
    try {
      requestPromise = navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          const err = new Error('getUserMedia timeout');
          err.name = 'TimeoutError';
          reject(err);
        }, timeout);
      });
      return await Promise.race([requestPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
      if (timedOut && requestPromise && typeof requestPromise.then === 'function') {
        requestPromise.then((lateStream) => {
          try { lateStream.getTracks().forEach((t) => t.stop()); } catch(_) {}
        }).catch(() => {});
      }
    }
  }

  async function acquireMicStreamWithFallback(preferredDeviceId, timeoutMs){
    const attempts = getFallbackMicAttempts(preferredDeviceId);
    const failures = [];
    let lastErr = null;
    for (const attempt of attempts){
      try {
        const stream = await getUserMediaWithTimeout(attempt.constraints, timeoutMs);
        return { stream, attempt, failures };
      } catch(err){
        const errorName = getErrorName(err);
        failures.push({ id: attempt.id, label: attempt.label, errorName });
        lastErr = err;
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') break;
        if (!isRetryableMicError(errorName)) break;
      }
    }
    const finalErr = lastErr || new Error('Unable to acquire microphone stream');
    try { finalErr.micAttemptFailures = failures; } catch(_) {}
    throw finalErr;
  }

  async function acquireMicStreamCompat(preferredDeviceId){
    const failures = [];
    const preferred = (preferredDeviceId || '').trim();

    try {
      const stream = await getUserMediaDirect(getMicAudioConstraints(''));
      return { stream, attempt: { id: 'default-direct', label: 'default-direct' }, failures };
    } catch(err){
      failures.push({ id: 'default-direct', label: 'default-direct', errorName: getErrorName(err) });
    }

    if (preferred) {
      try {
        const stream = await getUserMediaDirect(getBasicAudioConstraints(preferred));
        return { stream, attempt: { id: 'preferred-direct', label: 'preferred-direct' }, failures };
      } catch(err){
        failures.push({ id: 'preferred-direct', label: 'preferred-direct', errorName: getErrorName(err) });
      }
    }

    try {
      const fallback = await acquireMicStreamWithFallback(preferred, 12000);
      return {
        stream: fallback.stream,
        attempt: fallback.attempt,
        failures: failures.concat(fallback.failures || [])
      };
    } catch(err){
      const finalErr = err || new Error('Unable to acquire microphone stream');
      const merged = failures.concat((err && err.micAttemptFailures) || []);
      try { finalErr.micAttemptFailures = merged; } catch(_) {}
      throw finalErr;
    }
  }

  function stopCrepePolling(resetDetector){
    micEngine.crepe.pollToken += 1;
    micEngine.crepe.lastFreq = null;
    micEngine.crepe.lastAtMs = 0;
    micEngine.crepe.lastConf = 0;
    if (resetDetector){
      micEngine.crepe.detector = null;
      micEngine.crepe.ready = false;
      micEngine.crepe.loading = false;
    }
  }

  function startCrepePolling(){
    const crepe = micEngine.crepe;
    if (!micEngine.running || !crepe.ready || !crepe.detector || micEngine.selectedPitchEngine !== 'crepe') return;
    const token = ++crepe.pollToken;
    const poll = () => {
      if (token !== crepe.pollToken || !micEngine.running || micEngine.selectedPitchEngine !== 'crepe') return;
      try {
        crepe.detector.getPitch((err, freq) => {
          if (token !== crepe.pollToken || !micEngine.running) return;
          if (!err && isFinite(freq) && freq > 40 && freq < 1800){
            const prev = crepe.lastFreq;
            let conf = 0.93;
            if (isFinite(prev) && prev > 0){
              const drift = Math.abs(Math.log2(freq / prev));
              conf = Math.max(0.72, 0.95 - (drift * 2.5));
            }
            crepe.lastFreq = freq;
            crepe.lastConf = conf;
            crepe.lastAtMs = performance.now();
          }
          setTimeout(poll, 0);
        });
      } catch(_) {
        setTimeout(poll, 60);
      }
    };
    poll();
  }

  async function ensureCrepeDetector(){
    if (micEngine.selectedPitchEngine !== 'crepe') return false;
    if (!micEngine.audioCtx || !micEngine.stream) return false;
    const crepe = micEngine.crepe;
    if (crepe.modelUnavailable) return false;
    if (!(window.ml5 && typeof window.ml5.pitchDetection === 'function')) {
      crepe.modelUnavailable = true;
      return false;
    }
    if (crepe.ready && crepe.detector){
      startCrepePolling();
      return true;
    }
    if (crepe.loading) return false;

    crepe.loading = true;
    return await new Promise((resolve) => {
      let settled = false;
      let detector = null;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        crepe.loading = false;
        resolve(!!ok);
      };
      const timeoutId = setTimeout(() => {
        if (!settled){
          crepe.modelUnavailable = true;
          finish(false);
        }
      }, 22000);

      try {
        detector = window.ml5.pitchDetection(
          crepeModelBaseUrl,
          micEngine.audioCtx,
          micEngine.stream,
          () => {
            clearTimeout(timeoutId);
            crepe.detector = detector;
            crepe.ready = true;
            crepe.modelUnavailable = false;
            startCrepePolling();
            finish(true);
          }
        );
      } catch(_) {
        clearTimeout(timeoutId);
        crepe.modelUnavailable = true;
        finish(false);
      }
    });
  }

  function resolvePitchByEngine(nowMs, autoFreq, autoConfidence, rawAutoFreq){
    if (micEngine.selectedPitchEngine !== 'crepe') {
      return { freq: autoFreq, confidence: autoConfidence, engine: 'classic' };
    }
    const age = nowMs - (micEngine.crepe.lastAtMs || 0);
    const modelFreq = micEngine.crepe.lastFreq;
    const hasAuto = isFinite(autoFreq) && autoFreq > 40 && autoFreq < 1800;
    const modelFreshMs = hasAuto ? 300 : 380;
    if (micEngine.crepe.ready && isFinite(modelFreq) && modelFreq > 40 && modelFreq < 1800 && age < modelFreshMs){
      if (hasAuto){
        const gapSemi = Math.abs(12 * Math.log2(modelFreq / autoFreq));
        if (isFinite(gapSemi) && gapSemi > 1.35 && (autoConfidence || 0) >= 0.32){
          return {
            freq: autoFreq,
            confidence: Math.max(autoConfidence || 0, 0.32),
            engine: 'classic-preferred'
          };
        }
      }
      return {
        freq: modelFreq,
        confidence: Math.max(autoConfidence || 0, micEngine.crepe.lastConf || 0.9),
        engine: 'crepe'
      };
    }
    const fallbackFreq = (isFinite(autoFreq) ? autoFreq : rawAutoFreq);
    return { freq: fallbackFreq, confidence: autoConfidence, engine: 'classic-fallback' };
  }

  async function warmupMicPermissionForDeviceLabels(){
    if (!isMicSupported() || !isMicEnabledConfigured() || micEngine.stream) return;
    if (micEngine.autoWarmupTried || micEngine.warmupInFlight) return;
    micEngine.autoWarmupTried = true;
    micEngine.warmupInFlight = true;
    micEngine.lastWarmupAtMs = Date.now();
    try {
      const probeStream = await navigator.mediaDevices.getUserMedia({
        audio: getMicAudioConstraints('')
      });
      try {
        const probeTrack = probeStream.getAudioTracks ? probeStream.getAudioTracks()[0] : null;
        const probeLabel = (probeTrack && probeTrack.label ? probeTrack.label : '').trim();
        if (probeLabel){
          cacheTrackLabelToDevice(probeTrack, probeLabel);
        }
      } catch(_) {}
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const inputs = Array.isArray(all) ? all.filter(d => d && d.kind === 'audioinput') : [];
        rememberMicDeviceLabels(inputs);
      } catch(_) {}
      try {
        probeStream.getTracks().forEach(t => t.stop());
      } catch(_) {}
      micEngine.autoWarmupTried = true;
      micEngine.permissionDenied = false;
      micEngine.lastError = false;
    } catch(err){
      const denied = !!(err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'));
      micEngine.autoWarmupTried = true;
      micEngine.permissionDenied = denied;
      micEngine.lastError = true;
    } finally {
      micEngine.warmupInFlight = false;
    }
  }

  function stopMicCapture(){
    stopCrepePolling(true);
    if (micEngine.loopId) {
      cancelAnimationFrame(micEngine.loopId);
      micEngine.loopId = null;
    }
    micEngine.running = false;
    micEngine.lastProcessMs = 0;
    micEngine.stableMidi = null;
    micEngine.stableCount = 0;
    micEngine.lastEmittedMidi = null;
    micEngine.lastEmitMs = 0;
    micEngine.prevVoiced = false;
    micEngine.prevRms = 0;
    micEngine.smoothedFreq = null;
    micEngine.smoothedFreqAtMs = 0;
    micEngine.lastErrorName = '';
    micEngine.lastErrorSummary = '';
    micEngine.lastDetectedFreq = null;
    micEngine.lastDetectedMidi = null;
    micEngine.lastDetectedConfidence = 0;
    micEngine.lastDetectedEngine = '';
    micEngine.lastDetectedAtMs = 0;
    micEngine.history = [];
    if (micEngine.source) {
      try { micEngine.source.disconnect(); } catch(_) {}
      micEngine.source = null;
    }
    if (micEngine.analyser) {
      try { micEngine.analyser.disconnect(); } catch(_) {}
      micEngine.analyser = null;
    }
    if (micEngine.stream) {
      try { micEngine.stream.getTracks().forEach(t => t.stop()); } catch(_) {}
      micEngine.stream = null;
    }
    if (micEngine.audioCtx) {
      try { micEngine.audioCtx.close(); } catch(_) {}
      micEngine.audioCtx = null;
    }
    micEngine.buffer = null;
  }

  async function startMicCapture(){
    if (micEngine.running) return true;
    if (!isMicSupported()){
      setMicStatus('mic.status.unsupported', 'error');
      return false;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try{
      micEngine.lastError = false;
      micEngine.lastErrorName = '';
      micEngine.lastErrorSummary = '';
      if (micEngine.selectedPitchEngine === 'crepe') {
        micEngine.crepe.modelUnavailable = false;
      }
      if (!micEngine.selectedDeviceId){
        micEngine.selectedDeviceId = readMicDeviceStored();
      }
      if (!micEngine.stream){
        const preferredDeviceId = micEngine.selectedDeviceId || '';
        const acquired = await acquireMicStreamCompat(preferredDeviceId);
        micEngine.stream = acquired.stream;
        if (acquired.attempt && String(acquired.attempt.id || '').indexOf('default-') === 0){
          micEngine.selectedDeviceId = '';
          writeMicDeviceStored('');
        }
        const summary = summarizeAttemptFailures(acquired.failures);
        micEngine.lastErrorSummary = summary || '';
        try {
          const audioTrack = micEngine.stream.getAudioTracks ? micEngine.stream.getAudioTracks()[0] : null;
          const liveLabel = (audioTrack && audioTrack.label ? audioTrack.label : '').trim();
          if (liveLabel){
            cacheTrackLabelToDevice(audioTrack, liveLabel);
          }
        } catch(_) {}
      }
      if (!micEngine.audioCtx){
        micEngine.audioCtx = new AudioContextClass({ sampleRate: 48000 });
      }
      if (micEngine.audioCtx.state === 'suspended'){
        try {
          await micEngine.audioCtx.resume();
        } catch(_) {}
      }
      micEngine.source = micEngine.audioCtx.createMediaStreamSource(micEngine.stream);
      micEngine.analyser = micEngine.audioCtx.createAnalyser();
      micEngine.analyser.fftSize = 2048;
      micEngine.analyser.smoothingTimeConstant = 0.08;
      micEngine.source.connect(micEngine.analyser);
      micEngine.buffer = new Float32Array(micEngine.analyser.fftSize);
      micEngine.permissionDenied = false;
      await updateMicDeviceList();
      micEngine.running = true;
      if (micEngine.selectedPitchEngine === 'crepe'){
        ensureCrepeDetector().then(() => {
          if (!micEngine.running) return;
          refreshMicStatus();
        }).catch(() => {});
      }
      runMicCaptureLoop();
      return true;
    } catch(err){
      micEngine.lastError = true;
      const denied = !!(err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'));
      micEngine.permissionDenied = denied;
      const errName = getErrorName(err);
      const errSummary = summarizeAttemptFailures(err && err.micAttemptFailures);
      stopMicCapture();
      micEngine.lastErrorName = errName;
      micEngine.lastErrorSummary = errSummary || '';
      return false;
    }
  }

  function refreshMicStatus(){
    if (!isMicEnabledConfigured()){
      setMicStatus('mic.status.disabled', '');
      return;
    }
    if (!isMicSupported()){
      setMicStatus('mic.status.unsupported', 'error');
      return;
    }
    if (micEngine.permissionDenied){
      setMicStatus('mic.status.permission', 'error');
      return;
    }
    if (micEngine.lastError){
      setMicStatus('mic.status.error', 'warn');
      return;
    }
    if (hasOnlyAnonymousMicDevices(micEngine.devices)){
      setMicStatus('mic.status.permissionNeeded', 'warn');
      return;
    }
    if (!micEngine.devices.length){
      setMicStatus('mic.status.nodevice', 'warn');
      return;
    }
    const hasDeviceLabel = !!(micEngine.selectedDeviceLabel && micEngine.selectedDeviceLabel.trim());
    if (micEngine.running){
      if (hasDeviceLabel){
        setMicStatus('mic.status.listeningDevice', 'ok', { device: micEngine.selectedDeviceLabel });
      } else {
        setMicStatus('mic.status.listening', 'ok');
      }
      return;
    }
    if (hasDeviceLabel){
      setMicStatus('mic.status.readyDevice', 'ok', { device: micEngine.selectedDeviceLabel });
    } else {
      setMicStatus('mic.status.ready', 'ok');
    }
  }

  async function startMicCaptureWithTimeout(timeoutMs){
    const timeout = Math.max(1000, parseInt(timeoutMs || 8000, 10) || 8000);
    let timer = null;
    try {
      const result = await Promise.race([
        startMicCapture(),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(false), timeout);
        })
      ]);
      if (result === false && !micEngine.permissionDenied && !micEngine.lastError){
        micEngine.lastError = true;
        micEngine.lastErrorName = 'TimeoutError';
      }
      return !!result;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function syncJudgeInputEngines(){
    const shouldRunMic = shouldUseMicJudgeInput();
    if (shouldRunMic){
      let started = await startMicCaptureWithTimeout(16000);
      if (!started){
        stopMicCapture();
        await new Promise((resolve) => setTimeout(resolve, 250));
        started = await startMicCaptureWithTimeout(6000);
      }
      await updateMicDeviceList();
      if (!started && !isMidiEnabledConfigured()) {
        state.calibrationEnabled = false;
        state.calibrationOffsetSec = 0;
        if (calibrationToggleEl && calibrationToggleEl.checked){
          calibrationToggleEl.checked = false;
          updateCalibrationToggleVisual();
        }
      }
    } else if (micEngine.running) {
      stopMicCapture();
      await updateMicDeviceList();
    } else {
      await updateMicDeviceList();
    }
    refreshMicStatus();
  }

  function collectIndexedNoteElements(){
    const svg = scoreEl ? scoreEl.querySelector('svg') : null;
    if (!svg) return [];
    const nodes = Array.from(svg.querySelectorAll('[note-index]'));
    if (!nodes.length) return [];
    const measures = state.measureRects || [];
    const svgBBox = svg.getBoundingClientRect();
    const findMeasureIndex = (cx, cy) => {
      for (let i=0; i<measures.length; i++){
        const m = measures[i];
        if (!m) continue;
        if (cx >= m.x - 1 && cx <= m.x + m.width + 1 && cy >= m.y - 1 && cy <= m.y + m.height + 1) return i;
      }
      return -1;
    };
    const out = [];
    nodes.forEach(node => {
      const idxRaw = node.getAttribute('note-index');
      const idx = idxRaw != null ? parseInt(idxRaw, 10) : NaN;
      if (!Number.isFinite(idx)) return;
      let skip = false;
      const dataStr = node.getAttribute('note-data');
      if (dataStr) {
        try {
          const data = JSON.parse(dataStr);
          const noteVal = data.note;
          const noteData = data.noteData || '';
          const isDash = noteVal === '-' || noteData === '-' || noteData === '--';
          const isRest = noteVal === '0' || noteVal === 0 || data.isRest;
          const isTieEnd = !!data.isTieEnd && !data.isTieStart;
          if (isDash || isRest || isTieEnd) skip = true;
        } catch(_) {}
      } else {
        const txt = (node.textContent || '').trim();
        if (txt === '-' || txt === '0') skip = true;
      }
      if (skip) return;
      const r = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (!r || (r.width <= 0 && r.height <= 0)) return;
      const left = r.left - svgBBox.left;
      const top = r.top - svgBBox.top;
      const cx = left + r.width / 2;
      const cy = top + r.height / 2;
      const measureIndex = findMeasureIndex(cx, cy);
      out.push({ index: idx, el: node, measureIndex });
    });
    out.sort((a,b)=> a.index - b.index);
    return out;
  }

  function buildJudgeTimeline(bpm){
    try{
      const timeline = parseTimelineFromMelodyData() || parseTimelineFromXML();
      if (!timeline || !Array.isArray(timeline.events)) return [];
      const noteSlotsByMeasure = Array.isArray(timeline.noteSlotsByMeasure) ? timeline.noteSlotsByMeasure : [];
      const indexedElements = collectIndexedNoteElements();
      const indexedById = new Map();
      indexedElements.forEach((entry) => {
        if (!entry || !Number.isFinite(entry.index)) return;
        if (!indexedById.has(entry.index)) indexedById.set(entry.index, []);
        indexedById.get(entry.index).push(entry);
      });
      const indexOffset = (!indexedById.has(0) && indexedById.has(1)) ? 1 : 0;
      const usedElements = new Set();
      const claimEntryByIndex = (rawIndex, measureHint) => {
        if (!Number.isFinite(rawIndex)) return null;
        const candidates = [];
        const adjusted = rawIndex + indexOffset;
        candidates.push(adjusted);
        if (adjusted !== rawIndex) candidates.push(rawIndex);
        if (!indexOffset) {
          candidates.push(rawIndex + 1);
          candidates.push(rawIndex - 1);
        }
        for (const idx of candidates){
          const list = indexedById.get(idx);
          if (!list || !list.length) continue;
          let preferred = null;
          for (const item of list){
            if (!item || !item.el || usedElements.has(item.el)) continue;
            if (measureHint != null && item.measureIndex === measureHint){
              preferred = item;
              break;
            }
            if (!preferred) preferred = item;
          }
          if (preferred && preferred.el){
            usedElements.add(preferred.el);
            return preferred.el;
          }
        }
        return null;
      };
      const raw = [];
      timeline.events.forEach(ev => {
        if (!ev || ev.isRest) return;
        let midi = null;
        let eventIndex = null;
        const slots = noteSlotsByMeasure[ev.measure];
        if (slots && typeof ev.noteIndex === 'number' && slots[ev.noteIndex]) {
          const slot = slots[ev.noteIndex];
          const slotMidi = slot.midi;
          if (typeof slotMidi === 'number') midi = slotMidi;
          if (Number.isFinite(slot.globalIndex)) eventIndex = slot.globalIndex;
        }
        if (typeof ev.midi === 'number') midi = ev.midi;
        if (typeof midi !== 'number') return;
        const startQN = (typeof ev.absBeats === 'number' ? ev.absBeats : 0);
        if (Number.isFinite(ev.globalIndex)) eventIndex = ev.globalIndex;
        raw.push({ startQN, expectedMidis: [midi], measureIndex: ev.measure, noteIndices: eventIndex != null ? [eventIndex] : [] });
      });
      if (!raw.length) return [];
      raw.sort((a,b)=> a.startQN - b.startQN);
      const grouped = [];
      const eps = 1e-4;
      for (const ev of raw){
        const last = grouped[grouped.length - 1];
        if (last && Math.abs(ev.startQN - last.startQN) <= eps){
          last.expectedMidis.push(...ev.expectedMidis);
          if (Array.isArray(ev.noteIndices) && ev.noteIndices.length){
            last.noteIndices.push(...ev.noteIndices);
          }
        } else {
          grouped.push({
            startQN: ev.startQN,
            expectedMidis: [...ev.expectedMidis],
            measureIndex: ev.measureIndex,
            noteIndices: Array.isArray(ev.noteIndices) ? [...ev.noteIndices] : []
          });
        }
      }
      let ei = 0;
      const bpmSafe = Math.max(1, bpm || 80);
      const judgeWindows = computeJudgeWindows(bpmSafe);
      grouped.forEach(ev => {
        const count = Math.max(1, ev.expectedMidis.length);
        const els = [];

        if (Array.isArray(ev.noteIndices) && ev.noteIndices.length){
          for (const idx of ev.noteIndices){
            const found = claimEntryByIndex(idx, ev.measureIndex);
            if (!found) continue;
            els.push(found);
            if (els.length >= count) break;
          }
        }

        while (els.length < count && ei < indexedElements.length){
          const entry = indexedElements[ei++];
          if (!entry || !entry.el || usedElements.has(entry.el)) continue;
          usedElements.add(entry.el);
          els.push(entry.el);
          if (ev.measureIndex == null && entry && typeof entry.measureIndex === 'number') {
            ev.measureIndex = entry.measureIndex;
          }
        }
        ev.elements = els;
        ev.timeSec = ev.startQN * (60 / Math.max(1, bpm));
        ev.strictTolSec = judgeWindows.strict;
        ev.startWindowSec = ev.timeSec - ev.strictTolSec;
        ev.endWindowSec = ev.timeSec + ev.strictTolSec;
        ev.judged = false;
      });
      return grouped;
    }catch(_){ return []; }
  }

  function startJudgeTimeline(startMs){
    if (state.judgeTimerId) { clearInterval(state.judgeTimerId); state.judgeTimerId = null; }
    state.judgeStartMs = startMs;
    state.judgeIndex = 0;
    state.judgeGateUntilSec = 0;
    const windowMs = Math.max(90, Math.min(220, state.judgeWindowMs || 160));
    const fallbackTolSec = windowMs / 1000;
    state.judgeTimerId = setInterval(() => {
      if (!state.active) return;
      const nowMs = performance.now();
      const nowSec = (nowMs - state.judgeStartMs) / 1000;
      const bpmVal = $('challengeBPM')?.value ? parseInt($('challengeBPM').value, 10) : 80;
      while (state.judgeIndex < state.judgeEvents.length){
        const ev = state.judgeEvents[state.judgeIndex];
        if (ev.judged) { state.judgeIndex++; continue; }
        const modeSource = (shouldUseMicJudgeInput() && !isMidiEnabledConfigured()) ? 'mic' : 'midi';
        const windowInfo = getJudgeEventWindow(ev, bpmVal, modeSource);
        const endSec = isFinite(windowInfo.endSec) ? windowInfo.endSec : (ev.timeSec + fallbackTolSec);
        if (nowSec > endSec){
          settleExpiredJudgeEvent(ev, modeSource);
          state.judgeIndex++;
          continue;
        }
        break;
      }
    }, 50);
  }

  function stopJudgeTimeline(){
    if (state.judgeTimerId) { clearInterval(state.judgeTimerId); state.judgeTimerId = null; }
    state.judgeStartMs = 0;
    state.judgeIndex = 0;
    state.judgeGateUntilSec = 0;
    state.judgeEvents = [];
  }

  function handleJudgeInput(midi, source){
    const inputSource = source === 'mic' ? 'mic' : 'midi';
    if (!state.active || !toggleEl || !toggleEl.checked) return;
    if (!state.judgeEvents || !state.judgeEvents.length || !state.judgeStartMs) return;
    const nowSecRaw = (performance.now() - state.judgeStartMs) / 1000;
    const nowSec = (state.calibrationEnabled && state.calibrationOffsetSec)
      ? (nowSecRaw - state.calibrationOffsetSec)
      : nowSecRaw;
    const bpmVal = $('challengeBPM')?.value ? parseInt($('challengeBPM').value, 10) : 80;
    const judgeWindows = computeJudgeWindows(bpmVal);
    if (state.judgeGateUntilSec && nowSec <= state.judgeGateUntilSec) return;
    if (state.judgeGateUntilSec && nowSec > state.judgeGateUntilSec) {
      state.judgeGateUntilSec = 0;
    }
    while (state.judgeIndex < state.judgeEvents.length){
      const cur = state.judgeEvents[state.judgeIndex];
      if (!cur || cur.judged){
        state.judgeIndex++;
        continue;
      }
      const curWindow = getJudgeEventWindow(cur, bpmVal, inputSource);
      if (nowSec > curWindow.endSec){
        settleExpiredJudgeEvent(cur, inputSource);
        state.judgeIndex++;
        continue;
      }
      break;
    }
    const ev = state.judgeEvents[state.judgeIndex];
    if (!ev || ev.judged) return;
    const windowInfo = getJudgeEventWindow(ev, bpmVal, inputSource);
    const strictTolSec = windowInfo.strictTolSec || judgeWindows.strict;
    const startSec = windowInfo.startSec;
    const endSec = windowInfo.endSec;

    if (nowSec < startSec) return;
    if (nowSec > endSec) return;

    const expected = Array.isArray(ev.expectedMidis) ? ev.expectedMidis : [];
    const pitchClass = (n) => ((n % 12) + 12) % 12;
    let match = false;
    let matchedBase = null;
    let observedShift = null;
    const micConf = isFinite(micEngine.lastDetectedConfidence) ? micEngine.lastDetectedConfidence : 0;
    const micFreq = micEngine.lastDetectedFreq;
    const micFreqTol = micConf >= 0.82 ? 55 : (micConf >= 0.66 ? 49 : 44);

    if (expected.length){
      if (state.judgeOctShift == null){
        if (inputSource === 'mic' && micConf >= 0.44 && isFinite(micFreq)){
          const near = findMicFreqExpectedMatch(expected, midi, micFreq, null, micFreqTol);
          if (near){
            match = true;
            matchedBase = near.target;
            observedShift = near.shift;
          }
        }
        const pc = pitchClass(midi);
        if (!match){
          for (const target of expected){
            if (pitchClass(target) === pc){
              match = true;
              matchedBase = target;
              observedShift = (midi - target) / 12;
              break;
            }
          }
        }
      } else {
        const shift = state.judgeOctShift;
        const shifted = expected.map((target) => ({ target, shiftedMidi: target + 12 * shift }));
        const exact = shifted.find((item) => midi === item.shiftedMidi);
        if (exact){
          match = true;
          matchedBase = exact.target;
          observedShift = (midi - exact.target) / 12;
        }

        if (!match && inputSource === 'mic' && micConf >= 0.44 && isFinite(micFreq)){
          const near = findMicFreqExpectedMatch(expected, midi, micFreq, shift, micFreqTol);
          if (near){
            match = true;
            matchedBase = near.target;
            observedShift = near.shift;
          }
        }

        if (!match && inputSource === 'mic' && micConf >= 0.56){
          const pc = pitchClass(midi);
          const pcMatch = expected.find((target) => pitchClass(target) === pc);
          if (pcMatch != null){
            match = true;
            matchedBase = pcMatch;
            observedShift = (midi - pcMatch) / 12;
          }
        }
      }
    }

    if (!match && inputSource === 'mic'){
      const buffered = findBufferedMicMatchForEvent(ev, 68);
      if (buffered){
        match = true;
        matchedBase = buffered.target;
        observedShift = buffered.shift;
      }
    }

    if (match){
      const errorSec = nowSec - ev.timeSec;
      const absErrorSec = Math.abs(errorSec);
      const timingStatus = (inputSource === 'mic' && windowInfo.onlyMicMode)
        ? 'correct'
        : (absErrorSec <= strictTolSec ? 'correct' : 'wrong');
      markJudgeEvent(ev, timingStatus);
      if (state.calibrationEnabled){
        const rawDelta = nowSecRaw - ev.timeSec;
        const delta = (inputSource === 'mic')
          ? clamp(rawDelta, -0.14, 0.14)
          : rawDelta;
        const keepRatio = (inputSource === 'mic') ? 0.82 : 0.7;
        const nextOffset = (state.calibrationOffsetSec * keepRatio) + (delta * (1 - keepRatio));
        state.calibrationOffsetSec = Math.max(-0.25, Math.min(0.25, nextOffset));
      }
      if (matchedBase != null && isFinite(observedShift)){
        registerOctShiftObservation(observedShift, inputSource);
      }
      state.judgeGateUntilSec = nowSec + (inputSource === 'mic' ? 0.04 : 0.03);
      state.judgeIndex++;
    } else {
      if (inputSource === 'mic') return;
      markJudgeEvent(ev, 'wrong');
      state.judgeGateUntilSec = nowSec + 0.03;
      state.judgeIndex++;
    }
  }

  function applyCalibrationAuto(){
    if (!calibrationToggleEl) return;
    if (!hasAnyJudgeInputConfigured()){
      if (calibrationToggleEl.checked){
        calibrationToggleEl.checked = false;
        updateCalibrationToggleVisual();
      }
      state.calibrationEnabled = false;
      state.calibrationOffsetSec = 0;
      clearJudgementStyles();
      syncJudgeInputEngines();
      return;
    }
    state.calibrationEnabled = !!calibrationToggleEl.checked;
    syncJudgeInputEngines();
  }

  const svgns = 'http://www.w3.org/2000/svg';

  function openChallengeModal(){
    const modal = $('challengeModal');
    const prep = $('challengePrepTime');
    const bpm = $('challengeBPM');
    const cursorToggle = $('challengeCursorToggle');
    const metronomeToggle = $('challengeMetronomeToggle');
    const hideToggle = $('challengeHideToggle');
    const calibrationToggle = $('challengeCalibrationToggle');
    const modalModeToggle = $('challengeModeToggleModal');
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
      if (calibrationToggle && typeof saved.calibration === 'boolean') { calibrationToggle.checked = saved.calibration; }
    } catch(_) {}
    if (modalModeToggle) modalModeToggle.checked = !!(toggleEl && toggleEl.checked);
    if (cursorToggle && !hasCursorPref) cursorToggle.checked = true;
    if (metronomeToggle && !hasMetronomePref) metronomeToggle.checked = true;
    if (hideToggle && !hasHidePref) hideToggle.checked = false;
    if (calibrationToggle && !hasAnyJudgeInputConfigured()) {
      calibrationToggle.checked = false;
      state.calibrationEnabled = false;
    }
    updateCursorToggleVisual();
    updateMetronomeToggleVisual();
    updateHideToggleVisual();
    updateCalibrationToggleVisual();
    updateModalModeToggleVisual();
    if (modal) modal.style.display = 'flex';
  }

  function hideChallengeModal(){
    const modal = $('challengeModal');
    if (modal) modal.style.display = 'none';
  }

  function cancelChallengeSetup(){
    hideChallengeModal();
    if (toggleEl) { toggleEl.checked = false; updateSwitcherVisual(); }
    stopChallenge();
    if (modalModeToggleEl) { modalModeToggleEl.checked = false; updateModalModeToggleVisual(); }
  }

  function closeChallengeModal(){
    cancelChallengeSetup();
  }

  async function confirmChallengeSetup(){
    const prep = Math.max(0, parseInt(($('challengePrepTime').value||'0'), 10));
    const bpm = Math.max(40, Math.min(240, parseInt(($('challengeBPM').value||'80'), 10)));
    const cursorEnabled = $('challengeCursorToggle') ? $('challengeCursorToggle').checked : true;
    const metronomeEnabled = $('challengeMetronomeToggle') ? $('challengeMetronomeToggle').checked : true;
    const hideEnabled = $('challengeHideToggle') ? $('challengeHideToggle').checked : false;
    const calibrationRequested = $('challengeCalibrationToggle') ? $('challengeCalibrationToggle').checked : false;
    const calibrationEnabled = calibrationRequested && hasAnyJudgeInputConfigured();
    try { localStorage.setItem('ic_jianpu_challenge_settings', JSON.stringify({ prep, bpm, cursor: cursorEnabled, metronome: metronomeEnabled, hide: hideEnabled, calibration: calibrationEnabled })); } catch(_) {}
    state.calibrationEnabled = calibrationEnabled;
    state.calibrationOffsetSec = 0;
    hideChallengeModal();
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

  function updateCalibrationToggleVisual(){
    const slider = calibrationToggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (calibrationToggleEl.checked){
      slider.style.backgroundColor = '#e53935';
      knob.style.transform = 'translateX(26px)';
    } else {
      slider.style.backgroundColor = '#ccc';
      knob.style.transform = 'translateX(0px)';
      clearJudgementStyles();
    }
  }

  function updateModalModeToggleVisual(){
    const slider = modalModeToggleEl?.parentElement?.querySelector('.slider');
    const knob = slider ? slider.querySelector('.slider-button') : null;
    if (!slider || !knob) return;
    if (modalModeToggleEl.checked){
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
            const globalIndex = noteToGlobalIndex.has(n) ? noteToGlobalIndex.get(n) : null;
            const noteIndex = noteSlots.length;
            const tieType = inferTieType(notes, ni);
            noteSlots.push({ tieType, tied: n.tied, midi: n.midi, posBeats: pos, globalIndex });
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
              events.push({
                measure: mi,
                posBeats: pos,
                absBeats: absQN + pos,
                durBeats: dur,
                isRest: false,
                noteIndex,
                globalIndex
              });
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
    if (state.judgeEvents && state.judgeEvents.length) {
      startJudgeTimeline(startTs);
    }

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
    let patternInfo = null;
    try { if (typeof loadMetronomePatternSettings === 'function') loadMetronomePatternSettings(); } catch(_) {}
    try { if (typeof getMetronomePatternInfo === 'function') patternInfo = getMetronomePatternInfo(bpm); } catch(_) {}
    const usePattern = !!(patternInfo && patternInfo.usePattern && Array.isArray(patternInfo.steps) && patternInfo.steps.length);
    const subdivision = usePattern ? (patternInfo.subdivision || 1) : 1;
    const stepsPerBar = usePattern ? (patternInfo.stepsPerBar || (tsInfo.beats * subdivision)) : tsInfo.beats;
    const stepsPerPattern = usePattern ? (patternInfo.stepsPerPattern || stepsPerBar) : stepsPerBar;
    const steps = usePattern ? patternInfo.steps : new Array(stepsPerPattern).fill(1);
    const stepMs = usePattern && patternInfo && patternInfo.stepDuration ? (patternInfo.stepDuration * 1000) : beatMs;
    let tickIndex = 0;
    function strongBeat(n){
      if (tsInfo.is68) return n === 1 || n === 4;
      return n === 1;
    }
    function scheduleTick(){
      if (!state.active || !state.metronomeEnabled) return;
      const target = anchorPerf + tickIndex * stepMs;
      const delay = Math.max(0, target - performance.now());
      state.metronomeTimerId = setTimeout(() => {
        if (!state.active || !state.metronomeEnabled) return;
        const stepInBar = stepsPerBar ? (tickIndex % stepsPerBar) : 0;
        const beatNumber = Math.floor(stepInBar / subdivision) + 1;
        const isBeatStart = (stepInBar % subdivision) === 0;
        const shouldPlay = !usePattern || steps[(tickIndex % stepsPerPattern)] === 1;
        state.lastBeatTimeMs = target;
        if (shouldPlay) {
          ensureClickAudio();
          try { playClick(isBeatStart && strongBeat(beatNumber)); } catch(_) {}
        }
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
    if (state.judgeEvents && state.judgeEvents.length) {
      startJudgeTimeline(anchorPerfStart);
    }

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
    if (state.active) stopChallenge({ keepToggle: true, keepAuto: true, keepMic: true });
    state.runId += 1;
    const runId = state.runId;
    state.active = true;
    state.autoRestart = true;
    state.cursorEnabled = cursorEnabled !== false;
    state.metronomeEnabled = metronomeEnabled !== false;
    state.hideEnabled = hideEnabled !== false;
    state.metronomeWasRunning = false;
    const judgeSyncPromise = syncJudgeInputEngines().catch(() => {});
    const onlyMicMode = shouldUseMicJudgeInput() && !isMidiEnabledConfigured();
    const syncWaitMs = onlyMicMode ? 6500 : 1200;
    await Promise.race([
      judgeSyncPromise,
      new Promise((resolve) => setTimeout(resolve, syncWaitMs))
    ]);
    if (onlyMicMode && !micEngine.running) {
      state.calibrationEnabled = false;
      state.calibrationOffsetSec = 0;
      if (calibrationToggleEl && calibrationToggleEl.checked){
        calibrationToggleEl.checked = false;
        updateCalibrationToggleVisual();
      }
      refreshMicStatus();
    }

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
    if (!state.active || state.runId !== runId) return;
    await ensureScoreReady();
    if (!state.active || state.runId !== runId) return;
    const rects = await waitForMeasuresReady(Math.max(3000, prepSec*1000));
    if (!state.active || state.runId !== runId) return;
    state.measureRects = rects;
    state.measureRects = await waitForStableMeasures(state.measureRects, 500);
    if (!state.active || state.runId !== runId) return;

    const nowMs = Date.now();
    const remainMs = Math.max(0, prepSec*1000 - (nowMs - tStart));
    await new Promise(r => setTimeout(r, remainMs));
    if (!state.active || state.runId !== runId) return;
    if (state.countdownTimerId) { clearInterval(state.countdownTimerId); state.countdownTimerId = null; }
    hideCountdownUI();

    if (!state.measureRects || !state.measureRects.length){
      if (typeof window.generateMelody === 'function') {
        try { await window.generateMelody(); } catch(_) {}
      }
      if (!state.active || state.runId !== runId) return;
      await ensureScoreReady();
      if (!state.active || state.runId !== runId) return;
      state.measureRects = await waitForMeasuresReady(5000);
      if (!state.active || state.runId !== runId) return;
      state.measureRects = await waitForStableMeasures(state.measureRects, 400);
      if (!state.active || state.runId !== runId) return;
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
    clearJudgementStyles();
    state.judgeWindowMs = Math.max(90, Math.min(220, (60 / Math.max(1, bpm)) * 0.35 * 1000));
    state.judgeOctShift = null;
    state.judgeOctShiftCandidate = null;
    state.judgeOctShiftCandidateCount = 0;
    const judgeWindows = computeJudgeWindows(bpm);
    state.judgeBeatDurationSec = judgeWindows.beatSec;
    state.judgeEvents = buildJudgeTimeline(bpm);
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
    const keepMic = !!opts.keepMic;
    state.runId += 1;
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
    stopJudgeTimeline();
    state.judgeOctShift = null;
    state.judgeOctShiftCandidate = null;
    state.judgeOctShiftCandidateCount = 0;
    state.judgeBeatDurationSec = 0;
    state.calibrationEnabled = false;
    state.calibrationOffsetSec = 0;
    if (!keepMic){
      stopMicCapture();
    }
    refreshMicStatus();
    clearJudgementStyles();
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
        let stepMs = beatMs;
        let patternInfo = null;
        try { if (typeof loadMetronomePatternSettings === 'function') loadMetronomePatternSettings(); } catch(_) {}
        try { if (typeof getMetronomePatternInfo === 'function') patternInfo = getMetronomePatternInfo(bpm); } catch(_) {}
        if (patternInfo && patternInfo.usePattern && patternInfo.stepDuration) {
          stepMs = patternInfo.stepDuration * 1000;
        }
        const nextBeat = state.lastBeatTimeMs + stepMs;
        state.nextCountInDelayMs = Math.max(0, nextBeat - performance.now());
      } else {
        state.nextCountInDelayMs = 0;
      }
      stopChallenge({ keepToggle: true, keepAuto: true, keepMic: true });
      const cursorEnabled = $('challengeCursorToggle') ? $('challengeCursorToggle').checked : true;
      const metronomeEnabled = $('challengeMetronomeToggle') ? $('challengeMetronomeToggle').checked : true;
      const hideEnabled = $('challengeHideToggle') ? $('challengeHideToggle').checked : false;
      const calibrationRequested = $('challengeCalibrationToggle') ? $('challengeCalibrationToggle').checked : false;
      const calibrationEnabled = calibrationRequested && hasAnyJudgeInputConfigured();
      state.calibrationEnabled = calibrationEnabled;
      state.calibrationOffsetSec = 0;
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
  if (calibrationToggleEl){
    calibrationToggleEl.addEventListener('change', () => {
      updateCalibrationToggleVisual();
      applyCalibrationAuto();
    });
    updateCalibrationToggleVisual();
  }
  if (modalModeToggleEl){
    modalModeToggleEl.addEventListener('change', ()=>{
      updateModalModeToggleVisual();
      if (!modalModeToggleEl.checked){
        cancelChallengeSetup();
        return;
      }
      if (toggleEl && !toggleEl.checked){
        toggleEl.checked = true;
        updateSwitcherVisual();
      }
    });
    updateModalModeToggleVisual();
  }

  const micEnableToggleEl = $('micEnableToggle');
  const micDeviceSelectEl = $('micDeviceSelect');
  micEngine.selectedDeviceId = readMicDeviceStored();
  if (micEnableToggleEl){
    const storedMic = readMicEnabledStored();
    micEnableToggleEl.checked = storedMic;
    micEnableToggleEl.addEventListener('change', async () => {
      writeMicEnabledStored(!!micEnableToggleEl.checked);
      micEngine.autoWarmupTried = false;
      micEngine.warmupInFlight = false;
      micEngine.permissionDenied = false;
      micEngine.lastError = false;
      if (!micEnableToggleEl.checked){
        stopMicCapture();
      } else {
        await warmupMicPermissionForDeviceLabels();
      }
      await updateMicDeviceList();
      refreshMicStatus();
      applyCalibrationAuto();
    });
  }
  if (micDeviceSelectEl){
    micDeviceSelectEl.addEventListener('pointerdown', async () => {
      if (!isMicEnabledConfigured()) return;
      if (hasNamedMicDevices(micEngine.devices)) return;
      if (micEngine.autoWarmupTried || micEngine.warmupInFlight) return;
      micEngine.autoWarmupTried = false;
      await warmupMicPermissionForDeviceLabels();
      await updateMicDeviceList();
      refreshMicStatus();
    });
    micDeviceSelectEl.addEventListener('change', async () => {
      micEngine.selectedDeviceId = micDeviceSelectEl.value || '';
      updateSelectedMicLabel();
      writeMicDeviceStored(micEngine.selectedDeviceId);
      micEngine.permissionDenied = false;
      micEngine.lastError = false;
      if (micEngine.running){
        stopMicCapture();
      }
      await syncJudgeInputEngines();
      refreshMicStatus();
    });
  }

  window.addEventListener('ic-midi-connection', () => {
    applyCalibrationAuto();
  });
  try {
    if (window.__icMidi && typeof window.__icMidi.getState === 'function') {
      applyCalibrationAuto();
    }
  } catch(_) {}

  if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function'){
    navigator.mediaDevices.addEventListener('devicechange', () => {
      updateMicDeviceList().then(() => refreshMicStatus()).catch(() => {});
    });
  }

  window.addEventListener('storage', (ev) => {
    if (!ev) return;
    if (ev.key === micStorageKey && micEnableToggleEl){
      const next = readMicEnabledStored();
      if (micEnableToggleEl.checked !== next) micEnableToggleEl.checked = next;
      applyCalibrationAuto();
      refreshMicStatus();
      return;
    }
    if (ev.key === micDeviceStorageKey){
      micEngine.selectedDeviceId = readMicDeviceStored();
      updateMicDeviceList().then(() => {
        if (micEngine.running){
          stopMicCapture();
        }
        applyCalibrationAuto();
        refreshMicStatus();
      }).catch(() => {
        refreshMicStatus();
      });
    }
  });

  window.addEventListener('focus', () => {
    updateMicDeviceList().then(() => {
      refreshMicStatus();
    }).catch(() => {
      refreshMicStatus();
    });
  });

  updateMicDeviceList().then(() => {
    refreshMicStatus();
    applyCalibrationAuto();
  }).catch(() => {});

  window.__icChallenge = {
    isActive: () => !!(state.active && toggleEl && toggleEl.checked),
    handleMidiNoteOn: (midi) => handleJudgeInput(midi, 'midi'),
    clearJudgement: () => clearJudgementStyles()
  };
  window.__icMic = {
    refreshStatus: () => {
      updateMicDeviceList().catch(()=>{});
      refreshMicStatus();
    },
    getState: () => ({
      enabled: isMicEnabledConfigured(),
      running: micEngine.running,
      permissionDenied: micEngine.permissionDenied,
      selectedDeviceId: micEngine.selectedDeviceId || '',
      selectedDeviceLabel: micEngine.selectedDeviceLabel || '',
      devices: Array.isArray(micEngine.devices) ? micEngine.devices.slice() : []
    })
  };

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
