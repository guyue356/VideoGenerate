import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, copyFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import { loadTemplate } from './template-loader.js';
import { renderComposition } from './template-engine.js';

export async function generateComposition(timeline, templateName, outputDir, assetsPath, projectPath) {
  const template = await loadTemplate(templateName);

  // Generate HTML
  const html = renderComposition(timeline, template);

  // Write output
  const compositionsDir = join(outputDir, 'compositions');
  mkdirSync(compositionsDir, { recursive: true });

  const outputPath = join(compositionsDir, 'main.html');
  writeFileSync(outputPath, html, 'utf-8');

  // Also write as index.html in project root for HyperFrames compatibility
  const indexPath = join(outputDir, 'index.html');
  writeFileSync(indexPath, html, 'utf-8');

  // Copy assets to output directory (actual files, not just manifest)
  copyAssetReferences(timeline, outputDir, assetsPath, projectPath);

  return { outputPath, indexPath, html };
}

function copyAssetReferences(timeline, outputDir, assetsPath, projectPath) {
  // Collect all unique local asset sources from timeline
  const assetSources = new Set();
  for (const el of timeline.elements) {
    if (el.source && !el.source.startsWith('http')) {
      assetSources.add(el.source);
    }
  }

  for (const source of assetSources) {
    // If asset already exists in outputDir (from unified collection in Phase 1.5), skip
    const existingPath = join(outputDir, source);
    if (existsSync(existingPath)) {
      continue; // already in place
    }

    // Otherwise, try to find and copy from external sources
    const destPath = join(outputDir, source);
    const destDir = join(destPath, '..');
    mkdirSync(destDir, { recursive: true });

    const searchPaths = [
      assetsPath ? join(assetsPath, source) : null,
      assetsPath ? join(assetsPath, basename(source)) : null,
      projectPath ? join(projectPath, source) : null,
      resolve(source),
    ].filter(Boolean);

    let copied = false;
    for (const srcPath of searchPaths) {
      if (existsSync(srcPath)) {
        try {
          copyFileSync(srcPath, destPath);
          console.log(`    Copied asset: ${source}`);
          copied = true;
          break;
        } catch (err) {
          console.warn(`    Warning: Failed to copy ${source}: ${err.message}`);
        }
      }
    }

    if (!copied) {
      console.warn(`    Warning: Asset not found: ${source}`);
    }
  }
}
