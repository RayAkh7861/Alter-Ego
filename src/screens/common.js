// Owner: C
import { icon, bitmapSvg } from '../pixel.js';
import { lifeState, talksUsed } from '../state.js';
import { toneWord } from '../rules.js';
import { houseIcon } from '../world/treehouseRot.js';
export const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export const header = (n) =>
  (n.chapter ? 'Chapter ' + n.chapter : 'Prologue') +
  ' · Ages ' +
  n.ages.replace('-', '–');
export function hud(g, rot = g.replants) {
  const tone = toneWord(g.luck),
    weather = {
      fortunate: 'sun',
      uncertain: 'cloud',
      'ill-starred': 'rain',
      cursed: 'storm',
    }[tone];
  const remaining =
    g.status === 'alive' && g.nodes[g.currentId].chapter
      ? 3 - talksUsed(g.nodes[g.currentId])
      : 0;
  const grains = bitmapSvg(
    ['#####', '.###.', '..#..', '.xxx.', '#####'].map((row) => {
      let i = 0;
      return row.replaceAll('x', () => (++i <= remaining ? '#' : '.'));
    }),
    { '#': 'ui-seed' },
    2,
  );
  return (
    '<aside class="hud"><span aria-label="Luck: ' +
    tone +
    '">' +
    icon(weather) +
    '<small>' +
    g.luck +
    '</small></span><span aria-label="' +
    remaining +
    ' conversations left">' +
    grains +
    '<small>' +
    remaining +
    '</small></span><span aria-label="' +
    (3 - g.replants) +
    ' replants left">' +
    icon('seed').repeat(3 - g.replants) +
    '<small>' +
    (3 - g.replants) +
    '</small></span><span aria-label="Rot ' +
    rot +
    '">' +
    houseIcon(rot) +
    '</span>' +
    lifeState(g)
      .keepsakes.map(
        (i) =>
          '<span class="keepsake-icon" title="' +
          escape(i.name) +
          '" aria-label="' +
          escape(i.name) +
          '">' +
          icon(i.key ? 'key' : 'leaf') +
          '</span>',
      )
      .join('') +
    '</aside>'
  );
}
export function typeText(el, text, done) {
  let i = 0,
    timer,
    finished = false;
  el.innerHTML =
    '<span aria-live="polite" class="sr"></span><span aria-hidden="true"></span>';
  el.firstChild.textContent = text;
  function finish() {
    if (finished) return false;
    finished = true;
    clearInterval(timer);
    el.lastChild.textContent = text;
    done();
    return true;
  }
  let glitch = 0;
  timer = setInterval(() => {
    i += 2;
    if (
      i % 40 === 0 &&
      el.closest('.th-rot-2,.th-rot-3') &&
      !matchMedia('(prefers-reduced-motion:reduce)').matches
    )
      glitch = i;
    const visible = text.slice(0, i);
    el.lastChild.textContent =
      glitch && i - glitch < 4
        ? visible.slice(0, glitch - 1) + '▒' + visible.slice(glitch)
        : visible;
    if (i >= text.length) finish();
  }, 44);
  return {
    finish,
    stop() {
      clearInterval(timer);
    },
  };
}
export function choicePosts(spec, choices) {
  const [left, right] = spec.walk,
    start = Math.ceil(left + (right - left) * 0.55);
  return choices.map((c, index) => ({
    type: 'choice',
    x: Math.round(
      start + (index * (right - start - 8)) / Math.max(1, choices.length - 1),
    ),
    index,
    label: c.text,
    risk: c.risk,
    insight: c.insight,
  }));
}
