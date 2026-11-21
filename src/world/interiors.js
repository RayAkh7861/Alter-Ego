// Owner: B
import { BUILDINGS, gravestones } from './cast.js';
import { rect, repeat, group, fence, tree, lamp } from './kit.js';
import { npcSprite } from './sprites.js';
const bed = (x) =>
  rect(x, 124, 40, 9, 'th-w2') +
  rect(x + 1, 121, 37, 5, 'th-moon2') +
  rect(x + 2, 119, 8, 4, 'th-star');
const table = (x) =>
  rect(x, 118, 32, 3, 'th-w3') +
  rect(x + 2, 121, 2, 14, 'th-w2') +
  rect(x + 27, 121, 2, 14, 'th-w2');
export function buildInterior(
  id,
  {
    act = 1,
    rot = 0,
    seed = 0,
    residents = [],
    chapter = 1,
    state = {},
    game,
  } = {},
) {
  const b = BUILDINGS[act].find((b) => b.id === id),
    kind = b?.interior || 'room';
  let scene =
    kind === 'yard'
      ? fence(0, 135, 256) + tree(220, 134, 8)
      : rect(0, 37, 256, 98, 'th-w1') +
        repeat(12, (i) => rect(0, 40 + i * 8, 256, 1, 'th-w2')) +
        rect(64, 64, 25, 28, 'th-sky') +
        rect(76, 64, 2, 28, 'th-w3') +
        lamp(196, 98);
  scene +=
    rect(0, 135, 256, 25, 'th-w2') +
    repeat(25, (i) => rect(i * 11, 136, 1, 24, 'th-w1')) +
    rect(12, 100, 17, 35, 'th-b1') +
    rect(25, 119, 2, 2, 'th-gold');
  const looks = [],
    stations = [{ type: 'exit', label: 'Go outside', x: 19 }];
  if (kind === 'room')
    scene +=
      bed(42) +
      table(151) +
      rect(114, 69, 17, 20, 'th-w3') +
      rect(116, 71, 13, 16, 'th-cl1');
  if (kind === 'hall')
    scene +=
      rect(104, 56, 57, 30, id === 'office' ? 'th-w1' : 'th-unlit') +
      repeat(3, (i) => table(46 + i * 66)) +
      rect(122, 65, 12, 2, 'th-star');
  if (kind === 'shop')
    scene +=
      table(124) +
      repeat(
        3,
        (i) =>
          rect(44, 76 + i * 12, 138, 3, 'th-w3') +
          repeat(9, (j) =>
            rect(46 + j * 16, 70 + i * 12, 5, 6, j % 2 ? 'th-r2' : 'th-gold'),
          ),
      );
  if (id === 'office')
    scene +=
      rect(185, 58, 11, 11, 'th-moon2') +
      rect(190, 60, 1, 5, 'th-b2') +
      rect(190, 64, 3, 1, 'th-b2');
  if (kind === 'tavern')
    scene +=
      rect(76, 112, 115, 21, 'th-w3') +
      repeat(
        5,
        (i) =>
          rect(53 + i * 37, 125, 10, 3, 'th-b4') +
          rect(57 + i * 37, 128, 3, 7, 'th-b3'),
      ) +
      rect(205, 112, 18, 22, 'th-b4');
  if (kind === 'ward')
    scene += repeat(
      3,
      (i) => bed(43 + i * 60) + rect(39 + i * 60, 62, 4, 65, 'th-cl3'),
    );
  if (kind === 'yard')
    gravestones(state, game).forEach((text, i) => {
      const x = 46 + i * 22;
      scene +=
        rect(x - 3, 123, 8, 12, 'th-stone') +
        rect(x - 2, 121, 6, 2, 'th-stone');
      looks.push({ type: 'look', x, label: 'Read the stone', text });
    });
  const text =
    id === 'flat' && !residents.length
      ? 'The flat is very quiet.'
      : id === 'hospital' && !residents.length
        ? "Her chart has your name under 'next of kin'. Nobody called."
        : 'Someone has swept around the same chair for years.';
  looks.push({ type: 'look', x: 37, label: 'Look closer', text });
  residents.forEach((npc, i) => {
    const x = kind === 'yard' ? 225 : 105 + i * 55;
    scene += group(x, 135, npcSprite(npc, act, chapter));
    stations.push({ type: 'npc', x, npc, label: 'Talk to ' + npc.name });
  });
  return {
    id: 'interior-' + id,
    width: 256,
    height: 160,
    floorY: 135,
    walk: [10, 245],
    spawnX: 19,
    camera: { y: 0, lookUp: 0, lookDown: 0 },
    layers: [{ parallax: 1, svg: scene }],
    looks,
    stations,
  };
}
