(function(global){
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
    '8th.': 0.75,
    '16th': 0.25,
    '16th.': 0.375,
    'dotted-16th': 0.375,
    'half.': 3,
    'dotted-half': 3
  };

  const Q_TO_DURATION = {
    1.5: 'quarter.',
    0.75: 'eighth.',
    3: 'half.',
    6: 'whole.'
  };

  function durationToQuarter(d) {
    if (typeof d === 'number') return d;
    if (DURATION_TO_Q[d] !== undefined) return DURATION_TO_Q[d];
    const dotted = d && (d.includes('.') || d.startsWith('dotted-'));
    const base = d ? d.replace('dotted-', '').replace('.', '') : '';
    const val = DURATION_TO_Q[base] ?? 1;
    return dotted ? val * 1.5 : val;
  }

  function quarterToDuration(q) {
    const rounded = Math.round(q * 1000) / 1000;
    if (Q_TO_DURATION[rounded]) return Q_TO_DURATION[rounded];
    const baseMap = {
      4: 'whole',
      2: 'half',
      1: 'quarter',
      0.5: 'eighth',
      0.25: '16th'
    };
    return baseMap[rounded] || 'quarter';
  }

  function samePitch(a, b) {
    const hasMidiA = typeof a.midi === 'number';
    const hasMidiB = typeof b.midi === 'number';
    if (hasMidiA && hasMidiB) return a.midi === b.midi;
    if (typeof a.pitch === 'number' && typeof b.pitch === 'number') {
      return a.pitch === b.pitch;
    }
    if (a.step && b.step && typeof a.octave === 'number' && typeof b.octave === 'number') {
      const alterA = a.alter || 0;
      const alterB = b.alter || 0;
      return a.step === b.step && a.octave === b.octave && alterA === alterB;
    }
    return false;
  }

  function canMerge(pairDurationQ) {
    const eps = 1e-6;
    const candidates = [1.5, 0.75, 3, 6];
    return candidates.find((c) => Math.abs(c - pairDurationQ) < eps);
  }

  function normalizeMeasure(notes, timeSignature) {
    const ts = String(timeSignature || '4/4').trim();
    const [numStr, denStr] = ts.split('/');
    const num = parseInt(numStr, 10);
    const den = parseInt(denStr, 10);
    const validSig = !Number.isNaN(num) && !Number.isNaN(den) && num > 0 && den > 0;
    if (!validSig) return notes.map((n) => ({ ...n }));

    const measureLen = num * (4 / den);
    const beatGroup = ts === '6/8' ? 1.5 : 1; // 6/8按附点四分分组，其余保持四分拍

    const timeline = [];
    let cursor = 0;
    for (const n of notes) {
      const dur = typeof n.beats === 'number' ? n.beats : durationToQuarter(n.duration);
      timeline.push({ note: n, start: cursor, dur, end: cursor + dur });
      cursor += dur;
    }

    const result = [];
    const eps = 1e-6;
    const hasTieMark = (note) => !!(note?.tieType || note?.tie || note?.tied || note?.tieInfo);

    const boundaries = [];
    for (let p = beatGroup; p < measureLen + eps; p += beatGroup) {
      boundaries.push(Math.round(p * 1e6) / 1e6);
    }

    const crossesBoundary = (start, end) => {
      return boundaries.some((b) => start < b - eps && end > b + eps);
    };

    const minDurInGroup = (start) => {
      const groupStart = Math.floor(start / beatGroup) * beatGroup;
      const groupEnd = groupStart + beatGroup + eps;
      let min = Infinity;
      for (const seg of timeline) {
        if (seg.start + eps >= groupStart && seg.start < groupEnd) {
          min = Math.min(min, seg.dur);
        }
      }
      return min === Infinity ? null : min;
    };

    for (let i = 0; i < timeline.length; i++) {
      const a = timeline[i];
      const b = timeline[i + 1];
      if (!b) {
        result.push({ ...a.note });
        continue;
      }

      const pair = a.dur + b.dur;
      const dotted = canMerge(pair);
      const contiguous = Math.abs(a.end - b.start) < eps;
      const minDur = minDurInGroup(a.start);
      const has16th = minDur !== null && minDur < 0.5 - eps;
      const crosses = crossesBoundary(a.start, a.start + pair);

      if (dotted && contiguous && samePitch(a.note, b.note) && !(hasTieMark(a.note) || hasTieMark(b.note))) {
        // 若窗口最小时值>=八分，允许跨界合并；若含16分，禁止跨分组
        if (!has16th || !crosses) {
          const merged = { ...a.note };
          merged.duration = quarterToDuration(dotted);
          merged.beats = pair;
          merged.lengthQ = pair;
          merged.tied = false;
          merged.tieType = undefined;
          result.push(merged);
          i++;
          continue;
        }
      }

      result.push({ ...a.note });
    }

    return result;
  }

  function normalizeForDisplay(melodyData) {
    if (!melodyData || !Array.isArray(melodyData.melody)) return melodyData;
    const timeSig = melodyData.config?.timeSignature || '4/4';
    const normalizedMeasures = melodyData.melody.map((measure) => {
      const notes = Array.isArray(measure?.notes) ? measure.notes : [];
      return { ...measure, notes: normalizeMeasure(notes, timeSig) };
    });
    return { ...melodyData, melody: normalizedMeasures };
  }

  // UMD export
  global.normalizeJianpuForDisplay = normalizeForDisplay;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normalizeForDisplay, normalizeMeasure, durationToQuarter, quarterToDuration };
  }
})(typeof window !== 'undefined' ? window : global);
