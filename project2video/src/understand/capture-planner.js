import { askLLM } from '../llm/client.js';
import { extractReadmeImageUrls } from './asset-collector.js';

/**
 * Generate a capture plan — AI decides what assets the video needs.
 *
 * @param {Object} repoProfile - Repository analysis result
 * @param {Object} assetManifest - Current asset manifest
 * @param {Object} discovery - Feature discovery result
 * @param {string|null} fullReadme - Full README content
 * @returns {Object} Capture plan
 */
export async function generateCapturePlan(repoProfile, assetManifest, discovery, fullReadme) {
  // Extract image URLs from README
  const readmeImages = fullReadme ? extractReadmeImageUrls(fullReadme) : [];

  const systemPrompt = `You are a video production asset planner. Your job is to determine what visual assets are needed to create a compelling 30-45 second promotional video for a software project.

You must plan assets for these video slots:
- hook (3-5s): The opening shot that grabs attention. Needs a striking visual.
- reveal (8-15s): The main showcase. Needs the BEST visual asset — a screenshot, demo, or hero image.
- details (8-12s): Technical highlights. Can use code snippets, text animations, or additional screenshots.
- cta (3-5s): Call to action. Usually text-based, may use a logo or star animation.

Rules:
- Be realistic about what's available — don't request assets that don't exist
- For "source" field: use "existing" if the asset is already in the available list, "readme" if it's a URL from README, "text" if it can be generated as text
- For code snippets, set type to "code" and include the actual code in the "text" field
- Prioritize using existing assets over requesting new ones
- If no good asset exists for a slot, mark it as a gap`;

  const userPrompt = `Plan the visual assets for a promotional video.

## Project
Name: ${repoProfile.name}
Type: ${repoProfile.type}
Language: ${repoProfile.language}
Tagline: ${repoProfile.tagline || 'N/A'}

## Key Capabilities
${discovery?.core_capabilities?.slice(0, 5).map(c => `- ${c.capability}`).join('\n') || '- Core feature'}

## Available Assets
Images: ${assetManifest.images.map(i => `${i.path} (${i.resolution}, ${i.role_estimate})`).join(', ') || 'none'}
Videos: ${assetManifest.videos.map(v => `${v.path} (${v.role_estimate})`).join(', ') || 'none'}

## Asset Coverage
${JSON.stringify(Object.fromEntries(
  Object.entries(assetManifest.coverage).map(([k, v]) => [k, { has: v.has, best: v.best }])
), null, 2)}

## README Images (URLs found in project README)
${readmeImages.length > 0 ? readmeImages.map(u => `- ${u}`).join('\n') : '- none found'}

## Tech Stack
${repoProfile.tech_stack.map(t => `- ${t.name}`).join('\n') || '- not detected'}

Respond in JSON:
{
  "assets": [
    {
      "slot": "hook|reveal|details|cta",
      "type": "image|video|code|text",
      "source": "existing|readme|text",
      "path": "filename if existing, null otherwise",
      "url": "URL if from README, null otherwise",
      "text": "text content if type is code/text, null otherwise",
      "description": "what this asset shows and why"
    }
  ],
  "gaps": ["slot that has no good asset"],
  "recommendations": ["suggestion for improving assets"]
}`;

  try {
    const plan = await askLLM({ systemPrompt, userPrompt, agent: 'Capture Planner' });
    return plan;
  } catch (err) {
    // Fallback: build a basic plan from existing assets
    return buildFallbackCapturePlan(repoProfile, assetManifest, discovery, readmeImages);
  }
}

function buildFallbackCapturePlan(repoProfile, assetManifest, discovery, readmeImages) {
  const assets = [];
  const gaps = [];

  const bestImage = assetManifest.images.sort((a, b) => b.quality_score - a.quality_score)[0];
  const bestVideo = assetManifest.videos[0];

  // Hook slot
  if (bestImage) {
    assets.push({
      slot: 'hook',
      type: 'image',
      source: 'existing',
      path: bestImage.path,
      url: null,
      text: null,
      description: 'Project screenshot for opening shot',
    });
  } else {
    gaps.push('hook');
  }

  // Reveal slot
  if (bestVideo) {
    assets.push({
      slot: 'reveal',
      type: 'video',
      source: 'existing',
      path: bestVideo.path,
      url: null,
      text: null,
      description: 'Demo video for main showcase',
    });
  } else if (bestImage) {
    assets.push({
      slot: 'reveal',
      type: 'image',
      source: 'existing',
      path: bestImage.path,
      url: null,
      text: null,
      description: 'Project screenshot for showcase (reuse with different crop)',
    });
  } else if (readmeImages.length > 0) {
    assets.push({
      slot: 'reveal',
      type: 'image',
      source: 'readme',
      path: null,
      url: readmeImages[0],
      text: null,
      description: 'Image from project README',
    });
  } else {
    gaps.push('reveal');
  }

  // Details slot — prefer code/text
  const techItems = repoProfile.tech_stack.slice(0, 5).map(t => t.name);
  if (techItems.length > 0) {
    assets.push({
      slot: 'details',
      type: 'text',
      source: 'text',
      path: null,
      url: null,
      text: techItems.join(' · '),
      description: 'Tech stack list',
    });
  } else if (repoProfile.description) {
    assets.push({
      slot: 'details',
      type: 'text',
      source: 'text',
      path: null,
      url: null,
      text: repoProfile.description,
      description: 'Project description',
    });
  } else {
    gaps.push('details');
  }

  // CTA slot — always text-based
  assets.push({
    slot: 'cta',
    type: 'text',
    source: 'text',
    path: null,
    url: null,
    text: '⭐ Star on GitHub',
    description: 'Call to action',
  });

  return { assets, gaps, recommendations: [] };
}
