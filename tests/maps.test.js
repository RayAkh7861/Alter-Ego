// Owner: B
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEraMap, pathBetween, nearbyAreas } from '../src/world/maps.js';
import { spawnStrangers } from '../src/world/strangers.js';
import { regretSees } from '../src/world/regrets.js';

test('era maps are connected and locked keys are accessible', () => {
  const required = {
    1: ['bedroom', 'kitchen', 'lane', 'roots'],
    2: ['flat', 'stairwell', 'avenue', 'office_floor'],
    3: ['old_house', 'lane_winter', 'roots_winter'],
  };
  for (let act = 1; act <= 3; act++) {
    for (let seed = 0; seed < 20; seed++) {
      const sets = new Set();
      for (let life = 1; life <= 4; life++) {
        const map = buildEraMap(act, { seed, life, rot: life - 1 });
        sets.add(Object.keys(map.areas).sort().join(','));
        for (const id of required[act]) assert.ok(map.areas[id]);
        for (const area of Object.values(map.areas)) {
          assert.ok(pathBetween(map, map.start, area.id));
          assert.ok(area.lights.length);
          assert.ok(area.markerSlots.length);
          assert.ok(nearbyAreas(map, area.id).length >= 5);
          assert.ok(!nearbyAreas(map, area.id).some((a) => a.id === area.id));
          for (const link of [...area.exits, ...area.doors, ...area.climbs]) {
            const dest = map.areas[link.to];
            assert.ok(link.toX >= dest.walk[0] && link.toX <= dest.walk[1]);
            assert.ok(
              [...dest.exits, ...dest.doors, ...dest.climbs].some(
                (back) => back.to === area.id,
              ),
            );
          }
        }
        assert.ok(!nearbyAreas(map, map.start).some((a) => a.id === map.start));
        assert.ok(map.lockedArea);
        assert.equal(map.keepsakes.length, 2);
        assert.ok(Object.values(map.areas).flatMap((a) => a.hides).length >= 3);
        const open = { ...map, links: map.links.filter((l) => !l.locked) };
        assert.ok(pathBetween(open, map.start, map.keepsakes[0].area));
        assert.equal(pathBetween(open, map.start, map.lockedArea), null);
        assert.equal(map.keepsakes[0].area, map.start);
        assert.notEqual(map.keepsakes[0].area, map.lockedArea);
      }
      assert.ok(sets.size > 1);
    }
  }
});

test('strangers are deterministic and exclude already encountered people', () => {
  const map = buildEraMap(1, { seed: 42, life: 1 });
  const game = {
    seed: 42,
    replants: 0,
    lifeNumber: 1,
    nodes: { n1: { life: 1, parentId: null, events: [] } },
  };
  const first = spawnStrangers(game, 'n1', map);
  assert.deepEqual(first, spawnStrangers(game, 'n1', map));
  assert.ok(first.length <= 2 && first.every((s) => s.area !== map.start));
  game.nodes.n1.events.push({ type: 'encounter', strangerId: first[0].id });
  assert.ok(spawnStrangers(game, 'n1', map).every((s) => s.id !== first[0].id));
});

test('regret sight respects direction, hiding, crouching and noise', () => {
  const regret = { x: 100, direction: 1 };
  assert.ok(regretSees(regret, { x: 150 }));
  assert.ok(!regretSees(regret, { x: 50 }));
  assert.ok(!regretSees(regret, { x: 150, crouching: true }));
  assert.ok(!regretSees(regret, { x: 101, hidden: true, running: true }));
  assert.ok(regretSees(regret, { x: 60, running: true }));
});
test('a stranger from an earlier page stays met and the caller requires a rewrite', () => {
  const map = buildEraMap(3, { seed: 1 }),
    g = {
      seed: 1,
      replants: 0,
      lifeNumber: 1,
      nodes: {
        a: { area: 'old_house', events: [] },
        b: { parentId: 'a', area: 'roots_winter', events: [] },
      },
    };
  let caller = false;
  for (let seed = 0; seed < 80; seed++) {
    g.seed = seed;
    g.replants = 0;
    g.nodes.a.events = [{ type: 'encounter', strangerId: 'widow' }];
    const list = spawnStrangers(g, 'b', map);
    assert.ok(
      list.every(
        (p) =>
          p.area !== 'roots_winter' && p.id !== 'caller' && p.id !== 'widow',
      ),
    );
    g.replants = 1;
    caller ||= spawnStrangers(g, 'b', map).some((p) => p.id === 'caller');
  }
  assert.ok(caller);
});
