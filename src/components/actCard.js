// Owner: C
import { ACTS, WANTS } from '../acts.js';
export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function actCard(root, act, want) {
  const a = ACTS[act],
    card = document.createElement('section');
  card.className = 'act-card';
  card.innerHTML =
    '<small>Ages ' +
    a.ages +
    '</small><h2>Act ' +
    a.roman +
    '</h2><h3>' +
    a.name +
    '</h3><p>' +
    a.aphorism +
    '</p>';
  root.append(card);
  if (act === 2 && WANTS[want]) {
    await pause(900);
    const reveal = document.createElement('div');
    reveal.innerHTML =
      '<p>' +
      (want === 'Nothing'
        ? 'You never decided what you wanted. It was decided for you.'
        : 'You have started to want ' + want.toLowerCase() + '.') +
      '</p><p>' +
      WANTS[want].wish +
      '</p>';
    card.append(reveal);
    await pause(750);
    reveal.insertAdjacentHTML('beforeend', '<b>Granted.</b>');
  }
  await pause(2400);
  card.remove();
}
