// OWNER: Person 1
export function cleanJson(value) {
  return String(value).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
}

export function validatePage(raw, outcome) {
  const page = typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw;
  if (!page || typeof page !== 'object') throw new Error('Page must be an object');
  for (const key of ['title','narration','summary_line']) {
    if (typeof page[key] !== 'string' || !page[key].trim()) throw new Error(`Invalid page ${key}`);
  }
  if (!Array.isArray(page.choices) || (outcome === 'death' ? page.choices.length !== 0 : page.choices.length < 2 || page.choices.length > 3)) throw new Error('Invalid choice count');
  return {title:page.title.trim(),narration:page.narration.trim().slice(0,400),summary_line:page.summary_line.trim(),
    choices:page.choices.map(choice => {
      if (typeof choice?.text !== 'string' || !choice.text.trim()) throw new Error('Invalid choice text');
      return {text:choice.text.trim(),risk:['safe','bold','wild'].includes(choice.risk) ? choice.risk : 'bold'};
    })};
}

export function validateEpitaph(raw) {
  const result = typeof raw === 'string' ? JSON.parse(cleanJson(raw)) : raw;
  if (typeof result?.epitaph !== 'string' || !result.epitaph.trim() || typeof result?.verdict !== 'string' || !result.verdict.trim()) throw new Error('Invalid epitaph');
  return {epitaph:result.epitaph.trim(),verdict:result.verdict.trim()};
}
