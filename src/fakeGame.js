// Owner: A
import { newGame, computeLuck } from './state.js';
import { chapterInfo } from './rules.js';
export const fakeGame = newGame(42);
const chapters = [
  [
    'Village Bells',
    'village',
    'You hear the boats calling from beyond the rooftops.',
    'Left the village at dawn.',
    0,
    1,
  ],
  [
    'The Salt Road',
    'harbour',
    'You find three boats tied to the quay. Only two are leaving with the tide.',
    'Reached the harbour before high tide.',
    1,
    2,
  ],
  [
    'Keeping the Light',
    'sea',
    'You polish the lamp while the sea piles against the glass.',
    'Kept a lighthouse through the winter.',
    2,
    3,
  ],
  [
    'The Last Crossing',
    'sea',
    'The boat slips beneath a white wave. Your lantern goes out.',
    'Drowned off Lisbon.',
    3,
    4,
  ],
  [
    'An Inland Tide',
    'city',
    'You follow the river inland. From a bridge you see a city made of lit windows.',
    'Followed the river into the city.',
    2,
    3,
  ],
  [
    'Borrowed Acres',
    'fields',
    'You trade your compass for a patch of ground. In spring the first shoots push through.',
    'Planted an orchard beside the river.',
    5,
    4,
  ],
  [
    'The Final Harvest',
    'home',
    'You come home with apples in your pockets. That night your heart grows quiet.',
    'Died at home after the harvest.',
    6,
    5,
  ],
];
for (const [
  i,
  [title, setting, narration, summaryLine, parent, chapter],
] of chapters.entries()) {
  const num = i + 1,
    death = [4, 7].includes(num),
    life = num >= 5 ? 2 : 1,
    n = fakeGame.nodes['n' + parent];
  const index = num === 5 ? 1 : 0;
  n.tried.push(index);
  n.chosenIndex = index;
  fakeGame.nodes['n' + num] = {
    id: 'n' + num,
    parentId: n.id,
    fromChoice: index,
    life,
    chapter,
    ages: chapterInfo(chapter).ages,
    setting,
    title,
    narration,
    summaryLine,
    choices: death
      ? []
      : (num === 2
          ? ['Tend the lighthouse', 'Follow the river', 'Board the night ferry']
          : ['Find a place to stay', 'Take the long road']
        ).map((text, j) => ({ text, risk: ['safe', 'bold', 'wild'][j] })),
    chosenIndex: null,
    tried: [],
    outcome: death ? 'death' : 'good',
    deathAge: death ? (num === 4 ? 31 : 39) : null,
    dead: num === 3 || num === 4,
    fallback: false,
  };
}
Object.assign(fakeGame, {
  replants: 1,
  lifeNumber: 2,
  luck: 50,
  status: 'dead',
  currentId: 'n7',
  nextId: 8,
  erasedMemories: [
    'Kept a lighthouse through the winter.',
    'Drowned off Lisbon.',
  ],
});

