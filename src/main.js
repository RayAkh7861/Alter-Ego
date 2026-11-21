// Owner: C
import './styles/palette.css';
import './styles/style.css';
import {
  newGame,
  computeLuck,
  currentWant,
  eraFor,
  ensureLegacy,
  replant,
  acceptLife,
  load,
  save,
  clearSave,
  markPreview,
} from './state.js';
import { fakeGame } from './fakeGame.js';
import { setRot, playCrumble } from './rot.js';
import { actFor, defaultSetting } from './acts.js';
import { BUILDINGS } from './world/cast.js';
import { render as legacy } from './screens/legacy.js';
import { actCard } from './components/actCard.js';
import { consequence } from './components/consequence.js';
import { TUNING } from './rules.js';
import { playDecay } from './world/treehouseRot.js';
import { buildTreehouseScene } from './world/scenes.js';
import { fallbackPage } from './fallbacks.js';
import { chapterInfo, formatFor } from './rules.js';
import { renderTree } from './tree.js';
import { SETTINGS } from './settings.js';
import { render as title } from './screens/title.js';
import { nearbyAreas, buildEraMap } from './world/maps.js';
import { render as page } from './screens/page.js';
import { render as death } from './screens/death.js';
import { render as treehouse } from './screens/treehouse.js';
import { render as epitaph } from './screens/epitaph.js';
const screens = { title, page, death, treehouse, epitaph, legacy },
  root = document.querySelector('#app');
const flags = new URLSearchParams(import.meta.env.DEV ? location.search : '');
let game = load(),
  cleanup;
let preview = false;
export function show(name, params = {}) {
  cleanup?.();
  root.replaceChildren();
  root.dataset.screen = name;
  setRot(root, ctx.rot);
  cleanup = screens[name](root, params, ctx);
}
const resume = () =>
  show(
    !game
      ? 'title'
      : {
          alive: 'page',
          dead: game.lives.at(-1)?.legacy ? 'treehouse' : 'legacy',
          crumbled: game.lives.at(-1)?.legacy ? 'epitaph' : 'legacy',
          accepted: 'epitaph',
        }[game.status],
  );
const next = (n) => show(n.outcome === 'death' ? 'death' : 'page');
const ctx = {
  get game() {
    return game;
  },
  get rot() {
    return flags.has('rot')
      ? Math.max(0, Math.min(3, Number(flags.get('rot')) || 0))
      : game?.replants || 0;
  },
  show,
  resume,
  noworld: new URLSearchParams(location.search).has('noworld'),
  gentle: new URLSearchParams(location.search).has('gentle'),
  weather: ['dusk', 'fog', 'rain', 'ash'].includes(flags.get('weather'))
    ? flags.get('weather')
    : null,
  start() {
    game = newGame(flags.has('seed') ? Number(flags.get('seed')) : undefined);
    preview = false;
    save(game);
    show('page');
  },
  async rewrite(id, i) {
    const hub = root.querySelector('.hub'),
      n = game.nodes[id],
      c = n.choices[i],
      from = game.replants;
    hub.querySelector('.tree-view')?.remove();
    const before = computeLuck({ ...game, currentId: id, replants: from + 1 });
    const writing = replant(game, id, i).then((next) => {
      if (next.outcome === 'death') ensureLegacy(game);
      return next;
    });
    if (!hub.querySelector('.stage')) {
      const box = document.createElement('div');
      box.className = 'tree-box';
      box.innerHTML = '<svg></svg>';
      hub.append(box);
      renderTree(box.firstChild, game, {});
    }
    await playDecay(hub, from, from + 1, () => {
      const layer = hub.querySelector('.stage [data-layer]');
      if (layer) {
        layer.innerHTML = buildTreehouseScene(game, from + 1).layers[0].svg;
        renderTree(layer.querySelector('[data-room-tree]'), game, {});
      }
    });
    const card = document.createElement('article');
    card.className = 'page-card rewrite-card';
    hub.append(card);
    await consequence(card, game, c, {
      before,
      delta: TUNING.morals[c.moral] || 0,
    });
    if ([1, 5, 9].includes(n.chapter + 1)) {
      await writing;
      await actCard(root, actFor(n.chapter + 1), currentWant(game));
    }
    next(await writing);
  },
  accept() {
    acceptLife(game);
    show('epitaph');
  },
  reset() {
    if (!preview) clearSave();
    game = preview ? load() : null;
    preview = false;
    show('title');
  },
};
if (import.meta.env.DEV)
  window.alterEgo = {
    get game() {
      return game;
    },
    show,
    setRot,
    playCrumble,
    renderTree,
  };
