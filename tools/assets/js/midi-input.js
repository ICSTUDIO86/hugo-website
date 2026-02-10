(function(){
    const cfg = window.IC_MIDI_CONFIG || {};
    const toggleId = cfg.toggleId || 'midiEnableToggle';
    const selectId = cfg.selectId || 'midiDeviceSelect';
    const statusId = cfg.statusId || 'midiStatusText';
    const storageKeys = {
        enabled: cfg.storageEnabledKey || 'ic_midi_enabled',
        device: cfg.storageDeviceKey || 'ic_midi_device'
    };

    const state = {
        enabled: false,
        access: null,
        input: null,
        inputs: [],
        selectedId: '',
        activeNotes: new Map(),
        connected: false,
        statusKey: 'midi.status.disabled',
        statusDevice: ''
    };
    let suppressStorageWrite = false;

    function getLang(){
        if (typeof cfg.getLanguage === 'function') return cfg.getLanguage();
        if (typeof currentLanguage !== 'undefined' && currentLanguage) return currentLanguage;
        if (window.currentLanguage) return window.currentLanguage;
        return 'zh-CN';
    }

    function getTranslations(lang){
        if (cfg.translations && cfg.translations[lang]) return cfg.translations[lang];
        if (typeof translations !== 'undefined') {
            return translations[lang] || translations['zh-CN'] || null;
        }
        if (window.translations) {
            return window.translations[lang] || window.translations['zh-CN'] || null;
        }
        return null;
    }

    function t(key){
        try {
            const lang = getLang();
            const table = getTranslations(lang);
            return (table && table[key]) ? table[key] : key;
        } catch(_) {
            return key;
        }
    }

    function formatStatus(key, deviceName){
        const template = t(key);
        if (template && template.includes('{device}')) {
            return template.replace('{device}', deviceName || '');
        }
        return template;
    }

    function setStatus(key, tone, deviceName){
        state.statusKey = key;
        state.statusDevice = deviceName || '';
        const statusEl = document.getElementById(statusId);
        if (!statusEl) return;
        statusEl.textContent = formatStatus(key, deviceName);
        statusEl.classList.remove('ok', 'warn', 'error');
        if (tone) statusEl.classList.add(tone);
    }

    function readStoredEnabled(){
        try {
            const raw = localStorage.getItem(storageKeys.enabled);
            return raw === '1' || raw === 'true';
        } catch(_) {
            return false;
        }
    }

    function writeStoredEnabled(next){
        if (suppressStorageWrite) return;
        try { localStorage.setItem(storageKeys.enabled, next ? '1' : '0'); } catch(_) {}
    }

    function readStoredDevice(){
        try {
            return localStorage.getItem(storageKeys.device) || '';
        } catch(_) {
            return '';
        }
    }

    function writeStoredDevice(id){
        if (suppressStorageWrite) return;
        if (!id) return;
        try { localStorage.setItem(storageKeys.device, id); } catch(_) {}
    }

    function notifyConnection(connected, input){
        if (state.connected === connected && state.input === input) return;
        state.connected = connected;
        if (typeof cfg.onConnectionChange === 'function') {
            try { cfg.onConnectionChange(connected, input); } catch(_) {}
        }
        try {
            const detail = { connected: !!connected, input: input || null };
            window.dispatchEvent(new CustomEvent('ic-midi-connection', { detail }));
        } catch(_) {}
    }

    function refreshStatus(){
        const statusEl = document.getElementById(statusId);
        const tone = statusEl && statusEl.classList.contains('ok') ? 'ok'
            : statusEl && statusEl.classList.contains('warn') ? 'warn'
            : statusEl && statusEl.classList.contains('error') ? 'error'
            : '';
        setStatus(state.statusKey || 'midi.status.disabled', tone, state.statusDevice);
    }

    function ensureSamplePlayer(){
        if (cfg.useSamplePlayer === false) return;
        if (typeof cfg.ensureSamplePlayer === 'function') {
            try { cfg.ensureSamplePlayer(); } catch(_) {}
            return;
        }
        if (!window.ICSamplePlayer) return;
        if (!window.__icSamplePlayer) {
            const rootPath = cfg.sampleRoot || 'assets/samples/piano-ogg-full';
            try {
                window.__icSamplePlayer = new ICSamplePlayer({ rootPath });
                window.__icSamplePlayer.load();
            } catch(_) {}
            return;
        }
        if (window.__icSamplePlayer && !window.__icSamplePlayer.ready && typeof window.__icSamplePlayer.load === 'function') {
            try { window.__icSamplePlayer.load(); } catch(_) {}
        }
    }

    function getAudioContext(){
        if (typeof cfg.getAudioContext === 'function') {
            try { return cfg.getAudioContext(); } catch(_) { return null; }
        }
        try {
            if (typeof melodyAudioCtx !== 'undefined' && melodyAudioCtx) return melodyAudioCtx;
        } catch(_) {}
        try {
            if (typeof intervalAudioCtx !== 'undefined' && intervalAudioCtx) return intervalAudioCtx;
        } catch(_) {}
        try {
            if (typeof audioContext !== 'undefined' && audioContext) return audioContext;
        } catch(_) {}
        try {
            if (typeof state !== 'undefined' && state && state.metronome && state.metronome.audioCtx) return state.metronome.audioCtx;
        } catch(_) {}
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        try { return new AudioContextClass(); } catch(_) { return null; }
    }

    function ensureAudioContext(){
        const ctx = getAudioContext();
        if (!ctx) return null;
        try {
            if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
        } catch(_) {}
        return ctx;
    }

    function defaultNoteOn(midi, velocity){
        const ctx = ensureAudioContext();
        if (!ctx) return null;
        ensureSamplePlayer();
        const vel = Math.max(0.1, Math.min(1, (velocity || 0) / 127));
        const now = ctx.currentTime;
        const duration = 8;

        if (cfg.useSamplePlayer !== false && window.__icSamplePlayer && window.__icSamplePlayer.ready) {
            try {
                const playResult = window.__icSamplePlayer.scheduleAtExternalContext(
                    ctx, now + 0.01, midi, duration, 0.8 * vel
                );
                if (playResult) return { handle: playResult };
            } catch(_) {}
        }

        if (typeof createPianoNote === 'function') {
            try {
                const freq = 440 * Math.pow(2, (midi - 69) / 12);
                const sound = createPianoNote(freq, now, duration);
                if (sound && sound.components) return { handle: { components: sound.components } };
            } catch(_) {}
        }

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), now);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.02, vel * 0.6), now + 0.01);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now);
            return { handle: { oscillator: osc, gain } };
        } catch(_) {
            return null;
        }
    }

    function defaultNoteOff(noteState){
        if (!noteState) return;
        const ctx = ensureAudioContext();
        const now = ctx ? ctx.currentTime : 0;
        const handle = noteState.handle || noteState;
        if (handle.source) {
            try {
                if (handle.gain && handle.gain.gain) {
                    handle.gain.gain.cancelScheduledValues(now);
                    handle.gain.gain.setValueAtTime(handle.gain.gain.value || 0.2, now);
                    handle.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
                }
                handle.source.stop(now + 0.05);
            } catch(_) {}
        }
        if (handle.element) {
            try { handle.element.pause(); handle.element.src = ''; } catch(_) {}
        }
        if (handle.components && Array.isArray(handle.components)) {
            handle.components.forEach(comp => {
                try {
                    if (comp.gainNode && comp.gainNode.gain) {
                        comp.gainNode.gain.cancelScheduledValues(now);
                        comp.gainNode.gain.setValueAtTime(comp.gainNode.gain.value || 0.1, now);
                        comp.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
                    }
                } catch(_) {}
                try { if (comp.oscillator) comp.oscillator.stop(now + 0.05); } catch(_) {}
            });
        }
        if (handle.oscillator) {
            try {
                if (handle.gain && handle.gain.gain) {
                    handle.gain.gain.cancelScheduledValues(now);
                    handle.gain.gain.setValueAtTime(handle.gain.gain.value || 0.2, now);
                    handle.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
                }
                handle.oscillator.stop(now + 0.05);
            } catch(_) {}
        }
        if (typeof cfg.noteOff === 'function') {
            try { cfg.noteOff(noteState, ctx); } catch(_) {}
        }
    }

    const noteOn = typeof cfg.noteOn === 'function' ? cfg.noteOn : defaultNoteOn;
    const noteOff = typeof cfg.noteOff === 'function' ? cfg.noteOff : defaultNoteOff;

    function stopAllNotes(){
        state.activeNotes.forEach(ns => noteOff(ns));
        state.activeNotes.clear();
    }

    function handleNoteOn(midi, velocity){
        if (state.activeNotes.has(midi)) {
            noteOff(state.activeNotes.get(midi));
            state.activeNotes.delete(midi);
        }
        const ns = noteOn(midi, velocity, ensureAudioContext());
        if (ns) state.activeNotes.set(midi, ns);
        if (window.__icChallenge && typeof window.__icChallenge.handleMidiNoteOn === 'function') {
            try {
                if (!window.__icChallenge.isActive || window.__icChallenge.isActive()) {
                    window.__icChallenge.handleMidiNoteOn(midi);
                }
            } catch(_) {}
        }
        if (typeof cfg.onNoteOn === 'function') {
            try { cfg.onNoteOn(midi, velocity); } catch(_) {}
        }
    }

    function handleNoteOff(midi){
        const ns = state.activeNotes.get(midi);
        if (ns) {
            noteOff(ns);
            state.activeNotes.delete(midi);
        }
        if (typeof cfg.onNoteOff === 'function') {
            try { cfg.onNoteOff(midi); } catch(_) {}
        }
    }

    function handleMIDIMessage(ev){
        const data = ev.data || [];
        const status = data[0] & 0xf0;
        const midi = data[1];
        const velocity = data[2];
        if (status === 0x90) {
            if (velocity > 0) handleNoteOn(midi, velocity);
            else handleNoteOff(midi);
        } else if (status === 0x80) {
            handleNoteOff(midi);
        }
    }

    function disconnectInput(){
        if (state.input) {
            try { state.input.onmidimessage = null; } catch(_) {}
        }
        state.input = null;
        stopAllNotes();
        notifyConnection(false, null);
    }

    function connectInputById(id){
        if (!state.access) return;
        disconnectInput();
        const input = state.access.inputs.get(id);
        if (input) {
            state.input = input;
            input.onmidimessage = handleMIDIMessage;
            setStatus('midi.status.connected', 'ok', input.name || input.manufacturer || 'MIDI');
            writeStoredDevice(input.id);
            notifyConnection(true, input);
        } else {
            setStatus('midi.status.nodevice', 'warn');
            notifyConnection(false, null);
        }
    }

    function populateDeviceList(){
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        selectEl.innerHTML = '';
        if (!state.access) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '-';
            selectEl.appendChild(opt);
            selectEl.disabled = true;
            return;
        }
        const inputs = Array.from(state.access.inputs.values());
        state.inputs = inputs;
        if (!inputs.length) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '-';
            selectEl.appendChild(opt);
            selectEl.disabled = true;
            setStatus(state.enabled ? 'midi.status.nodevice' : 'midi.status.disabled', state.enabled ? 'warn' : '');
            if (state.enabled) notifyConnection(false, null);
            return;
        }
        inputs.forEach(input => {
            const opt = document.createElement('option');
            opt.value = input.id;
            opt.textContent = input.name || input.manufacturer || input.id;
            selectEl.appendChild(opt);
        });
        selectEl.disabled = !state.enabled;
        if (state.selectedId && inputs.some(i => i.id === state.selectedId)) {
            selectEl.value = state.selectedId;
        } else {
            selectEl.value = inputs[0].id;
            state.selectedId = inputs[0].id;
        }
        writeStoredDevice(state.selectedId);
        if (state.enabled) connectInputById(selectEl.value);
    }

    async function requestAccess(){
        try {
            const access = await navigator.requestMIDIAccess({ sysex: false });
            state.access = access;
            access.onstatechange = handleStateChange;
            populateDeviceList();
        } catch(_) {
            setStatus('midi.status.permission', 'error');
            const toggleEl = document.getElementById(toggleId);
            if (toggleEl) toggleEl.checked = false;
            state.enabled = false;
            writeStoredEnabled(false);
        }
    }

    function handleStateChange(){
        if (!state.access) return;
        populateDeviceList();
        if (state.input && !state.access.inputs.has(state.input.id)) {
            disconnectInput();
            setStatus('midi.status.disconnected', 'warn');
        }
    }

    function setEnabled(next, options){
        const persist = !(options && options.persist === false);
        state.enabled = next;
        if (persist) writeStoredEnabled(next);
        const selectEl = document.getElementById(selectId);
        if (!next) {
            disconnectInput();
            if (selectEl) selectEl.disabled = true;
            setStatus('midi.status.disabled', '');
            return;
        }
        if (!navigator.requestMIDIAccess) {
            setStatus('midi.status.unsupported', 'error');
            if (selectEl) selectEl.disabled = true;
            return;
        }
        if (!state.access) {
            requestAccess();
        } else {
            populateDeviceList();
        }
    }

    function init(){
        const toggleEl = document.getElementById(toggleId);
        const selectEl = document.getElementById(selectId);
        const statusEl = document.getElementById(statusId);
        if (!toggleEl || !selectEl || !statusEl) return;
        if (!navigator.requestMIDIAccess) {
            toggleEl.disabled = true;
            selectEl.disabled = true;
            setStatus('midi.status.unsupported', 'error');
            notifyConnection(false, null);
            return;
        }
        const storedDevice = readStoredDevice();
        if (storedDevice) state.selectedId = storedDevice;

        toggleEl.addEventListener('change', () => setEnabled(toggleEl.checked));
        selectEl.addEventListener('change', () => {
            state.selectedId = selectEl.value;
            writeStoredDevice(state.selectedId);
            if (state.enabled) connectInputById(selectEl.value);
        });
        setStatus('midi.status.disabled', '');

        const storedEnabled = readStoredEnabled();
        if (storedEnabled) {
            toggleEl.checked = true;
            setEnabled(true);
        }

        window.addEventListener('storage', (event) => {
            if (event.key === storageKeys.enabled) {
                const desired = readStoredEnabled();
                if (toggleEl.checked !== desired) toggleEl.checked = desired;
                suppressStorageWrite = true;
                setEnabled(desired, { persist: false });
                suppressStorageWrite = false;
            }
            if (event.key === storageKeys.device) {
                state.selectedId = event.newValue || '';
                if (state.enabled && state.access && state.selectedId) {
                    connectInputById(state.selectedId);
                } else if (state.enabled && state.access) {
                    populateDeviceList();
                }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    window.__icMidi = {
        refreshStatus,
        getState: () => ({
            enabled: state.enabled,
            connected: state.connected,
            selectedId: state.selectedId,
            inputName: state.input ? (state.input.name || state.input.manufacturer || state.input.id) : ''
        }),
        _simulateNoteOn: handleNoteOn,
        _simulateNoteOff: handleNoteOff,
        _stopAllNotes: stopAllNotes
    };
})();
