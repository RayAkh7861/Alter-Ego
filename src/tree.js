// Owner: B
import { hash, pixelPath, bitmap, icons } from './pixel.js';
export function layoutTree(game) {
  const kids = {},
    points = {},
    nodes = Object.values(game.nodes);
  let leaves = 0;
  for (const n of nodes) (kids[n.parentId] ??= []).push(n);
  function place(n) {
    const children = (kids[n.id] || []).sort(
      (a, b) => a.fromChoice - b.fromChoice,
    );
    const x = children.length
      ? children.map(place).reduce((a, b) => a + b) / children.length
      : 7 * leaves++;
    points[n.id] = {
      x: Math.round(x) + (hash(n.id) % 3) - 1,
      y: 114 - 10 * n.chapter,
    };
    return x;
  }
  place(game.nodes.n0);
  const width = Math.max(60, leaves * 7 + 16);
  for (const p of Object.values(points))
    p.x += Math.floor((width - (leaves - 1) * 7) / 2);
  return { width, height: 124, rootX: points.n0.x, points, kids };
}
function line(a, b) {
  let { x, y } = a;
  const dx = Math.abs(b.x - x),
    dy = -Math.abs(b.y - y),
    sx = Math.sign(b.x - x),
    sy = Math.sign(b.y - y);
  let err = dx + dy;
  const pixels = [];
  for (;;) {
    pixels.push([x, y]);
    if (x === b.x && y === b.y) return pixels;
    const e = 2 * err;
    if (e >= dy) {
      err += dy;
      x += sx;
    }
    if (e <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function ring(x, y, r, cls) {
  const pixels = [];
  for (let i = -r; i <= r; i++) {
    pixels.push([x + i, y - r], [x + i, y + r]);
    if (Math.abs(i) < r) pixels.push([x - r, y + i], [x + r, y + i]);
  }
  return pixelPath(pixels, cls);
}
export function renderTree(
  target,
  game,
  { mode = 'full', onSelect, selectedId, pending } = {},
) {
  const { width, height, rootX, points, kids } = layoutTree(game);
  const standalone = target.tagName.toLowerCase() === 'svg';
  let svg = '';
  if (standalone) {
    target.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    const box = target.parentElement.getBoundingClientRect(),
      scale = Math.max(
        1,
        Math.floor(
          Math.min((box.width || 220) / width, (box.height || 300) / height),
        ),
      );
    target.style.width = width * scale + 'px';
    target.style.height = height * scale + 'px';
    svg =
      '<path class="th-g2" d="M' +
      (rootX - 9) +
      ' 115h18v1h-18z"/><path class="th-dirt2" d="M' +
      (rootX - 7) +
      ' 116h14v2h-14z"/>';
  }
  for (const y of [29, 69])
    svg += pixelPath(
      Array.from({ length: Math.floor(width / 3) }, (_, i) => [i * 3, y]),
      'lt-band',
    );
  if (mode === 'full')
    for (const [y, label] of [
      [22, 'III'],
      [62, 'II'],
      [102, 'I'],
    ])
      svg += '<text class="lt-act" x="1" y="' + y + '">' + label + '</text>';
  const regret = game.lives?.at(-1)?.legacy?.regret?.node_id;
  const hits = [];
  for (const n of Object.values(game.nodes)) {
    const p = points[n.id],
      { x, y } = p;
    svg +=
      '<g class="lt-seg ' +
      (mode === 'mini' && n.id === game.currentId ? 'growing' : '') +
      '" data-chapter="' +
      n.chapter +
      '">';
    if (n.parentId) {
      const trail = line(points[n.parentId], p);
      if (n.dead)
        svg += pixelPath(
          trail.filter((_, i) => i % 3 !== 1),
          'lt-dead',
        );
      else {
        svg += pixelPath(trail, 'th-b3');
        if (n.chapter <= 7)
          svg += pixelPath(
            trail.map(([a, b]) => [a - 1, b]),
            'th-b4',
          );
        if (n.chapter <= 3)
          svg += pixelPath(
            trail.map(([a, b]) => [a + 1, b]),
            'th-b2',
          );
        if (game.replants >= 2 && n.chapter < 3)
          svg += pixelPath(trail.slice(3, 6), 'th-ink');
      }
    }
    n.choices.forEach((_, i) => {
      if (n.dead || kids[n.id]?.some((c) => c.fromChoice === i)) return;
      const dir = i % 2 ? 1 : -1,
        tip = { x: x + dir * 3, y: y - 3 - i };
      svg +=
        pixelPath(line(p, tip), 'th-b2') +
        pixelPath([[tip.x, tip.y]], n.id === regret ? 'lt-regret' : 'th-l3');
    });
    if (!n.dead)
      svg +=
        pixelPath([[x, y]], 'th-l4') +
        pixelPath(
          [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ],
          'th-l3',
        );
    if (n.moral === 'kind') svg += pixelPath([[x, y]], 'lt-kind');
    if (n.moral === 'cruel') svg += pixelPath([[x + 2, y - 1]], 'lt-cruel');
    if (n.fateText)
      svg += pixelPath(
        [
          [x, y],
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ],
        'lt-fate',
      );
    if (n.outcome === 'death')
      svg +=
        '<g transform="translate(' +
        (x - 2) +
        ' ' +
        (y - 7) +
        ')">' +
        bitmap(icons.skull, { '#': n.dead ? 'lt-dead' : 'lt-skull' }) +
        '</g>';
    if (n.id === game.currentId)
      svg +=
        ring(x, y, 2, 'lt-glow') +
        (pending ? pixelPath([[x, y - 10]], 'lt-glow') : '');
    if (n.id === selectedId) svg += ring(x, y, 3, 'lt-select');
    if (onSelect && !n.dead) hits.push(n);
    svg += '</g>';
  }
  target.innerHTML = svg;
  for (const n of hits) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
      p = points[n.id];
    for (const [k, v] of Object.entries({
      x: p.x - 3,
      y: p.y - 3,
      width: 7,
      height: 7,
      fill: 'transparent',
    }))
      r.setAttribute(k, v);
    const title = document.createElementNS(r.namespaceURI, 'title');
    title.textContent = 'Chapter ' + n.chapter + ' · ' + n.title;
    r.append(title);
    r.style.cursor = 'pointer';
    r.onclick = () => onSelect(n.id);
    target.append(r);
  }
  return { width, height, rootX };
}
