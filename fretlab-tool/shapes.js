const OPEN_NOTE_INDEX = [4, 9, 2, 7, 11, 4]; // E A D G B E (low -> high)
const ROOT_STRING_LABELS = ["6th", "5th", "4th", "3rd", "2nd", "1st"];
const STRING_COUNT = OPEN_NOTE_INDEX.length;

const INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
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
  "major-scale-5",
  "五个大调音阶",
  2,
  "major-scale-5-caged-recorded",
  "五个大调音阶",
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
  "Major 7 · 3 Inversions",
  1
);

const DROP3_MINOR7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-minor7",
  "Minor 7 · 3 Inversions",
  2
);

const DROP3_DOM7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-dominant7",
  "Dominant 7 · 3 Inversions",
  3
);

const DROP3_HALF_DIM7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-half-diminished7",
  "Half-Diminished 7 (m7b5) · 3 Inversions",
  4
);

const DROP3_SUS2_7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-sus2-7",
  "7sus2 · 3 Inversions",
  5
);

const DROP3_SUS4_7_META = makeLibraryMeta(
  "drop3",
  "Drop 3 和弦",
  4,
  "drop3-sus4-7",
  "7sus4 · 3 Inversions",
  6
);

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

const TRIADS_SUS2_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus-chords-sus2",
  "Sus2",
  1
);

const TRIADS_SUS4_META = makeLibraryMeta(
  "sus-chords",
  "Sus 和弦",
  5.1,
  "sus-chords-sus4",
  "Sus4",
  2
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

const THREE_NPS_MAJOR_META = makeLibraryMeta(
  "three-nps",
  "大小调音阶（三音固定指式 / 3NPS）",
  7,
  "3nps-major",
  "Major Scale · 7 Shapes",
  1
);

const THREE_NPS_MINOR_META = makeLibraryMeta(
  "three-nps",
  "大小调音阶（三音固定指式 / 3NPS）",
  7,
  "3nps-natural-minor",
  "Natural Minor · 7 Shapes",
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
    sortOrder: 1,
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
    sortOrder: 2,
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
    sortOrder: 3,
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
    sortOrder: 4,
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
    sortOrder: 5,
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
    sortOrder: 1,
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
    sortOrder: 2,
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
    sortOrder: 3,
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
    sortOrder: 4,
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
    sortOrder: 5,
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
    id: "second_position",
    name: "Second Position",
    toneOrder: ["3", "R", "5", "7"],
    sortOrder: 2,
  },
  {
    id: "third_position",
    name: "Third Position",
    toneOrder: ["7", "5", "R", "3"],
    sortOrder: 3,
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
  buildDrop2Shape({
    id: "sus_chords_sus2_drop2",
    name: "Drop 2",
    mode: "7sus2",
    system: "Drop 2",
    toneOrder: DROP2_INVERSIONS[0].toneOrder,
    toneIntervals: { R: 0, "3": 2, "5": 7, "7": 10 },
    ...TRIADS_SUS2_META,
    sortOrder: 1,
  }),
  buildVoicingShapeWithVariants({
    id: "sus_chords_sus2_drop3",
    name: "Drop 3",
    mode: "7sus2",
    system: "Drop 3",
    toneOrder: DROP3_INVERSIONS[0].toneOrder,
    toneIntervals: { R: 0, "3": 2, "5": 7, "7": 10 },
    stringOffsets: [0, 2, 3, 4],
    dragPlacementStarts: [0, 1],
    anchorHintLabel: "拖拽时可选弦组：6弦组 / 5弦组",
    ...TRIADS_SUS2_META,
    sortOrder: 2,
  }),
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
    ...TRIADS_SUS2_META,
    sortOrder: 3,
  }),
  buildDrop2Shape({
    id: "sus_chords_sus4_drop2",
    name: "Drop 2",
    mode: "7sus4",
    system: "Drop 2",
    toneOrder: DROP2_INVERSIONS[0].toneOrder,
    toneIntervals: { R: 0, "3": 5, "5": 7, "7": 10 },
    ...TRIADS_SUS4_META,
    sortOrder: 1,
  }),
  buildVoicingShapeWithVariants({
    id: "sus_chords_sus4_drop3",
    name: "Drop 3",
    mode: "7sus4",
    system: "Drop 3",
    toneOrder: DROP3_INVERSIONS[0].toneOrder,
    toneIntervals: { R: 0, "3": 5, "5": 7, "7": 10 },
    stringOffsets: [0, 2, 3, 4],
    dragPlacementStarts: [0, 1],
    anchorHintLabel: "拖拽时可选弦组：6弦组 / 5弦组",
    ...TRIADS_SUS4_META,
    sortOrder: 2,
  }),
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
    ...TRIADS_SUS4_META,
    sortOrder: 3,
  }),
];

const diminished7ChordShapes = [
  buildVoicingShapeWithVariants({
    id: "dim7_chord_shape_1",
    name: "Shape 1",
    mode: "Diminished 7",
    system: "Diminished 7 Chord",
    toneOrder: ["R", "5", "7", "3"],
    toneIntervals: { R: 0, "3": 3, "5": 6, "7": 9 },
    stringOffsets: [0, 1, 2, 3],
    dragPlacementStarts: [1, 0, 2], // base = root on 5th string (matches recorded shape)
    anchorHintLabel: "拖拽时可选根音弦：6弦 / 5弦 / 4弦",
    ...DIM7_CHORD_MOVABLE_META,
    sortOrder: 1,
  }),
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
      [0],
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

const majorModeOrder = [
  ["ionian", "Ionian (Mode I)"],
  ["dorian", "Dorian (Mode II)"],
  ["phrygian", "Phrygian (Mode III)"],
  ["lydian", "Lydian (Mode IV)"],
  ["mixolydian", "Mixolydian (Mode V)"],
  ["aeolian", "Aeolian (Mode VI)"],
  ["locrian", "Locrian (Mode VII)"],
];

const naturalMinorModeOrder = [
  ["aeolian", "Aeolian (Natural Minor)"],
  ["locrian", "Locrian"],
  ["ionian", "Ionian"],
  ["dorian", "Dorian"],
  ["phrygian", "Phrygian"],
  ["lydian", "Lydian"],
  ["mixolydian", "Mixolydian"],
];

const major3NpsShapes = majorModeOrder.map(([modeKey, modeLabel], index) =>
  buildShape({
    id: `major_3nps_shape_${index + 1}`,
    name: `Shape ${index + 1}`,
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
    name: `Shape ${index + 1}`,
    mode: `${modeLabel} · 3NPS`,
    system: "3NPS",
    anchorString: 0,
    rows: THREE_NPS_MODE_ROWS[modeKey],
    ...THREE_NPS_MINOR_META,
    sortOrder: index + 1,
  })
);

export const SCALE_SHAPES = [
  ...cagedChordShapes,
  ...fiveMajorScaleShapes,
  ...drop2ChordShapes,
  ...drop3ChordShapes,
  ...triadShapes,
  ...susChordShapes,
  ...diminished7ChordShapes,
  ...dominant7ArpeggioRecordedShapes,
  ...major7ArpeggioDerivedShapes,
  ...minor7ArpeggioRecordedShapes,
  ...halfDiminished7ArpeggioDerivedShapes,
  ...minorPentatonicBoxes,
  ...groupedPentatonicShapes,
  ...diminishedScaleShapes,
  ...major3NpsShapes,
];
