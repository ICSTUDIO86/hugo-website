// 6/8-specific hook layer for Jianpu generation/rendering.
(function () {
  if (typeof window === 'undefined') return;
  if (typeof window.generate68MeasureWithBeatClarity !== 'function') return;

  const baseGenerate68 = window.generate68MeasureWithBeatClarity;
  const STEP_TO_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const EPS = 1e-3;

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
    if (dots && dots > 0) return `${base}.`;
    return base;
  };

  const durationFromBeats = (beats, dots) => {
    const match = (v) => Math.abs(beats - v) < EPS;
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

  const durationToQuarter = (duration) => {
    switch (duration) {
      case 'whole': return 4;
      case 'whole.': return 6;
      case 'half': return 2;
      case 'half.': return 3;
      case 'quarter': return 1;
      case 'quarter.': return 1.5;
      case 'eighth': return 0.5;
      case 'eighth.': return 0.75;
      case '16th': return 0.25;
      default: return 1;
    }
  };

  const quarterToDuration = (q) => {
    const r = Math.round(q * 1000) / 1000;
    if (r === 6) return 'whole.';
    if (r === 4) return 'whole';
    if (r === 3) return 'half.';
    if (r === 2) return 'half';
    if (r === 1.5) return 'quarter.';
    if (r === 1) return 'quarter';
    if (r === 0.75) return 'eighth.';
    if (r === 0.5) return 'eighth';
    if (r === 0.25) return '16th';
    return 'quarter';
  };

  const midiFromParts = (step, alter, octave) => {
    const base = STEP_TO_SEMITONE[step] ?? 0;
    const acc = typeof alter === 'number' ? alter : 0;
    return (octave + 1) * 12 + base + acc;
  };

  const parseTupletMeta = (noteEl, activeTuplets) => {
    const actualNotes = parseInt(
      noteEl.querySelector('time-modification > actual-notes')?.textContent || '0',
      10
    );
    if (!actualNotes) return null;
    const tupletTag = noteEl.querySelector('notations > tuplet');
    const number = tupletTag?.getAttribute('number') || '1';
    const typeAttr = tupletTag?.getAttribute('type');
    const tupletType = actualNotes === 2 ? 'duplet' : actualNotes === 4 ? 'quadruplet' : 'triplet';
    const total = actualNotes || (tupletType === 'duplet' ? 2 : tupletType === 'quadruplet' ? 4 : 3);

    let state = activeTuplets.get(number);
    if (!state || typeAttr === 'start') {
      state = { type: tupletType, total, index: 0 };
      activeTuplets.set(number, state);
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

  const parseMeasureXMLToNotes = (measureXML, divisions) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<measure>${measureXML}</measure>`, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    const notes = [];
    const activeTuplets = new Map();

    doc.querySelectorAll('note').forEach((noteEl) => {
      const isRest = !!noteEl.querySelector('rest');
      const durationDiv = parseFloat(noteEl.querySelector('duration')?.textContent || '0');
      const beats = Number.isFinite(durationDiv) ? durationDiv / divisions : 0;
      const dots = noteEl.querySelectorAll('dot').length || 0;
      const typeTag = noteEl.querySelector('type')?.textContent || '';
      const duration = durationFromType(typeTag, dots) || durationFromBeats(beats, dots);

      const note = {
        type: isRest ? 'rest' : 'note',
        duration,
        beats
      };

      if (dots) note.dots = dots;

      if (!isRest) {
        const step = noteEl.querySelector('pitch > step')?.textContent || 'C';
        const octave = parseInt(noteEl.querySelector('pitch > octave')?.textContent || '4', 10);
        const alter = parseInt(noteEl.querySelector('pitch > alter')?.textContent || '0', 10) || 0;
        note.step = step;
        note.octave = octave;
        note.alter = alter;
        note.midi = midiFromParts(step, alter, octave);
      }

      const tuplet = parseTupletMeta(noteEl, activeTuplets);
      if (tuplet) note.tuplet = tuplet;

      notes.push(note);
    });

    return notes;
  };

  const splitAcrossDottedQuarter = (notes) => {
    const boundary = 1.5;
    const adjusted = [];
    let cursor = 0;

    notes.forEach((note) => {
      const len = typeof note.beats === 'number' ? note.beats : durationToQuarter(note.duration);
      const next = cursor + len;
      const crosses = !note.tuplet
        && cursor < boundary - EPS
        && next > boundary + EPS;

      if (crosses) {
        const firstLen = boundary - cursor;
        const secondLen = len - firstLen;
        const first = {
          ...note,
          beats: firstLen,
          duration: quarterToDuration(firstLen),
          tieType: 'start'
        };
        const second = {
          ...note,
          beats: secondLen,
          duration: quarterToDuration(secondLen),
          tieType: 'stop'
        };
        adjusted.push(first, second);
      } else {
        adjusted.push(note);
      }

      cursor = next;
      if (Math.abs(cursor - boundary) < EPS) cursor = boundary;
    });

    return adjusted;
  };

  const syncRhythmSettingsFromUI = () => {
    if (!window.userSettings) return;
    const inputs = document.querySelectorAll('#rhythmModal input[type="checkbox"]');
    if (!inputs.length) return;
    const selected = [];
    let allowDotted = null;

    inputs.forEach((input) => {
      if (input.id === 'allowDottedNotes') {
        allowDotted = input.checked;
        return;
      }
      if (input.checked && input.value) selected.push(input.value);
    });

    if (!selected.length) return;
    const finalRhythms = new Set(selected);
    if (allowDotted) {
      if (selected.includes('half') && selected.includes('quarter')) finalRhythms.add('half.');
      if (selected.includes('quarter') && selected.includes('eighth')) finalRhythms.add('quarter.');
      if (selected.includes('eighth') && selected.includes('16th')) finalRhythms.add('eighth.');
    } else {
      Array.from(finalRhythms).forEach((rhythm) => {
        if (rhythm.includes('.') || rhythm.startsWith('dotted-')) finalRhythms.delete(rhythm);
      });
    }

    window.userSettings.allowedRhythms = Array.from(finalRhythms);
    if (typeof allowDotted === 'boolean') {
      window.userSettings.allowDottedNotes = allowDotted;
    }
  };

  const normalizeTupletDurations = (notes) => (notes || []).map((note) => {
    if (!note?.tuplet) return note;
    const baseDuration = durationToQuarter('eighth');
    let adjustedBeats = note.beats;
    if (note.tuplet.type === 'duplet') adjustedBeats = baseDuration * 3 / 2;
    else if (note.tuplet.type === 'quadruplet') adjustedBeats = baseDuration * 3 / 4;
    else adjustedBeats = baseDuration * 2 / 3;
    const displayDuration = 'eighth';
    return {
      ...note,
      duration: displayDuration,
      beats: adjustedBeats
    };
  });

  const mergeEighthRestsInDottedQuarter = (notes) => {
    const merged = [];
    let cursor = 0;
    let nextBoundary = 1.5;

    for (let i = 0; i < (notes || []).length; i += 1) {
      const current = notes[i];
      const beats = typeof current?.beats === 'number'
        ? current.beats
        : durationToQuarter(current?.duration);
      const isEighthRest = current?.type === 'rest'
        && !current?.tuplet
        && Math.abs(beats - 0.5) < EPS;

      if (isEighthRest) {
        const nextNote = notes[i + 1];
        const nextBeats = typeof nextNote?.beats === 'number'
          ? nextNote.beats
          : durationToQuarter(nextNote?.duration);
        const nextIsEighthRest = nextNote?.type === 'rest'
          && !nextNote?.tuplet
          && Math.abs(nextBeats - 0.5) < EPS;

        if (nextIsEighthRest && cursor + beats + nextBeats <= nextBoundary + EPS) {
          const mergedRest = {
            ...current,
            beats: 1,
            duration: quarterToDuration(1)
          };
          delete mergedRest.dots;
          merged.push(mergedRest);
          cursor += beats + nextBeats;
          i += 1;
          if (cursor > nextBoundary - EPS) {
            while (cursor > nextBoundary - EPS) {
              nextBoundary += 1.5;
            }
          }
          continue;
        }
      }

      merged.push(current);
      cursor += beats;
      if (cursor > nextBoundary - EPS) {
        while (cursor > nextBoundary - EPS) {
          nextBoundary += 1.5;
        }
      }
    }

    return merged;
  };

  window.generate68MeasureWithBeatClarity = function (...args) {
    syncRhythmSettingsFromUI();
    const result = baseGenerate68.apply(this, args);
    if (!result) return result;

    if (Array.isArray(result.notes)) {
      const adjustedNotes = mergeEighthRestsInDottedQuarter(
        normalizeTupletDurations(result.notes)
      );
      return { ...result, notes: adjustedNotes };
    }

    if (typeof result.xml !== 'string') return result;
    const notes = parseMeasureXMLToNotes(result.xml, 4);
    const adjustedNotes = mergeEighthRestsInDottedQuarter(
      normalizeTupletDurations(splitAcrossDottedQuarter(notes))
    );
    return { ...result, notes: adjustedNotes };
  };

  let underlineObserver = null;
  let underlineObservedBeam = null;
  let underlineFixScheduled = false;
  let underlineFixing = false;

  const isSixEight = () => {
    if (window.lastRenderedMelody?.config?.timeSignature === '6/8') return true;
    const info = window.__lastSNLoadData?.info;
    return String(info?.time || '') === '6' && String(info?.beat || '') === '8';
  };

  const getUnderlineCount = (beats) => {
    const safeBeats = typeof beats === 'number' ? beats : 0;
    if (safeBeats >= 1 - EPS) return 0;
    if (safeBeats >= 0.5 - EPS) return 1;
    if (safeBeats >= 0.25 - EPS) return 2;
    if (safeBeats >= 0.125 - EPS) return 3;
    return 4;
  };

  const getUnderlineCountForNote = (note) => {
    if (note?.tuplet && note?.duration) {
      return getUnderlineCount(durationToQuarter(note.duration));
    }
    const beats = typeof note?.beats === 'number'
      ? note.beats
      : durationToQuarter(note?.duration);
    return getUnderlineCount(beats);
  };

  const median = (values) => {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const fix68Underlines = () => {
    if (underlineFixing || !isSixEight()) return;
    const svg = document.getElementById('sn-container');
    if (!svg) return;
    const beamGroup = svg.querySelector('g[sn-tag="beam"]');
    if (!beamGroup) return;
    const melody = window.lastRenderedMelody?.melody || [];
    if (!melody.length) return;

    underlineFixing = true;
    try {
      const horizontal = Array.from(beamGroup.querySelectorAll('line'))
        .map((line) => ({
          el: line,
          x1: parseFloat(line.getAttribute('x1') || '0'),
          x2: parseFloat(line.getAttribute('x2') || '0'),
          y1: parseFloat(line.getAttribute('y1') || '0'),
          y2: parseFloat(line.getAttribute('y2') || '0')
        }))
        .filter((line) => Math.abs(line.y1 - line.y2) < 0.01 && Math.abs(line.x2 - line.x1) > 1);

      const yPositions = Array.from(new Set(horizontal.map((line) => line.y1))).sort((a, b) => a - b);
      const baseY = yPositions.length
        ? yPositions[0]
        : (() => {
            const firstText = svg.querySelector('g[sn-tag^="note-"] text');
            const textY = firstText ? parseFloat(firstText.getAttribute('y') || '0') : 0;
            return textY + 3;
          })();
      const lineSpacing = yPositions.length > 1 ? yPositions[1] - yPositions[0] : 3;
      const lineStyle = horizontal[0]
        ? {
            stroke: horizontal[0].el.getAttribute('stroke') || 'black',
            strokeWidth: horizontal[0].el.getAttribute('stroke-width') || '1'
          }
        : { stroke: 'black', strokeWidth: '1' };

      horizontal.forEach((line) => line.el.remove());

      melody.forEach((measure, measureIdx) => {
        const notes = measure.notes || measure;
        const measureEl = svg.querySelector(`g[sn-tag="measure-${measureIdx}"]`);
        if (!measureEl) return;
        const noteGroups = Array.from(measureEl.querySelectorAll('g[sn-tag^="note-"]'));
        if (noteGroups.length !== notes.length) return;

        const boxes = noteGroups.map((group) => group.getBBox());
        const xs = boxes.map((box) => box.x).sort((a, b) => a - b);
        const widths = boxes.map((box) => box.width);
        const spacings = xs.slice(1).map((x, idx) => x - xs[idx]);
        const padding = Math.max(0, median(spacings) - median(widths)) / 2;

        const tupletInfoByIndex = new Map();
        const tupletGroups = new Map();
        notes.forEach((note, idx) => {
          const tuplet = note?.tuplet;
          if (!tuplet) return;
          const id = tuplet.id ?? `${tuplet.type || 'tuplet'}:${tuplet.total || ''}`;
          if (!tupletGroups.has(id)) tupletGroups.set(id, []);
          tupletGroups.get(id).push(idx);
        });
        tupletGroups.forEach((indices) => {
          if (!indices.length) return;
          indices.sort((a, b) => a - b);
          const underline = indices.reduce((maxUnderline, idx) => {
            const note = notes[idx];
            return Math.max(maxUnderline, getUnderlineCountForNote(note));
          }, 0);
          const totalBeats = indices.reduce((sum, idx) => {
            const note = notes[idx];
            const beats = typeof note?.beats === 'number'
              ? note.beats
              : durationToQuarter(note?.duration);
            return sum + beats;
          }, 0);
          const start = indices[0];
          const end = indices[indices.length - 1];
          indices.forEach((idx) => {
            tupletInfoByIndex.set(idx, { indices, start, end, underline, totalBeats });
          });
        });

        const buildSegmentsForLevel = (level) => {
          const groups = [];
          let current = [];
          let cursor = 0;
          let nextBoundary = 1.5;

          const flush = () => {
            if (!current.length) return;
            groups.push(current.slice());
            current = [];
          };

          for (let noteIdx = 0; noteIdx < notes.length; noteIdx += 1) {
            const forcedTuplet = tupletInfoByIndex.get(noteIdx);
            if (forcedTuplet) {
              if (forcedTuplet.start === noteIdx) {
                const includeTuplet = forcedTuplet.underline >= level;
                if (includeTuplet) flush();
                if (includeTuplet) current.push(...forcedTuplet.indices);
                cursor += forcedTuplet.totalBeats;
                if (cursor > nextBoundary - EPS) {
                  flush();
                  while (cursor > nextBoundary - EPS) {
                    nextBoundary += 1.5;
                  }
                }
                noteIdx = forcedTuplet.end;
              }
              continue;
            }

            const note = notes[noteIdx];
            const beats = typeof note?.beats === 'number'
              ? note.beats
              : durationToQuarter(note?.duration);
            const underline = getUnderlineCountForNote(note);
            const next = cursor + beats;
            const crosses = cursor < nextBoundary - EPS && next > nextBoundary + EPS;
            if (crosses || underline < level) {
              flush();
            }

            if (underline >= level) {
              current.push(noteIdx);
            }

            cursor = next;
            if (cursor > nextBoundary - EPS) {
              flush();
              while (cursor > nextBoundary - EPS) {
                nextBoundary += 1.5;
              }
            }
          }

          flush();

          return groups.map((indices) => {
            const firstIdx = indices[0];
            const lastIdx = indices[indices.length - 1];
            const firstBox = boxes[firstIdx];
            const lastBox = boxes[lastIdx];
            return {
              indices,
              x1: firstBox.x - padding,
              x2: lastBox.x + lastBox.width + padding,
              firstBox,
              lastBox
            };
          });
        };

        const maxUnderline = notes.reduce((maxVal, note) => {
          return Math.max(maxVal, getUnderlineCountForNote(note));
        }, 0);

        const spacingMedian = median(spacings);
        const minGap = Math.max(6, Math.round(spacingMedian * 0.25));

        for (let level = 1; level <= maxUnderline; level += 1) {
          const segments = buildSegmentsForLevel(level);
          for (let i = 0; i < segments.length - 1; i += 1) {
            const left = segments[i];
            const right = segments[i + 1];
            const leftEdge = left.lastBox.x + left.lastBox.width;
            const rightEdge = right.firstBox.x;
            const boundaryCenter = (leftEdge + rightEdge) / 2;
            const boundaryWidth = rightEdge - leftEdge;
            const gapHalf = boundaryWidth > 0 ? Math.min(minGap / 2, boundaryWidth / 2) : 0;
            const leftMax = boundaryCenter - gapHalf;
            const rightMin = boundaryCenter + gapHalf;
            left.x2 = Math.min(left.x2, leftMax);
            right.x1 = Math.max(right.x1, rightMin);
            if (left.x2 < left.x1) left.x2 = left.x1;
            if (right.x1 > right.x2) right.x1 = right.x2;
          }

          segments.forEach((segment) => {
            const y = baseY + lineSpacing * (level - 1);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', segment.x1);
            line.setAttribute('y1', y);
            line.setAttribute('x2', segment.x2);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', lineStyle.stroke);
            line.setAttribute('stroke-width', lineStyle.strokeWidth);
            beamGroup.appendChild(line);
          });
        }
      });
    } finally {
      underlineFixing = false;
    }
  };

  const scheduleUnderlineFix = () => {
    if (underlineFixScheduled) return;
    underlineFixScheduled = true;
    setTimeout(() => {
      underlineFixScheduled = false;
      fix68Underlines();
    }, 0);
  };

  const ensureUnderlineObserver = () => {
    const svg = document.getElementById('sn-container');
    if (!svg) return;
    const beamGroup = svg.querySelector('g[sn-tag="beam"]');
    if (!beamGroup) return;
    if (underlineObservedBeam !== beamGroup) {
      if (underlineObserver) underlineObserver.disconnect();
      underlineObserver = new MutationObserver(() => {
        if (!underlineFixing) scheduleUnderlineFix();
      });
      underlineObserver.observe(beamGroup, { childList: true });
      underlineObservedBeam = beamGroup;
    }
    scheduleUnderlineFix();
  };

  const patchRenderHooks = () => {
    const wrap = (name, isAsync) => {
      const fn = window[name];
      if (typeof fn !== 'function' || fn.__ic68Wrapped) return;
      const wrapped = isAsync
        ? async (...args) => {
            const result = await fn(...args);
            scheduleUnderlineFix();
            return result;
          }
        : (...args) => {
            const result = fn(...args);
            scheduleUnderlineFix();
            return result;
          };
      wrapped.__ic68Wrapped = true;
      window[name] = wrapped;
    };

    wrap('renderScore', true);
    wrap('renderMelodyWithOSMD', true);
    wrap('rerenderLatestScore', false);
  };

  const patchBeamGroupingFor68 = () => {
    const beamLayer = window.SN?.SNBeamLayer || window.SN?.BeamLayer;
    if (!beamLayer) return false;
    const EPS = 1e-6;
    const dottedQuarter = 1.5;

    const isRestNote = (note) => {
      const sym = String(note?.note || '');
      return sym === '0' || sym === '-' || String(note?.noteData || '').startsWith('0');
    };

    const groupNotesBy68 = (notes) => {
      const groups = [];
      let current = [];
      let currentUnderline = null;
      let cursor = 0;
      let nextBoundary = dottedQuarter;

      const flush = () => {
        if (current.length) groups.push(current);
        current = [];
        currentUnderline = null;
      };

      (notes || []).forEach((note) => {
        const len = typeof note?.nodeTime === 'number' ? note.nodeTime : 0;
        const underline = note?.underlineCount || 0;
        const nextCursor = cursor + len;
        const crossesBoundary = nextBoundary !== null
          && cursor < nextBoundary - EPS
          && nextCursor > nextBoundary + EPS;

        if (nextBoundary !== null && Math.abs(cursor - nextBoundary) < EPS) {
          flush();
          nextBoundary += dottedQuarter;
        }

        if (underline === 0) {
          flush();
          cursor = nextCursor;
          if (nextBoundary !== null && cursor > nextBoundary - EPS) {
            while (nextBoundary !== null && cursor > nextBoundary - EPS) {
              nextBoundary += dottedQuarter;
            }
          }
          return;
        }

        if (isRestNote(note)) {
          flush();
          groups.push([note]);
          cursor = nextCursor;
          if (nextBoundary !== null && cursor > nextBoundary - EPS) {
            while (nextBoundary !== null && cursor > nextBoundary - EPS) {
              nextBoundary += dottedQuarter;
            }
          }
          return;
        }

        if (crossesBoundary || (currentUnderline !== null && underline !== currentUnderline)) {
          flush();
        }

        current.push(note);
        currentUnderline = underline;
        cursor = nextCursor;

        if (nextBoundary !== null && cursor > nextBoundary - EPS) {
          flush();
          nextBoundary += dottedQuarter;
        }
      });

      flush();
      return groups;
    };

    const draw68 = (measures) => {
      if (beamLayer.el) beamLayer.el.innerHTML = '';
      (measures || []).forEach((measure) => {
        const noteGroups = groupNotesBy68(measure.notes || []);
        noteGroups.forEach((group) => {
          const underlineCount = group[0]?.underlineCount || 0;
          if (underlineCount > 0) {
            const noteStates = group.map((note) => ({
              note,
              start: note?.startNote,
              end: note?.endNote
            }));
            group.forEach((note, idx) => {
              if (!note) return;
              note.startNote = idx === 0;
              note.endNote = idx === group.length - 1;
            });
            beamLayer.drawUnderlineGroup(group, underlineCount);
            noteStates.forEach(({ note, start, end }) => {
              if (!note) return;
              note.startNote = start;
              note.endNote = end;
            });
          }
        });
      });
    };

    const wrapDraw = (key) => {
      const current = beamLayer[key];
      if (typeof current !== 'function' || current.__ic68Wrapped) return false;
      const original = current.bind(beamLayer);
      const wrapped = (measures) => {
        if (!isSixEight()) return original(measures);
        return draw68(measures);
      };
      wrapped.__ic68Wrapped = true;
      beamLayer[key] = wrapped;
      return true;
    };

    const wrappedSimple = wrapDraw('drawSimpleUnderlines');
    const wrappedDraw = wrapDraw('draw');
    if (wrappedSimple || wrappedDraw) beamLayer.__ic68Patched = true;
    return wrappedSimple || wrappedDraw;
  };

  setInterval(() => {
    patchBeamGroupingFor68();
    ensureUnderlineObserver();
    patchRenderHooks();
    scheduleUnderlineFix();
  }, 500);
})();
