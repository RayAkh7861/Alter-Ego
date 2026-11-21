// Owner: B
import { bitmap } from '../pixel.js';
export const ageFor = (c) =>
  c <= 1 ? 'child' : c === 2 ? 'teen' : c <= 6 ? 'adult' : 'elder';
const heads = {
  child: ['..hhh..', '.hssh..', '..sst..'],
  teen: ['..hhhh..', '.hhssh..', '..ssst..', '...st...'],
  adult: ['..hhhh...', '.hhhshh..', '..sssst..', '..tsss...', '...tt....'],
  elder: ['...hhh...', '..hhssh..', '...ssst..', '...ttt...'],
};
export function spriteFrames(age = 'adult') {
  const w = heads[age][0].length,
    elder = age === 'elder',
    small = age === 'child';
  const body = (
    small
      ? ['..rrr..', '.rRrrr.', '.rRRrr.', 'rrRRRrr', 'rrrrrrr']
      : [
          '..rrrr..',
          '.rRRrrr.',
          '.rRRRrr.',
          '.rRRRrr.',
          'rrRRRRrr',
          'rrrrrrrr',
          '..kk.k..',
        ]
  ).map((r) => r.padEnd(w, '.'));
  const colors = {
    h: elder ? 'ch-grey' : 'ch-hair',
    s: 'ch-skin',
    t: 'ch-shadow',
    r: 'ch-dark',
    R: 'ch-cloak',
    k: 'ch-ink',
    c: 'ch-cane',
  };
  function draw(i, idle) {
    const leg = (
      idle
        ? ['..k.k..', '..k.kk.']
        : [
            ['.kk..k.', 'kk...kk'],
            ['..kk.k.', '...k.kk'],
            ['...kk..', '..kk.k.'],
            ['..k.kk.', '.kk..k.'],
          ][i]
    ).map((r) => r.padEnd(w, '.'));
    const rows = [...heads[age], ...body, ...leg].map((r, y) =>
      elder && y >= 6 ? r.slice(0, -1) + 'c' : r,
    );
    return (
      '<g transform="translate(' +
      -Math.floor(w / 2) +
      ' ' +
      (-rows.length + (idle ? i : 0)) +
      ')">' +
      bitmap(rows, colors) +
      '</g>'
    );
  }
  return {
    run: [0, 1, 2, 3, 2, 1].map(
      (n, i) =>
        '<g transform="skewX(' +
        (-5 + (i % 2) * 2) +
        ')">' +
        draw(n, false) +
        '</g>',
    ),
    climb: [0, 1, 2, 3].map(
      (n) =>
        draw(n, false) +
        '<rect x="' +
        (n % 2 ? -4 : 3) +
        '" y="-10" width="2" height="4" class="ch-skin"/>',
    ),
    crouch: [draw(0, true), draw(1, true)],
    crouchWalk: [draw(1, false), draw(3, false)],
    hide: [draw(0, true)],
    startle: [draw(1, true), draw(0, true)],
    idle: [draw(0, true), draw(1, true)],
    walk: [0, 1, 2, 3].map((i) => draw(i, false)),
  };
}
export function npcSprite(npc, act, chapter) {
  const child =
    ['child', 'lostboy', 'matchgirl', 'boyofeight'].includes(npc.id) ||
    (act === 1 && ['ada', 'tom'].includes(npc.id));
  const coats = {
    matchgirl: 'M-7 -5h14v2H-7z',
    recruiter: 'M-6 -16h12v2H-6z',
    coincounter: 'M3 -6h8v6H3z',
    lostboy: 'M-3 -1h6v1h-6z',
    tallwoman: 'M-4 -20h7v7h-2v-5h-5z',
    hoursman: 'M-8 -6h16v3H-8z',
    coatwoman: 'M-5 -11h10l3 10h-16z',
    clerk: 'M-8 -6h18v2H-8z',
    nightnurse: 'M5 -17h4v5H5z',
    gambler: 'M3 -8l7 -3v5H4z',
    widow: 'M-4 -15h9l2 11h-10z',
    collector: 'M2 -11h8v8H2z',
    caller: 'M-4 -13h8v9h-8z',
    diggers: 'M6 -15h1v11h3l-3 4 -3 -4h2z',
    gardener: 'M-6 -16h12v2H-6zM-3 -19h6v3h-6z',
  };
  const profile =
    npc.id === 'diggers'
      ? '<g transform="translate(8 0)">' +
        spriteFrames('adult').idle[0] +
        '</g>'
      : '';
  return (
    '<g class="npc npc-' +
    npc.id +
    '" style="--coat:#4b5048" transform="scale(' +
    (child ? '1' : npc.id === 'gardener' ? '1.1 2.8' : '1.25 2.05') +
    ')">' +
    spriteFrames(child ? 'child' : 'adult').idle[0] +
    profile +
    (coats[npc.id] ? '<path d="' + coats[npc.id] + '" fill="#b9ad94"/>' : '') +
    '</g>'
  );
}
