const BASE = '/api';

export async function fetchTemplates() {
  const res = await fetch(`${BASE}/templates`);
  const data = await res.json();
  return data.templates;
}

export async function fetchVoices() {
  const res = await fetch(`${BASE}/voices`);
  return res.json();
}

export async function startGeneration(options) {
  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${BASE}/history`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.history || [];
}

export async function fetchProjectDetail(name) {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  return res.json();
}
