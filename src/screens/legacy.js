// Owner: C
import { ensureLegacy, lifeState, currentWant, eraFor } from '../state.js';
import { buildLegacyScene } from '../world/scenes.js';
import { residentsFor } from '../world/cast.js';
import { npcSprite } from '../world/sprites.js';
import { group } from '../world/kit.js';
import { reduced } from '../rot.js';
import { escape, typeText } from './common.js';
import { pause } from '../components/actCard.js';
export function render(root, params, ctx) {
  const g = ctx.game,
    n = g.nodes[g.currentId];
  let disposed = false,
    typing,
    skip = false;
  root.innerHTML =
    '<section class="legacy"><div class="legacy-world"></div><article class="page-card"><h2>What you left behind</h2><div class="lines" aria-live="polite">…</div><div class="legacy-end"></div></article></section>';
  const card = root.querySelector('.page-card'),
    lines = card.querySelector('.lines');
  card.onclick = () => {
    skip = true;
    typing?.finish();
  };
  (async () => {
    const l = await ensureLegacy(g);
    if (disposed) return;
    const scene = buildLegacyScene(n.act, {
        changes: l.world_changes,
        seed: g.seed,
        map: eraFor(g),
      }),
      world = root.querySelector('.legacy-world');
    if (!ctx.noworld)
      world.innerHTML =
        '<svg viewBox="0 0 256 160"><g class="pan">' +
        scene.layers[0].svg +
        scene.buildings
          .map(
            (b) =>
              '<text class="street-label" x="' +
              b.x +
              '" y="133">' +
              escape(b.caption || b.name) +
              '</text>',
          )
          .join('') +
        '<g class="remembered"></g></g></svg>';
    else
      card.insertAdjacentHTML(
        'beforeend',
        '<div class="legacy-buildings">' +
          scene.buildings
            .map(
              (b) =>
                '<small>' +
                escape(b.name) +
                ' · ' +
                escape(b.state || 'Standing') +
                (b.caption ? ' · ' + escape(b.caption) : '') +
                '</small>',
            )
            .join('') +
          '</div>',
      );
    if (!reduced())
      world
        .querySelector('.pan')
        ?.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-' + (scene.width - 256) + 'px)' },
          ],
          { duration: l.lines.length * 2500, fill: 'forwards' },
        );
    lines.textContent = '';
    for (const line of l.lines) {
      if (disposed) return;
      const p = document.createElement('p');
      lines.append(p);
      const place = scene.buildings.find((b) =>
          residentsFor(b.id, n.act, lifeState(g)).some(
            (npc) => npc.name === line.person,
          ),
        ),
        npc =
          place &&
          residentsFor(place.id, n.act, lifeState(g)).find(
            (x) => x.name === line.person,
          );
      if (world.querySelector('.remembered'))
        world.querySelector('.remembered').innerHTML = npc
          ? group(place.x + 12, 116, npcSprite(npc, Math.min(3, n.act + 1), 10))
          : '';
      if (skip) p.textContent = line.text;
      else {
        await new Promise((r) => {
          typing = typeText(p, line.text, r);
        });
        if (!skip) await pause(1500);
      }
    }
    if (disposed) return;
    const s = l.stats;
    card.querySelector('.legacy-end').innerHTML =
      '<small>Remembered by ' +
      s.remembered +
      ' · Hurt ' +
      s.hurt +
      ' · Wishes granted ' +
      s.wishes +
      ' · Debts left unpaid ' +
      s.debts +
      '</small><p>You wanted ' +
      escape(currentWant(g)) +
      '. You left ' +
      escape(l.what_you_left) +
      '</p><button class="primary">Return to the treehouse</button>';
    card.querySelector('button').onclick = () =>
      ctx.show('treehouse', { climb: true });
  })();
  return () => {
    disposed = true;
    typing?.finish();
  };
}
