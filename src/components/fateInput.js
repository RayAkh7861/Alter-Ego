// Owner: C
import { screenFate } from '../validate.js';
export function fateInput(el, onWrite, onCancel, refused = false) {
  el.innerHTML =
    '<form><label for="fate">Write your own fate</label><input id="fate" maxlength="60" placeholder="What happens next?" autocomplete="off"><small>It will come true. Everything does, eventually.</small><p role="status"></p><button class="primary">Write it</button><button class="secondary" type="button">Cancel</button></form>';
  const input = el.querySelector('input'),
    status = el.querySelector('[role=status]');
  if (refused) status.textContent = "The page won't take that ink.";
  input.focus();
  el.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const value = input.value.trim(),
      result = screenFate(value);
    if (!result.ok) {
      status.textContent = "The page won't take that ink.";
      if (result.selfHarm) {
        const note = document.createElement('small');
        note.textContent =
          "If that's about you and not the story, you can talk to someone now: findahelpline.com";
        status.append(document.createElement('br'), note);
      }
      return;
    }
    onWrite(value);
  };
  input.onkeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };
  el.querySelector('.secondary').onclick = onCancel;
}
