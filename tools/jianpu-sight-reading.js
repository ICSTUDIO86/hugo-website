(() => {
  const ACCENT = '#e53935';
  const NOTE_COLOR = '#111111';
  const DURATION_TO_Q = {
    whole: 4,
    half: 2,
    quarter: 1,
    'quarter.': 1.5,
    'dotted-quarter': 1.5,
    eighth: 0.5,
    'eighth.': 0.75,
    'dotted-eighth': 0.75,
    '8th': 0.5,
    '16th': 0.25,
    '16th.': 0.375,
    'dotted-16th': 0.375,
    'half.': 3,
    'dotted-half': 3
  };
  const KEY_TO_TONIC = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11
  };
  const RELATIVE_MAJOR_BY_MINOR = {
    Am: 'C',
    Em: 'G',
    Bm: 'D',
    'F#m': 'A',
    'C#m': 'E',
    'G#m': 'B',
    'D#m': 'F#',
    'A#m': 'C#',
    Dm: 'F',
    Gm: 'Bb',
    Cm: 'Eb',
    Fm: 'Ab',
    Bbm: 'Db',
    Ebm: 'Gb'
  };
  const SHARP_KEYS = new Set(['G', 'D', 'A', 'E', 'B', 'F#', 'C#']);
  const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);

  function getRelativeMajorKey(keySignature) {
    if (!keySignature || typeof keySignature !== 'string') return 'C';
    if (!keySignature.endsWith('m')) return keySignature;
    return RELATIVE_MAJOR_BY_MINOR[keySignature] || keySignature.replace(/m$/, '');
  }

  function getKeyAccidentalBias(keySignature) {
    const majorKey = getRelativeMajorKey(keySignature || 'C');
    if (SHARP_KEYS.has(majorKey)) return '#';
    if (FLAT_KEYS.has(majorKey)) return 'b';
    return '';
  }

  function getNoteAccidentalPreference(note) {
    if (!note || typeof note !== 'object') return null;
    if (note.preferredAccidental === '#' || note.preferredAccidental === 'b') {
      return note.preferredAccidental;
    }
    if (typeof note.alter === 'number' && note.alter !== 0) {
      return note.alter > 0 ? '#' : 'b';
    }
    return null;
  }

  function formatJianpuKeyLabel(keySignature) {
    if (!keySignature || typeof keySignature !== 'string') return '1 = C';
    if (keySignature.endsWith('m')) {
      return `6 = ${keySignature.replace(/m$/, '')}`;
    }
    return `1 = ${keySignature}`;
  }

  let lastRenderedMelody = null;
  let currentRenderer = null;
  let snReadyPromise = null;
  const scoreEl = document.getElementById('score');
  const FORCE_LOCAL_SN = true;

  function patchTieRenderer(sn) {
    try {
      const Layer = sn && (sn.SNTieLineLayer || sn.TieLineLayer);
      if (!Layer || Layer.__thinPatched) return;
      Layer.drawSingleTieLine = function(x1, y1, x2, y2, xDistance) {
        const radiusX = xDistance / 2;
        const radiusY = Math.max(1, xDistance * 0.04);
        const d = `M ${x1} ${y1} A ${radiusX} ${radiusY} 0 0 1 ${x2} ${y2}`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#555');
        path.setAttribute('stroke-width', '0.5');
        path.setAttribute('stroke-opacity', '0.9');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('fill', 'none');
        if (Layer.el) Layer.el.appendChild(path);
      };
      Layer.__thinPatched = true;
    } catch (e) {
      console.warn('tie renderer patch failed', e);
    }
  }

  function patchBeamGrouping(sn) {
    try {
      const BeamLayer = sn && (sn.SNBeamLayer || sn.BeamLayer);
      if (!BeamLayer || BeamLayer.__jianpuBeatPatched) return;

      const getBeatSize = () => {
        const timeVal = Number(sn?.SNRuntime?.info?.time);
        const beatVal = Number(sn?.SNRuntime?.info?.beat);
        if (!timeVal || !beatVal || Number.isNaN(timeVal) || Number.isNaN(beatVal)) return 1;
        const base = 4 / beatVal;
        if (beatVal === 8 && timeVal > 3 && timeVal % 3 === 0) return base * 3;
        return base > 0 ? base : 1;
      };

      const groupNotesByBeat = (notes) => {
        const groups = [];
        const beatLen = getBeatSize();
        const eps = 1e-6;
        let beatPos = 0;
        let current = [];
        let currentUnderline = null;
        const tripletInfo = new Map();

        if (Array.isArray(notes)) {
          const noteByIndex = new Map();
          const forcedTupletNotes = new Set();
          notes.forEach((note) => {
            if (typeof note?.index === 'number') {
              noteByIndex.set(note.index, note);
            }
          });
          const jpTupletGroups = Array.isArray(window.__jpTupletGroups) ? window.__jpTupletGroups : [];
          jpTupletGroups.forEach((group) => {
            const startIndex = group?.startIndex;
            const length = group?.length;
            if (typeof startIndex !== 'number' || typeof length !== 'number' || length <= 0) return;
            const groupNotes = [];
            for (let offset = 0; offset < length; offset += 1) {
              const item = noteByIndex.get(startIndex + offset);
              if (item) groupNotes.push(item);
            }
            if (!groupNotes.length) return;
            let maxUnderline = 0;
            groupNotes.forEach((item) => {
              maxUnderline = Math.max(maxUnderline, item?.underlineCount || 0);
            });
            groupNotes.forEach((item, idx) => {
              tripletInfo.set(item, {
                underline: maxUnderline,
                isEnd: idx === groupNotes.length - 1,
                forced: true
              });
              forcedTupletNotes.add(item);
            });
          });

          let i = 0;
          while (i < notes.length) {
            const note = notes[i];
            if (forcedTupletNotes.has(note)) {
              i += 1;
              continue;
            }
            const isTripletNote = !!(note?.isTriplet || note?.isTripletStart || note?.isTripletEnd);
            if (!isTripletNote) {
              i += 1;
              continue;
            }
            const group = [];
            let maxUnderline = 0;
            let j = i;
            for (; j < notes.length; j += 1) {
              const item = notes[j];
              const itemIsTriplet = !!(item?.isTriplet || item?.isTripletStart || item?.isTripletEnd);
              if (!itemIsTriplet) break;
              const itemGroupStart = !!(item?.tripletGroupStart || item?.isTripletStart);
              const itemGroupEnd = !!(item?.tripletGroupEnd || item?.isTripletEnd);
              if (j > i && itemGroupStart) break;
              group.push(item);
              maxUnderline = Math.max(maxUnderline, item.underlineCount || 0);
              if (itemGroupEnd) {
                j += 1;
                break;
              }
            }
            group.forEach((item, idx) => {
              const itemGroupEnd = !!(item?.tripletGroupEnd || item?.isTripletEnd);
              tripletInfo.set(item, {
                underline: maxUnderline,
                isEnd: itemGroupEnd || idx === group.length - 1
              });
            });
            i = Math.max(j, i + 1);
          }
        }

        const flush = () => {
          if (current.length) {
            groups.push(current);
            current = [];
            currentUnderline = null;
          }
        };

        (notes || []).forEach((note) => {
          const tripletMeta = tripletInfo.get(note);
          const underline = tripletMeta ? tripletMeta.underline : (note?.underlineCount ?? 0);
          const duration = note?.nodeTime ?? 0;

          if (current.length && underline !== currentUnderline) {
            flush();
          }

          if (!underline) {
            flush();
            beatPos = beatLen ? (beatPos + duration) % beatLen : 0;
            return;
          }

          if (duration >= beatLen - eps) {
            flush();
            groups.push([note]);
            beatPos = beatLen ? (beatPos + duration) % beatLen : 0;
            return;
          }

          if (!tripletMeta && current.length && beatLen && beatPos > eps && beatPos + duration > beatLen - eps) {
            flush();
          }

          if (!current.length) currentUnderline = underline;
          current.push(note);
          beatPos += duration;
          if (beatPos >= beatLen - eps) {
            flush();
            beatPos = beatLen ? beatPos % beatLen : 0;
          }
          if (tripletMeta?.isEnd) {
            flush();
          }
        });

        flush();
        return groups;
      };

      BeamLayer.drawSimpleUnderlines = function(measures) {
        (measures || []).forEach((measure) => {
          groupNotesByBeat(measure.notes || []).forEach((group) => {
            const count = group.reduce((maxCount, note) => (
              Math.max(maxCount, note?.underlineCount ?? 0)
            ), 0);
            BeamLayer.drawUnderlineGroup(group, count || 0);
          });
        });
      };

      BeamLayer.__jianpuBeatPatched = true;
    } catch (e) {
      console.warn('beam grouping patch failed', e);
    }
  }

  async function ensureSimpleNotationLoaded() {
    const patchSNLoad = (sn) => {
      if (sn && sn.SimpleNotation && !sn.SimpleNotation.__jianpuPatched) {
        const origLoad = sn.SimpleNotation.prototype.loadData;
        sn.SimpleNotation.prototype.loadData = function(data, type) {
          let nextData = data;
          try {
            const md = window.lastRenderedMelody;
            const builder = window.__buildSimpleNotationTemplate || buildSimpleNotationTemplate;
            const general = window.SN && window.SN.General;
            if (md && builder) {
              nextData = { ...data, score: builder(md, general, true) };
            }
            const infoKey = nextData?.info?.key;
            if (typeof infoKey === 'string' && infoKey) {
              const displayKey = getRelativeMajorKey(infoKey);
              if (displayKey && infoKey !== displayKey) {
                nextData = { ...nextData, info: { ...(nextData.info || {}), key: displayKey } };
              }
            }
            window.__lastSNLoadData = nextData;
          } catch (e) {
            console.warn('patched loadData failed', e);
          }
          const loader = sn.SNLoader || window.SN?.SNLoader;
          const runtime = sn.SNRuntime || window.SN?.SNRuntime;
          const dataType = type ?? (sn.SNDataType ? sn.SNDataType.TEMPLATE : undefined);
          if (loader && runtime && typeof loader.loadData === 'function') {
            try {
              loader.loadData(nextData, dataType);
              applyTupletOverrides(runtime);
              if (typeof this.setHeight === 'function' && this.container) {
                this.setHeight(this.container.clientHeight);
              }
              if (typeof this.render === 'function') {
                this.render();
              }
              return;
            } catch (e) {
              console.warn('patched loadData (custom) failed', e);
            }
          }
          return origLoad.apply(this, [nextData, type]);
        };
        sn.SimpleNotation.__jianpuPatched = true;
      }
    };
    const createGeneralShim = () => ({
      baseOctave: 4,
      midiToParsedNote(midi) {
        if (typeof midi !== 'number' || midi < 0 || midi > 127) return null;
        const octaveCount = Math.floor(midi / 12) - 1 - 4; // align with simple-notation baseOctave=4
        const pc = ((midi % 12) + 12) % 12;
        let note, accidental = '';
        switch (pc) {
          case 0: note = 1; break;   // C
          case 1: note = 1; accidental = '#'; break; // C#
          case 2: note = 2; break;   // D
          case 3: note = 2; accidental = '#'; break; // D#
          case 4: note = 3; break;   // E
          case 5: note = 4; break;   // F
          case 6: note = 4; accidental = '#'; break; // F#
          case 7: note = 5; break;   // G
          case 8: note = 5; accidental = '#'; break; // G#
          case 9: note = 6; break;   // A
          case 10: note = 6; accidental = '#'; break; // A#
          case 11: note = 7; break;  // B
          default: return null;
        }
        return { note: `${note}`, octaveCount, upDownCount: accidental === '#' ? 1 : 0 };
      },
      midiToSimpleNote(midi) {
        const parsed = this.midiToParsedNote(midi);
        if (!parsed) return null;
        const prefix = parsed.upDownCount ? '#'.repeat(parsed.upDownCount) : '';
        const oct = parsed.octaveCount > 0
          ? '^'.repeat(parsed.octaveCount)
          : (parsed.octaveCount < 0 ? '_'.repeat(Math.abs(parsed.octaveCount)) : '');
        return `${prefix}${parsed.note}${oct}`;
      }
    });

    if (!FORCE_LOCAL_SN && window.SN && window.SN.SimpleNotation) {
      if (!window.SN.General) {
        // 模块命名空间是只读的，创建可写对象以挂 General
        window.SN = { ...(window.SN || {}), General: createGeneralShim() };
      }
      return window.SN;
    }
    if (snReadyPromise) return snReadyPromise;

    const unpackSN = (mod) => {
      if (!mod) return null;
      const snRoot = mod.default && typeof mod.default === 'object' ? mod.default : {};
      const SimpleNotation = mod.SimpleNotation || snRoot.SimpleNotation;
      const General = mod.General || snRoot.General || mod.SNRuntime?.General || snRoot.SNRuntime?.General;
      if (!SimpleNotation) return null;
      return { ...snRoot, ...mod, SimpleNotation, General: General || createGeneralShim() };
    };

    const importViaBlob = async (url, label) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const txt = await res.text();
        const blob = new Blob([txt], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const mod = await import(blobUrl);
        URL.revokeObjectURL(blobUrl);
        const SN = unpackSN(mod);
        window.SN = SN;
        return SN;
      } catch (e) {
        console.warn(`simple-notation blob 导入失败 [${label}]`, url, e);
        return null;
      }
    };

    const buildModuleShim = (url, label) => new Promise((resolve) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.textContent = `import * as SN from '${url}'; window.SN = SN && (SN.SimpleNotation ? SN : (SN.default ? { ...SN.default, ...SN } : SN));`;
      s.onload = () => resolve(window.SN || null);
      s.onerror = (e) => {
        console.warn(`simple-notation shim 加载失败 [${label}]`, e);
        resolve(null);
      };
      document.head.appendChild(s);
    });

    const tryImport = async (src, label) => {
      try {
        const mod = await import(src);
        const SN = unpackSN(mod);
        window.SN = SN;
        return SN;
      } catch (e) {
        console.warn(`simple-notation 动态导入失败 [${label}]`, src, e);
        return null;
      }
    };

    snReadyPromise = (async () => {
      const cdnUrl = 'https://unpkg.com/simple-notation@latest/dist/simple-notation.js';
      const localUrl = new URL('./assets/js/simple-notation.js', window.location.href).href;
      const loader = FORCE_LOCAL_SN
        ? [
            () => importViaBlob(localUrl, 'local-blob'),
            () => tryImport(localUrl, 'local-import'),
            () => buildModuleShim(localUrl, 'local-shim'),
            () => importViaBlob(cdnUrl, 'cdn-blob'),
            () => tryImport(cdnUrl, 'cdn-import'),
            () => buildModuleShim(cdnUrl, 'cdn-shim')
          ]
        : [
            () => importViaBlob(cdnUrl, 'cdn-blob'),
            () => tryImport(cdnUrl, 'cdn-import'),
            () => buildModuleShim(cdnUrl, 'cdn-shim'),
            () => importViaBlob(localUrl, 'local-blob'),
            () => tryImport(localUrl, 'local-import'),
            () => buildModuleShim(localUrl, 'local-shim')
          ];
      let mod = null;
      for (const fn of loader) {
        mod = await fn();
        if (mod) break;
      }
      return mod;
    })();

    const sn = await snReadyPromise;
    if (sn && !sn.General) {
      window.SN = { ...sn, General: createGeneralShim() };
      patchSNLoad(window.SN);
      patchTieRenderer(window.SN);
      patchBeamGrouping(window.SN);
      return window.SN;
    }
    patchSNLoad(sn);
    patchTieRenderer(sn);
    patchBeamGrouping(sn);
    return sn;
  }

  function getI18nText(key, fallback = '') {
    const lang = window.currentLanguage || 'zh-CN';
    const dict =
      (window.translations && (window.translations[lang] || window.translations['zh-CN'])) || {};
    return dict[key] || fallback;
  }

  function applyHiddenState(el) {
    if (!el) return;
    if (typeof isMelodyHidden !== 'undefined' && isMelodyHidden) {
      el.style.opacity = '0';
      el.style.filter = 'blur(10px)';
    } else {
      el.style.opacity = '1';
      el.style.filter = 'none';
    }
  }

  function durationToQuarter(duration) {
    if (!duration) return 1;
    if (typeof duration === 'number') return duration;
    // 直接命中映射优先（避免对 dotted-x 再乘1.5）
    if (DURATION_TO_Q[duration] !== undefined) return DURATION_TO_Q[duration];
    const dotted = duration.includes('.') || duration.startsWith('dotted-');
    const cleaned = duration.replace('dotted-', '').replace('.', '');
    const baseVal = DURATION_TO_Q[cleaned] !== undefined ? DURATION_TO_Q[cleaned] : 1;
    return dotted ? baseVal * 1.5 : baseVal;
  }

  function midiFromNote(note) {
    if (typeof note.midi === 'number') return note.midi;
    if (!note.step || typeof note.octave !== 'number') return 60;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[note.step] ?? 0;
    const alter = note.alter ? note.alter : 0;
    return (note.octave + 1) * 12 + base + alter;
  }

  // 兜底：简谱音高映射（当 simple-notation 未加载时仍能输出）
  function mapMidiToSimpleNotation(midi, keySignature = 'C', accidentalPreference = null) {
    const mappingKey = getRelativeMajorKey(keySignature);
    const tonicPc = KEY_TO_TONIC[mappingKey] ?? 0;
    const scaleIntervals = [0, 2, 4, 5, 7, 9, 11];
    const tonicMidiRef = 60 + tonicPc; // C4 基准
    const rel = midi - tonicMidiRef;
    const octaveOffset = Math.floor(rel / 12);
    const interval = ((midi % 12) - tonicPc + 12) % 12;

    let accidental = '';
    let number = null;
    const scaleIndex = scaleIntervals.indexOf(interval);
    if (scaleIndex !== -1) {
      number = scaleIndex + 1;
    } else {
      let sharpDegree = null;
      let flatDegree = null;
      scaleIntervals.forEach((val, idx) => {
        if ((val + 1) % 12 === interval) sharpDegree = idx + 1;
        if ((val + 11) % 12 === interval) flatDegree = idx + 1;
      });
      let bias = accidentalPreference || getKeyAccidentalBias(keySignature);
      if (!bias) bias = sharpDegree ? '#' : 'b';
      if (bias === '#' && !sharpDegree && flatDegree) bias = 'b';
      if (bias === 'b' && !flatDegree && sharpDegree) bias = '#';
      accidental = bias || '';
      number = bias === '#' ? (sharpDegree ?? flatDegree) : (flatDegree ?? sharpDegree);
    }

    if (!number) {
      number = 1;
      accidental = accidental || '#';
    }
    const octaveMarks = octaveOffset > 0 ? '^'.repeat(octaveOffset) : (octaveOffset < 0 ? '_'.repeat(Math.abs(octaveOffset)) : '');
    return `${accidental}${number}${octaveMarks}`;
  }

  function formatDurationSuffix(q) {
    const eps = 1e-3;
    const match = (v) => Math.abs(q - v) < eps;
    // 官网语法：/1 全音符，/2 半音符，/2. 附点二分，. 表附点（默认四分音符）
    if (match(4)) return '/1';      // whole
    if (match(3)) return '/2.';     // dotted half
    if (match(2)) return '/2';      // half
    if (match(1.5)) return '.';     // dotted quarter
    if (match(1)) return '';        // quarter (default)
    if (match(0.75)) return '/8.';  // dotted eighth
    if (match(0.5)) return '/8';    // eighth
    if (match(0.25)) return '/16';  // sixteenth
    if (q > 1 && q < 2) return '.';     // fallback dotted quarter-ish
    if (q > 0.5 && q < 1) return '/8.'; // fallback dotted eighth-ish
    return '';
  }

  function buildSimpleNotationTemplate(melodyData, snGeneral, groupEvery4 = false) {
    const [tsNum, tsDen] = (melodyData.config?.timeSignature || '4/4')
      .split('/')
      .map((v) => parseInt(v, 10) || 0);
    const measureTargetQ = tsNum && tsDen ? (tsNum * 4) / tsDen : 4; // 4/4 -> 4, 6/8 -> 3
    const EPS = 1e-3;
    let globalNoteIndex = 0;
    const tupletGroups = [];
    const normalizeTupletType = (raw) => {
      if (!raw) return null;
      if (raw === 'triplet' || raw === 'duplet' || raw === 'quadruplet') return raw;
      const lowered = String(raw).toLowerCase();
      if (lowered.includes('duplet')) return 'duplet';
      if (lowered.includes('quadruplet')) return 'quadruplet';
      if (lowered.includes('triplet') || lowered === 'eighth' || lowered === 'quarter') return 'triplet';
      return null;
    };
    const getTripletMeta = (note) => {
      const tuplet = note?.tuplet;
      const tupletType = normalizeTupletType(note?.tripletType)
        || (note?.isTriplet ? 'triplet' : null)
        || normalizeTupletType(tuplet?.type)
        || tuplet?.type;
      const isTuplet = tupletType === 'triplet'
        || tupletType === 'duplet'
        || tupletType === 'quadruplet';
      const total = note?.tripletTotal
        ?? tuplet?.total
        ?? (tupletType === 'duplet' ? 2 : tupletType === 'quadruplet' ? 4 : tupletType ? 3 : undefined);
      const position = note?.tripletPosition ?? (tuplet ? tuplet.position : undefined);
      const groupId = note?.tripletId ?? (tuplet ? (tuplet.id ?? tuplet.number) : undefined);
      const groupStart = note?.tripletGroupStart === true || position === 0;
      const groupEnd = note?.tripletGroupEnd === true
        || (typeof total === 'number' && typeof position === 'number' && position === total - 1);
      return {
        isTriplet: isTuplet,
        tupletType,
        tupletCount: total ?? (tupletType === 'duplet' ? 2 : tupletType === 'quadruplet' ? 4 : tupletType ? 3 : undefined),
        position,
        total,
        groupId: groupId ?? null,
        groupStart,
        groupEnd
      };
    };
    const getActualLen = (note, meta) => {
      if (typeof note.beats === 'number') return note.beats;
      const base = note.duration ? durationToQuarter(note.duration) : 1;
      if (!meta.isTriplet) return base;
      if (meta.tupletType === 'duplet') return base * 3 / 2;
      if (meta.tupletType === 'quadruplet') return base * 3 / 4;
      return base * 2 / 3;
    };
    const getTripletBaseLen = (note, actualLen, meta) => {
      const baseFromDuration = note.duration ? durationToQuarter(note.duration) : null;
      if (baseFromDuration) return baseFromDuration;
      if (!meta || !meta.isTriplet) return actualLen;
      if (meta.tupletType === 'duplet') return actualLen * 2 / 3;
      if (meta.tupletType === 'quadruplet') return actualLen * 4 / 3;
      return typeof actualLen === 'number' ? actualLen * 1.5 : 1;
    };

    const mergeTies = (notes) => {
      const merged = [];
      let pending = null;
      const flush = () => {
        if (pending) {
          merged.push({ ...pending });
          pending = null;
        }
      };

      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        const len = typeof n.lengthQ === 'number'
          ? n.lengthQ
          : (typeof n.beats === 'number' ? n.beats : durationToQuarter(n.duration));

        if (n.type !== 'note') {
          flush();
          merged.push({ ...n });
          continue;
        }

        if (pending) {
          const samePitch = midiFromNote(pending) === midiFromNote(n);
          if (samePitch && (n.tieType === 'stop' || n.tieType === 'continue')) {
            const total = (pending.lengthQ || pending.beats || durationToQuarter(pending.duration) || 0) + len;
            pending.lengthQ = total;
            pending.beats = total;
            pending.duration = quarterToDuration(total);
            pending.tieType = n.tieType;
            if (n.tieType === 'stop') {
              flush();
            }
            continue;
          } else {
            flush();
          }
        }

        if (n.tieType === 'start') {
          pending = { ...n, lengthQ: len, tieType: 'start' };
          continue;
        }

        merged.push({ ...n });
      }

      flush();
      return merged;
    };

    const pushRestsToFill = (tokens, remainQ, pushToken) => {
      // 直接使用合法时值（含 /1）
      const durations = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
      let r = remainQ;
      durations.forEach((d) => {
        while (r >= d - EPS) {
          if (typeof pushToken === 'function') {
            pushToken(`0${formatDurationSuffix(d)}`);
          } else {
            tokens.push(`0${formatDurationSuffix(d)}`);
          }
          r -= d;
        }
      });
      return r;
    };

    const measures = melodyData.melody || [];
    const measureTokens = measures.map((measure) => {
      const tokens = [];
      const pushToken = (token, count) => {
        const inc = typeof count === 'number'
          ? count
          : (typeof token === 'string' && token.includes(',')
            ? token.split(/,(?![^<>]*>)/).filter((t) => t.trim() !== '').length
            : 1);
        tokens.push(token);
        globalNoteIndex += inc;
      };
      const pushTokens = (...items) => {
        items.forEach((item) => pushToken(item));
      };
      const notes = Array.isArray(measure?.notes) ? measure.notes : [];
      let totalQ = 0;

      const collectTripletGroup = (startIndex) => {
        const startMeta = getTripletMeta(notes[startIndex]);
        const groupId = startMeta.groupId;
        const groupTotal = typeof startMeta.tupletCount === 'number' ? startMeta.tupletCount : startMeta.total;
        const groupType = startMeta.tupletType;
        const groupNotes = [];
        let j = startIndex;
        for (; j < notes.length; j++) {
          const current = notes[j];
          const meta = getTripletMeta(current);
          if (!meta.isTriplet) break;
          if (groupType && meta.tupletType && meta.tupletType !== groupType) break;
          if (groupId !== null && meta.groupId !== groupId) break;
          if (groupId === null && j > startIndex && meta.groupStart) break;
          groupNotes.push(current);
          if (meta.groupEnd || (groupTotal && groupNotes.length >= groupTotal)) {
            j += 1;
            break;
          }
        }
        return { groupNotes, nextIndex: j };
      };

      const resolveMidi = (noteOrMidi) => {
        if (typeof noteOrMidi === 'number') return noteOrMidi;
        if (noteOrMidi && typeof noteOrMidi === 'object') return midiFromNote(noteOrMidi);
        return 60;
      };
      const formatSym = (noteOrMidi, len) => {
        const midi = resolveMidi(noteOrMidi);
        const pref = getNoteAccidentalPreference(noteOrMidi);
        const rawSym = mapMidiToSimpleNotation(
          midi,
          melodyData.config?.keySignature || 'C',
          pref
        ) || '1';
        const m = rawSym.match(/^([#b]*\d)([\^_]+)?$/);
        const core = m ? m[1] : rawSym;
        const octave = m ? (m[2] || '') : '';
        const suffix = formatDurationSuffix(len);
        return `${core}${suffix}${octave}`;
      };
      const formatCore = (noteOrMidi) => {
        const midi = resolveMidi(noteOrMidi);
        const pref = getNoteAccidentalPreference(noteOrMidi);
        const rawSym = mapMidiToSimpleNotation(
          midi,
          melodyData.config?.keySignature || 'C',
          pref
        ) || '1';
        const m = rawSym.match(/^([#b]*\d)([\^_]+)?$/);
        const core = m ? m[1] : rawSym;
        const octave = m ? (m[2] || '') : '';
        return `${core}${octave}`;
      };
      const getTieTypeBasic = (note) => {
        if (note?.tieType) return note.tieType;
        if (typeof note?.tie === 'string' && note.tie !== 'none') return note.tie;
        if (note?.tied && note.tieInfo) {
          const { isStart, isStop } = note.tieInfo;
          if (isStart && isStop) return 'continue';
          if (isStart) return 'start';
          if (isStop) return 'stop';
        }
        return null;
      };
      const inferTieType = (idx) => {
        const note = notes[idx];
        const explicit = getTieTypeBasic(note);
        if (explicit) return explicit;
        const tiedFlag = note?.tied === true || note?.tie === true;
        if (!tiedFlag) return null;
        const midi = midiFromNote(note);
        const prev = notes[idx - 1];
        const next = notes[idx + 1];
        const prevTied = prev && prev.type === 'note' && midiFromNote(prev) === midi &&
          (getTieTypeBasic(prev) || prev.tied === true || prev.tie === true);
        const nextTied = next && next.type === 'note' && midiFromNote(next) === midi &&
          (getTieTypeBasic(next) || next.tied === true || next.tie === true);
        if (prevTied && nextTied) return 'continue';
        if (prevTied) return 'stop';
        if (nextTied) return 'start';
        return null;
      };

      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        const tripletMeta = getTripletMeta(n);
        if (tripletMeta.isTriplet) {
          const { groupNotes, nextIndex } = collectTripletGroup(i);
          const innerTokens = [];
          let groupTotalBeats = 0;
          groupNotes.forEach((item) => {
            const itemMeta = getTripletMeta(item);
            const actualLen = getActualLen(item, itemMeta);
            const baseLen = getTripletBaseLen(item, actualLen, itemMeta);
            totalQ += actualLen;
            groupTotalBeats += actualLen;
            if (item.type === 'rest') {
              innerTokens.push(`0${formatDurationSuffix(baseLen)}`);
              return;
            }
            innerTokens.push(formatSym(item, baseLen));
          });
          if (innerTokens.length) {
            const tupletCount = getTripletMeta(groupNotes[0]).tupletCount || 3;
            const groupStartIndex = globalNoteIndex + 1;
            tupletGroups.push({
              startIndex: groupStartIndex,
              length: innerTokens.length,
              count: tupletCount,
              totalBeats: groupTotalBeats
            });
            // simple-notation 仅支持 3(...)
            pushToken(`3(${innerTokens.join(', ')})`, innerTokens.length);
          }
          i = nextIndex - 1;
          continue;
        }

        const len = typeof n.beats === 'number' ? n.beats : durationToQuarter(n.duration);

        if (n.type === 'rest') {
          totalQ += len;
          if (len >= 3.5 - EPS) { pushTokens('0', '-', '-', '-'); continue; }
          if (len >= 2.5 - EPS) { pushTokens('0', '-', '-'); continue; }
          if (len >= 1.75 - EPS) { pushTokens('0', '-'); continue; }
          pushToken(`0${formatDurationSuffix(len)}`);
          continue;
        }

        const midi = midiFromNote(n);
        const tieType = inferTieType(i);

        // tie: 同音延续先聚合；若总时值足够长，用长音“-”展开，否则用方括号保留tie
        if (tieType === 'start' || tieType === 'continue') {
          let totalLen = 0;
          const parts = [];
          let j = i;
          while (j < notes.length) {
            const cur = notes[j];
            if (cur.type !== 'note') break;
            const curMidi = midiFromNote(cur);
            const curLen = typeof cur.beats === 'number' ? cur.beats : durationToQuarter(cur.duration);
            const isSame = curMidi === midi;
            const curTie = inferTieType(j);
            const isTieSeg = (j === i && (curTie === 'start' || curTie === 'continue')) ||
              (j !== i && (curTie === 'continue' || curTie === 'stop'));
            if (isSame && isTieSeg) {
              totalQ += curLen;
              totalLen += curLen;
              parts.push(formatSym(cur, curLen));
              const isEnd = curTie === 'stop';
              j++;
              if (isEnd) break;
              continue;
            }
            break;
          }
          const emitLong = (noteRef, lengthVal) => {
            if (lengthVal >= 3.5 - EPS) { pushTokens(formatCore(noteRef), '-', '-', '-'); return; }
            if (lengthVal >= 2.5 - EPS) { pushTokens(formatCore(noteRef), '-', '-'); return; }
            if (lengthVal >= 1.75 - EPS) { pushTokens(formatCore(noteRef), '-'); return; }
            pushToken(formatSym(noteRef, lengthVal));
          };
          // 长时值直接用“-”表示；短时值保留tie方括号
          if (totalLen > 0 && totalLen >= 1.75 - EPS) {
            emitLong(note, totalLen);
            i = j - 1;
            continue;
          }
          if (parts.length) {
            pushToken(`[${parts.join(', ')}]`);
            i = j - 1;
            continue;
          }
        }

        // 非 tie：长时值用 “-” 延长
        totalQ += len;
        if (len >= 3.5 - EPS) { pushTokens(formatCore(n), '-', '-', '-'); continue; }
        if (len >= 2.5 - EPS) { pushTokens(formatCore(n), '-', '-'); continue; }
        if (len >= 1.75 - EPS) { pushTokens(formatCore(n), '-'); continue; }

        pushToken(formatSym(n, len));
      }

      // 若小节未填满（生成器偶尔不足拍），补休止符至满拍
      if (measureTargetQ && totalQ < measureTargetQ - EPS) {
        pushRestsToFill(tokens, measureTargetQ - totalQ, pushToken);
      }
      // simple-notation 每个音符用逗号分隔
      return tokens.join(', ');
    });

    window.__jpTupletGroups = tupletGroups;
    if (!groupEvery4) return measureTokens.join(' | ');

    const lines = [];
    const groupSize = 4;
    for (let i = 0; i < measureTokens.length; i += groupSize) {
      lines.push(measureTokens.slice(i, i + groupSize).join(' | '));
    }
    return lines.join('\n');
  }
  window.__buildSimpleNotationTemplate = buildSimpleNotationTemplate;

  // 独立的时值→标记映射（不依赖五线谱逻辑）
  function quarterToDuration(q) {
    const r = Math.round(q * 1000) / 1000;
    const map = {
      6: 'whole.',
      3: 'half.',
      1.5: 'quarter.',
      0.75: 'eighth.'
    };
    if (map[r]) return map[r];
    if (r === 4) return 'whole';
    if (r === 2) return 'half';
    if (r === 1) return 'quarter';
    if (r === 0.5) return 'eighth';
    if (r === 0.25) return '16th';
    return 'quarter';
  }

  // 从 MusicXML 解析出 melody 结构，供 Jianpu 渲染使用（处理 6/8 安全模式仅返回 XML 的情况）
  function parseMusicXMLToMelody(xmlString) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'application/xml');
      if (doc.querySelector('parsererror')) return null;

      const firstDivisions = parseInt(doc.querySelector('divisions')?.textContent || '4', 10) || 4;
      const timeEl = doc.querySelector('attributes > time') || doc.querySelector('measure time');
      const beats = parseInt(timeEl?.querySelector('beats')?.textContent || '4', 10) || 4;
      const beatType = parseInt(timeEl?.querySelector('beat-type')?.textContent || '4', 10) || 4;
      const timeSignature = `${beats}/${beatType}`;

      const measures = [];
      const durationFromType = (type, dots) => {
        if (!type) return null;
        const t = type.toLowerCase();
        let base = null;
        if (t === '16th' || t === 'sixteenth') base = '16th';
        else if (t === 'eighth') base = 'eighth';
        else if (t === 'quarter') base = 'quarter';
        else if (t === 'half') base = 'half';
        else if (t === 'whole') base = 'whole';
        if (!base) return null;
        return dots ? `${base}.` : base;
      };
      const mergeEighthRestsInDottedQuarter = (notes) => {
        const merged = [];
        let cursor = 0;
        let nextBoundary = 1.5;
        const eps = 1e-3;
        const getBeats = (note) => (typeof note?.beats === 'number' ? note.beats : durationToQuarter(note?.duration));

        for (let i = 0; i < (notes || []).length; i += 1) {
          const current = notes[i];
          const beatsVal = getBeats(current);
          const isEighthRest = current?.type === 'rest'
            && !current?.tuplet
            && Math.abs(beatsVal - 0.5) < eps;

          if (isEighthRest) {
            const nextNote = notes[i + 1];
            const nextBeats = getBeats(nextNote);
            const nextIsEighthRest = nextNote?.type === 'rest'
              && !nextNote?.tuplet
              && Math.abs(nextBeats - 0.5) < eps;

            if (nextIsEighthRest && cursor + beatsVal + nextBeats <= nextBoundary + eps) {
              merged.push({
                ...current,
                beats: 1,
                duration: 'quarter'
              });
              cursor += beatsVal + nextBeats;
              i += 1;
              if (cursor > nextBoundary - eps) {
                while (cursor > nextBoundary - eps) {
                  nextBoundary += 1.5;
                }
              }
              continue;
            }
          }

          merged.push(current);
          cursor += beatsVal;
          if (cursor > nextBoundary - eps) {
            while (cursor > nextBoundary - eps) {
              nextBoundary += 1.5;
            }
          }
        }

        return merged;
      };
      doc.querySelectorAll('measure').forEach((measureEl) => {
        const notes = [];
        const activeTuplets = new Map();
        let autoTupletId = 1;
        const parseTupletMeta = (noteEl) => {
          const actualNotes = parseInt(
            noteEl.querySelector('time-modification > actual-notes')?.textContent || '0',
            10
          );
          if (!actualNotes) return null;
          const tupletTag = noteEl.querySelector('notations > tuplet');
          const typeAttr = tupletTag?.getAttribute('type');
          const tupletType = actualNotes === 2 ? 'duplet' : actualNotes === 4 ? 'quadruplet' : 'triplet';
          const total = actualNotes || (tupletType === 'duplet' ? 2 : tupletType === 'quadruplet' ? 4 : 3);
          const rawNumber = tupletTag?.getAttribute('number');
          const number = rawNumber || `auto-${autoTupletId}`;

          let state = activeTuplets.get(number);
          if (!state || typeAttr === 'start' || !tupletTag) {
            state = { type: tupletType, total, index: 0 };
            activeTuplets.set(number, state);
            if (!tupletTag) autoTupletId += 1;
          }

          const position = state.index;
          state.index += 1;

          if (typeAttr === 'stop' || state.index >= state.total) {
            activeTuplets.delete(number);
          }

          return {
            type: state.type,
            position,
            total: state.total,
            id: number
          };
        };
        measureEl.querySelectorAll('note').forEach((noteEl) => {
          const isRest = !!noteEl.querySelector('rest');
          const durationDiv = parseFloat(noteEl.querySelector('duration')?.textContent || '0');
          const dots = noteEl.querySelectorAll('dot').length || undefined;
          const beatsVal = (Number.isFinite(durationDiv) ? durationDiv : 0) / firstDivisions;

          // 映射 duration
          const mapDuration = (b) => {
            const eps = 1e-3;
            const match = (v) => Math.abs(b - v) < eps;
            if (match(0.25)) return '16th';
            if (match(0.5)) return 'eighth';
            if (match(0.75)) return 'eighth.';
            if (match(1)) return dots ? 'quarter.' : 'quarter';
            if (match(1.5)) return 'quarter.';
            if (match(2)) return dots ? 'half.' : 'half';
            if (match(3)) return 'half.';
            if (match(4)) return 'whole';
            return 'quarter';
          };

          const typeTag = noteEl.querySelector('type')?.textContent || '';
          const base = {
            type: isRest ? 'rest' : 'note',
            duration: durationFromType(typeTag, dots) || mapDuration(beatsVal),
            beats: beatsVal
          };

          if (!isRest) {
            const step = noteEl.querySelector('pitch > step')?.textContent || 'C';
            const octave = parseInt(noteEl.querySelector('pitch > octave')?.textContent || '4', 10);
            const alter = parseInt(noteEl.querySelector('pitch > alter')?.textContent || '0', 10) || 0;
            base.step = step;
            base.octave = octave;
            base.alter = alter;
            base.midi = midiFromNote(base);
          }
          if (dots) base.dots = dots;
          const tuplet = parseTupletMeta(noteEl);
          if (tuplet) base.tuplet = tuplet;
          notes.push(base);
        });
        const mergedNotes = timeSignature === '6/8'
          ? mergeEighthRestsInDottedQuarter(notes)
          : notes;
        measures.push({ notes: mergedNotes });
      });

      return {
        melody: measures,
        config: { timeSignature }
      };
    } catch (e) {
      console.warn('解析 MusicXML 失败，无法构建简谱旋律结构:', e);
      return null;
    }
  }

  // 全新构建：简谱附点合并（仅基于节奏和同音相邻，不借用五线谱逻辑）
  function normalizeDottedForJianpu(melodyData) {
    if (!melodyData || !Array.isArray(melodyData.melody)) return melodyData;
    const ts = melodyData.config?.timeSignature || '4/4';
    const [num, den] = ts.split('/').map((n) => parseInt(n, 10));
    const measureQ = (num && den) ? num * (4 / den) : 4;
    const dottedValues = [1.5, 0.75, 3]; // quarter., eighth., half.
    const eps = 1e-3; // 放宽精度，防止浮点误差

    const normMeasures = melodyData.melody.map((measure) => {
      const notes = Array.isArray(measure?.notes) ? measure.notes : [];
      const timeline = [];
      let cursor = 0;
      for (const n of notes) {
        const len = typeof n.lengthQ === 'number'
          ? n.lengthQ
          : (typeof n.beats === 'number' ? n.beats : durationToQuarter(n.duration));
        timeline.push({ note: n, start: cursor, end: cursor + len, len });
        cursor += len;
      }

      const merged = [];
      const hasTieMark = (note) => !!(note?.tieType || note?.tie || note?.tied || note?.tieInfo);
      for (let i = 0; i < timeline.length; i++) {
        const a = timeline[i];
        const b = timeline[i + 1];
        if (a && b &&
          a.note.type === 'note' &&
          b.note.type === 'note' &&
          Math.abs(a.end - b.start) < eps && // 连续无间隔
          midiFromNote(a.note) === midiFromNote(b.note)) {
          if (hasTieMark(a.note) || hasTieMark(b.note)) {
            merged.push({ ...a.note });
            continue;
          }
          const sum = a.len + b.len;
          const target = dottedValues.find((v) => Math.abs(v - sum) < eps);
          const withinBar = a.start + sum <= measureQ + eps;
          if (target && withinBar) {
            const mergedNote = { ...a.note };
            mergedNote.duration = quarterToDuration(target);
            mergedNote.beats = sum;
            mergedNote.lengthQ = sum;
            mergedNote.tied = false;
            mergedNote.tieType = undefined;
            merged.push(mergedNote);
            i++; // skip b
            continue;
          }
        }
        merged.push({ ...a.note });
      }

      return { ...measure, notes: merged };
    });

    return { ...melodyData, melody: normMeasures };
  }

  function buildJianpuInfo(melodyData) {
    const preNormalized = typeof normalizeJianpuForDisplay === 'function'
      ? normalizeJianpuForDisplay(melodyData)
      : melodyData;
    const normalized = normalizeDottedForJianpu(preNormalized);
    const measures = normalized.melody || [];
    const config = melodyData.config || {};
    const [num, den] = (config.timeSignature || '4/4').split('/').map((v) => parseInt(v, 10));
    const measureQ = num * (4 / den || 1);
    const tempo = melodyData.tempo || 80;
    const mappingKey = getRelativeMajorKey(config.keySignature);
    const tonic = KEY_TO_TONIC[mappingKey] ?? 0;

    let notes = [];
    // 附点折叠（仅用于显示）：同音相邻，链和为标准附点时值
    function foldDotted(measure) {
      const dottedVals = [1.5, 0.75, 3];
      const eps = 1e-3;
      const src = Array.isArray(measure?.notes) ? measure.notes : [];
      const out = [];
      let cursor = 0;
      const hasTieMark = (note) => !!(note?.tieType || note?.tie || note?.tied || note?.tieInfo);
      for (let i = 0; i < src.length; i++) {
        const a = src[i];
        const aLen = typeof a.lengthQ === 'number'
          ? a.lengthQ
          : (typeof a.beats === 'number' ? a.beats : durationToQuarter(a.duration));
        const b = src[i + 1];
        if (b) {
          const bLen = typeof b.lengthQ === 'number'
            ? b.lengthQ
            : (typeof b.beats === 'number' ? b.beats : durationToQuarter(b.duration));
          const sum = aLen + bLen;
          const samePitch = a.type === 'note' && b.type === 'note' && midiFromNote(a) === midiFromNote(b);
          const target = dottedVals.find((v) => Math.abs(v - sum) < eps);
          if (samePitch && target && !(hasTieMark(a) || hasTieMark(b))) {
            const merged = { ...a };
            merged.duration = quarterToDuration(target);
            merged.beats = sum;
            merged.lengthQ = sum;
            merged.tied = false;
            merged.tieType = undefined;
            out.push(merged);
            i++; // skip b
            cursor += sum;
            continue;
          }
        }
        out.push({ ...a });
        cursor += aLen;
      }
      return { ...measure, notes: out };
    }

    measures.forEach((rawMeasure, mIndex) => {
      const measure = foldDotted(rawMeasure);
      let pos = 0;
      const mergedNotes = (measure.notes || []).map((n) => ({ ...n }));
      mergedNotes.forEach((n, idx) => {
        const len = n.lengthQ || durationToQuarter(n.duration);
        if (n.type === 'rest') {
          pos += len;
          return;
        }
        const start = mIndex * measureQ + pos;
        notes.push({
          start,
          length: len,
          pitch: midiFromNote(n),
          intensity: 100,
          debug: { m: mIndex, i: idx, duration: n.duration, beats: n.beats, lengthQ: n.lengthQ }
        });
        pos += len;
      });
    });

    return {
      notes,
      tempos: [{ start: 0, qpm: tempo }],
      keySignatures: [{ start: 0, key: tonic }],
      timeSignatures: [{ start: 0, numerator: num || 4, denominator: den || 4 }]
    };
  }

  function syncTimeSignaturesFromUI() {
    if (!window.userSettings) return;
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][id^="time-"]'));
    const selected = inputs.filter((i) => i.checked).map((i) => i.value);
    const finalSel = selected.length ? selected : ['4/4'];
    // 保持UI与状态一致
    if (!selected.length) {
      inputs.forEach((i) => { i.checked = i.value === '4/4'; });
    }
    window.userSettings.allowedTimeSignatures = finalSel;
  }

  function applyTupletOverrides(runtime) {
    const groups = Array.isArray(window.__jpTupletGroups) ? window.__jpTupletGroups : [];
    if (!groups.length || !runtime || !Array.isArray(runtime.parsedScore)) return;

    const flatNotes = [];
    runtime.parsedScore.forEach((stave) => {
      (stave?.measureOptions || []).forEach((measure) => {
        (measure?.noteOptions || []).forEach((note) => {
          flatNotes.push(note);
        });
      });
    });

    groups.forEach((group) => {
      if (!group || typeof group.startIndex !== 'number' || typeof group.length !== 'number') return;
      if (group.count === 3) return;
      const startIdx = Math.max(group.startIndex - 1, 0);
      const endIdx = startIdx + group.length;
      const groupNotes = flatNotes.slice(startIdx, endIdx);
      if (groupNotes.length !== group.length) return;

      groupNotes.forEach((note) => {
        note.isTriplet = false;
        note.tripletGroupStart = false;
        note.tripletGroupEnd = false;
      });

      const currentTotal = groupNotes.reduce((sum, note) => (
        sum + (typeof note.nodeTime === 'number' ? note.nodeTime : 0)
      ), 0);
      const desiredTotal = typeof group.totalBeats === 'number' ? group.totalBeats : currentTotal;
      if (currentTotal > 0 && desiredTotal > 0 && Math.abs(desiredTotal - currentTotal) > 1e-6) {
        const scale = desiredTotal / currentTotal;
        groupNotes.forEach((note) => {
          if (typeof note.nodeTime === 'number') {
            note.nodeTime *= scale;
          }
        });
      }
    });
  }

  function drawNonTripletTupletOverlay() {
    if (!scoreEl) return;
    const svg = scoreEl.querySelector('#sn-container');
    if (!svg) return;
    svg.querySelectorAll('[data-jp-tuplet-overlay]').forEach((el) => el.remove());
    const groups = Array.isArray(window.__jpTupletGroups)
      ? window.__jpTupletGroups.filter((g) => g && (g.count === 2 || g.count === 4))
      : [];
    if (!groups.length) return;

    const noteRects = Array.from(svg.querySelectorAll('[note-index]'));
    const rectMap = new Map();
    noteRects.forEach((el) => {
      const index = parseInt(el.getAttribute('note-index') || '0', 10);
      if (Number.isFinite(index) && index > 0) rectMap.set(index, el);
    });

    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('data-jp-tuplet-overlay', '1');
    layer.setAttribute('sn-tag', 'tuplet-overlay');
    layer.style.pointerEvents = 'none';

    const makeLine = (x1, y1, x2, y2) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', `${x1}`);
      line.setAttribute('y1', `${y1}`);
      line.setAttribute('x2', `${x2}`);
      line.setAttribute('y2', `${y2}`);
      line.setAttribute('stroke', '#111');
      line.setAttribute('stroke-width', '1.2');
      return line;
    };
    const makeText = (text, x, y) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', `${x}`);
      t.setAttribute('y', `${y}`);
      t.setAttribute('font-size', '12px');
      t.setAttribute('font-family', '"SimSun", "STSong", "FangSong", serif');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('fill', '#111');
      t.textContent = text;
      return t;
    };

    groups.forEach((group) => {
      const startEl = rectMap.get(group.startIndex);
      const endEl = rectMap.get(group.startIndex + group.length - 1);
      if (!startEl || !endEl) return;
      const pad = 3;
      const tick = 6;
      const startX = parseFloat(startEl.getAttribute('x') || '0');
      const startY = parseFloat(startEl.getAttribute('y') || '0');
      const endX = parseFloat(endEl.getAttribute('x') || '0');
      const endW = parseFloat(endEl.getAttribute('width') || '0');
      const endY = parseFloat(endEl.getAttribute('y') || '0');
      const x1 = startX + pad;
      const x2 = endX + endW - pad;
      if (!Number.isFinite(x1) || !Number.isFinite(x2) || x2 <= x1) return;
      const y = Math.min(startY, endY) - 6;

      layer.appendChild(makeLine(x1, y, x2, y));
      layer.appendChild(makeLine(x1, y, x1, y + tick));
      layer.appendChild(makeLine(x2, y, x2, y + tick));
      layer.appendChild(makeText(String(group.count), (x1 + x2) / 2, y - 2));
    });

    svg.appendChild(layer);
  }

  async function renderScore(melodyData) {
    lastRenderedMelody = melodyData;
    window.lastRenderedMelody = melodyData;
    if (!scoreEl) return;

    // 额外防护：当临时记号概率为0且为大调时，去除任何残留的alter，避免意外升降号
    const fallbackAccRate = (typeof userSettings !== 'undefined' && typeof userSettings.accidentalRate === 'number')
      ? userSettings.accidentalRate
      : (window.userSettings?.accidentalRate ?? 0);
    const accRate = (melodyData.config && melodyData.config.accidentalRate) ?? fallbackAccRate;
    if (accRate === 0 && Array.isArray(melodyData.melody)) {
      melodyData = {
        ...melodyData,
        melody: melodyData.melody.map((m) => ({
          ...m,
          notes: (m.notes || []).map((n) => {
            if (n && n.type === 'note' && typeof n.alter === 'number' && n.alter !== 0) {
              const cleaned = { ...n, alter: 0 };
              if (typeof n.midi === 'number') cleaned.midi = n.midi - n.alter;
              return cleaned;
            }
            return n;
          })
        }))
      };
      lastRenderedMelody = melodyData;
      window.lastRenderedMelody = melodyData;
    }

    // 若存在 MusicXML，则优先解析为可用的 melody 结构
    if (typeof melodyData?.musicXML === 'string') {
      const parsed = parseMusicXMLToMelody(melodyData.musicXML);
      if (parsed && parsed.melody?.length) {
        melodyData = {
          ...melodyData,
          melody: parsed.melody,
          config: { ...(melodyData.config || {}), ...(parsed.config || {}) }
        };
      }
    }

    if (!melodyData || !melodyData.melody || !melodyData.melody.length) {
      scoreEl.innerHTML = `<div class="jianpu-score" style="color:${ACCENT};padding:16px;">${getI18nText('score.empty', '点击生成简谱开始练习')}</div>`;
      return;
    }

    const sn = await ensureSimpleNotationLoaded();
    const general = sn && sn.General;
    const canUseSimpleNotation = sn && sn.SimpleNotation && general;

    if (!canUseSimpleNotation) {
      renderFallbackJianpu(melodyData);
      return;
    }

    const [num, den] = (melodyData.config?.timeSignature || '4/4').split('/').map((v) => parseInt(v, 10));
    const key = melodyData.config?.keySignature || 'C';
    const displayKey = getRelativeMajorKey(key);
    const tmplBuilder = window.__buildSimpleNotationTemplate || buildSimpleNotationTemplate;
    const scoreText = tmplBuilder(melodyData, general, true);

    scoreEl.innerHTML = '';
    currentRenderer = new window.SN.SimpleNotation(scoreEl, {
      resize: true,
      debug: false,
      score: { align: 'center' }
    });
    const loadPayload = {
      info: {
        time: String(num || 4),
        beat: String(den || 4),
        tempo: undefined,
        key: displayKey
      },
      score: scoreText,
      lyric: ''
    };
    currentRenderer.loadData(loadPayload);
    // 细化 tie 粗细与颜色，避免连线过粗
    const injectTieStyle = () => {
      if (scoreEl.querySelector('style[data-jp-tie]')) return;
      const style = document.createElement('style');
      style.dataset.jpTie = '1';
      style.textContent = '[sn-tag=\"tieline\"] path { stroke-width: 0.6 !important; stroke: #444 !important; stroke-opacity: 0.9 !important; stroke-linecap: round !important; fill: none !important; }';
      scoreEl.appendChild(style);
    };
    const applyTieAttrs = () => {
      scoreEl.querySelectorAll('[sn-tag=\"tieline\"] path').forEach((p) => {
        p.setAttribute('stroke-width', '0.6');
        p.setAttribute('stroke', '#444');
        p.setAttribute('stroke-opacity', '0.9');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('fill', 'none');
      });
    };
    injectTieStyle();
    applyTieAttrs();
    setTimeout(applyTieAttrs, 0);
    setTimeout(applyTieAttrs, 80);
    const applyTupletOverlay = () => {
      drawNonTripletTupletOverlay();
    };
    applyTupletOverlay();
    setTimeout(applyTupletOverlay, 0);
    setTimeout(applyTupletOverlay, 80);
    const fixTimeSignatureLabel = () => {
      const [n, d] = (melodyData.config?.timeSignature || '4/4').split('/');
      if (!n || !d) return;
      const expected = `${n}/${d}`;
      const swapped = `${d}/${n}`;
      if (expected === swapped) return;
      scoreEl.querySelectorAll('text').forEach((t) => {
        if (t.textContent && t.textContent.trim() === swapped) {
          t.textContent = expected;
        }
      });
    };
    const fixKeySignatureLabel = () => {
      const label = formatJianpuKeyLabel(key);
      const svg = scoreEl.querySelector('svg');
      if (!svg) return false;
      const textEls = Array.from(svg.querySelectorAll('text'));
      const keyTexts = [];
      let timeText = null;
      for (const t of textEls) {
        const raw = (t.textContent || '').trim();
        if (!raw) continue;
        if (!timeText && raw.includes('/')) timeText = t;
        if (raw.includes('=')) keyTexts.push(t);
      }
      if (!keyTexts.length) return false;
      keyTexts.forEach((t) => { t.textContent = label; });
      if (!timeText) return true;
      const timeBox = timeText.getBBox();
      const keyBox = keyTexts[0].getBBox();
      const pad = 10;
      const timeY = timeText.getAttribute('y');
      const newX = Math.max(0, timeBox.x - keyBox.width - pad);
      const newY = timeY !== null ? timeY : String(timeBox.y + timeBox.height);
      keyTexts.forEach((t) => {
        t.setAttribute('x', String(newX));
        t.setAttribute('y', String(newY));
      });
      return true;
    };
    fixTimeSignatureLabel();
    fixKeySignatureLabel();
    if (scoreEl.__keySigObserver) scoreEl.__keySigObserver.disconnect();
    const keySigObserver = new MutationObserver(() => {
      if (fixKeySignatureLabel()) {
        keySigObserver.disconnect();
      }
    });
    keySigObserver.observe(scoreEl, { childList: true, subtree: true });
    scoreEl.__keySigObserver = keySigObserver;
    setTimeout(fixTimeSignatureLabel, 0);
    setTimeout(fixTimeSignatureLabel, 80);
    setTimeout(fixKeySignatureLabel, 0);
    setTimeout(fixKeySignatureLabel, 80);
    window.currentJianpuRenderer = currentRenderer;
    applyHiddenState(scoreEl);
  }

  function renderFallbackJianpu(melodyData) {
    const measures = melodyData?.melody || [];
    const [tsNum, tsDen] = (melodyData?.config?.timeSignature || '4/4').split('/').map((v) => parseInt(v, 10) || 0);
    const timeSignature = `${tsNum || 4}/${tsDen || 4}`;
    const key = melodyData?.config?.keySignature || 'C';

    const createNoteEl = (n) => {
      const len = typeof n.beats === 'number' ? n.beats : durationToQuarter(n.duration);
      const note = document.createElement('div');
      note.className = 'jianpu-note';
      note.style.flex = `${Math.max(len, 0.5)}`;

      const durClass = (() => {
        if (len >= 3.75) return 'whole';
        if (len >= 1.75) return 'half';
        if (len >= 0.75) return 'quarter';
        if (len >= 0.35) return 'eighth';
        return 'sixteenth';
      })();
      note.classList.add(durClass);

      const isDotted = Math.abs(len - 1.5) < 0.01 || Math.abs(len - 3) < 0.01 || Math.abs(len - 0.75) < 0.01;
      if (isDotted) note.classList.add('is-dotted');

      const body = document.createElement('span');
      body.className = 'note-body';
      if (n.type === 'rest') {
        note.classList.add('rest');
        body.textContent = '0';
      } else {
        const midi = midiFromNote(n);
        const pref = getNoteAccidentalPreference(n);
        const sym = mapMidiToSimpleNotation(midi, key, pref);
        body.textContent = sym || '1';
      }
      const mark = document.createElement('span');
      mark.className = 'duration-mark';

      note.appendChild(body);
      note.appendChild(mark);
      return note;
    };

    const container = document.createElement('div');
    container.className = 'jianpu-score';

    const topline = document.createElement('div');
    topline.className = 'jianpu-topline';
    topline.innerHTML = `<span class="badge">${formatJianpuKeyLabel(key)}</span><span class="badge">${timeSignature}</span>`;
    container.appendChild(topline);

    const staff = document.createElement('div');
    staff.className = 'jianpu-staff';
    staff.style.justifyContent = 'center';
    staff.style.gridTemplateColumns = 'repeat(4, minmax(140px, 1fr))';

    measures.forEach((measure, idx) => {
      const mDiv = document.createElement('div');
      mDiv.className = 'jianpu-measure';
      const mLabel = document.createElement('div');
      mLabel.className = 'jianpu-measure-label';
      mLabel.style.fontSize = '12px';
      mLabel.style.color = '#555';
      mLabel.textContent = idx + 1;
      mLabel.style.position = 'absolute';
      mLabel.style.left = '4px';
      mLabel.style.top = '4px';
      mDiv.appendChild(mLabel);

      const notes = Array.isArray(measure?.notes) ? measure.notes : [];
      notes.forEach((n) => mDiv.appendChild(createNoteEl(n)));
      staff.appendChild(mDiv);
    });

    container.appendChild(staff);
    scoreEl.innerHTML = '';
    scoreEl.appendChild(container);
    applyHiddenState(scoreEl);
  }

  window.renderScore = renderScore;
  window.rerenderLatestScore = () => {
    if (lastRenderedMelody) renderScore(lastRenderedMelody);
  };
  window.__jianpuTiePatchVersion = 'tie-v3';
  // 如果 SN 已在 preload 中加载，轮询一次确保补丁落地
  const patchSNLoadIfReady = () => {
    const sn = window.SN;
    if (sn && sn.SimpleNotation && !sn.SimpleNotation.__jianpuPatched) {
      const origLoad = sn.SimpleNotation.prototype.loadData;
      sn.SimpleNotation.prototype.loadData = function(data) {
        let nextData = data;
        try {
          const md = window.lastRenderedMelody;
          const builder = window.__buildSimpleNotationTemplate || buildSimpleNotationTemplate;
          const general = window.SN && window.SN.General;
          if (md && builder) {
            nextData = { ...nextData, score: builder(md, general, true) };
          }
          const infoKey = nextData?.info?.key;
          if (typeof infoKey === 'string' && infoKey) {
            const displayKey = getRelativeMajorKey(infoKey);
            if (displayKey && infoKey !== displayKey) {
              nextData = { ...nextData, info: { ...(nextData.info || {}), key: displayKey } };
            }
          }
          window.__lastSNLoadData = nextData;
        } catch (e) {
          console.warn('patched loadData failed', e);
        }
        return origLoad.apply(this, [nextData]);
      };
      sn.SimpleNotation.__jianpuPatched = true;
    }
  };
  patchSNLoadIfReady();
  setTimeout(patchSNLoadIfReady, 300);
  setTimeout(patchSNLoadIfReady, 800);
  setTimeout(patchSNLoadIfReady, 1500);
  setTimeout(() => patchTieRenderer(window.SN), 0);
  setTimeout(() => patchTieRenderer(window.SN), 500);
  setTimeout(() => patchBeamGrouping(window.SN), 0);
  setTimeout(() => patchBeamGrouping(window.SN), 500);

  // Ensure clef/notation toggles are not used and defaults follow melody generator
  document.addEventListener('DOMContentLoaded', () => {
    if (window.userSettings) {
      window.userSettings.allowedClefs = ['treble'];
      syncTimeSignaturesFromUI();
    }
  });

  // 确保每次生成前拍号与UI一致，防止残留的6/8影响4/4
  const originalGenerateMelody = window.generateMelody;
  if (typeof originalGenerateMelody === 'function') {
    window.generateMelody = async function(...args) {
      syncTimeSignaturesFromUI();
      return originalGenerateMelody.apply(this, args);
    };
  }
})();
