const NOTE_NAMES = {
  sharps: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  // IC naming priority: prefer F# over Gb, and prefer Eb/Bb/Db/Ab over their sharp enharmonics.
  flats: ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
};
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_NOTE_INDEX = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const MAJOR_DEGREE_SEMITONES = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

const NOTE_INDEX = {};
NOTE_NAMES.sharps.forEach((name, index) => {
  NOTE_INDEX[name] = index;
  NOTE_INDEX[NOTE_NAMES.flats[index]] = index;
});

export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"];

export function getNoteIndex(name) {
  return NOTE_INDEX[name.replace(/\d/g, "")];
}

export function getNoteName(noteIndex, preference = "sharps") {
  const normalized = ((noteIndex % 12) + 12) % 12;
  return NOTE_NAMES[preference][normalized];
}

export function getPositionNoteIndex(stringIndex, fret) {
  const openIndex = getNoteIndex(STANDARD_TUNING[stringIndex]);
  return (openIndex + fret) % 12;
}

function mod12(value) {
  return ((value % 12) + 12) % 12;
}

function parseAccidentalOffset(accidentals = "") {
  let offset = 0;
  for (const char of accidentals) {
    if (char === "#") {
      offset += 1;
    } else if (char === "b") {
      offset -= 1;
    }
  }
  return offset;
}

function formatAccidentals(offset) {
  if (offset === 0) {
    return "";
  }
  if (offset > 0) {
    return "#".repeat(offset);
  }
  return "b".repeat(Math.abs(offset));
}

function parseNoteSpelling(noteName) {
  const match = `${noteName}`.match(/^([A-G])([#b]*)$/);
  if (!match) {
    return null;
  }
  const [, letter, accidentalPart] = match;
  return {
    letter,
    accidentals: accidentalPart,
    accidentalOffset: parseAccidentalOffset(accidentalPart),
  };
}

function parseDegreeToken(token) {
  const normalized = token === "R" ? "1" : `${token}`.trim();
  const match = normalized.match(/^((?:bb|##|b|#)?)(\d+)$/);
  if (!match) {
    return null;
  }
  const [, accidentalPart, degreePart] = match;
  const degree = Number(degreePart);
  const baseSemitone = MAJOR_DEGREE_SEMITONES[degree];
  if (!Number.isInteger(baseSemitone)) {
    return null;
  }
  return {
    degree,
    accidentalPart,
    accidentalOffset: parseAccidentalOffset(accidentalPart),
    semitone: baseSemitone + parseAccidentalOffset(accidentalPart),
  };
}

export function spellNoteFromRootAndDegree(rootNoteName, degreeToken) {
  const root = parseNoteSpelling(rootNoteName);
  const degree = parseDegreeToken(degreeToken);
  if (!root || !degree) {
    return null;
  }

  const rootLetterIndex = LETTERS.indexOf(root.letter);
  if (rootLetterIndex < 0) {
    return null;
  }

  const targetLetter = LETTERS[(rootLetterIndex + degree.degree - 1) % LETTERS.length];
  const rootPitchClass = mod12(NATURAL_NOTE_INDEX[root.letter] + root.accidentalOffset);
  const targetPitchClass = mod12(rootPitchClass + degree.semitone);
  const targetNaturalPitchClass = NATURAL_NOTE_INDEX[targetLetter];

  let accidentalOffset = targetPitchClass - targetNaturalPitchClass;
  while (accidentalOffset > 6) accidentalOffset -= 12;
  while (accidentalOffset < -6) accidentalOffset += 12;

  return `${targetLetter}${formatAccidentals(accidentalOffset)}`;
}
