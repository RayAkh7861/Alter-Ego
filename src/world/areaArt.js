import { hash } from '../pixel.js';
const palette = [
  '#07070a',
  '#121016',
  '#1e1b22',
  '#3a3640',
  '#4b5048',
  '#6f7458',
  '#b9ad94',
  '#e7b25a',
  '#fff0c0',
  '#6f86a6',
];
const box = (x, y, w, h, c) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" fill="' +
  palette[c] +
  '"/>';
const path = (d, c) => '<path d="' + d + '" fill="' + palette[c] + '"/>';
const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
export function areaArt(a, act, seed) {
  const y = a.floorY,
    id = a.id,
    h = a.height,
    w = a.width,
    off = hash(id + seed) % 18;
  let art = box(0, 0, w, h, act === 3 ? 5 : 3);
  if (a.kind === 'exterior') {
    if (
      [
        'lane',
        'well_square',
        'avenue',
        'lane_winter',
        'alley',
        'tram_stop',
        'quay',
      ].includes(id)
    ) {
      art += times(8, (i) => {
        const x = i * 48 - off,
          top = act === 2 ? -10 + (i % 3) * 8 : 58 + ((i * 13 + off) % 34);
        return (
          box(x, top, 44, y - top, 2) +
          path('M' + (x - 3) + ' ' + top + 'l26 -23 26 23z', 1) +
          times(act === 2 ? 12 : 6, (j) =>
            box(
              x + 5 + (j % 3) * 12,
              top + 9 + Math.floor(j / 3) * 18,
              6,
              10,
              (i + j + off) % 4 ? 4 : 7,
            ),
          )
        );
      });
      if (id === 'avenue')
        art +=
          '<circle cx="230" cy="66" r="32" fill="#b9ad94"/><path d="M230 42v24l16 7" fill="none" stroke="#1e1b22" stroke-width="3"/>';
    } else if (['shore', 'pier'].includes(id))
      art +=
        box(0, 121, w, 45, 9) +
        times(15, (i) => box(i * 24, 132 + (i % 4) * 6, 18, 1, 6)) +
        path('M180 150h60l-11 8h-36z', 2);
    else
      art += times(id.includes('roots') ? 3 : 12, (i) => {
        const x = (i * 43 + off) % 320,
          wide = id.includes('roots') ? 36 : 8;
        return (
          path(
            'M' +
              x +
              ' ' +
              y +
              'l8 -32 -3 -70 -17 -28 24 20 9 -50 1 62 22 -25 -20 44 3 53 25 26 -29 -7z',
            2,
          ) + box(x + 7, y - 47, wide, 43, 2)
        );
      });
  } else {
    art +=
      box(0, 0, w, h, 3) +
      times(17, (i) => box(i * 20, 0, 1, y, 2)) +
      box(0, 0, w, act === 3 ? y - 56 : 18, 1);
    const pane = act === 3 ? y - 52 : y - 112;
    art +=
      box(156, pane, 42, 44, 1) +
      box(159, pane + 3, 36, 37, 9) +
      box(175, pane, 3, 42, 2) +
      box(158, pane + 20, 40, 2, 2) +
      '<g opacity=".2">' +
      path('M159 ' + (pane + 40) + 'h36l70 64h-44z', 9) +
      '</g>';
    if (id === 'bedroom' || id === 'hospital' || id === 'old_house')
      art +=
        box(76, y - 40, 87, 16, 5) +
        box(73, y - 61, 6, 61, 2) +
        box(158, y - 34, 6, 34, 2) +
        box(79, y - 45, 21, 5, 6) +
        box(229, y - 83, 38, 83, 2) +
        box(232, y - 79, 15, 74, 3);
    else if (id === 'stairwell') {
      art += times(3, (i) => box(0, y - i * 96, w, 4, 4));
      for (const link of a.landings) {
        if (link.kind === 'ladder')
          art +=
            box(link.x - 5, link.toY, 2, 96, 5) +
            box(link.x + 5, link.toY, 2, 96, 5);
        art += times(16, (j) =>
          box(
            Math.round(link.x + ((link.toX - link.x) * j) / 16) - 5,
            link.y - j * 6,
            12,
            2,
            6,
          ),
        );
      }
    } else {
      const count = id === 'office_floor' ? 5 : 2;
      art += times(count, (i) => {
        const x = 83 + i * (count === 5 ? 37 : 103);
        return (
          box(x, y - 40, 55, 5, 5) +
          box(x + 3, y - 35, 4, 35, 2) +
          box(x + 47, y - 35, 4, 35, 2) +
          box(x + 7, y - 46, 7, 6, 6)
        );
      });
    }
  }
  const landmark = {
    kitchen: () =>
      box(192, y - 73, 57, 73, 2) +
      box(202, y - 36, 34, 29, 1) +
      box(205, y - 17, 28, 8, 7) +
      box(197, y - 80, 47, 8, 4) +
      box(223, y - 124, 10, 45, 2),
    schoolhouse: () =>
      box(82, y - 99, 108, 53, 5) +
      box(86, y - 95, 100, 45, 2) +
      times(7, (i) => box(96 + i * 11, y - 75 + (i % 3), 5, 1, 6)),
    bakery: () =>
      path('M182 ' + y + 'v-44l11 -16h38l13 18v42z', 4) +
      box(196, y - 34, 35, 27, 1) +
      box(201, y - 16, 23, 6, 7),
    bakery_old: () =>
      box(184, y - 42, 62, 42, 3) +
      times(4, (i) => box(189 + i * 13, y - 39, 6, 32, 2)),
    chapel: () =>
      times(3, (i) => path('M' + (80 + i * 65) + ' 95v-40l9 -12 9 12v40z', 9)) +
      box(143, y - 53, 6, 35, 2) +
      box(134, y - 45, 24, 4, 2),
    chapel_ruin: () =>
      times(4, (i) =>
        box(55 + i * 63, 80 + (i % 3) * 18, 12, 96 - (i % 3) * 18, 3),
      ) + path('M63 95l64 -50 74 38 -5 6 -69 -37 -62 52z', 2),
    cellar: () =>
      times(
        5,
        (i) => box(40 + i * 50, 68, 46, 4, 2) + box(44 + i * 50, 52, 14, 16, 5),
      ) +
      box(222, y - 44, 37, 44, 4) +
      box(222, y - 34, 37, 3, 2),
    well_square: () =>
      box(184, y - 24, 48, 24, 4) +
      box(179, y - 27, 58, 5, 5) +
      box(181, y - 63, 4, 39, 2) +
      box(230, y - 63, 4, 39, 2) +
      path('M171 ' + (y - 61) + 'l36 -23 36 23z', 2),
    fields: () =>
      box(191, y - 65, 3, 65, 2) +
      box(176, y - 53, 34, 3, 3) +
      path('M184 ' + (y - 54) + 'h16l7 31h-28z', 4) +
      box(188, y - 70, 9, 13, 5),
    boardroom: () =>
      box(93, y - 44, 151, 6, 5) +
      times(
        5,
        (i) =>
          box(98 + i * 30, y - 71, 13, 28, 2) +
          box(100 + i * 30, y - 38, 4, 38, 2),
      ),
    flat: () =>
      box(178, y - 57, 58, 39, 4) +
      box(175, y - 23, 65, 8, 3) +
      box(179, y - 15, 4, 15, 2) +
      box(231, y - 15, 4, 15, 2),
    bar: () =>
      box(67, y - 53, 143, 53, 2) +
      times(8, (i) =>
        box(75 + i * 17, y - 63 - (i % 3) * 2, 5, 10 + (i % 3) * 2, 5),
      ),
    pawnshop: () =>
      times(
        5,
        (i) =>
          box(76 + i * 31, y - 83, 27, 48, 4) +
          box(80 + i * 31, y - 80, 19, 35, 3) +
          box(85 + i * 31, y - 65, 8, 10, 7),
      ),
    tram_stop: () =>
      box(130, y - 75, 100, 5, 2) +
      box(135, y - 70, 3, 70, 4) +
      box(222, y - 70, 3, 70, 4) +
      box(156, y - 42, 45, 20, 6) +
      box(160, y - 38, 37, 1, 3),
    alley: () =>
      times(
        4,
        (i) =>
          box(53 + i * 65, 25, 5, 106, 4) + box(53 + i * 65, 125, 25, 6, 4),
      ),
    quay: () =>
      path('M68 176V45l113 -24v7L79 53v123z', 2) +
      box(156, 32, 2, 76, 2) +
      box(149, 107, 18, 5, 2),
    churchyard: () =>
      times(
        9,
        (i) =>
          box(23 + i * 34, y - 17 - (i % 3) * 5, 13, 17 + (i % 3) * 5, 3) +
          box(26 + i * 34, y - 20 - (i % 3) * 5, 8, 3, 3),
      ),
    pier: () =>
      times(7, (i) => box(i * 52, y - 23, 4, 40, 2)) + box(0, y - 4, w, 4, 3),
    lane_winter: () =>
      box(187, y - 61, 27, 61, 1) +
      path('M185 ' + (y - 54) + 'l29 24v6l-29 -24z', 4),
  }[id];
  if (landmark) art += landmark();
  if (act === 3 && a.kind === 'exterior')
    art += times(45, (i) => box((i * 47 + off) % w, (i * 17) % y, 2, 1, 6));
  art +=
    box(0, y, w, h - y, act === 3 ? 6 : 4) +
    times(28, (i) =>
      box((i * 37 + off) % w, y + 1 + (i % 7), 4 + (i % 12), 1, 3),
    );
  const fg = times(
    4,
    (i) =>
      box(i * 96 + off, y - 12 - (i % 2) * 24, 3, 46, 0) +
      box(i * 96 + off - 4, y - 12 - (i % 2) * 24, 10, 3, 0),
  );
  return [
    { parallax: 1, svg: art },
    { parallax: 1.35, foreground: true, svg: fg },
  ];
}
export function fixtures(a) {
  const y = a.floorY,
    climbFloor = a.kind === 'vertical' ? y - 192 : y;
  return (
    a.doors
      .map(
        (d) =>
          box(d.x - 8, y - 48, 17, 48, 1) +
          '<g data-door="' +
          d.to +
          '">' +
          box(d.x - 6, y - 45, 13, 45, 3) +
          box(d.x + 3, y - 22, 2, 2, d.locked ? 7 : 6) +
          '</g>',
      )
      .join('') +
    a.climbs
      .map(
        (d) =>
          times(7, (i) =>
            box(
              d.x - 7 + (d.kind === 'stairs' ? i * 2 : 0),
              climbFloor - 5 - i * 4,
              14,
              2,
              5,
            ),
          ) + box(d.x - 7, climbFloor - 31, 2, 31, 4),
      )
      .join('') +
    a.hides
      .map(
        (s) =>
          box(s.x - 4, y - 19, s.w + 8, 3, 3) +
          box(s.x - 2, y - 16, 3, 16, 2) +
          box(s.x + s.w, y - 16, 3, 16, 2),
      )
      .join('') +
    (a.crawl ? box(a.crawl.x, y - 12, a.crawl.w, 3, 4) : '') +
    a.lights
      .map(
        (l) =>
          box(l.x - 1, l.y, 2, y - l.y, 2) +
          box(l.x - 4, l.y - 3, 9, 6, l.lit ? 7 : 4) +
          box(l.x - 2, l.y - 2, 5, 4, l.lit ? 8 : 3),
      )
      .join('')
  );
}
