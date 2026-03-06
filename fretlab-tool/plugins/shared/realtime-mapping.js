export const STANDARD_GUITAR_OPEN_MIDI = [40, 45, 50, 55, 59, 64];

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function getTabPositionsFromMidi(midiNote, maxFret = 24) {
  if (!isNumber(midiNote)) {
    return [];
  }
  const fretLimit = Math.max(0, Math.floor(Number(maxFret) || 0));
  const normalizedMidi = Math.round(midiNote);
  const positions = [];

  for (let stringIndex = 0; stringIndex < STANDARD_GUITAR_OPEN_MIDI.length; stringIndex += 1) {
    const openMidi = STANDARD_GUITAR_OPEN_MIDI[stringIndex];
    const fret = normalizedMidi - openMidi;
    if (fret >= 0 && fret <= fretLimit) {
      positions.push({ stringIndex, fret });
    }
  }

  return positions;
}

function scorePosition(position, preferredPosition, previousFret) {
  let score = position.fret;

  if (preferredPosition && preferredPosition.stringIndex === position.stringIndex) {
    score -= 1.5;
  }

  if (isNumber(previousFret)) {
    score += Math.abs(position.fret - previousFret) * 0.35;
  }

  score += position.stringIndex * 0.08;
  return score;
}

export function pickBestTabPosition(positions, options = {}) {
  if (!Array.isArray(positions) || !positions.length) {
    return null;
  }

  const preferredPosition = options.preferredPosition ?? null;
  const previousFret = options.previousFret;

  const ranked = positions
    .map((position) => ({
      position,
      score: scorePosition(position, preferredPosition, previousFret),
    }))
    .sort((a, b) => a.score - b.score);

  return ranked[0].position;
}
