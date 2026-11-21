// Owner: C
export function regretSees(regret, player) {
  if (player.hidden) return false;
  const distance = player.x - regret.x;
  if (player.running && Math.abs(distance) <= 48) return true;
  const range = player.crouching ? 32 : 64;
  return Math.abs(distance) <= range && distance * regret.direction >= 0;
}
