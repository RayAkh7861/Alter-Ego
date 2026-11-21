// Owner: A
import {
  createRng,
  chapterInfo,
  rollOutcome,
  toneWord,
  TUNING,
  formatFor,
  clampLuck,
} from './rules.js';
import { ACTS, WANTS, DEEP_TOPICS, YESNO_EXAMPLES, actFor } from './acts.js';
import { hash } from './pixel.js';
import { NPCS, gardenerLine } from './world/cast.js';
import { screenFate } from './validate.js';
import { fetchPage, fetchTalk, fetchLegacy } from './ai.js';
import { buildEraMap, nearbyAreas } from './world/maps.js';
import { spawnStrangers, STRANGERS } from './world/strangers.js';
const KEY = 'alterego:game:v3',
  busy = new WeakSet();
const previews = new WeakSet();
export function markPreview(game) {
  previews.add(game);
  return game;
}
export function save(game, storage) {
  if (previews.has(game)) return;
  try {
    (storage ?? globalThis.localStorage)?.setItem(KEY, JSON.stringify(game));
  } catch {}
}
export function clearSave(storage) {
  try {
    (storage ?? globalThis.localStorage)?.removeItem(KEY);
  } catch {}
}
export function load(storage) {
  try {
    const g = JSON.parse((storage ?? globalThis.localStorage)?.getItem(KEY));
    return g?.version === 3 && g.nodes?.[g.currentId] ? g : null;
  } catch {
    return null;
  }
}
export function newGame(seed = Math.floor(Math.random() * 0x80000000)) {
  const root = {
    id: 'n0',
    parentId: null,
    fromChoice: null,
    life: 1,
    chapter: 0,
    ages: '0-8',
    area: 'roots',
    title: 'The Great Tree',
    narration:
      'You are born under a great tree. At eight, you find a door in its roots. Behind it, a stair climbs to a room that has been waiting for you.',
    act: 1,
    format: null,
    question: '',
    ripple: '',
    moral: null,
    luckDelta: 0,
    mark: '',
    flag: 'none',
    forced: null,
    fateText: null,
    savedBy: null,
    wish: null,
    wishGranted: null,
    debt: null,
    debtPaid: null,
    events: [],
    choices: [
      {
        text: 'Step inside',
        place: 'roots',
        want: 'none',
        risk: 'safe',
        moral: 'neutral',
        mark: 'Opened the door',
        flag: 'none',
        insight: false,
      },
    ],
    chosenIndex: null,
    tried: [],
    outcome: null,
    summaryLine: 'Grew up beneath the great tree.',
    deathAge: null,
    dead: false,
    fallback: false,
  };
  return {
    version: 3,
    lives: [],
    seed: seed >>> 0,
    rngState: seed >>> 0,
    name: 'you',
    luck: TUNING.startingLuck,
    replants: 0,
    lifeNumber: 1,
    status: 'alive',
    nodes: { n0: root },
    currentId: 'n0',
    nextId: 1,
    erasedMemories: [],
    epitaph: null,
  };
}
export function lifePath(game) {
  const nodes = [];
  for (let n = game.nodes[game.currentId]; n; n = game.nodes[n.parentId])
    nodes.push(n);
  return nodes.reverse();
}
export const buildSummary = (game) => lifePath(game).map((n) => n.summaryLine);
export const canReplant = (g) =>
  g.status === 'dead' && g.replants < TUNING.maxReplants;
