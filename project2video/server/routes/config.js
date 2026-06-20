import { Hono } from 'hono';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const app = new Hono();

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const TEMPLATES_DIR = resolve(PROJECT_ROOT, 'templates');

// List available templates
app.get('/templates', (c) => {
  try {
    const dirs = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const manifestPath = join(TEMPLATES_DIR, d.name, 'manifest.json');
        if (!existsSync(manifestPath)) return null;
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          return {
            id: d.name,
            name: manifest.name || d.name,
            description: manifest.description || '',
            supports: manifest.supports || [],
            style: manifest.style || {},
          };
        } catch {
          return { id: d.name, name: d.name };
        }
      })
      .filter(Boolean);

    return c.json({ templates: dirs });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// List available TTS voices
app.get('/voices', (c) => {
  return c.json({
    provider: process.env.TTS_PROVIDER || 'mimo',
    voices: [
      { id: 'Chloe', name: 'Chloe', language: 'en' },
      { id: 'Mia', name: 'Mia', language: 'en' },
      { id: '冰糖', name: '冰糖', language: 'zh' },
      { id: '茉莉', name: '茉莉', language: 'zh' },
    ],
  });
});

export default app;
