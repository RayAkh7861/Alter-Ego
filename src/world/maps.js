// Owner: B
import { hash } from '../pixel.js';
import { areaArt } from './areaArt.js';
import { residentsFor } from './cast.js';

const templates = {
  1: {
    required: ['bedroom', 'kitchen', 'lane', 'roots'],
    optional: [
      'schoolhouse',
      'bakery',
      'chapel',
      'well_square',
      'forest_path',
      'cellar',
      'fields',
    ],
    start: 'bedroom',
    first: 'lane',
    last: 'roots',
  },
  2: {
    required: ['flat', 'stairwell', 'avenue', 'office_floor'],
    optional: [
      'boardroom',
      'hospital',
      'bar',
      'pawnshop',
      'tram_stop',
      'quay',
      'alley',
    ],
    start: 'flat',
    first: 'avenue',
    last: 'avenue',
  },
  3: {
    required: ['old_house', 'lane_winter', 'roots_winter'],
    optional: ['bakery_old', 'churchyard', 'shore', 'pier', 'chapel_ruin'],
    start: 'old_house',
    first: 'lane_winter',
    last: 'roots_winter',
  },
};
const exteriors = new Set([
  'lane',
  'roots',
  'well_square',
  'forest_path',
  'fields',
  'avenue',
  'tram_stop',
  'quay',
  'alley',
  'lane_winter',
  'roots_winter',
  'churchyard',
  'shore',
  'pier',
]);
const names = {
  bedroom: 'The bedroom',
  kitchen: 'The kitchen',
  lane: 'The lane',
  roots: 'The roots',
  schoolhouse: 'The schoolhouse',
  bakery: 'The bakery',
  chapel: 'The chapel',
  well_square: 'The well square',
  forest_path: 'The forest path',
  cellar: 'The cellar',
  fields: 'The fields',
  flat: 'Your flat',
  stairwell: 'The stairwell',
  avenue: 'The avenue',
  office_floor: 'The office floor',
  boardroom: 'The boardroom',
  hospital: "St Jude's",
  bar: 'The Anchor',
  pawnshop: 'The pawnshop',
  tram_stop: 'The tram stop',
  quay: 'The quay',
  alley: 'The alley',
  old_house: 'Your old house',
  lane_winter: 'The old lane',
  roots_winter: 'The roots',
  bakery_old: 'The bakery',
  churchyard: 'The churchyard',
  shore: 'The shore',
  pier: 'The pier',
  chapel_ruin: 'The ruined chapel',
};
const buildings = {
  kitchen: 'house',
  flat: 'flat',
  old_house: 'house',
  schoolhouse: 'school',
  bakery: 'bakery',
  bakery_old: 'bakery',
  chapel: 'chapel',
  office_floor: 'office',
  hospital: 'hospital',
  bar: 'anchor',
  pawnshop: 'pawn',
  churchyard: 'churchyard',
};

