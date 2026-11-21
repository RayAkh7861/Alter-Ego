// Owner: B
export const reduced = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
export function setRot(el, level) {
  el.classList.remove('th-rot-0', 'th-rot-1', 'th-rot-2', 'th-rot-3');
  el.classList.add('th-rot-' + level);
}
export function startLeafFall(container, level) {
  if (!level || reduced()) return () => {};
  const leaves = new Set(),
    timer = setInterval(() => {
      if (leaves.size >= 6) return;
      const leaf = document.createElement('i');
      leaf.className = 'fall-leaf';
      leaf.style.left = Math.floor(Math.random() * 96) + '%';
      leaf.style.background = ['', '#d6c64a', '#b57a35', '#4a3f2c'][level];
      leaves.add(leaf);
      container.append(leaf);
      leaf.onanimationend = () => {
        leaf.remove();
        leaves.delete(leaf);
      };
    }, [0, 4000, 2500, 1200][level]);
  return () => {
    clearInterval(timer);
    for (const leaf of leaves) leaf.remove();
  };
}
export async function playCrumble(el) {
  if (reduced()) {
    await el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 300,
      fill: 'forwards',
    }).finished;
    return;
  }
  await el.animate(
    [{ translate: '-3px' }, { translate: '3px' }, { translate: '0px' }],
    { duration: 80, iterations: 5, easing: 'steps(2)' },
  ).finished;
  const parts = [...el.querySelectorAll('.lt-seg')].sort(
    (a, b) => b.dataset.chapter - a.dataset.chapter,
  );
  parts.forEach((p, i) =>
    p.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(32px) rotate(8deg)', opacity: 0 },
      ],
      { delay: i * 40, duration: 800, fill: 'forwards', easing: 'steps(10)' },
    ),
  );
  const ns = 'http://www.w3.org/2000/svg',
    bounds = el.getBBox();
  for (let i = 0; i < 12; i++) {
    const dust = document.createElementNS(ns, 'rect');
    for (const [k, v] of Object.entries({
      x: Math.round(bounds.x + bounds.width / 2),
      y: Math.floor(bounds.y + bounds.height) - 2,
      width: 2,
      height: 2,
      fill: '#86592e',
    }))
      dust.setAttribute(k, v);
    el.append(dust);
    dust.animate(
      [
        { opacity: 1 },
        { transform: 'translate(' + (i - 6) * 3 + 'px,-8px)', opacity: 0 },
      ],
      { duration: 700, delay: 400, fill: 'both', easing: 'steps(5)' },
    );
  }
  await new Promise((r) => setTimeout(r, 2100));
}
