const OPEN_NOTE_INDEX = [4, 9, 2, 7, 11, 4]; // E A D G B E (low -> high)
const ROOT_STRING_LABELS = ["6th", "5th", "4th", "3rd", "2nd", "1st"];
const STRING_COUNT = OPEN_NOTE_INDEX.length;

const INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  bluesMinor: [0, 3, 5, 6, 7, 10],
  wholeTone: [0, 2, 4, 6, 8, 10],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

const THREE_NPS_MODE_ROWS = {
  ionian: [
    [0, 2, 4],
    [0, 2, 4],
    [1, 2, 4],
    [1, 2, 4],
    [2, 4, 5],
    [2, 4, 5],
  ],
  dorian: [
    [0, 2, 3],
    [0, 2, 4],
    [0, 2, 4],
    [0, 2, 4],
    [2, 3, 5],
    [2, 3, 5],
  ],
  phrygian: [
    [0, 1, 3],
    [0, 2, 3],
    [0, 2, 3],
    [0, 2, 4],
    [1, 3, 5],
    [1, 3, 5],
  ],
  lydian: [
    [0, 2, 4],
    [1, 2, 4],
    [1, 2, 4],
    [1, 3, 4],
    [2, 4, 5],
    [2, 4, 6],
  ],
  mixolydian: [
    [0, 2, 4],
    [0, 2, 4],
    [0, 2, 4],
    [1, 2, 4],
    [2, 3, 5],
    [2, 4, 5],
  ],
  aeolian: [
    [0, 2, 3],
    [0, 2, 3],
    [0, 2, 4],
    [0, 2, 4],
    [1, 3, 5],
    [2, 3, 5],
  ],
  locrian: [
    [0, 1, 3],
    [0, 1, 3],
    [0, 2, 3],
    [0, 2, 3],
    [1, 3, 5],
    [1, 3, 5],
  ],
};

function mod12(value) {
  return ((value % 12) + 12) % 12;
}

function getRelativeOpenIntervals(anchorString) {
  const anchorOpen = OPEN_NOTE_INDEX[anchorString];
  return OPEN_NOTE_INDEX.map((noteIndex) => mod12(noteIndex - anchorOpen));
}

function computeRowsFromWindow(intervals, anchorString, minFret, maxFret) {
  const relativeOpenIntervals = getRelativeOpenIntervals(anchorString);
  return relativeOpenIntervals.map((baseInterval) => {
    const frets = [];
    for (let fret = minFret; fret <= maxFret; fret += 1) {
      if (intervals.includes(mod12(baseInterval + fret))) {
        frets.push(fret);
      }
    }
    return frets;
  });
}

function computeRowsFromReferenceWindow(intervals, minFret, maxFret) {
  const referenceAnchorString = 0;
  return computeRowsFromWindow(intervals, referenceAnchorString, minFret, maxFret);
}

function reanchorAbsoluteRows(absoluteRows, anchorFret) {
  return absoluteRows.map((row) => row.map((fret) => fret - anchorFret));
}

function buildShape({
  id,
  name,
  mode,
  system,
  anchorString,
  rows,
  categoryId,
  categoryLabel,
  categoryOrder,
  sectionId,
  sectionLabel,
  sectionOrder,
  sortOrder,
}) {
  const relativeOpenIntervals = getRelativeOpenIntervals(anchorString);
  const positions = rows
    .flatMap((row, stringIndex) =>
      row.map((fret) => ({
        string: stringIndex - anchorString,
        fret,
        interval: mod12(relativeOpenIntervals[stringIndex] + fret),
      }))
    )
    .sort((a, b) => a.string - b.string || a.fret - b.fret);

  return {
    id,
    name,
    mode,
    system,
    anchorString,
    anchorLabel: ROOT_STRING_LABELS[anchorString],
    categoryId,
    categoryLabel,
    categoryOrder,
    sectionId,
    sectionLabel,
    sectionOrder,
    sortOrder,
    positions,
  };
}

function deriveShapeByIntervalSubstitution(
  baseShape,
  { id, name, mode, system, intervalMap, sortOrder, ...meta }
) {
  const anchorString = baseShape.anchorString;
  const relativeOpenIntervals = getRelativeOpenIntervals(anchorString);
  const rows = Array.from({ length: STRING_COUNT }, () => []);

  (baseShape.positions ?? []).forEach((pos) => {
    const absoluteString = (anchorString ?? 0) + (pos.string ?? 0);
    if (absoluteString < 0 || absoluteString >= STRING_COUNT) {
      return;
    }
    const sourceInterval = mod12(pos.interval ?? 0);
    const targetInterval = mod12(intervalMap?.[sourceInterval] ?? sourceInterval);
    const baseInterval = relativeOpenIntervals[absoluteString];
    const fret = toSignedFretOffset(targetInterval - baseInterval);
    rows[absoluteString].push(fret);
  });

  rows.forEach((row, index) => {
    rows[index] = Array.from(new Set(row)).sort((a, b) => a - b);
  });

  return buildShape({
    id,
    name: name ?? baseShape.name,
    mode: mode ?? baseShape.mode,
    system: system ?? baseShape.system,
    anchorString,
    rows,
    sortOrder: sortOrder ?? baseShape.sortOrder,
    ...meta,
  });
}

function buildReferenceWindowShape(config) {
  const { intervals, minFret, maxFret, anchorFret } = config;
  const absoluteRows = computeRowsFromReferenceWindow(intervals, minFret, maxFret);
  const rows = reanchorAbsoluteRows(absoluteRows, anchorFret);
  return buildShape({ ...config, rows });
}

function makeLibraryMeta(categoryId, categoryLabel, categoryOrder, sectionId, sectionLabel, sectionOrder) {
  return {
    categoryId,
    categoryLabel,
    categoryOrder,
    sectionId,
    sectionLabel,
    sectionOrder,
  };
}

function toSignedFretOffset(diff) {
  const wrapped = mod12(diff);
  return wrapped > 6 ? wrapped - 12 : wrapped;
}

function buildDrop2RowsForStringSet({ toneOrder, toneIntervals, stringSetStart }) {
  const setStrings = [stringSetStart, stringSetStart + 1, stringSetStart + 2, stringSetStart + 3];
  const rootPositionInSet = toneOrder.indexOf("R");
  const anchorString = setStrings[rootPositionInSet];
  const relativeOpenIntervals = getRelativeOpenIntervals(anchorString);
  const rows = Array.from({ length: STRING_COUNT }, () => []);

  setStrings.forEach((stringIndex, index) => {
    const tone = toneOrder[index];
    const targetInterval = toneIntervals[tone];
    const baseInterval = relativeOpenIntervals[stringIndex];
    rows[stringIndex] = [toSignedFretOffset(targetInterval - baseInterval)];
  });

  return { anchorString, rows };
}

function buildDrop2VariantShape(config, stringSetStart) {
  const { anchorString, rows } = buildDrop2RowsForStringSet({
    toneOrder: config.toneOrder,
    toneIntervals: config.toneIntervals,
    stringSetStart,
  });
  return buildShape({
    ...config,
    anchorString,
    rows,
  });
}

function buildDrop2Shape(config) {
  const baseShape = buildDrop2VariantShape(config, 0);
  const drop2Variants = {};

  [0, 1, 2].forEach((stringSetStart) => {
    const variant = buildDrop2VariantShape(config, stringSetStart);
    drop2Variants[String(stringSetStart)] = {
      stringSetStart,
      anchorString: variant.anchorString,
      anchorLabel: variant.anchorLabel,
      positions: variant.positions,
    };
  });

  return {
    ...baseShape,
    anchorHintLabel: "拖拽时可选弦组：6弦组 / 5弦组 / 4弦组",
    dragPlacementStarts: [0, 1, 2],
    dragPlacementVariants: drop2Variants,
    drop2StringSetStarts: [0, 1, 2],
    drop2Variants,
  };
}

