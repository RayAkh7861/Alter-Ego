// Owner: C
import { heroArt } from '../world/engine.js';
import { icon } from '../pixel.js';
import { exteriorArt, houseIcon } from '../world/treehouseRot.js';
export function render(root, params, ctx) {
  root.innerHTML =
    '<section class="cover"><header class="cover-bar"><span>' +
    icon('book') +
    ' Interactive gamebook</span></header><div class="cover-body"><div class="cover-copy"><div class="ornament" aria-hidden="true">✦</div><h1>ALTER<br><b>EGO</b></h1><p>Every choice is a branch.<br>Every branch is another you.</p><button class="primary begin">Begin <span aria-hidden="true">→</span></button>' +
    (ctx.game && ['alive', 'dead'].includes(ctx.game.status)
      ? '<button class="continue">Continue your life ' +
        houseIcon(ctx.rot) +
        '</button>'
      : '') +
    '</div><div class="illustration">' +
    exteriorArt(heroArt, ctx.rot) +
    '</div></div><footer class="cover-foot"><span>KCLTech · Retro Remix</span><i></i>' +
    icon('seed') +
    '</footer></section>';
  root.querySelector('.begin').onclick = ctx.start;
  const cont = root.querySelector('.continue');
  if (cont) cont.onclick = ctx.resume;
}
