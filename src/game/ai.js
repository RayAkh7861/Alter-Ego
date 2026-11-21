// OWNER: Person 1
import {fallbackPage, fallbackEpitaph} from './fallbacks.js';

async function post(path, payload) {
  const response = await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json();
}

export async function fetchPage(payload) {
  try {
    const page = await post('/api/page',payload);
    if (!page || typeof page.title !== 'string' || !Array.isArray(page.choices)) throw new Error('Invalid page');
    return page;
  } catch {
    return fallbackPage(payload.outcome);
  }
}

export async function fetchEpitaph(payload) {
  try {
    const result = await post('/api/epitaph',payload);
    if (typeof result?.epitaph !== 'string' || typeof result?.verdict !== 'string') throw new Error('Invalid epitaph');
    return result;
  } catch {
    return fallbackEpitaph(payload);
  }
}