function buildVoicingRowsForStringSet({ toneOrder, toneIntervals, stringSetStart, stringOffsets }) {
  const setStrings = stringOffsets.map((offset) => stringSetStart + offset);
  const rootPositionInSet = toneOrder.indexOf("R");
  const anchorString = setStrings[rootPositionInSet];
  const relativeOpenIntervals = getRelativeOpenIntervals(anchorString);
  const rows = Array.from({ length: STRING_COUNT }, () => []);

  setStrings.forEach((stringIndex, index) => {
    const tone = toneOrder[index];
    const targetInterval = toneIntervals[tone];
    const baseInterval = relativeOpenIntervals[stringIndex];
    rows[stringIndex] = [toSignedFretOffset(targetInterval - baseInterval)];
  });

  return { anchorString, rows };
}

function buildVoicingVariantShape(config, stringSetStart) {
  const { anchorString, rows } = buildVoicingRowsForStringSet({
    toneOrder: config.toneOrder,
    toneIntervals: config.toneIntervals,
    stringSetStart,
    stringOffsets: config.stringOffsets,
  });
  return buildShape({
    ...config,
    anchorString,
    rows,
  });
}

function buildVoicingShapeWithVariants(config) {
  const baseStringSetStart = config.dragPlacementStarts?.[0] ?? 0;
  const baseShape = buildVoicingVariantShape(config, baseStringSetStart);
  const variants = {};

  (config.dragPlacementStarts ?? []).forEach((stringSetStart) => {
    const variant = buildVoicingVariantShape(config, stringSetStart);
    variants[String(stringSetStart)] = {
      stringSetStart,
      anchorString: variant.anchorString,
      anchorLabel: variant.anchorLabel,
      positions: variant.positions,
    };
  });

  return {
    ...baseShape,
    anchorHintLabel: config.anchorHintLabel,
    dragPlacementStarts: [...(config.dragPlacementStarts ?? [])],
    dragPlacementVariants: variants,
  };
}

const CAGED_CHORD_META = makeLibraryMeta(
  "caged",
  "CAGED 系统（和弦）",
  1,
  "caged-major-chords",
  "五个大三和弦指型（C / A / G / E / D）",
  1
);

const FIVE_MAJOR_SCALE_META = makeLibraryMeta(
  "major-scale",
  "大调音阶（Major Scale）",
  2,
  "major-scale-5",
  "五个大调音阶",
  1
);

const FIVE_MELODIC_MINOR_SCALE_META = makeLibraryMeta(
  "melodic-minor-scale",
  "旋律小调（Melodic Minor）",
  2.25,
  "melodic-minor-5",
  "五个旋律小调",
  1
);

const FIVE_HARMONIC_MINOR_SCALE_META = makeLibraryMeta(
  "harmonic-minor-scale",
  "和声小调（Harmonic Minor）",
  2.5,
  "harmonic-minor-5",
  "五个和声小调",
  1
);

const DROP2_MAJOR7_META = makeLibraryMeta(
  "drop2",
  "Drop 2 和弦",
  3,
  "drop2-major7",
  "Major 7 · 4 Inversions",
  1
);

const DROP2_MINOR7_META = makeLibraryMeta(
  "drop2",
  "Drop 2 和弦",
  3,
  "drop2-minor7",
  "Minor 7 · 4 Inversions",
  2
);

const DROP2_DOM7_META = makeLibraryMeta(
  "drop2",
  "Drop 2 和弦",
  3,
  "drop2-dominant7",
  "Dominant 7 · 4 Inversions",
  3
);

const DROP2_HALF_DIM7_META = makeLibraryMeta(
  "drop2",
  "Drop 2 和弦",
  3,
  "drop2-half-diminished7",
  "Half-Diminished 7 (m7b5) · 4 Inversions",
  4
);

const DROP2_SUS2_7_META = makeLibraryMeta(
  "drop2",
  "Drop 2 和弦",
  3,
  "drop2-sus2-7",
  "7sus2 · 4 Inversions",
  5
);

const DROP2_SUS4_7_META = makeLibraryMeta(
  "drop2",
  "Drop 2 和弦",
  3,
  "drop2-sus4-7",
  "7sus4 · 4 Inversions",
  6
);

const DROP3_MAJOR7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-major7",
  "Major 7 · 4 Inversions",
  1
);

const DROP3_MINOR7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-minor7",
  "Minor 7 · 4 Inversions",
  2
);

const DROP3_DOM7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-dominant7",
  "Dominant 7 · 4 Inversions",
  3
);

const DROP3_HALF_DIM7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-half-diminished7",
  "Half-Diminished 7 (m7b5) · 4 Inversions",
  4
);

const DROP3_SUS2_7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-sus2-7",
  "7sus2 · 4 Inversions",
  5
);

const DROP3_SUS4_7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-sus4-7",
  "7sus4 · 4 Inversions",
  6
);

const SHELL_TRIADS_META = makeLibraryMeta(
  "shell-voicing",
  "Shell Voicing",
  4.5,
  "shell-voicing-triads",
  "Triads",
  1
);

const SHELL_SEVENTH_META = makeLibraryMeta(
  "shell-voicing",
  "Shell Voicing",
  4.5,
  "shell-voicing-seventh",
  "Seventh Chords",
  2
);

function createShellTriadMeta(sectionId, sectionLabel, sectionOrder) {
  return makeLibraryMeta(
    SHELL_TRIADS_META.categoryId,
    SHELL_TRIADS_META.categoryLabel,
    SHELL_TRIADS_META.categoryOrder,
    sectionId,
    sectionLabel,
    sectionOrder
  );
}

function createShellSeventhMeta(sectionId, sectionLabel, sectionOrder) {
  return makeLibraryMeta(
    SHELL_SEVENTH_META.categoryId,
    SHELL_SEVENTH_META.categoryLabel,
    SHELL_SEVENTH_META.categoryOrder,
    sectionId,
    sectionLabel,
    sectionOrder
  );
}

const TRIADS_MAJOR_META = makeLibraryMeta(
  "triads",
  "Triads（三和弦）",
  5,
  "triads-major",
  "Major · 3 Inversions",
  1
);

const TRIADS_MINOR_META = makeLibraryMeta(
  "triads",
  "Triads（三和弦）",
  5,
  "triads-minor",
  "Minor · 3 Inversions",
  2
);

const TRIADS_DIMINISHED_META = makeLibraryMeta(
  "triads",
  "Triads（三和弦）",
  5,
  "triads-diminished",
  "Diminished · 3 Inversions",
  3
);

const TRIADS_AUGMENTED_META = makeLibraryMeta(
  "triads",
  "Triads（三和弦）",
  5,
  "triads-augmented",
  "Augmented · 3 Inversions",
  4
);

const SUS2_DROP2_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus2-drop2",
  "Sus2 · Drop 2",
  1
);

const SUS2_DROP3_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus2-drop3",
  "Sus2 · Drop 3",
  2
);

const SUS2_TRIADS_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus2-triads",
  "Sus2 · Triads",
  3
);

const SUS4_DROP2_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus4-drop2",
  "Sus4 · Drop 2",
  4
);

const SUS4_DROP3_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus4-drop3",
  "Sus4 · Drop 3",
  5
);

const SUS4_TRIADS_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus4-triads",
  "Sus4 · Triads",
  6
);

const DIM7_CHORD_MOVABLE_META = makeLibraryMeta(
  "dim7-chords",
  "减七和弦（Diminished 7）",
  5.25,
  "dim7-chord-movable",
  "Movable Shape · Roots on 6th / 5th / 4th",
  1
);

const ARPEGGIO_DOM7_META = makeLibraryMeta(
  "arpeggio",
  "琶音（Arpeggio）",
  5.5,
  "arpeggio-dominant7",
  "Dominant 7th · 5 Shapes",
  1
);

