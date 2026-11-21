// Owner: C
import { lifePath, canReplant, computeLuck } from '../state.js';
import { renderTree } from '../tree.js';
import { bindInput } from '../world/input.js';
import { escape, header } from '../screens/common.js';
export function openTreeView(
  container,
  g,
  { overlay = false, onReplant, onAccept, onClose },
) {
  const path = lifePath(g),
    view = document.createElement('section');
  view.className = 'tree-view' + (overlay ? ' overlay' : '');
  if (overlay) {
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-label', 'Your life tree');
    view.setAttribute('aria-modal', 'true');
  }
  view.innerHTML =
    '<div class="tree-figure"><h2>Your life tree</h2><div class="tree-box"><svg></svg></div><small>↑ ↓ Browse pages</small></div><article class="page-card panel"></article>';
  container.append(view);
  const panel = view.querySelector('.panel');
  let index = path.findLastIndex((n) =>
      n.choices.some((_, i) => !n.tried.includes(i)),
    ),
    confirming = false,
    locked = false;
  const legacy = g.lives.at(-1)?.legacy,
    regret = path.findIndex(
      (n) =>
        n.id === legacy?.regret?.node_id &&
        n.choices.some((_, i) => !n.tried.includes(i)),
    );
  if (regret >= 0) index = regret;
  if (index < 0) index = path.length - 1;
  function paint() {
    confirming = false;
    const n = path[index];
    renderTree(view.querySelector('svg'), g, {
      mode: 'full',
      selectedId: n.id,
      onSelect: (id) => {
        if (!confirming && !locked) {
          index = path.findIndex((v) => v.id === id);
          paint();
        }
      },
    });
    panel.innerHTML =
      (regret === index
        ? "<small>The page you'd turn back to</small><br>"
        : '') +
      '<small>' +
      header(n) +
      '</small><h2>' +
      escape(n.title) +
      '</h2><p>' +
      escape(n.narration) +
      '</p>' +
      '<small class="marks">' +
      path
        .slice(0, index + 1)
        .map((n) => escape(n.mark))
        .filter(Boolean)
        .join(' · ') +
      '</small>' +
      n.choices
        .map(
          (c, i) =>
            '<button class="choice" data-choice="' +
            i +
            '" ' +
            (n.tried.includes(i) || !canReplant(g) ? 'disabled' : '') +
            '>› ' +
            escape(c.text) +
            (n.chosenIndex === i
              ? ' · Taken'
              : n.tried.includes(i)
                ? ' · Already lived'
                : '') +
            '</button>',
        )
        .join('') +
      (!canReplant(g)
        ? '<p>No replants left.</p>'
        : !n.choices.some((_, i) => !n.tried.includes(i))
          ? '<p>No other paths from this page.</p>'
          : '') +
      (overlay
        ? '<button class="secondary back">Close</button>'
        : '<button class="primary accept">Accept this life</button>');
    panel
      .querySelectorAll('[data-choice]')
      .forEach((b) => (b.onclick = () => confirm(n, +b.dataset.choice)));
    panel.lastElementChild.onclick = overlay ? onClose : onAccept;
  }
  function confirm(n, i) {
    confirming = true;
    const r = g.replants;
    panel.innerHTML =
      '<h2>Prune this branch?</h2><p>Everything after this page becomes dead wood, and this life becomes one of your alter egos. The tree will rot. Your luck will worsen.</p><p>Luck ' +
      g.luck +
      ' → ' +
      computeLuck({ ...g, currentId: n.id, replants: r + 1 }) +
      '. Rot ' +
      r +
      ' → ' +
      (r + 1) +
      '. Replants left ' +
      (3 - r) +
      ' → ' +
      (2 - r) +
      '.</p>' +
      (legacy
        ? '<small>What will be undone:</small>' +
          legacy.lines
            .slice(0, 3)
            .map((l) => '<del>' + escape(l.text) + '</del>')
            .join('')
        : '') +
      (r === 2
        ? '<p class="ripple">This is the last time the tree will hold you.</p>'
        : '') +
      '<button class="primary">Prune and replant</button><button class="secondary">Keep it</button>';
    panel.lastChild.focus();
    panel.lastChild.onclick = paint;
    panel.querySelector('.primary').onclick = () => {
      if (locked) return;
      locked = true;
      panel.innerHTML = '<p role="status">A new leaf is growing…</p>';
      onReplant(n.id, i);
    };
  }
  paint();
  view.tabIndex = -1;
  view.focus({ preventScroll: true });
  const off = bindInput((k) => {
    if (locked) return true;
    if (k === 'escape') {
      if (confirming) paint();
      else onClose?.();
      return true;
    }
    if (!confirming && (k === 'arrowup' || k === 'arrowdown')) {
      index = Math.max(
        0,
        Math.min(path.length - 1, index + (k === 'arrowup' ? 1 : -1)),
      );
      paint();
      return true;
    }
    const buttons = [...panel.querySelectorAll('button:not(:disabled)')];
    if (k === 'arrowleft' || k === 'arrowright' || (overlay && k === 'tab')) {
      const i = buttons.indexOf(document.activeElement);
      buttons[
        (i + (k === 'arrowleft' ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
      return true;
    }
    if (k === 'enter') {
      buttons[0]?.click();
      return true;
    }
  });
  return () => {
    off();
    view.remove();
  };
}
