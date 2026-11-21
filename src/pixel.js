// Owner: B
export function hash(id) {
  let h = 2166136261;
  for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function pixelPath(points, cls) {
  return (
    '<path class="' +
    cls +
    '" d="' +
    points.map(([x, y]) => 'M' + x + ' ' + y + 'h1v1h-1z').join('') +
    '"/>'
  );
}
export function bitmap(rows, colors) {
  const sets = {};
  rows.forEach((row, y) =>
    [...row].forEach((v, x) => {
      if (colors[v]) (sets[colors[v]] ??= []).push([x, y]);
    }),
  );
  return Object.entries(sets)
    .map(([c, p]) => pixelPath(p, c))
    .join('');
}
export function bitmapSvg(rows, colors, scale = 2) {
  return (
    '<svg aria-hidden="true" width="' +
    rows[0].length * scale +
    '" height="' +
    rows.length * scale +
    '" viewBox="0 0 ' +
    rows[0].length +
    ' ' +
    rows.length +
    '" shape-rendering="crispEdges">' +
    bitmap(rows, colors) +
    '</svg>'
  );
}
export const icons = {
  leaf: ['.....##', '...####', '..####.', '.###.#.', '.###...', '##.....'],
  flame: ['...#...', '..##...', '..###..', '.#.###.', '######.', '.####..'],
  skull: ['.###.', '#####', '#.#.#', '#####', '.#.#.'],
  seed: ['..##.', '.####', '####.', '###..', '.#...'],
  sun: [
    '#..#..#',
    '..###..',
    '.#####.',
    '#######',
    '.#####.',
    '..###..',
    '#..#..#',
  ],
  cloud: ['..###...', '.#####..', '########', '.######.'],
  rain: ['..###..', '.#####.', '#######', '.......', '.#.#.#.', '#.#.#..'],
  storm: [
    '..###..',
    '.#####.',
    '#######',
    '...##..',
    '..##...',
    '...#...',
    '..#....',
  ],
  book: [
    '######.######',
    '#.....#.....#',
    '#.###.#.###.#',
    '#.....#.....#',
    '#.##..#.##..#',
    '#.....#.....#',
    '######.######',
  ],
  key: ['#######', '#.....#', '#..#..#', '#.##..#', '#.....#', '#######'],
};
export const icon = (name, scale = 2) =>
  bitmapSvg(icons[name], { '#': 'ui-' + name }, scale);
export const riskIcon = (risk) =>
  icon({ safe: 'leaf', bold: 'flame', wild: 'skull' }[risk]);