const ARPEGGIO_MAJ7_META = makeLibraryMeta(
  "arpeggio",
  "琶音（Arpeggio）",
  5.5,
  "arpeggio-major7",
  "Major 7th · 5 Shapes",
  2
);

const ARPEGGIO_MIN7_META = makeLibraryMeta(
  "arpeggio",
  "琶音（Arpeggio）",
  5.5,
  "arpeggio-minor7",
  "Minor 7th · 5 Shapes",
  3
);

const ARPEGGIO_HALF_DIM7_META = makeLibraryMeta(
  "arpeggio",
  "琶音（Arpeggio）",
  5.5,
  "arpeggio-half-diminished7",
  "Half-Diminished 7th · 5 Shapes",
  4
);

const PENT_MINOR_META = makeLibraryMeta(
  "pentatonic",
  "五声音阶（Pentatonic）",
  6,
  "pent-minor",
  "vertical",
  1
);

const PENT_GROUPING_META = makeLibraryMeta(
  "pentatonic",
  "五声音阶（Pentatonic）",
  6,
  "pent-grouping-32-23",
  "diagonal",
  2
);

const BLUES_SCALE_BOX_META = makeLibraryMeta(
  "blues-scale",
  "蓝调音阶（Blues Scale）",
  6.25,
  "blues-scale-boxes",
  "Five Blues Scale Boxes",
  1
);

const BLUES_GROUPING_META = makeLibraryMeta(
  "blues-scale",
  "蓝调音阶（Blues Scale）",
  6.25,
  "blues-grouping-32-23",
  "Diagonal",
  2
);

const DIMINISHED_SCALE_VERTICAL_META = makeLibraryMeta(
  "diminished-scale",
  "减音阶（Diminished Scale）",
  6.5,
  "diminished-scale-vertical",
  "Vertical",
  1
);

const DIMINISHED_SCALE_DIAGONAL_META = makeLibraryMeta(
  "diminished-scale",
  "减音阶（Diminished Scale）",
  6.5,
  "diminished-scale-diagonal",
  "Diagonal",
  2
);

const WHOLE_TONE_SCALE_HORIZONTAL_META = makeLibraryMeta(
  "whole-tone-scale",
  "全音阶（Whole Tone Scale）",
  6.75,
  "whole-tone-scale",
  "Whole Tone Scale",
  1
);

const WHOLE_TONE_SCALE_DIAGONAL_META = makeLibraryMeta(
  "whole-tone-scale",
  "全音阶（Whole Tone Scale）",
  6.75,
  "whole-tone-scale",
  "Whole Tone Scale",
  1
);

const THREE_NPS_MAJOR_META = makeLibraryMeta(
  "major-scale",
  "大调音阶（Major Scale）",
  2,
  "major-scale-3nps",
  "3 Notes per String",
  2
);

const THREE_NPS_MINOR_META = makeLibraryMeta(
  "three-nps",
  "大小调音阶（三音固定指式 / 3NPS）",
  7,
  "3nps-natural-minor",
  "Natural Minor · 7 Shapes",
  2
);

const THREE_NPS_MELODIC_MINOR_META = makeLibraryMeta(
  "melodic-minor-scale",
  "旋律小调（Melodic Minor）",
  2.25,
  "melodic-minor-3nps",
  "3 Notes per String",
  2
);

const THREE_NPS_HARMONIC_MINOR_META = makeLibraryMeta(
  "harmonic-minor-scale",
  "和声小调（Harmonic Minor）",
  2.5,
  "harmonic-minor-3nps",
  "3 Notes per String",
  2
);

const cagedChordShapes = [
  buildShape({
    id: "caged_chord_c_form",
    name: "C Form Chord",
    mode: "Major Chord Form",
    system: "CAGED Chord",
    anchorString: 1,
    rows: [
      [],
      [0],
      [-1],
      [-3],
      [-2],
      [-3],
    ],
    ...CAGED_CHORD_META,
    sortOrder: 4,
  }),
  buildShape({
    id: "caged_chord_a_form",
    name: "A Form Chord",
    mode: "Major Chord Form",
    system: "CAGED Chord",
    anchorString: 1,
    rows: [
      [],
      [0],
      [2],
      [2],
      [2],
      [0],
    ],
    ...CAGED_CHORD_META,
    sortOrder: 5,
  }),
  buildShape({
    id: "caged_chord_g_form",
    name: "G Form Chord",
    mode: "Major Chord Form",
    system: "CAGED Chord",
    anchorString: 0,
    rows: [
      [0],
      [-1],
      [-3],
      [-3],
      [-3],
      [0],
    ],
    ...CAGED_CHORD_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "caged_chord_e_form",
    name: "E Form Chord",
    mode: "Major Chord Form",
    system: "CAGED Chord",
    anchorString: 0,
    rows: [
      [0],
      [2],
      [2],
      [1],
      [0],
      [0],
    ],
    ...CAGED_CHORD_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "caged_chord_d_form",
    name: "D Form Chord",
    mode: "Major Chord Form",
    system: "CAGED Chord",
    anchorString: 2,
    rows: [
      [],
      [],
      [0],
      [2],
      [3],
      [2],
    ],
    ...CAGED_CHORD_META,
    sortOrder: 3,
  }),
];

const fiveMajorScaleShapes = [
  buildShape({
    id: "major_scale_5_e_form",
    name: "E 指型",
    mode: "Major Scale Position",
    system: "CAGED-Major Scales",
    anchorString: 1,
    rows: [
      [-3, -2, 0],
      [-3, -1, 0],
      [-3, -1, 0],
      [-3, -1],
      [-3, -2, 0],
      [-3, -2, 0],
    ],
    ...FIVE_MAJOR_SCALE_META,
    sortOrder: 4,
  }),
  buildShape({
    id: "major_scale_5_g_form",
    name: "G 指型",
    mode: "Major Scale Position",
    system: "CAGED-Major Scales",
    anchorString: 1,
    rows: [
      [0, 2],
      [-1, 0, 2],
      [-1, 0, 2],
      [-1, 1, 2],
      [0, 2, 3],
      [0, 2],
    ],
    ...FIVE_MAJOR_SCALE_META,
    sortOrder: 5,
  }),
  buildShape({
    id: "major_scale_5_a_form",
    name: "A 指型",
    mode: "Major Scale Position",
    system: "CAGED-Major Scales",
    anchorString: 0,
    rows: [
      [-3, -1, 0],
      [-3, -1, 0],
      [-3, -1],
      [-4, -3, -1],
      [-3, -2, 0],
      [-3, -1, 0],
    ],
    ...FIVE_MAJOR_SCALE_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "major_scale_5_b_form",
    name: "B 指型",
    mode: "Major Scale Position",
    system: "CAGED-Major Scales",
    anchorString: 0,
    rows: [
      [-1, 0, 2],
      [-1, 0, 2],
      [-1, 1, 2],
      [-1, 1, 2],
      [0, 2],
      [-1, 0, 2],
    ],
    ...FIVE_MAJOR_SCALE_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "major_scale_5_d_form",
    name: "D 指型",
    mode: "Major Scale Position",
    system: "CAGED-Major Scales",
    anchorString: 2,
    rows: [
      [0, 2, 3],
      [0, 2],
      [-1, 0, 2],
      [-1, 0, 2],
      [0, 2, 3],
      [0, 2, 3],
    ],
    ...FIVE_MAJOR_SCALE_META,
    sortOrder: 3,
  }),
];

