// OWNER: Person 1
export async function fetchPage(request) {
  const response = await fetch('/api/page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Unable to generate a page.');
  return response.json();
}

export async function fetchEpitaph(request) {
  const response = await fetch('/api/epitaph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('Unable to generate an epitaph.');
  return response.json();
}
