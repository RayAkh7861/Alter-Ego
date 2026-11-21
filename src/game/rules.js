// OWNER: Person 1
// Chapter data and outcome formulas will be copied from the main report.
export const CHAPTERS = [];

export function toneWord(_luck) {
  return 'hopeful';
}

export function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6D2B79F5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollOutcome(_luck, _chapter, _risk, _rng = Math.random) {
  return 'good';
}