const fiveMelodicMinorScaleShapes = [
  buildShape({
    id: "melodic_minor_scale_5_e_form",
    name: "E Shape",
    mode: "Melodic Minor Scale Position",
    system: "CAGED-Melodic Minor Scales",
    anchorString: 0,
    rows: [
      [-1, 0, 2, 3],
      [0, 2],
      [-1, 1, 2],
      [-1, 0, 2],
      [0, 2],
      [-1, 0, 2, 3],
    ],
    ...FIVE_MELODIC_MINOR_SCALE_META,
    sortOrder: 4,
  }),
  buildShape({
    id: "melodic_minor_scale_5_d_form",
    name: "D Shape",
    mode: "Melodic Minor Scale Position",
    system: "CAGED-Melodic Minor Scales",
    anchorString: 2,
    rows: [
      [0, 1, 3],
      [0, 2],
      [-1, 0, 2, 3],
      [0, 2],
      [0, 2, 3],
      [0, 1, 3],
    ],
    ...FIVE_MELODIC_MINOR_SCALE_META,
    sortOrder: 5,
  }),
  buildShape({
    id: "melodic_minor_scale_5_c_form",
    name: "C Shape",
    mode: "Melodic Minor Scale Position",
    system: "CAGED-Melodic Minor Scales",
    anchorString: 1,
    rows: [
      [-2, 0],
      [-3, -1, 0],
      [-3, -2, 0],
      [-3, -1],
      [-3, -2, 0, 1],
      [-2, 0],
    ],
    ...FIVE_MELODIC_MINOR_SCALE_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "melodic_minor_scale_5_a_form",
    name: "A Shape",
    mode: "Melodic Minor Scale Position",
    system: "CAGED-Melodic Minor Scales",
    anchorString: 1,
    rows: [
      [0, 2],
      [-1, 0, 2, 3],
      [0, 2],
      [-1, 1, 2],
      [0, 1, 3],
      [0, 2],
    ],
    ...FIVE_MELODIC_MINOR_SCALE_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "melodic_minor_scale_5_g_form",
    name: "G Shape",
    mode: "Melodic Minor Scale Position",
    system: "CAGED-Melodic Minor Scales",
    anchorString: 0,
    rows: [
      [-3, -1, 0],
      [-3, -2, 0],
      [-3, -1],
      [-4, -3, -1, 0],
      [-2, 0],
      [-3, -1, 0],
    ],
    ...FIVE_MELODIC_MINOR_SCALE_META,
    sortOrder: 3,
  }),
];

const fiveHarmonicMinorScaleShapes = [
  buildShape({
    id: "harmonic_minor_scale_5_e_form",
    name: "E Shape",
    mode: "Harmonic Minor Scale Position",
    system: "CAGED-Harmonic Minor Scales",
    anchorString: 0,
    rows: [
      [-1, 0, 2, 3],
      [0, 2, 3],
      [1, 2],
      [-1, 0, 2],
      [0, 1],
      [-1, 0, 2, 3],
    ],
    ...FIVE_HARMONIC_MINOR_SCALE_META,
    sortOrder: 4,
  }),
  buildShape({
    id: "harmonic_minor_scale_5_d_form",
    name: "D Shape",
    mode: "Harmonic Minor Scale Position",
    system: "CAGED-Harmonic Minor Scales",
    anchorString: 4,
    rows: [
      [-3, -2, 0],
      [-3, -2],
      [-4, -3, -1, 0],
      [-3, -1, 0],
      [-1, 0],
      [-3, -2, 0],
    ],
    ...FIVE_HARMONIC_MINOR_SCALE_META,
    sortOrder: 5,
  }),
  buildShape({
    id: "harmonic_minor_scale_5_c_form",
    name: "C Shape",
    mode: "Harmonic Minor Scale Position",
    system: "CAGED-Harmonic Minor Scales",
    anchorString: 4,
    rows: [
      [0, 2, 3],
      [1, 2],
      [-1, 0, 2],
      [-1, 0],
      [-1, 0, 2, 3],
      [0, 2, 3],
    ],
    ...FIVE_HARMONIC_MINOR_SCALE_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "harmonic_minor_scale_5_a_form",
    name: "A Shape",
    mode: "Harmonic Minor Scale Position",
    system: "CAGED-Harmonic Minor Scales",
    anchorString: 1,
    rows: [
      [0, 1],
      [-1, 0, 2, 3],
      [0, 2, 3],
      [1, 2],
      [0, 1, 3],
      [0, 1],
    ],
    ...FIVE_HARMONIC_MINOR_SCALE_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "harmonic_minor_scale_5_g_form",
    name: "G Shape",
    mode: "Harmonic Minor Scale Position",
    system: "CAGED-Harmonic Minor Scales",
    anchorString: 0,
    rows: [
      [-1, 0],
      [-3, -2, 0],
      [-3, -2],
      [-4, -3, -1, 0],
      [-2, 0, 1],
      [-1, 0],
    ],
    ...FIVE_HARMONIC_MINOR_SCALE_META,
    sortOrder: 3,
  }),
];

const DROP2_INVERSIONS = [
  {
    id: "root_position",
    name: "Root Position",
    toneOrder: ["R", "5", "7", "3"],
    sortOrder: 1,
  },
  {
    id: "first_position",
    name: "First Position",
    toneOrder: ["3", "7", "R", "5"],
    sortOrder: 2,
  },
  {
    id: "second_position",
    name: "Second Position",
    toneOrder: ["5", "R", "3", "7"],
    sortOrder: 3,
  },
  {
    id: "third_position",
    name: "Third Position",
    toneOrder: ["7", "3", "5", "R"],
    sortOrder: 4,
  },
];

const DROP2_QUALITIES = [
  {
    key: "maj7",
    mode: "Major 7",
    toneIntervals: { R: 0, "3": 4, "5": 7, "7": 11 },
    meta: DROP2_MAJOR7_META,
  },
  {
    key: "min7",
    mode: "Minor 7",
    toneIntervals: { R: 0, "3": 3, "5": 7, "7": 10 },
    meta: DROP2_MINOR7_META,
  },
  {
    key: "dom7",
    mode: "Dominant 7",
    toneIntervals: { R: 0, "3": 4, "5": 7, "7": 10 },
    meta: DROP2_DOM7_META,
  },
  {
    key: "m7b5",
    mode: "Half-Diminished 7",
    toneIntervals: { R: 0, "3": 3, "5": 6, "7": 10 },
    meta: DROP2_HALF_DIM7_META,
  },
];

const drop2ChordShapes = DROP2_QUALITIES.flatMap((quality) =>
  DROP2_INVERSIONS.map((inversion) =>
    buildDrop2Shape({
      id: `drop2_${quality.key}_${inversion.id}`,
      name: inversion.name,
      mode: quality.mode,
      system: "Drop 2",
      toneOrder: inversion.toneOrder,
      toneIntervals: quality.toneIntervals,
      ...quality.meta,
      sortOrder: inversion.sortOrder,
    })
  )
);

const DROP3_INVERSIONS = [
  {
    id: "root_position",
    name: "Root Position",
    toneOrder: ["R", "7", "3", "5"],
    sortOrder: 1,
  },
  {
    id: "first_position",
    name: "First Position",
    toneOrder: ["3", "R", "5", "7"],
    sortOrder: 2,
  },
  {
    id: "second_position",
    name: "Second Position",
    toneOrder: ["5", "3", "7", "R"],
    sortOrder: 3,
  },
  {
    id: "third_position",
    name: "Third Position",
    toneOrder: ["7", "5", "R", "3"],
    sortOrder: 4,
  },
];

const DROP3_QUALITIES = [
  {
    key: "maj7",
    mode: "Major 7",
    toneIntervals: { R: 0, "3": 4, "5": 7, "7": 11 },
    meta: DROP3_MAJOR7_META,
  },
  {
    key: "min7",
    mode: "Minor 7",
    toneIntervals: { R: 0, "3": 3, "5": 7, "7": 10 },
    meta: DROP3_MINOR7_META,
  },
  {
    key: "dom7",
    mode: "Dominant 7",
    toneIntervals: { R: 0, "3": 4, "5": 7, "7": 10 },
    meta: DROP3_DOM7_META,
  },
  {
    key: "m7b5",
    mode: "Half-Diminished 7",
    toneIntervals: { R: 0, "3": 3, "5": 6, "7": 10 },
    meta: DROP3_HALF_DIM7_META,
  },
];

