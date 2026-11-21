// Owner: A
import { hash } from '../pixel.js';

export const STRANGERS = {
  matchgirl: {
    act: 1,
    description: 'A girl selling burnt-out matches by the well.',
    pulls: 'love',
    allowed_effects: ['blessing', 'omen'],
    allowed_flags: [],
  },
  recruiter: {
    act: 1,
    description: 'A man in a long coat handing out tickets for a ship.',
    pulls: 'adventure',
    allowed_effects: ['insight', 'flag'],
    allowed_flags: ['left_home'],
  },
  coincounter: {
    act: 1,
    description: 'A man counting coins in the dark, far too many to be his.',
    pulls: 'wealth',
    allowed_effects: ['flag', 'omen'],
    allowed_flags: ['crime', 'wealth'],
  },
  lostboy: {
    act: 1,
    description: "A small boy looking for a mother who isn't coming.",
    pulls: 'love',
    allowed_effects: ['blessing', 'omen'],
    allowed_flags: [],
  },
  tallwoman: {
    act: 1,
    description: 'A woman too tall for the doorways, who knows your name.',
    pulls: 'peace',
    allowed_effects: ['insight', 'omen'],
    allowed_flags: [],
  },
  hoursman: {
    act: 2,
    description: 'A man selling hours from a tray, wrapped like sweets.',
    pulls: 'wealth',
    allowed_effects: ['insight', 'blessing', 'omen'],
    allowed_flags: [],
  },
  coatwoman: {
    act: 2,
    description: 'A woman wearing every coat she has ever owned.',
    pulls: 'peace',
    allowed_effects: ['flag', 'blessing'],
    allowed_flags: ['ruin', 'wealth'],
  },
  clerk: {
    act: 2,
    description:
      "A clerk at a desk that wasn't there yesterday, stamping forms with your name.",
    pulls: 'wealth',
    allowed_effects: ['insight', 'flag'],
    allowed_flags: ['wealth', 'fame'],
  },
  nightnurse: {
    act: 2,
    description: "A night nurse who knows your mother's room number.",
    pulls: 'love',
    allowed_effects: ['insight', 'blessing'],
    allowed_flags: [],
  },
  gambler: {
    act: 2,
    description: 'A gambler whose deck only has your face on the cards.',
    pulls: 'adventure',
    allowed_effects: ['flag', 'omen'],
    allowed_flags: ['wealth', 'ruin', 'crime'],
  },
  boyofeight: {
    act: 3,
    description: "A boy of eight in a red cloak, who won't look at you.",
    pulls: 'none',
    allowed_effects: ['insight', 'blessing'],
    allowed_flags: [],
  },
  widow: {
    act: 3,
    description: 'A widow who sets two places at every table.',
    pulls: 'love',
    allowed_effects: ['blessing', 'omen'],
    allowed_flags: [],
  },
  collector: {
    act: 3,
    description: 'A collector of last words, with an empty notebook.',
    pulls: 'peace',
    allowed_effects: ['blessing', 'insight'],
    allowed_flags: [],
  },
  caller: {
    act: 3,
    description: 'Someone who calls you by a name from a life you erased.',
    pulls: 'none',
    allowed_effects: ['omen', 'insight'],
    allowed_flags: [],
    minRot: 1,
  },
  diggers: {
    act: 3,
    description: 'Two men digging a grave too short for anyone.',
    pulls: 'none',
    allowed_effects: ['omen'],
    allowed_flags: [],
  },
};

export function spawnStrangers(game, nodeId, map) {
  const seen = new Set(),
    here = new Set();
  for (let node = game.nodes[nodeId]; node; node = game.nodes[node.parentId]) {
    for (const event of node.events || [])
      if (event.type === 'encounter')
        (node.id === nodeId ? here : seen).add(event.strangerId);
  }
  const pool = Object.entries(STRANGERS)
    .filter(
      ([id, person]) =>
        person.act === map.act &&
        !seen.has(id) &&
        (person.minRot || 0) <= game.replants,
    )
    .sort(
      ([a], [b]) =>
        hash(game.seed + ':' + nodeId + ':' + a) -
        hash(game.seed + ':' + nodeId + ':' + b),
    );
  const areas = Object.values(map.areas)
    .filter(
      (area) =>
        area.id !== (game.nodes[nodeId]?.area || map.start) &&
        area.spawnPoints.length,
    )
    .sort(
      (a, b) =>
        (a.kind === 'exterior' ? 0 : 1) - (b.kind === 'exterior' ? 0 : 1),
    );
  if (!areas.length) return [];
  return pool
    .slice(0, 2)
    .map(([id, person], index) => {
      const outdoors = areas.filter((a) => a.kind === 'exterior');
      const candidates =
        (index === 1 && game.lifeNumber > 1) || !outdoors.length
          ? areas
          : outdoors;
      const area =
        candidates[
          hash(game.seed + ':' + nodeId + ':area:' + index) % candidates.length
        ];
      return {
        id,
        ...person,
        area: area.id,
        x: area.spawnPoints[hash(nodeId + ':' + id) % area.spawnPoints.length],
      };
    })
    .filter((person) => !here.has(person.id));
}
