// Owner: B
import { hash } from '../pixel.js';
const cast = {
  mother: ['Maren', 'your mother', '#8a5366'],
  father: ['Hal', 'your father', '#556c76'],
  teacher: ['Miss Avery', 'your teacher', '#5a5f9e'],
  ada: ['Ada', "the baker's daughter", '#ae6847'],
  tom: ['Tom', 'your best friend', '#527a55'],
  gardener: ['the Gardener', 'the caretaker', '#687467'],
  crane: ['Mr Crane', 'your employer', '#544b63'],
  owner: ['the woman who bought your house', 'the new owner', '#8d7056'],
  partner: ['', 'your partner', '#98718c'],
  child: ['', 'your child', '#399391'],
};
export const NPCS = Object.fromEntries(
  Object.entries(cast).map(([id, [name, role, palette]]) => [
    id,
    {
      id,
      name,
      role,
      palette,
      ages:
        id === 'gardener'
          ? ['elder', 'elder', 'elder']
          : ['ada', 'tom', 'child'].includes(id)
            ? ['teen', 'adult', 'elder']
            : ['adult', 'elder', 'elder'],
    },
  ]),
);
const building = (id, name, setting, interior, ids) => ({
  id,
  name,
  setting,
  interior,
  ids,
});
export const BUILDINGS = {
  1: [
    building('house', 'Your house', 'home', 'room', ['mother', 'father']),
    building('school', 'The schoolhouse', 'village', 'hall', ['teacher']),
    building('bakery', 'The bakery', 'village', 'shop', ['ada', 'tom']),
    building('chapel', 'The chapel', 'fields', 'hall', ['gardener']),
  ],
  2: [
    building('flat', 'Your flat', 'home', 'room', []),
    building('office', 'Crane & Sons', 'city', 'hall', ['crane']),
    building('hospital', "St Jude's", 'city', 'ward', ['mother']),
    building('anchor', 'The Anchor', 'harbour', 'tavern', ['tom']),
    building('pawn', 'The pawnshop', 'harbour', 'shop', ['gardener']),
  ],
  3: [
    building('house', 'Your old house', 'home', 'room', []),
    building('bakery', 'The bakery', 'village', 'shop', ['ada']),
    building('school', 'The schoolhouse', 'village', null, []),
    building('churchyard', 'The churchyard', 'forest', 'yard', ['gardener']),
  ],
};
export const buildingsFor = (act, setting) =>
  BUILDINGS[act].filter((b) => b.setting === setting);
export function doorsFor(act, setting, rot, seed) {
  const list = buildingsFor(act, setting);
  const openable = list
    .map((b, i) => (b.interior ? i : null))
    .filter((i) => i !== null);
  const pivot = openable[hash(seed) % openable.length];
  return list.map((b, i) => ({
    ...b,
    x: 60 + 76 * i,
    type: 'door',
    closed:
      !b.interior || (rot === 2 && i === pivot) || (rot >= 3 && i !== pivot),
    board: rot >= 1 && i === pivot,
  }));
}
export function residentsFor(id, act, s = {}) {
  const b = BUILDINGS[act].find((b) => b.id === id);
  if (!b) return [];
  if (id === 'flat' || (id === 'house' && act === 3)) {
    const family = [
      s.partner && {
        ...NPCS.partner,
        id: s.partner.npcId,
        name: s.partner.name,
      },
      s.child && { ...NPCS.child, name: s.child.name },
    ].filter(Boolean);
    return !family.length && act === 3 ? [NPCS.owner] : family;
  }
  return b.ids
    .filter(
      (n) =>
        !(n === 'mother' && id === 'hospital' && s.flags?.estranged) &&
        !(act > 1 && n === s.partner?.npcId),
    )
    .map((n) =>
      n === 'gardener'
        ? {
            ...NPCS[n],
            role: [
              'an old man sweeping the chapel step',
              'the pawnbroker',
              'the gravedigger',
            ][act - 1],
          }
        : NPCS[n],
    );
}
export function gardenerLine(rot, act) {
  return (
    [
      null,
      "You've been here before. You walked differently.",
      'Every time you go back, something up there dies. You can smell it.',
      "The tree can't hold you much longer. Neither can I.",
    ][rot] ||
    [
      "Sweeping won't stop the leaves falling. I do it anyway.",
      "Everything in here was somebody's once. People sell what they can't carry.",
      'Graves are only gardens with better manners. Yours is coming along.',
    ][act - 1]
  );
}
export function gravestones(s = {}, game) {
  const living = BUILDINGS[3].flatMap((b) =>
    residentsFor(b.id, 3, s).map((n) => n.id),
  );
  const ids = [
    ...new Set(
      [1, 2].flatMap((a) =>
        BUILDINGS[a].flatMap((b) => residentsFor(b.id, a, s).map((n) => n.id)),
      ),
    ),
  ];
  const graves = ids
    .filter((id) => !living.includes(id))
    .map((id) => {
      const n = NPCS[id],
        bond = s.bonds?.[id] || 0;
      return (
        n.name +
        '. ' +
        (bond >= 2
          ? 'Loved, and told so.'
          : bond <= -2
            ? 'Waited.'
            : n.role + '.')
      );
    });
  if (game?.replants >= 2)
    graves.push(
      game.name + '. ' + game.lives[0].age + ". You don't remember dying here.",
    );
  return graves;
}
