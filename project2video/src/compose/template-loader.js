import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { CONFIG } from '../config.js';

let templateCache = {};

export async function loadTemplate(templateName) {
  if (templateCache[templateName]) return templateCache[templateName];

  const templatesDir = CONFIG.getTemplatesDir();
  const templateDir = join(templatesDir, templateName);

  if (!existsSync(templateDir)) {
    throw new Error(
      `Template "${templateName}" not found at ${templateDir}\n` +
      `Available templates: ${listTemplates().join(', ')}`
    );
  }

  const manifestPath = join(templateDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Template "${templateName}" is missing manifest.json`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const templateHtml = readFileSync(join(templateDir, 'template.html'), 'utf-8');
  const styleCss = existsSync(join(templateDir, 'style.css'))
    ? readFileSync(join(templateDir, 'style.css'), 'utf-8')
    : '';
  const animationsPath = join(templateDir, 'animations.js');

  let animations;
  if (existsSync(animationsPath)) {
    animations = await import(pathToFileURL(animationsPath).href);
  } else {
    animations = { handlers: {} };
  }

  const template = { manifest, templateHtml, styleCss, animations, dir: templateDir };
  templateCache[templateName] = template;
  return template;
}

export function listTemplates() {
  const templatesDir = CONFIG.getTemplatesDir();
  if (!existsSync(templatesDir)) return [];
  return readdirSync(templatesDir).filter(name => {
    const manifestPath = join(templatesDir, name, 'manifest.json');
    return existsSync(manifestPath);
  });
}
