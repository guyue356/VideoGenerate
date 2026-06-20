import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, relative } from 'path';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];

/**
 * Collect all assets into a unified output/<project>/assets/ directory.
 *
 * @param {Object} options
 * @param {Object} options.capturePlan - AI-generated capture plan (may be null)
 * @param {string|null} options.assetsPath - User-provided assets directory (-a flag)
 * @param {string} options.projectPath - Target project directory
 * @param {string} options.outputDir - Output directory
 * @param {Object} options.assetManifest - Original asset manifest from scanning
 * @returns {Object} Updated asset manifest with unified paths
 */
export function collectAssets({ capturePlan, assetsPath, projectPath, outputDir, assetManifest }) {
  const unifiedDir = join(outputDir, 'assets');
  mkdirSync(unifiedDir, { recursive: true });

  const pathMapping = {}; // originalPath → unifiedFileName
  let counter = 0;

  // 1. Copy user-provided assets from -a directory
  if (assetsPath && existsSync(assetsPath)) {
    const files = listAssetFiles(assetsPath);
    for (const file of files) {
      const relPath = relative(assetsPath, file);
      const unifiedName = makeUniqueName(relPath, pathMapping, counter++);
      try {
        copyFileSync(file, join(unifiedDir, unifiedName));
        pathMapping[relPath] = unifiedName;
      } catch (err) {
        console.warn(`    Warning: Failed to copy ${relPath}: ${err.message}`);
      }
    }
  }

  // 2. Copy assets found in project directory (from assetManifest)
  // Paths in assetManifest are relative to the scan directory, not project root
  const scanDir = assetManifest._scanDir || projectPath;
  for (const img of assetManifest.images) {
    if (pathMapping[img.path]) continue; // already copied from -a
    const srcPath = join(scanDir, img.path);
    if (existsSync(srcPath)) {
      const unifiedName = makeUniqueName(img.path, pathMapping, counter++);
      try {
        copyFileSync(srcPath, join(unifiedDir, unifiedName));
        pathMapping[img.path] = unifiedName;
      } catch (err) {
        console.warn(`    Warning: Failed to copy ${img.path}: ${err.message}`);
      }
    }
  }

  for (const vid of assetManifest.videos) {
    if (pathMapping[vid.path]) continue;
    const srcPath = join(scanDir, vid.path);
    if (existsSync(srcPath)) {
      const unifiedName = makeUniqueName(vid.path, pathMapping, counter++);
      try {
        copyFileSync(srcPath, join(unifiedDir, unifiedName));
        pathMapping[vid.path] = unifiedName;
      } catch (err) {
        console.warn(`    Warning: Failed to copy ${vid.path}: ${err.message}`);
      }
    }
  }

  for (const aud of assetManifest.audio) {
    if (pathMapping[aud.path]) continue;
    const srcPath = join(scanDir, aud.path);
    if (existsSync(srcPath)) {
      const unifiedName = makeUniqueName(aud.path, pathMapping, counter++);
      try {
        copyFileSync(srcPath, join(unifiedDir, unifiedName));
        pathMapping[aud.path] = unifiedName;
      } catch (err) {
        console.warn(`    Warning: Failed to copy ${aud.path}: ${err.message}`);
      }
    }
  }

  // 3. Save manifest for debugging
  const manifestPath = join(unifiedDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({
    source_assets: assetsPath,
    source_project: projectPath,
    path_mapping: pathMapping,
    total_files: Object.keys(pathMapping).length,
  }, null, 2), 'utf-8');

  // 4. Build updated asset manifest with unified paths
  const updatedManifest = remapManifest(assetManifest, pathMapping);

  return { updatedManifest, pathMapping, unifiedDir };
}

/**
 * Extract image URLs from README markdown content.
 * Matches ![alt](url) and <img src="url"> patterns.
 */
export function extractReadmeImageUrls(readme) {
  const urls = [];

  // Markdown image syntax: ![alt](url)
  const mdPattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = mdPattern.exec(readme)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      urls.push(url);
    }
  }

  // HTML img tag: <img src="url">
  const htmlPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((match = htmlPattern.exec(readme)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  }

  return urls;
}

/**
 * List all image/video/audio files in a directory recursively.
 */
function listAssetFiles(dir, prefix = '') {
  const results = [];
  const skip = ['node_modules', '.git', '__pycache__', '.cache'];

  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (skip.includes(entry)) continue;
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const full = join(dir, entry);

    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...listAssetFiles(full, rel));
    } else {
      const ext = extname(entry).toLowerCase();
      if ([...IMAGE_EXTS, ...VIDEO_EXTS, ...AUDIO_EXTS].includes(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

/**
 * Generate a unique filename for the unified directory.
 * If the name already exists, append a counter.
 */
function makeUniqueName(originalPath, existingMapping, counter) {
  const ext = extname(originalPath);
  const base = basename(originalPath, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // sanitize
    .slice(0, 50);                      // limit length

  let name = `${base}${ext}`;
  const existingNames = new Set(Object.values(existingMapping));

  if (existingNames.has(name)) {
    name = `${base}_${counter}${ext}`;
  }

  return name;
}

/**
 * Remap asset manifest paths to unified paths.
 * All paths get "assets/" prefix so HTML src="assets/file.png" resolves correctly
 * from outputDir/index.html.
 */
function remapManifest(manifest, pathMapping) {
  const remap = (items) => items.map(item => ({
    ...item,
    path: pathMapping[item.path] ? `assets/${pathMapping[item.path]}` : item.path,
  }));

  const remapCoverage = (coverage) => {
    const result = {};
    for (const [key, val] of Object.entries(coverage)) {
      result[key] = {
        ...val,
        best: val.best ? (pathMapping[val.best] ? `assets/${pathMapping[val.best]}` : val.best) : null,
        candidates: val.candidates.map(c => pathMapping[c] ? `assets/${pathMapping[c]}` : c),
      };
    }
    return result;
  };

  return {
    ...manifest,
    images: remap(manifest.images),
    videos: remap(manifest.videos),
    audio: remap(manifest.audio),
    coverage: remapCoverage(manifest.coverage),
  };
}