function areaFor(id, act, state, seed) {
  const kind =
    id === 'stairwell'
      ? 'vertical'
      : exteriors.has(id)
        ? 'exterior'
        : 'interior';
  const height = kind === 'vertical' ? 384 : 192;
  const floorY = height - 16,
    width = kind === 'vertical' ? 256 : 320;
  const landings =
    kind === 'vertical'
      ? [
          { x: 110, y: floorY, toX: 134, toY: floorY - 96, kind: 'stairs' },
          {
            x: 172,
            y: floorY - 96,
            toX: 172,
            toY: floorY - 192,
            kind: 'ladder',
          },
        ]
      : [];
  const residents = buildings[id]
    ? residentsFor(buildings[id], act, state).map((n) => n.id)
    : [];
  const signature = {
    bedroom: 'The wardrobe handle is higher than your head.',
    kitchen: 'Someone has set four places. There are three of you.',
    lane: 'The same window burns all night.',
    roots: 'A brass hinge is buried in the bark.',
    schoolhouse: 'Your name is still written on the board.',
    bakery: 'A twist of paper holds the last crust.',
    chapel: 'There is a broom against the altar.',
    well_square: 'The bucket comes up warm.',
    forest_path: 'Two sets of prints go in. One comes out.',
    cellar: 'A nail holds the outline of a missing key.',
    fields: 'The scarecrow faces the road now.',
    flat: 'A little shoe is propping the door open.',
    stairwell: 'Someone has numbered the landings twice.',
    avenue: 'The clock has no minute hand.',
    office_floor: 'Every desk has the same photograph.',
    boardroom: 'There is a glass of water at every place.',
    hospital: 'The brass bell has worn through its cord.',
    bar: 'A ring on the counter fits your glass.',
    pawnshop: 'Your initials are inside a stranger’s watch.',
    tram_stop: 'The last departure has been rubbed out.',
    quay: 'There is a name under the fresh paint.',
    alley: 'Water runs uphill along the gutter.',
    old_house: 'The dust stops where your chair stood.',
    lane_winter: 'The schoolhouse has boards over its door.',
    roots_winter: 'The little hinge still moves.',
    bakery_old: 'The last loaf is made of plaster.',
    churchyard: 'Under the frost the dates are legible.',
    shore: 'Grey water has filled the boat.',
    pier: 'A rope goes straight down into the fog.',
    chapel_ruin: 'Snow has collected in the open book.',
  };
  const lines = [
    signature[id],
    'Someone has left a chair facing the wall.',
    'The floor remembers every footstep.',
    'A door closes somewhere out of sight.',
  ];
  const offset = (hash(seed + ':' + id) % 3) + 1;
  return {
    id,
    name: names[id],
    kind,
    width,
    landings,
    height,
    floorY,
    walk: [16, width - 16],
    layers: areaArt({ id, kind, width, height, floorY, landings }, act, seed),
    exits: [],
    doors: [],
    climbs: [],
    hides: [
      {
        x: 120,
        w: 24,
        label:
          kind === 'exterior'
            ? 'Behind the railing'
            : id === 'bedroom'
              ? 'Under the bed'
              : 'Under the table',
      },
    ],
    lights: [
      { x: 150, y: floorY - 55, r: 40, kind: 'lamp', lit: true, toggle: false },
      {
        x: width - 46,
        y: floorY - 21,
        r: 38,
        kind: 'lamp',
        lit: false,
        toggle: true,
      },
    ],
    looks: [0, 1].map((n, i) => ({
      x: 200 + i * 40,
      text: lines[n ? offset : 0],
    })),
    residents,
    spawnPoints: [80, 240],
    markerSlots: [70, 160, 250],
    keepsakeSlots: [width - 30, width - 48],
    crawl: null,
  };
}

