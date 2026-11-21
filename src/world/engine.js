// Owner: C
import { mountEra } from './era.js';
import { lighting } from './lighting.js';
import art from '../assets/treehouse-tree.svg?raw';
import { spriteFrames } from './sprites.js';
import { held } from './input.js';
import { group, post, rect } from './kit.js';
import { bitmap, icons } from '../pixel.js';
import { reduced } from '../rot.js';
export const heroArt = art.replace('th-art th-rot-0', 'th-art');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function mountWorld(container, spec, opts = {}) {
  if (spec.areas) return mountEra(container, spec, opts);
  const frames = spriteFrames(opts.age),
    calm = reduced();
  container.classList.add('world', spec.id);
  container.innerHTML =
    '<svg class="stage" viewBox="0 0 256 160" shape-rendering="crispEdges" aria-hidden="true">' +
    spec.layers.map((l) => '<g data-layer>' + l.svg + '</g>').join('') +
    '<g data-actors><g data-posts></g><g data-ghost class="ghost"></g><g data-player></g></g></svg><button class="near-label" hidden></button>';
  const find = (s) => container.querySelector(s),
    stage = find('.stage'),
    nearButton = find('.near-label'),
    layers = [...stage.querySelectorAll('[data-layer]')];
  const actor = find('[data-player]'),
    actors = find('[data-actors]'),
    shadow = find('[data-ghost]'),
    posts = find('[data-posts]');
  if (['treehouse', 'prologue'].includes(spec.id)) {
    const lamps =
      spec.id === 'prologue'
        ? [{ x: 188, y: 145, r: 60 }]
        : Array.from({ length: 4 - (spec.rot || 0) }, (_, i) => ({
            x: 48 + 108 * (i + (spec.rot || 0)),
            y: 68,
            r: 115,
          }));
    actors.insertAdjacentHTML(
      'beforeend',
      lighting(
        'room',
        spec.width,
        spec.height,
        [...lamps, { x: 0, y: 0, r: 16, player: true }],
        spec.rot,
      ),
    );
  }
  const aura = find('[data-aura]');
  const hero = find('[data-hero]');
  if (hero) {
    hero.innerHTML = heroArt;
    const svg = hero.querySelector('svg');
    svg.setAttribute('width', 120);
    svg.setAttribute('height', 152);
  }
  const scaleWorld = () => {
    const scale = Math.max(
      1,
      Math.floor(Math.min(innerWidth / 256, (innerHeight - 40) / 160)),
    );
    container.style.width = 256 * scale + 'px';
    container.style.height = 160 * scale + 'px';
    container.style.setProperty('--unit', scale + 'px');
  };
  scaleWorld();
  window.addEventListener('resize', scaleWorld);
  let x = spec.spawnX,
    cx = 0,
    cy = spec.camera.y,
    enabled = true,
    direction = 1,
    raf = 0,
    last = 0,
    near = null,
    items = [],
    exiting = false,
    stopped = false,
    ghost = opts.ghost,
    frameKey = '';
  let message = '',
    until = 0;
  function setInteractables(list) {
    items = list;
    posts.innerHTML = list
      .filter((i) => i.type === 'choice')
      .map(
        (i) =>
          '<g data-post="' +
          i.index +
          '">' +
          post(i.x) +
          group(
            i.x - 2,
            155,
            bitmap(
              icons[
                i.insight
                  ? 'key'
                  : { safe: 'leaf', bold: 'flame', wild: 'skull' }[i.risk]
              ],
              { '#': 'sign-icon' },
            ),
          ) +
          '</g>',
      )
      .join('');
    const ink = list.find((s) => s.type === 'ink');
    if (ink)
      posts.insertAdjacentHTML(
        'beforeend',
        group(
          ink.x - 4,
          176,
          rect(0, -6, 9, 6, 'th-b3') +
            rect(-1, -7, 11, 2, 'th-b4') +
            rect(2, -11, 4, 4, 'lt-fate') +
            rect(3, -12, 2, 1, 'th-star'),
        ),
      );
  }
  setInteractables(opts.interactables ?? [...spec.looks, ...spec.stations]);
  if (ghost) shadow.innerHTML = frames.idle[0];
  function interact() {
    if (!enabled || !near) return;
    if (near.text) {
      message = near.text;
      until = performance.now() + 3500;
    }
    opts.onInteract?.(near);
  }
  nearButton.onclick = interact;
  function tick(time) {
    if (stopped) return;
    const dt = Math.min(0.05, (time - (last || time)) / 1000);
    last = time;
    const dx = enabled
      ? Number(held('arrowright', 'd')) - Number(held('arrowleft', 'a'))
      : 0;
    if (dx) {
      direction = dx;
      x = clamp(x + dx * dt * 60, ...spec.walk);
    }
    if (exiting) {
      direction = 1;
      x += dt * 330;
    }
    const destX = clamp(x - 110, 0, spec.width - 256),
      destY =
        enabled && held('arrowup', 'w')
          ? spec.camera.lookUp
          : enabled && held('arrowdown', 's')
            ? spec.camera.lookDown
            : spec.camera.y;
    const ease = calm ? 1 : Math.min(1, dt * 7);
    cx += (destX - cx) * ease;
    cy += (destY - cy) * ease;
    const transform = (p) =>
      'translate(' +
      -Math.round(cx * (calm ? 1 : p)) +
      ' ' +
      -(
        Math.round(cy) +
        (spec.rot >= 2 && dx && x > 110 && x < 134 && !calm ? 1 : 0)
      ) +
      ')';
    layers.forEach((l, i) =>
      l.setAttribute('transform', transform(spec.layers[i].parallax)),
    );
    actors.setAttribute('transform', transform(1));
    actor.setAttribute(
      'transform',
      'translate(' +
        Math.round(x) +
        ' ' +
        spec.floorY +
        ') scale(' +
        direction +
        ' 1)',
    );
    aura?.setAttribute(
      'transform',
      'translate(' + Math.round(x) + ' ' + (spec.floorY - 6) + ')',
    );
    const moving = dx || exiting,
      frame = moving
        ? frames.walk[Math.floor(time / 125) % 4]
        : frames.idle[Math.floor(time / 600) % 2];
    if (frame !== frameKey) {
      actor.innerHTML = frame;
      frameKey = frame;
    }
    let nearest = null;
    if (enabled)
      for (const item of items)
        if (
          Math.abs(item.x - x) <= 10 &&
          (!nearest || Math.abs(item.x - x) < Math.abs(nearest.x - x))
        )
          nearest = item;
    if (ghost) {
      const gx = ghost.mirror ? spec.width - x : ghost.x;
      shadow.setAttribute(
        'transform',
        'translate(' +
          Math.round(gx) +
          ' ' +
          spec.floorY +
          ') scale(' +
          -direction +
          ' 1)',
      );
      if (Math.abs(x - gx) < 10) {
        message = '“' + ghost.memory + '”';
        until = time + 3500;
        shadow.innerHTML = '';
        ghost = null;
      }
    }
    if (near !== nearest) {
      near = nearest;
      opts.onNear?.(near);
      for (const sign of posts.children)
        sign.classList.toggle(
          'near-post',
          near?.type === 'choice' && Number(sign.dataset.post) === near.index,
        );
    }
    const label = enabled && (time < until ? message : near?.label);
    nearButton.hidden = !label;
    if (label) {
      nearButton.textContent = label;
      if (time < until && near?.legacyLine) {
        const line = document.createElement(near.erased ? 'del' : 'small');
        line.textContent = near.legacyLine;
        nearButton.append(document.createElement('br'), line);
      }
      nearButton.style.left =
        clamp((((near?.x ?? x) - cx) / 256) * 100, 12, 88) + '%';
      nearButton.style.top = ((spec.floorY - cy - 24) / 160) * 100 + '%';
    }
    raf = requestAnimationFrame(tick);
  }
  if (spec.season && !calm) {
    const season = document.createElement('div');
    season.className = 'particles ' + spec.season;
    for (let i = 0; i < 12; i++) {
      const bit = document.createElement('i');
      bit.style.left = ((i * 37) % 100) + '%';
      bit.style.animationDelay = -i * 0.73 + 's';
      season.append(bit);
    }
    container.append(season);
  }
  raf = requestAnimationFrame(tick);
  return {
    setInteractables,
    interact,
    setInputEnabled(v) {
      enabled = v;
    },
    async walkOff() {
      enabled = false;
      if (spec.id === 'prologue') {
        x = 188;
        container.classList.add('climbing');
      } else exiting = true;
      await wait(900);
    },
    async walkIn() {
      actor.animate(
        [
          {
            opacity: 0,
            translate: spec.id === 'treehouse' ? '0 8px' : '-8px 0',
          },
          { opacity: 1, translate: '0 0' },
        ],
        { duration: 400, easing: 'steps(4)' },
      );
      await wait(400);
    },
    async playDeath() {
      enabled = false;
      container.classList.add('dying');
      await wait(calm ? 100 : 1000);
    },
    async shake() {
      if (!calm)
        await stage.animate([{ translate: '-3px' }, { translate: '3px' }], {
          iterations: 4,
          duration: 80,
        }).finished;
    },
    destroy() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', scaleWorld);
      container.classList.remove(spec.id, 'climbing', 'dying');
      container.replaceChildren();
    },
  };
}
