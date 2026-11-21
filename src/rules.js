// Owner: A
export const TUNING = {
  ages: [0, 8, 15, 20, 26, 33, 41, 50, 60, 70, 80, 90],
  death: [0, 0.01, 0.01, 0.02, 0.03, 0.05, 0.09, 0.17, 0.32, 0.5, 1],
  risks: { safe: [0, 1, 1], bold: [0.02, 1.5, 1.3], wild: [0.05, 2, 1.6] },
  startingLuck: 70,
  maxLuck: 100,
  replantCost: 20,
  maxReplants: 3,
  tones: [60, 40, 20],
  greatBase: 0.1,
  goodBase: 0.25,
  badBase: 0.15,
  greatDivisor: 500,
  goodDivisor: 400,
  badDivisor: 300,
  deathDivisor: 300,
  luckCap: 85,
  morals: { kind: 2, neutral: 0, selfish: -5, cruel: -10 },
  tilt: 0.1,
  modifierRisk: 0.03,
  saveChance: 0.5,
  bondLimit: 3,
  talks: 3,
  delay: 2,
  collection: 10,
};
const t = TUNING;
export function chapterInfo(chapter) {
  const [lo, hi] = t.ages.slice(chapter, chapter + 2);
  return { lo, hi, ages: lo + '-' + hi, base: t.death[chapter] };
}
export function toneWord(luck) {
  return ['fortunate', 'uncertain', 'ill-starred', 'cursed'][
    t.tones.filter((value) => luck < value).length
  ];
}
export function createRng(state) {
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let v = Math.imul(state ^ (state >>> 15), state | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  }
  Object.defineProperty(next, 'state', { get: () => state >>> 0 });
  return next;
}
export function outcomeWeights(luck, risk) {
  const [, up, down] = t.risks[risk];
  const great = (t.greatBase + luck / t.greatDivisor) * up;
  const good = t.goodBase + luck / t.goodDivisor;
  const bad = (t.badBase + (t.maxLuck - luck) / t.badDivisor) * down;
  const total = great + good + bad,
    scale = Math.max(1, total);
  return {
    great: great / scale,
    good: good / scale,
    mixed: Math.max(0, 1 - total),
    bad: bad / scale,
  };
}
export const clampLuck = (v) => Math.max(0, Math.min(t.luckCap, v));
const ladder = [
  ['yesno', 0, 5, 2, 2, 3, 20],
  ['yesno', 0, 6, 2, 2, 4, 22],
  ['choice', 0, 6, 2, 2, 6, 26],
  ['choice', 0, 8, 2, 3, 7, 30],
  ['choice', 0, 10, 3, 3, 8, 34],
  ['open', 10, 14, 3, 3, 10, 38],
  ['deep', 12, 20, 3, 4, 12, 42],
  ['deep', 14, 22, 3, 4, 13, 45],
  ['deep', 18, 28, 4, 4, 15, 45],
];
export function formatFor(chapter) {
  const row = ladder[chapter - 1];
  if (!row) return null;
  const [format, min, max, lo, hi, choice_words, narration_words] = row;
  return {
    format,
    question_words: [min, max],
    choice_count: [lo, hi],
    choice_words,
    narration_words,
  };
}
export function shiftedWeights(luck, risk, blessing, omen) {
  const w = outcomeWeights(luck, risk);
  function shift(to, from) {
    let left = t.tilt;
    for (const key of from) {
      const amount = Math.min(left, w[key]);
      w[key] -= amount;
      w[to] += amount;
      left -= amount;
    }
  }
  if (blessing) shift('great', ['bad', 'mixed']);
  if (omen) shift('bad', ['great', 'good']);
  return w;
}
export function rollOutcome(
  { luck, chapter, risk, blessing, omen, fate, debtDue, wishDue, saver },
  rng,
) {
  const [death, draw, age, rescue] = [rng(), rng(), rng(), rng()],
    { lo, hi, base } = chapterInfo(chapter);
  const chance = Math.max(
    0,
    Math.min(
      1,
      base +
        (t.startingLuck - luck) / t.deathDivisor +
        t.risks[risk][0] +
        ((omen ? 1 : 0) - (blessing ? 1 : 0)) * t.modifierRisk,
    ),
  );
  const died = chapter === 10 || (!fate && death < chance);
  const savedBy =
    died && chapter < 10 && saver && rescue < t.saveChance ? saver : null;
  if (died && !savedBy)
    return {
      outcome: 'death',
      deathAge: lo + Math.floor(age * (hi - lo)),
      savedBy: null,
      forced: null,
    };
  const forced = fate ? 'fate' : debtDue ? 'debt' : wishDue ? 'wish' : null;
  let outcome = 'bad',
    sum = 0;
  if (forced) outcome = { fate: 'great', debt: 'bad', wish: 'mixed' }[forced];
  else if (!savedBy)
    for (const [key, w] of Object.entries(
      shiftedWeights(luck, risk, blessing, omen),
    )) {
      sum += w;
      if (draw < sum) {
        outcome = key;
        break;
      }
    }
  return { outcome, deathAge: null, savedBy, forced };
}
