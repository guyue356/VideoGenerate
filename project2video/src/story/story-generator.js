import { askLLM } from '../llm/client.js';

export async function generateStory({ repoProfile, discovery, strategy, assetManifest, template, duration, fast }) {
  if (fast) {
    return generateFastStory(repoProfile, assetManifest, duration);
  }

  const systemPrompt = `You are a short-form video screenwriter AND storyboard artist. You create 30-45 second promotional videos that are compelling and shareable.

Rules:
- Each Scene contains 1-3 Shots
- Each Shot MUST specify: asset source, camera motion, duration
- One asset can be reused across multiple Shots with different crops/motions
- Narration is per-Scene (not per-Shot), but narration_segment is per-Shot
- Hook must grab attention in ≤3 seconds
- Use scenes and storytelling, NOT feature lists
- Prefer real assets over text-only animations
- If assets are limited, use creative text animations to fill gaps`;

  const userPrompt = `Write a complete storyboard for a ${duration}-second promotional video.

## Project
Name: ${repoProfile.name}
Type: ${repoProfile.type}
Tagline: ${repoProfile.tagline || 'N/A'}

## Strategy
Value Prop: ${strategy?.value_prop || repoProfile.tagline || repoProfile.name}
Hook: ${strategy?.emotional_hook || 'curiosity'}
Angle: ${strategy?.story_angle || 'magic-showcase'}
Template: ${template}

## Key Capabilities
${discovery?.core_capabilities?.slice(0, 5).map(c => `- ${c.capability}`).join('\n') || '- Core feature of the project'}

## Surprising Features
${discovery?.surprising_features?.map(f => `- ${f}`).join('\n') || '- None'}

## Available Assets
Images:
${assetManifest.images.map(i => `- ${i.path} (${i.resolution}, role: ${i.role_estimate}, score: ${i.quality_score})`).join('\n') || '- None'}

Videos:
${assetManifest.videos.map(v => `- ${v.path} (role: ${v.role_estimate}, score: ${v.quality_score})`).join('\n') || '- None'}

Audio:
${assetManifest.audio.map(a => `- ${a.path} (type: ${a.type})`).join('\n') || '- None'}

## Asset Coverage
${JSON.stringify(Object.fromEntries(
  Object.entries(assetManifest.coverage).map(([k, v]) => [k, { has: v.has, best: v.best }])
), null, 2)}

## Fallback Plan (if assets missing)
${JSON.stringify(assetManifest.fallback_plan, null, 2)}

## Scene Structure (must follow this arc)
1. **Hook** (3-5s): One attention-grabbing moment
2. **Reveal** (8-15s): Core experience showcase — use the BEST asset here
3. **Details** (8-12s): Technical highlights / differentiation
4. **CTA** (3-5s): Action call — Star on GitHub / Try it

Respond in JSON:
{
  "hook": "the one-line hook text",
  "scenes": [
    {
      "id": "scene-id",
      "purpose": "hook|reveal|details|cta",
      "narration": "full narration for this scene (all shots combined)",
      "shots": [
        {
          "id": "shot-1",
          "duration": 3,
          "asset": "asset-path or null",
          "asset_usage": {
            "type": "image|video|code|text-animation",
            "crop": "center|left|right|full (for images)",
            "trim": "start-end (for videos, e.g. 0:10-0:16)",
            "motion": "zoom-in|zoom-out|slide-left|slide-right|slide-up|static|ken-burns|fade-in|scale-up",
            "overlay": "text to overlay on the asset, or null",
            "text": "text content (for text-animation type)",
            "style": "neon-flicker|typewriter|glow-pulse (for text-animation)"
          },
          "narration_segment": "this shot's portion of narration"
        }
      ]
    }
  ],
  "tone": "cinematic|playful|technical|epic",
  "music_style": "electronic|ambient|epic|minimal"
}`;

  try {
    const story = await askLLM({ systemPrompt, userPrompt, agent: 'Story Generator' });
    // Validate and fix shot durations to match target
    return validateStory(story, duration);
  } catch (err) {
    return generateFastStory(repoProfile, assetManifest, duration);
  }
}

