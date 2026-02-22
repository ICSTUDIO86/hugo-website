const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const {
  normalizeForDisplay,
  normalizeMeasure
} = require('../jianpu-normalize.js');

function n(dur, midi = 60) { return { type: 'note', duration: dur, midi }; }

const cases = [
  // 1) quarter + eighth -> dotted quarter
  () => {
    const notes = normalizeMeasure([n('quarter'), n('eighth')], '4/4');
    assert(notes.length === 1 && notes[0].duration === 'quarter.', 'q+e => dotted quarter');
  },
  // 2) eighth + 16th -> dotted eighth
  () => {
    const notes = normalizeMeasure([n('eighth'), n('16th')], '4/4');
    assert(notes.length === 1 && notes[0].duration === 'eighth.', 'e+16 => dotted eighth');
  },
  // 3) different pitch -> no merge
  () => {
    const notes = normalizeMeasure([n('quarter', 60), n('eighth', 62)], '4/4');
    assert(notes.length === 2, 'different pitch should not merge');
  },
  // 4) gap (non-contiguous) -> no merge
  () => {
    const notes = normalizeMeasure([n('quarter'), n('quarter')], '4/4');
    assert(notes.length === 2, 'gap should not merge');
  },
  // 5) cross measure (handled by per-measure normalize) -> no merge across measures
  () => {
    const md = {
      melody: [ { notes: [n('quarter'), n('eighth')] }, { notes: [n('eighth')] } ],
      config: { timeSignature: '4/4' }
    };
    const res = normalizeForDisplay(md);
    assert(res.melody[0].notes.length === 1, 'within measure merged');
    assert(res.melody[1].notes.length === 1, 'second measure intact');
  },
  // 6) cross group boundary (half-measure) -> no merge
  () => {
    // In 4/4 groupSize = 2. First note length 2 (half), second 0.5 starts at 2.0 => different group, no merge
    const notes = normalizeMeasure([n('half'), n('eighth')], '4/4');
    assert(notes.length === 2, 'cross group should not merge');
  }
];

cases.forEach((fn, i) => {
  fn();
  console.log(`Case ${i + 1} passed`);
});
