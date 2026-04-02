(function () {
  const STORAGE_KEY = 'ic_preferred_metronome_settings';
  const METRONOME_GAIN_HEADROOM = 0.72;
  const METRONOME_MAX_VOLUME = 0.9;
  const DEFAULTS = Object.freeze({
    sound: 'classic',
    volume: 70
  });

  function clampVolume(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULTS.volume;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  function normalizeSound(value) {
    return value === 'woodblock' ? 'woodblock' : 'classic';
  }

  function normalizeSettings(value) {
    const next = value && typeof value === 'object' ? value : {};
    return {
      sound: normalizeSound(next.sound),
      volume: clampVolume(next.volume)
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return normalizeSettings(JSON.parse(raw));
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  function emitChange(detail) {
    try {
      window.dispatchEvent(new CustomEvent('ic-metronome-settings-changed', { detail }));
    } catch (_) {}
  }

  function saveSettings(partial) {
    const next = normalizeSettings({
      ...loadSettings(),
      ...(partial || {})
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
    emitChange(next);
    return next;
  }

  function connectChain(nodes, destination) {
    if (!Array.isArray(nodes) || !nodes.length || !destination) return;
    let previous = null;
    nodes.forEach((node) => {
      if (!node) return;
      if (previous) {
        previous.connect(node);
      }
      previous = node;
    });
    if (previous) previous.connect(destination);
  }

  function scheduleClassic(ctx, destination, scheduleTime, isDownbeat, volume) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(isDownbeat ? 627.91 : 523.25, scheduleTime);
    gainNode.gain.setValueAtTime(Math.max(0.0001, volume * (isDownbeat ? 0.95 : 0.82)), scheduleTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + 0.055);
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start(scheduleTime);
    oscillator.stop(scheduleTime + 0.06);
    return [{ oscillator, gainNode }];
  }

  function scheduleWoodblock(ctx, destination, scheduleTime, isDownbeat, volume) {
    const bodyOsc = ctx.createOscillator();
    const attackOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    bodyOsc.type = 'triangle';
    attackOsc.type = 'sine';
    filter.type = 'bandpass';

    const baseFreq = isDownbeat ? 1620 : 1360;
    bodyOsc.frequency.setValueAtTime(baseFreq, scheduleTime);
    attackOsc.frequency.setValueAtTime(baseFreq * 1.85, scheduleTime);
    filter.frequency.setValueAtTime(baseFreq * 0.92, scheduleTime);
    filter.Q.setValueAtTime(isDownbeat ? 3.8 : 3.2, scheduleTime);

    const peak = Math.max(0.0001, volume * (isDownbeat ? 1.15 : 0.95));
    gainNode.gain.setValueAtTime(0.0001, scheduleTime);
    gainNode.gain.exponentialRampToValueAtTime(peak, scheduleTime + 0.0025);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + 0.045);

    connectChain([bodyOsc, filter, gainNode], destination);
    attackOsc.connect(filter);

    bodyOsc.start(scheduleTime);
    attackOsc.start(scheduleTime);
    bodyOsc.stop(scheduleTime + 0.05);
    attackOsc.stop(scheduleTime + 0.03);

    return [
      { oscillator: bodyOsc, gainNode, filter },
      { oscillator: attackOsc, gainNode, filter }
    ];
  }

  function play(ctx, time, options = {}) {
    if (!ctx) return [];

    const settings = normalizeSettings(options.settings || loadSettings());
    const scheduleTime = typeof time === 'number' && Number.isFinite(time)
      ? time
      : ctx.currentTime;
    const outputNode = options.outputNode || ctx.destination;
    const volumeScale = Number.isFinite(Number(options.volumeScale)) ? Number(options.volumeScale) : 1;
    const normalizedVolume = Math.max(
      0,
      Math.min(METRONOME_MAX_VOLUME, (settings.volume / 100) * volumeScale * METRONOME_GAIN_HEADROOM)
    );
    const isDownbeat = !!options.isDownbeat;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (_) {}

    try {
      if (settings.sound === 'woodblock') {
        return scheduleWoodblock(ctx, outputNode, scheduleTime, isDownbeat, normalizedVolume);
      }
      return scheduleClassic(ctx, outputNode, scheduleTime, isDownbeat, normalizedVolume);
    } catch (error) {
      console.error('❌ 节拍器音色调度失败:', error);
      return [];
    }
  }

  window.ICMetronomeSettings = {
    STORAGE_KEY,
    DEFAULTS,
    load: loadSettings,
    save: saveSettings,
    normalize: normalizeSettings,
    play
  };
})();
