// Owner: B
export const rect = (x, y, w, h, cls) =>
  '<rect x="' +
  x +
  '" y="' +
  y +
  '" width="' +
  w +
  '" height="' +
  h +
  '" class="' +
  cls +
  '"/>';
export const group = (x, y, svg) =>
  '<g transform="translate(' + x + ' ' + y + ')">' + svg + '</g>';
export const repeat = (n, f) =>
  Array.from({ length: n }, (_, i) => f(i)).join('');
export function canopy(x, y, size) {
  let art = '';
  for (let j = 0; j < size; j++) {
    const span = Math.round(
      Math.sqrt(Math.max(0, 1 - ((j - size / 2) / (size / 2)) ** 2)) * size,
    );
    art += rect(
      x - span,
      y + j,
      span * 2 + 1,
      1,
      j > size * 0.74 ? 'th-l1' : j > size * 0.5 ? 'th-l2' : 'th-l3',
    );
    if (span > 3 && j % 3 === 0)
      art += repeat(Math.floor(span / 3), (i) =>
        rect(x - span + 2 + i * 5 + (j % 2), y + j, 2, 1, 'th-l4'),
      );
  }
  return art;
}
export const tree = (x, y, s) =>
  rect(x - 2, y - s * 2, 5, s * 2, 'th-b3') +
  rect(x - 1, y - s * 2, 1, s * 2, 'th-b4') +
  canopy(x, y - s * 3, s) +
  canopy(x - 5, y - s * 2, s - 2);
export function house(x, y, w, h) {
  let art =
    rect(x, y - h, w, h, 'sc-brick') +
    repeat(h / 5, (i) => rect(x, y - h + i * 5, w, 1, 'sc-mortar'));
  art += repeat(Math.ceil(w / 2) + 2, (i) =>
    rect(x - 2 + i, y - h - i, w + 4 - i * 2, 1, i % 4 ? 'th-r2' : 'th-r3'),
  );
  for (let a = 4; a < w - 5; a += 12)
    for (let b = 4; b < h - 6; b += 14)
      art +=
        rect(x + a, y - h + b, 7, 9, 'th-b1') +
        rect(x + a + 1, y - h + b + 1, 2, 6, 'th-glow') +
        rect(x + a + 4, y - h + b + 1, 2, 6, 'th-gold');
  return (
    art +
    rect(x + w - 12, y - 12, 8, 12, 'th-w1') +
    rect(x + w - 6, y - 6, 1, 1, 'th-gold')
  );
}
export const fence = (x, y, w) =>
  rect(x, y - 7, w, 2, 'th-w3') +
  rect(x, y - 3, w, 1, 'th-w2') +
  repeat(Math.floor(w / 8), (i) => rect(x + i * 8, y - 10, 2, 10, 'th-w2'));
export const pine = (x, y, h) =>
  rect(x - 2, y - h, 4, h, 'th-b3') +
  repeat(h - 4, (i) =>
    rect(
      x - Math.floor(i / 3),
      y - h + i,
      Math.floor(i / 3) * 2 + 1,
      1,
      i % 7 === 0 ? 'th-l3' : 'th-l2',
    ),
  );
export const lamp = (x, y) =>
  rect(x, y - 19, 2, 19, 'th-b1') +
  rect(x - 2, y - 22, 6, 5, 'th-ink') +
  rect(x - 1, y - 21, 4, 3, 'th-glow');
export const post = (x) =>
  rect(x, 165, 2, 11, 'th-w2') +
  rect(x - 4, 164, 11, 5, 'th-w3') +
  rect(x + 7, 165, 2, 3, 'th-w3');
export function mountain(x, y, h) {
  return repeat(
    h,
    (i) =>
      rect(x - i, y - h + i, 2 * i + 1, 1, i < h / 5 ? 'sc-snow' : 'th-cl1') +
      rect(x, y - h + i, i + 1, 1, i < h / 6 ? 'th-moon2' : 'th-smoke'),
  );
}
export function boat(x, y) {
  return group(
    x,
    y,
    rect(0, -36, 2, 36, 'th-w3') +
      repeat(30, (i) =>
        rect(3, -35 + i, 1 + Math.floor(i * 0.7), 1, 'th-moon2'),
      ) +
      repeat(5, (i) => rect(-8 + i, -3 + i, 37 - 2 * i, 1, 'th-w2')),
  );
}
export function ground(season, urban) {
  let art =
    rect(0, 175, 384, 17, 'th-dirt2') +
    rect(
      0,
      174,
      384,
      3,
      season === 'winter'
        ? 'sc-snow'
        : urban
          ? 'th-stone'
          : season === 'autumn'
            ? 'th-w3'
            : 'th-g2',
    );
  art += repeat(125, (i) =>
    rect((i * 53) % 384, 178 + ((i * 13) % 13), 2 + (i % 4), 1, 'th-dirt1'),
  );
  return art;
}
