import { escape } from '../screens/common.js';
export function openMapOverlay(
  container,
  map,
  { visited, area, choices, people = [], onClose },
) {
  const dialog = document.createElement('dialog');
  dialog.className = 'map-view page-card';
  dialog.setAttribute('aria-label', 'Map of the era');
  const known = Object.keys(map.areas).filter(
    (id) =>
      visited.has(id) ||
      map.links.some(
        (l) =>
          (l.from === id && visited.has(l.to)) ||
          (l.to === id && visited.has(l.from)),
      ),
  );
  const xy = Object.fromEntries(
    known.map((id, i) => [
      id,
      [66 + (i % 3) * 130, 32 + Math.floor(i / 3) * 65],
    ]),
  );
  const lines = map.links
    .filter(
      (l) =>
        xy[l.to] && xy[l.from] && (visited.has(l.to) || visited.has(l.from)),
    )
    .map(
      (l) =>
        '<line x1="' +
        xy[l.from][0] +
        '" y1="' +
        xy[l.from][1] +
        '" x2="' +
        xy[l.to][0] +
        '" y2="' +
        xy[l.to][1] +
        '" stroke="#685947"/>',
    )
    .join('');
  const boxes = known
    .map((id) => {
      const [x, y] = xy[id],
        seen = visited.has(id);
      return (
        '<g transform="translate(' +
        x +
        ' ' +
        y +
        ')"><rect x="-54" y="-16" width="108" height="32" fill="#cdbf9e" stroke="#342920" ' +
        (!seen ? 'stroke-dasharray="3 3"' : '') +
        '/><text text-anchor="middle">' +
        escape(seen ? map.areas[id].name : '?') +
        '</text>' +
        (id === area ? '<circle cx="-46" cy="9" r="3" fill="#a53e3b"/>' : '') +
        '<text y="12" text-anchor="middle">' +
        (choices.some((c) => c.place === id) ? '✝ ' : '') +
        escape(
          people
            .filter((p) => p.area === id)
            .map((p) => p.name[0])
            .join(' '),
        ) +
        '</text></g>'
      );
    })
    .join('');
  dialog.innerHTML =
    '<header><h2>Map</h2><button>Close</button></header><svg viewBox="0 0 390 ' +
    Math.ceil(known.length / 3) * 65 +
    '">' +
    lines +
    boxes +
    '</svg>' +
    choices
      .map(
        (c) =>
          '<small>✝ ' +
          escape(c.text) +
          ' · ' +
          escape(visited.has(c.place) ? map.areas[c.place].name : '?') +
          '</small>',
      )
      .join('');
  container.append(dialog);
  dialog.onclose = () => {
    dialog.remove();
    onClose?.();
  };
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.onkeydown = (e) => {
    e.stopPropagation();
    if (e.key.toLowerCase() === 'm') {
      e.preventDefault();
      dialog.close();
    }
  };
  dialog.showModal();
  return dialog;
}
