// Owner: C
import { startTalk, finishTalk, finishEncounter } from '../state.js';
import { STRANGERS } from '../world/strangers.js';
import { flagLines } from './consequence.js';
import { typeText, escape } from '../screens/common.js';
export async function dialogue(root, g, npc, updated) {
  const dialog = document.createElement('dialog');
  dialog.className = 'page-card dialogue';
  dialog.innerHTML =
    '<small>' +
    escape(npc.name) +
    ' · ' +
    escape(npc.role) +
    '</small><p class="line">…</p><div class="replies"></div>';
  root.append(dialog);
  dialog.showModal();
  let exchange,
    typing,
    answered = false,
    cancelled = false,
    done;
  const closed = new Promise((r) => (done = r));
  const leave = () => {
    typing?.stop();
    dialog.close();
    dialog.remove();
    done();
  };
  dialog.oncancel = (e) => {
    e.preventDefault();
    if (answered) leave();
    else if (exchange) answer(null);
    else cancelled = true;
  };
  const replies = dialog.querySelector('.replies');
  function answer(i) {
    if (answered) return;
    answered = true;
    typing?.stop();
    const event = (STRANGERS[npc.id] ? finishEncounter : finishTalk)(
        g,
        npc.id,
        exchange,
        i,
      ),
      reply = exchange.replies[i];
    updated(event);
    const toast = {
      flag: flagLines[event.flag],
      bond_up: npc.name + ' will remember this.',
      bond_down: npc.name + ' will remember this.',
      blessing: 'Something is on your side.',
      omen: 'Something is set in motion.',
      bargain: "A bargain. He'll come for it.",
      insight: 'A new path: ' + (event.insight?.text || ''),
    };
    dialog.querySelector('.line').textContent =
      reply?.response || 'You say nothing.';
    replies.innerHTML =
      '<p class="' +
      event.effect +
      '">' +
      escape(toast[event.effect] || '') +
      '</p><button>Continue</button>';
    replies.lastChild.onclick = leave;
    replies.lastChild.focus();
  }
  function options() {
    replies.innerHTML =
      exchange.replies
        .map((r) => '<button class="choice">› ' + escape(r.text) + '</button>')
        .join('') + '<button class="secondary">Say nothing</button>';
    [...replies.children].forEach(
      (b, i) =>
        (b.onclick = () => answer(i === exchange.replies.length ? null : i)),
    );
  }
  dialog.onkeydown = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') return;
    if (answered && !['Tab', 'Shift'].includes(e.key)) {
      e.preventDefault();
      leave();
    } else if (exchange && !answered) {
      if (/^[1-6]$/.test(e.key) && exchange.replies[+e.key - 1]) {
        e.preventDefault();
        answer(+e.key - 1);
      } else if (
        ['Enter', ' '].includes(e.key) &&
        e.target.tagName !== 'BUTTON'
      ) {
        e.preventDefault();
        typing?.finish();
      }
    }
  };
  try {
    exchange = await startTalk(g, npc.id);
    if (!dialog.isConnected) return;
    if (cancelled) answer(null);
    else
      typing = typeText(dialog.querySelector('.line'), exchange.line, options);
    await closed;
  } catch (e) {
    leave();
    throw e;
  }
}
