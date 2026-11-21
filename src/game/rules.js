// OWNER: Person 1
export const CHAPTERS = [[0,8,0],[8,15,.01],[15,20,.02],[20,26,.03],[26,33,.04],[33,41,.05],[41,50,.07],[50,60,.10],[60,70,.15],[70,80,.25],[80,90,1]]
  .map(([start,end,deathRisk],chapter) => ({chapter, ages: `${start}-${end}`, deathRisk}));

export function toneWord(luck) {
  return luck >= 60 ? 'fortunate' : luck >= 40 ? 'uncertain' : luck >= 20 ? 'ill-starred' : 'cursed';
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollOutcome(luck, chapter, risk, rng = Math.random) {
  const band = CHAPTERS[chapter];
  if (!band) throw new RangeError(`Unknown chapter: ${chapter}`);
  if (!['safe', 'bold', 'wild'].includes(risk)) throw new RangeError(`Unknown risk: ${risk}`);
  if (chapter === 10) return 'death';
  const deathChance = Math.min(1, band.deathRisk + (100 - luck) / 400 + ({safe:0,bold:.02,wild:.05})[risk]);
  if (rng() < deathChance) return 'death';
  const weights = {
    great: (.10 + luck / 500) * ({safe:1,bold:1.5,wild:2})[risk],
    good: .25 + luck / 400,
    bad: (.15 + (100 - luck) / 300) * ({safe:1,bold:1.3,wild:1.6})[risk],
  };
  weights.mixed = Math.max(0, 1 - weights.great - weights.good - weights.bad);
  let roll = rng() * Object.values(weights).reduce((sum, value) => sum + value, 0);
  for (const [outcome, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll < 0) return outcome;
  }
  return 'mixed';
}
