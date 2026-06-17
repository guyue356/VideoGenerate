import { resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeRepo } from './understand/repo-analyzer.js';
import { discoverFeatures } from './understand/feature-discovery.js';
import { scanAssets } from './understand/asset-scanner.js';
import { buildStrategy } from './strategize/product-strategist.js';
import { generateStory } from './story/story-generator.js';
import { convertToTimeline } from './compose/video-dsl.js';
import { generateComposition } from './compose/composition-generator.js';
import { generateAudio } from './render/audio-generator.js';
import { renderVideo } from './render/hyperframes-renderer.js';
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
    verbose = false,
    saveIntermediates = false,
  } = options;

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
  const repoProfile = await analyzeRepo(resolvedProject);
  spinner.succeed(`  Repository analyzed: ${repoProfile.name} (${repoProfile.type})`);
  logVerbose('Repository Profile', repoProfile, verbose);

  let discovery = null;
  if (!fast) {
    spinner = ora('  Discovering features with AI...').start();
    discovery = await discoverFeatures(repoProfile);
    spinner.succeed(`  Discovered ${discovery.core_capabilities.length} core capabilities`);
    logVerbose('Feature Discovery', discovery, verbose);
  }

  spinner = ora('  Scanning assets...').start();
  const assetManifest = await scanAssets(resolvedAssets, resolvedProject);
  spinner.succeed(`  Assets scanned: score ${assetManifest.asset_score}/100`);
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

  // ─── PHASE 2: STRATEGIZE ────────────────────────────
  console.log(chalk.yellow('\n  Phase 2: Building strategy...\n'));

  let strategy = null;
  if (!fast) {
    spinner = ora('  Product Strategist analyzing...').start();
    strategy = await buildStrategy(repoProfile, discovery, assetManifest);
    spinner.succeed(`  Strategy: "${strategy.value_prop}"`);
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
  const timeline = convertToTimeline(story);
  spinner.succeed(`  Timeline: ${timeline.total_duration}s, ${timeline.elements.length} elements`);

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
  const composition = await generateComposition(timeline, chosenTemplate, resolvedOutput);
  spinner.succeed('  HTML composition generated');

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
    await generateAudio({
      story,
      assetManifest,
      outputDir: resolve(resolvedOutput, 'audio'),
      skipTTS,
    });
    spinner.succeed('  Audio generated');
  }

  if (preview) {
    console.log(chalk.cyan('\n  Preview mode. Opening HyperFrames Studio...'));
    // TODO: launch hyperframes studio
    return;
  }

  spinner = ora('  Rendering video with HyperFrames...').start();
  const result = await renderVideo({
    compositionPath: resolve(resolvedOutput, 'compositions', 'main.html'),
    outputDir: resolve(resolvedOutput, 'renders'),
    projectRoot: resolvedOutput,
    projectName,
  });
  spinner.succeed(`  Video rendered: ${result.outputPath}`);

  // Save LLM logs
  const llmLogsMd = exportLogsAsMarkdown();
  if (llmLogsMd) {
    const logsPath = resolve(resolvedOutput, 'llm-logs.md');
    writeFileSync(logsPath, llmLogsMd, 'utf-8');
    console.log(chalk.gray(`  LLM logs saved to: llm-logs.md`));
  }

  console.log(chalk.green.bold(`\n  Done! Video saved to: ${result.outputPath}\n`));
}
