// OWNER: Person 1
import fakeGame from './fakeGame.js';

export function newGame(_name, _preference, _seed) {
  return structuredClone(fakeGame);
}

export async function choose(game, _nodeId, _choiceIndex) {
  return game.nodes[game.currentId];
}

export function lifePath(game) {
  const path = [];
  let node = game.nodes[game.currentId];
  while (node) {
    path.unshift(node);
    node = game.nodes[node.parentId];
  }
  return path;
}

export function canReplant(game) {
  return game.status === 'dead' && game.replants < 3;
}

export function replantCost(game) {
  return {
    luck: [game.luck, Math.max(0, game.luck - 20)],
    rot: [game.replants, game.replants + 1],
    replantsLeft: [3 - game.replants, 2 - game.replants],
  };
}

export async function replant(game, _nodeId, _choiceIndex) {
  return game.nodes[game.currentId];
}

export function loadGame() {
  return null;
}
