import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { CONFIG } from '../config.js';

export async function analyzeRepo(projectPath) {
  const files = listFiles(projectPath);
  const readme = extractReadme(projectPath);
  const techStack = detectTechStack(projectPath, files);
  const type = inferProjectType(files, techStack, readme);
  const entryPoint = findEntryPoint(files);
  const codeSnippets = extractCodeSnippets(projectPath, files, type);

  return {
    name: basename(projectPath),
    tagline: extractTagline(readme),
    description: extractDescription(readme),
    language: detectPrimaryLanguage(files),
    type,
    entry_point: entryPoint,
    tech_stack: techStack,
    file_structure: {
      total_files: files.length,
      single_file_app: files.filter(f => extname(f) === '.html').length === 1 && files.length < 10,
      key_files: files.slice(0, 20),
    },
    readme_excerpt: readme ? readme.slice(0, 500) : null,
    code_snippets: codeSnippets,
  };
}

function listFiles(dir, prefix = '') {
  const results = [];
  const skip = [
    'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
    '.wrangler', '.vercel', '.netlify', 'coverage', '.nyc_output',
    'tmp', 'temp', '.cache', '.turbo', '.mimocode',
  ];

  for (const entry of readdirSync(dir)) {
    if (skip.includes(entry)) continue;
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      results.push(...listFiles(full, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

function extractReadme(projectPath) {
  for (const name of ['README.md', 'readme.md', 'README.txt', 'README']) {
    const path = join(projectPath, name);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }
  return null;
}

function extractTagline(readme) {
  if (!readme) return null;
  // Look for the first blockquote or first heading's subtitle
  const blockquoteMatch = readme.match(/^>\s*(.+)$/m);
  if (blockquoteMatch) return blockquoteMatch[1].trim();

  // First non-empty line after first heading
  const lines = readme.split('\n');
  let pastHeading = false;
  for (const line of lines) {
    if (line.startsWith('#')) { pastHeading = true; continue; }
    if (pastHeading && line.trim()) return line.trim().slice(0, 100);
  }
  return null;
}

function extractDescription(readme) {
  if (!readme) return null;
  // First paragraph after heading
  const match = readme.match(/^#[^\n]*\n+([^\n#][^\n]*)/m);
  return match ? match[1].trim().slice(0, 300) : null;
}

function detectTechStack(projectPath, files) {
  const stack = [];

  // From package.json
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps || {})) {
        stack.push({ name, version, source: 'package.json' });
      }
    } catch {}
  }

  // From CDN imports in HTML/JS files
  const htmlFiles = files.filter(f => extname(f) === '.html' || extname(f) === '.js');
  for (const file of htmlFiles.slice(0, 10)) {
    try {
      const content = readFileSync(join(projectPath, file), 'utf-8');
      // CDN script tags — match known CDN patterns
      const cdnPatterns = [
        // cdnjs: /ajax/libs/three.js/r128/three.min.js
        /src="https?:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/([^/"]+)\/([^/"]+)\/[^"]*"/g,
        // jsdelivr: /npm/package@version/file
        /src="https?:\/\/cdn\.jsdelivr\.net\/npm\/([^/@"]+)(?:@([^/"]+))?\/[^"]*"/g,
        // unpkg: /npm/package@version/file
        /src="https?:\/\/unpkg\.com\/([^/@"]+)(?:@([^/"]+))?\/[^"]*"/g,
      ];
      for (const pattern of cdnPatterns) {
        for (const m of content.matchAll(pattern)) {
          const name = m[1];
          const version = m[2] || 'latest';
          if (!stack.find(s => s.name === name)) {
            stack.push({ name, version, source: 'cdn' });
          }
        }
      }
      // import statements
      const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
      for (const m of importMatches) {
        const name = m[1];
        // Skip relative paths, absolute paths, and node_modules internal paths
        if (name.startsWith('.') || name.startsWith('/') || /^[A-Z]:\\/i.test(name)) continue;
        if (name.includes('node_modules')) continue;
        // Only keep package names (no deep paths)
        const pkgName = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
        if (!stack.find(s => s.name === pkgName)) {
          stack.push({ name: pkgName, version: '*', source: 'import' });
        }
      }
    } catch {}
  }

  // From requirements.txt
  const reqPath = join(projectPath, 'requirements.txt');
  if (existsSync(reqPath)) {
    try {
      const lines = readFileSync(reqPath, 'utf-8').split('\n');
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)\s*(?:==\s*(.+))?$/);
        if (match) {
          stack.push({ name: match[1], version: match[2] || '*', source: 'requirements.txt' });
        }
      }
    } catch {}
  }

  return stack;
}

