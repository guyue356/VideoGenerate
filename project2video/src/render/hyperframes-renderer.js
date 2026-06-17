import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const FFMPEG_DIR = 'D:\\hsj\\Github\\ffmpeg\\bin';

export async function renderVideo({ compositionPath, outputDir, projectRoot, projectName }) {
  mkdirSync(outputDir, { recursive: true });

  if (!existsSync(compositionPath)) {
    throw new Error(`Composition file not found: ${compositionPath}`);
  }

  const hasHyperframes = checkHyperframes();

  if (!hasHyperframes) {
    console.warn('\n  Warning: HyperFrames CLI not found.');
    console.warn('  Install with: npx hyperframes init');
    console.warn('  HTML composition generated but not rendered to MP4.\n');
    return {
      outputPath: compositionPath,
      rendered: false,
      message: 'HyperFrames not installed. Open the HTML file in a browser to preview.',
    };
  }

  const videoName = projectName ? `${projectName}.mp4` : 'video.mp4';
  const outputPath = join(outputDir, videoName);
  // Initialize a minimal HyperFrames project in the project root (parent of renders/)
  initHyperFramesProject(projectRoot);

  try {
    console.log(`  Rendering...`);

    // Use absolute path for output to avoid working directory issues
    execSync(
      `npx hyperframes render "${projectRoot}" -o "${outputPath}"`,
      {
        stdio: 'inherit',
        timeout: 300000,
        env: { ...process.env, PATH: `${FFMPEG_DIR};${process.env.PATH}` },
      }
    );

    return { outputPath, rendered: true };
  } catch (err) {
    console.warn(`\n  Warning: HyperFrames render failed: ${err.message}`);
    console.warn('  The HTML composition is ready for manual preview.\n');
    return {
      outputPath: compositionPath,
      rendered: false,
      message: 'Render failed. Open the HTML file in a browser to preview.',
    };
  }
}

function initHyperFramesProject(projectRoot) {
  // Create a minimal hyperframes.json if it doesn't exist
  const configPath = join(projectRoot, 'hyperframes.json');
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify({
      name: 'project2video-output',
      version: '1.0.0',
    }, null, 2));
  }
}

function checkHyperframes() {
  try {
    execSync('npx hyperframes --version', {
      stdio: 'pipe',
      env: { ...process.env, PATH: `${FFMPEG_DIR};${process.env.PATH}` },
    });
    return true;
  } catch {
    return false;
  }
}