const drop3ChordShapes = DROP3_QUALITIES.flatMap((quality) =>
  DROP3_INVERSIONS.map((inversion) =>
    buildVoicingShapeWithVariants({
      id: `drop3_${quality.key}_${inversion.id}`,
      name: inversion.name,
      mode: quality.mode,
      system: "Drop 3",
      toneOrder: inversion.toneOrder,
      toneIntervals: quality.toneIntervals,
      stringOffsets: [0, 2, 3, 4],
      dragPlacementStarts: [0, 1],
      anchorHintLabel: "拖拽时可选弦组：6弦组 / 5弦组",
      ...quality.meta,
      sortOrder: inversion.sortOrder,
    })
  )
);

const SHELL_TRIAD_QUALITIES = [
  {
    key: "major",
    mode: "Major Triad",
    toneIntervals: { R: 0, "3": 4 },
    meta: createShellTriadMeta("shell-triad-major", "Major Triad", 1),
  },
  {
    key: "minor",
    mode: "Minor Triad",
    toneIntervals: { R: 0, "3": 3 },
    meta: createShellTriadMeta("shell-triad-minor", "Minor Triad", 2),
  },
];

const SHELL_TRIAD_PATTERNS = [
  {
    key: "r3r",
    label: "R-3-R",
    toneOrder: ["R", "3", "R"],
    stringOffsets: [0, 1, 2],
    sortBase: 0,
  },
  {
    key: "rr3",
    label: "R-R-3",
    toneOrder: ["R", "R", "3"],
    stringOffsets: [0, 2, 3],
    sortBase: 100,
  },
];

const shellTriadShapes = SHELL_TRIAD_PATTERNS.flatMap((pattern) =>
  SHELL_TRIAD_QUALITIES.map((quality, index) =>
    buildVoicingShapeWithVariants({
      id: `shell_triad_${quality.key}_${pattern.key}`,
      name: pattern.label,
      mode: quality.mode,
      system: "Shell Voicing",
      toneOrder: pattern.toneOrder,
      toneIntervals: quality.toneIntervals,
      stringOffsets: pattern.stringOffsets,
      dragPlacementStarts: [0, 1, 2],
      anchorHintLabel: "拖拽时可选弦组：6弦组 / 5弦组 / 4弦组",
      ...quality.meta,
      sortOrder: pattern.sortBase + index + 1,
    })
  )
);

const SHELL_SEVENTH_QUALITIES = [
  {
    key: "maj7",
    mode: "Major 7",
    toneIntervals: { R: 0, "3": 4, "5": 7, "7": 11 },
    meta: createShellSeventhMeta("shell-seventh-major7", "Major 7", 1),
  },
  {
    key: "min7",
    mode: "Minor 7",
    toneIntervals: { R: 0, "3": 3, "5": 7, "7": 10 },
    meta: createShellSeventhMeta("shell-seventh-minor7", "Minor 7", 2),
  },
  {
    key: "dom7",
    mode: "Dominant 7",
    toneIntervals: { R: 0, "3": 4, "5": 7, "7": 10 },
    meta: createShellSeventhMeta("shell-seventh-dominant7", "Dominant 7", 3),
  },
  {
    key: "m7b5",
    mode: "Half-Diminished 7",
    toneIntervals: { R: 0, "3": 3, "5": 6, "7": 10 },
    meta: createShellSeventhMeta("shell-seventh-half-diminished7", "Half-Diminished 7", 4),
  },
  {
    key: "dim7",
    mode: "Diminished 7",
    toneIntervals: { R: 0, "3": 3, "5": 6, "7": 9 },
    meta: createShellSeventhMeta("shell-seventh-diminished7", "Diminished 7", 5),
  },
];

const SHELL_SEVENTH_PATTERNS = [
  {
    key: "r73",
    label: "R-7-3",
    // Derived from root-position Drop 2 (R-5-7-3) by removing the 2nd-lowest voice (5)
    toneOrder: ["R", "7", "3"],
    stringOffsets: [0, 2, 3],
    sortOrder: 1,
  },
  {
    key: "r37",
    label: "R-3-7",
    // Adjacent-string shell: root, third, seventh on neighboring strings
    toneOrder: ["R", "3", "7"],
    stringOffsets: [0, 1, 2],
    sortOrder: 2,
  },
];

const shellSeventhShapes = SHELL_SEVENTH_QUALITIES.flatMap((quality) =>
  SHELL_SEVENTH_PATTERNS.map((pattern) =>
    buildVoicingShapeWithVariants({
      id: `shell_seventh_${quality.key}_${pattern.key}`,
      name: pattern.label,
      mode: quality.mode,
      system: "Shell Voicing",
      toneOrder: pattern.toneOrder,
      toneIntervals: quality.toneIntervals,
      stringOffsets: pattern.stringOffsets,
      dragPlacementStarts: [0, 1, 2],
      anchorHintLabel: "拖拽时可选弦组：6弦组 / 5弦组 / 4弦组",
      ...quality.meta,
      sortOrder: pattern.sortOrder,
    })
  )
);

const TRIAD_INVERSIONS = [
  {
    id: "root_position",
    name: "Root Position",
    toneOrder: ["R", "3", "5"],
    sortOrder: 1,
  },
  {
    id: "first_position",
    name: "First Position",
    toneOrder: ["3", "5", "R"],
    sortOrder: 2,
  },
  {
    id: "second_position",
    name: "Second Position",
    toneOrder: ["5", "R", "3"],
    sortOrder: 3,
  },
];

const TRIAD_QUALITIES = [
  {
    key: "major",
    mode: "Major",
    toneIntervals: { R: 0, "3": 4, "5": 7 },
    meta: TRIADS_MAJOR_META,
  },
  {
    key: "minor",
    mode: "Minor",
    toneIntervals: { R: 0, "3": 3, "5": 7 },
    meta: TRIADS_MINOR_META,
  },
  {
    key: "diminished",
    mode: "Diminished",
    toneIntervals: { R: 0, "3": 3, "5": 6 },
    meta: TRIADS_DIMINISHED_META,
  },
  {
    key: "augmented",
    mode: "Augmented",
    toneIntervals: { R: 0, "3": 4, "5": 8 },
    meta: TRIADS_AUGMENTED_META,
  },
];

const triadShapes = TRIAD_QUALITIES.flatMap((quality) =>
  TRIAD_INVERSIONS.map((inversion) =>
    buildVoicingShapeWithVariants({
      id: `triads_${quality.key}_${inversion.id}`,
      name: inversion.name,
      mode: quality.mode,
      system: "Triads",
      toneOrder: inversion.toneOrder,
      toneIntervals: quality.toneIntervals,
      stringOffsets: [0, 1, 2],
      dragPlacementStarts: [0, 1, 2, 3],
      anchorHintLabel: "拖拽时可选弦组：6-5-4 / 5-4-3 / 4-3-2 / 3-2-1",
      ...quality.meta,
      sortOrder: inversion.sortOrder,
    })
  )
);