function generateFastStory(repoProfile, assetManifest, duration) {
  const bestImage = assetManifest.images.sort((a, b) => b.quality_score - a.quality_score)[0];
  const bestVideo = assetManifest.videos[0];
  const name = repoProfile.name;
  const tagline = repoProfile.tagline || repoProfile.description || '';

  const scenes = [];
  let remaining = duration;

  // Hook
  const hookDuration = Math.min(5, remaining);
  scenes.push({
    id: 'hook',
    purpose: 'hook',
    narration: tagline || name,
    shots: [{
      id: 'hook-1',
      duration: hookDuration,
      asset: bestImage?.path || null,
      asset_usage: bestImage
        ? { type: 'image', crop: 'center', motion: 'zoom-in', overlay: name.toUpperCase() }
        : { type: 'text-animation', text: name.toUpperCase(), style: 'glow-pulse', motion: 'fade-in' },
      narration_segment: tagline || name,
    }],
  });
  remaining -= hookDuration;

  // Reveal
  const revealDuration = Math.min(12, remaining);
  if (revealDuration > 0) {
    scenes.push({
      id: 'reveal',
      purpose: 'reveal',
      narration: `Experience ${name}`,
      shots: [{
        id: 'reveal-1',
        duration: revealDuration,
        asset: bestVideo?.path || bestImage?.path || null,
        asset_usage: bestVideo
          ? { type: 'video', motion: 'static', overlay: null }
          : bestImage
            ? { type: 'image', crop: 'full', motion: 'ken-burns', overlay: null }
            : { type: 'text-animation', text: name, style: 'typewriter', motion: 'fade-in' },
        narration_segment: `Experience ${name}`,
      }],
    });
    remaining -= revealDuration;
  }

  // Details
  const detailDuration = Math.min(10, remaining);
  if (detailDuration > 0) {
    const techItems = repoProfile.tech_stack.slice(0, 3).map(t =>
      t.version && t.version !== '*' ? `${t.name}@${t.version}` : t.name
    );
    scenes.push({
      id: 'details',
      purpose: 'details',
      narration: `Built with ${techItems.join(', ')}`,
      shots: [{
        id: 'details-1',
        duration: detailDuration,
        asset: null,
        asset_usage: {
          type: 'text-animation',
          text: techItems.join(' · '),
          style: 'typewriter',
          motion: 'slide-up',
        },
        narration_segment: `Built with ${techItems.join(', ')}`,
      }],
    });
    remaining -= detailDuration;
  }

  // CTA
  const ctaDuration = Math.min(5, remaining);
  if (ctaDuration > 0) {
    scenes.push({
      id: 'cta',
      purpose: 'cta',
      narration: 'Star on GitHub',
      shots: [{
        id: 'cta-1',
        duration: ctaDuration,
        asset: null,
        asset_usage: {
          type: 'text-animation',
          text: '⭐ Star on GitHub',
          style: 'glow-pulse',
          motion: 'scale-up',
        },
        narration_segment: 'Star on GitHub',
      }],
    });
  }

  return {
    hook: tagline || name,
    scenes,
    tone: 'cinematic',
    music_style: repoProfile.type === 'game' ? 'electronic' : 'minimal',
  };
}

function validateStory(story, targetDuration) {
  if (!story.scenes || !Array.isArray(story.scenes)) {
    throw new Error('Invalid story: missing scenes array');
  }

  let totalDuration = 0;
  for (const scene of story.scenes) {
    if (!scene.shots || !Array.isArray(scene.shots)) {
      scene.shots = [{
        id: `${scene.id}-1`,
        duration: 5,
        asset: null,
        asset_usage: { type: 'text-animation', text: scene.id, style: 'glow-pulse', motion: 'fade-in' },
        narration_segment: scene.narration || scene.id,
      }];
    }
    for (const shot of scene.shots) {
      totalDuration += shot.duration || 3;
    }
  }

  // Scale if total duration is off by more than 20%
  if (Math.abs(totalDuration - targetDuration) > targetDuration * 0.2) {
    const scale = targetDuration / totalDuration;
    for (const scene of story.scenes) {
      for (const shot of scene.shots) {
        shot.duration = Math.max(2, Math.round(shot.duration * scale));
      }
    }
  }

  return story;
}