export function buildEraMap(
  act,
  { seed = 0, life = 1, rot = 0, lifeState = {} } = {},
) {
  const spec = templates[act];
  if (!spec) throw new RangeError('Unknown act');
  const selected = [...spec.optional]
    .sort(
      (a, b) =>
        hash(seed + ':' + life + ':' + act + ':' + a) -
        hash(seed + ':' + life + ':' + act + ':' + b),
    )
    .slice(0, 3);
  if (selected.every((id) => exteriors.has(id))) {
    const indoor = spec.optional.filter((id) => !exteriors.has(id));
    selected[2] = indoor[hash(seed + ':room:' + life) % indoor.length];
  }
  const ids = [...spec.required, ...selected];
  const areas = Object.fromEntries(
    ids.map((id) => [id, areaFor(id, act, lifeState, seed + ':' + life)]),
  );
  const links = [];
  function connect(from, to, kind = 'door', locked = null) {
    links.push({ from, to, kind, locked });
    if (kind === 'exit') {
      areas[from].exits.push({ side: 'right', to, toX: 20 });
      areas[to].exits.push({ side: 'left', to: from, toX: 300 });
    } else if (kind === 'stairs' || kind === 'hatch') {
      areas[from].climbs.push({
        x: 210,
        to,
        toX: 60,
        dir: kind === 'hatch' ? 'down' : 'up',
        kind,
        locked,
      });
      areas[to].climbs.push({
        x: 60,
        to: from,
        toX: 210,
        dir: kind === 'hatch' ? 'up' : 'down',
        kind,
      });
    } else {
      areas[from].doors.push({
        x: 40 + areas[from].doors.length * 48,
        to,
        toX: 30,
        label: names[to],
        locked,
      });
      areas[to].doors.push({
        x: 30,
        to: from,
        toX: 40 + (areas[from].doors.length - 1) * 48,
        label: names[from],
        locked: null,
      });
    }
  }
  const middle = selected
    .filter((id) => exteriors.has(id))
    .sort((a, b) => hash(seed + ':' + life + a) - hash(seed + ':' + life + b));
  const route =
    act === 2 ? [...middle, spec.first] : [spec.first, ...middle, spec.last];
  for (let i = 1; i < route.length; i++)
    connect(route[i - 1], route[i], 'exit');
  if (act === 1) {
    connect('kitchen', 'bedroom', 'stairs');
    connect('lane', 'kitchen');
  }
  if (act === 2) {
    connect('stairwell', 'flat', 'stairs');
    connect('avenue', 'stairwell');
    connect('avenue', 'office_floor');
  }
  if (act === 3) connect('lane_winter', 'old_house');
  const interiors = selected.filter((id) => !exteriors.has(id));
  const lockedId =
    interiors.find((id) =>
      ['cellar', 'boardroom', 'chapel_ruin'].includes(id),
    ) || interiors[0];
  interiors.forEach((id, i) => {
    const parent =
      id === 'cellar'
        ? 'kitchen'
        : id === 'boardroom'
          ? 'office_floor'
          : route[i % route.length];
    connect(
      parent,
      id,
      id === 'cellar' ? 'hatch' : id === 'boardroom' ? 'stairs' : 'door',
      id === lockedId ? 'key' : null,
    );
  });
  // Shortcuts give every page enough distinct destinations for four answers and an insight.
  const hub = spec.first;
  for (const id of ids.filter((id) => id !== hub && id !== lockedId)) {
    const graph = { areas, links };
    if (
      nearbyAreas(graph, id, 2).length < ids.length - 1 &&
      !links.some(
        (l) => [l.from, l.to].includes(id) && [l.from, l.to].includes(hub),
      )
    )
      connect(hub, id);
  }
  if (
    lockedId &&
    nearbyAreas({ areas, links }, lockedId, 2).length < 5 &&
    !links.some(
      (l) => [l.from, l.to].includes(lockedId) && [l.from, l.to].includes(hub),
    )
  )
    connect(hub, lockedId, 'door', 'key');
  for (const a of Object.values(areas))
    a.doors.forEach((d, i) => {
      d.x = 35 + i * 36;
    });
  for (const a of Object.values(areas))
    for (const d of a.doors)
      d.toX = areas[d.to].doors.find((other) => other.to === a.id).x;
  for (const a of Object.values(areas)) {
    const passages = [...a.doors, ...a.climbs];
    a.markerSlots = [70, 160, 250, 82, 151, 197].filter(
      (x) => x <= a.walk[1] && passages.every((d) => Math.abs(x - d.x) > 7),
    );
  }
  if (rot >= 2) {
    const first = areas[spec.start];
    const passages = [...first.climbs, ...first.doors];
    const entry =
      passages[hash(seed + ':' + life + ':crawl') % passages.length];
    first.crawl = { x: entry.x - 6, w: 12 };
  }
  if (rot === 3)
    for (const area of Object.values(areas)) area.lights[0].lit = false;
  if (!ids.some((id) => areas[id].residents.includes('gardener')))
    areas[spec.last].residents.push('gardener');
  const keyNames = ['brass key', 'iron key', 'small key'];
  const keepsakes = [
    {
      id: 'key-' + act,
      key: true,
      act,
      name: keyNames[act - 1],
      area: spec.start,
      x: areas[spec.start].keepsakeSlots[0],
    },
  ];
  const items = [
    ['father’s watch', 'hair ribbon', 'glass marble'],
    ['pawn ticket', 'wedding ring', 'train timetable'],
    ['photograph', 'letter you never sent'],
  ][act - 1];
  const accessible = ids.filter((id) => id !== lockedId);
  const item =
    items[hash(seed + ':' + life + ':' + act + ':item') % items.length];
  const itemArea =
    areas[
      accessible[hash(seed + ':' + life + ':keepsake') % accessible.length]
    ];
  keepsakes.push({
    id: item,
    name: item,
    area: itemArea.id,
    x: itemArea.keepsakeSlots[1],
  });
  return {
    act,
    life,
    seed,
    start: spec.start,
    weather: ['dusk', 'fog', 'rain', 'ash'][Math.max(0, Math.min(3, life - 1))],
    areas,
    links,
    lockedArea: lockedId || null,
    keepsakes,
  };
}

export function pathBetween(map, fromArea, toArea) {
  if (!map.areas[fromArea] || !map.areas[toArea]) return null;
  const queue = [[fromArea]],
    visited = new Set([fromArea]);
  for (const path of queue) {
    const current = path.at(-1);
    if (current === toArea) return path;
    for (const link of map.links) {
      const next =
        link.from === current
          ? link.to
          : link.to === current
            ? link.from
            : null;
      if (next && !visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

export function nearbyAreas(map, areaId, maxLinks = 2) {
  return Object.values(map.areas)
    .filter((area) => {
      const path = pathBetween(map, areaId, area.id);
      return path && path.length > 1 && path.length <= maxLinks + 1;
    })
    .sort(
      (a, b) =>
        pathBetween(map, areaId, a.id).length -
        pathBetween(map, areaId, b.id).length,
    );
}