const susChordShapes = [
  ...[0, 1, 2].map((stringSetStart, index) =>
    buildDrop2VariantShape(
      {
        id: `sus_chords_sus2_drop2_root_${6 - stringSetStart}`,
        name: `Root on ${ROOT_STRING_LABELS[stringSetStart]}`,
        mode: "7sus2",
        system: "Drop 2",
        toneOrder: DROP2_INVERSIONS[0].toneOrder,
        toneIntervals: { R: 0, "3": 2, "5": 7, "7": 10 },
        ...SUS2_DROP2_META,
        sortOrder: index + 1,
      },
      stringSetStart
    )
  ),
  ...[0, 1].map((stringSetStart, index) =>
    buildVoicingVariantShape(
      {
        id: `sus_chords_sus2_drop3_root_${6 - stringSetStart}`,
        name: `Root on ${ROOT_STRING_LABELS[stringSetStart]}`,
        mode: "7sus2",
        system: "Drop 3",
        toneOrder: DROP3_INVERSIONS[0].toneOrder,
        toneIntervals: { R: 0, "3": 2, "5": 7, "7": 10 },
        stringOffsets: [0, 2, 3, 4],
        ...SUS2_DROP3_META,
        sortOrder: index + 1,
      },
      stringSetStart
    )
  ),
  buildVoicingShapeWithVariants({
    id: "sus_chords_sus2_triads",
    name: "Triads",
    mode: "Sus2",
    system: "Triads",
    toneOrder: TRIAD_INVERSIONS[0].toneOrder,
    toneIntervals: { R: 0, "3": 2, "5": 7 },
    stringOffsets: [0, 1, 2],
    dragPlacementStarts: [0, 1, 2, 3],
    anchorHintLabel: "拖拽时可选弦组：6-5-4 / 5-4-3 / 4-3-2 / 3-2-1",
    ...SUS2_TRIADS_META,
    sortOrder: 1,
  }),
  ...[0, 1, 2].map((stringSetStart, index) =>
    buildDrop2VariantShape(
      {
        id: `sus_chords_sus4_drop2_root_${6 - stringSetStart}`,
        name: `Root on ${ROOT_STRING_LABELS[stringSetStart]}`,
        mode: "7sus4",
        system: "Drop 2",
        toneOrder: DROP2_INVERSIONS[0].toneOrder,
        toneIntervals: { R: 0, "3": 5, "5": 7, "7": 10 },
        ...SUS4_DROP2_META,
        sortOrder: index + 1,
      },
      stringSetStart
    )
  ),
  ...[0, 1].map((stringSetStart, index) =>
    buildVoicingVariantShape(
      {
        id: `sus_chords_sus4_drop3_root_${6 - stringSetStart}`,
        name: `Root on ${ROOT_STRING_LABELS[stringSetStart]}`,
        mode: "7sus4",
        system: "Drop 3",
        toneOrder: DROP3_INVERSIONS[0].toneOrder,
        toneIntervals: { R: 0, "3": 5, "5": 7, "7": 10 },
        stringOffsets: [0, 2, 3, 4],
        ...SUS4_DROP3_META,
        sortOrder: index + 1,
      },
      stringSetStart
    )
  ),
  buildVoicingShapeWithVariants({
    id: "sus_chords_sus4_triads",
    name: "Triads",
    mode: "Sus4",
    system: "Triads",
    toneOrder: TRIAD_INVERSIONS[0].toneOrder,
    toneIntervals: { R: 0, "3": 5, "5": 7 },
    stringOffsets: [0, 1, 2],
    dragPlacementStarts: [0, 1, 2, 3],
    anchorHintLabel: "拖拽时可选弦组：6-5-4 / 5-4-3 / 4-3-2 / 3-2-1",
    ...SUS4_TRIADS_META,
    sortOrder: 1,
  }),
];

const diminished7ChordShapes = [
  ...[0, 1, 2].map((stringSetStart, index) =>
    buildVoicingVariantShape(
      {
        id: `dim7_chord_root_${6 - stringSetStart}`,
        name: `Root on ${ROOT_STRING_LABELS[stringSetStart]}`,
        mode: "Diminished 7",
        system: "Diminished 7 Chord",
        toneOrder: ["R", "5", "7", "3"],
        toneIntervals: { R: 0, "3": 3, "5": 6, "7": 9 },
        stringOffsets: [0, 1, 2, 3],
        ...DIM7_CHORD_MOVABLE_META,
        sortOrder: index + 1,
      },
      stringSetStart
    )
  ),
];

const dominant7ArpeggioRecordedShapes = [
  buildShape({
    id: "arpeggio_dom7_shape_1",
    name: "Shape 1",
    mode: "Dominant 7th",
    system: "Arpeggio",
    anchorString: 1,
    rows: [
      [-3, 0],
      [-2, 0],
      [-1],
      [-3, 0],
      [-2],
      [-3, 0],
    ],
    ...ARPEGGIO_DOM7_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "arpeggio_dom7_shape_2",
    name: "Shape 2",
    mode: "Dominant 7th",
    system: "Arpeggio",
    anchorString: 1,
    rows: [
      [0, 3],
      [0],
      [-1, 2],
      [0, 2],
      [2],
      [0, 3],
    ],
    ...ARPEGGIO_DOM7_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "arpeggio_dom7_shape_3",
    name: "Shape 3",
    mode: "Dominant 7th",
    system: "Arpeggio",
    anchorString: 0,
    rows: [
      [-2, 0],
      [-1],
      [-3, 0],
      [-3],
      [-3, 0],
      [-2, 0],
    ],
    ...ARPEGGIO_DOM7_META,
    sortOrder: 3,
  }),
  buildShape({
    id: "arpeggio_dom7_shape_4",
    name: "Shape 4",
    mode: "Dominant 7th",
    system: "Arpeggio",
    anchorString: 0,
    rows: [
      [0],
      [-1, 2],
      [0, 2],
      [1],
      [0, 3],
      [0],
    ],
    ...ARPEGGIO_DOM7_META,
    sortOrder: 4,
  }),
  buildShape({
    id: "arpeggio_dom7_shape_5",
    name: "Shape 5",
    mode: "Dominant 7th",
    system: "Arpeggio",
    anchorString: 2,
    rows: [
      [2],
      [0, 3],
      [0],
      [-1, 2],
      [1, 3],
      [2],
    ],
    ...ARPEGGIO_DOM7_META,
    sortOrder: 5,
  }),
];

const major7ArpeggioDerivedShapes = dominant7ArpeggioRecordedShapes.map((shape) =>
  deriveShapeByIntervalSubstitution(shape, {
    id: shape.id.replace("_dom7_", "_maj7_"),
    mode: "Major 7th",
    system: "Arpeggio",
    intervalMap: { 10: 11 },
    ...ARPEGGIO_MAJ7_META,
    sortOrder: shape.sortOrder,
  })
);

const minor7ArpeggioRecordedShapes = [
  buildShape({
    id: "arpeggio_min7_shape_1",
    name: "Shape 1",
    mode: "Minor 7th",
    system: "Arpeggio",
    anchorString: 1,
    rows: [
      [0, 3],
      [0, 3],
      [2],
      [0, 2],
      [1],
      [0, 3],
    ],
    ...ARPEGGIO_MIN7_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "arpeggio_min7_shape_2",
    name: "Shape 2",
    mode: "Minor 7th",
    system: "Arpeggio",
    anchorString: 0,
    rows: [
      [-2, 0],
      [-2],
      [-3, 0],
      [-3, 0],
      [0],
      [-2, 0],
    ],
    ...ARPEGGIO_MIN7_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "arpeggio_min7_shape_3",
    name: "Shape 3",
    mode: "Minor 7th",
    system: "Arpeggio",
    anchorString: 0,
    rows: [
      [0, 3],
      [2],
      [0, 2],
      [0],
      [0, 3],
      [0, 3],
    ],
    ...ARPEGGIO_MIN7_META,
    sortOrder: 3,
  }),
  buildShape({
    id: "arpeggio_min7_shape_4",
    name: "Shape 4",
    mode: "Minor 7th",
    system: "Arpeggio",
    anchorString: 2,
    rows: [
      [1],
      [0, 3],
      [0, 3],
      [2],
      [1, 3],
      [1],
    ],
    ...ARPEGGIO_MIN7_META,
    sortOrder: 4,
  }),
  buildShape({
    id: "arpeggio_min7_shape_5",
    name: "Shape 5",
    mode: "Minor 7th",
    system: "Arpeggio",
    anchorString: 1,
    rows: [
      [0],
      [-2, 0],
      [-2],
      [-3, 0],
      [-2, 1],
      [0],
    ],
    ...ARPEGGIO_MIN7_META,
    sortOrder: 5,
  }),
];

