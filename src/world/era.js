import { held } from './input.js';
import { spriteFrames, npcSprite } from './sprites.js';
import { lighting, vignette } from './lighting.js';
import { fixtures } from './areaArt.js';
import { pathBetween } from './maps.js';
import { regretSees } from './regrets.js';
import { openMapOverlay } from '../components/mapView.js';
import { escape } from '../screens/common.js';
import { hash, bitmap, icons } from '../pixel.js';
const clamp = (x, min, max) => Math.max(min, Math.min(x, max));
const at = (x, y, svg) =>
  '<g transform="translate(' +
  Math.round(x) +
  ' ' +
  Math.round(y) +
  ')">' +
  svg +
  '</g>';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const candle =
  '<path d="M-2 -8h4v8h-4z" fill="#cdbf9e"/><path d="M0 -13l2 4 -2 2 -1 -2z" fill="#fff0c0"/>';
export function mountEra(container, map, o) {
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches,
    frames = spriteFrames(o.age);
  const visited = new Set(),
    lit = new Set(),
    gone = new Set();
  const haunted = Object.keys(map.areas)
    .filter((id) => id !== 'office_floor')
    .sort((a, b) => hash(o.seed + a) - hash(o.seed + b))
    .slice(0, Math.max(0, o.rot - 1));
  let area,
    x,
    y,
    entrance,
    direction = 1,
    enabled = true,
    hidden = false,
    travel = false,
    stopped = false,
    climb = null,
    near = null,
    raf,
    last = 0,
    cameraX = 0,
    cameraY = 0,
    notice = '',
    until = 0,
    actors = [],
    hunter,
    items = [],
    overlay,
    ghostSeen = false;
  container.classList.add('world', 'era');
  container.innerHTML =
    '<svg class="stage" viewBox="0 0 256 160" shape-rendering="crispEdges"><g data-view></g><g pointer-events="none">' +
    vignette() +
    '</g></svg><button class="near-label" hidden></button><span class="area-name"></span><div class="routes"></div>';
  const find = (s) => container.querySelector(s),
    view = find('[data-view]'),
    label = find('.near-label'),
    routes = find('.routes');
  function resize() {
    const scale = Math.max(
      1,
      Math.floor(Math.min(innerWidth / 256, (innerHeight - 40) / 160)),
    );
    container.style.width = scale * 256 + 'px';
    container.style.height = scale * 160 + 'px';
  }
  resize();
  window.addEventListener('resize', resize);
  function say(text, ms = 2200) {
    notice = text;
    until = performance.now() + ms;
  }
  function loadArea(id, spawn, level) {
    area = map.areas[id] || map.areas[map.start];
    visited.add(area.id);
    entrance = spawn ?? 24;
    x = entrance;
    y = level ?? area.floorY;
    hidden = false;
    climb = null;
    near = null;
    container.dataset.area = area.id;
    find('.area-name').textContent = area.name;
    actors = o.strangers
      .filter((s) => s.area === id && !gone.has(s.id))
      .map((s) => ({ ...s, origin: s.x }));
    const supervisor = id === 'office_floor';
    hunter =
      !o.gentle && (supervisor || haunted.includes(id))
        ? {
            x: 208,
            direction: -1,
            chase: false,
            lost: 0,
            pause: 0,
            supervisor,
            noticed: new Set(),
          }
        : null;
    refresh();
    cameraX = clamp(x - 110, 0, area.width - 256);
    cameraY = clamp(y - 128, 0, area.height - 160);
  }
  function refresh() {
    const floor = area.floorY,
      vertical = area.kind === 'vertical';
    const upper = vertical ? floor - 192 : floor;
    const doors = area.doors.map((d) => ({
      ...d,
      type: 'door',
      y: floor,
      label:
        '↑ ' + map.areas[d.to].name + (d.locked && !o.opened() ? ' · 🔒' : ''),
    }));
    const climbs = area.climbs.map((d) => ({
      ...d,
      y: upper,
      type: 'climb',
      label:
        (d.dir === 'up' ? '↑ ' : '↓ ') +
        map.areas[d.to].name +
        (d.locked && !o.opened() ? ' · 🔒' : ''),
    }));
    for (const link of area.landings)
      climbs.push(
        { ...link, type: 'landing', dir: 'up', label: '↑ Next landing' },
        {
          x: link.toX,
          y: link.toY,
          toX: link.x,
          toY: link.y,
          kind: link.kind,
          type: 'landing',
          dir: 'down',
          label: '↓ Lower landing',
        },
      );
    const revealed = (x) =>
      !area.lights.some(
        (l) => l.toggle && !lit.has(area.id + l.x) && Math.abs(l.x - x) < l.r,
      );
    items = [
      ...doors,
      ...climbs,
      ...o.choices().flatMap((c, i) =>
        c.place === area.id
          ? [
              {
                type: 'choice',
                index: i,
                x: area.markerSlots[0],
                label: c.text,
                c,
              },
            ]
          : [],
      ),
      ...o.residents(area.id).map((npc, i) => ({
        type: 'npc',
        npc,
        x: 93 + i * 52,
        label: 'Talk to ' + npc.name,
      })),
      ...o
        .items()
        .filter((item) => item.area === area.id && revealed(item.x))
        .map((item) => ({
          type: 'item',
          item,
          x: item.x,
          label: 'Take the ' + item.name,
        })),
      ...area.hides.map((h) => ({
        ...h,
        type: 'hide',
        x: h.x + h.w / 2,
        label: '↓ ' + h.label,
      })),
      ...area.looks
        .filter((l) => revealed(l.x))
        .map((l) => ({ ...l, type: 'look', label: 'Read' })),
      ...area.lights
        .filter((l) => l.toggle && !lit.has(area.id + l.x))
        .map((l) => ({ type: 'lamp', x: l.x, label: 'Light the lamp' })),
    ];
    if (area.id === o.startArea && o.canWrite?.())
      items.push({ type: 'ink', x: 183, label: 'Write your own fate' });
    if (o.opened() && map.lockedArea === area.id)
      items.push({ type: 'look', x: 106, label: 'A memory', text: o.memory });
    const lamps = area.lights.map((l) => ({
      ...l,
      lit: l.lit || lit.has(area.id + l.x),
    }));
    const scene = items
      .map((i) =>
        at(
          i.x,
          i.y ?? floor,
          i.type === 'choice'
            ? '<text x="0" y="-21" text-anchor="middle" fill="#cdbf9e" font-size="4">' +
                escape(i.c.text.split(' ').slice(0, 4).join(' ')) +
                (i.c.text.split(' ').length > 4 ? '…' : '') +
                '</text>' +
                candle +
                at(
                  4,
                  -8,
                  bitmap(
                    icons[
                      i.c.insight
                        ? 'key'
                        : { safe: 'leaf', bold: 'flame', wild: 'skull' }[
                            i.c.risk
                          ]
                    ],
                    { '#': 'sign-icon' },
                  ),
                )
            : i.type === 'ink'
              ? '<path d="M-3 -5h6v5h-6zM1 -5l5 -7h2l-5 7z" fill="#b9ad94"/>'
              : i.type === 'npc'
                ? npcSprite(i.npc, map.act, o.chapter)
                : i.type === 'item'
                  ? '<path d="M0 -5l2 2 3 1 -3 1 -2 2 -1 -2 -3 -1 3 -1z" fill="#fff0c0"/>'
                  : i.type === 'landing'
                    ? '<path d="M-2 -5h6v2h-6z" fill="#e7b25a"/>'
                    : '',
        ),
      )
      .join('');
    const glow = [
      ...lamps,
      ...items
        .filter((i) => i.type === 'choice')
        .map((i) => ({ x: i.x, y: floor - 10, r: 33 })),
      { x: 0, y: 0, r: 16, player: true },
      ...(hunter ? [{ x: 0, y: 0, r: 64, hunter: true }] : []),
    ];
    view.innerHTML =
      area.layers[0].svg +
      fixtures({ ...area, lights: lamps }) +
      scene +
      '<g data-strangers>' +
      actors
        .map(
          (a) =>
            '<g data-person="' +
            a.id +
            '">' +
            npcSprite(a, map.act, o.chapter) +
            '</g>',
        )
        .join('') +
      '</g><g data-hunter>' +
      (hunter
        ? npcSprite(
            { id: hunter.supervisor ? 'crane' : 'caller' },
            map.act,
            o.chapter,
          ) +
          at(5, -18, candle) +
          '<text class="alarm" x="0" y="-41">!</text>'
        : '') +
      '</g><g data-ghost>' +
      (!ghostSeen && o.rot === 1 ? frames.idle[0] : '') +
      '</g><g data-player></g><g data-foreground>' +
      area.layers.at(-1).svg +
      '</g>' +
      lighting('era', area.width, area.height, glow, o.rot, map.weather);
  }
  function updateRoutes() {
    routes.innerHTML = o
      .choices()
      .map((c, i) => {
        const next = pathBetween(map, area.id, c.place)?.[1],
          edge = [...area.exits, ...area.doors, ...area.climbs].find(
            (d) => d.to === next,
          ),
          target =
            edge?.x ??
            (edge?.side === 'left'
              ? 0
              : edge?.side === 'right'
                ? area.width
                : area.markerSlots[0]);
        return (
          '<span>' +
          (edge && !edge.side && Math.abs(target - x) < 10
            ? edge.dir === 'down'
              ? '↓'
              : '↑'
            : target < x
              ? '←'
              : '→') +
          ' ' +
          (i + 1) +
          ' · ' +
          escape(map.areas[next || area.id].name) +
          '</span>'
        );
      })
      .join('');
  }
  async function passage(d) {
    if (travel) return;
    if (
      area.crawl &&
      Math.abs(d.x - (area.crawl.x + area.crawl.w / 2)) <= 8 &&
      !held('s', 'arrowdown')
    ) {
      say('Crouch beneath the beam.');
      return;
    }
    if (d.locked && !o.opened() && !o.onEvent({ type: 'unlock' })) {
      say('Locked.');
      return;
    }
    travel = true;
    if (d.type === 'door')
      find('[data-door="' + d.to + '"]')?.classList.add('creak');
    if (d.dir) {
      const sign = d.dir === 'up' ? -1 : 1,
        span = d.type === 'landing' ? 96 : 24;
      climb = {
        x,
        y,
        sign,
        span,
        elapsed: 0,
        diagonal: d.kind === 'stairs',
        done: null,
      };
      await new Promise((resolve) => (climb.done = resolve));
      if (stopped) return;
      if (d.type === 'landing') {
        travel = false;
        return;
      }
    }
    if (d.side)
      container.style.setProperty(
        '--wipe-direction',
        d.side === 'left' ? '100%' : '-100%',
      );
    container.classList.add(d.side ? 'edge-wipe' : 'passing');
    await wait(calm ? 0 : d.side ? 250 : 200);
    if (stopped) return;
    const target = map.areas[d.to];
    loadArea(
      d.to,
      d.toX,
      target.kind === 'vertical' && d.dir ? target.floorY - 192 : target.floorY,
    );
    container.classList.remove('edge-wipe', 'passing');
    travel = false;
  }
  function interact(i = near) {
    if (!enabled || travel) return;
    if (hidden) {
      hidden = false;
      return;
    }
    if (!i) return;
    if (['climb', 'landing', 'door'].includes(i.type)) {
      passage(i);
      return;
    }
    if (i.type === 'ink') o.onPen();
    if (i.type === 'choice') o.onChoose(i.index);
    if (i.type === 'hide') hidden = true;
    if (i.type === 'look') say(i.text);
    if (i.type === 'item') {
      if (o.onEvent({ type: 'keepsake', item: i.item })) refresh();
      else say('Your hands are full.');
    }
    if (i.type === 'lamp') {
      lit.add(area.id + i.x);
      refresh();
      say('The wick catches.');
    }
    if (i.type === 'npc' || i.type === 'stranger') {
      if (!o.canTalk(i.npc)) {
        say('They look straight through you.');
        if (i.type === 'stranger') {
          gone.add(i.npc.id);
          actors = actors.filter((s) => s.id !== i.npc.id);
          refresh();
        }
        return;
      }
      if (i.type === 'stranger') {
        gone.add(i.npc.id);
        actors = actors.filter((s) => s.id !== i.npc.id);
        container.classList.add('encounter');
      }
      o.onTalk(i.npc).finally(() => {
        if (!stopped) {
          container.classList.remove('encounter');
          refresh();
        }
      });
    }
  }
  async function caught() {
    travel = true;
    o.onEvent({ type: 'caught' });
    const cut = document.createElement('div');
    cut.className = 'caught-memory';
    cut.textContent = hunter.supervisor
      ? "You're late. You're always late."
      : o.memory;
    container.append(cut);
    await wait(1500);
    cut.remove();
    if (stopped) return;
    loadArea(area.id, entrance);
    travel = false;
  }
  function tick(t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    const active = enabled && !travel && !hidden,
      dx = active ? +held('arrowright', 'd') - +held('arrowleft', 'a') : 0,
      crouching = held('arrowdown', 's'),
      running = !crouching && held('shift') && !!dx;
    if (dx) {
      direction = dx;
      let nx = clamp(
        x + dx * dt * (crouching ? 24 : running ? 96 : 48),
        ...area.walk,
      );
      const beam = area.crawl;
      if (beam && !crouching && nx >= beam.x && nx <= beam.x + beam.w) {
        nx = x;
        say('Crouch beneath the beam.', 500);
      }
      x = nx;
      o.onMove();
      const exit = area.exits.find((e) =>
        e.side === 'left'
          ? x === area.walk[0] && dx < 0
          : x === area.walk[1] && dx > 0,
      );
      if (exit) passage(exit);
    }
    if (climb) {
      const c = climb;
      c.elapsed += dt * 32;
      const step = Math.min(c.span, c.elapsed);
      y = c.y + c.sign * step;
      x = c.x + (c.diagonal ? -c.sign * Math.floor(step / 6) * 1.5 : 0);
      if (step === c.span) {
        climb = null;
        c.done();
      }
    }
    const pos = (el, px, py, sx = 1, sy = 1) =>
      el?.setAttribute(
        'transform',
        'translate(' +
          Math.round(px) +
          ' ' +
          Math.round(py) +
          ') scale(' +
          sx +
          ' ' +
          sy +
          ')',
      );
    const mode =
        hunter?.chase && hunter.lost === 0 && Math.abs(x - hunter.x) < 8
          ? 'startle'
          : climb
            ? 'climb'
            : hidden
              ? 'hide'
              : crouching
                ? dx
                  ? 'crouchWalk'
                  : 'crouch'
                : running
                  ? 'run'
                  : dx
                    ? 'walk'
                    : 'idle',
      anim = frames[mode],
      player = find('[data-player]');
    const index = Math.floor(t / (mode === 'idle' ? 600 : 125)) % anim.length;
    if (player.dataset.frame !== mode + index) {
      player.innerHTML = anim[index];
      player.dataset.frame = mode + index;
    }
    pos(player, x, y, direction, crouching || hidden ? 0.7 : 1);
    player.style.opacity = hidden ? 0.5 : 1;
    pos(find('[data-aura]'), x, y - 6);
    const follow = clamp(
        y - 128 + (held('arrowup', 'w') ? -14 : crouching ? 8 : 0),
        0,
        area.height - 160,
      ),
      ease = calm ? 1 : Math.min(1, dt * 8);
    cameraX += (clamp(x - 110, 0, area.width - 256) - cameraX) * ease;
    cameraY += (follow - cameraY) * ease;
    pos(view, -cameraX, -cameraY);
    pos(find('[data-foreground]'), calm ? 0 : -cameraX * 0.35, 0);
    const interactables = [...items];
    for (const a of actors) {
      const dist = x - a.x;
      if (
        enabled &&
        !travel &&
        o.ready() &&
        !hidden &&
        Math.abs(y - area.floorY) < 12 &&
        Math.abs(dist) <= 40
      )
        a.x += Math.sign(dist) * Math.min(Math.abs(dist), 30 * dt);
      else a.x += Math.sign(a.origin + Math.sin(t / 1400) * 5 - a.x) * dt * 3;
      pos(
        find('[data-person="' + a.id + '"]'),
        a.x,
        area.floorY,
        dist < 0 ? -1 : 1,
      );
      const i = {
        type: 'stranger',
        npc: { ...a, name: a.id, role: a.description },
        x: a.x,
        label: a.description,
      };
      interactables.push(i);
      if (
        enabled &&
        !travel &&
        !hidden &&
        o.ready() &&
        Math.abs(dist) < 8 &&
        Math.abs(y - area.floorY) < 12
      )
        interact(i);
    }
    if (hunter) {
      const h = hunter;
      if (enabled && !travel && o.ready()) {
        const sees = regretSees(h, {
          x,
          hidden: hidden || Math.abs(y - area.floorY) > 15,
          crouching,
          running,
        });
        if (sees) {
          h.chase = true;
          h.lost = 0;
        } else if ((h.lost += dt) > 1.5) h.chase = false;
        if (h.chase) {
          h.direction = Math.sign(x - h.x) || 1;
          h.x += h.direction * (h.supervisor ? 64 : 80) * dt;
          if (
            !hidden &&
            Math.abs(x - h.x) < 6 &&
            Math.abs(y - area.floorY) < 12
          )
            caught();
        } else if (h.pause > 0) h.pause -= dt;
        else {
          for (const l of area.lights)
            if (
              lit.has(area.id + l.x) &&
              !h.noticed.has(l.x) &&
              Math.abs(l.x - h.x) < 64
            ) {
              h.direction = Math.sign(l.x - h.x) || 1;
              h.noticed.add(l.x);
            }
          h.x += h.direction * (h.supervisor ? 16 : 20) * dt;
          if (h.x < 52 || h.x > 258) {
            h.x = clamp(h.x, 52, 258);
            h.direction *= -1;
            h.pause = 1;
          }
        }
      }
      pos(find('[data-hunter]'), h.x, area.floorY, h.direction);
      find('[data-hunter]').classList.toggle('chasing', h.chase);
      pos(find('[data-cone]'), h.x, area.floorY - 16, h.direction);
    }
    if (!ghostSeen && o.rot === 1) {
      pos(find('[data-ghost]'), 226, area.floorY);
      if (Math.abs(x - 226) < 10) {
        ghostSeen = true;
        say(o.memory);
        find('[data-ghost]').replaceChildren();
      }
    }
    const reachable = interactables
      .filter(
        (i) =>
          Math.abs((i.y ?? area.floorY) - y) < 8 && Math.abs(i.x - x) <= 11,
      )
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
    near = reachable[0];
    nearbyVertical = reachable;
    const hint =
      enabled &&
      !travel &&
      (t < until ? notice : hidden ? 'Hidden · move to come out' : near?.label);
    label.hidden = !hint;
    if (hint) {
      label.textContent = hint;
      label.style.left = clamp(((x - cameraX) / 256) * 100, 15, 85) + '%';
      label.style.top = clamp(((y - cameraY - 25) / 160) * 100, 20, 85) + '%';
    }
    const routeKey =
      area.id + ':' + Math.floor(x / 6) + ':' + o.choices().length;
    if (routes.dataset.at !== routeKey) {
      updateRoutes();
      routes.dataset.at = routeKey;
    }
    raf = requestAnimationFrame(tick);
  }
  let nearbyVertical = [];
  function key(k) {
    if (!enabled || travel) return false;
    if (
      hidden &&
      [
        'a',
        'd',
        's',
        'w',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
      ].includes(k)
    ) {
      hidden = false;
      return true;
    }
    const up = ['w', 'arrowup'].includes(k),
      down = ['s', 'arrowdown'].includes(k);
    if (up || down) {
      const i = nearbyVertical.find(
        (i) =>
          i.dir === (up ? 'up' : 'down') ||
          (up && ['door', 'choice'].includes(i.type)) ||
          (down && i.type === 'hide'),
      );
      if (i) {
        interact(i);
        return true;
      }
    }
    if (k === 'm') {
      enabled = false;
      overlay = openMapOverlay(container, map, {
        area: area.id,
        visited,
        choices: o.choices(),
        people: o.met(),
        onClose: () => {
          enabled = true;
        },
      });
      return true;
    }
    return false;
  }
  loadArea(o.startArea);
  label.onclick = () => interact();
  raf = requestAnimationFrame(tick);
  return {
    interact,
    refresh,
    key,
    setInputEnabled: (v) => (enabled = v),
    walkOff: () => wait(200),
    playDeath: () => wait(300),
    destroy() {
      stopped = true;
      climb?.done?.();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      overlay?.close();
      container.replaceChildren();
      container.classList.remove('era');
    },
  };
}
