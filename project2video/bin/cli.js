#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';
import { runPipeline } from '../src/pipeline.js';

// Load .env from parent directory (VideoGenerate)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env'), override: true });

const program = new Command();

program
  .name('project2video')
  .description('Turn any GitHub project into a promotional video')
  .version('1.0.0')
  .argument('<project-path>', 'Path to the project directory')
  .option('-a, --assets <path>', 'Path to user-provided assets directory')
  .option('-t, --template <name>', 'Template to use (game-trailer | product-hunter | minimal)')
  .option('-o, --output <path>', 'Output directory (default: <project-path>/video-output)')
  .option('--no-tts', 'Skip TTS narration, generate visual-only version')
  .option('--story-only', 'Only generate the story script, do not render')
  .option('--fast', 'Skip LLM agents, use default template script')
  .option('--preview', 'Open HyperFrames Studio for preview')
  .option('--duration <seconds>', 'Target video duration in seconds', '35')
  .option('-v, --verbose', 'Show detailed intermediate results')
  .option('--save-intermediates', 'Save intermediate JSON files to output directory')
  .action(async (projectPath, options) => {
    console.log(chalk.cyan.bold('\n  Project2Video'));
    console.log(chalk.gray('  Turn your project into a promotional video\n'));

    try {
      await runPipeline({
        projectPath,
        assetsPath: options.assets,
        template: options.template,
        outputPath: options.output,
        skipTTS: !options.tts,
        storyOnly: options.storyOnly,
        fast: options.fast,
        preview: options.preview,
        duration: parseInt(options.duration, 10),
        verbose: options.verbose,
        saveIntermediates: options.saveIntermediates,
      });
    } catch (err) {
      console.error(chalk.red(`\n  Error: ${err.message}`));
      if (process.env.DEBUG) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });

program.parse();