const halfDiminished7ArpeggioDerivedShapes = minor7ArpeggioRecordedShapes.map((shape) =>
  deriveShapeByIntervalSubstitution(shape, {
    id: shape.id.replace("_min7_", "_m7b5_"),
    mode: "Half-Diminished 7th",
    system: "Arpeggio",
    intervalMap: { 7: 6 },
    ...ARPEGGIO_HALF_DIM7_META,
    sortOrder: shape.sortOrder,
  })
);

const minorPentatonicBoxes = [
  buildReferenceWindowShape({
    id: "minor_pent_box_1",
    name: "Box 1（小调五声音阶）",
    mode: "Minor Pentatonic",
    system: "Pentatonic",
    anchorString: 0,
    anchorFret: 0,
    intervals: INTERVALS.minorPentatonic,
    minFret: 0,
    maxFret: 3,
    ...PENT_MINOR_META,
    sortOrder: 1,
  }),
  buildReferenceWindowShape({
    id: "minor_pent_box_2",
    name: "Box 2（小调五声音阶）",
    mode: "Minor Pentatonic",
    system: "Pentatonic",
    anchorString: 2,
    anchorFret: 2,
    intervals: INTERVALS.minorPentatonic,
    minFret: 2,
    maxFret: 5,
    ...PENT_MINOR_META,
    sortOrder: 2,
  }),
  buildReferenceWindowShape({
    id: "minor_pent_box_3",
    name: "Box 3（小调五声音阶）",
    mode: "Minor Pentatonic",
    system: "Pentatonic",
    anchorString: 1,
    anchorFret: 7,
    intervals: INTERVALS.minorPentatonic,
    minFret: 4,
    maxFret: 8,
    ...PENT_MINOR_META,
    sortOrder: 3,
  }),
  buildReferenceWindowShape({
    id: "minor_pent_box_4",
    name: "Box 4（小调五声音阶）",
    mode: "Minor Pentatonic",
    system: "Pentatonic",
    anchorString: 3,
    anchorFret: 9,
    intervals: INTERVALS.minorPentatonic,
    minFret: 7,
    maxFret: 10,
    ...PENT_MINOR_META,
    sortOrder: 4,
  }),
  buildReferenceWindowShape({
    id: "minor_pent_box_5",
    name: "Box 5（小调五声音阶）",
    mode: "Minor Pentatonic",
    system: "Pentatonic",
    anchorString: 0,
    anchorFret: 12,
    intervals: INTERVALS.minorPentatonic,
    minFret: 9,
    maxFret: 12,
    ...PENT_MINOR_META,
    sortOrder: 5,
  }),
];

const groupedPentatonicShapes = [
  buildShape({
    id: "pentatonic_grouping_3_plus_2",
    name: "3 + 2",
    mode: "Major Pentatonic Scale",
    system: "Pentatonic",
    anchorString: 1,
    rows: [
      [0, 2],
      [0, 2, 4],
      [2, 4],
      [2, 4, 6],
      [5, 7],
      [5, 7, 9],
    ],
    ...PENT_GROUPING_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "pentatonic_grouping_2_plus_3",
    name: "2 + 3",
    mode: "Minor Pentatonic Scale",
    system: "Pentatonic",
    anchorString: 0,
    rows: [
      [-2, 0],
      [-2, 0, 2],
      [0, 2],
      [0, 2, 4],
      [3, 5],
      [3, 5, 7],
    ],
    ...PENT_GROUPING_META,
    sortOrder: 2,
  }),
];

const bluesScaleShapes = [
  buildReferenceWindowShape({
    id: "blues_scale_box_1",
    name: "Box 1 (Blues Scale)",
    mode: "Minor Blues Scale",
    system: "Blues Scale",
    anchorString: 0,
    anchorFret: 0,
    intervals: INTERVALS.bluesMinor,
    minFret: 0,
    maxFret: 3,
    ...BLUES_SCALE_BOX_META,
    sortOrder: 1,
  }),
  buildReferenceWindowShape({
    id: "blues_scale_box_2",
    name: "Box 2 (Blues Scale)",
    mode: "Minor Blues Scale",
    system: "Blues Scale",
    anchorString: 2,
    anchorFret: 2,
    intervals: INTERVALS.bluesMinor,
    minFret: 2,
    maxFret: 5,
    ...BLUES_SCALE_BOX_META,
    sortOrder: 2,
  }),
  buildReferenceWindowShape({
    id: "blues_scale_box_3",
    name: "Box 3 (Blues Scale)",
    mode: "Minor Blues Scale",
    system: "Blues Scale",
    anchorString: 1,
    anchorFret: 7,
    intervals: INTERVALS.bluesMinor,
    minFret: 4,
    maxFret: 8,
    ...BLUES_SCALE_BOX_META,
    sortOrder: 3,
  }),
  buildReferenceWindowShape({
    id: "blues_scale_box_4",
    name: "Box 4 (Blues Scale)",
    mode: "Minor Blues Scale",
    system: "Blues Scale",
    anchorString: 3,
    anchorFret: 9,
    intervals: INTERVALS.bluesMinor,
    minFret: 7,
    maxFret: 10,
    ...BLUES_SCALE_BOX_META,
    sortOrder: 4,
  }),
  buildReferenceWindowShape({
    id: "blues_scale_box_5",
    name: "Box 5 (Blues Scale)",
    mode: "Minor Blues Scale",
    system: "Blues Scale",
    anchorString: 0,
    anchorFret: 12,
    intervals: INTERVALS.bluesMinor,
    minFret: 9,
    maxFret: 12,
    ...BLUES_SCALE_BOX_META,
    sortOrder: 5,
  }),
];

const groupedBluesScaleShapes = [
  buildShape({
    id: "blues_grouping_3_plus_2",
    name: "3 + 2",
    mode: "Major Blues Scale",
    system: "Blues Scale",
    anchorString: 1,
    rows: [
      [0, 2],
      [0, 2, 3, 4],
      [2, 4],
      [2, 4, 5, 6],
      [5, 7],
      [5, 7, 8, 9],
    ],
    ...BLUES_GROUPING_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "blues_grouping_2_plus_3",
    name: "2 + 3",
    mode: "Minor Blues Scale",
    system: "Blues Scale",
    anchorString: 0,
    rows: [
      [-2, 0],
      [-2, 0, 1, 2],
      [0, 2],
      [0, 2, 3, 4],
      [3, 5],
      [3, 5, 6, 7],
    ],
    ...BLUES_GROUPING_META,
    sortOrder: 2,
  }),
];

