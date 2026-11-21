// Owner: B
import { bitmapSvg } from '../pixel.js';
import { rect, repeat } from './kit.js';
import { reduced, playCrumble, setRot } from '../rot.js';
export const TREEHOUSE_BOX = { x: 36, y: 26, width: 49, height: 29 };
export function houseIcon(rot) {
  const rows =
    [
      [
        '....g....',
        '...rrr...',
        '..rrrrr..',
        '.rrrrrrr.',
        '..wwwww..',
        '..wlwlw..',
        '..wwwww..',
        '...wbw...',
        '...bbb...',
      ],
      [
        '....g....',
        '...r.r...',
        '..rrrrr..',
        '.rrr.rrr.',
        '..wwwww..',
        '..wlwbw..',
        '..wwwww..',
        '...wbw...',
        '...bbb...',
      ],
      [
        '.........',
        '...r.....',
        '..rr..r..',
        '.rrr..rr.',
        '..www.w..',
        '..wbwlw..',
        '..ww.bb..',
        '...wb....',
        '...bbb...',
      ],
      [
        '.........',
        '.........',
        '..r...r..',
        '.rr...rr.',
        '...w..w..',
        '...b..bw.',
        '...w..bw.',
        '....b....',
        '...b.b...',
      ],
    ][rot] || [];
  return bitmapSvg(
    rows,
    { g: 'ui-seed', r: 'rot-roof', w: 'rot-wall', l: 'lt-kind', b: 'rot-dark' },
    2,
  );
}
export function exteriorArt(art, rot) {
  if (!rot) return art;
  const { x, y } = TREEHOUSE_BOX;
  let damage =
    rect(x + 16, y + 9, 3, 2, 'th-sky') +
    rect(x + 31, y + 12, 3, 2, 'th-sky') +
    rect(47, 41, 11, 1, 'th-m1') +
    rect(66, 78, 3, 3, 'th-unlit');
  if (rot >= 2)
    damage +=
      rect(55, 29, 7, 6, 'th-sky') +
      rect(57, 27, 3, 2, 'th-sky') +
      repeat(8, (i) => rect(73 + Math.floor(i / 3), 45 + i, 2, 1, 'th-w3')) +
      rect(56, 84, 3, 3, 'th-unlit');
  if (rot === 3) {
    damage +=
      repeat(14, (i) => rect(53 + i, 29 + (i % 3), 1, 10 + (i % 4), 'th-sky')) +
      repeat(14, (i) =>
        rect(63 + Math.floor(i / 5), 42 + i, 2, 1, 'th-unlit'),
      ) +
      rect(50, 109, 9, 3, 'th-b1');
  }
  if (rot >= 2)
    damage += repeat(
      rot === 3 ? 3 : 1,
      (i) =>
        rect(80 + i * 6, 39 - (i % 2), 4, 2, 'rot-dark') +
        rect(82 + i * 6, 37 - (i % 2), 2, 2, 'rot-dark'),
    );
  if (rot === 3)
    art = art.replace(
      /(<path class="th-(?:r[123]|w[123])" d=")([^"]+)/g,
      (_, prefix, d) =>
        prefix +
        d.replace(/M(\d+) (\d+)/g, (m, a, b) =>
          +b >= 26 && +b <= 55
            ? 'M' + (+a + Math.floor((55 - b) / 7)) + ' ' + b
            : m,
        ),
    );
  return art.replace(
    '</svg>',
    '<g class="rot-damage">' + damage + '</g></svg>',
  );
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pieces(el, count, cls) {
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.className = cls;
    bit.style.left = 10 + ((i * 73) % 82) + '%';
    bit.style.animationDelay = i * 25 + 'ms';
    el.append(bit);
  }
}
export async function playDecay(el, fromRot, toRot, drawDamage) {
  const card = document.createElement('p');
  card.className = 'decay-price';
  card.textContent = 'The tree takes its price.';
  el.append(card);
  el.classList.add('decaying');
  if (!reduced()) pieces(el, 3, 'plank-drop');
  await sleep(reduced() ? 150 : 900);
  setRot(el, toRot);
  drawDamage?.();
  await sleep(reduced() ? 150 : 700);
  el.classList.remove('decaying');
  card.remove();
  el.querySelectorAll('.plank-drop').forEach((e) => e.remove());
}
export async function playFall({ root, art, tree }) {
  let ended = false,
    wake;
  const skip = new Promise((r) => (wake = r)),
    start = performance.now(),
    wait = (ms) => Promise.race([sleep(ms), skip]);
  const key = (e) => {
    if (performance.now() - start >= 1000 && [' ', 'Escape'].includes(e.key)) {
      e.preventDefault();
      ended = true;
      wake();
    }
  };
  window.addEventListener('keydown', key, true);
  try {
    if (!reduced()) {
      root.classList.add('fall-room');
      pieces(root, 14, 'dust');
      await wait(1200);
      if (!ended) {
        pieces(root, 10, 'plank-drop');
        if (tree) playCrumble(tree);
        await wait(1400);
      }
      if (!ended) {
        root.classList.add('fall-floor');
        await wait(800);
      }
      if (!ended) {
        root.innerHTML =
          '<div class="climb falling">' + exteriorArt(art, 3) + '</div>';
        root
          .querySelector('svg')
          .insertAdjacentHTML(
            'beforeend',
            '<g class="trunk-crack">' +
              repeat(50, (i) =>
                rect(59 + (Math.floor(i / 7) % 3), 68 + i, 1, 1, 'rot-dark'),
              ) +
              '</g>',
          );
        pieces(root, 40, 'burst-leaf');
        await wait(2600);
      }
    } else await wait(300);
    root.innerHTML =
      '<div class="act-card"><h2>THE TREE IS GONE.</h2><p>There are no pages left to turn back to.</p></div>';
    await wait(reduced() ? 2000 : 1000);
  } finally {
    window.removeEventListener('keydown', key, true);
  }
}
