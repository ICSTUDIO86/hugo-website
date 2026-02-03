/*
  ICSamplePlayer: lightweight multi-sample player for Web Audio
  - Loads 14 OGG samples (A1–E6 roots) from `rootPath`
  - Pitch-shifts nearest root via playbackRate (12-TET)
  - Schedules relative to an external AudioContext’s time for seamless integration
*/
(function(){
  const VOLUME_BOOST = 2;
  class ICSamplePlayer {
    constructor(opts = {}) {
      const meta = (typeof document !== 'undefined') ? document.querySelector('meta[name="ic-sample-root"]') : null;
      const metaRoot = meta ? (meta.getAttribute('content') || '').trim() : '';
      const globalRoot = (typeof window !== 'undefined' && window.IC_SAMPLE_ROOT) ? String(window.IC_SAMPLE_ROOT) : '';
      this.rootPath = opts.rootPath || globalRoot || metaRoot || 'assets/samples/piano-ogg';
      this.sampleMap = this._buildSampleMap();
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.buffers = new Map();
      this.mediaElems = new Map(); // (unused by default)
      this.ready = false;
      this.outputGain = this.ctx.createGain();
      this.outputGain.gain.value = 0.9;
      this.outputGain.connect(this.ctx.destination);
      // 在直接双击打开 HTML (file://) 时，使用 HTMLAudio 元素加载本地样本，避免 fetch 的 CORS 限制
      this.useMediaElement = !!(window.location && window.location.protocol === 'file:');
    }

    _buildSampleMap() {
      // Full chromatic scale C2-A6 (MIDI 36-93, 58 semitones)
      const roots = [];
      const noteNames = ['C', 'Csharp', 'D', 'Dsharp', 'E', 'F', 'Fsharp', 'G', 'Gsharp', 'A', 'Asharp', 'B'];
      for (let midi = 36; midi <= 93; midi++) {
        const octave = Math.floor(midi / 12) - 1;
        const noteName = noteNames[midi % 12];
        roots.push({ midi, name: `${noteName}${octave}` });
      }
      return roots;
    }

    async load() {
      try {
        if (!this.useMediaElement) {
          const tasks = this.sampleMap.map(async r => {
            const url = `${this.rootPath}/${r.name}.ogg`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Fetch failed: ${url}`);
            const arr = await res.arrayBuffer();
            const buf = await this.ctx.decodeAudioData(arr);
            this.buffers.set(r.midi, buf);
          });
          await Promise.all(tasks);
          this.ready = true;
          console.log('✅ ICSamplePlayer ready: loaded', this.buffers.size, 'buffers');
        } else {
          // file:// fallback using HTMLAudioElement (no fetch CORS)
          this.sampleMap.forEach(r => {
            const url = `${this.rootPath}/${r.name}.ogg`;
            const el = new Audio();
            el.src = url;
            el.preload = 'auto';
            this.mediaElems.set(r.midi, el);
          });
          this.ready = true;
          console.log('✅ ICSamplePlayer (media element) ready:', this.mediaElems.size, 'elements');
        }
      } catch (e) {
        console.warn('⚠️ ICSamplePlayer load failed – falling back to oscillator playback:', e);
        this.ready = false;
      }
      return this;
    }

    getContext(){ return this.ctx; }

    // Schedule against an external AudioContext timeline
    scheduleAtExternalContext(extCtx, extTime, midi, durationSec, gain=0.8) {
      if (!this.ready) return null;
      const delta = Math.max(0, extTime - extCtx.currentTime);
      const start = this.ctx.currentTime + delta;
      if (this.useMediaElement) {
        const delayMs = Math.max(0, (extTime - extCtx.currentTime) * 1000);
        return this._scheduleMediaElement(delayMs, midi, durationSec, gain);
      } else {
        return this.scheduleAtLocalTime(start, midi, durationSec, gain);
      }
    }

    scheduleAtLocalTime(startTime, midi, durationSec, gain=0.8) {
      if (!this.ready) return null;
      const { rootMidi, buffer } = this._findNearestBuffer(midi);
      if (!buffer) return null;

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      src.connect(g).connect(this.outputGain);
      const semis = midi - rootMidi;
      const rate = Math.pow(2, semis/12);
      src.playbackRate.value = rate;

      // Optimized ADSR envelope for seamless, connected playback (zero gap)
      const a = 0.002;   // Attack: 2ms (快速起音)
      const d = 0.05;    // Decay: 50ms (短衰减到 sustain)
      const s = gain * VOLUME_BOOST;    // Sustain level
      const r = 0.001;   // Release: 1ms (极短平滑过渡，避免 click 但几乎无空白)

      const t0 = startTime;
      const sustainLevel = s * 0.85;

      g.gain.cancelScheduledValues(0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, s), t0 + a);
      g.gain.linearRampToValueAtTime(sustainLevel, t0 + a + d);

      // Sustain 持续到音符结束时间（精确到 durationSec，无额外延长）
      const sustainEnd = t0 + Math.max(0.05, durationSec);
      g.gain.setValueAtTime(sustainLevel, sustainEnd);

      // 极短 release（1ms）- 在下一个音符开始前完成
      const stopAt = sustainEnd + r;
      g.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      // 对于长音符（>4秒），让样本自然播放完；否则在 stopAt 时停止
      const bufferDuration = buffer.duration / rate;  // 考虑 pitch-shifting 的影响
      const naturalEnd = t0 + bufferDuration;
      const actualStop = (durationSec > 4.0 && naturalEnd < stopAt + 0.5) ? naturalEnd : stopAt;

      try { src.start(t0); src.stop(actualStop); } catch(e) { /* ignore */ }
      return { source: src, gain: g };
    }

    _findNearestBuffer(midi){
      // choose nearest root midi
      let best = this.sampleMap[0];
      let bestDiff = Math.abs(midi - best.midi);
      for (const r of this.sampleMap){
        const d = Math.abs(midi - r.midi);
        if (d < bestDiff){ best = r; bestDiff = d; }
      }
      const buffer = this.buffers.get(best.midi);
      return { rootMidi: best.midi, buffer };
    }

    _findNearestMedia(midi) {
      let best = this.sampleMap[0];
      let bestDiff = Math.abs(midi - best.midi);
      for (const r of this.sampleMap){
        const d = Math.abs(midi - r.midi);
        if (d < bestDiff){ best = r; bestDiff = d; }
      }
      return { rootMidi: best.midi, el: this.mediaElems.get(best.midi) };
    }

    _scheduleMediaElement(delayMs, midi, durationSec, gain=0.8) {
      const { rootMidi, el } = this._findNearestMedia(midi);
      if (!el) return null;
      try {
        const semis = midi - rootMidi;
        const rate = Math.pow(2, semis/12);
        const clone = el.cloneNode();
        clone.preload = 'auto';
        clone.playbackRate = rate; // varispeed (pitch + time change)
        const canUseWebAudio = /^blob:|^data:/i.test(clone.src || '');
        let useWebAudio = false;
        if (canUseWebAudio) {
          try {
            this.ctx.resume().catch(()=>{});
            const mediaSource = this.ctx.createMediaElementSource(clone);
            const g = this.ctx.createGain();
            g.gain.value = Math.max(0.01, gain * VOLUME_BOOST);
            mediaSource.connect(g).connect(this.outputGain);
            clone.volume = 1;
            useWebAudio = true;
          } catch (e) {
            console.warn('media element source failed, fallback to element volume:', e);
          }
        }
        if (!useWebAudio) {
          clone.volume = Math.max(0.01, Math.min(1, gain * VOLUME_BOOST));
        }
        const start = () => {
          try { clone.currentTime = 0; } catch(_) {}
          if (useWebAudio && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(()=>{});
          }
          clone.play().catch(()=>{});
          // stop after duration (approximate)
          setTimeout(() => { try { clone.pause(); clone.src=''; } catch(_){} }, Math.max(50, durationSec*1000));
        };
        setTimeout(start, Math.max(0, delayMs));
        return { element: clone };
      } catch (e) {
        console.warn('media element schedule failed:', e);
        return null;
      }
    }

    async loadFromFileList(fileList) {
      // Allow user to select a folder of .ogg samples when opening via file://
      this.buffers.clear();
      this.mediaElems.clear();
      const byName = new Map();
      for (const f of fileList) {
        if (!f.name.toLowerCase().endsWith('.ogg')) continue;
        byName.set(f.name.replace(/\.ogg$/i, ''), f);
      }
      const map = this._buildSampleMap();
      for (const r of map) {
        const f = byName.get(r.name) || byName.get(r.name.replace('#','%23'));
        if (f) {
          try {
            const arr = await f.arrayBuffer();
            const buf = await this.ctx.decodeAudioData(arr);
            this.buffers.set(r.midi, buf);
          } catch (e) {
            console.warn('decodeAudioData failed for', f.name, e);
          }
        }
      }
      if (this.buffers.size > 0) {
        this.useMediaElement = false;
        this.ready = true;
        console.log('✅ ICSamplePlayer loaded buffers from folder:', this.buffers.size);
        return true;
      }
      for (const r of map) {
        const f = byName.get(r.name) || byName.get(r.name.replace('#','%23'));
        if (f) {
          const url = URL.createObjectURL(f);
          const el = new Audio();
          el.src = url; el.preload = 'auto';
          this.mediaElems.set(r.midi, el);
        }
      }
      this.useMediaElement = true;
      this.ready = this.mediaElems.size > 0;
      console.log('✅ ICSamplePlayer loaded media elements from folder:', this.mediaElems.size);
      return this.ready;
    }
  }

  window.ICSamplePlayer = ICSamplePlayer;
  // Helper to wire a directory input to the sampler
  window.IC_initSamplerFromFolder = async function(inputEl){
    try{
      if (!window.__icSamplePlayer) window.__icSamplePlayer = new ICSamplePlayer({ rootPath: 'assets/samples/piano-ogg' });
      const ok = await window.__icSamplePlayer.loadFromFileList(inputEl.files || []);
      alert(ok ? '音色包加载成功' : '未找到可用的 .ogg 文件');
    }catch(e){ alert('音色包加载失败: ' + e.message); }
  }
})();
