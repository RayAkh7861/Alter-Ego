// OWNER: Person 1
// Prompt wording and request builders will be copied from the main report.
export const PAGE_SYSTEM_PROMPT = '';
export const EPITAPH_SYSTEM_PROMPT = '';

export function buildPageRequest(game, context = {}) {
  return { game, ...context };
}

export function buildEpitaphRequest(game) {
  return { game };
}
