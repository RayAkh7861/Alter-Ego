// Owner: B
import { lighting } from './lighting.js';
import { fixtures } from './areaArt.js';
import { actFor } from '../acts.js';
import { doorsFor, BUILDINGS, NPCS, gardenerLine } from './cast.js';
import { npcSprite } from './sprites.js';
import { hash } from '../pixel.js';
import { layoutTree } from '../tree.js';
import { spriteFrames } from './sprites.js';
import {
  rect,
  repeat,
  tree,
  house,
  pine,
  mountain,
  boat,
  fence,
  lamp,
  ground,
  canopy,
  group,
} from './kit.js';
const lines = {
  village: [
    'Bread cools on a windowsill.',
    'The bell rope stirs in the breeze.',
  ],
  home: [
    'The latch still sticks in winter.',
    'Your height is marked on the doorframe.',
  ],
  city: [
    'A clock strikes across the square.',
    'New posters cover an old address.',
  ],
  harbour: [
    'Gulls argue over a fish crate.',
    'The ropes smell of salt and tar.',
  ],
  sea: ['A sail lifts beyond the swell.', 'Foam rattles along the boards.'],
  forest: [
    'A blackbird answers your footsteps.',
    'Moss has swallowed a milestone.',
  ],
  fields: ['The fence hums in the wind.', 'Seed husks gather in the furrows.'],
  mountains: ['Clouds snag on the peaks.', 'A cairn marks the way home.'],
};
export function buildScene(
  setting,
  { chapter = 1, seed = 0, rot = 0, strangers = [] } = {},
) {
  const shift = hash(seed) % 16,
    season =
      chapter <= 2
        ? 'spring'
        : chapter <= 5
          ? 'summer'
          : chapter <= 8
            ? 'autumn'
            : 'winter';
  const sky =
    rect(48, 30, 9, 10, 'th-moon') +
    rect(46, 28, 8, 9, 'th-sky') +
    repeat(55, (i) =>
      rect((i * 73 + shift) % 384, 8 + ((i * 31) % 92), 1, 1, 'th-star'),
    );
  let middle =
      repeat(6, (i) => mountain(i * 75, 158, 15 + ((i * 17) % 28))) +
      tree(161, 150, 6),
    props = '';
  if (['harbour', 'sea'].includes(setting)) {
    middle +=
      rect(0, 143, 384, 35, 'sc-water') +
      repeat(100, (i) =>
        rect((i * 37) % 384, 146 + ((i * 7) % 26), 4 + (i % 8), 1, 'sc-wave'),
      );
    props += repeat(3, (i) => boat(40 + i * 121 + shift, 160 - (i % 2) * 4));
    if (setting === 'harbour') props += house(85, 175, 40, 32) + lamp(153, 175);
    props +=
      rect(0, 172, 384, 4, 'th-w3') +
      repeat(40, (i) => rect(i * 10, 173, 1, 3, 'th-w1'));
  } else if (['home', 'village', 'city'].includes(setting)) {
    const city = setting === 'city',
      count = city ? 8 : setting === 'home' ? 2 : 5;
    props += repeat(count, (i) =>
      house(
        14 + shift + i * (city ? 47 : 76),
        175,
        city ? 40 : 33,
        (city ? 50 : 27) + ((i * 7) % 16),
      ),
    );
    props += tree(196 + shift, 176, 13) + fence(234, 175, 61) + lamp(101, 175);
  } else if (setting === 'forest') {
    middle += repeat(20, (i) => pine(i * 22, 170, 25 + ((i * 13) % 22)));
    props += repeat(7, (i) =>
      tree(14 + i * 58 + shift, 176, 8 + ((i * 3) % 8)),
    );
  } else if (setting === 'mountains') {
    middle += repeat(6, (i) =>
      mountain(i * 80 + shift, 173, 48 + ((i * 17) % 38)),
    );
    props += repeat(11, (i) => pine(i * 38 + shift, 175, 10 + ((i * 7) % 19)));
  } else {
    middle += repeat(30, (i) => rect(i * 13, 157 + (i % 3), 15, 17, 'th-g1'));
    props +=
      house(91 + shift, 175, 31, 25) +
      fence(153, 175, 105) +
      repeat(65, (i) => rect(i * 6, 168 + (i % 4), 2, 7, 'th-g2'));
  }
  const stations = doorsFor(actFor(chapter), setting, rot, seed).map((b) => ({
    ...b,
    label: b.closed
      ? b.interior
        ? 'Boarded up.'
        : 'The school closed years ago.'
      : 'Enter ' + b.name,
    text: b.closed
      ? b.interior
        ? 'Boarded up.'
        : 'The school closed years ago.'
      : null,
  }));
  for (const b of stations) {
    props += house(b.x - 18, 175, 29, 34);
    if (b.board || b.closed) props += rect(b.x - 14, 149, 9, 2, 'th-w2');
    if (b.closed)
      props += rect(b.x, 164, 8, 3, 'th-w3') + rect(b.x, 170, 8, 2, 'th-w3');
  }
  if (rot && stations.length === 0) props += rect(92, 152, 9, 2, 'th-w3');
  if (rot === 2 && strangers.length) {
    const npc = NPCS[strangers[0]];
    if (npc) {
      props += group(183, 175, npcSprite(npc, actFor(chapter), chapter));
      stations.push({
        type: 'look',
        x: 183,
        label: 'A stranger',
        text: "They stare at you like they've lost something.",
      });
    }
  }
  const looks = (lines[setting] || lines.village).map((text, i) => ({
    type: 'look',
    x: 78 + i * 88,
    text,
    label: 'Look closer',
  }));
  return {
    id: setting,
    width: 384,
    height: 192,
    floorY: 176,
    walk: [12, 372],
    spawnX: 20,
    camera: { y: 32, lookUp: 0, lookDown: 32 },
    season,
    layers: [
      { parallax: 0.25, svg: sky },
      { parallax: 0.6, svg: middle },
      {
        parallax: 1,
        svg: ground(season, ['city', 'village'].includes(setting)) + props,
      },
    ],
    looks,
    stations,
  };
}
export function buildPrologueScene() {
  return {
    id: 'prologue',
    width: 256,
    height: 160,
    floorY: 139,
    walk: [154, 230],
    spawnX: 156,
    camera: { y: 0, lookUp: 0, lookDown: 0 },
    layers: [
      {
        parallax: 1,
        svg: '<g data-hero transform="translate(132 8)"></g><path fill="#cdbf9e" d="M187 134h2v5h-2z"/><path fill="#fff0c0" d="M188 130l1 3h-2z"/>',
      },
    ],
    looks: [],
    stations: [{ type: 'door', x: 188, label: 'Step inside', index: 0 }],
  };
}
export function buildTreehouseScene(game, rot = game.replants) {
  const layout = layoutTree(game),
    extra = Math.max(0, layout.width - 100),
    width = 440 + extra;
  let room =
    rect(0, 32, width, 136, 'th-w1') +
    repeat(17, (i) => rect(0, 33 + i * 8, width, 7, i % 3 ? 'th-w2' : 'th-w1'));
  room += repeat(
    Math.ceil(width / 40),
    (i) =>
      rect(i * 40, 32, 4, 136, 'th-b2') + rect(i * 40 + 1, 32, 1, 136, 'th-w3'),
  );
  room +=
    rect(0, 166, width, 10, 'th-w3') +
    rect(0, 169, width, 5, 'th-b2') +
    rect(18, 167, 21, 5, 'th-ink');
  room += repeat(8, (i) => rect(18 + (i % 4) * 3, 174 + 4 * i, 14, 2, 'th-w2'));
  room +=
    rect(66, 98, 20, 24, 'th-w3') +
    rect(63, 102, 26, 16, 'th-w3') +
    rect(66, 103, 20, 14, 'th-sky') +
    canopy(76, 109, 7) +
    rect(75, 100, 2, 21, 'th-w2');
  const windowText = [
    "Green leaves, loud with birds. It's hard to believe anything ends.",
    "Yellow leaves drift past the glass. You don't remember autumn coming.",
    'The branches creak in no wind. The tree knows what you did.',
    'Bare branches scratch at the glass, like something asking to be let in.',
  ];
  const stations = [
    {
      type: 'hatch',
      x: rot === 3 ? 60 : 28,
      label: 'Floor hatch',
      text: 'The stair winds back down to the island.',
    },
    {
      type: 'window',
      x: 76,
      label: 'Round window',
      text: windowText[rot],
    },
  ];
  for (let life = 1; life <= game.lifeNumber; life++) {
    const death = Object.values(game.nodes).find(
        (n) => n.life === life && n.outcome === 'death',
      ),
      x = 112 + (life - 1) * 24;
    stations.push({
      type: 'portrait',
      x,
      label: 'Life ' + life,
      text:
        'Life ' +
        life +
        ' · Died at ' +
        (death?.deathAge ?? '—') +
        ' · ' +
        (death?.summaryLine ?? ''),
      legacyLine: game.lives?.find((l) => l.number === life)?.legacy?.lines[0]
        ?.text,
      erased: life < game.lifeNumber,
    });
    if ((rot >= 2 && life === 1) || (rot === 3 && life < game.lifeNumber)) {
      room += rect(x - 8, 163, 17, 3, 'th-w1');
      continue;
    }
    room +=
      rect(x - 8, 109, 17, 22, 'th-w3') +
      rect(x - 6, 111, 13, 18, 'th-unlit') +
      '<g class="' +
      (life < game.lifeNumber ? 'portrait-old' : '') +
      '">' +
      group(x, 128, spriteFrames('adult').idle[0]) +
      '</g>';
    if (life < game.lifeNumber)
      room += repeat(6, (i) =>
        rect(x - 5 + Math.floor(i / 2), 112 + i, 1, 1, 'th-stone'),
      );
  }
  room += repeat(
    4,
    (i) =>
      rect(48 + i * 108, 39, 1, 24, 'th-ink') +
      '<g class="lantern lantern-' +
      i +
      '">' +
      rect(45 + i * 108, 63, 7, 8, 'th-glow') +
      '</g>',
  );
  room +=
    '<g data-room-tree transform="translate(' +
    (260 - layout.rootX) +
    ' 52)"></g>';
  const lectern = 392 + extra;
  room +=
    rect(lectern - 2, 149, 5, 17, 'th-w3') +
    rect(lectern - 9, 147, 19, 3, 'th-b1') +
    rect(lectern - 8, 144, 8, 3, 'th-moon2') +
    rect(lectern + 1, 143, 8, 4, 'th-star');
  stations.push(
    { type: 'tree', x: 260, label: 'Your life tree' },
    { type: 'book', x: lectern, label: 'Book on the lectern' },
  );
  if (rot === 3) {
    room = room.replace(/<rect x="(\d+)" y="(\d+)"/g, (m, x, y) =>
      +y >= 32 && +y < 166
        ? '<rect x="' + (+x + Math.floor((166 - y) / 45)) + '" y="' + y + '"'
        : m,
    );
  }
  if (rot) {
    stations.push({
      type: 'gardener',
      x: 91,
      label: 'The Gardener',
      text: gardenerLine(rot, 3),
    });
    room +=
      group(91, 168, npcSprite(NPCS.gardener, 3, 10)) +
      repeat(3, (i) => rect(4 + i * 23, 45 + i * 24, 21, 4, 'th-b2')) +
      repeat(6, (i) => rect(i * 2, 162 - (i % 3), 4, 3, 'th-m1')) +
      '<g class="drip">' +
      rect(59, 48, 1, 3, 'sc-wave') +
      '</g>';
  }
  if (rot >= 2) {
    room +=
      repeat(
        4,
        (i) =>
          rect(4 + i, 40 + i, 12 - i * 2, 1, 'th-smoke') +
          rect(5 + i * 2, 39, 1, 7 - i, 'th-smoke'),
      ) +
      rect(112, 166, 24, 10, 'th-unlit') +
      rect(52, 32, 18, 10, 'th-sky') +
      group(
        52,
        43,
        '<g class="drip">' +
          repeat(5, (i) => rect(i * 3, i * 5, 1, 5, 'sc-wave')) +
          '</g>',
      ) +
      repeat(8, (i) => rect(67 + i, 103 + i, 1, 1, 'th-ink')) +
      rect(45, 63, 7, 8, 'th-unlit') +
      repeat(5, (i) => rect(144 + i * 3, 162 - (i % 3), 3, 3, 'th-m2'));
  }
  if (rot === 3) {
    room +=
      rect(0, 166, 48, 11, 'th-sky') +
      rect(2, 32, width - 40, 15, 'th-sky') +
      repeat(16, (i) => rect(i * 25, 34 + (i % 4), 18, 2, 'th-b3')) +
      rect(387, 118, 5, 6, 'lt-kind');
  }
  return {
    id: 'treehouse',
    rot,
    width,
    height: 208,
    floorY: 168,
    walk: [rot === 3 ? 60 : 20, 420 + extra],
    spawnX: rot === 3 ? 60 : 28,
    camera: { y: 24, lookUp: 0, lookDown: 48 },
    layers: [
      {
        parallax: 1,
        svg:
          repeat(56, (i) =>
            rect((i * 71) % width, (i * 7) % 32, 1, 1, 'th-star'),
          ) +
          repeat(Math.ceil(width / 20), (i) =>
            canopy(i * 20, 3 + (i % 6), 24),
          ) +
          room,
      },
    ],
    looks: [],
    stations,
  };
}
export function buildLegacyScene(act, { changes = [], seed = 0, map } = {}) {
  if (map) {
    const exteriors = Object.values(map.areas).filter(
      (a) => a.kind === 'exterior',
    );
    const buildings = exteriors.map((a, i) => ({
      id: a.id,
      name: a.name,
      x: i * 256 + 128,
      ...changes.find((c) => c.building_id === a.id),
    }));
    const svg = exteriors
      .map((a, i) => {
        const change = buildings[i].state,
          lamps = a.lights.map((l) => ({
            ...l,
            lit:
              change === 'thriving' ||
              (l.lit && !['closed', 'ruined'].includes(change)),
          }));
        return (
          '<svg x="' +
          i * 256 +
          '" width="256" height="160" viewBox="0 32 320 160" preserveAspectRatio="none">' +
          a.layers[0].svg +
          fixtures({ ...a, lights: lamps }) +
          lighting(
            'legacy' + i,
            a.width,
            a.height,
            lamps,
            map.life - 1,
            map.weather,
          ) +
          '</svg>'
        );
      })
      .join('');
    return {
      id: 'legacy',
      width: 256 * exteriors.length,
      height: 160,
      buildings,
      layers: [{ svg, parallax: 1 }],
    };
  }
  const buildings = BUILDINGS[act].map((b, i) => ({
    ...b,
    x: 45 + i * 79,
    ...changes.find((c) => c.building_id === b.id),
  }));
  const width = Math.max(256, buildings.length * 79 + 40);
  let svg = rect(0, 115, width, 45, 'sc-snow');
  for (const b of buildings) {
    svg +=
      b.state === 'ruined'
        ? rect(b.x - 20, 95, 40, 21, 'sc-brick') +
          rect(b.x - 6, 96, 12, 18, 'th-unlit')
        : house(b.x - 23, 116, 46, 29);
    if (b.state === 'closed') svg += rect(b.x - 15, 99, 30, 3, 'th-w2');
    if (b.state === 'thriving') svg += lamp(b.x + 23, 116);
    if (b.state === 'memorial')
      svg +=
        rect(b.x + 14, 112, 13, 3, 'th-w2') +
        rect(b.x + 17, 109, 2, 3, 'th-r3');
  }
  return {
    id: 'legacy',
    width,
    height: 160,
    floorY: 116,
    buildings,
    walk: [0, width],
    spawnX: 0,
    camera: { y: 0, lookUp: 0, lookDown: 0 },
    layers: [{ parallax: 1, svg }],
    stations: [],
    looks: [],
  };
}
