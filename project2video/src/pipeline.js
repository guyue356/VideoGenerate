import { resolve, basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeRepo } from './understand/repo-analyzer.js';
import { discoverFeatures } from './understand/feature-discovery.js';
import { scanAssets } from './understand/asset-scanner.js';
import { generateCapturePlan } from './understand/capture-planner.js';
import { collectAssets } from './understand/asset-collector.js';
import { buildStrategy } from './strategize/product-strategist.js';
import { generateStory } from './story/story-generator.js';
import { convertToTimeline } from './compose/video-dsl.js';
import { generateComposition } from './compose/composition-generator.js';
import { generateAudio } from './render/audio-generator.js';
import { renderVideo } from './render/hyperframes-renderer.js';
import { reviewVideo, applyFixes } from './render/ai-reviewer.js';
import { clearLLMLogs, exportLogsAsMarkdown } from './llm/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

function logVerbose(message, data, verbose) {
  if (verbose) {
    console.log(chalk.gray(`  [verbose] ${message}:`));
    console.log(chalk.gray(JSON.stringify(data, null, 2)));
    console.log('');
  }
}

function readFullReadme(projectPath) {
  for (const name of ['README.md', 'readme.md', 'README.txt', 'README']) {
    const path = join(projectPath, name);
    if (existsSync(path)) {
      try { return readFileSync(path, 'utf-8'); } catch {}
    }
  }
  return null;
}