export function acceptLife(g) {
  if (g.status !== 'dead' || busy.has(g)) throw Error('Life is still open');
  g.status = 'accepted';
  save(g);
}
function checkChoice(n, index) {
  if (!Number.isInteger(index) || !n?.choices[index] || n.tried.includes(index))
    throw Error('Choice unavailable');
}
export function computeLuck(g) {
  let luck = Math.max(0, TUNING.startingLuck - TUNING.replantCost * g.replants);
  for (const n of lifePath(g)) {
    luck = clampLuck(luck + (n.luckDelta || 0));
    for (const e of n.events || []) luck = clampLuck(luck + (e.luckDelta || 0));
  }
  return luck;
}
export function personFor(g, id, flag, text) {
  const known =
    flag === 'partner' &&
    Object.values(NPCS).find(
      (n) => n.name && text.toLowerCase().includes(n.name.toLowerCase()),
    );
  const names =
    flag === 'partner'
      ? ['Ines', 'Wren', 'Jonah', 'Mira', 'Sol', 'Edie', 'Caspar', 'Noor']
      : ['Lark', 'Pip', 'Rosa', 'Theo', 'Ivy', 'Bas'];
  const named = names.find((n) => text.includes(n));
  return {
    npcId: known?.id || flag,
    name: known?.name || named || names[hash(g.seed + id) % names.length],
  };
}
export function lifeState(g) {
  const path = lifePath(g),
    last = path.at(-1);
  const s = {
    luck: computeLuck(g),
    act: actFor(last.chapter),
    marks: [],
    flags: {},
    bonds: { mother: 1, father: 1 },
    partner: null,
    child: null,
    savedBy: [],
    wishes: [],
    debts: [],
    fateUsedActs: [],
    modifiers: { blessing: false, omen: false },
    keepsakes: [],
    strangersMet: [],
  };
  for (const n of path) {
    if (n.mark) s.marks.push(n.mark);
    if (n.flag && n.flag !== 'none') {
      s.flags[n.flag] = n.id;
      if (['partner', 'child'].includes(n.flag))
        s[n.flag] = personFor(
          g,
          n.id,
          n.flag,
          (g.nodes[n.parentId]?.choices[n.fromChoice]?.text || '') +
            ' ' +
            n.mark,
        );
    }
    if (n.savedBy) s.savedBy.push(n.savedBy);
    if (n.fateText) s.fateUsedActs.push(actFor(n.chapter - 1));
    if (n.wish) s.wishes.push({ ...n.wish, granted: false });
    if (n.debt) s.debts.push({ ...n.debt, paid: false });
    for (const e of n.events || []) {
      if (e.npcId)
        s.bonds[e.npcId] = Math.max(
          -3,
          Math.min(3, (s.bonds[e.npcId] || 0) + (e.bondDelta || 0)),
        );
      if (e.flag && e.flag !== 'none') s.flags[e.flag] = n.id;
      if (e.type === 'encounter') s.strangersMet.push(e.strangerId);
      if (e.type === 'keepsake') s.keepsakes.push(e.item);
      if (e.type === 'gift' || e.type === 'unlock') {
        const itemIndex = s.keepsakes.findIndex(
          (item) => item.id === e.item?.id,
        );
        if (itemIndex >= 0) s.keepsakes.splice(itemIndex, 1);
      }
      if (e.debt) s.debts.push({ ...e.debt, paid: false });
      if (n === last) {
        if (['blessing', 'bargain'].includes(e.effect))
          s.modifiers.blessing = true;
        if (e.effect === 'omen' || e.type === 'caught') s.modifiers.omen = true;
        if (e.type === 'unlock') s.modifiers.blessing = true;
      }
    }
    const wish = s.wishes.find((w) => w.id === n.wishGranted),
      debt = s.debts.find((d) => d.id === n.debtPaid);
    if (wish) wish.granted = true;
    if (debt) debt.paid = true;
  }
  if (Object.values(s.bonds).includes(-3)) s.modifiers.omen = true;
  s.wantTally = wantTally(g);
  s.want = last.chapter >= 5 ? currentWant(g) : null;
  return s;
}
const wants = ['love', 'wealth', 'adventure', 'peace'];
function tallyPath(path) {
  const tally = Object.fromEntries(wants.map((want) => [want, 0]));
  const recent = {};
  let order = 0;
  const add = (want, weight) => {
    if (wants.includes(want)) {
      tally[want] += weight;
      recent[want] = order++;
    }
  };
  for (const node of path) {
    add(node.want, node.fromDeep ? 3 : 2);
    for (const event of node.events || []) add(event.want, 1);
  }
  return { tally, recent };
}
export function wantTally(game) {
  return tallyPath(lifePath(game)).tally;
}
export function currentWant(game) {
  const path = lifePath(game);
  const fixed = path.findIndex((node) => node.chapter === 5);
  return leadingWant(
    fixed < 0
      ? path
      : [...path.slice(0, fixed), { ...path[fixed], events: [] }],
  );
}
function leadingWant(path) {
  const { tally, recent } = tallyPath(path);
  if (Object.values(tally).reduce((a, b) => a + b, 0) < 3) return 'Nothing';
  const winner = [...wants].sort(
    (a, b) => tally[b] - tally[a] || (recent[b] ?? -1) - (recent[a] ?? -1),
  )[0];
  return winner[0].toUpperCase() + winner.slice(1);
}
export function recordEvent(game, event) {
  if (game.status !== 'alive' || busy.has(game))
    throw Error('Page unavailable');
  const node = game.nodes[game.currentId];
  const state = lifeState(game);
  let entry;
  if (event.type === 'caught') {
    if (node.events.some((e) => e.type === 'caught')) return null;
    entry = { type: 'caught', luckDelta: -5 };
  } else if (event.type === 'keepsake') {
    if (
      !event.item?.id ||
      state.keepsakes.length >= 3 ||
      pickedItems(game).includes(event.item.id)
    )
      throw Error('Keepsake unavailable');
    entry = { type: 'keepsake', item: { ...event.item }, luckDelta: 0 };
  } else if (event.type === 'gift' || event.type === 'unlock') {
    const item = state.keepsakes.find((item) => item.id === event.item?.id);
    if (
      !item ||
      (event.type === 'gift' && item.key) ||
      (event.type === 'unlock' &&
        (!item.key || item.act !== node.act || roomOpened(game, node.act)))
    )
      throw Error('Item unavailable');
    entry = { type: event.type, item, to: event.to || null, luckDelta: 0 };
  } else throw Error('Unknown event');
  node.events.push(entry);
  game.luck = computeLuck(game);
  save(game);
  return entry;
}
export function peopleFor(s) {
  const ids = new Set(
    [...Object.keys(s.bonds), s.partner?.npcId, s.child?.npcId].filter(Boolean),
  );
  return [...ids]
    .map((id) => ({
      name:
        s.partner?.npcId === id
          ? s.partner.name
          : s.child?.npcId === id
            ? s.child.name
            : NPCS[id]?.name || id,
      role: id === s.partner?.npcId ? 'your partner' : NPCS[id]?.role || '',
      bond: s.bonds[id] || 0,
    }))
    .sort((a, b) => Math.abs(b.bond) - Math.abs(a.bond));
}
export function regretCandidates(g) {
  return lifePath(g)
    .reverse()
    .filter((n) => n.chapter)
    .flatMap((n) =>
      n.choices.flatMap((c, i) =>
        n.tried.includes(i)
          ? []
          : [{ node_id: n.id, chapter: n.chapter, text: c.text }],
      ),
    )
    .slice(0, 8);
}
export function dueFor(s, chapter) {
  const debt = s.debts
    .filter((d) => !d.paid && d.due <= chapter)
    .sort((a, b) => a.due - b.due)[0];
  const wish = s.wishes
    .filter((w) => !w.granted && w.due <= chapter)
    .sort((a, b) => a.due - b.due)[0];
  return { debt: debt || null, wish: wish || null };
}
async function advance(g, node, index, deps) {
  const fate = typeof index === 'object' ? index.fate.trim() : null,
    choice = fate
      ? {
          text: fate,
          risk: 'bold',
          moral: 'neutral',
          mark: 'Wrote: ' + fate,
          flag: 'none',
        }
      : node.choices[index];
  const s = lifeState(g),
    chapter = node.chapter + 1,
    act = actFor(chapter),
    ladder = formatFor(chapter),
    format = ladder?.format,
    rng = createRng(g.rngState),
    { ages } = chapterInfo(chapter);
  const moral = choice.moral || 'neutral',
    luck = clampLuck(s.luck + TUNING.morals[moral]),
    { debt, wish } = dueFor(s, chapter);
  const saver = Object.keys(s.bonds)
    .sort()
    .find((id) => s.bonds[id] === 3 && !s.savedBy.includes(id));
  const roll = rollOutcome(
    {
      luck,
      chapter,
      risk: choice.risk,
      ...s.modifiers,
      fate,
      debtDue: debt,
      wishDue: wish,
      saver,
    },
    rng,
  );
  const oldMarks = lifePath(g).filter(
    (n) => n.chapter <= chapter - 2 && n.mark,
  );
  const map = eraFor(g, act, s),
    area =
      map.areas[
        act === node.act && node.chapter ? choice.place || node.area : map.start
      ] || map.areas[map.start];
  const reached = nearbyAreas(map, area.id, 2);
  const formed =
    chapter === 5
      ? leadingWant([
          ...lifePath(g),
          { want: choice.want, fromDeep: node.format === 'deep' },
        ])
      : currentWant(g);
  const pref = WANTS[formed],
    actInfo = ACTS[act],
    h = hash(g.seed + ':' + chapter);
  const page = await deps.fetchPage({
    name: g.name,
    ...(act === 1
      ? { want: null, want_leaning: s.wantTally }
      : { want: formed, want_wish: pref.wish, want_shadow: pref.shadow }),
    ...ladder,
    current_area: { id: area.id, name: area.name },
    nearby_areas: reached.map(({ id, name, kind }) => ({ id, name, kind })),
    people_here: [area, ...reached].flatMap((a) =>
      a.residents.map((id) => ({
        ...resident(s, id),
        area: a.id,
        bond: s.bonds[id] || 0,
      })),
    ),
    keepsakes: s.keepsakes,
    strangers_met: encounterLines(g),
    act,
    act_name: actInfo.name,
    act_focus: actInfo.focus,
    chapter,
    ages,
    tone: toneWord(luck),
    rot: g.replants,
    format: roll.outcome === 'death' ? null : format,
    deep_topic: format === 'deep' ? DEEP_TOPICS[act][h % 3] : null,
    yesno_examples: format === 'yesno' ? YESNO_EXAMPLES[act] : [],
    summary: buildSummary(g),
    last_choice: choice.text,
    last_moral: moral,
    outcome: roll.outcome,
    forced: roll.forced,
    wish_due: roll.forced === 'wish' || roll.outcome === 'death' ? wish : null,
    debt_due: roll.forced === 'debt' ? debt : null,
    fate_text: fate,
    saved_by: roll.savedBy,
    callback_mark:
      chapter % 2 === 0 && oldMarks.length
        ? oldMarks[h % oldMarks.length].mark
        : null,
    marks: s.marks.slice(-8),
    people: peopleFor(s).slice(0, 6),
    erased_memories: g.erasedMemories.slice(-4),

    death_age: roll.deathAge,
    natural_end: chapter === 10,
  });
  if (fate && page.fate_refused) return { refused: true };
  const id = 'n' + g.nextId++,
    due = chapter + TUNING.delay,
    actualMoral = fate ? page.fate_moral || 'neutral' : moral;
  const n = {
    id,
    parentId: node.id,
    fromChoice: fate ? null : index,
    life: g.lifeNumber,
    chapter,
    ages,
    act,
    area: area.id,
    title: page.title,
    narration: page.narration,
    choices: page.choices.map((c) => ({ ...c, insight: false })),
    chosenIndex: null,
    tried: [],
    ...roll,
    summaryLine: page.summary_line,
    dead: false,
    fallback: page.fallback,
    format: roll.outcome === 'death' ? null : format,
    question: page.question || '',
    ripple: page.ripple || '',
    moral: actualMoral,
    want: choice.want || 'none',
    fromDeep: node.format === 'deep',
    luckDelta:
      TUNING.morals[actualMoral] -
      (roll.forced === 'debt' ? TUNING.collection : 0),
    mark: choice.mark || choice.text,
    flag: choice.flag || 'none',
    fateText: fate,
    events: [],
    wish:
      !fate && node.format === 'deep'
        ? {
            id: 'w' + id,
            question: node.question,
            answer: choice.text,
            due: chapter + 1,
          }
        : null,
    wishGranted:
      (roll.forced === 'wish' || roll.outcome === 'death') && wish
        ? wish.id
        : null,
    debt: fate ? { id: 'd' + id, text: fate, due, source: 'fate' } : null,
    debtPaid: roll.forced === 'debt' ? debt.id : null,
  };
  node.chosenIndex = fate ? null : index;
  if (!fate) node.tried.push(index);
  g.nodes[id] = n;
  g.currentId = id;
  g.rngState = rng.state;
  g.luck = computeLuck(g);
  if (n.outcome === 'death') {
    g.status = g.replants === TUNING.maxReplants ? 'crumbled' : 'dead';
    g.lives.push({
      number: g.lifeNumber,
      deathNodeId: id,
      age: n.deathAge,
      legacy: null,
    });
  }
  return n;
}
export async function choose(g, nodeId, index, deps = { fetchPage }) {
  if (busy.has(g) || g.status !== 'alive' || nodeId !== g.currentId)
    throw Error('Page unavailable');
  const n = g.nodes[nodeId];
  if (index && typeof index === 'object') {
    if (
      !n.chapter ||
      lifeState(g).fateUsedActs.includes(n.act) ||
      !screenFate(index.fate).ok
    )
      throw Error('Pen unavailable');
  } else checkChoice(n, index);
  busy.add(g);
  try {
    const next = await advance(g, n, index, deps);
    if (!next.refused) save(g);
    return next;
  } finally {
    busy.delete(g);
  }
}
export async function replant(g, nodeId, index, deps = { fetchPage }) {
  const path = lifePath(g),
    cut = path.findIndex((n) => n.id === nodeId);
  if (busy.has(g) || !canReplant(g) || cut < 0)
    throw Error('Branch unavailable');
  checkChoice(path[cut], index);
  busy.add(g);
  try {
    const draft = structuredClone(g);
    for (const n of path.slice(cut + 1)) {
      draft.nodes[n.id].dead = true;
      draft.erasedMemories.push(n.summaryLine);
    }
    draft.replants++;
    draft.lifeNumber++;

    draft.status = 'alive';
    draft.currentId = nodeId;
    draft.luck = computeLuck(draft);
    const next = await advance(draft, draft.nodes[nodeId], index, deps);
    Object.assign(g, draft);
    save(g);
    return next;
  } finally {
    busy.delete(g);
  }
}
export function eraFor(
  g,
  act = g.nodes[g.currentId].act,
  state = lifeState(g),
) {
  return buildEraMap(act, {
    seed: g.seed,
    life: g.lifeNumber,
    rot: g.replants,
    lifeState: state,
  });
}
function resident(state, id) {
  const person = [state.partner, state.child].find((p) => p?.npcId === id);
  return { ...NPCS[id], id, name: person?.name || NPCS[id]?.name || id };
}
export function nearby(g, n = g.nodes[g.currentId]) {
  const s = lifeState(g);
  return Object.values(eraFor(g, n.act, s).areas).map((a) => ({
    ...a,
    residents: a.residents.map((id) => resident(s, id)),
  }));
}
export const talksUsed = (n) =>
  n.events.filter((e) => e.type === 'encounter' || e.type === 'talk').length;
