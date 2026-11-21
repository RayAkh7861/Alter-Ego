// Owner: C
import { buildPrologueScene } from '../world/scenes.js';
import { spawnStrangers } from '../world/strangers.js';
import { NPCS } from '../world/cast.js';
import { mountWorld } from '../world/engine.js';
import { ageFor } from '../world/sprites.js';
import { bindInput } from '../world/input.js';
import { hash, riskIcon, icon } from '../pixel.js';
import { renderTree } from '../tree.js';
import { startLeafFall } from '../rot.js';
import { hud, header, typeText, escape } from './common.js';
import {
  lifeState,
  lifePath,
  eraFor,
  pickedItems,
  roomOpened,
  talksUsed,
  recordEvent,
  currentWant,
  nearby,
  choose,
  dueFor,
  ensureLegacy,
} from '../state.js';
import { TUNING } from '../rules.js';
import { actFor } from '../acts.js';
import { fateInput } from '../components/fateInput.js';
import { actCard, pause } from '../components/actCard.js';
import { consequence, floatLuck } from '../components/consequence.js';
import { dialogue } from '../components/dialogue.js';
export function render(root, params, ctx) {
  const g = ctx.game,
    n = params.node ?? g.nodes[g.currentId],
    death = n.outcome === 'death',
    prologue = !n.chapter,
    seed = hash(n.id),
    rot = ctx.rot;
  const state = () => lifeState(g),
    canWrite = () =>
      !prologue && !death && !state().fateUsedActs.includes(actFor(n.chapter));
  const map = eraFor(g, n.act),
    startArea = map.areas[params.area || n.area]?.id || map.start;
  if (ctx.weather) map.weather = ctx.weather;
  const exterior = prologue ? buildPrologueScene() : null,
    buildings = nearby(g, n),
    strangers = prologue ? [] : spawnStrangers(g, n.id, map);
  const items = () =>
    map.keepsakes.filter((i) => !pickedItems(g).includes(i.id));
  const visibleAreas = () =>
    new Set([startArea, ...n.choices.map((c) => c.place)]);
  const memory =
    g.erasedMemories.at(-1) ||
    state().marks[0] ||
    'A small hand rests on the door.';
  const legacy = death ? ensureLegacy(g) : null;
  root.innerHTML =
    '<section class="play ' +
    (ctx.noworld ? 'text-mode' : '') +
    '"><div class="scene"></div>' +
    hud(g, rot) +
    '<div class="mini"><svg></svg></div><article class="page-card story"><small>' +
    header(n) +
    '</small><h2>' +
    escape(n.title) +
    '</h2>' +
    (n.ripple
      ? '<p class="ripple">Because of you: ' + escape(n.ripple) + '</p>'
      : '') +
    (n.savedBy
      ? '<small>Saved by ' +
        escape(NPCS[n.savedBy]?.name || state().partner?.name || n.savedBy) +
        '</small>'
      : '') +
    '<p class="narration"></p><div class="actions"></div></article>' +
    (!ctx.noworld && n.chapter <= 1
      ? '<div class="hint">← → walk · Shift run · ↑ enter · ↓ crouch · Space interact · Q page · M map</div>'
      : '') +
    '</section>';
  const find = (s) => root.querySelector(s),
    actions = find('.actions'),
    slot = find('.scene'),
    story = find('.story'),
    draw = (pending) =>
      renderTree(find('.mini svg'), g, { mode: 'mini', pending });
  let world,
    ready = false,
    locked = false,
    modal = false,
    disposed = false,
    moved = false,
    pen = false,
    typing;
  const allowed = (npc) =>
    !params.scenePreview &&
    !death &&
    talksUsed(n) < 3 &&
    !n.events.some((e) => e.npcId === npc.id || e.strangerId === npc.id);
  function onEvent(e) {
    if (death || locked) return false;
    if (e.type === 'unlock') {
      const key = state().keepsakes.find((i) => i.key && i.act === n.act);
      if (!key) return false;
      e.item = key;
    }
    if (e.type === 'keepsake' && state().keepsakes.length >= 3) return false;
    const committed = recordEvent(g, e);
    find('.hud').outerHTML = hud(g, rot);
    if (committed) floatLuck(root, committed.luckDelta);
    return true;
  }
  function collapse(value) {
    if (!ready || locked || modal || pen || prologue || death || ctx.noworld)
      return;
    find('.play').classList.toggle('collapsed', value);
  }
  function mount() {
    if (prologue) {
      world = mountWorld(slot, exterior, {
        age: 'child',
        interactables: exterior.stations,
        onInteract: (i) => {
          if (i.index != null) take(i.index);
        },
      });
      return;
    }
    world = mountWorld(slot, map, {
      age: ageFor(n.chapter),
      seed: n.id + g.seed,
      chapter: n.chapter,
      rot,
      startArea,
      strangers,
      memory,
      gentle: ctx.gentle || death,
      ready: () => ready && !death,
      canWrite,
      onPen: openPen,
      choices: () => (ready && !death ? n.choices : []),
      items: () => (death ? [] : items()),
      residents: (id) => buildings.find((b) => b.id === id)?.residents || [],
      met: () =>
        buildings
          .flatMap((b) =>
            b.residents
              .filter((p) =>
                lifePath(g).some((n) => n.events.some((e) => e.npcId === p.id)),
              )
              .map((p) => ({ ...p, area: b.id })),
          )
          .concat(
            strangers
              .filter((p) => state().strangersMet.includes(p.id))
              .map((p) => ({ ...p, name: p.id })),
          ),
      onEvent,
      opened: () => roomOpened(g, n.act),
      canTalk: allowed,
      onTalk: talk,
      onChoose: take,
      onMove: () => {
        if (!moved && ready) {
          collapse(true);
          moved = true;
        }
      },
    });
  }
  async function talk(npc) {
    if (locked || modal || !allowed(npc)) return;
    modal = true;
    world?.setInputEnabled(false);
    try {
      await dialogue(root, g, npc, (e) => {
        find('.hud').outerHTML = hud(g, rot);
        floatLuck(root, e.luckDelta);
      });
    } finally {
      if (!disposed) {
        modal = false;
        world?.setInputEnabled(true);
        options();
      }
    }
  }
  function openPen(refused = false) {
    if (!canWrite() || locked || modal) return;
    find('.play').classList.remove('collapsed');
    pen = true;
    world?.setInputEnabled(false);
    fateInput(
      actions,
      (text) => take({ fate: text }),
      () => {
        pen = false;
        world?.setInputEnabled(true);
        options();
      },
      refused,
    );
  }
  function options() {
    if (disposed || death) return;
    const marks = state().marks.slice(-3);
    actions.innerHTML =
      (n.question
        ? '<p class="question format-' +
          n.format +
          '">' +
          escape(n.question) +
          '</p>'
        : '') +
      '<div class="answers format-' +
      (n.format || 'choice-format') +
      '">' +
      n.choices
        .map(
          (c, i) =>
            '<button class="choice" data-choice="' +
            i +
            '" ' +
            (n.tried.includes(i) ? 'disabled' : '') +
            '><span>› ' +
            escape(c.text) +
            (map.areas[c.place] && !prologue
              ? ' <small>· ' + escape(map.areas[c.place].name) + '</small>'
              : '') +
            '</span><span aria-label="' +
            (c.insight ? 'insight' : c.risk) +
            '">' +
            (c.insight ? icon('key') : riskIcon(c.risk)) +
            '</span></button>',
        )
        .join('') +
      '</div>' +
      (canWrite()
        ? '<button class="pen">✒ Write your own fate <small>(once this act)</small></button>'
        : '') +
      (ctx.noworld && !prologue
        ? '<div class="people"><details><summary>People nearby</summary>' +
          buildings
            .filter((b) => visibleAreas().has(b.id))
            .flatMap((b) =>
              b.residents.map(
                (p) =>
                  '<button data-npc="' +
                  p.id +
                  '" ' +
                  (allowed(p) ? '' : 'disabled') +
                  '>Talk to ' +
                  escape(p.name) +
                  ' · ' +
                  escape(b.name) +
                  '</button>',
              ),
            )
            .join('') +
          '</details>' +
          (strangers.some((s) => !state().strangersMet.includes(s.id))
            ? '<small>On the way:</small>'
            : '') +
          strangers
            .filter((s) => !state().strangersMet.includes(s.id))
            .map(
              (s) =>
                '<button data-npc="' +
                s.id +
                '" ' +
                (allowed(s) ? '' : 'disabled') +
                '>' +
                escape(s.description) +
                ' Talk to them</button>',
            )
            .join('') +
          items()
            .filter((i) => visibleAreas().has(i.area))
            .map(
              (i) =>
                '<button data-item="' +
                escape(i.id) +
                '">You notice: ' +
                escape(i.name) +
                '. Take it</button>',
            )
            .join('') +
          (map.lockedArea &&
          visibleAreas().has(map.lockedArea) &&
          !roomOpened(g, n.act) &&
          state().keepsakes.some((i) => i.key && i.act === n.act)
            ? '<button data-unlock>Open ' +
              escape(map.areas[map.lockedArea].name) +
              '</button>'
            : '') +
          (roomOpened(g, n.act) && visibleAreas().has(map.lockedArea)
            ? '<small>' + escape(memory) + '</small>'
            : '') +
          '</div>'
        : '') +
      (marks.length
        ? '<small class="marks">In your book: ' +
          marks.map(escape).join(' · ') +
          '</small>'
        : '');
    actions
      .querySelectorAll('[data-choice]')
      .forEach((b) => (b.onclick = () => take(+b.dataset.choice)));
    if (actions.querySelector('.pen'))
      actions.querySelector('.pen').onclick = () => openPen();
    for (const b of actions.querySelectorAll('[data-npc]'))
      b.onclick = () => {
        const id = b.dataset.npc,
          s = strangers.find((s) => s.id === id);
        talk(
          s
            ? { ...s, name: id, role: s.description }
            : buildings.flatMap((b) => b.residents).find((p) => p.id === id),
        );
      };
    for (const b of actions.querySelectorAll('[data-item]'))
      b.onclick = () => {
        if (
          onEvent({
            type: 'keepsake',
            item: items().find((i) => i.id === b.dataset.item),
          })
        )
          options();
        else b.textContent = 'Your hands are full.';
      };
    const unlock = actions.querySelector('[data-unlock]');
    if (unlock)
      unlock.onclick = () => {
        onEvent({ type: 'unlock' });
        options();
      };
    world?.refresh?.();
  }
  async function take(index) {
    const fate = index?.fate,
      c = fate
        ? { text: fate, moral: 'neutral', mark: 'Wrote: ' + fate, flag: 'none' }
        : n.choices[index];
    if (!ready || locked || modal || death || !c || n.tried.includes(index))
      return;
    if (params.scenePreview) {
      ctx.show('treehouse');
      return;
    }
    find('.play').classList.remove('collapsed');
    locked = true;
    pen = false;
    world?.setInputEnabled(false);
    draw(true);
    const before = g.luck,
      nextChapter = n.chapter + 1,
      due = dueFor(state(), nextChapter);
    const result = choose(g, n.id, index).then((node) => {
      if (node.outcome === 'death') ensureLegacy(g);
      return node;
    });
    const delta = TUNING.morals[c.moral] || 0;
    floatLuck(root, delta);
    const transition = async () => {
      await consequence(actions, g, c, {
        fate,
        delta,
        before,
        forced: due.debt ? 'debt' : due.wish ? 'wish' : null,
      });
      if (
        [1, 5, 9].includes(nextChapter) &&
        !disposed &&
        (!fate || !(await result).refused)
      ) {
        await result;
        await actCard(root, actFor(nextChapter), currentWant(g));
      }
    };
    const [node] = await Promise.all([
      result,
      transition(),
      fate ? null : world?.walkOff(),
    ]);
    if (disposed) return;
    if (node.refused) {
      locked = false;
      draw(false);
      openPen(true);
      return;
    }
    if (fate) {
      actions.innerHTML =
        '<p>' +
        escape(node.moral[0].toUpperCase() + node.moral.slice(1)) +
        '. Luck ' +
        before +
        ' → ' +
        g.luck +
        '.</p>';
      floatLuck(root, g.luck - before);
      await pause(600);
    }
    ctx.show(node.outcome === 'death' ? 'death' : 'page');
  }
  async function finish() {
    ready = true;
    if (death) {
      await world?.playDeath();
      if (disposed) return;
      actions.innerHTML = '<h2>THE END</h2>';
      const l = await legacy;
      if (disposed) return;
      actions.innerHTML +=
        (l.regret
          ? "<small>The page you'd turn back to:</small><p>Chapter " +
            g.nodes[l.regret.node_id].chapter +
            '. ' +
            escape(l.regret.line) +
            '</p>'
          : '') + '<button class="primary">See what you left behind</button>';
      actions.querySelector('button').onclick = () => ctx.show('legacy');
      actions.querySelector('button').focus({ preventScroll: true });
      return;
    }
    if (n.outcome) {
      const stamp = document.createElement('b');
      stamp.className = 'stamp ' + n.outcome;
      stamp.textContent = n.outcome.toUpperCase();
      story.prepend(stamp);
    }
    options();
    if (params.talk) {
      const npc = buildings
        .flatMap((b) => b.residents)
        .find((npc) => npc.id === params.talk);
      if (npc) talk(npc);
    }
  }
  if (!ctx.noworld) {
    mount();
    if (!prologue && !death) {
      const tab = document.createElement('button');
      tab.className = 'subtitle';
      tab.textContent = n.question || 'Open page';
      tab.onclick = () => collapse(false);
      find('.play').append(tab);
    }
  }
  draw(false);
  typing = typeText(find('.narration'), n.narration, finish);
  if (params.talk || params.area) typing.finish();
  story.onclick = (e) => {
    if (!e.target.closest('button,input,summary')) typing.finish();
  };
  const off = bindInput((k) => {
      if (locked || modal || pen) return;
      if (world?.key?.(k)) return true;
      if ((k === 'q' || k === 'tab') && !ctx.noworld && !prologue && !death) {
        collapse(!find('.play').classList.contains('collapsed'));
        return true;
      }
      if ([' ', 'enter', 'e'].includes(k)) {
        if (!typing.finish()) {
          if (death) actions.querySelector('button')?.click();
          else world?.interact();
        }
        return true;
      }
      if (/^[1-5]$/.test(k)) {
        take(+k - 1);
        return true;
      }
    }),
    stop = startLeafFall(find('.play'), rot);
  return () => {
    disposed = true;
    typing.stop();
    off();
    stop();
    world?.destroy();
  };
}