function detectPrimaryLanguage(files) {
  const extCounts = {};
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext) {
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
  }
  const extMap = {
    '.js': 'JavaScript', '.ts': 'TypeScript', '.py': 'Python',
    '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.html': 'HTML',
    '.css': 'CSS', '.rb': 'Ruby', '.php': 'PHP',
  };
  const sorted = Object.entries(extCounts).sort((a, b) => b[1] - a[1]);
  for (const [ext] of sorted) {
    if (extMap[ext]) return extMap[ext];
  }
  return 'Unknown';
}

function inferProjectType(files, techStack, readme) {
  const fileStr = files.join(' ').toLowerCase();
  const readmeStr = (readme || '').toLowerCase();
  const techStr = techStack.map(t => t.name).join(' ').toLowerCase();

  // Game indicators
  if (techStr.includes('three') || techStr.includes('phaser') || techStr.includes('pixi') ||
      fileStr.includes('game') || readmeStr.includes('game') || readmeStr.includes('游戏')) {
    return 'game';
  }

  // CLI indicators
  if (techStr.includes('commander') || techStr.includes('yargs') || techStr.includes('clipanion') ||
      fileStr.includes('cli')) {
    return 'cli';
  }

  // API indicators
  if (techStr.includes('express') || techStr.includes('fastify') || techStr.includes('hono') ||
      techStr.includes('koa') || fileStr.includes('server') || fileStr.includes('api')) {
    return 'api';
  }

  // Library indicators
  if (files.some(f => f.includes('lib/') || f.includes('src/index')) &&
      techStack.find(t => t.name === 'typescript')) {
    return 'library';
  }

  // Web app indicators
  if (techStr.includes('react') || techStr.includes('vue') || techStr.includes('svelte') ||
      techStr.includes('next') || techStr.includes('nuxt')) {
    return 'web-app';
  }

  if (fileStr.includes('index.html')) return 'web-app';

  return 'unknown';
}

function findEntryPoint(files) {
  const candidates = ['index.html', 'main.js', 'main.ts', 'app.js', 'app.ts', 'src/main.ts', 'src/index.ts'];
  for (const c of candidates) {
    if (files.includes(c)) return c;
  }
  // Try to find any meaningful source file
  const sourceFiles = files.filter(f => {
    const ext = extname(f);
    return ['.js', '.ts', '.py', '.html'].includes(ext) &&
           !f.includes('config') && !f.includes('test') && !f.includes('.d.ts');
  });
  return sourceFiles[0] || null;
}

function extractCodeSnippets(projectPath, files, projectType) {
  const snippets = [];
  const codeFiles = files.filter(f => {
    const ext = extname(f);
    return ['.js', '.ts', '.py', '.html'].includes(ext);
  });

  for (const file of codeFiles.slice(0, 5)) {
    try {
      const content = readFileSync(join(projectPath, file), 'utf-8');
      const lines = content.split('\n');

      // Find interesting functions/blocks
      const interestingPatterns = [
        /function\s+\w+/,
        /class\s+\w+/,
        /const\s+\w+\s*=\s*(?:async\s*)?\(/,
        /async\s+function/,
        /export\s+(?:default\s+)?(?:function|class)/,
        /(?:new\s+THREE\.|scene\s*=|createScene)/,
        /(?:analyzeBPM|detectBeat|calculate)/,
      ];

      for (let i = 0; i < lines.length; i++) {
        for (const pattern of interestingPatterns) {
          if (pattern.test(lines[i])) {
            const start = Math.max(0, i);
            const end = Math.min(lines.length, i + CONFIG.CODE_SNIPPETS.max_lines_per_snippet);
            const snippet = lines.slice(start, end).join('\n');

            if (snippet.length > 30) {
              snippets.push({
                file,
                lines: `${start + 1}-${end}`,
                content: snippet,
                significance: guessSignificance(snippet),
              });
            }

            if (snippets.length >= CONFIG.CODE_SNIPPETS.max_snippets) return snippets;
            break;
          }
        }
      }
    } catch {}
  }

  return snippets;
}

function guessSignificance(snippet) {
  if (/scene|THREE|render/i.test(snippet)) return '3D scene setup';
  if (/audio|sound|music|bpm|beat/i.test(snippet)) return 'audio processing';
  if (/fetch|api|request/i.test(snippet)) return 'API integration';
  if (/game|play|score|combo/i.test(snippet)) return 'game logic';
  if (/database|db|store|save/i.test(snippet)) return 'data persistence';
  if (/canvas|draw|paint/i.test(snippet)) return 'rendering';
  if (/auth|login|token/i.test(snippet)) return 'authentication';
  return 'core logic';
}
