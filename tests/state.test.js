// Owner: A
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  computeLuck,
  choose,
  replant,
  canReplant,
  lifePath,
  save,
  load,
} from '../src/state.js';
import { fallbackPage } from '../src/fallbacks.js';
import { fakeGame } from '../src/fakeGame.js';
const deps = { fetchPage: async (p) => fallbackPage(p.outcome, p) };
async function finish(g) {
  while (g.status === 'alive') await choose(g, g.currentId, 0, deps);
  return g;
}
test('replay and persistence', async () => {
  const run = () => finish(newGame(9));
  const g = await run();
  assert.deepEqual(g, await run());
  assert.equal(g.status, 'dead');
  assert.ok(lifePath(g).length <= 11);
  const store = new Map();
  save(g, { setItem: (k, v) => store.set(k, v) });
  assert.deepEqual(load({ getItem: (k) => store.get(k) }), g);
});
test('three rewrites end in crumble; every discarded page remains', async () => {
  const g = await finish(newGame(1));
  for (let i = 1; i <= 3; i++) {
    const path = lifePath(g),
      cut = path.findLastIndex((n) =>
        n.choices.some((_, j) => !n.tried.includes(j)),
      ),
      n = path[cut];
    await assert.rejects(replant(g, n.id, n.chosenIndex, deps));
    await replant(
      g,
      n.id,
      n.choices.findIndex((_, j) => !n.tried.includes(j)),
      deps,
    );
    assert.equal(g.luck, computeLuck(g));
    assert.equal(g.lifeNumber, i + 1);
    assert.equal(g.replants, i);
    for (const old of path.slice(cut + 1)) {
      assert.ok(g.nodes[old.id].dead);
      assert.ok(g.erasedMemories.includes(old.summaryLine));
    }
    if (g.status === 'alive') assert.equal(canReplant(g), false);
    await finish(g);
  }
  assert.equal(g.status, 'crumbled');
  assert.equal(canReplant(g), false);
  assert.ok(Object.values(g.nodes).every((n) => n.area));
});
test('duplicate choice rejected before commit', async () => {
  const g = newGame(2);
  let resolve;
  const pending = choose(g, 'n0', 0, {
    fetchPage: (p) =>
      new Promise((r) => {
        resolve = () => r(fallbackPage(p.outcome, p));
      }),
  });
  await assert.rejects(choose(g, 'n0', 0, deps));
  assert.equal(g.currentId, 'n0');
  assert.deepEqual(g.nodes.n0.tried, []);
  resolve();
  await pending;
  assert.equal(Object.keys(fakeGame.nodes).length, 8);
});
import {
  lifeState,
  startTalk,
  finishTalk,
  regretCandidates,
  ensureLegacy,
} from '../src/state.js';
import { fallbackTalk, fallbackLegacy } from '../src/fallbacks.js';
import { createRng, clampLuck } from '../src/rules.js';
const step = (g, i = 0) => choose(g, g.currentId, i, deps);
function safeRoll(g) {
  g.rngState = 1;
} // First draw is above ordinary mortality.
test('fate refusal is atomic, debt beats cost-free fate and a wish matures', async () => {
  const g = newGame(1);
  await step(g);
  const saved = structuredClone(g);
  assert.deepEqual(
    await choose(
      g,
      g.currentId,
      { fate: 'A brass key' },
      { fetchPage: async () => ({ fate_refused: true }) },
    ),
    { refused: true },
  );
  assert.deepEqual(g, saved);
  const fate = await step(g, { fate: 'A brass key' });
  assert.equal(fate.forced, 'fate');
  assert.equal(fate.debt.due, 4);
  await assert.rejects(step(g, { fate: 'A second key' }));
  fate.format = 'deep';
  fate.question = 'What do you keep?';
  safeRoll(g);
  const wish = await step(g);
  assert.equal(wish.wish.due, 4);
  safeRoll(g);
  const debt = await step(g);
  assert.equal(debt.forced, 'debt');
  assert.equal(debt.debtPaid, fate.debt.id);
  assert.equal(debt.luckDelta, 2 - 10);
  safeRoll(g);
  const grant = await step(g);
  assert.equal(grant.forced, 'wish');
  assert.equal(grant.wishGranted, wish.wish.id);
  assert.equal(g.luck, computeLuck(g));
});
test('partner, conversation budget, insight and pruning the derived path', async () => {
  const g = newGame(1);
  const home = await step(g);
  const talkDeps = {
    fetchTalk: async (p) => {
      const t = fallbackTalk(p.npc.id, p);
      Object.assign(t.replies[0], {
        effect: 'insight',
        insight_choice: { text: 'Apply for a grant', risk: 'bold' },
      });
      return t;
    },
  };
  for (const id of ['mother', 'father']) {
    const x = await startTalk(g, id, talkDeps);
    finishTalk(g, id, x, 0);
    assert.equal(g.luck, computeLuck(g));
  }
  assert.equal(home.events.length, 2);
  assert.equal(home.choices.filter((c) => c.insight).length, 1);
  await assert.rejects(startTalk(g, 'mother', talkDeps));
  Object.assign(home.choices[0], { text: 'Marry Ada', flag: 'partner' });
  safeRoll(g);
  const n = await step(g);
  assert.equal(lifeState(g).partner.name, 'Ada');
  safeRoll(g);
  await step(g, { fate: 'Own a farm' });
  await finish(g);
  assert.equal(g.lives.length, 1);
  assert.ok(regretCandidates(g).every((c) => c.node_id !== 'n0'));
  const legacy = await ensureLegacy(g, {
    fetchLegacy: async (p) => fallbackLegacy(p),
  });
  assert.equal(legacy, g.lives[0].legacy);
  await replant(g, home.id, 1, deps);
  const s = lifeState(g);
  assert.equal(s.partner, null);
  assert.equal(s.debts.length, 0);
  assert.deepEqual(s.fateUsedActs, []);
  assert.ok(g.nodes[n.id].dead);
  assert.equal(g.luck, s.luck);
});
test('moral delta precedes the roll, and luck clamps after each event', async () => {
  const g = newGame(1);
  g.nodes.n0.choices[0].moral = 'cruel';
  let seed = 0;
  while (createRng(seed)() <= 0.01 || createRng(seed)() >= 0.043) seed++;
  g.rngState = seed;
  const death = await step(g);
  assert.equal(death.outcome, 'death');
  assert.equal(g.luck, 60);
  for (const target of [0, 85]) {
    death.luckDelta = target === 0 ? -100 : 100;
    assert.equal(computeLuck(g), target);
  }
});
test('fake life retains old legacy, unpaid fate, insight and family bonds', () => {
  const s = lifeState(fakeGame);
  assert.equal(s.luck, fakeGame.luck);
  assert.equal(s.partner.name, 'Ines');
  assert.deepEqual([s.bonds.mother, s.bonds.tom], [1, 2]);
  assert.ok(s.debts.some((d) => !d.paid));
  assert.equal(fakeGame.lives.length, 2);
});
