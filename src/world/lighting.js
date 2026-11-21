import { hash } from '../pixel.js';
const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
const ring = (r, fill) =>
  '<path fill="' +
  fill +
  '" d="M-' +
  r +
  ' -' +
  (r >> 1) +
  'h' +
  (r >> 2) +
  'v-' +
  (r >> 2) +
  'h' +
  (r >> 2) +
  'v-' +
  (r >> 2) +
  'h' +
  r +
  'v' +
  (r >> 2) +
  'h' +
  (r >> 2) +
  'v' +
  (r >> 2) +
  'h' +
  (r >> 2) +
  'v' +
  r +
  'h-' +
  (r >> 2) +
  'v' +
  (r >> 2) +
  'h-' +
  (r >> 2) +
  'v' +
  (r >> 2) +
  'h-' +
  r +
  'v-' +
  (r >> 2) +
  'h-' +
  (r >> 2) +
  'v-' +
  (r >> 2) +
  'h-' +
  (r >> 2) +
  'z"/>';
export function lighting(id, width, height, lights, rot = 0, weather = 'dusk') {
  const group = (l, i) =>
    '<g transform="translate(' +
    l.x +
    ' ' +
    l.y +
    ')" ' +
    (l.player ? 'data-aura' : l.hunter ? 'data-cone' : '') +
    '><g class="' +
    (!l.player && !l.hunter ? 'flicker' : '') +
    '" style="animation-duration:' +
    (300 + (hash(id + i) % 600)) +
    'ms">' +
    (l.hunter
      ? '<path d="M0 0l64 -14v28z" fill="#555"/>'
      : ring(l.r, 'url(#dither-' + id + ')') +
        ring(Math.floor(l.r * 0.73), '#666') +
        ring(Math.floor(l.r * 0.45), 'black')) +
    '</g></g>';
  const cast = lights
    .filter((l) => l.lit !== false && !l.player && !l.hunter)
    .map(
      (l) =>
        '<g transform="translate(' +
        l.x +
        ' ' +
        l.y +
        ')" opacity=".15">' +
        ring(l.r, '#e7b25a') +
        '</g>',
    )
    .join('');
  return (
    cast +
    '<defs><pattern id="dither-' +
    id +
    '" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#ddd"/><path d="M0 0h1v1H0zM1 1h1v1H1z" fill="#999"/></pattern><pattern id="grain-' +
    id +
    '" width="64" height="64" patternUnits="userSpaceOnUse">' +
    repeat(
      150,
      (i) =>
        '<rect x="' +
        ((hash(id + ':grain:' + i) >>> 7) % 64) +
        '" y="' +
        ((hash(id + ':grain:' + i) >>> 19) % 64) +
        '" width="1" height="1" fill="#ddd"/>',
    ) +
    '</pattern><mask id="dark-' +
    id +
    '" maskUnits="userSpaceOnUse" x="0" y="0" width="' +
    width +
    '" height="' +
    height +
    '"><rect width="' +
    width +
    '" height="' +
    height +
    '" fill="white"/>' +
    lights
      .filter((l) => l.lit !== false)
      .map(group)
      .join('') +
    '</mask></defs><rect width="' +
    width +
    '" height="' +
    height +
    '" fill="#07070a" opacity="' +
    (rot >= 3 ? 0.94 : 0.88) +
    '" mask="url(#dark-' +
    id +
    ')"/><g class="weather ' +
    weather +
    '">' +
    (weather === 'rain' || weather === 'ash'
      ? repeat(
          66,
          (i) =>
            '<path stroke="#a9b1ac" opacity=".35" d="M' +
            (hash(i + 'wx') % width) +
            ' ' +
            ((hash('weather-y' + i) >>> 11) % height) +
            (weather === 'rain' ? 'l-3 7' : 'h2') +
            '"/>',
        )
      : repeat(
          weather === 'fog' ? 4 : 2,
          (i) =>
            '<path opacity="' +
            (weather === 'fog' ? 0.17 : 0.09) +
            '" fill="#bab5a4" d="M-40 ' +
            (height - 37 - i * 28) +
            'h88v-3h92v2h110v-3h150v9h-440z"/>',
        )) +
    '</g>' +
    (weather === 'rain'
      ? lights
          .filter((l) => l.lit && !l.player && !l.hunter)
          .map(
            (l) =>
              '<path opacity=".32" stroke="#e7b25a" d="M' +
              (l.x - 7) +
              ' ' +
              (height - 13) +
              'h18m-15 3h9m-2 3h5"/>',
          )
          .join('')
      : '') +
    '<rect width="' +
    width +
    '" height="' +
    height +
    '" fill="url(#grain-' +
    id +
    ')" opacity=".06" class="grain"/>'
  );
}
export function vignette() {
  return [2, 5, 9]
    .map(
      (n, i) =>
        '<rect x="' +
        n +
        '" y="' +
        n +
        '" width="' +
        (256 - 2 * n) +
        '" height="' +
        (160 - 2 * n) +
        '" fill="none" stroke="#07070a" opacity="' +
        (0.75 - i * 0.22) +
        '" stroke-width="4"/>',
    )
    .join('');
}
