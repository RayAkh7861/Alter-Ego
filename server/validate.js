// OWNER: Person 1
export function cleanJson(value) {
  return String(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

export function validatePage(page) {
  return page;
}

export function validateEpitaph(epitaph) {
  return epitaph;
}
