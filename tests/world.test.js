// Owner: B
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScene,
  buildTreehouseScene,
  buildPrologueScene,
} from '../src/world/scenes.js';
import { ageFor } from '../src/world/sprites.js';
import { SETTINGS } from '../src/settings.js';
import { choicePosts } from '../src/screens/common.js';
import { fakeGame } from '../src/fakeGame.js';
test('each setting and season supports walking, looking and three signposts', () => {
  for (const id of SETTINGS)
    for (let chapter = 1; chapter <= 10; chapter++) {
      const s = buildScene(id, { chapter, seed: 23 }),
        [a, b] = s.walk;
      assert.ok(
        0 <= a &&
          a <= s.spawnX &&
          s.spawnX <= b &&
          b < s.width &&
          s.floorY < s.height,
      );
      assert.equal(s.looks.length, 2);
      assert.ok(s.looks.every((l) => l.x >= a && l.x <= b));
      const posts = choicePosts(s, Array(3).fill({ text: 'Go', risk: 'safe' }));
      assert.ok(posts[0].x >= a + (b - a) * 0.55 && posts[2].x <= b);
      assert.ok(posts.every((p, i) => !i || p.x - posts[i - 1].x >= 48));
    }
});
test('fixed scenes and age sprites', () => {
  const p = buildPrologueScene(),
    door = p.stations.find((s) => s.type === 'door');
  assert.ok(door.x >= p.walk[0] && door.x <= p.walk[1]);
  const room = buildTreehouseScene(fakeGame);
  assert.deepEqual(
    new Set(room.stations.map((s) => s.type)),
    new Set(['tree', 'book', 'hatch', 'portrait', 'window', 'gardener']),
  );
  assert.equal(
    room.stations.filter((s) => s.type === 'portrait').length,
    fakeGame.lifeNumber,
  );
  assert.deepEqual(
    Array.from({ length: 11 }, (_, i) => ageFor(i)),
    [
      'child',
      'child',
      'teen',
      'adult',
      'adult',
      'adult',
      'adult',
      'elder',
      'elder',
      'elder',
      'elder',
    ],
  );
});
import {
  BUILDINGS,
  buildingsFor,
  residentsFor,
  gravestones,
} from '../src/world/cast.js';
import { buildInterior } from '../src/world/interiors.js';
import { buildLegacyScene } from '../src/world/scenes.js';
import { lifeState } from '../src/state.js';
test('doors, interiors, churchyard, legacy and reachable rot stations', () => {
  const state = lifeState(fakeGame);
  for (const act of [1, 2, 3]) {
    const chapter = (act - 1) * 4 + 1;
    for (const setting of SETTINGS) {
      const spec = buildScene(setting, { chapter }),
        doors = spec.stations.filter((s) => s.type === 'door');
      assert.equal(doors.length, buildingsFor(act, setting).length);
      doors.forEach((d, i) => {
        assert.ok(d.x <= spec.walk[0] + (spec.walk[1] - spec.walk[0]) * 0.55);
        if (i) assert.ok(d.x - doors[i - 1].x >= 48);
      });
    }
    for (const b of BUILDINGS[act])
      if (b.interior) {
        const residents = residentsFor(b.id, act, state),
          s = buildInterior(b.id, { act, residents, state, game: fakeGame });
        assert.equal(
          s.stations.filter((t) => t.type === 'npc').length,
          residents.length,
        );
        assert.ok(
          [...s.stations, ...s.looks].every(
            (t) => t.x >= s.walk[0] && t.x <= s.walk[1],
          ),
        );
      }
    assert.equal(
      buildLegacyScene(act, {}).buildings.length,
      BUILDINGS[act].length,
    );
  }
  assert.ok(gravestones(state).some((t) => t.startsWith('Maren.')));
  assert.ok(!gravestones(state).some((t) => t.startsWith('Ada.')));
  for (let rot = 0; rot <= 3; rot++) {
    const s = buildTreehouseScene(fakeGame, rot);
    assert.ok(s.stations.every((t) => t.x >= s.walk[0] && t.x <= s.walk[1]));
  }
});