import { buildEraMap, nearbyAreas } from './world/maps.js';
import { actFor } from './acts.js';
import { fallbackPage, fallbackLegacy } from './fallbacks.js';
import { formatFor } from './rules.js';
for (const n of Object.values(fakeGame.nodes)) {
  if (!n.chapter) continue;
  const format = n.outcome === 'death' ? null : formatFor(n.chapter)?.format;
  const map = buildEraMap(actFor(n.chapter), {
    seed: 42,
    life: n.life,
    rot: n.life - 1,
  });
  n.area =
    map.areas[fakeGame.nodes[n.parentId]?.choices[n.fromChoice]?.place]?.id ||
    map.start;
  if (n.chapter === 1 || n.chapter === 5) n.area = map.start;
  const p = fallbackPage(n.outcome, {
    chapter: n.chapter,
    format,
    nearby_areas: nearbyAreas(map, n.area),
  });
  Object.assign(n, {
    act: actFor(n.chapter),
    format,
    question: p.question,
    choices: p.choices,
    moral: 'neutral',
    mark: n.summaryLine,
    flag: 'none',
    forced: null,
    events: [],
    debt: null,
    debtPaid: null,
    wish: null,
    wishGranted: null,
    fateText: null,
    savedBy: null,
    luckDelta: 0,
    ripple: p.ripple,
  });
}
const { n1, n2, n5, n6, n7 } = fakeGame.nodes;
Object.assign(n2, {
  format: 'yesno',
  question: 'Stay with your father?',
  choices: ['Yes, stay', 'No, join Ines'].map((text, i) => ({
    text,
    moral: i === 2 ? 'selfish' : 'kind',
    risk: i === 2 ? 'bold' : 'safe',
    mark: text,
    flag: i === 1 ? 'partner' : 'none',
  })),
});
Object.assign(n5, {
  setting: 'home',
  flag: 'partner',
  mark: 'Married Ines',
  moral: 'kind',
  luckDelta: 2,
  wish: null,
  chosenIndex: null,
  tried: [],
});
Object.assign(n6, {
  setting: 'village',
  fromChoice: null,
  fateText: 'I own the mill',
  mark: 'Wrote: I own the mill',
  moral: 'cruel',
  luckDelta: -10,
  forced: 'fate',
  outcome: 'great',
  debt: { id: 'dn6', text: 'I own the mill', source: 'fate', due: 6 },
});
const event = (npcId, up) => ({
  type: 'talk',
  want: 'none',
  flag: 'none',
  npcId,
  reply: up ? 'Pay him back double' : 'Say you already ate',
  moral: up ? 'kind' : 'selfish',
  effect: up ? 'bond_up' : 'bond_down',
  luckDelta: up ? 2 : -5,
  bondDelta: up ? 1 : -1,
  insight: null,
});
n1.events.push(event('mother', false));
n5.events.push(event('mother', false));
n2.events.push(event('tom', true));
n6.events.push(event('tom', true));
const insight = {
  text: 'Apply for the scholarship',
  risk: 'bold',
  moral: 'neutral',
  mark: 'Applied for the scholarship',
  flag: 'none',
  insight: true,
};
n2.choices.push(insight);
n2.events.push({
  type: 'talk',
  npcId: 'teacher',
  reply: 'Show her the letter',
  moral: 'kind',
  effect: 'insight',
  luckDelta: 2,
  bondDelta: 0,
  insight,
});
fakeGame.lives = [
  {
    number: 1,
    deathNodeId: 'n4',
    age: 31,
    legacy: {
      ...fallbackLegacy({ people: [{ name: 'Tom', bond: 2 }] }),
      stats: { remembered: 1, hurt: 0, wishes: 0, debts: 0 },
    },
  },
  {
    number: 2,
    deathNodeId: 'n7',
    age: n7.deathAge,
    legacy: {
      ...fallbackLegacy({
        people: [{ name: 'Tom', bond: 2 }],
        debts_unpaid: ['I own the mill'],
        regret_candidates: [
          { node_id: 'n2', text: 'Apply for the scholarship' },
        ],
      }),
      stats: { remembered: 1, hurt: 1, wishes: 0, debts: 1 },
    },
  },
];
for (const n of Object.values(fakeGame.nodes).filter((n) => n.chapter)) {
  n.want =
    n.fateText || n.chapter === 1 ? 'none' : n.life === 2 ? 'wealth' : 'love';
  const taken = fakeGame.nodes[n.parentId]?.choices[n.fromChoice];
  if (taken) taken.want = n.want;
  const m = buildEraMap(n.act, { seed: 42, life: n.life });
  n.choices.forEach((c, i) => {
    c.place = nearbyAreas(m, n.area)[i]?.id;
    c.want = c.want || (i === 1 ? 'wealth' : 'love');
  });
}
const key = { id: 'key-1', key: true, act: 1, name: 'brass key' },
  watch = { id: 'watch', name: 'your father’s watch' };
n5.events.push(
  {
    type: 'encounter',
    strangerId: 'recruiter',
    flag: 'left_home',
    want: 'adventure',
    reply: 'Take the ticket',
    effect: 'flag',
    luckDelta: 0,
  },
  { type: 'caught', luckDelta: -5 },
  { type: 'keepsake', item: key },
  { type: 'unlock', item: key },
  { type: 'keepsake', item: watch },
  { type: 'gift', item: watch, to: 'mother' },
);
Object.assign(
  n5.events.find((e) => e.npcId === 'mother'),
  {
    reply: 'Give them the watch',
    moral: 'kind',
    want: 'love',
    effect: 'bond_up',
    bondDelta: 1,
    luckDelta: 2,
  },
);
fakeGame.luck = computeLuck(fakeGame);
export default fakeGame;
