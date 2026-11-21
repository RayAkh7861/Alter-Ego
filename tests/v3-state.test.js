// Owner: A
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  recordEvent,
  lifeState,
  wantTally,
  currentWant,
} from '../src/state.js';

test('world events derive inventory and apply a caught penalty once', () => {
  const game = newGame(5);
  for (const id of ['key', 'watch', 'ribbon'])
    recordEvent(game, { type: 'keepsake', item: { id } });
  assert.throws(() =>
    recordEvent(game, { type: 'keepsake', item: { id: 'marble' } }),
  );
  recordEvent(game, { type: 'gift', item: { id: 'watch' }, to: 'mother' });
  assert.deepEqual(
    lifeState(game).keepsakes.map((item) => item.id),
    ['key', 'ribbon'],
  );
  recordEvent(game, { type: 'caught' });
  assert.equal(recordEvent(game, { type: 'caught' }), null);
  assert.equal(game.luck, 65);
  assert.equal(lifeState(game).modifiers.omen, true);
});

test('want ties use the latest tag and chapter five fixes the result', () => {
  const game = newGame(5);
  const root = game.nodes.n0;
  game.nodes.n1 = {
    id: 'n1',
    parentId: root.id,
    chapter: 1,
    want: 'love',
    events: [],
  };
  game.nodes.n2 = {
    id: 'n2',
    parentId: 'n1',
    chapter: 2,
    want: 'wealth',
    events: [],
  };
  game.nodes.n5 = {
    id: 'n5',
    parentId: 'n2',
    chapter: 5,
    want: 'none',
    events: [],
  };
  game.nodes.n6 = {
    id: 'n6',
    parentId: 'n5',
    chapter: 6,
    want: 'love',
    fromDeep: true,
    events: [],
  };
  game.currentId = 'n2';
  assert.equal(currentWant(game), 'Wealth');
  game.currentId = 'n6';
  assert.equal(wantTally(game).love, 5);
  assert.equal(currentWant(game), 'Wealth');
});
import {
  choose,
  replant,
  eraFor,
  startTalk,
  finishTalk,
  finishEncounter,
  ensureLegacy,
  epitaphPayload,
} from '../src/state.js';
import { spawnStrangers } from '../src/world/strangers.js';
import {
  fallbackPage,
  fallbackTalk,
  fallbackLegacy,
} from '../src/fallbacks.js';
const pages = { fetchPage: async (p) => fallbackPage(p.outcome, p) },
  talks = { fetchTalk: async (p) => fallbackTalk(p.npc.id, p) };
const step = (g, i = 0) => {
  g.rngState = 1;
  return choose(g, g.currentId, i, pages);
};
test('a recruiter sets a flag, gifts spend an item and three meetings close the hourglass', async () => {
  let g, node, people;
  for (let seed = 1; seed <= 100; seed++) {
    g = newGame(seed);
    node = await step(g);
    people = spawnStrangers(g, node.id, eraFor(g));
    if (people.some((s) => s.id === 'recruiter')) break;
  }
  const x = await startTalk(g, 'recruiter', talks);
  finishEncounter(g, 'recruiter', x, 0);
  assert.ok(lifeState(g).flags.left_home);
  const item = eraFor(g).keepsakes[1];
  recordEvent(g, { type: 'keepsake', item });
  const mother = await startTalk(g, 'mother', talks);
  finishTalk(
    g,
    'mother',
    mother,
    mother.replies.findIndex((r) => r.item?.id === item.id),
  );
  assert.deepEqual(lifeState(g).keepsakes, []);
  assert.equal(lifeState(g).bonds.mother, 2);
  assert.throws(() => recordEvent(g, { type: 'keepsake', item }));
  const father = await startTalk(g, 'father', talks);
  finishTalk(g, 'father', father, null);
  await assert.rejects(startTalk(g, 'gardener', talks));
});
test('chapter five fixes the incoming choice, a rewrite before the reveal can change it', async () => {
  const g = newGame(1);
  assert.equal(currentWant(g), 'Nothing');
  let first;
  while (g.nodes[g.currentId].chapter < 5) {
    const n = g.nodes[g.currentId];
    if (n.chapter) {
      n.choices[0].want = 'love';
      n.choices[1].want = 'wealth';
    }
    await step(g);
    if (n.chapter === 1) first = n;
  }
  assert.equal(currentWant(g), 'Love');
  const n = g.nodes[g.currentId];
  n.events.push(
    ...Array.from({ length: 9 }, () => ({ type: 'talk', want: 'peace' })),
  );
  assert.equal(currentWant(g), 'Love');
  while (g.status === 'alive') await step(g);
  let payload;
  await ensureLegacy(g, {
    fetchLegacy: async (p) => {
      payload = p;
      return fallbackLegacy(p);
    },
  });
  assert.equal(payload.want, 'Love');
  assert.equal(epitaphPayload(g).want, 'Love');
  assert.ok(Array.isArray(payload.strangers_met));
  g.rngState = 1;
  await replant(g, first.id, 1, pages);
  while (g.nodes[g.currentId].chapter < 5) {
    g.nodes[g.currentId].choices[0].want = 'wealth';
    await step(g);
  }
  assert.equal(currentWant(g), 'Wealth');
});
test('a wish due on the terminal page is granted even when the life ends', async () => {
  const g = newGame(1);
  while (g.nodes[g.currentId].chapter < 8) await step(g);
  const answer = await step(g);
  assert.equal(answer.wish.due, 10);
  const end = await step(g);
  assert.equal(end.outcome, 'death');
  assert.equal(end.wishGranted, answer.wish.id);
  assert.ok(
    lifeState(g).wishes.some((w) => w.id === answer.wish.id && w.granted),
  );
});
test('the request carries the current map, prior choice, chapter limits and the fixed want', async () => {
  const g = newGame(1);
  let previous, request;
  for (let chapter = 1; chapter <= 6; chapter++) {
    const parent = g.nodes[g.currentId],
      choice = parent.choices[0];
    g.rngState = 1;
    const n = await choose(g, g.currentId, 0, {
      fetchPage: async (p) => {
        request = p;
        return fallbackPage(p.outcome, p);
      },
    });
    assert.deepEqual(request.current_area.id, n.area);
    assert.ok(!('setting_hint' in request));
    assert.ok(request.nearby_areas.every((a) => a.id !== n.area));
    if (previous && chapter !== 5) assert.equal(n.area, choice.place);
    if (chapter < 5) {
      assert.equal(request.want, null);
      assert.ok(request.want_leaning);
      assert.ok(!('want_shadow' in request));
    } else {
      assert.equal(request.want, currentWant(g));
      assert.ok(request.want_shadow);
    }
    previous = n;
  }
});
