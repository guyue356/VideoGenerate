import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import sharp from 'sharp';
import { CONFIG } from '../config.js';

export async function scanAssets(assetsPath, projectPath) {
  const scanDir = assetsPath || findDefaultAssetsDir(projectPath);

  const result = {
    images: [],
    videos: [],
    audio: [],
    brand: { colors: null, fonts: null },
    asset_score: 0,
    coverage: {
      hook: { has: false, candidates: [], best: null },
      demo: { has: false, candidates: [], best: null },
      detail: { has: false, candidates: [], best: null },
      cta: { has: false, candidates: [], best: null },
    },
    recommendations: [],
    fallback_plan: {},
  };

  if (!scanDir || !existsSync(scanDir)) {
    result.recommendations.push('No assets directory found. Provide --assets path for better video quality.');
    result.recommendations.push('Fallback: will use text animations and code snippets.');
    result.fallback_plan = {
      missing_hook: 'Use project name with animated text',
      missing_demo: 'Use code snippet showcase',
      missing_cta: 'Use GitHub Star animation',
    };
    return result;
  }

  // Scan all files
  const files = listAllFiles(scanDir);

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const fullPath = join(scanDir, file);
    const relPath = relative(scanDir, fullPath);

    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
      const imageInfo = await analyzeImage(fullPath, relPath);
      result.images.push(imageInfo);
    } else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
      result.videos.push({
        path: relPath,
        type: 'screen-recording',
        role_estimate: guessVideoRole(file),
        quality_score: 80, // TODO: probe video metadata
      });
    } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
      result.audio.push({
        path: relPath,
        type: guessAudioType(file),
      });
    } else if (file === 'colors.json' || file === 'brand.json') {
      try {
        const brand = JSON.parse(readFileSync(fullPath, 'utf-8'));
        result.brand.colors = brand.colors || null;
        result.brand.fonts = brand.fonts || null;
      } catch {}
    }
  }

  // Score and evaluate coverage
  evaluateCoverage(result);
  calculateScore(result);
  generateRecommendations(result);
  generateFallbackPlan(result);

  // Record the scan directory so asset-collector can resolve paths correctly
  result._scanDir = scanDir;

  return result;
}

function findDefaultAssetsDir(projectPath) {
  const candidates = [
    'assets', 'screenshots', 'images', 'media',
    'docs/images', 'docs/screenshots', 'docs/assets',
    'data/images', 'data/heroes/images', 'data/assets',
    'public/images', 'public/assets', 'static/images', 'static/assets',
    'src/assets', 'src/images',
  ];
  for (const c of candidates) {
    const full = join(projectPath, c);
    if (existsSync(full)) return full;
  }

  // Fallback: search for directories containing images
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
  const skipDirs = ['node_modules', '.git', 'dist', 'build', '.wrangler', '.next', '__pycache__'];

  function findImageDir(dir, depth = 0) {
    if (depth > 3) return null; // Limit search depth
    try {
      const entries = readdirSync(dir);
      let imageCount = 0;
      const subdirs = [];

      for (const entry of entries) {
        if (skipDirs.includes(entry)) continue;
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isFile() && imageExts.includes(extname(entry).toLowerCase())) {
          imageCount++;
        } else if (stat.isDirectory()) {
          subdirs.push(fullPath);
        }
      }

      // If this directory has enough images, use it
      if (imageCount >= 3) return dir;

      // Recursively search subdirectories
      for (const subdir of subdirs) {
        const found = findImageDir(subdir, depth + 1);
        if (found) return found;
      }
    } catch {}
    return null;
  }

  return findImageDir(projectPath);
}

function listAllFiles(dir, prefix = '') {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...listAllFiles(full, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

async function analyzeImage(fullPath, relPath) {
  let width = 0, height = 0, qualityScore = 70;

  try {
    const metadata = await sharp(fullPath).metadata();
    width = metadata.width || 0;
    height = metadata.height || 0;

    // Quality scoring based on resolution
    if (width >= 1920 && height >= 1080) qualityScore = 90;
    else if (width >= 1280 && height >= 720) qualityScore = 80;
    else if (width >= 640) qualityScore = 60;
    else qualityScore = 40;
  } catch {
    // Non-image or corrupted
  }

  return {
    path: relPath,
    resolution: `${width}x${height}`,
    role_estimate: guessImageRole(relPath),
    quality_score: qualityScore,
  };
}

function guessImageRole(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('logo') || lower.includes('icon')) return 'logo';
  if (lower.includes('screenshot') || lower.includes('screen')) return 'screenshot';
  if (lower.includes('hero') || lower.includes('banner')) return 'hero';
  if (lower.includes('demo')) return 'demo';
  if (lower.includes('cover')) return 'cover';
  return 'screenshot';
}

function guessVideoRole(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('gameplay') || lower.includes('game')) return 'demo';
  if (lower.includes('demo')) return 'demo';
  if (lower.includes('tutorial')) return 'detail';
  return 'demo';
}

