import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import pipelineRoutes from './routes/pipeline.js';
import assetRoutes from './routes/assets.js';
import configRoutes from './routes/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env'), override: true });

const app = new Hono();

// CORS for development
app.use('/api/*', cors());

// API routes
app.route('/api', pipelineRoutes);
app.route('/api', assetRoutes);
app.route('/api', configRoutes);

// Serve Vite build output
const webDist = resolve(__dirname, '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use('/*', serveStatic({ root: webDist }));
}

const PORT = process.env.PORT || 3000;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`\n  Project2Video Server`);
  console.log(`  http://localhost:${info.port}\n`);
});
