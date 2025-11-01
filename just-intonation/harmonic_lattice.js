(() => {
  const DEFAULT_BASE = 261.63;
  const BASE_OCTAVE = 4;
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const OCTAVE_MIN = -6;
  const OCTAVE_MAX = 6;

  const latticeConfig = {
    spacingX: 120,
    spacingY: 110,
    attack: 0.04,
    release: 0.25,
    sustainLevel: 0.75,
    initialFifthRange: 10,
    initialThirdRange: 8,
    expandStep: 4,
    expandMargin: 1.2
  };

  const svgNS = 'http://www.w3.org/2000/svg';

  const state = {
    baseFrequency: DEFAULT_BASE,
    nodes: [],
    nodeMap: new Map(),
    edgeKeys: new Set(),
    selectedIds: new Set(),
    voices: new Map(),
    isPlaying: false,
    viewTranslate: { x: 0, y: 0 },
    viewBox: { width: 960, height: 640 },
    audioCtx: null,
    masterGain: null,
    dom: {},
    pan: { active: false, pointerId: null, lastX: 0, lastY: 0 },
    bounds: {
      fifthMin: 0,
      fifthMax: 0,
      thirdMin: 0,
      thirdMax: 0
    },
    hintDismissed: false,
    expandScheduled: false,
    popover: {
      nodeId: null,
      root: null,
      title: null,
      info: null,
      offsetLabel: null,
      upBtn: null,
      downBtn: null,
      resetBtn: null
    }
  };

  function init() {
    bindDom();
    configureSvgLayers();
    initialiseView();
    buildInitialLattice();
    createOctavePopover();
    attachEventHandlers();
    updateNodeFrequencies();
    updateSelectionReadout();
  }

  function bindDom() {
    state.dom.baseInput = document.getElementById('baseFrequencyInput');
    state.dom.waveformSelect = document.getElementById('waveformSelect');
    state.dom.playBtn = document.getElementById('playToggleBtn');
    state.dom.pauseBtn = document.getElementById('pauseBtn');
    state.dom.clearBtn = document.getElementById('clearSelectionBtn');
    state.dom.resetBtn = document.getElementById('resetBaseBtn');
    state.dom.selectionReadout = document.getElementById('selectionReadout');
    state.dom.svg = document.getElementById('lattice');
    state.dom.wrapper = document.querySelector('.lattice-wrapper');
    state.dom.panHint = document.querySelector('.pan-hint');
  }

  function createOctavePopover() {
    const popover = document.createElement('div');
    popover.className = 'octave-popover hidden';
    popover.innerHTML = `
      <h3 class="octave-title"></h3>
      <div class="octave-frequency"></div>
      <div class="octave-offset-row">当前八度偏移：<span class="octave-offset">0</span></div>
      <div class="octave-actions">
        <button type="button" data-action="down" class="secondary">降八度</button>
        <button type="button" data-action="reset" class="secondary">重置</button>
        <button type="button" data-action="up">升八度</button>
      </div>
    `;
    document.body.appendChild(popover);

    state.popover.root = popover;
    state.popover.title = popover.querySelector('.octave-title');
    state.popover.info = popover.querySelector('.octave-frequency');
    state.popover.offsetLabel = popover.querySelector('.octave-offset');
    state.popover.upBtn = popover.querySelector('[data-action="up"]');
    state.popover.downBtn = popover.querySelector('[data-action="down"]');
    state.popover.resetBtn = popover.querySelector('[data-action="reset"]');

    popover.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });
    popover.addEventListener('click', (event) => {
      event.stopPropagation();
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.dataset.action;
      if (!action) return;
      const node = nodeFromId(state.popover.nodeId);
      if (!node) return;
      if (action === 'up') {
        adjustNodeOctave(node, 1);
      } else if (action === 'down') {
        adjustNodeOctave(node, -1);
      } else if (action === 'reset') {
        setNodeOctave(node, 0);
      }
      refreshPopover(node);
    });

    document.addEventListener('mousedown', (event) => {
      if (!state.popover.root || state.popover.root.classList.contains('hidden')) return;
      if (!state.popover.root.contains(event.target)) {
        hideOctavePopover();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideOctavePopover();
      }
    });
  }

  function configureSvgLayers() {
    const viewport = document.createElementNS(svgNS, 'g');
    viewport.setAttribute('class', 'viewport');

    const edgesLayer = document.createElementNS(svgNS, 'g');
    edgesLayer.setAttribute('class', 'edges');
    const nodesLayer = document.createElementNS(svgNS, 'g');
    nodesLayer.setAttribute('class', 'nodes');

    viewport.append(edgesLayer, nodesLayer);
    state.dom.svg.append(viewport);

    state.dom.viewport = viewport;
    state.dom.edgesLayer = edgesLayer;
    state.dom.nodesLayer = nodesLayer;
  }

  function initialiseView() {
    const viewBoxAttr = state.dom.svg.getAttribute('viewBox');
    if (viewBoxAttr) {
      const [, , w, h] = viewBoxAttr.split(/\s+/).map(Number);
      if (!Number.isNaN(w) && !Number.isNaN(h)) {
        state.viewBox.width = w;
        state.viewBox.height = h;
      }
    }
    state.viewTranslate.x = state.viewBox.width / 2;
    state.viewTranslate.y = state.viewBox.height / 2;
    updateViewTransform();
  }

  function updateViewTransform() {
    state.dom.viewport.setAttribute('transform', `translate(${state.viewTranslate.x}, ${state.viewTranslate.y})`);
  }

  function buildInitialLattice() {
    const fifthMin = -latticeConfig.initialFifthRange;
    const fifthMax = latticeConfig.initialFifthRange;
    const thirdMin = -latticeConfig.initialThirdRange;
    const thirdMax = latticeConfig.initialThirdRange;

    state.bounds.fifthMin = fifthMin;
    state.bounds.fifthMax = fifthMax;
    state.bounds.thirdMin = thirdMin;
    state.bounds.thirdMax = thirdMax;

    for (let third = thirdMin; third <= thirdMax; third += 1) {
      for (let fifth = fifthMin; fifth <= fifthMax; fifth += 1) {
        ensureNode(fifth, third);
      }
    }
  }

  function ensureNode(fifthSteps, thirdSteps) {
    const id = `${fifthSteps}_${thirdSteps}`;
    if (state.nodeMap.has(id)) {
      return state.nodeMap.get(id);
    }

    const node = createNodeData(fifthSteps, thirdSteps);
    state.nodes.push(node);
    state.nodeMap.set(id, node);
    renderNode(node);
    connectNodeToNeighbors(node);
    return node;
  }

  function createNodeData(fifthSteps, thirdSteps) {
    const rawRatio = multiplyRational(
      rationalPow({ n: 3n, d: 2n }, fifthSteps),
      rationalPow({ n: 5n, d: 4n }, thirdSteps)
    );
    const normalized = normalizeRationalToOctave(rawRatio);
    const ratioValue = Number(normalized.ratio.n) / Number(normalized.ratio.d);
    const octaveShift = normalized.octaveShift;
    const semitoneOffset = fifthSteps * 7 + thirdSteps * 4 - octaveShift * 12;
    const noteName = computeNoteName(semitoneOffset);
    const ratioString = rationalToString(normalized.ratio);
    const position = computeNodePosition(fifthSteps, thirdSteps);

    return {
      id: `${fifthSteps}_${thirdSteps}`,
      fifthSteps,
      thirdSteps,
      rawRatio,
      normalizedRatio: normalized.ratio,
      ratioValue,
      octaveOffset: 0,
      ratioString,
      octaveShift,
      semitoneOffset,
      noteName,
      position,
      frequency: state.baseFrequency * ratioValue,
      dom: {}
    };
  }

  function computeNodePosition(fifthSteps, thirdSteps) {
    const { spacingX, spacingY } = latticeConfig;
    const x = fifthSteps * spacingX + thirdSteps * (spacingX / 2);
    const y = -thirdSteps * spacingY;
    return { x, y };
  }

  function renderNode(node) {
    const group = document.createElementNS(svgNS, 'g');
    const isBase = node.fifthSteps === 0 && node.thirdSteps === 0;
    group.setAttribute('class', `node${isBase ? ' base' : ''}`);
    group.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);
    group.setAttribute('tabindex', '0');
    group.dataset.nodeId = node.id;

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '34');

    const noteText = document.createElementNS(svgNS, 'text');
    noteText.setAttribute('class', 'note');
    noteText.setAttribute('y', '-6');
    noteText.textContent = node.noteName;

    const ratioText = document.createElementNS(svgNS, 'text');
    ratioText.setAttribute('class', 'ratio');
    ratioText.setAttribute('y', '14');
    ratioText.textContent = formatRatioLabel(node);

    const title = document.createElementNS(svgNS, 'title');
    title.textContent = formatTooltip(node);

    group.append(circle, noteText, ratioText, title);
    state.dom.nodesLayer.appendChild(group);

    group.addEventListener('click', (event) => {
      event.stopPropagation();
      handleNodeInteraction(event, node);
    });
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNodeInteraction(event, node);
      }
    });
    group.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleNodeDoubleClick(event, node);
    });

    node.dom.group = group;
    node.dom.circle = circle;
    node.dom.noteText = noteText;
    node.dom.ratioText = ratioText;
    node.dom.title = title;
  }

  function connectNodeToNeighbors(node) {
    const neighbors = [
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 }
    ];
    for (const { dx, dy } of neighbors) {
      const neighborId = `${node.fifthSteps + dx}_${node.thirdSteps + dy}`;
      const neighbor = state.nodeMap.get(neighborId);
      if (neighbor) {
        drawEdgeBetween(node, neighbor);
      }
    }
  }

  function drawEdgeBetween(nodeA, nodeB) {
    const key = [nodeA.id, nodeB.id].sort().join('|');
    if (state.edgeKeys.has(key)) return;

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', nodeA.position.x);
    line.setAttribute('y1', nodeA.position.y);
    line.setAttribute('x2', nodeB.position.x);
    line.setAttribute('y2', nodeB.position.y);
    state.dom.edgesLayer.appendChild(line);

    state.edgeKeys.add(key);
  }

  function handleNodeInteraction(event, node) {
    const solo = event.metaKey || event.ctrlKey;
    if (solo) {
      state.selectedIds.clear();
      state.selectedIds.add(node.id);
    } else if (state.selectedIds.has(node.id)) {
      state.selectedIds.delete(node.id);
    } else {
      state.selectedIds.add(node.id);
    }

    refreshSelectionClasses();
    updateSelectionReadout();
    if (state.isPlaying) {
      syncVoicesWithSelection();
    }
  }

  function refreshSelectionClasses() {
    for (const node of state.nodes) {
      if (state.selectedIds.has(node.id)) {
        node.dom.group.classList.add('selected');
      } else {
        node.dom.group.classList.remove('selected');
      }
    }
  }

  function attachEventHandlers() {
    state.dom.baseInput.addEventListener('input', () => {
      const value = Number(state.dom.baseInput.value);
      if (Number.isFinite(value) && value > 0) {
        state.baseFrequency = value;
        updateNodeFrequencies();
        if (state.isPlaying) {
          syncVoiceFrequencies();
        }
      }
    });

    state.dom.baseInput.addEventListener('blur', () => {
      const value = Number(state.dom.baseInput.value);
      if (!Number.isFinite(value) || value <= 0) {
        state.dom.baseInput.value = state.baseFrequency.toFixed(2);
      }
    });

    state.dom.resetBtn.addEventListener('click', () => {
      state.baseFrequency = DEFAULT_BASE;
      state.dom.baseInput.value = DEFAULT_BASE.toFixed(2);
      updateNodeFrequencies();
      if (state.isPlaying) {
        syncVoiceFrequencies();
      }
    });

    state.dom.waveformSelect.addEventListener('change', () => {
      if (state.isPlaying) {
        const waveform = state.dom.waveformSelect.value;
        for (const voice of state.voices.values()) {
          try {
            voice.osc.type = waveform;
          } catch (error) {
            console.warn('Failed to update oscillator type', error);
          }
        }
      }
    });

    state.dom.playBtn.addEventListener('click', () => {
      if (state.isPlaying) {
        return;
      }
      if (!state.selectedIds.size) {
        const baseNode = state.nodeMap.get('0_0');
        if (baseNode) {
          state.selectedIds.add(baseNode.id);
          refreshSelectionClasses();
          updateSelectionReadout();
        }
      }
      startContinuousPlayback();
    });

    state.dom.pauseBtn.addEventListener('click', () => {
      pausePlayback();
    });

    state.dom.clearBtn.addEventListener('click', () => {
      state.selectedIds.clear();
      refreshSelectionClasses();
      updateSelectionReadout();
      if (state.isPlaying) {
        syncVoicesWithSelection();
      }
    });

    state.dom.svg.addEventListener('click', (event) => {
      if (event.target === state.dom.svg) {
        state.selectedIds.clear();
        refreshSelectionClasses();
        updateSelectionReadout();
        if (state.isPlaying) {
          syncVoicesWithSelection();
        }
      }
    });

    state.dom.wrapper.addEventListener('pointerdown', handlePanStart);
    state.dom.wrapper.addEventListener('pointermove', handlePanMove);
    state.dom.wrapper.addEventListener('pointerup', handlePanEnd);
    state.dom.wrapper.addEventListener('pointercancel', handlePanEnd);
    state.dom.wrapper.addEventListener('pointerleave', (event) => {
      if (state.pan.active && event.pointerId === state.pan.pointerId) {
        handlePanEnd(event);
      }
    });
    state.dom.wrapper.addEventListener('wheel', handleWheelPan, { passive: false });
  }

  function updateNodeFrequencies() {
    for (const node of state.nodes) {
      updateNodeFrequency(node);
    }
  }

  function startContinuousPlayback() {
    if (!state.selectedIds.size) return;
    ensureAudioContext();
    state.isPlaying = true;
    updatePlayButtonState();
    syncVoicesWithSelection();
  }

  function pausePlayback() {
    if (!state.isPlaying && state.voices.size === 0) return;
    state.isPlaying = false;
    updatePlayButtonState();
    stopAllVoices();
  }

  function updatePlayButtonState() {
    if (state.isPlaying) {
      state.dom.playBtn.textContent = '播放中';
      state.dom.playBtn.dataset.state = 'playing';
    } else {
      state.dom.playBtn.textContent = '播放';
      state.dom.playBtn.dataset.state = 'stopped';
    }
  }

  function ensureAudioContext() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtx();
      state.masterGain = state.audioCtx.createGain();
      state.masterGain.gain.value = 0.4;
      state.masterGain.connect(state.audioCtx.destination);
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  function syncVoicesWithSelection() {
    if (!state.isPlaying) {
      stopAllVoices();
      return;
    }

    const desired = new Set(state.selectedIds);

    for (const nodeId of Array.from(state.voices.keys())) {
      if (!desired.has(nodeId)) {
        stopVoice(nodeId);
      }
    }

    const waveform = state.dom.waveformSelect.value;
    for (const nodeId of desired) {
      if (!state.voices.has(nodeId)) {
        const node = nodeFromId(nodeId);
        if (node) {
          startVoice(node, waveform);
        }
      } else {
        const node = nodeFromId(nodeId);
        const voice = state.voices.get(nodeId);
        if (node && voice) {
          try {
            voice.osc.frequency.setValueAtTime(node.frequency, ensureAudioContext().currentTime);
          } catch (error) {
            console.warn('Failed to refresh oscillator frequency', error);
          }
        }
      }
    }
  }

  function syncVoiceFrequencies() {
    const ctx = ensureAudioContext();
    const now = ctx.currentTime;
    for (const [nodeId, voice] of state.voices.entries()) {
      const node = nodeFromId(nodeId);
      if (node) {
        try {
          voice.osc.frequency.setValueAtTime(node.frequency, now);
        } catch (error) {
          console.warn('Failed to retune oscillator', error);
        }
      }
    }
  }

  function handleNodeDoubleClick(event, node) {
    showOctavePopover(node, event.clientX, event.clientY);
  }

  function adjustNodeOctave(node, delta) {
    const next = clamp(node.octaveOffset + delta, OCTAVE_MIN, OCTAVE_MAX);
    if (next === node.octaveOffset) return;
    node.octaveOffset = next;
    updateNodeFrequency(node);
    updateRatioLabel(node);
    if (state.selectedIds.has(node.id)) {
      updateSelectionReadout();
    }
    if (state.isPlaying && state.voices.has(node.id)) {
      const voice = state.voices.get(node.id);
      if (voice) {
        try {
          voice.osc.frequency.setValueAtTime(node.frequency, ensureAudioContext().currentTime);
        } catch (error) {
          console.warn('Failed to refresh oscillator frequency', error);
        }
      }
    }
    if (state.popover.nodeId === node.id) {
      refreshPopover(node);
    }
  }

  function setNodeOctave(node, value) {
    const clamped = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
    if (clamped === node.octaveOffset) return;
    node.octaveOffset = clamped;
    updateNodeFrequency(node);
    updateRatioLabel(node);
    if (state.selectedIds.has(node.id)) {
      updateSelectionReadout();
    }
    if (state.isPlaying && state.voices.has(node.id)) {
      const voice = state.voices.get(node.id);
      if (voice) {
        try {
          voice.osc.frequency.setValueAtTime(node.frequency, ensureAudioContext().currentTime);
        } catch (error) {
          console.warn('Failed to refresh oscillator frequency', error);
        }
      }
    }
    if (state.popover.nodeId === node.id) {
      refreshPopover(node);
    }
  }

  function updateNodeFrequency(node) {
    const ratioWithOctave = node.ratioValue * Math.pow(2, node.octaveOffset);
    node.frequency = state.baseFrequency * ratioWithOctave;
    node.dom.title.textContent = formatTooltip(node);
    if (state.popover.nodeId === node.id) {
      refreshPopover(node);
    }
  }

  function updateRatioLabel(node) {
    if (node.dom && node.dom.ratioText) {
      node.dom.ratioText.textContent = formatRatioLabel(node);
    }
    if (state.popover.nodeId === node.id) {
      refreshPopover(node);
    }
  }

  function startVoice(node, waveform) {
    const ctx = ensureAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = waveform;
    osc.frequency.setValueAtTime(node.frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(latticeConfig.sustainLevel, now + latticeConfig.attack);

    osc.connect(gain);
    gain.connect(state.masterGain);
    osc.start(now);

    const voice = { nodeId: node.id, osc, gain };
    state.voices.set(node.id, voice);
    node.dom.group.classList.add('playing');

    osc.addEventListener('ended', () => finalizeVoice(node.id), { once: true });
  }

  function stopVoice(nodeId) {
    const voice = state.voices.get(nodeId);
    if (!voice) return;
    const node = nodeFromId(nodeId);
    const ctx = ensureAudioContext();
    const now = ctx.currentTime;

    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + latticeConfig.release);
      voice.osc.stop(now + latticeConfig.release + 0.05);
    } catch (error) {
      console.warn('Failed to stop oscillator', error);
    }

    finalizeVoice(nodeId, node);
  }

  function finalizeVoice(nodeId, nodeRef) {
    const node = nodeRef || nodeFromId(nodeId);
    if (node) {
      node.dom.group.classList.remove('playing');
    }
    state.voices.delete(nodeId);
  }

  function stopAllVoices() {
    for (const nodeId of Array.from(state.voices.keys())) {
      stopVoice(nodeId);
    }
  }

  function updateSelectionReadout() {
    if (!state.selectedIds.size) {
      state.dom.selectionReadout.innerHTML = '<span class="muted">未选中任何节点。</span>';
      return;
    }
    const items = Array.from(state.selectedIds)
      .map((id) => state.nodeMap.get(id))
      .filter(Boolean)
      .map((node) => `<li>${node.noteName} · ${formatRatioLabel(node)} · ${node.frequency.toFixed(2)} Hz</li>`)
      .join('');
    state.dom.selectionReadout.innerHTML = `<ul>${items}</ul>`;
  }

  function handlePanStart(event) {
    if (event.target.closest('.node')) {
      return;
    }
    state.dom.wrapper.setPointerCapture(event.pointerId);
    state.pan = {
      active: true,
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY
    };
    state.dom.wrapper.classList.add('dragging');
    dismissPanHint();
  }

  function handlePanMove(event) {
    if (!state.pan.active || event.pointerId !== state.pan.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - state.pan.lastX;
    const dy = event.clientY - state.pan.lastY;
    state.pan.lastX = event.clientX;
    state.pan.lastY = event.clientY;

    state.viewTranslate.x += dx;
    state.viewTranslate.y += dy;
    updateViewTransform();
    scheduleExpandCheck();
  }

  function handlePanEnd(event) {
    if (!state.pan.active || event.pointerId !== state.pan.pointerId) return;
    state.pan.active = false;
    state.dom.wrapper.classList.remove('dragging');
    state.dom.wrapper.releasePointerCapture(event.pointerId);
  }

  function handleWheelPan(event) {
    event.preventDefault();
    dismissPanHint();

    const factor = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
      ? 1
      : event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 32
        : state.viewBox.height;

    state.viewTranslate.x -= event.deltaX * factor;
    state.viewTranslate.y -= event.deltaY * factor;
    updateViewTransform();
    scheduleExpandCheck();
  }

  function scheduleExpandCheck() {
    if (state.expandScheduled) return;
    state.expandScheduled = true;
    requestAnimationFrame(() => {
      state.expandScheduled = false;
      maybeExpandLattice();
    });
  }

  function dismissPanHint() {
    if (state.hintDismissed) return;
    state.hintDismissed = true;
    if (state.dom.panHint) {
      state.dom.panHint.style.opacity = '0';
      state.dom.panHint.style.transition = 'opacity 0.4s ease';
      setTimeout(() => {
        if (state.dom.panHint && state.dom.panHint.parentNode) {
          state.dom.panHint.parentNode.removeChild(state.dom.panHint);
        }
      }, 500);
    }
  }

  function maybeExpandLattice() {
    const visible = computeVisibleBounds();
    const margin = latticeConfig.expandMargin;
    const step = latticeConfig.expandStep;

    if (visible.minFifth <= state.bounds.fifthMin + margin) {
      extendFifths(-step);
    }
    if (visible.maxFifth >= state.bounds.fifthMax - margin) {
      extendFifths(step);
    }
    if (visible.minThird <= state.bounds.thirdMin + margin) {
      extendThirds(-step);
    }
    if (visible.maxThird >= state.bounds.thirdMax - margin) {
      extendThirds(step);
    }
  }

  function extendFifths(delta) {
    if (delta < 0) {
      const newMin = state.bounds.fifthMin + delta;
      for (let fifth = newMin; fifth < state.bounds.fifthMin; fifth += 1) {
        for (let third = state.bounds.thirdMin; third <= state.bounds.thirdMax; third += 1) {
          ensureNode(fifth, third);
        }
      }
      state.bounds.fifthMin = newMin;
    } else if (delta > 0) {
      const newMax = state.bounds.fifthMax + delta;
      for (let fifth = state.bounds.fifthMax + 1; fifth <= newMax; fifth += 1) {
        for (let third = state.bounds.thirdMin; third <= state.bounds.thirdMax; third += 1) {
          ensureNode(fifth, third);
        }
      }
      state.bounds.fifthMax = newMax;
    }
  }

  function extendThirds(delta) {
    if (delta < 0) {
      const newMin = state.bounds.thirdMin + delta;
      for (let third = newMin; third < state.bounds.thirdMin; third += 1) {
        for (let fifth = state.bounds.fifthMin; fifth <= state.bounds.fifthMax; fifth += 1) {
          ensureNode(fifth, third);
        }
      }
      state.bounds.thirdMin = newMin;
    } else if (delta > 0) {
      const newMax = state.bounds.thirdMax + delta;
      for (let third = state.bounds.thirdMax + 1; third <= newMax; third += 1) {
        for (let fifth = state.bounds.fifthMin; fifth <= state.bounds.fifthMax; fifth += 1) {
          ensureNode(fifth, third);
        }
      }
      state.bounds.thirdMax = newMax;
    }
  }

  function computeVisibleBounds() {
    const corners = [
      { sx: 0, sy: 0 },
      { sx: state.viewBox.width, sy: 0 },
      { sx: 0, sy: state.viewBox.height },
      { sx: state.viewBox.width, sy: state.viewBox.height }
    ];

    let minFifth = Infinity;
    let maxFifth = -Infinity;
    let minThird = Infinity;
    let maxThird = -Infinity;

    for (const corner of corners) {
      const latticeCoord = screenToLattice(corner.sx, corner.sy);
      minFifth = Math.min(minFifth, latticeCoord.fifth);
      maxFifth = Math.max(maxFifth, latticeCoord.fifth);
      minThird = Math.min(minThird, latticeCoord.third);
      maxThird = Math.max(maxThird, latticeCoord.third);
    }

    return { minFifth, maxFifth, minThird, maxThird };
  }

  function screenToLattice(screenX, screenY) {
    const x = screenX - state.viewTranslate.x;
    const y = screenY - state.viewTranslate.y;
    const third = -y / latticeConfig.spacingY;
    const fifth = (x - third * (latticeConfig.spacingX / 2)) / latticeConfig.spacingX;
    return { fifth, third };
  }

  function formatTooltip(node) {
    const freq = node.frequency.toFixed(2);
    const octaveInfo = node.octaveOffset === 0 ? '±0' : (node.octaveOffset > 0 ? `+${node.octaveOffset}` : `${node.octaveOffset}`);
    return `音名: ${node.noteName}\n比值: ${formatRatioLabel(node)}\n八度偏移: ${octaveInfo}\n频率: ${freq} Hz`;
  }

  function formatRatioLabel(node) {
    if (!node) return '';
    if (!node.octaveOffset) {
      return node.ratioString;
    }
    return `${node.ratioString} ×2^${node.octaveOffset}`;
  }

  function computeNoteName(semitoneOffset) {
    const index = ((semitoneOffset % 12) + 12) % 12;
    const octave = BASE_OCTAVE + Math.floor(semitoneOffset / 12);
    return `${NOTE_NAMES[index]}${octave}`;
  }

  function nodeFromId(id) {
    return state.nodeMap.get(id);
  }

  // === Rational utilities ===

  function gcdBigInt(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n) {
      const temp = y;
      y = x % y;
      x = temp;
    }
    return x === 0n ? 1n : x;
  }

  function reduceRational(r) {
    let n = r.n;
    let d = r.d;
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const divisor = gcdBigInt(n, d);
    return { n: n / divisor, d: d / divisor };
  }

  function multiplyRational(a, b) {
    return reduceRational({ n: a.n * b.n, d: a.d * b.d });
  }

  function rationalPow(base, exponent) {
    if (exponent === 0) return { n: 1n, d: 1n };
    let result = { n: 1n, d: 1n };
    const times = Math.abs(exponent);
    for (let i = 0; i < times; i += 1) {
      result = multiplyRational(result, base);
    }
    if (exponent < 0) {
      return { n: result.d, d: result.n };
    }
    return result;
  }

  function normalizeRationalToOctave(ratio) {
    let current = reduceRational(ratio);
    let value = Number(current.n) / Number(current.d);
    let octaveShift = 0;
    while (value >= 2) {
      current = multiplyRational(current, { n: 1n, d: 2n });
      value = Number(current.n) / Number(current.d);
      octaveShift += 1;
    }
    while (value < 0.5) {
      current = multiplyRational(current, { n: 2n, d: 1n });
      value = Number(current.n) / Number(current.d);
      octaveShift -= 1;
    }
    return { ratio: reduceRational(current), octaveShift };
  }

  function rationalToString(r) {
    if (r.d === 1n) {
      return r.n.toString();
    }
    return `${r.n}/${r.d}`;
  }

  function showOctavePopover(node, clientX, clientY) {
    if (!state.popover.root) return;
    state.popover.nodeId = node.id;
    state.popover.title.textContent = `${node.noteName} · ${formatRatioLabel(node)}`;
    refreshPopover(node);

    const popover = state.popover.root;
    popover.style.visibility = 'hidden';
    popover.classList.remove('hidden');
    popover.style.left = '0px';
    popover.style.top = '0px';

    const rect = popover.getBoundingClientRect();
    const padding = 16;
    const targetX = Math.min(
      Math.max(clientX + 18, padding),
      window.innerWidth - rect.width - padding
    );
    const targetY = Math.min(
      Math.max(clientY + 18, padding),
      window.innerHeight - rect.height - padding
    );

    popover.style.left = `${targetX}px`;
    popover.style.top = `${targetY}px`;
    popover.style.visibility = 'visible';
  }

  function hideOctavePopover() {
    if (!state.popover.root) return;
    state.popover.root.classList.add('hidden');
    state.popover.nodeId = null;
  }

  function refreshPopover(node) {
    if (!state.popover.root || state.popover.nodeId !== node.id) return;
    if (state.popover.offsetLabel) {
      state.popover.offsetLabel.textContent = node.octaveOffset > 0 ? `+${node.octaveOffset}` : `${node.octaveOffset}`;
    }
    if (state.popover.info) {
      state.popover.info.textContent = `当前频率：${node.frequency.toFixed(2)} Hz`;
    }
    if (state.popover.upBtn) {
      state.popover.upBtn.disabled = node.octaveOffset >= OCTAVE_MAX;
    }
    if (state.popover.downBtn) {
      state.popover.downBtn.disabled = node.octaveOffset <= OCTAVE_MIN;
    }
    if (state.popover.resetBtn) {
      state.popover.resetBtn.disabled = node.octaveOffset === 0;
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  init();
})();