const diminishedScaleShapes = [
  buildShape({
    id: "diminished_scale_st_vertical",
    name: "Diminished Scale S-T",
    mode: "Vertical",
    system: "Diminished Scale",
    anchorString: 0,
    rows: [
      [0, 1, 3, 4],
      [1, 2, 4],
      [0, 2, 3],
      [0, 1, 3],
      [0, 2, 3],
      [0, 1, 3, 4],
    ],
    ...DIMINISHED_SCALE_VERTICAL_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "diminished_scale_ts_vertical",
    name: "Diminished Scale T-S",
    mode: "Vertical",
    system: "Diminished Scale",
    anchorString: 0,
    rows: [
      [-1, 0, 2, 3],
      [0, 1, 3],
      [-1, 1, 2],
      [-1, 0, 2],
      [-1, 1, 2],
      [-1, 0, 2, 3],
    ],
    ...DIMINISHED_SCALE_VERTICAL_META,
    sortOrder: 2,
  }),
  buildShape({
    id: "diminished_scale_st_diagonal",
    name: "Diminished Scale S-T",
    mode: "Diagonal",
    system: "Diminished Scale",
    anchorString: 0,
    rows: [
      [0, 1, 3, 4],
      [1, 2, 4, 5],
      [2, 3, 5, 6],
      [3, 4, 6, 7],
      [5, 6, 8, 9],
      [6, 7, 9, 10],
    ],
    ...DIMINISHED_SCALE_DIAGONAL_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "diminished_scale_ts_diagonal",
    name: "Diminished Scale T-S",
    mode: "Diagonal",
    system: "Diminished Scale",
    anchorString: 0,
    rows: [
      [-1, 0, 2, 3],
      [0, 1, 3, 4],
      [1, 2, 4, 5],
      [2, 3, 5, 6],
      [4, 5, 7, 8],
      [5, 6, 8, 9],
    ],
    ...DIMINISHED_SCALE_DIAGONAL_META,
    sortOrder: 2,
  }),
];

const wholeToneScaleShapes = [
  buildReferenceWindowShape({
    id: "whole_tone_scale_horizontal",
    name: "Whole Tone Scale (Vertical)",
    mode: "Vertical",
    system: "Whole Tone Scale",
    anchorString: 0,
    anchorFret: 0,
    intervals: INTERVALS.wholeTone,
    minFret: 0,
    maxFret: 5,
    ...WHOLE_TONE_SCALE_HORIZONTAL_META,
    sortOrder: 1,
  }),
  buildShape({
    id: "whole_tone_scale_diagonal",
    name: "Whole Tone Scale (Diagonal)",
    mode: "Diagonal",
    system: "Whole Tone Scale",
    anchorString: 0,
    rows: [
      [0, 2, 4],
      [1, 3, 5],
      [2, 4, 6],
      [3, 5, 7],
      [4, 6, 8],
      [5, 7, 9],
    ],
    ...WHOLE_TONE_SCALE_DIAGONAL_META,
    sortOrder: 2,
  }),
];

const majorModeOrder = [
  ["ionian", "Ionian", [0, 2, 4, 5, 7, 9, 11]],
  ["dorian", "Dorian", [0, 2, 3, 5, 7, 9, 10]],
  ["phrygian", "Phrygian", [0, 1, 3, 5, 7, 8, 10]],
  ["lydian", "Lydian", [0, 2, 4, 6, 7, 9, 11]],
  ["mixolydian", "Mixolydian", [0, 2, 4, 5, 7, 9, 10]],
  ["aeolian", "Aeolian", [0, 2, 3, 5, 7, 8, 10]],
  ["locrian", "Locrian", [0, 1, 3, 5, 6, 8, 10]],
];

const naturalMinorModeOrder = [
  ["aeolian", "Aeolian"],
  ["locrian", "Locrian"],
  ["ionian", "Ionian"],
  ["dorian", "Dorian"],
  ["phrygian", "Phrygian"],
  ["lydian", "Lydian"],
  ["mixolydian", "Mixolydian"],
];

const melodicMinorModeOrder = [
  ["Melodic Minor", [0, 2, 3, 5, 7, 9, 11]],
  ["Dorian b2", [0, 1, 3, 5, 7, 9, 10]],
  ["Phrygian #5", [0, 2, 4, 6, 8, 9, 11]],
  ["Lydian Dominant", [0, 2, 4, 6, 7, 9, 10]],
  ["Mixolydian b6", [0, 2, 4, 5, 7, 8, 10]],
  ["Aeolian b5", [0, 2, 3, 5, 6, 8, 10]],
  ["Super Locrian", [0, 1, 3, 4, 6, 8, 10]],
];

const harmonicMinorModeOrder = [
  ["Harmonic Minor", [0, 2, 3, 5, 7, 8, 11]],
  ["Locrian #6", [0, 1, 3, 5, 6, 9, 10]],
  ["Ionian #5", [0, 2, 4, 5, 8, 9, 11]],
  ["Dorian #4", [0, 2, 3, 6, 7, 9, 10]],
  ["Phrygian Dominant", [0, 1, 4, 5, 7, 8, 10]],
  ["Lydian #2", [0, 3, 4, 6, 7, 9, 11]],
  ["Super Locrian bb7", [0, 1, 3, 4, 6, 8, 9]],
];

function buildModeIntervalMap(sourceIntervals, targetIntervals) {
  const map = {};
  sourceIntervals.forEach((sourceInterval, degreeIndex) => {
    map[sourceInterval] = targetIntervals[degreeIndex];
  });
  return map;
}

const major3NpsShapes = majorModeOrder.map(([modeKey, modeLabel], index) =>
  buildShape({
    id: `major_3nps_shape_${index + 1}`,
    name: modeLabel,
    mode: `${modeLabel} · 3NPS`,
    system: "3NPS",
    anchorString: 0,
    rows: THREE_NPS_MODE_ROWS[modeKey],
    ...THREE_NPS_MAJOR_META,
    sortOrder: index + 1,
  })
);

const naturalMinor3NpsShapes = naturalMinorModeOrder.map(([modeKey, modeLabel], index) =>
  buildShape({
    id: `natural_minor_3nps_shape_${index + 1}`,
    name: modeLabel,
    mode: `${modeLabel} · 3NPS`,
    system: "3NPS",
    anchorString: 0,
    rows: THREE_NPS_MODE_ROWS[modeKey],
    ...THREE_NPS_MINOR_META,
    sortOrder: index + 1,
  })
);

const melodicMinor3NpsShapes = major3NpsShapes.map((shape, index) =>
  deriveShapeByIntervalSubstitution(shape, {
    id: `melodic_minor_3nps_shape_${index + 1}`,
    name: melodicMinorModeOrder[index][0],
    mode: `${melodicMinorModeOrder[index][0]} · 3NPS`,
    system: "3NPS",
    intervalMap: buildModeIntervalMap(majorModeOrder[index][2], melodicMinorModeOrder[index][1]),
    ...THREE_NPS_MELODIC_MINOR_META,
    sortOrder: index + 1,
  })
);

const harmonicMinor3NpsShapes = major3NpsShapes.map((shape, index) =>
  deriveShapeByIntervalSubstitution(shape, {
    id: `harmonic_minor_3nps_shape_${index + 1}`,
    name: harmonicMinorModeOrder[index][0],
    mode: `${harmonicMinorModeOrder[index][0]} · 3NPS`,
    system: "3NPS",
    intervalMap: buildModeIntervalMap(majorModeOrder[index][2], harmonicMinorModeOrder[index][1]),
    ...THREE_NPS_HARMONIC_MINOR_META,
    sortOrder: index + 1,
  })
);

export const SCALE_SHAPES = [
  ...cagedChordShapes,
  ...fiveMajorScaleShapes,
  ...fiveMelodicMinorScaleShapes,
  ...fiveHarmonicMinorScaleShapes,
  ...drop2ChordShapes,
  ...drop3ChordShapes,
  ...shellTriadShapes,
  ...shellSeventhShapes,
  ...triadShapes,
  ...susChordShapes,
  ...diminished7ChordShapes,
  ...dominant7ArpeggioRecordedShapes,
  ...major7ArpeggioDerivedShapes,
  ...minor7ArpeggioRecordedShapes,
  ...halfDiminished7ArpeggioDerivedShapes,
  ...minorPentatonicBoxes,
  ...groupedPentatonicShapes,
  ...bluesScaleShapes,
  ...groupedBluesScaleShapes,
  ...diminishedScaleShapes,
  ...wholeToneScaleShapes,
  ...major3NpsShapes,
  ...melodicMinor3NpsShapes,
  ...harmonicMinor3NpsShapes,
];
