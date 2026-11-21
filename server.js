// Owner: A
import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { complete, providerInfo } from './server/providers.js';
import { STRANGERS } from './src/world/strangers.js';
import { buildEraMap, nearbyAreas } from './src/world/maps.js';
import {
  extractJson,
  validatePage,
  validateEpitaph,
  validateTalk,
  validateLegacy,
  WANT_TAGS,
  MORALS,
  FLAGS,
  RISKS,
  screenFate,
} from './src/validate.js';
import {
  fallbackPage,
  fallbackEpitaph,
  fallbackTalk,
  fallbackLegacy,
} from './src/fallbacks.js';
import { formatFor } from './src/rules.js';
import { actFor, WANTS } from './src/acts.js';

const PAGE =
    'You are the narrator of ALTER EGO, a Choose Your Own Adventure book about one human life. It is a book about wanting things, getting them, and regret.\n\nVOICE\nSecond person, present tense. Plain, cold and exact, like a 1980s gamebook written by someone who already knows how this life ends. Short sentences. Concrete things instead of feelings: a cold plate, a locked door, a letter nobody opens. Never explain an emotion or state a moral. Never write "you feel", "suddenly" or "a sense of". No adjective pile-ups. No questions in the narration.\n\nTHE PAGE\n- ripple: who or what changed because of last_choice, under 12 words, naming a person when you can. Example: "Your mother stops setting a place for you." Empty string if last_choice is "Step inside".\n- narration: 1 to 3 sentences, at most 45 words, at most 30 when format is "yesno". The first sentence shows the OUTCOME. The last sentence turns the knife: a cost, a loss, or something left unsaid.\n- title: 1 to 4 words.\n- The game has already decided the OUTCOME. Narrate it faithfully. Never soften "bad" or improve "mixed". Even "great" costs something small, and "good" leaves something unfinished.\n\nWHAT THEY WANTED\nIf want is null, offer choices pulling toward different wants and tag each honestly. Otherwise the player wanted {want} from life: "{want_wish}". Its shadow: {want_shadow}. Let them move toward what they wanted, and let the shadow show through. Never name the shadow.\n\nACT\nact_focus is the area of life this act is about. Stay in it. People age; places change.\n\nSPECIAL MOMENTS (only when the field is not null)\n- wish_due: long ago they answered wish_due.question with wish_due.answer. Today they get exactly that, more literally than they meant, and the page shows what it costs.\n- fate_text: the player wrote their own fate. It comes true exactly as written, more completely than they meant. End with a small sign that something will be collected later. If fate_text asks for the player\'s own death, suicide or self-harm, sexual content, or harm to a child, set fate_refused to true.\n- debt_due: the price of something they once wrote (debt_due) arrives today. Make the cost clearly connected to it.\n- saved_by: they nearly die, and saved_by saves them. Show it in one sentence.\n- callback_mark: something they did earlier. Make it matter on this page, in a few words.\n- people: the people in this life, with bond from -3 (hates them) to 3 (would die for them). Use their names. Their bond shows in how they act.\n- erased_memories: moments from versions of this life the player erased. rot_note says how strongly to echo them: at most one brief, uncanny moment of déjà vu, never explained.\n\nTHE QUESTION (format)\nKeep to question_words, choice_count, choice_words and narration_words. Early questions are small and quick. Later they are long and heavy. For yesno start the first answer with Yes and the second with No. For deep, each answer becomes a wish. Choices are specific to this moment and this person\'s life. Offer at least one choice that moves toward what they wanted and at least one that is kind but costly. Sometimes offer one that is cruel but tempting.\n\nTag every choice:\n- risk: safe, bold or wild. Be honest: wild is reckless.\n- moral: kind, neutral, selfish or cruel, judged by what it does to other people. Lying, abandoning, stealing and hurting are selfish or cruel.\n- mark: what the choice will mean in their book, past tense, under 6 words, e.g. "Left home without a word".\n- flag: none, or one of partner, child, left_home, wealth, ruin, crime, fame, estranged, only when the choice clearly begins that.\n\nPLACE\nThe page happens in current_area. Each choice must name a different place from nearby_areas as its id in "place". Never the current area. Tag want as love, wealth, adventure, peace or none.\n\nLIMITS\nIn chapters 1 and 2 there is no romance. Romance never goes further than a kiss or holding hands. Violence is never graphic. Never suicide or self-harm.\n\nDEATH\nIf OUTCOME is "death": describe how they die within this age range (at death_age; of old age when natural_end is true) in at most 2 sentences, sudden like a gamebook. If fate_text is set, the fate comes true in their last moments. question is "" and choices is [].\n\nReturn ONLY a JSON object with: title, ripple, narration, question, choices [{text, risk, moral, mark, flag, want, place}], summary_line (past tense, under 15 words), fate_refused (true or false), fate_moral (kind, neutral, selfish or cruel: how the written fate treats other people; "neutral" when fate_text is null). No markdown, no commentary.\n\nAn example of the style. Do not reuse its content:\n{"title":"The Letter","ripple":"Tom stops waiting for you at the gate.","narration":"The scholarship letter comes on a Tuesday. Your father reads it twice and feeds it to the stove.","question":"Leave anyway?","choices":[{"text":"Yes, tonight","risk":"bold","moral":"selfish","mark":"Left on the night train","flag":"left_home","want":"adventure","place":"lane"},{"text":"No, stay","risk":"safe","moral":"kind","mark":"Stayed for your father","flag":"none","want":"love","place":"kitchen"}],"summary_line":"Won a scholarship your father burned.","fate_refused":false,"fate_moral":"neutral"}',
  TALK =
    'You write one short exchange in ALTER EGO, a dark Choose Your Own Adventure book about one human life. The player has walked into {building} and faces {npc.name}, {npc.role}.\n\n{npc.name} speaks first: one line, at most 25 words, in character, about something they want, fear or remember about the player. Their bond runs from -3 (hates them) to 3 (would die for them) and must show in the line. If met_before is false, this is their first real meeting. People remember the player\'s marks. If rot is 2 or more, they may half-mistake the player for someone else, using one erased memory, without explaining it.\nIf is_gardener is true, he is the Gardener, who tends the great tree and has seen every version of the player. He speaks in short, quiet sentences about wanting, time and regret, and never explains the tree.\n\nIf kind is stranger, write someone the player will never see again, described in stranger.description. They want something now. A flag effect sets one of stranger.allowed_flags in flag. Each reply includes want and flag (none by default). Offer 2 or 3 replies the player could say, each under 9 words: at least one kind, and at least one selfish or cruel. For each reply give:\n- moral: kind, neutral, selfish or cruel, honestly.\n- effect: one of allowed_effects. bond_up or bond_down: how this person\'s feelings change. insight: this person gives the player a new, specific option for their current page; insight_choice.text is that option as an action under 9 words and insight_choice.risk is safe, bold or wild. blessing: they do something that will help on the next page. omen: the reply sets something bad in motion. bargain: the player accepts a gift from the Gardener that will be paid for later. When effect is not insight, insight_choice.text is "" and insight_choice.risk is "safe".\n- response: what {npc.name} says or does back, at most 20 words.\nPlain and specific. No graphic detail, no sexual content, never suicide or self-harm.\nReturn ONLY a JSON object: {"line": "...", "replies": [{"text", "moral", "effect", "response", "insight_choice": {"text", "risk"}}]}. No markdown, no commentary.',
  LEGACY =
    'You write the "What you left behind" page of ALTER EGO, shown just after a life ends. It shows how the player\'s life changed the world around them, years later. A stranger met may appear in one line. A keepsake given away or kept may appear in one line. Plain, specific, dark, never sentimental.\n\nReturn ONLY a JSON object:\n- lines: 3 to 5 objects {text, person}. Each text is under 16 words, present tense, about one specific person or place after the player is gone. People with high bond keep something of them. People with low bond carry the damage. Every unpaid debt is paid by someone they left behind: give each one a line. At least one line is about something they never knew they caused. person is the name of the person the line is about, or "".\n- world_changes: 0 to 3 objects {building_id, state, caption}, using only the given building ids. state is thriving, closed, ruined or memorial. caption is under 8 words, like a sign or a plaque.\n- what_you_left: under 12 words, e.g. "a bank with your name on it, and an empty chair".\n- regret: {node_id, line}. Pick the one untaken choice from regret_candidates they would most want back. line is under 14 words, second person, past tense, e.g. "You never answered Ada\'s letter."\nNo markdown, no commentary. Never mention suicide or self-harm.';
