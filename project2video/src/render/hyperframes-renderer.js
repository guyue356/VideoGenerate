import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, renameSync } from 'fs';
import { join, extname } from 'path';

const FFMPEG_DIR = 'D:\\hsj\\Github\\ffmpeg\\bin';

export async function renderVideo({ compositionPath, outputDir, projectRoot, projectName, audioDir }) {
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

    // Merge audio into the rendered video
    if (audioDir && existsSync(audioDir)) {
      await mergeAudio(outputPath, audioDir);
    }

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

/**
 * Find an audio file with the given base name, trying multiple extensions.
 */
function findAudioFile(dir, baseName) {
  const extensions = ['.wav', '.mp3', '.ogg', '.m4a'];
  for (const ext of extensions) {
    const filePath = join(dir, `${baseName}${ext}`);
    if (existsSync(filePath)) return filePath;
  }
  return null;
}

/**
 * Merge narration and/or BGM audio into the rendered video using FFmpeg.
 */
async function mergeAudio(videoPath, audioDir) {
  const narrationPath = findAudioFile(audioDir, 'narration');
  const bgmPath = findAudioFile(audioDir, 'bgm');

  if (!narrationPath && !bgmPath) {
    console.log('  Audio: no narration or BGM found, skipping merge');
    return;
  }

  const hasNarration = !!narrationPath;
  const hasBgm = !!bgmPath;

  console.log(`  Audio merge: narration=${hasNarration ? narrationPath : '✗'}, BGM=${hasBgm ? bgmPath : '✗'}`);

  const tempVideo = videoPath.replace(/\.mp4$/, '.novideo.mp4');
  const tempMerged = videoPath.replace(/\.mp4$/, '.tmp.mp4');

  try {
    // Step 1: Strip original audio from the rendered video
    // HyperFrames may embed broken/silent audio from HTML <audio> references
    console.log('  Audio merge: stripping original audio track...');
    execSync(
      `"${getFfmpeg()}" -y -i "${videoPath}" -c:v copy -an "${tempVideo}"`,
      { stdio: 'pipe', timeout: 60000 }
    );

    // Step 2: Merge our audio into the stripped video
    let ffmpegCmd;

    if (hasNarration && hasBgm) {
      // Mix narration (full volume) with BGM (reduced volume)
      // Use normalize=0 to prevent amix from reducing volume
      ffmpegCmd = `"${getFfmpeg()}" -y -i "${tempVideo}" -i "${narrationPath}" -i "${bgmPath}" ` +
        `-filter_complex "` +
        `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0[narr];` +
        `[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.25[bgm];` +
        `[narr][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]` +
        `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${tempMerged}"`;
    } else if (hasNarration) {
      ffmpegCmd = `"${getFfmpeg()}" -y -i "${tempVideo}" -i "${narrationPath}" ` +
        `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${tempMerged}"`;
    } else {
      ffmpegCmd = `"${getFfmpeg()}" -y -i "${tempVideo}" -i "${bgmPath}" ` +
        `-filter_complex "[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.3[bgm]" ` +
        `-map 0:v -map "[bgm]" -c:v copy -c:a aac -b:a 192k -shortest "${tempMerged}"`;
    }

    console.log('  Audio merge: mixing audio tracks...');
    execSync(ffmpegCmd, { stdio: 'pipe', timeout: 120000 });

    // Replace original with merged version
    renameSync(tempMerged, videoPath);
    console.log('  Audio merge: done ✓');

    // Clean up temp file
    try { unlinkSync(tempVideo); } catch {}
  } catch (err) {
    console.warn(`  Audio merge failed: ${err.message}`);
    try { unlinkSync(tempVideo); } catch {}
    try { unlinkSync(tempMerged); } catch {}
  }
}

function getFfmpeg() {
  return join(FFMPEG_DIR, 'ffmpeg.exe');
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
