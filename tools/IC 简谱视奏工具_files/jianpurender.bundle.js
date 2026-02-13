var JianpuRender = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // vendor/JianpuRender/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_KEY_SIGNATURE: () => DEFAULT_KEY_SIGNATURE,
    DEFAULT_TEMPO: () => DEFAULT_TEMPO,
    DEFAULT_TIME_SIGNATURE: () => DEFAULT_TIME_SIGNATURE,
    JianpuBlock: () => JianpuBlock,
    JianpuModel: () => JianpuModel,
    JianpuSVGRender: () => JianpuSVGRender,
    ScrollType: () => ScrollType,
    getMeasureLength: () => getMeasureLength,
    mapMidiToJianpu: () => mapMidiToJianpu,
    splitJianpuNote: () => splitJianpuNote
  });

  // vendor/JianpuRender/src/render_constants.ts
  var LINE_STROKE_WIDTH = 1;
  // 使用官方默认间距，保持与示例一致
  var COMPACT_SPACING_FACTOR = 1.5;
  var UNDERLINE_SPACING_FACTOR = 0.2;
  var OCTAVE_DOT_OFFSET_FACTOR = 1;
  var DOT_SIZE_FACTOR = 0.1;
  var AUGMENTATION_DASH_FACTOR = 0.8;
  var FONT_SIZE_MULTIPLIER = 1.2;
  var SMALL_FONT_SIZE_MULTIPLIER = 0.75;
  // 使用官方默认连线比例，保持与示例一致
  var DURATION_LINE_SCALES = /* @__PURE__ */ new Map([
    [1, 1.78],
    [2, 1.6],
    [3, 1.3],
    [4, 1.15]
  ]);

  // vendor/JianpuRender/src/svg_tools.ts
  var SVGNS = "http://www.w3.org/2000/svg";
  function drawSVGPath(e, path, x, y, scaleX, scaleY, opacity = 1) {
    const child = document.createElementNS(SVGNS, "path");
    child.setAttributeNS(null, "d", path);
    child.setAttributeNS(
      null,
      "transform",
      `translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`
    );
    if (opacity < 1) {
      child.setAttributeNS(null, "opacity", `${opacity}`);
    }
    e.appendChild(child);
    return child;
  }
  function drawSVGText(e, text, x, y, fontSize, fontWeight = "normal", textAnchor = "middle", dominantBaseline = "middle", fill = "currentColor", opacity = 1) {
    const child = document.createElementNS(SVGNS, "text");
    child.setAttributeNS(null, "font-family", "sans-serif");
    child.setAttributeNS(null, "font-size", fontSize);
    child.setAttributeNS(null, "font-weight", fontWeight);
    child.setAttributeNS(null, "x", `${x}`);
    child.setAttributeNS(null, "y", `${y}`);
    child.setAttributeNS(null, "text-anchor", textAnchor);
    child.setAttributeNS(null, "dominant-baseline", dominantBaseline);
    if (fill !== "currentColor") {
      child.setAttributeNS(null, "fill", fill);
    }
    if (opacity < 1) {
      child.setAttributeNS(null, "opacity", `${opacity}`);
    }
    const textNode = document.createTextNode(text);
    child.appendChild(textNode);
    e.appendChild(child);
    return child;
  }
  function createSVGGroupChild(parent, id) {
    const child = document.createElementNS(SVGNS, "g");
    if (id) {
      child.setAttribute("data-id", id);
    }
    parent.appendChild(child);
    return child;
  }
  function setBlinkAnimation(e, enable = true, duration = "1s") {
    let animation = e.querySelector(
      'animate[attributeName="opacity"]'
    );
    if (enable) {
      if (!animation) {
        animation = document.createElementNS(SVGNS, "animate");
        animation.setAttributeNS(null, "attributeName", "opacity");
        animation.setAttributeNS(null, "values", "1;0.2;1");
        animation.setAttributeNS(null, "keyTimes", "0;0.5;1");
        animation.setAttributeNS(null, "dur", duration);
        animation.setAttributeNS(null, "repeatCount", "indefinite");
        e.appendChild(animation);
      } else {
        animation.setAttributeNS(null, "repeatCount", "indefinite");
        animation.beginElement();
      }
    } else {
      if (animation) {
        animation.endElement();
        animation.setAttributeNS(null, "repeatCount", "0");
        e.style.opacity = "1";
      }
      e.style.opacity = "1";
    }
    return e;
  }
  function setStroke(e, color, strokeWidth) {
    e.setAttributeNS(null, "stroke", color);
    e.setAttributeNS(null, "stroke-width", `${strokeWidth}`);
  }
  function highlightElement(e, color) {
    const toHighlight = [];
    if (e.matches("text, path")) {
      toHighlight.push(e);
    }
    e.querySelectorAll("text, path").forEach((el) => {
      toHighlight.push(el);
    });
    toHighlight.forEach((child) => {
      if (child.getAttribute("fill") !== "none") {
        child.setAttribute("fill", color);
      }
    });
    return e;
  }
  function resetElementHighlight(e, defaultColor) {
    const children = e.querySelectorAll("text, path");
    children.forEach((child) => {
      if (child.getAttribute("fill") !== "none") {
        child.setAttribute("fill", defaultColor);
      }
    });
  }

  // vendor/JianpuRender/src/svg_paths.ts
  var PATH_SCALE = 100;
  var ACCIDENTAL_TEXT = ["", "#", "b"];
  var barPath = "m 0,-50 v 100";
  var underlinePath = "m 0,0 h 100";
  var augmentationDashPath = "m 0,0 h 50";
  var tiePath = `M -13,5 C 15,-15 65,-15 90,5 C 65,-25 15,-25 -13,5 Z`;
  var dotPath = "M 0 0 a 15 15 0 1 0 0.0001 0 z";

  // vendor/JianpuRender/src/jianpu_info.ts
  var DEFAULT_TEMPO = {
    start: 0,
    qpm: 60
  };
  var DEFAULT_KEY_SIGNATURE = {
    start: 0,
    key: 0
    // 0 represents C Major
  };
  var DEFAULT_TIME_SIGNATURE = {
    start: 0,
    numerator: 4,
    denominator: 4
  };
  function getMeasureLength(timeSignature) {
    return timeSignature.numerator * (4 / timeSignature.denominator);
  }

  // vendor/JianpuRender/src/model_constants.ts
  var MIN_RESOLUTION = 0.0625;
  var MAX_QUARTER_DIVISION = 16 * 3 * 5;
  var PITCH_CLASS_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
  ];
  var MAJOR_SCALE_INTERVALS = {
    0: 1,
    // Tonic
    2: 2,
    // Major Second
    4: 3,
    // Major Third
    5: 4,
    // Perfect Fourth
    7: 5,
    // Perfect Fifth
    9: 6,
    // Major Sixth
    11: 7
    // Major Seventh
  };
  var MIDDLE_C_MIDI = 60;

  // vendor/JianpuRender/src/measure_info.ts
  var MeasuresInfo = class {
    /** Internal storage of structural chunks. */
    measuresInfo;
    /** Flag to define dotted rests configuration (may change in a future). */
    allowDottedRests = true;
    // Default to allowing dotted rests in Jianpu
    /**
     * Fills the reference info (measure, tempo, time signature and key signature)
     * in a per-chunk array as a fast method to further fill details in blocks.
     * @param jianpuInfo The score information to get references from.
     * @param lastQ The end time (in quarter notes) of the score.
     */
    constructor(jianpuInfo, lastQ) {
      this.measuresInfo = [];
      let tempoIndex = 0;
      let keyIndex = 0;
      let timeIndex = 0;
      let currentTempo = jianpuInfo.tempos[0];
      let currentKeySignature = jianpuInfo.keySignatures[0];
      let currentTimeSignature = jianpuInfo.timeSignatures[0];
      let measureNumberAtCurrentTimeSignature = 1;
      let currentMeasureLength = getMeasureLength(currentTimeSignature);
      let timeOfLastTimeSigChange = currentTimeSignature.start;
      const resolutionStep = MIN_RESOLUTION;
      for (let quarters = 0; quarters < lastQ; quarters += resolutionStep) {
        const timeSinceLastSigChange = quarters - timeOfLastTimeSigChange;
        const measuresPassedSinceSigChange = timeSinceLastSigChange / currentMeasureLength;
        const currentMeasureNumber = measureNumberAtCurrentTimeSignature + measuresPassedSinceSigChange;
        const measureInfo = {
          start: quarters,
          measureNumber: currentMeasureNumber,
          measureLength: currentMeasureLength,
          tempo: currentTempo,
          keySignature: currentKeySignature,
          timeSignature: currentTimeSignature
        };
        if (tempoIndex < jianpuInfo.tempos.length && Math.abs(jianpuInfo.tempos[tempoIndex].start - quarters) < resolutionStep / 2) {
          currentTempo = jianpuInfo.tempos[tempoIndex++];
          measureInfo.tempo = currentTempo;
          measureInfo.tempoChange = true;
        }
        if (keyIndex < jianpuInfo.keySignatures.length && Math.abs(jianpuInfo.keySignatures[keyIndex].start - quarters) < resolutionStep / 2) {
          currentKeySignature = jianpuInfo.keySignatures[keyIndex++];
          measureInfo.keySignature = currentKeySignature;
          measureInfo.keyChange = true;
        }
        if (timeIndex < jianpuInfo.timeSignatures.length && Math.abs(jianpuInfo.timeSignatures[timeIndex].start - quarters) < resolutionStep / 2) {
          const timeAtChange = jianpuInfo.timeSignatures[timeIndex].start;
          const timeSincePrevSigChange = timeAtChange - timeOfLastTimeSigChange;
          measureNumberAtCurrentTimeSignature += timeSincePrevSigChange / currentMeasureLength;
          measureNumberAtCurrentTimeSignature = Math.round(measureNumberAtCurrentTimeSignature * 1e3) / 1e3;
          currentTimeSignature = jianpuInfo.timeSignatures[timeIndex++];
          measureInfo.timeSignature = currentTimeSignature;
          currentMeasureLength = getMeasureLength(currentTimeSignature);
          measureInfo.measureLength = currentMeasureLength;
          measureInfo.measureNumber = measureNumberAtCurrentTimeSignature;
          measureInfo.timeChange = true;
          timeOfLastTimeSigChange = measureInfo.start;
        }
        this.measuresInfo.push(measureInfo);
      }
    }
    /** Finds the index in the measuresInfo array for a given time */
    findIndex(start) {
      const estimatedIndex = Math.max(0, Math.min(this.measuresInfo.length - 1, Math.floor(start / MIN_RESOLUTION)));
      return estimatedIndex;
    }
    /**
     * Gets the measure number of a note starting at a given position.
     * It returns a float where the integer part is the measure number (starting from 1)
     * and the fractional part indicates the position within the measure.
     * (e.g., 3.5 means halfway through the 3rd measure).
     * @param start Time in quarter notes.
     */
    measureNumberAtQ(start) {
      if (this.measuresInfo.length === 0) return 1;
      const index = this.findIndex(start);
      const reference = this.measuresInfo[index];
      const quartersAdvance = start - reference.start;
      const measureAdvanceSinceReference = quartersAdvance / reference.measureLength;
      return reference.measureNumber + measureAdvanceSinceReference + 1e-9;
    }
    /**
     * Gets the measure length (in quarter notes) at a given time position.
     * @param start Time in quarter notes.
     * @returns The length of the measure at the given time.
     */
    measureLengthAtQ(start) {
      if (this.measuresInfo.length === 0) return getMeasureLength(DEFAULT_TIME_SIGNATURE);
      const index = this.findIndex(start);
      return this.measuresInfo[index].measureLength;
    }
    /**
     * Gets the tempo (in QPM) at a given time position.
     * @param start Time in quarter notes.
     * @param onlyChanges If true, returns -1 if there's no tempo change *exactly* at 'start'.
     * @returns The QPM, or -1 if onlyChanges is true and there's no change.
     */
    tempoAtQ(start, onlyChanges = false) {
      if (this.measuresInfo.length === 0) return DEFAULT_TEMPO.qpm;
      const index = this.findIndex(start);
      const measureInfo = this.measuresInfo[index];
      const isExactStart = Math.abs(measureInfo.start - start) < MIN_RESOLUTION / 2;
      return !onlyChanges || measureInfo.tempoChange && isExactStart ? measureInfo.tempo.qpm : -1;
    }
    /**
     * Gets the key signature (0-11) at a given time position.
     * @param start Time in quarter notes.
     * @param onlyChanges If true, returns -1 if there's no key change *exactly* at 'start'.
     * @returns The key (0-11), or -1 if onlyChanges is true and there's no change.
     */
    keySignatureAtQ(start, onlyChanges = false) {
      if (this.measuresInfo.length === 0) return DEFAULT_KEY_SIGNATURE.key;
      const index = this.findIndex(start);
      const measureInfo = this.measuresInfo[index];
      const isExactStart = Math.abs(measureInfo.start - start) < MIN_RESOLUTION / 2;
      return !onlyChanges || measureInfo.keyChange && isExactStart ? measureInfo.keySignature.key : -1;
    }
    /**
     * Gets the time signature at a given time position.
     * @param start Time in quarter notes.
     * @param onlyChanges If true, returns null if there's no time signature change *exactly* at 'start'.
     * @returns The TimeSignatureInfo, or null if onlyChanges is true and there's no change.
     */
    timeSignatureAtQ(start, onlyChanges = false) {
      if (this.measuresInfo.length === 0) return DEFAULT_TIME_SIGNATURE;
      const index = this.findIndex(start);
      const measureInfo = this.measuresInfo[index];
      const isExactStart = Math.abs(measureInfo.start - start) < MIN_RESOLUTION / 2;
      return !onlyChanges || measureInfo.timeChange && isExactStart ? measureInfo.timeSignature : null;
    }
    /**
     * Convert a given amount of quarters to seconds based on the tempo at the start time.
     * **NOTE**: This simple version doesn't account for tempo changes *during* the duration.
     * A more accurate version would integrate tempo over the interval.
     * @param quarters The duration in quarter notes.
     * @param startTime The time (in quarter notes) at which the duration begins, to determine tempo.
     * @returns The equivalent duration in seconds.
     */
    quartersToTime(quarters, startTime) {
      const qpm = this.tempoAtQ(startTime);
      if (qpm <= 0) return 0;
      return quarters / qpm * 60;
    }
    /**
     * Convert a given amount of seconds to quarters based on the tempo at the start time.
     * **NOTE**: This simple version assumes constant tempo.
     * It will be rounded to the maximum internal precision to avoid floating point issues.
     * @param time The duration in seconds.
     * @param startTime The time (in quarter notes) where the conversion is relevant for tempo.
     * @returns The equivalent duration in quarters.
     */
    timeToQuarters(time, startTime) {
      const qpm = this.tempoAtQ(startTime);
      if (qpm <= 0) return 0;
      const q = time * qpm / 60;
      return Math.round(q * MAX_QUARTER_DIVISION) / MAX_QUARTER_DIVISION;
    }
    /**
     * Checks if a given time falls exactly on a beat boundary according to the time signature.
     * @param time Time in quarter notes.
     * @returns True if the time is on a beat, false otherwise.
     */
    isBeatStart(time) {
      if (this.measuresInfo.length === 0) return false;
      const index = this.findIndex(time);
      const measureInfo = this.measuresInfo[index];
      const timeSignature = measureInfo.timeSignature;
      const measureStart = measureInfo.start - (measureInfo.measureNumber - Math.floor(measureInfo.measureNumber)) * measureInfo.measureLength;
      const timeInMeasure = time - measureStart;
      const beatLength = 4 / timeSignature.denominator;
      const beatNumber = timeInMeasure / beatLength;
      return Math.abs(beatNumber - Math.round(beatNumber)) < MIN_RESOLUTION / 2;
    }
  };

  // vendor/JianpuRender/src/jianpu_block.ts
  function isSafeZero(n) {
    return Math.abs(n) < 1e-6;
  }
  function splitJianpuNote(jianpuNote, quarters) {
    const originalEnd = jianpuNote.start + jianpuNote.length;
    if (quarters <= jianpuNote.start || quarters >= originalEnd || isSafeZero(originalEnd - quarters)) {
      return null;
    }
    const remainLength = originalEnd - quarters;
    jianpuNote.length = quarters - jianpuNote.start;
    const splitted = {
      start: quarters,
      length: remainLength,
      pitch: jianpuNote.pitch,
      intensity: jianpuNote.intensity,
      jianpuNumber: jianpuNote.jianpuNumber,
      octaveDot: jianpuNote.octaveDot,
      accidental: 0,
      // Accidental only applies to the first part
      tiedFrom: jianpuNote
      // The new note is tied *from* the modified original
      // Rendering properties will be recalculated later
    };
    if (jianpuNote.tiedTo) {
      splitted.tiedTo = jianpuNote.tiedTo;
      jianpuNote.tiedTo.tiedFrom = splitted;
    }
    jianpuNote.tiedTo = splitted;
    return splitted;
  }
  var JianpuBlock = class _JianpuBlock {
    /** Starting time, in quarter note quantities (float) */
    start;
    /** Duration of the block, in quarter note quantities (float) */
    length;
    /** The list of notes in the block (empty for a rest) */
    notes;
    /** Measure number (float) where the block starts (e.g., 3.5 is halfway through measure 3) */
    measureNumber;
    // --- Rendering Properties (calculated later) ---
    /** Number of underlines for duration (e.g., 1 for 8th, 2 for 16th) */
    durationLines;
    /** Number of augmentation dots */
    augmentationDots;
    /** True if an augmentation dash is needed (for notes longer than quarter) */
    augmentationDash;
    // Simple flag for now
    // --- Rhythmic Properties (calculated during processing) ---
    /** Whether the block begins on a beat */
    beatBegin;
    /** Whether the block ends exactly on a beat */
    beatEnd;
    /** Whether this block is part of a tie from the previous block */
    isTieStart;
    /** Whether this block continues a tie to the next block */
    isTieEnd;
    /**
     * Creates a `JianpuBlock`.
     * @param start Starting time (quarters).
     * @param length Duration (quarters).
     * @param notes Array of notes (empty for rest).
     * @param measureNumber Measure number where the block starts.
     */
    constructor(start = 0, length = 0, notes = [], measureNumber = 1) {
      this.start = start;
      this.length = length;
      this.notes = notes;
      this.measureNumber = measureNumber;
    }
    /**
     * Adds a note to the block. Assumes the note starts *exactly* at the block's start time.
     * Handles potential duplicates (e.g., from overlapping MIDI). The shortest duration prevails.
     * Updates block length if necessary.
     * @param jianpuNote The note to add.
     * @returns `true` if the note was added/updated, `false` if ignored (e.g., identical or longer duplicate).
     */
    addNote(jianpuNote) {
      if (this.notes.length === 0) {
        this.start = jianpuNote.start;
        this.length = jianpuNote.length;
        this.notes.push(jianpuNote);
        return true;
      }
      if (!isSafeZero(this.start - jianpuNote.start)) {
        console.warn(`JianpuBlock: Attempted to add note at ${jianpuNote.start} to block starting at ${this.start}. Ignoring.`);
        return false;
      }
      let replacedDuplicate = false;
      let isDuplicate = false;
      for (let i = 0; i < this.notes.length; i++) {
        if (this.notes[i].pitch === jianpuNote.pitch) {
          isDuplicate = true;
          if (jianpuNote.length < this.notes[i].length) {
            if (this.notes[i].tiedFrom) {
              jianpuNote.tiedFrom = this.notes[i].tiedFrom;
              if (jianpuNote.tiedFrom) {
                jianpuNote.tiedFrom.tiedTo = jianpuNote;
              }
            }
            if (this.notes[i].tiedTo) {
              jianpuNote.tiedTo = this.notes[i].tiedTo;
              if (jianpuNote.tiedTo) {
                jianpuNote.tiedTo.tiedFrom = jianpuNote;
              }
            }
            this.notes[i] = jianpuNote;
            replacedDuplicate = true;
          }
          break;
        }
      }
      if (!isDuplicate) {
        this.notes.push(jianpuNote);
      }
      let minLength = Infinity;
      for (const note of this.notes) {
        minLength = Math.min(minLength, note.length);
      }
      this.length = minLength;
      return !isDuplicate || replacedDuplicate;
    }
    /**
     * Splits this block into two at a given time point.
     * Modifies the current block to end at the split point and returns the new block
     * representing the remainder. Handles splitting notes and ties.
     * @param quarters Split point time in quarter notes.
     * @param measuresInfo Provides measure context for the new block.
     * @returns The new `JianpuBlock` representing the second part, or `null` if split is not possible.
     */
    split(quarters, measuresInfo) {
      const originalEnd = this.start + this.length;
      if (quarters <= this.start || quarters >= originalEnd || isSafeZero(originalEnd - quarters)) {
        return null;
      }
      const remainLength = originalEnd - quarters;
      const newBlockLength = quarters - this.start;
      const splittedBlock = new _JianpuBlock(
        quarters,
        remainLength,
        [],
        // Notes will be added below
        measuresInfo.measureNumberAtQ(quarters)
        // Calculate measure number for the new block
      );
      const notesForNewBlock = [];
      for (const note of this.notes) {
        const noteEnd = note.start + note.length;
        if (noteEnd > quarters + 1e-6) {
          const remainingNotePart = splitJianpuNote(note, quarters);
          if (remainingNotePart) {
            notesForNewBlock.push(remainingNotePart);
          } else {
            console.warn("Split failed for note, unexpected state.");
          }
        } else if (isSafeZero(noteEnd - quarters)) {
        }
      }
      notesForNewBlock.forEach((note) => splittedBlock.addNote(note));
      this.length = newBlockLength;
      delete this.durationLines;
      delete this.augmentationDots;
      delete this.augmentationDash;
      if (this.beatEnd) {
        splittedBlock.beatEnd = true;
        delete this.beatEnd;
      }
      if (this.isTieEnd) {
        splittedBlock.isTieStart = true;
        delete this.isTieEnd;
      }
      return splittedBlock;
    }
    /**
     * Splits the block, if necessary, so the first part ends at the next beat boundary.
     * Marks `beatBegin` and `beatEnd` properties.
     * @param measuresInfo Provides measure and beat context.
     * @returns The second part of the split block (if split occurred), otherwise `null`.
     */
    splitToBeat(measuresInfo) {
      const timeSignature = measuresInfo.timeSignatureAtQ(this.start);
      if (!timeSignature) return null;
      const measureLength = measuresInfo.measureLengthAtQ(this.start);
      const measureNum = measuresInfo.measureNumberAtQ(this.start);
      const measureStart = this.start - (measureNum - Math.floor(measureNum)) * measureLength;
      const timeInMeasure = this.start - measureStart;
      const beatLength = 4 / timeSignature.denominator;
      const startBeatFraction = timeInMeasure / beatLength;
      this.beatBegin = isSafeZero(startBeatFraction - Math.round(startBeatFraction));
      const isDottedLength = [1.5, 0.75, 3, 6, 0.375].some((d) => isSafeZero(this.length - d));
      const blockEndTime = this.start + this.length;
      const measureEndTime = measureStart + measureLength;
      // 保持标准附点时值的整体性：不在拍点处拆分（但仍允许小节线切分）
      if (isDottedLength && blockEndTime <= measureEndTime + 1e-6) {
        const endBeatFraction = (timeInMeasure + this.length) / beatLength;
        this.beatEnd = isSafeZero(endBeatFraction - Math.round(endBeatFraction)) || isSafeZero(blockEndTime - measureEndTime);
        this.isTieStart = this.notes.some((n) => n.tiedFrom);
        this.isTieEnd = this.notes.some((n) => n.tiedTo);
        return null;
      }
      const currentBeatNumber = Math.floor(startBeatFraction + 1e-6);
      const nextBeatTimeInMeasure = (currentBeatNumber + 1) * beatLength;
      const nextBeatTimeAbsolute = measureStart + nextBeatTimeInMeasure;
      let splitTime = null;
      if (nextBeatTimeAbsolute < blockEndTime - 1e-6 && nextBeatTimeAbsolute > this.start + 1e-6) {
        splitTime = nextBeatTimeAbsolute;
      }
      if (measureEndTime < blockEndTime - 1e-6 && measureEndTime > this.start + 1e-6) {
        if (splitTime === null || measureEndTime < splitTime) {
          splitTime = measureEndTime;
        }
      }
      let splittedBlock = null;
      if (splitTime !== null) {
        splittedBlock = this.split(splitTime, measuresInfo);
        if (splittedBlock) {
          this.beatEnd = true;
        }
      } else {
        const endBeatFraction = (timeInMeasure + this.length) / beatLength;
        this.beatEnd = isSafeZero(endBeatFraction - Math.round(endBeatFraction));
        if (!this.beatEnd) {
          this.beatEnd = isSafeZero(blockEndTime - measureEndTime);
        }
      }
      this.isTieStart = this.notes.some((n) => n.tiedFrom);
      this.isTieEnd = this.notes.some((n) => n.tiedTo);
      if (splittedBlock) {
        splittedBlock.isTieStart = splittedBlock.notes.some((n) => n.tiedFrom);
        splittedBlock.isTieEnd = splittedBlock.notes.some((n) => n.tiedTo);
        if (this.notes.some((n) => n.tiedTo && n.start + n.length > splitTime)) {
          delete this.isTieEnd;
        }
      }
      return splittedBlock;
    }
    /**
     * Calculates and sets the rendering properties (duration lines, dots, dashes).
     * Call this AFTER all splitting.
     * @param measuresInfo Provides context (e.g., allowDottedRests).
     */
    calculateRenderProperties(measuresInfo) {
      delete this.durationLines;
      delete this.augmentationDots;
      delete this.augmentationDash;
      const blockLength = this.length;
      if (isSafeZero(blockLength) || blockLength < 0) return;
      const dottedQuarter = 1.5;
      const dottedEighth = 0.75;
      const dottedSixteenth = 0.375;
      const dottedHalf = 3;
      if (measuresInfo.allowDottedRests || this.notes.length > 0) {
        if (isSafeZero(blockLength - dottedQuarter)) {
          this.augmentationDots = 1;
          return;
        }
        if (isSafeZero(blockLength - dottedEighth)) {
          this.durationLines = 1;
          this.augmentationDots = 1;
          return;
        }
        if (isSafeZero(blockLength - dottedSixteenth)) {
          this.durationLines = 2;
          this.augmentationDots = 1;
          return;
        }
        if (isSafeZero(blockLength - dottedHalf)) {
          this.augmentationDots = 1;
        }
      }
      if (blockLength >= 4 - 1e-6) {
        this.durationLines = 0;
      } else if (blockLength >= 2 - 1e-6) {
        this.durationLines = 0;
      } else if (blockLength >= 1 - 1e-6) {
        this.durationLines = 0;
      } else if (blockLength >= 0.5 - 1e-6) {
        this.durationLines = 1;
      } else if (blockLength >= 0.25 - 1e-6) {
        this.durationLines = 2;
      } else if (blockLength >= 0.125 - 1e-6) {
        this.durationLines = 3;
      } else if (blockLength >= 0.0625 - 1e-6) {
        this.durationLines = 4;
      } else {
        this.durationLines = 4;
      }
      this.augmentationDash = false;
      if (this.notes.length === 1) {
        const currentNote = this.notes[0];
        const timeSignature = measuresInfo.timeSignatureAtQ(this.start);
        if (!timeSignature) return;
        const beatLength = Math.max(4 / timeSignature.denominator, 1);
        const isFirstBlock = this.measureNumber % 1 <= 1e-6;
        if (!isFirstBlock && currentNote.tiedFrom && isSafeZero(currentNote.tiedFrom.length - beatLength) && currentNote.tiedFrom.pitch === currentNote.pitch && currentNote.length >= 1) {
          let validNextNote = true;
          if (currentNote.tiedTo) {
            const nextNoteStart = currentNote.start + currentNote.length;
            const currentMeasure = Math.floor(measuresInfo.measureNumberAtQ(this.start));
            const nextNoteMeasure = Math.floor(measuresInfo.measureNumberAtQ(nextNoteStart));
            validNextNote = currentMeasure === nextNoteMeasure && currentNote.tiedTo.length >= 1;
          }
          if (validNextNote) {
            this.augmentationDash = true;
          }
        }
      }
    }
    /**
     * Splits a block to fit standard musical symbol lengths (lines/dots/dashes).
     * This is complex in Jianpu as duration isn't just head shape + flags.
     * It tries to find the largest standard representable duration (like dotted quarter,
     * half, eighth, etc.) that fits within the current block length.
     * @param measuresInfo Context for splitting rules.
     * @returns The remainder of the block after splitting off the first symbol, or null.
     */
    splitToStandardSymbol(measuresInfo) {
      const blockLength = this.length;
      if (isSafeZero(blockLength) || blockLength < MIN_RESOLUTION - 1e-6) {
        return null;
      }
      const standardLengths = [];
      if (measuresInfo.allowDottedRests || this.notes.length > 0) {
        standardLengths.push(6);
        standardLengths.push(4);
        standardLengths.push(3);
        standardLengths.push(2);
        standardLengths.push(1.5);
        standardLengths.push(1);
        standardLengths.push(0.75);
        standardLengths.push(0.5);
        standardLengths.push(0.375);
        standardLengths.push(0.25);
        standardLengths.push(0.125);
        standardLengths.push(0.0625);
      } else {
        standardLengths.push(4);
        standardLengths.push(2);
        standardLengths.push(1);
        standardLengths.push(0.5);
        standardLengths.push(0.25);
        standardLengths.push(0.125);
        standardLengths.push(0.0625);
      }
      let bestFitLength = 0;
      for (const standardLen of standardLengths) {
        if (blockLength >= standardLen - 1e-6) {
          bestFitLength = standardLen;
          break;
        }
      }
      if (isSafeZero(bestFitLength)) {
        bestFitLength = MIN_RESOLUTION;
        if (blockLength < bestFitLength - 1e-6 && blockLength > 1e-6) {
          console.warn(`Block length ${blockLength} is too small, rendering as ${bestFitLength}`);
        }
      }
      let splittedBlock = null;
      if (blockLength > bestFitLength + 1e-6) {
        splittedBlock = this.split(this.start + bestFitLength, measuresInfo);
        if (this.length !== bestFitLength) {
          console.warn(`Adjusting block length after split from ${this.length} to ${bestFitLength}`);
          this.length = bestFitLength;
        }
      } else {
        this.length = bestFitLength;
      }
      return splittedBlock;
    }
    /**
     * Merges this block into a map, either adding it or merging its notes
     * into an existing block at the same start time.
     * @param map The `JianpuBlockMap` to merge into.
     */
    mergeToMap(map) {
      const existingBlock = map.get(this.start);
      if (existingBlock) {
        this.notes.forEach((note) => existingBlock.addNote(note));
        if (this.measureNumber !== 0) existingBlock.measureNumber = this.measureNumber;
      } else {
        map.set(this.start, this);
      }
    }
    /**
     * Checks if the block starts exactly at the beginning of a measure.
     * @returns `true` if it starts at the beginning of a measure.
     */
    isMeasureBeginning() {
      return isSafeZero(this.measureNumber - Math.floor(this.measureNumber));
    }
  };

  // vendor/JianpuRender/src/jianpu_model.ts
  var JianpuModel = class {
    /** The input score info, stored for potential external updates. */
    jianpuInfo;
    /** Pre-calculated measure, tempo, key, and time signature info per time chunk. */
    measuresInfo;
    /** The result of analysis: JianpuBlocks indexed by start time (quarters). */
    jianpuBlockMap;
    /** Last processed quarter note time, indicating the score's duration. */
    lastQ;
    /**
     * Creates a `JianpuModel`.
     * @param jianpuInfo Generic information about the score.
     * @param defaultKey Optional default key signature (0-11, 0=C) if not specified at time 0.
     */
    constructor(jianpuInfo, defaultKey) {
      this.jianpuInfo = jianpuInfo;
      this.jianpuBlockMap = /* @__PURE__ */ new Map();
      this.lastQ = 0;
      this.update(jianpuInfo, defaultKey);
    }
    /**
     * 判断给定时间是否处于乐谱最后一个小节
     * @param q 要检查的四分音符时间位置
     * @returns 如果处于最后小节返回true
     */
    isLastMeasureAtQ(q) {
      return q >= this.lastQ - 1e-6;
    }
    /**
     * 获取乐谱总时长(用于外部访问lastQ)
     */
    getTotalDuration() {
      return this.lastQ;
    }
    /**
     * Processes new JianpuInfo to update the internal model.
     * Sorts input arrays and ensures defaults are present.
     * Recalculates `measuresInfo` and `jianpuBlockMap`.
     * @param jianpuInfo New score information.
     * @param defaultKey Optional default key.
     */
    update(jianpuInfo, defaultKey) {
      this.jianpuInfo = jianpuInfo;
      jianpuInfo.notes.sort((a, b) => a.start - b.start);
      this.lastQ = 0;
      jianpuInfo.notes.forEach((note) => {
        this.lastQ = Math.max(this.lastQ, note.start + note.length);
      });
      this.lastQ += 1e-6;
      jianpuInfo.tempos = jianpuInfo.tempos && jianpuInfo.tempos.length ? jianpuInfo.tempos : [DEFAULT_TEMPO];
      jianpuInfo.tempos.sort((a, b) => a.start - b.start);
      if (jianpuInfo.tempos[0].start > 1e-6) {
        jianpuInfo.tempos.unshift({ ...DEFAULT_TEMPO, start: 0 });
      }
      const startingKey = defaultKey !== void 0 ? { start: 0, key: defaultKey } : { ...DEFAULT_KEY_SIGNATURE };
      jianpuInfo.keySignatures = jianpuInfo.keySignatures && jianpuInfo.keySignatures.length ? jianpuInfo.keySignatures : [startingKey];
      jianpuInfo.keySignatures.sort((a, b) => a.start - b.start);
      if (jianpuInfo.keySignatures[0].start > 1e-6) {
        jianpuInfo.keySignatures.unshift({ ...startingKey, start: 0 });
      }
      jianpuInfo.timeSignatures = jianpuInfo.timeSignatures && jianpuInfo.timeSignatures.length ? jianpuInfo.timeSignatures : [DEFAULT_TIME_SIGNATURE];
      jianpuInfo.timeSignatures.sort((a, b) => a.start - b.start);
      if (jianpuInfo.timeSignatures[0].start > 1e-6) {
        jianpuInfo.timeSignatures.unshift({ ...DEFAULT_TIME_SIGNATURE, start: 0 });
      }
      this.measuresInfo = new MeasuresInfo(jianpuInfo, this.lastQ);
      this.infoToBlocks();
    }
    /**
    * Converts raw NoteInfo into structured JianpuBlocks.
    * Handles note grouping, rests, and basic splitting.
    */
    infoToBlocks() {
      const rawBlocks = /* @__PURE__ */ new Map();
      let lastNoteEndTime = 0;
      this.jianpuInfo.notes.forEach((note) => {
        const noteStart = note.start;
        const measureNumber = this.measuresInfo.measureNumberAtQ(noteStart);
        if (noteStart > lastNoteEndTime + 1e-6) {
          const restStart = lastNoteEndTime;
          const restLength = noteStart - restStart;
          const restMeasureNum = this.measuresInfo.measureNumberAtQ(restStart);
          const restBlock = new JianpuBlock(restStart, restLength, [], restMeasureNum);
          rawBlocks.set(restStart, restBlock);
        }
        const keySignatureKey = this.measuresInfo.keySignatureAtQ(noteStart);
        const jianpuNote = this.createJianpuNote(note, keySignatureKey);
        let block = rawBlocks.get(noteStart);
        if (!block) {
          block = new JianpuBlock(noteStart, 0, [], measureNumber);
          rawBlocks.set(noteStart, block);
        }
        block.addNote(jianpuNote);
        lastNoteEndTime = Math.max(lastNoteEndTime, noteStart + block.length);
      });
      if (this.lastQ > lastNoteEndTime + 1e-6) {
        const restStart = lastNoteEndTime;
        const restLength = this.lastQ - restStart;
        if (restLength > 1e-6) {
          const restMeasureNum = this.measuresInfo.measureNumberAtQ(restStart);
          const restBlock = new JianpuBlock(restStart, restLength, [], restMeasureNum);
          rawBlocks.set(restStart, restBlock);
        }
      }
      this.jianpuBlockMap = /* @__PURE__ */ new Map();
      const sortedStartsFromRaw = Array.from(rawBlocks.keys()).sort((a, b) => a - b);
      let blockProcessingQueue = [];
      sortedStartsFromRaw.forEach((start) => {
        blockProcessingQueue.push(rawBlocks.get(start));
      });
      const processedBlocksForSplitting = /* @__PURE__ */ new Set();
      while (blockProcessingQueue.length > 0) {
        let currentBlock = blockProcessingQueue.shift();
        if (processedBlocksForSplitting.has(currentBlock.start) && this.jianpuBlockMap.has(currentBlock.start)) {
        }
        let remainingBeatSplit = currentBlock.splitToBeat(this.measuresInfo);
        if (remainingBeatSplit) {
          currentBlock.mergeToMap(this.jianpuBlockMap);
          processedBlocksForSplitting.add(currentBlock.start);
          blockProcessingQueue.unshift(remainingBeatSplit);
          continue;
        }
        let blockToSymbolSplit = currentBlock;
        let remainingSymbolSplit = null;
        do {
          remainingSymbolSplit = blockToSymbolSplit.splitToStandardSymbol(this.measuresInfo);
          blockToSymbolSplit.mergeToMap(this.jianpuBlockMap);
          processedBlocksForSplitting.add(blockToSymbolSplit.start);
          if (remainingSymbolSplit) {
            blockToSymbolSplit = remainingSymbolSplit;
          }
        } while (remainingSymbolSplit);
      }
      this.jianpuBlockMap.forEach((block) => {
        block.calculateRenderProperties(this.measuresInfo);
      });
    }
    /**
     * Converts a raw NoteInfo into a JianpuNote, calculating the
     * Jianpu number, octave dots, and accidental based on key context.
     * @param note The raw NoteInfo.
     * @param key The current key signature (0-11).
     * @returns A processed JianpuNote.
     */
    createJianpuNote(note, key) {
      const details = mapMidiToJianpu(note.pitch, key);
      const jianpuNote = {
        ...note,
        jianpuNumber: details.jianpuNumber,
        octaveDot: details.octaveDot,
        accidental: details.accidental
        // Directly use accidental from key context
      };
      return jianpuNote;
    }
  };
  function mapMidiToJianpu(midiPitch, key) {
    const keyPitchClass = key % 12;
    let tonicMidiRef = MIDDLE_C_MIDI + keyPitchClass;
    if (keyPitchClass > MIDDLE_C_MIDI % 12) {
      tonicMidiRef -= 12;
    }
    const octaveOffsetForIntervalCalc = Math.round((midiPitch - tonicMidiRef) / 12);
    const tonicMidi = tonicMidiRef + octaveOffsetForIntervalCalc * 12;
    const interval = (midiPitch - tonicMidi + 12) % 12;
    let jianpuNumber = MAJOR_SCALE_INTERVALS[interval];
    let accidental = 0;
    if (jianpuNumber === void 0) {
      switch (interval) {
        case 1:
          jianpuNumber = MAJOR_SCALE_INTERVALS[0];
          accidental = 1;
          break;
        case 3:
          jianpuNumber = MAJOR_SCALE_INTERVALS[4];
          accidental = 2;
          break;
        case 6:
          jianpuNumber = MAJOR_SCALE_INTERVALS[5];
          accidental = 1;
          break;
        case 8:
          jianpuNumber = MAJOR_SCALE_INTERVALS[9];
          accidental = 2;
          break;
        case 10:
          jianpuNumber = MAJOR_SCALE_INTERVALS[11];
          accidental = 2;
          break;
        default: {
          console.warn(`Unexpected chromatic interval ${interval} in mapMidiToJianpu. Defaulting to sharp of lower valid degree.`);
          const lowerIntervalFallback = (interval - 1 + 12) % 12;
          const upperIntervalFallback = (interval + 1 + 12) % 12;
          const lowerDegreeFallback = MAJOR_SCALE_INTERVALS[lowerIntervalFallback];
          const upperDegreeFallback = MAJOR_SCALE_INTERVALS[upperIntervalFallback];
          if (lowerDegreeFallback !== void 0) {
            jianpuNumber = lowerDegreeFallback;
            accidental = 1;
          } else if (upperDegreeFallback !== void 0) {
            jianpuNumber = upperDegreeFallback;
            accidental = 2;
          } else {
            jianpuNumber = 1;
            accidental = 1;
            console.error(`Could not determine Jianpu number components for MIDI ${midiPitch}, interval ${interval} from tonic in key ${key}.`);
          }
          break;
        }
      }
      if (jianpuNumber === void 0) {
        console.error(`Jianpu number became undefined for MIDI ${midiPitch} (interval ${interval}, key ${key}) after chromatic processing. This indicates a logic error or misconfigured MAJOR_SCALE_INTERVALS.`);
        jianpuNumber = 1;
        accidental = 1;
      }
    }
    const octaveDot = Math.floor((midiPitch - tonicMidiRef) / 12);
    return {
      jianpuNumber,
      octaveDot,
      accidental
    };
  }

  // vendor/JianpuRender/src/jianpu_svg_render.ts
  var ScrollType = /* @__PURE__ */ ((ScrollType2) => {
    ScrollType2[ScrollType2["PAGE"] = 0] = "PAGE";
    ScrollType2[ScrollType2["NOTE"] = 1] = "NOTE";
    ScrollType2[ScrollType2["BAR"] = 2] = "BAR";
    return ScrollType2;
  })(ScrollType || {});
  var JianpuSVGRender = class {
    jianpuInfo;
    jianpuModel;
    config;
    // Use Required for internal consistency
    height;
    width;
    // SVG Elements
    parentElement;
    // The user-provided container div's direct child for scrolling
    div;
    // The user-provided container div
    mainSVG;
    // The main SVG drawing area
    mainG;
    // Top-level group in mainSVG for transforms
    musicG;
    // Group for notes, rests, ties, bar lines
    signaturesG;
    // Group for key/time signatures *within* the scrollable area
    overlaySVG;
    // Fixed overlay SVG for current signatures
    overlayG;
    // Group within overlaySVG
    // State
    signaturesBlinking;
    lastKnownScrollLeft;
    isScrolling;
    currentKey;
    currentTimeSignature;
    playingNotes;
    // Map key: `${start}-${pitch}`
    lastRenderedQ;
    // Track the last quarter note time rendered
    estimatedNoteWidth;
    // Estimated width of a basic number for spacing
    // Layout & Scaling
    numberFontSize;
    smallFontSize;
    yBaseline;
    // Vertical position for the number baseline
    /**
     * 解析多种格式的颜色字符串为有效的CSS颜色值
     * @param colorStr 颜色字符串，支持格式："blue"、"rgb(255,165,0)"、"255,165,0"
     * @returns 标准化的CSS颜色字符串
     */
    parseColorString(colorStr) {
      if (/^[a-z]+$/i.test(colorStr) || colorStr.startsWith("rgb(")) {
        return colorStr;
      }
      if (/^\d+,\s*\d+,\s*\d+$/.test(colorStr)) {
        return `rgb(${colorStr})`;
      }
      return colorStr;
    }
    /**
     * `JianpuSVGRender` constructor.
     * @param score The `JianpuInfo` to visualize.
     * @param config Visualization configuration options.
     * @param div The HTMLDivElement where the visualization should be displayed.
     */
    constructor(score, config, div) {
      this.jianpuInfo = score;
      this.div = div;
      const defaultNoteHeight = 20;
      const defaultPixelsPerTimeStep = 0;
      this.config = {
        noteHeight: config.noteHeight ?? defaultNoteHeight,
        noteSpacingFactor: config.noteSpacingFactor ?? COMPACT_SPACING_FACTOR,
        pixelsPerTimeStep: config.pixelsPerTimeStep ?? defaultPixelsPerTimeStep,
        noteColor: this.parseColorString(config.noteColor ?? "black"),
        activeNoteColor: this.parseColorString(config.activeNoteColor ?? "red"),
        defaultKey: config.defaultKey ?? 0,
        // Default to C Major
        scrollType: config.scrollType ?? 0 /* PAGE */,
        fontFamily: config.fontFamily ?? "sans-serif",
        width: config.width ?? 0,
        // Auto-width by default
        height: config.height ?? 0
        // Auto-height by default
      };
      this.jianpuModel = new JianpuModel(this.jianpuInfo, this.config.defaultKey);
      this.currentKey = this.jianpuModel.measuresInfo.keySignatureAtQ(0);
      this.currentTimeSignature = this.jianpuModel.measuresInfo.timeSignatureAtQ(0) ?? DEFAULT_TIME_SIGNATURE;
      this.playingNotes = /* @__PURE__ */ new Map();
      this.lastRenderedQ = -1;
      this.signaturesBlinking = false;
      this.lastKnownScrollLeft = 0;
      this.isScrolling = false;
      this.numberFontSize = this.config.noteHeight * FONT_SIZE_MULTIPLIER;
      this.smallFontSize = this.config.noteHeight * SMALL_FONT_SIZE_MULTIPLIER;
      this.estimatedNoteWidth = this.numberFontSize * 0.6;
      this.yBaseline = this.config.noteHeight * 1.5;
      this.height = 0;
      this.width = 0;
      this.clear();
      this.redraw();
    }
    /**
     * Clears the SVG elements and resets internal state for a fresh draw.
     */
    clear() {
      while (this.div.lastChild) {
        this.div.removeChild(this.div.lastChild);
      }
      this.div.style.position = "relative";
      this.div.style.overflow = "hidden";
      this.overlaySVG = document.createElementNS(SVGNS, "svg");
      this.overlaySVG.style.position = "absolute";
      this.overlaySVG.style.left = "0";
      this.overlaySVG.style.top = "0";
      this.overlaySVG.style.pointerEvents = "none";
      this.div.appendChild(this.overlaySVG);
      this.overlayG = createSVGGroupChild(this.overlaySVG, "overlay");
      this.parentElement = document.createElement("div");
      this.parentElement.style.overflowX = "auto";
      this.parentElement.style.overflowY = "hidden";
      this.parentElement.style.width = "100%";
      this.parentElement.style.height = "100%";
      this.div.appendChild(this.parentElement);
      this.parentElement.addEventListener("scroll", this.handleScrollEvent);
      this.mainSVG = document.createElementNS(SVGNS, "svg");
      this.mainSVG.style.display = "block";
      this.parentElement.appendChild(this.mainSVG);
      this.mainG = createSVGGroupChild(this.mainSVG, "main-content");
      this.signaturesG = createSVGGroupChild(this.mainG, "signatures");
      this.musicG = createSVGGroupChild(this.mainG, "music");
      this.playingNotes.clear();
      this.lastRenderedQ = -1;
      this.signaturesBlinking = false;
      this.lastKnownScrollLeft = 0;
      this.isScrolling = false;
      this.height = this.config.height > 0 ? this.config.height : this.config.noteHeight * 5;
      this.width = this.config.width > 0 ? this.config.width : 0;
      this.currentKey = this.jianpuModel.measuresInfo.keySignatureAtQ(0);
      this.currentTimeSignature = this.jianpuModel.measuresInfo.timeSignatureAtQ(0) ?? DEFAULT_TIME_SIGNATURE;
      this.drawSignatures(this.overlayG, 0, true, true);
      this.updateLayout();
    }
    /** Updates SVG and container dimensions */
    updateLayout(contentWidth) {
      this.width = contentWidth ?? this.width;
      if (this.config.width > 0) {
        this.width = this.config.width;
      }
      this.height = Math.max(this.height, this.config.noteHeight * 6);
      if (this.config.height > 0) {
        this.height = this.config.height;
      }
      const verticalPadding = this.config.noteHeight * 1.65;
      this.mainSVG.setAttribute("width", `${this.width}`);
      this.mainSVG.setAttribute("height", `${this.height}`);
      this.mainG.setAttribute("transform", `translate(0, ${this.yBaseline + verticalPadding})`);
      this.overlaySVG.setAttribute("width", "200");
      this.overlaySVG.setAttribute("height", `${this.height}`);
      this.overlayG.setAttribute("transform", `translate(0, ${this.yBaseline})`);
    }
    /**
     * Redraws the score or highlights notes.
     * If `activeNote` is provided, highlights that note and deactivates others.
     * If `activeNote` is null/undefined, redraws any part of the score
     * not yet rendered (incremental drawing).
     * @param activeNote The note to highlight (optional).
     * @param scrollIntoView If true, scroll the view to the active note (optional).
     * @returns The x-position of the highlighted note, or -1.
     */
    redraw(activeNote, scrollIntoView) {
      let activeNotePosition = -1;
      const isCompact = this.config.pixelsPerTimeStep <= 0;
      if (activeNote) {
        const noteId = `${activeNote.start}-${activeNote.pitch}`;
        this.playingNotes.forEach((_note, id) => {
          if (id !== noteId) {
            const g = this.mainSVG.querySelector(`g[data-id="${id}"]`);
            if (g) {
              resetElementHighlight(g, this.config.noteColor);
            }
            this.playingNotes.delete(id);
          }
        });
        if (!this.playingNotes.has(noteId)) {
          const g = this.mainSVG.querySelector(`g[data-id="${noteId}"]`);
          if (g) {
            highlightElement(g, this.config.activeNoteColor);
            this.playingNotes.set(noteId, activeNote);
            const noteRect = g.getBoundingClientRect();
            const svgRect = this.mainSVG.getBoundingClientRect();
            activeNotePosition = noteRect.left - svgRect.left + this.parentElement.scrollLeft;
            const isMeasureStart = g.hasAttribute("data-is-measure-start");
            if (scrollIntoView && (this.config.scrollType !== 2 /* BAR */ || isMeasureStart)) {
              this.scrollIntoViewIfNeeded(activeNotePosition);
            }
          }
        }
        if (!isCompact && this.signaturesBlinking) {
          const overlayRect = this.overlayG.getBoundingClientRect();
          const signatureWidthPixels = overlayRect.width;
          const noteTimePixels = this.jianpuModel.measuresInfo.quartersToTime(activeNote.start, activeNote.start) * this.config.pixelsPerTimeStep;
          if (noteTimePixels > signatureWidthPixels) {
            this.signaturesBlinking = false;
            setBlinkAnimation(this.overlayG, false);
          }
        }
      } else {
        this.jianpuModel.update(this.jianpuInfo, this.config.defaultKey);
        let currentX = this.width;
        let contentWidth = this.width;
        let maxHeight = this.height > 0 ? this.height - this.yBaseline : this.config.noteHeight * 3;
        let minHeight = 0;
        const linkedNoteMap = /* @__PURE__ */ new Map();
        this.jianpuModel.jianpuBlockMap.forEach((block, startTimeQ) => {
          if (startTimeQ >= this.lastRenderedQ - 1e-9) {
            if (isCompact) {
              currentX = contentWidth;
            } else {
              currentX = this.jianpuModel.measuresInfo.quartersToTime(startTimeQ, startTimeQ) * this.config.pixelsPerTimeStep;
            }
            const blockWidth = this.drawJianpuBlock(block, currentX, linkedNoteMap);
            if (isCompact) {
              contentWidth += blockWidth;
            } else {
              contentWidth = Math.max(contentWidth, currentX + blockWidth);
            }
            const blockG = this.mainSVG.querySelector(`g[data-block-start="${block.start}"]`);
            if (blockG) {
              try {
                const blockBox = blockG.getBBox();
                const topY = blockBox.y;
                const bottomY = blockBox.y + blockBox.height;
                minHeight = Math.min(minHeight, topY);
                maxHeight = Math.max(maxHeight, bottomY);
              } catch (e) {
              }
            }
            this.lastRenderedQ = startTimeQ + block.length;
          }
        });
        this.height = Math.max(this.height, maxHeight - minHeight + this.config.noteHeight);
        this.updateLayout(contentWidth);
      }
      return activeNotePosition;
    }
    /**
     * Draws a single JianpuBlock (notes or rest) at the specified x-position.
     * @param block The JianpuBlock to draw.
     * @param x The horizontal starting position.
     * @param linkedNoteMap Map for handling ties.
     * @returns The calculated width of the drawn block.
     */
    drawJianpuBlock(block, x, linkedNoteMap) {
      let blockWidth = 0;
      const isCompact = this.config.pixelsPerTimeStep <= 0;
      const isMeasureStart = block.isMeasureBeginning();
      const blockGroup = createSVGGroupChild(this.musicG, `block-${block.start}`);
      blockGroup.setAttribute("data-block-start", `${block.start}`);
      if (isMeasureStart && block.start > 1e-6) {
        const barX = x - (isCompact ? this.estimatedNoteWidth * 0.6 : 4);
        const barHeight = this.config.noteHeight * 2;
        const barY = 0;
        const bar = drawSVGPath(this.musicG, barPath, barX, barY, 1, barHeight / PATH_SCALE);
        setStroke(bar, this.config.noteColor, LINE_STROKE_WIDTH);
        if (isCompact) {
          blockWidth += LINE_STROKE_WIDTH;
        }
      }
      const keyChanged = this.updateCurrentKey(block.start);
      const timeChanged = this.updateCurrentTimeSignature(block.start);
      let signatureWidth = 0;
      if ((keyChanged || timeChanged) && block.start > 1e-6) {
        const sigX = x + blockWidth;
        signatureWidth = this.drawSignatures(this.signaturesG, sigX, keyChanged, timeChanged);
        if (isCompact) {
          blockWidth += signatureWidth + this.estimatedNoteWidth * 0.2;
        }
      }
      const contentX = x + blockWidth;
      let contentWidth = 0;
      if (block.notes.length > 0) {
        contentWidth = this.drawNotes(block, contentX, linkedNoteMap, blockGroup);
      } else if (block.length > 1e-6) {
        contentWidth = this.drawRest(block, contentX, blockGroup);
      }
      if (isCompact) {
        blockWidth += contentWidth;
        let gap = this.estimatedNoteWidth * this.config.noteSpacingFactor;
        if (block.beatEnd) {
          gap *= 1;
        } else if (block.length < 0.0625) {
          gap *= 0.05;
        } else if (block.length < 0.125) {
          gap *= 0.1;
        } else if (block.length < 0.25) {
          gap *= 0.2;
        } else if (block.length < 0.5) {
          gap *= 0.4;
        } else if (block.length < 1) {
          gap *= 0.5;
        }
        blockWidth += gap;
      } else {
        blockWidth = Math.max(signatureWidth, contentWidth);
      }
      const isFinalBlock = this.jianpuModel.isLastMeasureAtQ(block.start + block.length);
      if (isFinalBlock) {
        const barX = x + blockWidth;
        const barHeight = this.config.noteHeight * 2;
        const barY = 0;
        const bar = drawSVGPath(this.musicG, barPath, barX, barY, 1, barHeight / PATH_SCALE);
        setStroke(bar, this.config.noteColor, LINE_STROKE_WIDTH);
        if (isCompact) {
          blockWidth += LINE_STROKE_WIDTH;
        }
      }
      return blockWidth;
    }
    /**
    * Draws the notes within a JianpuBlock.
    * @param block The block containing notes.
    * @param x The starting x position for drawing this block's content.
    * @param linkedNoteMap Map for handling ties.
    * @param blockGroup The parent SVG group for this block.
    * @returns The horizontal space occupied by the notes (excluding final padding).
    */
    drawNotes(block, x, linkedNoteMap, blockGroup) {
      let currentX = x;
      let maxX = x;
      const noteSpacing = this.estimatedNoteWidth * 0.1;
      const FONT_SIZE = `${this.numberFontSize}px`;
      const SMALL_FONT_SIZE = `${this.smallFontSize}px`;
      const { durationLines = 0, augmentationDots = 0, augmentationDash = false } = block;
      block.notes.forEach((note) => {
        const noteId = `${note.start}-${note.pitch}`;
        const noteG = createSVGGroupChild(blockGroup, noteId);
        if (block.isMeasureBeginning()) {
          noteG.setAttribute("data-is-measure-start", "true");
        }
        let noteStartX = currentX;
        let noteEndX = noteStartX;
        if (note.accidental !== 0) {
          const accText = ACCIDENTAL_TEXT[note.accidental];
          drawSVGText(noteG, accText, noteStartX + noteSpacing, 0, SMALL_FONT_SIZE, "normal", "end", "text-top", this.config.noteColor);
        }
        let noteWidth = 0;
        if (augmentationDash) {
          const dashWidth = this.config.noteHeight * AUGMENTATION_DASH_FACTOR;
          const pathOriginalWidth = 50;
          const dashScaleX = dashWidth / pathOriginalWidth;
          const dash = drawSVGPath(noteG, augmentationDashPath, noteStartX, 0, dashScaleX, 1);
          setStroke(dash, this.config.noteColor, LINE_STROKE_WIDTH);
          noteWidth = dashWidth;
          noteEndX = noteStartX + noteWidth;
        } else {
          const numText = `${note.jianpuNumber}`;
          const num = drawSVGText(noteG, numText, noteStartX, 0, FONT_SIZE, "normal", "start", "middle", this.config.noteColor);
          noteWidth = num.getBBox().width;
          noteEndX = noteStartX + noteWidth;
        }
        if (note.octaveDot !== 0 && augmentationDash === false) {
          const dotSize = this.config.noteHeight * DOT_SIZE_FACTOR;
          const dotScale = dotSize / (PATH_SCALE * 0.15);
          const dotX = noteStartX + noteWidth / 2;
          const dotSpacing = dotSize * 2.8;
          const baseOffset = this.config.noteHeight * OCTAVE_DOT_OFFSET_FACTOR;
          for (let i = 0; i < Math.abs(note.octaveDot); i++) {
            const y = (note.octaveDot > 0 ? -baseOffset : baseOffset * 0.6) - i * dotSpacing * (note.octaveDot > 0 ? 1 : -1);
            drawSVGPath(noteG, dotPath, dotX, y, dotScale, dotScale);
          }
        }
        if (durationLines > 0) {
          const lineYOffset = this.config.noteHeight * UNDERLINE_SPACING_FACTOR * 2.5;
          const lineSpacing = this.config.noteHeight * UNDERLINE_SPACING_FACTOR;
          // 官方默认：按数字宽度 × 官方比例计算
          const factor = (DURATION_LINE_SCALES.get(durationLines) ?? 1);
          const lineWidthScale = noteWidth / PATH_SCALE * factor;
          for (let lineIndex = 0; lineIndex < durationLines; lineIndex++) {
            const yPosition = lineYOffset + lineIndex * lineSpacing;
            const durationLine = drawSVGPath(noteG, underlinePath, noteStartX, yPosition, lineWidthScale, 1);
            setStroke(durationLine, this.config.noteColor, LINE_STROKE_WIDTH);
          }
        }
        let augmentationX = noteEndX + noteSpacing;
        if (augmentationDots > 0) {
          const dotSize = this.config.noteHeight * DOT_SIZE_FACTOR;
          const dotScale = dotSize / (PATH_SCALE * 0.15);
          for (let i = 0; i < augmentationDots; i++) {
            drawSVGPath(noteG, dotPath, augmentationX, 0, dotScale, dotScale);
            augmentationX += dotSize + noteSpacing;
          }
          noteEndX = augmentationX + noteSpacing;
        }
        const noteLogicalEndPositionX = noteEndX;
        if (note.tiedTo && !augmentationDash) {
          linkedNoteMap.set(note, { g: noteG, xNoteRight: noteLogicalEndPositionX, yNoteBaseline: 0 });
        } else if (note.tiedFrom) {
          let firstNote = note.tiedFrom;
          while (firstNote.tiedFrom) {
            firstNote = firstNote.tiedFrom;
          }
          const prevLink = linkedNoteMap.get(firstNote);
          if (prevLink) {
            const tieStartX = prevLink.xNoteRight * 1;
            const tieEndX = augmentationDash ? noteStartX - this.estimatedNoteWidth * 2.2 : noteStartX - noteSpacing;
            const tieWidth = tieEndX - tieStartX;
            const tieY = -this.config.noteHeight * 1.2;
            const tieScaleX = tieWidth / PATH_SCALE * 1.3;
            const tieScaleY = this.config.noteHeight / PATH_SCALE * 1.6;
            if (tieWidth > 1) {
              drawSVGPath(
                prevLink.g,
                tiePath,
                tieStartX - (prevLink.g.getCTM()?.e ?? 0),
                tieY,
                tieScaleX,
                tieScaleY
              );
            }
            let current = firstNote;
            while (current && current !== note) {
              linkedNoteMap.delete(current);
              const nextNote = current.tiedTo;
              if (nextNote) {
                current = nextNote;
              }
            }
          } else {
            console.warn("Missing linked SVG details for first tied note:", firstNote);
          }
        }
        maxX = Math.max(maxX, noteEndX);
      });
      return maxX - x;
    }
    /**
     * Draws a rest symbol for a JianpuBlock.
     * @param block The rest block.
     * @param x The starting x position.
     * @param blockGroup The parent SVG group.
     * @returns The horizontal space occupied by the rest (excluding final padding).
     */
    drawRest(block, x, blockGroup) {
      const FONT_SIZE = `${this.numberFontSize}px`;
      const noteSpacing = this.estimatedNoteWidth * 0.1;
      const { durationLines = 0, augmentationDots = 0 } = block;
      let currentX = x;
      let noteEndX = currentX;
      const restSymbol = "0";
      const restText = drawSVGText(blockGroup, restSymbol, currentX, 0, FONT_SIZE, "normal", "start", "middle", this.config.noteColor);
      const restWidth = restText.getBBox().width;
      noteEndX = currentX + restWidth;
      if (durationLines > 0) {
        const lineYOffset = this.config.noteHeight * UNDERLINE_SPACING_FACTOR * 2.5;
        const lineSpacing = this.config.noteHeight * UNDERLINE_SPACING_FACTOR;
        const lineWidthScale = restWidth / PATH_SCALE * (DURATION_LINE_SCALES.get(durationLines) ?? 1);
        for (let lineIndex = 0; lineIndex < durationLines; lineIndex++) {
          const yPosition = lineYOffset + lineIndex * lineSpacing;
          const durationLine = drawSVGPath(blockGroup, underlinePath, currentX, yPosition, lineWidthScale, 1);
          setStroke(durationLine, this.config.noteColor, LINE_STROKE_WIDTH);
        }
      }
      let augmentationX = noteEndX + noteSpacing;
      if (augmentationDots > 0) {
        const dotSize = this.config.noteHeight * DOT_SIZE_FACTOR;
        const dotScale = dotSize / (PATH_SCALE * 0.15);
        for (let i = 0; i < augmentationDots; i++) {
          drawSVGPath(blockGroup, dotPath, augmentationX, 0, dotScale, dotScale);
          augmentationX += dotSize + noteSpacing;
        }
        noteEndX = augmentationX + noteSpacing;
      }
      return noteEndX - x;
    }
    /**
     * Draws Key and/or Time signatures.
     * @param container The SVG group to draw into (overlayG or signaturesG). **Must be SVGGElement.**
     * @param x The starting x position.
     * @param drawKey Draw the key signature (1=X).
     * @param drawTime Draw the time signature (X/Y).
     * @returns The width of the drawn signatures.
     */
    drawSignatures(container, x, drawKey, drawTime) {
      let currentX = x;
      const spacing = this.estimatedNoteWidth * 0.3;
      const timeFontSize = `${this.smallFontSize}px`;
      const keyFontSize = `${this.numberFontSize}px`;
      if (drawKey) {
        const keyName = PITCH_CLASS_NAMES[this.currentKey % 12] ?? "C";
        const keyText = `1=${keyName}`;
        const keySig = drawSVGText(container, keyText, currentX, 0, keyFontSize, "normal", "start", "middle", this.config.noteColor);
        currentX += keySig.getBBox().width + spacing * 2;
      }
      if (drawTime) {
        const timeStr = `${this.currentTimeSignature.numerator}/${this.currentTimeSignature.denominator}`;
        const timeSig = drawSVGText(
          container,
          timeStr,
          currentX,
          0,
          // 保持与基线对齐
          timeFontSize,
          "normal",
          "start",
          "middle",
          // 垂直居中
          this.config.noteColor
        );
        currentX += timeSig.getBBox().width + spacing;
      }
      const totalWidth = currentX - x;
      try {
        const bounds = container.getBBox();
        const minY = bounds.y;
        const maxY = bounds.y + bounds.height;
        const requiredHeight = Math.max(this.yBaseline + maxY, this.yBaseline - minY) + this.config.noteHeight * 0.5;
        this.height = Math.max(this.height, requiredHeight);
      } catch (e) {
      }
      if (container === this.overlayG && this.config.pixelsPerTimeStep > 0) {
        this.signaturesBlinking = true;
        setBlinkAnimation(this.overlayG, true);
      }
      return totalWidth;
    }
    /** Updates the current key if changed at the given time */
    updateCurrentKey(timeQ) {
      const newKey = this.jianpuModel.measuresInfo.keySignatureAtQ(timeQ, true);
      if (newKey !== -1 && newKey !== this.currentKey) {
        this.currentKey = newKey;
        return true;
      }
      return false;
    }
    /** Updates the current time signature if changed at the given time */
    updateCurrentTimeSignature(timeQ) {
      const newTimeSig = this.jianpuModel.measuresInfo.timeSignatureAtQ(timeQ, true);
      if (newTimeSig && (newTimeSig.numerator !== this.currentTimeSignature.numerator || newTimeSig.denominator !== this.currentTimeSignature.denominator)) {
        this.currentTimeSignature = newTimeSig;
        return true;
      }
      return false;
    }
    /** Handles scroll events to update the fixed signature overlay */
    handleScrollEvent = (_event) => {
      this.lastKnownScrollLeft = this.parentElement.scrollLeft;
      if (!this.isScrolling) {
        window.requestAnimationFrame(() => {
          this.updateOverlaySignaturesForScroll(this.lastKnownScrollLeft);
          this.isScrolling = false;
        });
      }
      this.isScrolling = true;
    };
    /** Scrolls the container to bring the active note into view */
    scrollIntoViewIfNeeded(activeNotePosition) {
      const containerWidth = this.parentElement.getBoundingClientRect().width;
      const currentScroll = this.parentElement.scrollLeft;
      let targetScroll = currentScroll;
      if (this.config.scrollType === 0 /* PAGE */) {
        const scrollMargin = 20;
        if (activeNotePosition < currentScroll + scrollMargin) {
          targetScroll = activeNotePosition - scrollMargin;
        } else if (activeNotePosition > currentScroll + containerWidth - scrollMargin) {
          targetScroll = activeNotePosition - containerWidth + scrollMargin;
        }
      } else {
        const centerOffset = containerWidth * 0.5;
        targetScroll = activeNotePosition - centerOffset;
      }
      targetScroll = Math.max(0, Math.min(targetScroll, this.parentElement.scrollWidth - containerWidth));
      if (Math.abs(targetScroll - currentScroll) > 1) {
        this.parentElement.scrollTo({
          left: targetScroll,
          behavior: "smooth"
          // Use smooth scrolling
        });
        this.updateOverlaySignaturesForScroll(targetScroll);
      }
    }
    /** Helper to update overlay based on a target scroll position */
    updateOverlaySignaturesForScroll(scrollLeft) {
      const scrolledTimeQ = this.pixelsToTime(scrollLeft);
      const keyAtScroll = this.jianpuModel.measuresInfo.keySignatureAtQ(scrolledTimeQ);
      const timeSigAtScroll = this.jianpuModel.measuresInfo.timeSignatureAtQ(scrolledTimeQ) ?? this.currentTimeSignature;
      let needsRedraw = false;
      if (keyAtScroll !== this.currentKey) {
        this.currentKey = keyAtScroll;
        needsRedraw = true;
      }
      if (timeSigAtScroll.numerator !== this.currentTimeSignature.numerator || timeSigAtScroll.denominator !== this.currentTimeSignature.denominator) {
        this.currentTimeSignature = timeSigAtScroll;
        needsRedraw = true;
      }
      if (needsRedraw) {
        while (this.overlayG.lastChild) this.overlayG.removeChild(this.overlayG.lastChild);
        this.drawSignatures(this.overlayG, 0, true, true);
        if (scrollLeft < 10 && this.config.pixelsPerTimeStep > 0) {
          setBlinkAnimation(this.overlayG, true);
          this.signaturesBlinking = true;
        } else if (this.config.pixelsPerTimeStep > 0) {
          setBlinkAnimation(this.overlayG, false);
          this.signaturesBlinking = false;
        }
      }
    }
    /** Converts a pixel position to a time in quarter notes (proportional mode only) */
    pixelsToTime(pixels) {
      if (this.config.pixelsPerTimeStep <= 0) return 0;
      return this.jianpuModel.measuresInfo.timeToQuarters(pixels / this.config.pixelsPerTimeStep, 0);
    }
  };
  return __toCommonJS(index_exports);
})();
/**
 * @license
 * Copyright 2026 flufy3d. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
