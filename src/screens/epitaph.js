// Owner: C
import { renderTree } from '../tree.js';
import { epitaphPayload, save } from '../state.js';
import { fetchEpitaph } from '../ai.js';
import { npcSprite } from '../world/sprites.js';
import { NPCS } from '../world/cast.js';
import { escape } from './common.js';
export function render(root, params, ctx) {
  const g = ctx.game,
    age = g.nodes[g.currentId].deathAge;
  let disposed = false;
  root.innerHTML =
    '<section class="ending"><div class="tree-box"><svg></svg></div><article class="page-card"><small>The last page</small><h2>THE END</h2><div class="stone" aria-live="polite">Carving the stone…</div></article></section>';
  renderTree(root.querySelector('svg'), g, { mode: 'full' });
  (async () => {
    const result = g.epitaph ?? (await fetchEpitaph(epitaphPayload(g)));
    if (disposed) return;
    if (!g.epitaph) {
      g.epitaph = result;
      save(g);
    }
    const stone = root.querySelector('.stone');
    stone.innerHTML =
      '<blockquote>' +
      escape(result.epitaph) +
      '</blockquote><p>' +
      escape(result.verdict) +
      '</p><p>You left ' +
      escape(g.lives.at(-1)?.legacy?.what_you_left || 'a name, for a while') +
      '</p><div class="echo-row">' +
      g.lives
        .slice(0, -1)
        .map(
          (l) =>
            '<span><svg viewBox="-8 -18 16 19">' +
            npcSprite(NPCS.owner, 3, 10) +
            '</svg>Life ' +
            l.number +
            ' · ' +
            l.age +
            '</span>',
        )
        .join('') +
      '</div><small>Died at ' +
      age +
      ' · ' +
      g.lifeNumber +
      ' lives lived · ' +
      g.replants +
      ' replants used</small><button class="primary">Plant a new seed</button>';
    stone.querySelector('button').onclick = ctx.reset;
  })();
  return () => {
    disposed = true;
  };
}
