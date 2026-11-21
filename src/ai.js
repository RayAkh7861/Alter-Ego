// Owner: A
import {
  validatePage,
  validateEpitaph,
  validateTalk,
  validateLegacy,
} from './validate.js';
import {
  fallbackPage,
  fallbackEpitaph,
  fallbackTalk,
  fallbackLegacy,
} from './fallbacks.js';
import { formatFor } from './rules.js';
export async function transport(route, payload) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw Error('Unavailable');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
async function request(route, payload, validate, fallback) {
  try {
    const raw = await transport(route, payload),
      result = validate(raw);
    if (result.ok && (!result.page.fate_refused || payload.fate_text))
      return { ...result.page, fallback: !!raw.fallback };
  } catch {}
  if (import.meta.env?.DEV) console.info('Using a fallback page');
  return fallback();
}
export const fetchPage = (p) =>
  request(
    '/api/page',
    p,
    (o) =>
      validatePage(o, {
        outcome: p.outcome,
        ladder: formatFor(p.chapter),
        nearby_areas: p.nearby_areas,
        startArea: p.current_area?.id,
      }),
    () => fallbackPage(p.outcome, p),
  );
export const fetchEpitaph = (p) =>
  request('/api/epitaph', p, validateEpitaph, () => fallbackEpitaph(p));
export const fetchTalk = (p) =>
  request(
    '/api/talk',
    p,
    (o) =>
      validateTalk(o, {
        allowedEffects: p.allowed_effects,
        kind: p.kind,
        allowedFlags: p.stranger?.allowed_flags,
      }),
    () => fallbackTalk(p.npc.id, p),
  );
export const fetchLegacy = (p) =>
  request(
    '/api/legacy',
    p,
    (o) =>
      validateLegacy(o, {
        people: p.people,
        buildings: p.buildings,
        candidates: p.regret_candidates,
      }),
    () => fallbackLegacy(p),
  );
