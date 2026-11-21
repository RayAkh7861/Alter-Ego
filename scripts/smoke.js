import assert from 'node:assert/strict';
import { generate } from '../server.js';
import { providerInfo } from '../server/providers.js';
import { ACTS, actFor } from '../src/acts.js';
import { chapterInfo, formatFor } from '../src/rules.js';
import { buildEraMap, nearbyAreas } from '../src/world/maps.js';
const arg = process.argv.indexOf('--pages');
const count =
  arg < 0 ? 1 : Math.max(1, Math.min(10, parseInt(process.argv[arg + 1]) || 5));
const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const provider = providerInfo();
console.log(provider);
let previous;
for (let chapter = 1; chapter <= count; chapter++) {
  const act = actFor(chapter),
    map = buildEraMap(act, { seed: 42 }),
    row = formatFor(chapter),
    id = map.areas[previous]?.id || map.start;
  const nearby = nearbyAreas(map, id).map(({ id, name, kind }) => ({
    id,
    name,
    kind,
  }));
  const page = await generate('page', {
    chapter,
    act,
    act_name: ACTS[act].name,
    act_focus: ACTS[act].focus,
    ...row,
    current_area: { id, name: map.areas[id].name },
    nearby_areas: nearby,
    want: act === 1 ? null : 'Love',
    want_leaning: { love: 2, wealth: 0, adventure: 0, peace: 0 },
    ages: chapterInfo(chapter).ages,
    last_choice: chapter === 1 ? 'Step inside' : 'Set another place',
    outcome: row ? 'good' : 'death',
  });
  const places = page.choices.map((c) => c.place);
  if (row) {
    assert.ok(
      page.choices.length >= row.choice_count[0] &&
        page.choices.length <= row.choice_count[1],
    );
    assert.ok(words(page.narration) <= row.narration_words);
    assert.ok(
      words(page.question) >= row.question_words[0] &&
        words(page.question) <= row.question_words[1],
    );
    assert.ok(
      page.choices.every(
        (c) =>
          words(c.text) <= row.choice_words &&
          nearby.some((a) => a.id === c.place),
      ),
    );
    assert.equal(new Set(places).size, places.length);
  }
  console.log(
    'Chapter',
    chapter,
    row?.format || 'death',
    '| narration',
    words(page.narration),
    '| question',
    words(page.question),
    '| choices',
    page.choices.map((c) => words(c.text) + '@' + c.place).join(', '),
    '|',
    page.fallback ? 'fallback' : 'live',
  );
  previous = places[0];
  if (provider.ai && page.fallback) process.exitCode = 1;
}