const scene = flags.get('scene'),
  screen = flags.get('screen');
if (
  scene ||
  screen ||
  ['fake', 'rot', 'fall', 'talk', 'act', 'interior', 'map', 'area'].some((f) =>
    flags.has(f),
  )
) {
  preview = true;
  game = markPreview(structuredClone(fakeGame));
  if (flags.has('fall')) {
    game.status = 'crumbled';
    show('treehouse', { fall: true });
  } else if (
    flags.has('act') ||
    flags.has('talk') ||
    flags.has('interior') ||
    flags.has('map') ||
    flags.has('area') ||
    (scene &&
      !SETTINGS.includes(scene) &&
      !['prologue', 'treehouse'].includes(scene))
  ) {
    const area = flags.get('area') || scene,
      life = Math.min(4, Math.max(1, +flags.get('life') || 1));
    let chosenSeed = Number(flags.get('seed') || 42),
      act = Math.min(
        3,
        Math.max(1, Number(flags.get('map') || flags.get('act')) || 1),
      );
    if (area) {
      outer: for (let offset = 0; offset < 120; offset++)
        for (const a of [act, 1, 2, 3]) {
          if (buildEraMap(a, { seed: chosenSeed + offset, life }).areas[area]) {
            act = a;
            chosenSeed += offset;
            break outer;
          }
        }
    }
    const talk = flags.get('talk'),
      id = flags.get('interior'),
      b = BUILDINGS[act].find((b) => b.id === id || b.ids.includes(talk));
    const chapter = (act - 1) * 4 + 1,
      setting = b?.setting || defaultSetting(chapter);
    game = markPreview(newGame(chosenSeed));
    game.lifeNumber = life;
    game.replants = life - 1;
    let prev = game.nodes.n0;
    for (let c = 1; c <= chapter; c++) {
      const format = formatFor(c).format,
        map = eraFor(game, actFor(c)),
        start = c === chapter && map.areas[area] ? area : map.start,
        p = fallbackPage('good', {
          chapter: c,
          format,
          nearby_areas: nearbyAreas(map, start),
        }),
        nid = 'n' + game.nextId++;
      prev.chosenIndex = 0;
      prev.tried = [0];
      const n = {
        ...game.nodes.n0,
        ...p,
        id: nid,
        area: start,
        parentId: prev.id,
        fromChoice: 0,
        tried: [],
        chosenIndex: null,
        events: [],
        ages: chapterInfo(c).ages,
        act: actFor(c),
        chapter: c,
        format,
        summaryLine: p.summary_line,
        outcome: 'good',
        mark: 'Kept the key',
      };
      game.nodes[nid] = n;
      game.currentId = nid;
      prev = n;
    }
    prev.setting = setting;
    show('page', { talk, area: area || prev.area });
  } else if (scene === 'treehouse' || (!scene && !screen))
    show('treehouse', { climb: flags.has('rot') });
  else if (SETTINGS.includes(scene)) {
    const chapter = Math.max(
      1,
      Math.min(10, Math.trunc(Number(flags.get('chapter'))) || 1),
    );
    const node = {
      ...game.nodes.n2,
      chapter,
      ages: chapterInfo(chapter).ages,
      setting: scene,
      tried: [],
      chosenIndex: null,
    };
    show('page', { node, scenePreview: true });
  } else if (scene === 'prologue' || screen === 'page') {
    if (scene === 'prologue') game = markPreview(newGame(1));
    else {
      game = markPreview(newGame(42));
      game.nodes = {
        n0: structuredClone(fakeGame.nodes.n0),
        n1: {
          ...structuredClone(fakeGame.nodes.n1),
          tried: [],
          chosenIndex: null,
        },
      };
      game.currentId = 'n1';
      game.nextId = 2;
      game.luck = computeLuck(game);
    }
    show('page');
  } else show(Object.hasOwn(screens, screen) ? screen : 'title');
} else resume();
import './styles/v2.css';
import './styles/v3.css';
