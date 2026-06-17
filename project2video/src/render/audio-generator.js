import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, resolve } from 'path';
import OpenAI from 'openai';
import { CONFIG } from '../config.js';

// TTS Provider 配置
const TTS_PROVIDERS = {
  mimo: {
    baseURL: 'https://api.minimax.chat/v1',
    model: 'mimo-v2.5-tts',
    envKey: 'MIMO_API_KEY',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'tts-1',
    envKey: 'OPENAI_API_KEY',
  },
};

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
      // Generate TTS
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

function getTTSConfig() {
  const provider = process.env.TTS_PROVIDER || 'mimo';
  const config = TTS_PROVIDERS[provider] || TTS_PROVIDERS.mimo;

  return {
    provider,
    apiKey: process.env[config.envKey],
    baseURL: process.env.TTS_BASE_URL || config.baseURL,
    model: process.env.TTS_MODEL || config.model,
    voice: process.env.TTS_VOICE || 'alloy',
  };
}

async function generateTTS(text, outputPath) {
  const { provider, apiKey, baseURL, model, voice } = getTTSConfig();

  if (!apiKey) {
    const config = TTS_PROVIDERS[provider] || TTS_PROVIDERS.mimo;
    console.warn(`  Warning: ${config.envKey} not set, skipping TTS generation`);
    return;
  }

  console.log(`  TTS: using ${provider} (${model}, voice: ${voice})`);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    const response = await client.audio.speech.create({
      model,
      voice,
      input: text,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath.replace('.wav', '.mp3'), buffer);
  } catch (err) {
    console.warn(`  Warning: TTS generation failed: ${err.message}`);
  }
}
