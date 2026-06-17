import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, resolve } from 'path';
import OpenAI from 'openai';
import { CONFIG } from '../config.js';

export async function generateAudio({ story, assetManifest, outputDir, skipTTS }) {
  mkdirSync(outputDir, { recursive: true });

  // Handle BGM
  const userBgm = assetManifest.audio.find(a => a.type === 'bgm');
  if (userBgm) {
    // Copy user BGM to output
    const src = resolve(outputDir, '..', '..', userBgm.path);
    if (existsSync(src)) {
      cpSync(src, join(outputDir, 'bgm.wav'));
    }
  } else {
    // Copy preset BGM based on music_style
    const style = story.music_style || 'minimal';
    const presetsDir = CONFIG.getPresetsDir();
    const presetBgm = join(presetsDir, 'bgm', `${style}.wav`);
    if (existsSync(presetBgm)) {
      cpSync(presetBgm, join(outputDir, 'bgm.wav'));
    } else {
      // Use any available preset
      const fallback = join(presetsDir, 'bgm', 'electronic.wav');
      if (existsSync(fallback)) {
        cpSync(fallback, join(outputDir, 'bgm.wav'));
      }
    }
  }

  // Handle TTS narration
  if (!skipTTS) {
    const userVoice = assetManifest.audio.find(a => a.type === 'voice');
    if (userVoice) {
      // Use user-provided voice
      const src = resolve(outputDir, '..', '..', userVoice.path);
      if (existsSync(src)) {
        cpSync(src, join(outputDir, 'narration.wav'));
      }
    } else {
      // Generate TTS with OpenAI
      const narration = buildNarrationText(story);
      if (narration) {
        await generateTTS(narration, join(outputDir, 'narration.wav'));
      }
    }
  }
}

function buildNarrationText(story) {
  return story.scenes
    .map(scene => scene.narration)
    .filter(Boolean)
    .join(' ');
}

async function generateTTS(text, outputPath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('  Warning: OPENAI_API_KEY not set, skipping TTS generation');
    return;
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath.replace('.wav', '.mp3'), buffer);
  } catch (err) {
    console.warn(`  Warning: TTS generation failed: ${err.message}`);
  }
}
