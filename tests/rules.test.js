// Owner: A
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rollOutcome,
  createRng,
  outcomeWeights,
  chapterInfo,
} from '../src/rules.js';
test('reference weights and normalized odds', () => {
  for (const [luck, weights] of [
    [70, [0.24, 0.425, 0.085, 0.25]],
    [10, [0.12, 0.275, 0.155, 0.45]],
  ])
    assert.deepEqual(
      Object.values(outcomeWeights(luck, 'safe')).map((n) => +n.toFixed(3)),
      weights,
    );
  for (let i = 0; i <= 100; i++)
    for (const risk of ['safe', 'bold', 'wild'])
      assert.ok(
        Math.abs(
          Object.values(outcomeWeights(i, risk)).reduce((a, b) => a + b) - 1,
        ) < 1e-12,
      );
});
test('seeded outcomes, luck and death ages', () => {
  function run(luck) {
    const rng = createRng(876),
      counts = { death: 0, bad: 0 };
    for (let i = 0; i < 10000; i++) {
      const ch = 1 + (i % 10),
        { outcome, deathAge } = rollOutcome(
          { luck, chapter: ch, risk: 'safe' },
          rng,
        );
      if (ch === 10) assert.equal(outcome, 'death');
      if (outcome === 'death') {
        const { lo, hi } = chapterInfo(ch);
        assert.ok(deathAge >= lo && deathAge < hi);
      }
      if (outcome in counts) counts[outcome]++;
    }
    return counts;
  }
  const low = run(10),
    high = run(70);
  assert.deepEqual(high, run(70));
  assert.ok(low.death > high.death + 500 && low.bad > high.bad + 500);
});
import { formatFor, clampLuck, TUNING, shiftedWeights } from '../src/rules.js';
test('ten thousand lives follow the requested policy', () => {
  function simulate(start) {
    const rng = createRng(334),
      policy = createRng(991);
    let total = 0;
    for (let life = 0; life < 10000; life++) {
      let luck = start;
      for (let chapter = 1; chapter <= 10; chapter++) {
        const r = policy(),
          m = policy();
        luck = clampLuck(
          luck + (m < 0.3 ? 2 : m < 0.7 ? 0 : m < 0.9 ? -5 : -10),
        );
        const roll = rollOutcome(
          { luck, chapter, risk: r < 0.4 ? 'safe' : r < 0.8 ? 'bold' : 'wild' },
          rng,
        );
        if (roll.outcome === 'death') {
          total += chapter;
          break;
        }
        assert.ok(chapter < 10);
      }
    }
    return total / 10000;
  }
  const a = simulate(70),
    b = simulate(30);
  console.log('Mean death chapter, luck 70 and 30:', a, b);
  assert.ok(a >= 6.8 && a <= 8 && a - b >= 1.5);
});
test('four draws, forced outcomes, rescues and act formats', () => {
  for (const [opts, expected] of [
    [{ fate: true }, 'great'],
    [{ fate: true, chapter: 10 }, 'death'],
    [{ debtDue: true, wishDue: true }, 'bad'],
    [{ wishDue: true }, 'mixed'],
    [{ saver: 'tom' }, 'bad'],
  ]) {
    let draws = 0;
    const r = rollOutcome(
      { luck: 70, chapter: 5, risk: 'safe', ...opts },
      () => [opts.saver ? 0 : 0.9, 0.4, 0.3, 0.4][draws++],
    );
    assert.equal(draws, 4);
    assert.equal(r.outcome, expected);
    if (opts.saver) assert.equal(r.savedBy, 'tom');
  }
  const expected = [
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
  for (const [i, args] of expected.entries()) {
    const r = formatFor(i + 1);
    assert.deepEqual(
      [
        r.format,
        ...r.question_words,
        ...r.choice_count,
        r.choice_words,
        r.narration_words,
      ],
      args,
    );
  }
  assert.equal(formatFor(10), null);
});
test('modifier weights, rescue rate and the last chapter', () => {
  for (const luck of [0, 30, 70, 85])
    for (const risk of ['safe', 'bold', 'wild']) {
      const w = shiftedWeights(luck, risk, false, false),
        b = shiftedWeights(luck, risk, true, false),
        o = shiftedWeights(luck, risk, false, true);
      for (const weights of [b, o])
        assert.ok(
          Math.abs(Object.values(weights).reduce((a, b) => a + b) - 1) < 1e-10,
        );
      assert.ok(b.great > w.great && o.great < w.great);
    }
  let saves = 0;
  const rng = createRng(7);
  for (let i = 0; i < 10000; i++) {
    const d = rng();
    let j = 0;
    const p = rollOutcome(
      { luck: 30, risk: 'wild', chapter: 8, saver: 'tom' },
      () => [0, 0.3, 0.1, d][j++],
    );
    if (p.savedBy) saves++;
  }
  assert.ok(saves > 4750 && saves < 5250);
  assert.equal(
    rollOutcome(
      {
        luck: 85,
        risk: 'safe',
        chapter: 10,
        fate: true,
        saver: 'tom',
        blessing: true,
      },
      () => 0,
    ).outcome,
    'death',
  );
});