export const pickedItems = (g) =>
  lifePath(g).flatMap((n) =>
    n.events.filter((e) => e.type === 'keepsake').map((e) => e.item.id),
  );
export const roomOpened = (g, act) =>
  lifePath(g).some(
    (n) => n.act === act && n.events.some((e) => e.type === 'unlock'),
  );
function encounterLines(g) {
  return lifePath(g).flatMap((n) =>
    n.events
      .filter((e) => e.type === 'encounter')
      .map((e) => STRANGERS[e.strangerId].description + ' ' + e.reply),
  );
}
const exchanges = new WeakMap();
function talkContext(g, npcId) {
  const n = g.nodes[g.currentId],
    stranger = spawnStrangers(g, n.id, eraFor(g)).find((s) => s.id === npcId);
  const b = nearby(g).find((a) =>
    stranger ? a.id === stranger.area : a.residents.some((r) => r.id === npcId),
  );
  if (
    busy.has(g) ||
    !n.chapter ||
    g.status !== 'alive' ||
    !b ||
    talksUsed(n) >= TUNING.talks ||
    n.events.some((e) => e.npcId === npcId || e.strangerId === npcId)
  )
    throw Error('Conversation unavailable');
  return {
    n,
    b,
    stranger,
    npc: stranger
      ? { id: npcId, name: npcId, role: stranger.description }
      : b.residents.find((r) => r.id === npcId),
  };
}
export async function startTalk(g, npcId, deps = { fetchTalk }) {
  const { n, b, npc, stranger } = talkContext(g, npcId),
    s = lifeState(g),
    gardener = npcId === 'gardener';
  busy.add(g);
  try {
    const p = {
      name: g.name,
      act: n.act,
      chapter: n.chapter,
      ages: n.ages,
      tone: toneWord(s.luck),
      rot: g.replants,
      building: b.name,
      kind: stranger ? 'stranger' : gardener ? 'gardener' : 'resident',
      ...(stranger ? { stranger } : {}),
      npc: {
        ...npc,
        bond: s.bonds[npcId] || 0,
        met_before: lifePath(g).some((n) =>
          n.events?.some((e) => e.npcId === npcId),
        ),
        is_gardener: gardener,
      },
      marks: s.marks.slice(-8),
      page_narration: n.narration,
      erased_memories: g.erasedMemories.slice(-4),
      allowed_effects: stranger
        ? ['none', ...stranger.allowed_effects]
        : [
            'none',
            'bond_up',
            'bond_down',
            'insight',
            'blessing',
            'omen',
            ...(gardener ? ['bargain'] : []),
          ],
    };
    const exchange = { ...(await deps.fetchTalk(p)) };
    if (gardener) exchange.line = gardenerLine(g.replants, n.act);
    exchange.replies = [
      ...exchange.replies,
      ...s.keepsakes
        .filter((item) => !item.key && item.id !== 'key')
        .map((item) => ({
          text: 'Give them the ' + item.name,
          item,
          want: 'love',
          moral: 'kind',
          effect: stranger ? 'blessing' : 'bond_up',
          response: 'They hold it like it might break.',
        })),
    ];
    exchanges.set(exchange, { g, n, npcId });
    return exchange;
  } finally {
    busy.delete(g);
  }
}
export function finishTalk(g, npcId, exchange, index) {
  const { n } = talkContext(g, npcId),
    issued = exchanges.get(exchange);
  if (issued?.g !== g || issued.n !== n || issued.npcId !== npcId)
    throw Error('Exchange expired');
  const reply =
    index === null
      ? { text: 'Say nothing', moral: 'neutral', effect: 'none' }
      : exchange.replies[index];
  if (!reply) throw Error('Reply unavailable');
  let effect = reply.effect;
  const free =
    effect === 'insight' &&
    nearbyAreas(eraFor(g), n.area, 2).find(
      (a) => !n.choices.some((c) => c.place === a.id),
    );
  if (effect === 'insight' && (!free || n.choices.some((c) => c.insight)))
    effect = 'none';
  const event = {
    ...(STRANGERS[npcId]
      ? { type: 'encounter', strangerId: npcId }
      : { type: 'talk', npcId }),
    flag:
      effect === 'flag' && STRANGERS[npcId]?.allowed_flags.includes(reply.flag)
        ? reply.flag
        : 'none',
    reply: reply.text,
    moral: reply.moral,
    want: reply.want || 'none',
    effect,
    luckDelta: TUNING.morals[reply.moral],
    bondDelta: effect === 'bond_up' ? 1 : effect === 'bond_down' ? -1 : 0,
    insight: null,
  };
  if (effect === 'insight') {
    event.insight = {
      ...reply.insight_choice,
      place: free.id,
      want: reply.want || 'none',
      moral: 'neutral',
      mark: reply.insight_choice.text.slice(0, 40),
      flag: 'none',
      insight: true,
    };
    n.choices.push(event.insight);
  }
  if (effect === 'bargain')
    event.debt = {
      id: 'b' + n.id,
      text: reply.response,
      due: n.chapter + 2,
      source: 'bargain',
    };
  if (reply.item)
    n.events.push({ type: 'gift', item: reply.item, to: npcId, luckDelta: 0 });
  n.events.push(event);
  g.luck = computeLuck(g);
  exchanges.delete(exchange);
  save(g);
  return event;
}
export function finishEncounter(g, id, exchange, index) {
  if (!STRANGERS[id]) throw Error('Unknown stranger');
  return finishTalk(g, id, exchange, index);
}
export function epitaphPayload(g) {
  const want = currentWant(g);
  return {
    name: g.name,
    want,
    want_shadow: WANTS[want].shadow,
    what_you_left: g.lives.at(-1)?.legacy?.what_you_left,
    alter_egos: g.lives
      .slice(0, -1)
      .map((l) => ({
        life: l.number,
        age: l.age,
        what_you_left: l.legacy?.what_you_left,
      })),
    age_at_death: g.nodes[g.currentId].deathAge,
    summary: buildSummary(g),
    replants: g.replants,
    lives_lived: g.lifeNumber,
  };
}
const pendingLegacies = new WeakMap();
export function ensureLegacy(g, deps = { fetchLegacy }) {
  const record = g.lives.at(-1);
  if (record.legacy) return Promise.resolve(record.legacy);
  if (pendingLegacies.has(record)) return pendingLegacies.get(record);
  const s = lifeState(g),
    n = g.nodes[record.deathNodeId],
    want = WANTS[currentWant(g)],
    people = peopleFor(s);
  const payload = {
    name: g.name,
    want: currentWant(g),
    want_wish: want.wish,
    want_shadow: want.shadow,
    age_at_death: n.deathAge,
    death: n.summaryLine,
    act: n.act,
    rot: g.replants,
    summary: buildSummary(g),
    marks: s.marks,
    people,
    wishes_granted: s.wishes.filter((w) => w.granted).map((w) => w.answer),
    wishes_ungranted: s.wishes.filter((w) => !w.granted).map((w) => w.answer),
    debts_unpaid: s.debts.filter((d) => !d.paid).map((d) => d.text),
    strangers_met: encounterLines(g),
    keepsakes_kept: s.keepsakes.map((i) => i.name),
    keepsakes_given: lifePath(g).flatMap((n) =>
      n.events
        .filter((e) => e.type === 'gift')
        .map((e) => ({ item: e.item.name, to: e.to })),
    ),
    buildings: Object.values(eraFor(g, n.act, s).areas)
      .filter((a) => a.kind === 'exterior')
      .map(({ id, name }) => ({ id, name })),
    regret_candidates: regretCandidates(g),
  };
  const request = deps
    .fetchLegacy(payload)
    .then((result) => {
      record.legacy = {
        ...result,
        stats: {
          remembered: people.filter((p) => p.bond >= 2).length,
          hurt: people.filter((p) => p.bond <= -1).length,
          wishes: payload.wishes_granted.length,
          debts: payload.debts_unpaid.length,
        },
      };
      save(g);
      return record.legacy;
    })
    .finally(() => pendingLegacies.delete(record));
  pendingLegacies.set(record, request);
  return request;
}