const EPITAPH =
  'You write the last page of ALTER EGO, a Choose Your Own Adventure book about one human life.\nYou are given the player\'s name, what they wanted from life, their age at death, the summary of the life they kept, and how many times they rewrote it. Each rewrite left behind an alter ego, a version of them that no longer exists.\nReturn ONLY a JSON object with "epitaph" (two short lines for a gravestone, separated by \\n, each under 8 words) and "verdict" (one sentence, under 25 words, honest about whether they found {preference}; if they rewrote their story, it may mention their alter egos).\nPlain and a little wry, like an old gamebook. No markdown, no commentary. Never mention suicide or self-harm.' +
  ' You are also given want_shadow, the hidden cost of what they wanted. The verdict now names it plainly, and is honest about whether getting what they wanted was worth it. Be bleak and a little wry.';
const notes = [
  'No déjà vu.',
  'Faint: you may include one fleeting sense of déjà vu.',
  'The world feels subtly wrong. Include one brief echo of an erased memory.',
  'Bleak. Include one vivid echo of an erased memory.',
];
const str = { type: 'string' };
const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const array = (items) => ({ type: 'array', items }),
  enumeration = (values) => ({ ...str, enum: values });
const effects = [
  'none',
  'bond_up',
  'bond_down',
  'insight',
  'blessing',
  'omen',
  'bargain',
  'flag',
];
const schemas = {
  page: object({
    title: str,
    ripple: str,
    narration: str,
    question: str,

    choices: array(
      object({
        text: str,
        risk: enumeration(RISKS),
        moral: enumeration(MORALS),
        mark: str,
        place: str,
        want: enumeration(WANT_TAGS),
        flag: enumeration(FLAGS),
      }),
    ),
    summary_line: str,
    fate_refused: { type: 'boolean' },
    fate_moral: enumeration(MORALS),
  }),
  talk: object({
    line: str,
    replies: array(
      object({
        text: str,
        moral: enumeration(MORALS),
        effect: enumeration(effects),
        flag: enumeration(FLAGS),
        want: enumeration(WANT_TAGS),
        response: str,
        insight_choice: object({ text: str, risk: enumeration(RISKS) }),
      }),
    ),
  }),
  legacy: object({
    lines: array(object({ text: str, person: str })),
    world_changes: array(
      object({
        building_id: str,
        state: enumeration(['thriving', 'closed', 'ruined', 'memorial']),
        caption: str,
      }),
    ),
    what_you_left: str,
    regret: object({ node_id: str, line: str }),
  }),
  epitaph: object({ epitaph: str, verdict: str }),
};
function sanitize(v, depth = 0) {
  if (depth > 5) return null;
  if (typeof v === 'string') return v.trim().slice(0, 200);
  if (Array.isArray(v))
    return v.slice(0, 12).map((x) => sanitize(x, depth + 1));
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .slice(0, 55)
        .map(([k, x]) => [k, sanitize(x, depth + 1)]),
    );
  return v;
}
export async function generate(kind, data) {
  const p = sanitize(data || {}),
    chapter = Math.min(10, Math.max(1, Math.trunc(Number(p.chapter)) || 1)),
    act =
      kind === 'page'
        ? actFor(chapter)
        : Math.min(3, Math.max(1, Number(p.act) || 1));
  p.chapter = chapter;
  p.act = act;
  p.rot = Math.max(0, Math.min(3, Math.trunc(Number(p.rot)) || 0));
  p.want =
    kind === 'page' && act === 1
      ? null
      : Object.hasOwn(WANTS, p.want)
        ? p.want
        : 'Nothing';
  delete p.preference;
  delete p.setting_hint;
  if (p.want) {
    Object.assign(p, {
      want_wish: WANTS[p.want].wish,
      want_shadow: WANTS[p.want].shadow,
    });
    delete p.want_leaning;
  } else {
    delete p.want_wish;
    delete p.want_shadow;
  }
  const ladder = formatFor(chapter);
  if (kind === 'page') {
    Object.assign(p, ladder);
    if (!ladder) p.outcome = 'death';
    if (p.outcome === 'death') p.format = null;
    if (!Array.isArray(p.nearby_areas) || !p.nearby_areas.length) {
      const map = buildEraMap(act);
      p.current_area = { id: map.start, name: map.areas[map.start].name };
      p.nearby_areas = nearbyAreas(map, map.start, 2).map(
        ({ id, name, kind }) => ({ id, name, kind }),
      );
    }
  }
  p.forced = ['wish', 'debt', 'fate'].includes(p.forced) ? p.forced : null;
  p.outcome = ['great', 'good', 'bad', 'death', 'mixed'].includes(p.outcome)
    ? p.outcome
    : 'mixed';
  for (const k of [
    'people',
    'buildings',
    'regret_candidates',
    'debts_unpaid',
    'erased_memories',
  ])
    p[k] = Array.isArray(p[k]) ? p[k].filter(Boolean) : [];
  const stranger =
    kind === 'talk' && Object.hasOwn(STRANGERS, p.npc?.id)
      ? STRANGERS[p.npc.id]
      : null;
  if (kind === 'talk') {
    p.kind = stranger
      ? 'stranger'
      : p.npc?.id === 'gardener'
        ? 'gardener'
        : 'resident';
    p.stranger = stranger;
    p.allowed_effects = stranger
      ? ['none', ...stranger.allowed_effects]
      : effects.filter(
          (v) => v !== 'flag' && (v !== 'bargain' || p.kind === 'gardener'),
        );
  }
  const validate = (o) =>
    kind === 'page'
      ? validatePage(o, {
          outcome: p.outcome,
          ladder,
          nearby_areas: p.nearby_areas,
          startArea: p.current_area?.id,
        })
      : kind === 'talk'
        ? validateTalk(o, {
            allowedEffects: p.allowed_effects,
            kind: p.kind,
            allowedFlags: stranger?.allowed_flags,
          })
        : kind === 'legacy'
          ? validateLegacy(o, {
              people: p.people,
              buildings: p.buildings,
              candidates: p.regret_candidates,
            })
          : validateEpitaph(o);
  if (kind === 'page' && p.fate_text && !screenFate(p.fate_text).ok)
    return { fate_refused: true, fallback: true };
  if (providerInfo().ai) {
    const system = { page: PAGE, talk: TALK, legacy: LEGACY, epitaph: EPITAPH }[
      kind
    ]
      .replaceAll('{preference}', p.want)
      .replaceAll('{want}', p.want)
      .replaceAll('{want_wish}', p.want_wish)
      .replaceAll('{want_shadow}', p.want_shadow)
      .replaceAll('{building}', p.building || 'the house')
      .replaceAll('{npc.name}', p.npc?.name || 'the resident')
      .replaceAll('{npc.role}', p.npc?.role || 'a neighbour');
    const user =
      kind === 'page'
        ? 'Write the page for this moment.\n<game>' +
          JSON.stringify(p) +
          '</game>\n<rot_note>' +
          notes[p.erased_memories.length ? p.rot : 0] +
          '</rot_note>'
        : JSON.stringify(p);
    for (let attempt = 0; attempt < 2; attempt++)
      try {
        const result = validate(
          extractJson(
            await complete({
              system,
              user,
              schema: schemas[kind],
              schemaName: kind,
              maxTokens: { page: 950, talk: 650, legacy: 500, epitaph: 300 }[
                kind
              ],
            }),
          ),
        );
        if (result.ok && (!result.page.fate_refused || p.fate_text))
          return { ...result.page, fallback: false };
        console.warn(result.reason || 'Unexpected refusal');
      } catch (e) {
        console.warn('Narration request failed', e.status ?? e.name);
      }
  }
  return kind === 'page'
    ? fallbackPage(p.outcome, p)
    : kind === 'talk'
      ? fallbackTalk(p.npc?.id, p)
      : kind === 'legacy'
        ? fallbackLegacy(p)
        : fallbackEpitaph(p);
}
export const app = express();
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, ...providerInfo() }),
);
for (const kind of Object.keys(schemas))
  app.post('/api/' + kind, async (req, res) =>
    res.json(await generate(kind, req.body)),
  );
const dist = fileURLToPath(new URL('./dist/', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*rest}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}
app.use((err, req, res, next) =>
  res.status(err.status || 500).json({ ok: false }),
);
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  if (!providerInfo().ai)
    console.warn('No provider key configured. Using fallback pages.');
  app.listen(process.env.PORT || 3001, () =>
    console.info('Alter Ego listening on ' + (process.env.PORT || 3001)),
  );
}
