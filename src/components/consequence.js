// Owner: C
import { personFor } from '../state.js';
import { clampLuck } from '../rules.js';
import { pause } from './actCard.js';
export const flagLines = {
  left_home: 'The house is behind you.',
  wealth: 'Money, at last.',
  ruin: 'Everything you had is gone.',
  crime: 'Now there is something you must never tell.',
  fame: 'Strangers know your name.',
  estranged: 'Your family stops writing.',
};
export function floatLuck(root, delta) {
  if (!delta) return;
  const el = document.createElement('b');
  el.className = 'luck-float ' + (delta < 0 ? 'loss' : 'gain');
  el.textContent = (delta > 0 ? '+' : '−') + Math.abs(delta);
  root.querySelector('.hud')?.append(el);
  setTimeout(() => el.remove(), 1200);
}
export async function consequence(
  el,
  g,
  c,
  { fate, forced, delta, before = g.luck },
) {
  let flag = flagLines[c.flag];
  if (['partner', 'child'].includes(c.flag)) {
    const p = personFor(g, 'n' + g.nextId, c.flag, c.text + ' ' + c.mark);
    flag =
      c.flag === 'child'
        ? 'A child. You call them ' + p.name + '.'
        : p.name + ' is part of your life now.';
  }
  const loading = [
    'A new leaf is growing…',
    'The tree is listening…',
    'Something in the wood has turned…',
    'The branch may not hold…',
  ][g.replants];
  const lines = [
    ['ink', '› ' + c.text],
    [
      'moral ' + c.moral,
      c.moral !== 'neutral'
        ? c.moral[0].toUpperCase() +
          c.moral.slice(1) +
          '. Luck ' +
          before +
          ' → ' +
          clampLuck(before + delta) +
          '.'
        : '',
    ],
    ['mark', 'Written in your book: ' + c.mark],
    ['flag', flag],
    [
      'forced',
      fate
        ? 'You wrote: “' + fate + '”. It will be so.'
        : forced === 'debt'
          ? 'Something you wrote is due.'
          : forced === 'wish'
            ? 'Something you asked for is on its way.'
            : '',
    ],
    ['loading', loading],
  ].filter((x) => x[1]);
  el.innerHTML = '';
  const start = performance.now();
  for (const [cls, text] of lines) {
    if (!el.isConnected) return;
    const p = document.createElement('p');
    p.className = cls;
    el.append(p);
    for (let i = 0; i < text.length; i += 4) {
      if (!el.isConnected) return;
      p.textContent = text.slice(0, i + 4);
      await pause(65);
    }
  }
  await pause(Math.max(0, 1400 - (performance.now() - start)));
}
