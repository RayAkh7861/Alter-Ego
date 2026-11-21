// Owner: C
import { openTreeView } from '../components/treeView.js';
import { renderTree } from '../tree.js';
import { startLeafFall } from '../rot.js';
import { exteriorArt, playFall } from '../world/treehouseRot.js';
import { heroArt, mountWorld } from '../world/engine.js';
import { buildTreehouseScene } from '../world/scenes.js';
import { ageFor } from '../world/sprites.js';
import { bindInput } from '../world/input.js';
import { hud, escape } from './common.js';
export function render(root, params, ctx) {
  const g = ctx.game;
  if (params.climb) {
    root.style.setProperty(
      '--art-scale',
      Math.max(1, Math.floor(Math.min(innerWidth / 120, innerHeight / 152))),
    );
    root.innerHTML =
      '<div class="climb">' + exteriorArt(heroArt, ctx.rot) + '</div>';
    const timer = setTimeout(() => ctx.show('treehouse'), 1500);
    return () => clearTimeout(timer);
  }
  root.innerHTML =
    '<section class="hub">' +
    hud(g, ctx.rot) +
    '<div class="scene"></div></section>';
  const hub = root.firstChild,
    slot = hub.querySelector('.scene');
  let world,
    close,
    off,
    disposed = false;
  function controls() {
    off = bindInput((k) => {
      if ([' ', 'enter', 'e'].includes(k)) {
        world?.interact();
        return true;
      }
    });
  }
  function dismiss() {
    close?.();
    close = null;
    world?.setInputEnabled(true);
    controls();
    hub.focus({ preventScroll: true });
  }
  function tree() {
    world?.setInputEnabled(false);
    close = openTreeView(hub, g, {
      overlay: !!world,
      onReplant: ctx.rewrite,
      onAccept: ctx.accept,
      onClose: world ? dismiss : undefined,
    });
    if (!world) {
      const room = buildTreehouseScene(g, ctx.rot);
      const entries = room.stations.filter((s) =>
        ['portrait', 'gardener', 'window'].includes(s.type),
      );
      hub
        .querySelector('.tree-figure')
        .insertAdjacentHTML(
          'beforeend',
          '<details class="room-notes"><summary>Look around the room</summary>' +
            entries
              .map(
                (s) =>
                  '<p>' +
                  escape(s.label) +
                  ' · ' +
                  escape(s.text) +
                  (s.legacyLine
                    ? '<br><' +
                      (s.erased ? 'del' : 'span') +
                      '>' +
                      escape(s.legacyLine) +
                      '</' +
                      (s.erased ? 'del' : 'span') +
                      '>'
                    : '') +
                  '</p>',
              )
              .join('') +
            '</details>',
        );
    }
  }
  function book() {
    world.setInputEnabled(false);
    const dialog = document.createElement('div');
    dialog.className = 'dialog page-card';
    dialog.setAttribute('role', 'dialog');
    dialog.innerHTML =
      '<h2>Close the book?</h2><p>This life will be the one you keep.</p><button class="primary">Accept this life</button><button class="secondary">Not yet</button>';
    hub.append(dialog);
    dialog.lastChild.focus();
    dialog.querySelector('.primary').onclick = ctx.accept;
    dialog.lastChild.onclick = dismiss;
    const unbind = bindInput((k) => {
      if (k === 'escape') {
        dismiss();
        return true;
      }
      if (k === 'tab') {
        (document.activeElement === dialog.lastChild
          ? dialog.querySelector('button')
          : dialog.lastChild
        ).focus();
        return true;
      }
    });
    close = () => {
      unbind();
      dialog.remove();
    };
  }
  function interact(item) {
    if (close || g.status === 'crumbled') return;
    if (item.type === 'tree') tree();
    if (item.type === 'book') book();
  }
  let target;
  if (ctx.noworld) {
    if (g.status === 'crumbled') {
      slot.innerHTML = '<svg></svg>';
      slot.className = 'tree-box';
      target = slot.firstChild;
      renderTree(target, g, {});
    } else {
      slot.remove();
      tree();
    }
  } else {
    const spec = buildTreehouseScene(g, ctx.rot);
    world = mountWorld(slot, spec, {
      age: ageFor(g.nodes[g.currentId].chapter),
      onInteract: interact,
    });
    target = slot.querySelector('[data-room-tree]');
    renderTree(target, g, {});
    target.style.cursor = 'pointer';
    target.onclick = () => interact({ type: 'tree' });
    world.walkIn();
    controls();
    hub.tabIndex = -1;
    if (g.lifeNumber === 1) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = '← → walk · ↑ ↓ look · Space to interact';
      hub.append(hint);
    }
  }
  if (g.status === 'crumbled') {
    world?.setInputEnabled(false);
    (async () => {
      await playFall({ root: hub, art: heroArt, tree: target });
      if (!disposed) ctx.show('epitaph');
    })();
  }
  const stop = startLeafFall(hub, ctx.rot);
  return () => {
    disposed = true;
    stop();
    off?.();
    close?.();
    world?.destroy();
  };
}
