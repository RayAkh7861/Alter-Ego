// Owner: C
const keys = new Set();
let route = () => false,
  active = false,
  installed = false;
export const held = (...names) => names.some((k) => keys.has(k));
export function bindInput(fn) {
  route = fn;
  active = true;
  keys.clear();
  if (!installed) {
    installed = true;
    window.addEventListener('keydown', (e) => {
      if (
        !active ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.matches('input,textarea,[contenteditable=true]')
      )
        return;
      const k = e.key.toLowerCase();
      if ((k === ' ' || k === 'enter') && e.target.closest('button')) return;
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
      keys.add(k);
      if (!e.repeat && route(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());
  }
  return () => {
    if (route === fn) {
      active = false;
      keys.clear();
    }
  };
}