function saveIntermediate(filename, data, outputDir) {
  const intermediatesDir = resolve(outputDir, 'intermediates');
  mkdirSync(intermediatesDir, { recursive: true });
  const filepath = resolve(intermediatesDir, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(chalk.gray(`  [saved] ${filename}`));
}

export async function runPipeline(options) {
  const {
    projectPath,
    assetsPath,
    template,
    outputPath,
    skipTTS,
    storyOnly,
    fast,
    preview,
    duration,
    bgmStyle,
    verbose = false,
    saveIntermediates = false,
    onProgress,
  } = options;

  const emit = (phase, step, status, data) => {
    onProgress?.({ phase, step, status, data, timestamp: Date.now() });
  };

  const resolvedProject = resolve(projectPath);
  const projectName = basename(resolvedProject);
  // Output to project2video/output/<project-name>
  const resolvedOutput = outputPath
    ? resolve(outputPath)
    : resolve(PROJECT_ROOT, 'output', projectName);
  const resolvedAssets = assetsPath ? resolve(assetsPath) : null;

  // Clear LLM logs for this run
  clearLLMLogs();

  // ─── PHASE 1: UNDERSTAND ────────────────────────────
  console.log(chalk.yellow('\n  Phase 1: Understanding project...\n'));

  let spinner = ora('  Analyzing repository...').start();
  emit('understand', 'analyze-repo', 'start');
  const repoProfile = await analyzeRepo(resolvedProject);
  spinner.succeed(`  Repository analyzed: ${repoProfile.name} (${repoProfile.type})`);
  emit('understand', 'analyze-repo', 'complete', { name: repoProfile.name, type: repoProfile.type, language: repoProfile.language });
  logVerbose('Repository Profile', repoProfile, verbose);

  let discovery = null;
  if (!fast) {
    // Read full README for LLM analysis (repoProfile only has a 500-char excerpt)
    const fullReadme = readFullReadme(resolvedProject);

    spinner = ora('  Discovering features with AI...').start();
    emit('understand', 'discover-features', 'start');
    discovery = await discoverFeatures(repoProfile, fullReadme);

    // Override regex-based results with AI results when available
    const originalType = repoProfile.type;
    if (discovery.tagline) {
      repoProfile.tagline = discovery.tagline;
    }
    if (discovery.project_type && discovery.project_type !== 'unknown') {
      repoProfile.type = discovery.project_type;
    }
    if (discovery.tech_stack && discovery.tech_stack.length > 0) {
      // Merge AI-detected tech stack (avoid duplicates with regex-detected ones)
      const existingNames = new Set(repoProfile.tech_stack.map(t => t.name.toLowerCase()));
      for (const t of discovery.tech_stack) {
        if (!existingNames.has(t.name.toLowerCase())) {
          repoProfile.tech_stack.push({ name: t.name, version: '*', source: 'llm' });
        }
      }
    }

    spinner.succeed(`  Discovered ${discovery.core_capabilities.length} core capabilities`);
    emit('understand', 'discover-features', 'complete', { capabilities: discovery.core_capabilities.length, tagline: discovery.tagline });
    if (discovery.tagline) {
      console.log(chalk.gray(`    Tagline (AI): ${discovery.tagline}`));
    }
    if (repoProfile.type !== originalType) {
      console.log(chalk.gray(`    Type (AI): ${originalType} → ${repoProfile.type}`));
    }
    if (discovery.tech_stack && discovery.tech_stack.length > 0) {
      console.log(chalk.gray(`    Tech Stack (AI): ${discovery.tech_stack.map(t => t.name).join(', ')}`));
    }
    logVerbose('Feature Discovery', discovery, verbose);
  }

  spinner = ora('  Scanning assets...').start();
  emit('understand', 'scan-assets', 'start');
  let assetManifest = await scanAssets(resolvedAssets, resolvedProject);
  spinner.succeed(`  Assets scanned: score ${assetManifest.asset_score}/100`);
  emit('understand', 'scan-assets', 'complete', { score: assetManifest.asset_score, images: assetManifest.images.length, videos: assetManifest.videos.length });
  logVerbose('Asset Manifest', assetManifest, verbose);

  if (assetManifest.recommendations.length > 0) {
    console.log(chalk.gray('\n  Asset recommendations:'));
    assetManifest.recommendations.forEach(r => console.log(`    ${r}`));
  }

  if (saveIntermediates) {
    saveIntermediate('01-repo-profile.json', repoProfile, resolvedOutput);
    if (discovery) saveIntermediate('02-feature-discovery.json', discovery, resolvedOutput);
    saveIntermediate('03-asset-manifest.json', assetManifest, resolvedOutput);
  }

  // ─── PHASE 1.5: CAPTURE PLAN & ASSET COLLECTION ─────
  let capturePlan = null;
  if (!fast) {
    console.log(chalk.yellow('\n  Phase 1.5: Planning assets...\n'));

    const fullReadme = readFullReadme(resolvedProject);

    spinner = ora('  AI planning capture strategy...').start();
    emit('capture', 'plan', 'start');
    capturePlan = await generateCapturePlan(repoProfile, assetManifest, discovery, fullReadme);
    spinner.succeed(`  Capture plan: ${capturePlan.assets.length} assets, ${capturePlan.gaps.length} gaps`);
    emit('capture', 'plan', 'complete', { assets: capturePlan.assets.length, gaps: capturePlan.gaps.length });
    logVerbose('Capture Plan', capturePlan, verbose);

    if (capturePlan.gaps.length > 0) {
      console.log(chalk.gray(`    Gaps: ${capturePlan.gaps.join(', ')}`));
    }

    // Collect all assets into unified output/<project>/assets/ directory
    spinner = ora('  Collecting assets to unified directory...').start();
    emit('capture', 'collect', 'start');
    const { updatedManifest } = collectAssets({
      capturePlan,
      assetsPath: resolvedAssets,
      projectPath: resolvedProject,
      outputDir: resolvedOutput,
      assetManifest,
    });
    assetManifest = updatedManifest;
    spinner.succeed(`  Assets collected: ${assetManifest.images.length} images, ${assetManifest.videos.length} videos`);
    emit('capture', 'collect', 'complete', { images: assetManifest.images.length, videos: assetManifest.videos.length });

    if (saveIntermediates) {
      saveIntermediate('02-capture-plan.json', capturePlan, resolvedOutput);
    }
  }

  // ─── PHASE 2: STRATEGIZE ────────────────────────────
  console.log(chalk.yellow('\n  Phase 2: Building strategy...\n'));

  let strategy = null;
  if (!fast) {
    spinner = ora('  Product Strategist analyzing...').start();
    emit('strategize', 'build-strategy', 'start');
    strategy = await buildStrategy(repoProfile, discovery, assetManifest);
    spinner.succeed(`  Strategy: "${strategy.value_prop}"`);
    emit('strategize', 'build-strategy', 'complete', { value_prop: strategy.value_prop, template: strategy.template_recommendation });
    console.log(chalk.gray(`    Angle: ${strategy.story_angle}`));
    console.log(chalk.gray(`    Template: ${strategy.template_recommendation}`));
    logVerbose('Strategy', strategy, verbose);
    if (saveIntermediates) {
      saveIntermediate('04-strategy.json', strategy, resolvedOutput);
    }
  }

  // ─── PHASE 3: STORY ─────────────────────────────────
  console.log(chalk.yellow('\n  Phase 3: Generating story...\n'));

  const chosenTemplate = template || strategy?.template_recommendation || 'minimal';

  spinner = ora('  Story Generator writing script...').start();
  emit('story', 'generate', 'start');
  const story = await generateStory({
    repoProfile,
    discovery,
    strategy,
    assetManifest,
    template: chosenTemplate,
    duration,
    fast,
  });
  const shotCount = story.scenes.reduce((n, s) => n + s.shots.length, 0);
  spinner.succeed(`  Story generated: ${story.scenes.length} scenes, ${shotCount} shots`);
  emit('story', 'generate', 'complete', {
    scenes: story.scenes.map(s => ({ purpose: s.purpose, narration: s.narration, shots: s.shots })),
    hook: story.hook,
    tone: story.tone,
    music_style: story.music_style,
  });

  // Always show story summary
  console.log(chalk.cyan('\n  Story Summary:'));
  console.log(chalk.white(`    Hook: ${story.hook}`));
  console.log(chalk.white(`    Tone: ${story.tone}`));
  console.log(chalk.white(`    Music: ${story.music_style}`));
  console.log(chalk.white(`    Duration: ${story.scenes.reduce((n, s) => n + s.shots.reduce((m, shot) => m + shot.duration, 0), 0)}s`));
  console.log('');
  story.scenes.forEach((scene, i) => {
    const sceneDuration = scene.shots.reduce((n, s) => n + s.duration, 0);
    console.log(chalk.white(`    Scene ${i + 1} [${scene.purpose}] (${sceneDuration}s): ${scene.narration}`));
    scene.shots.forEach(shot => {
      console.log(chalk.gray(`      - ${shot.id}: ${shot.duration}s, ${shot.asset_usage?.type || 'text'}, ${shot.asset_usage?.motion || 'none'}`));
    });
  });

  logVerbose('Full Story JSON', story, verbose);
  if (saveIntermediates || storyOnly) {
    saveIntermediate('05-story.json', story, resolvedOutput);
  }

  if (storyOnly) {
    console.log(chalk.cyan('\n  Story-only mode. Output saved to intermediates/05-story.json\n'));
    return;
  }

  // ─── PHASE 4: COMPOSE ───────────────────────────────
  console.log(chalk.yellow('\n  Phase 4: Composing video...\n'));

  spinner = ora('  Converting to timeline (Video DSL)...').start();
  emit('compose', 'timeline', 'start');
  const timeline = convertToTimeline(story);
  spinner.succeed(`  Timeline: ${timeline.total_duration}s, ${timeline.elements.length} elements`);
  emit('compose', 'timeline', 'complete', { duration: timeline.total_duration, elements: timeline.elements.length });

  // Show timeline summary
  console.log(chalk.cyan('\n  Timeline Elements:'));
  timeline.elements.forEach(el => {
    const endTime = el.start + el.duration;
    console.log(chalk.white(`    [${el.start.toFixed(1)}s - ${endTime.toFixed(1)}s] ${el.type}: ${el.text || el.source || el.narration?.slice(0, 50) || 'no content'}`));
  });

  logVerbose('Full Timeline', timeline, verbose);
  if (saveIntermediates) {
    saveIntermediate('06-timeline.json', timeline, resolvedOutput);
  }

  spinner = ora('  Generating HTML composition...').start();
  emit('compose', 'html', 'start');
  const composition = await generateComposition(timeline, chosenTemplate, resolvedOutput, resolvedAssets, resolvedProject);
  spinner.succeed('  HTML composition generated');
  emit('compose', 'html', 'complete', { htmlLength: composition.html.length });

  if (saveIntermediates) {
    saveIntermediate('07-composition.json', { template: chosenTemplate, htmlLength: composition.html.length }, resolvedOutput);
  }

  // ─── PHASE 5: RENDER ────────────────────────────────
  console.log(chalk.yellow('\n  Phase 5: Rendering...\n'));

  if (saveIntermediates) {
    saveIntermediate('08-render-config.json', {
      compositionPath: resolve(resolvedOutput, 'compositions', 'main.html'),
      outputDir: resolve(resolvedOutput, 'renders'),
      skipTTS,
      hasBgm: assetManifest.audio.find(a => a.type === 'bgm') !== null,
    }, resolvedOutput);
  }

  if (!skipTTS || assetManifest.audio.find(a => a.type === 'bgm')) {
    spinner = ora('  Generating audio...').start();
    emit('render', 'audio', 'start');
    await generateAudio({
      story,
      assetManifest,
      outputDir: resolve(resolvedOutput, 'audio'),
      skipTTS,
      bgmStyle,
    });
    spinner.succeed('  Audio generated');
    emit('render', 'audio', 'complete', { hasBgm: !!assetManifest.audio.find(a => a.type === 'bgm'), hasNarration: !skipTTS });
  }

  if (preview) {
    console.log(chalk.cyan('\n  Preview mode. Opening HyperFrames Studio...'));
    const { execSync } = await import('child_process');
    try {
      execSync(`npx hyperframes preview "${resolvedOutput}"`, {
        stdio: 'inherit',
        env: { ...process.env },
      });
    } catch (err) {
      console.warn(`  Warning: Could not open HyperFrames Studio: ${err.message}`);
      console.warn(`  Open the HTML manually: ${join(resolvedOutput, 'index.html')}`);
    }
    return;
  }

  const compositionPath = resolve(resolvedOutput, 'compositions', 'main.html');
  const rendersDir = resolve(resolvedOutput, 'renders');
  const audioDir = resolve(resolvedOutput, 'audio');
  let result;
  const MAX_REVIEW_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_REVIEW_RETRIES; attempt++) {
    // Render
    spinner = ora(attempt === 0 ? '  Rendering video with HyperFrames...' : `  Re-rendering (attempt ${attempt})...`).start();
    emit('render', 'video', attempt === 0 ? 'start' : 'retry', { attempt });
    result = await renderVideo({
      compositionPath,
      outputDir: rendersDir,
      projectRoot: resolvedOutput,
      projectName,
      audioDir,
    });
    spinner.succeed(`  Video rendered: ${result.outputPath}`);
    emit('render', 'video', 'complete', { outputPath: result.outputPath });

    // AI Review (skip on last attempt or if render failed)
    if (!result.rendered || attempt === MAX_REVIEW_RETRIES) break;

    spinner = ora('  AI reviewing video quality...').start();
    emit('render', 'review', 'start');
    const review = await reviewVideo({
      videoPath: result.outputPath,
      htmlPath: compositionPath,
      outputDir: resolvedOutput,
      timeline,
      assetManifest,
    });

    if (!review.hasAnyIssues) {
      spinner.succeed('  AI review: no issues found ✓');
      emit('render', 'review', 'complete', { issues: 0 });
      break;
    }

    spinner.succeed(`  AI review: ${review.issues.length} issue(s) found`);
    emit('render', 'review', 'complete', { issues: review.issues.length });

    // Show issues
    for (const issue of review.issues) {
      const icon = issue.severity === 'critical' ? '✗' : issue.severity === 'warning' ? '⚠' : '○';
      console.log(chalk.gray(`    ${icon} [${issue.type}] ${issue.message}`));
    }

    if (saveIntermediates) {
      saveIntermediate(`09-review-${attempt}.json`, review, resolvedOutput);
    }

    // Try to fix issues
    if (review.hasCriticalIssues) {
      const fixed = applyFixes(compositionPath, review.issues);
      if (fixed) {
        console.log(chalk.cyan('    Fixes applied, will re-render...'));
      } else {
        console.log(chalk.gray('    No automatic fixes available, stopping review loop.'));
        break;
      }
    } else {
      // Only warnings/info — don't re-render
      console.log(chalk.gray('    Non-critical issues, no re-render needed.'));
      break;
    }
  }

  // Save LLM logs
  const llmLogsMd = exportLogsAsMarkdown();
  if (llmLogsMd) {
    const logsPath = resolve(resolvedOutput, 'llm-logs.md');
    writeFileSync(logsPath, llmLogsMd, 'utf-8');
    console.log(chalk.gray(`  LLM logs saved to: llm-logs.md`));
  }

  console.log(chalk.green.bold(`\n  Done! Video saved to: ${result.outputPath}\n`));
  emit('done', 'complete', 'complete', { outputPath: result.outputPath });
}
