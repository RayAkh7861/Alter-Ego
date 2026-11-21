// Owner: A
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTalk,
  validateLegacy,
  validateEpitaph,
} from '../src/validate.js';
process.env.AI_PROVIDER = 'openai';
process.env.OPENAI_API_KEY = '';
const { app } = await import('../server.js');
test('no-key HTTP pipeline', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(() => server.close());
  const url = 'http://127.0.0.1:' + server.address().port;
  const health = await (await fetch(url + '/api/health')).json();
  assert.ok(health.ok);
  assert.equal(health.ai, false);
  const res = await fetch(url + '/api/page', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chapter: 5, outcome: 'death' }),
  });
  assert.equal(res.status, 200);
  const p = await res.json();
  assert.deepEqual(p.choices, []);
  assert.ok(p.fallback);
  assert.ok(!('setting' in p));
  async function post(route, body) {
    const result = await fetch(url + '/api/' + route, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(result.status, 200);
    return result.json();
  }
  const ids = ['roots_winter', 'lane_winter', 'shore', 'pier'];
  const page = await post('page', {
    chapter: 9,
    outcome: 'mixed',
    current_area: { id: 'old_house', name: 'Your old house' },
    nearby_areas: ids.map((id) => ({ id, name: id, kind: 'exterior' })),
  });
  assert.equal(page.choices.length, 4);
  assert.deepEqual(
    page.choices.map((c) => c.place),
    ids,
  );
  const exchange = await post('talk', {
    kind: 'stranger',
    npc: { id: 'recruiter' },
    allowed_effects: ['bargain'],
    stranger: { allowed_flags: ['crime'] },
  });
  assert.equal(
    exchange.replies.find((r) => r.effect === 'flag').flag,
    'left_home',
  );
  assert.ok(exchange.replies.some((r) => r.effect === 'insight'));
  const stone = await post('epitaph', {
    name: 'you',
    want: 'Nothing',
    age_at_death: 81,
  });
  assert.match(stone.verdict, /You got it/);
  for (const route of ['talk', 'legacy', 'epitaph']) {
    const r = await fetch(url + '/api/' + route, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.ok(body.fallback);
    const validate = {
      talk: validateTalk,
      legacy: validateLegacy,
      epitaph: validateEpitaph,
    }[route];
    assert.ok(validate(body, {}).ok);
  }
});
