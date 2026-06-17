import { resolve, join } from 'path';

export const CONFIG = {
  // Supported project types
  PROJECT_TYPES: ['game', 'web-app', 'library', 'cli', 'api', 'unknown'],

  // Asset scoring weights
  ASSET_SCORES: {
    hero_image: 25,
    demo_video: 30,
    detail_shots: 15,
    cta_asset: 10,
    custom_bgm: 10,
    logo: 10,
  },

  // DSL element types
  DSL_TYPES: [
    'hero-image', 'video-clip', 'code-block', 'screenshot',
    'hero-title', 'subtitle', 'text-list', 'overlay-text',
    'particle-bg', 'logo-reveal', 'star-cta',
  ],

  // Template names
  TEMPLATES: ['game-trailer', 'product-hunter', 'minimal'],

  // Default video settings
  VIDEO: {
    width: 1920,
    height: 1080,
    fps: 30,
    min_duration: 30,
    max_duration: 45,
  },

  // Code snippet extraction limits
  CODE_SNIPPETS: {
    max_snippets: 5,
    max_lines_per_snippet: 15,
  },

  // Paths
  getPath(projectRoot, ...segments) {
    return resolve(projectRoot, ...segments);
  },

  getTemplatesDir() {
    return resolve(import.meta.dirname, '..', 'templates');
  },

  getPresetsDir() {
    return resolve(import.meta.dirname, '..', 'presets');
  },
};
