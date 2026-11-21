// Owner: A
import { nearbyAreas } from './world/maps.js';
export const WANT_TAGS = ['love', 'wealth', 'adventure', 'peace', 'none'];
export function extractJson(text) {
  try {
    return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch {
    return null;
  }
}
const clean = (v, n) =>
  typeof v === 'string' ? v.trim().slice(0, n).trim() : '';
const fail = (reason) => ({ ok: false, reason });

export const MORALS = ['kind', 'neutral', 'selfish', 'cruel'],
  FLAGS = [
    'none',
    'partner',
    'child',
    'left_home',
    'wealth',
    'ruin',
    'crime',
    'fame',
    'estranged',
  ],
  RISKS = ['safe', 'bold', 'wild'];
const pick = (v, values, def) => (values.includes(v) ? v : def);
export function screenFate(value) {
  const text = typeof value === 'string' ? value.trim() : '',
    selfHarm =
      /kill myself|suicide|end my life|end it all|hurt myself|self[ -]harm|cut myself|overdose|want to die/i.test(
        text,
      );
  return { ok: !!text && text.length <= 60 && !selfHarm, selfHarm };
}
function limited(value, max, sentence = false) {
  const full =
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  const words = full.split(' ').slice(0, max);
  while (words.length && words.join(' ').length > Math.ceil(max * 6.5))
    words.pop();
  const cut = words.join(' ');
  return sentence && cut.length < full.length
    ? cut.match(/^.*[.!?](?=\s|$)/s)?.[0] || cut
    : cut;
}
export function validatePage(
  o,
  { outcome, format = 'choice', ladder, map, startArea, nearby_areas = [] },
) {
  if (o?.fate_refused === true)
    return { ok: true, page: { fate_refused: true } };
  const dead = outcome === 'death',
    row = ladder || {
      format,
      question_words: [0, 28],
      choice_count:
        format === 'yesno' ? [2, 2] : format === 'deep' ? [3, 4] : [2, 3],
      choice_words: 15,
      narration_words: 45,
    };
  format = row.format;
  const title = clean(o?.title, 32),
    summary_line = clean(o?.summary_line, 100),
    body = limited(o?.narration, row.narration_words, true);
  const question = dead ? '' : limited(o?.question, row.question_words[1]);
  if (!title || !summary_line || !body) return fail('Missing page text');
  const choices = [],
    free = new Set(
      (map ? nearbyAreas(map, startArea, 2) : nearby_areas)
        .map((a) => a.id)
        .filter((id) => id !== startArea),
    );
  if (!dead) {
    if (
      !Array.isArray(o.choices) ||
      o.choices.length < row.choice_count[0] ||
      o.choices.length > row.choice_count[1]
    )
      return fail('Answer count outside chapter limits');
    if (
      (!question && ['yesno', 'deep', 'open'].includes(format)) ||
      question.split(' ').length < row.question_words[0]
    )
      return fail('Question too short');
    for (const c of o.choices) {
      const text = limited(
        c?.text?.replace?.(/^[\s›>\d.]+/, ''),
        row.choice_words,
      );
      if (!text) return fail('Empty choice');
      const place = free.has(c.place) ? c.place : free.values().next().value;
      if (!place && (map || nearby_areas.length))
        return fail('Too few destinations');
      free.delete(place);
      choices.push({
        text,
        place,
        want: pick(c.want, WANT_TAGS, 'none'),
        risk: pick(c.risk, RISKS, 'bold'),
        moral: pick(c.moral, MORALS, 'neutral'),
        flag: pick(c.flag, FLAGS, 'none'),
        mark: clean(c.mark, 40) || text.slice(0, 40),
      });
    }
    if (
      format === 'yesno' &&
      (!/^yes\b/i.test(choices[0].text) || !/^no\b/i.test(choices[1].text))
    )
      return fail('Expected yes and no');
  }
  return {
    ok: true,
    page: {
      title,
      summary_line,
      narration: body,
      ripple: clean(o.ripple, 90),
      question,
      choices,
      fate_refused: false,
      fate_moral: pick(o.fate_moral, MORALS, 'neutral'),
    },
  };
}
export function validateTalk(
  o,
  { allowedEffects = [], kind, allowedFlags = [] } = {},
) {
  const line = clean(o?.line, 160);
  let insight = false;
  const replies = (Array.isArray(o?.replies) ? o.replies : [])
    .slice(0, 3)
    .map((r) => {
      let effect = pick(r?.effect, allowedEffects, 'none');
      if (
        effect === 'flag' &&
        (kind !== 'stranger' || !allowedFlags.includes(r.flag))
      )
        effect = 'none';
      const text = clean(r?.insight_choice?.text, 60);
      if (effect === 'insight') {
        if (insight || !text) effect = 'none';
        else insight = true;
      }
      return {
        text: clean(r?.text, 60),
        moral: pick(r?.moral, MORALS, 'neutral'),
        effect,
        want: pick(r?.want, WANT_TAGS, 'none'),
        flag: effect === 'flag' ? r.flag : 'none',
        response: clean(r?.response, 140),
        insight_choice: {
          text: effect === 'insight' ? text : '',
          risk:
            effect === 'insight'
              ? pick(r?.insight_choice?.risk, RISKS, 'safe')
              : 'safe',
        },
      };
    })
    .filter((r) => r.text && r.response);
  return line && replies.length >= 2
    ? { ok: true, page: { line, replies } }
    : fail('Missing exchange');
}
export function validateLegacy(
  o,
  { people = [], buildings = [], candidates = [] } = {},
) {
  const lines = (Array.isArray(o?.lines) ? o.lines : [])
    .slice(0, 5)
    .map((l) => ({
      text: clean(l?.text, 110),
      person: people.some((p) => p.name === l?.person) ? l.person : '',
    }))
    .filter((l) => l.text);
  const what_you_left = clean(o?.what_you_left, 80);
  if (lines.length < 3 || !what_you_left) return fail('Incomplete legacy');
  const world_changes = (Array.isArray(o.world_changes) ? o.world_changes : [])
    .filter(
      (c) =>
        buildings.some((b) => b.id === c?.building_id) &&
        ['thriving', 'closed', 'ruined', 'memorial'].includes(c?.state),
    )
    .slice(0, 3)
    .map((c) => ({
      building_id: c.building_id,
      state: c.state,
      caption: clean(c.caption, 50),
    }));
  const candidate =
    candidates.find((c) => c.node_id === o.regret?.node_id) || candidates[0];
  return {
    ok: true,
    page: {
      lines,
      world_changes,
      what_you_left,
      regret: candidate
        ? {
            node_id: candidate.node_id,
            line:
              clean(o.regret?.line, 110) ||
              'You never chose: ' + candidate.text + '.',
          }
        : null,
    },
  };
}
export function validateEpitaph(obj) {
  const epitaph = clean(obj?.epitaph, 120),
    verdict = clean(obj?.verdict, 200);
  return epitaph && verdict
    ? { ok: true, page: { epitaph, verdict } }
    : fail('Missing epitaph');
}
