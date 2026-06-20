import { Hono } from 'hono';
import { resolve, join, extname } from 'path';
import { readFileSync, existsSync, statSync, readdirSync } from 'fs';

const app = new Hono();

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'output');

// List generated projects (history)
app.get('/history', (c) => {
  if (!existsSync(OUTPUT_DIR)) {
    return c.json({ history: [] });
  }

  const entries = readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const projectDir = resolve(OUTPUT_DIR, d.name);
      const hasVideo = existsSync(resolve(projectDir, 'renders', `${d.name}.mp4`));
      const hasComposition = existsSync(resolve(projectDir, 'compositions', 'main.html'));

      // Check audio files
      const audioDir = resolve(projectDir, 'audio');
      let hasNarration = false;
      let hasBgm = false;
      if (existsSync(audioDir)) {
        try {
          const audioFiles = readdirSync(audioDir);
          hasNarration = audioFiles.some(f => f.startsWith('narration.'));
          hasBgm = audioFiles.some(f => f.startsWith('bgm.'));
        } catch {}
      }

      // Try to read template from intermediates
      let template = null;
      const strategyPath = resolve(projectDir, 'intermediates', '04-strategy.json');
      if (existsSync(strategyPath)) {
        try {
          const strategy = JSON.parse(readFileSync(strategyPath, 'utf-8'));
          template = strategy.template_recommendation || null;
        } catch {}
      }

      return {
        name: d.name,
        hasVideo,
        hasComposition,
        hasNarration,
        hasBgm,
        template,
        createdAt: statSync(projectDir).mtimeMs,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  return c.json({ history: entries });
});

// Get project detail with all intermediates
app.get('/projects/:name', (c) => {
  const name = c.req.param('name');
  const projectDir = resolve(OUTPUT_DIR, name);

  if (!existsSync(projectDir) || !statSync(projectDir).isDirectory()) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const safeReadJson = (relativePath) => {
    const fullPath = resolve(projectDir, relativePath);
    if (!existsSync(fullPath)) return null;
    try { return JSON.parse(readFileSync(fullPath, 'utf-8')); } catch { return null; }
  };

  const listFiles = (relativeDir) => {
    const fullPath = resolve(projectDir, relativeDir);
    if (!existsSync(fullPath) || !statSync(fullPath).isDirectory()) return [];
    return readdirSync(fullPath).filter(f => {
      try { return statSync(resolve(fullPath, f)).isFile(); } catch { return false; }
    });
  };

  const hasFile = (relativePath) => existsSync(resolve(projectDir, relativePath));

  // Read key intermediates
  const repoProfile = safeReadJson('intermediates/01-repo-profile.json');
  const featureDiscovery = safeReadJson('intermediates/02-feature-discovery.json');
  const capturePlan = safeReadJson('intermediates/02-capture-plan.json');
  const assetManifest = safeReadJson('intermediates/03-asset-manifest.json');
  const strategy = safeReadJson('intermediates/04-strategy.json');
  const story = safeReadJson('intermediates/05-story.json');
  const timeline = safeReadJson('intermediates/06-timeline.json');
  const composition = safeReadJson('intermediates/07-composition.json');
  const renderConfig = safeReadJson('intermediates/08-render-config.json');
  const review0 = safeReadJson('intermediates/09-review-0.json');
  const review1 = safeReadJson('intermediates/09-review-1.json');

  // List files in subdirectories
  const intermediates = listFiles('intermediates');
  const reviewFrames = listFiles('review-frames');
  const assetFiles = listFiles('assets');
  const audioFiles = listFiles('audio');

  return c.json({
    name,
    createdAt: statSync(projectDir).mtimeMs,
    template: strategy?.template_recommendation || null,
    hasVideo: hasFile(`renders/${name}.mp4`),
    hasComposition: hasFile('compositions/main.html'),
    hasNarration: audioFiles.some(f => f.startsWith('narration.')),
    hasBgm: audioFiles.some(f => f.startsWith('bgm.')),
    hasLlmLogs: hasFile('llm-logs.md'),
    // Summary data from key intermediates
    repoProfile: repoProfile ? {
      name: repoProfile.name,
      type: repoProfile.type,
      language: repoProfile.language,
      tech_stack: repoProfile.tech_stack?.map(t => t.name) || [],
      tagline: repoProfile.tagline,
    } : null,
    featureDiscovery: featureDiscovery ? {
      tagline: featureDiscovery.tagline,
      project_type: featureDiscovery.project_type,
      core_capabilities: featureDiscovery.core_capabilities?.length || 0,
    } : null,
    strategy: strategy ? {
      value_prop: strategy.value_prop,
      story_angle: strategy.story_angle,
      template_recommendation: strategy.template_recommendation,
    } : null,
    story: story ? {
      hook: story.hook,
      tone: story.tone,
      music_style: story.music_style,
      scenes: story.scenes?.map(s => ({
        purpose: s.purpose,
        narration: s.narration,
        duration: s.shots?.reduce((n, shot) => n + (shot.duration || 0), 0) || 0,
        shots: s.shots?.length || 0,
      })) || [],
    } : null,
    timeline: timeline ? {
      total_duration: timeline.total_duration,
      elements: timeline.elements?.length || 0,
    } : null,
    review: review0 ? {
      issues: review0.issues || [],
      hasCriticalIssues: review0.hasCriticalIssues || false,
    } : null,
    // File listings
    intermediates,
    reviewFrames,
    assetFiles,
    audioFiles,
  });
});

// Serve files from output/<project>/**
app.get('/assets/output/:project/*', (c) => {
  const project = c.req.param('project');
  const filePath = c.req.path.replace(`/api/assets/output/${project}/`, '');

  const fullPath = resolve(OUTPUT_DIR, project, filePath);

  // Security: ensure we stay within output directory
  if (!fullPath.startsWith(OUTPUT_DIR)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
    return c.json({ error: 'Not found' }, 404);
  }

  const ext = extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const body = readFileSync(fullPath);
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

export default app;
