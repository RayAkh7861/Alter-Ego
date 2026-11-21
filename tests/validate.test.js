// Owner: A
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, validatePage } from '../src/validate.js';
import { fallbackPage } from '../src/fallbacks.js';
test('extract and repair model output', () => {
  for (const raw of ['```json\n{"a":1}\n```', 'Answer: {"a":1}.'])
    assert.deepEqual(extractJson(raw), { a: 1 });
  const obj = fallbackPage('good', { chapter: 4 });
  obj.choices[0].risk = 'invalid';
  obj.setting = 'moon';
  obj.narration = 'Long word '.repeat(77);
  const validate = (outcome = 'good') =>
    validatePage(obj, { outcome, settingHint: 'harbour' });
  assert.ok(!('setting' in validate().page));
  assert.equal(validate().page.choices[0].risk, 'bold');
  assert.ok(validate().page.narration.length <= 400);
  assert.deepEqual(validate('death').page.choices, []);
  obj.choices.pop();
  assert.equal(validate().ok, false);
  delete obj.title;
  assert.equal(validate('death').ok, false);
});
import { validateTalk, validateLegacy, screenFate } from '../src/validate.js';
test('formats, allowed settings, morals, sentence boundary and refusals', () => {
  const page = fallbackPage('good', { chapter: 1, format: 'yesno' }),
    opts = {
      outcome: 'good',
      settingHint: 'village',
      actSettings: ['village'],
      format: 'yesno',
    };
  delete page.choices[0].moral;
  page.narration = 'One cup breaks. ' + 'word '.repeat(99);
  let v = validatePage(page, opts);
  assert.ok(v.ok);
  assert.ok(!('setting' in v.page));
  assert.equal(v.page.choices[0].moral, 'neutral');
  assert.equal(v.page.narration, 'One cup breaks.');
  page.choices.reverse();
  assert.equal(validatePage(page, opts).ok, false);
  assert.equal(validatePage(page, { ...opts, format: 'deep' }).ok, false);
  for (const phrase of [
    'kill myself',
    'suicide',
    'end my life',
    'end it all',
    'hurt myself',
    'self harm',
    'self-harm',
    'cut myself',
    'overdose',
    'want to die',
  ])
    assert.deepEqual(screenFate(phrase.toUpperCase()), {
      ok: false,
      selfHarm: true,
    });
  assert.ok(screenFate('I want to be rich').ok);
});
test('limit talk effects and repair legacy references', () => {
  const reply = {
    text: 'Stay',
    effect: 'insight',
    moral: 'kind',
    response: 'One chair is free.',
    insight_choice: { text: 'Turn the key', risk: 'safe' },
  };
  const t = validateTalk(
    {
      line: 'Will you stay?',
      replies: [reply, reply, { ...reply, effect: 'bargain' }],
    },
    { allowedEffects: ['insight', 'none'] },
  );
  assert.deepEqual(
    t.page.replies.map((r) => r.effect),
    ['insight', 'none', 'none'],
  );
  const l = validateLegacy(
    {
      lines: Array(3).fill({ text: 'A chair stays empty.', person: 'Unknown' }),
      what_you_left: 'one chair',
      regret: { node_id: 'bad', line: 'You left.' },
      world_changes: [{ building_id: 'missing', state: 'closed' }],
    },
    { candidates: [{ node_id: 'n1', text: 'Go home' }] },
  );
  assert.equal(l.page.regret.node_id, 'n1');
  assert.deepEqual(l.page.world_changes, []);
  assert.ok(l.page.lines.every((l) => !l.person));
});
import { formatFor } from '../src/rules.js';
import { buildEraMap, nearbyAreas } from '../src/world/maps.js';
test('every chapter fallback meets its ladder, duplicate and invalid places are repaired', () => {
  for (let chapter = 1; chapter <= 9; chapter++) {
    const ladder = formatFor(chapter),
      map = buildEraMap(chapter <= 4 ? 1 : chapter <= 8 ? 2 : 3),
      nearby = nearbyAreas(map, map.start);
    const raw = fallbackPage('good', { chapter, nearby_areas: nearby });
    raw.choices[0].place = map.start;
    raw.choices[1].place = nearby[0].id;
    raw.choices[0].want = 'gold';
    const opts = { outcome: 'good', ladder, map, startArea: map.start };
    const v = validatePage(raw, opts);
    assert.ok(v.ok, v.reason);
    assert.equal(v.page.choices[0].want, 'none');
    assert.equal(
      new Set(v.page.choices.map((c) => c.place)).size,
      v.page.choices.length,
    );
    for (const c of v.page.choices) {
      assert.ok(c.text.split(' ').length <= ladder.choice_words);
      assert.ok(nearby.some((a) => a.id === c.place));
    }
    raw.choices = [];
    assert.equal(validatePage(raw, opts).ok, false);
  }
});
test('stranger flag requires the catalog permission and cannot apply to residents', () => {
  const r = {
    text: 'Sign',
    moral: 'neutral',
    effect: 'flag',
    flag: 'wealth',
    response: 'Done.',
  };
  const obj = { line: 'Sign here.', replies: [r, { ...r, flag: 'crime' }] };
  const opts = {
    kind: 'stranger',
    allowedFlags: ['wealth'],
    allowedEffects: ['none', 'flag'],
  };
  const replies = validateTalk(obj, opts).page.replies;
  assert.deepEqual(
    replies.map((r) => [r.effect, r.flag, r.want]),
    [
      ['flag', 'wealth', 'none'],
      ['none', 'none', 'none'],
    ],
  );
  assert.equal(
    validateTalk(obj, { ...opts, kind: 'resident' }).page.replies[0].effect,
    'none',
  );
});
