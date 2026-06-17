import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync } from 'fs';
import { join, resolve } from 'path';
import { loadTemplate } from './template-loader.js';
import { renderComposition } from './template-engine.js';

export async function generateComposition(timeline, templateName, outputDir) {
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

  // Copy assets to output directory (symlink references)
  copyAssetReferences(timeline, outputDir);

  return { outputPath, indexPath, html };
}

function copyAssetReferences(timeline, outputDir) {
  const assetsDir = join(outputDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });

  for (const el of timeline.elements) {
    if (el.source && !el.source.startsWith('http')) {
      // Record asset path for the renderer to resolve
      const assetInfo = join(assetsDir, 'manifest.json');
      const manifest = existsSync(assetInfo)
        ? JSON.parse(readFileSync(assetInfo, 'utf-8'))
        : { assets: [] };

      if (!manifest.assets.find(a => a.source === el.source)) {
        manifest.assets.push({
          source: el.source,
          type: el.type,
          element_id: el.shot_id,
        });
        writeFileSync(assetInfo, JSON.stringify(manifest, null, 2), 'utf-8');
      }
    }
  }
}