function guessAudioType(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('bgm') || lower.includes('music') || lower.includes('background')) return 'bgm';
  if (lower.includes('voice') || lower.includes('narration') || lower.includes('tts')) return 'voice';
  return 'bgm';
}

function evaluateCoverage(result) {
  // Hook: logo, hero image, or best screenshot
  const heroCandidate = result.images.find(i =>
    i.role_estimate === 'logo' || i.role_estimate === 'hero' || i.role_estimate === 'cover'
  );
  const bestScreenshot = result.images
    .filter(i => i.role_estimate === 'screenshot')
    .sort((a, b) => b.quality_score - a.quality_score)[0];

  if (heroCandidate) {
    result.coverage.hook = { has: true, candidates: [heroCandidate.path], best: heroCandidate.path };
  } else if (bestScreenshot) {
    result.coverage.hook = { has: true, candidates: [bestScreenshot.path], best: bestScreenshot.path };
  }

  // Demo: video recording or multiple screenshots
  if (result.videos.length > 0) {
    const bestVideo = result.videos.sort((a, b) => b.quality_score - a.quality_score)[0];
    result.coverage.demo = { has: true, candidates: [bestVideo.path], best: bestVideo.path };
  } else if (result.images.length >= 2) {
    result.coverage.demo = {
      has: true,
      candidates: result.images.map(i => i.path),
      best: result.images[0].path,
    };
  }

  // Detail: additional screenshots or code-related images
  const detailImages = result.images.filter(i =>
    i.role_estimate === 'screenshot' && i !== bestScreenshot
  );
  if (detailImages.length > 0) {
    result.coverage.detail = {
      has: true,
      candidates: detailImages.map(i => i.path),
      best: detailImages[0].path,
    };
  }

  // CTA: any asset can serve as CTA background
  result.coverage.cta = { has: false, candidates: [], best: null };
}

function calculateScore(result) {
  let score = 0;
  const weights = CONFIG.ASSET_SCORES;

  if (result.images.some(i => i.role_estimate === 'hero' || i.role_estimate === 'logo')) score += weights.logo;
  if (result.images.some(i => i.role_estimate === 'screenshot')) score += weights.hero_image;
  if (result.videos.length > 0) score += weights.demo_video;
  if (result.images.length >= 3) score += weights.detail_shots;
  if (result.coverage.cta.has) score += weights.cta_asset;
  if (result.audio.some(a => a.type === 'bgm')) score += weights.custom_bgm;

  // Quality penalty
  const lowQualityImages = result.images.filter(i => i.quality_score < 50);
  score -= lowQualityImages.length * 5;

  result.asset_score = Math.max(0, Math.min(100, score));
}

function generateRecommendations(result) {
  const r = result.recommendations;

  if (result.videos.length > 0) {
    r.push('✓ Has video recording — strongest asset for demo');
  } else {
    r.push('✗ No video recording — consider recording gameplay/demo for stronger impact');
  }

  if (result.images.some(i => i.role_estimate === 'hero' || i.role_estimate === 'logo')) {
    r.push('✓ Has logo/hero image');
  } else {
    r.push('✗ No logo found — project name will be used as text logo');
  }

  if (result.images.length >= 3) {
    r.push(`✓ Has ${result.images.length} images for visual variety`);
  } else if (result.images.length > 0) {
    r.push(`△ Only ${result.images.length} image(s) — more would improve variety`);
  } else {
    r.push('✗ No images — video will use text animations and code snippets');
  }

  if (!result.audio.some(a => a.type === 'bgm')) {
    r.push('△ No custom BGM — will use preset background music');
  }
}

function generateFallbackPlan(result) {
  result.fallback_plan = {
    missing_hook: result.coverage.hook.has
      ? null
      : 'Use project name with neon glow animation',
    missing_demo: result.coverage.demo.has
      ? null
      : 'Use code snippet typewriter effect with Ken Burns on screenshots',
    missing_detail: result.coverage.detail.has
      ? null
      : 'Use tech stack icons with animated text list',
    missing_cta: 'Use GitHub Star button animation with project URL',
  };
}
