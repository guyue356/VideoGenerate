import { mkdirSync, writeFileSync, existsSync, cpSync } from 'fs';
import { join, resolve } from 'path';
import OpenAI from 'openai';
import { CONFIG } from '../config.js';

// TTS Provider 配置
// MIMO 可用音色: Chloe, Mia, 冰糖, 茉莉
const TTS_PROVIDERS = {
  mimo: {
    baseURL: 'https://token-plan-cn.xiaomimimo.com/v1',
    model: 'mimo-v2.5-tts',
    envKey: 'MIMO_API_KEY',
    defaultVoice: 'Chloe',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'tts-1',
    envKey: 'OPENAI_API_KEY',
    defaultVoice: 'alloy',
  },
};

export async function generateAudio({ story, assetManifest, outputDir, skipTTS, bgmStyle }) {
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
    // Use user-selected style, or fall back to story's music_style, or default
    const style = bgmStyle || story.music_style || 'minimal';
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

  console.log(`  Audio: BGM ${existsSync(join(outputDir, 'bgm.wav')) ? '✓' : '✗'}, TTS ${skipTTS ? 'skipped' : 'pending'}`);

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
        await generateTTS(narration, outputDir);
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
    voice: process.env.TTS_VOICE || config.defaultVoice || 'alloy',
  };
}

async function generateTTS(text, outputDir) {
  const { provider, apiKey, baseURL, model, voice } = getTTSConfig();

  if (!apiKey) {
    const config = TTS_PROVIDERS[provider] || TTS_PROVIDERS.mimo;
    console.warn(`  Warning: ${config.envKey} not set, skipping TTS generation`);
    return null;
  }

  console.log(`  TTS: using ${provider} (${model}, voice: ${voice})`);

  const client = new OpenAI({ apiKey, baseURL });

  try {
    let buffer;
    let outputFile;

    if (provider === 'mimo') {
      // MIMO uses chat.completions API with audio parameter
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'user', content: '用自然的语气朗读以下文本' },
          { role: 'assistant', content: text },
        ],
        audio: { format: 'wav', voice },
      });

      const message = completion.choices[0].message;
      if (!message.audio || !message.audio.data) {
        throw new Error('No audio data in MIMO response');
      }
      buffer = Buffer.from(message.audio.data, 'base64');
      outputFile = join(outputDir, 'narration.wav');
      writeFileSync(outputFile, buffer);
    } else {
      // OpenAI-compatible TTS (audio.speech.create)
      const response = await client.audio.speech.create({
        model,
        voice,
        input: text,
        response_format: 'mp3',
      });
      buffer = Buffer.from(await response.arrayBuffer());
      outputFile = join(outputDir, 'narration.mp3');
      writeFileSync(outputFile, buffer);
    }

    console.log(`  TTS: saved to ${outputFile}`);
    return outputFile;
  } catch (err) {
    console.warn(`  Warning: TTS generation failed: ${err.message}`);
    return null;
  }
}
