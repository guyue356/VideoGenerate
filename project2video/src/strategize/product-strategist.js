import { askLLM } from '../llm/client.js';

export async function buildStrategy(repoProfile, discovery, assetManifest) {
  const systemPrompt = `You are a product marketing strategist for tech products. Your job is to create a video strategy that answers "Why should I care?" — not just "What does it do?"

Rules:
- Focus on emotional hooks, not feature lists
- Consider what the target audience actually desires
- Recommend the best story angle based on available assets
- Be specific about which assets to use where`;

  const userPrompt = `Create a video strategy for this project.

## Project Info
Name: ${repoProfile.name}
Type: ${repoProfile.type}
Language: ${repoProfile.language}
Tagline: ${repoProfile.tagline || 'N/A'}

## Core Capabilities (from code analysis)
${discovery?.core_capabilities?.map(c =>
  `- ${c.capability} (evidence: ${c.evidence}, confidence: ${c.confidence})`
).join('\n') || 'Not available'}

## User Value
${discovery?.likely_user_value?.map(v => `- ${v}`).join('\n') || 'Not available'}

## Surprising Features
${discovery?.surprising_features?.map(f => `- ${f}`).join('\n') || 'None found'}

## Positioning
${discovery?.positioning ? JSON.stringify(discovery.positioning, null, 2) : 'Not available'}

## Available Assets
- Images: ${assetManifest.images.length} (${assetManifest.images.map(i => i.role_estimate).join(', ')})
- Videos: ${assetManifest.videos.length}
- Audio: ${assetManifest.audio.length}
- Asset Score: ${assetManifest.asset_score}/100
- Coverage: ${JSON.stringify(Object.fromEntries(
    Object.entries(assetManifest.coverage).map(([k, v]) => [k, v.has])
  ))}

Respond in JSON:
{
  "persona": {
    "name": "target user description",
    "pain": "what frustrates them",
    "desire": "what they want"
  },
  "value_prop": "one-line value proposition (≤15 Chinese characters or ≤10 English words)",
  "emotional_hook": "3-second hook that grabs attention (curiosity|surprise|resonance|aspiration)",
  "story_angle": "problem-solution | magic-showcase | contrast | tech-reveal",
  "asset_plan": {
    "hook": "asset-path or null",
    "reveal": "asset-path or null",
    "details": ["asset-path"],
    "cta": "asset-path or null"
  },
  "template_recommendation": "game-trailer | product-hunter | minimal"
}`;

  try {
    return await askLLM({ systemPrompt, userPrompt, agent: 'Product Strategist' });
  } catch (err) {
    // Fallback strategy
    return buildFallbackStrategy(repoProfile, assetManifest);
  }
}

function buildFallbackStrategy(repoProfile, assetManifest) {
  const bestImage = assetManifest.images.sort((a, b) => b.quality_score - a.quality_score)[0];
  const bestVideo = assetManifest.videos[0];

  return {
    persona: {
      name: repoProfile.type === 'game' ? 'Gamer' : 'Developer',
      pain: 'Looking for something new and interesting',
      desire: 'A cool tool to use or share',
    },
    value_prop: repoProfile.tagline || repoProfile.name,
    emotional_hook: 'curiosity',
    story_angle: bestVideo ? 'magic-showcase' : 'problem-solution',
    asset_plan: {
      hook: bestImage?.path || null,
      reveal: bestVideo?.path || bestImage?.path || null,
      details: assetManifest.images.slice(1, 4).map(i => i.path),
      cta: null,
    },
    template_recommendation: repoProfile.type === 'game' ? 'game-trailer' : 'minimal',
  };
}
