import { askLLM } from '../llm/client.js';

// DSL element types available in templates, with visual descriptions for LLM
const DSL_TYPES_GUIDE = `
Available visual element types (dsl_type):
- hero-image: Full-screen image. Use for screenshots, photos, demos. Supports motion: zoom-in, ken-burns, slide-left, slide-right.
- hero-title: Large centered text (5rem). Use for ONE key phrase or word that needs maximum impact. Use sparingly — max 1 per scene.
- subtitle: Medium text (2rem). Use for secondary text, descriptions, short sentences. Good for following a hero-title.
- text-list: Multiple items displayed as a list. Use for enumerating features, tech stack, capabilities. Best when you have 2-5 short items.
- code-block: Code snippet with monospace font and dark background. Use for showing actual code, commands, or technical syntax.
- star-cta: Call-to-action with star emoji. Use ONLY in the final CTA scene for "Star on GitHub" type actions.
- overlay-text: Text overlaid on an image. Use the "overlay" field in asset_usage instead of this type directly.
- video-clip: Full-screen video playback. Use for demo recordings, gameplay footage.

VISUAL RHYTHM RULES:
- Never use the same dsl_type for more than 2 consecutive shots
- Alternate between different visual types to create rhythm
- Example good sequence: hero-image → hero-image → hero-title → text-list → code-block → star-cta
- Example bad sequence: hero-image → hero-image → hero-image → hero-image → hero-title → hero-title → hero-title
`;

export async function generateStory({ repoProfile, discovery, strategy, assetManifest, template, duration, fast }) {
  if (fast) {
    return generateFastStory(repoProfile, assetManifest, duration);
  }

  const systemPrompt = `You are a short-form video screenwriter AND storyboard artist. You create 30-45 second promotional videos that are compelling and shareable.

Rules:
- Each Scene contains 1-3 Shots
- Each Shot MUST specify: dsl_type, asset source, camera motion, duration
- One asset can be reused across multiple Shots with different crops/motions
- Narration is per-Scene (not per-Shot), but narration_segment is per-Shot
- Hook must grab attention in ≤3 seconds
- Use scenes and storytelling, NOT feature lists
- Prefer real assets over text-only animations
- If assets are limited, use creative text animations to fill gaps
- VARY the dsl_type across shots — never use the same type for 3+ consecutive shots

${DSL_TYPES_GUIDE}`;

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

## Scene Structure
Choose the best narrative arc for this project. Pick ONE of these structures:

**Option A: Classic (hook → reveal → details → cta)**
1. Hook (3-5s): Attention-grabbing opener
2. Reveal (8-15s): Core experience showcase — use the BEST asset
3. Details (8-12s): Technical highlights / differentiation
4. CTA (3-5s): Call to action

**Option B: Problem-Solution (problem → solution → proof → cta)**
1. Problem (3-5s): Show the pain point
2. Solution (8-12s): How this project solves it
3. Proof (6-10s): Evidence, stats, or demo
4. CTA (3-5s): Call to action

**Option C: Story (setup → journey → result → cta)**
1. Setup (3-5s): Set the scene
2. Journey (10-15s): Show the process/workflow
3. Result (5-8s): Show the outcome
4. CTA (3-5s): Call to action

**Option D: Tech Deep-dive (overview → architecture → code → cta)**
1. Overview (3-5s): What it does
2. Architecture (8-12s): How it works (diagrams, flow)
3. Code (6-10s): Key code snippets
4. CTA (3-5s): Call to action

Pick the structure that best fits the project and available assets. Use the "purpose" field to indicate each scene's role.

Respond in JSON:
{
  "hook": "the one-line hook text",
  "scenes": [
    {
      "id": "scene-id",
      "purpose": "hook|problem|solution|proof|setup|journey|result|overview|architecture|code|reveal|details|cta",
      "narration": "full narration for this scene (all shots combined)",
      "shots": [
        {
          "id": "shot-1",
          "duration": 3,
          "dsl_type": "hero-image|hero-title|subtitle|text-list|code-block|star-cta",
          "asset": "asset-path or null",
          "asset_usage": {
            "type": "image|video|code|text-animation",
            "crop": "center|left|right|full (for images)",
            "trim": "start-end (for videos, e.g. 0:10-0:16)",
            "motion": "zoom-in|zoom-out|slide-left|slide-right|slide-up|static|ken-burns|fade-in|scale-up",
            "overlay": "text to overlay on the asset, or null",
            "text": "text content (for code-block or text-animation, use this to pass the code/text)",
            "items": ["item1", "item2"] // for text-list type, use this array instead of text
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
  const techItems = repoProfile.tech_stack.slice(0, 5).map(t =>
    t.version && t.version !== '*' ? `${t.name}@${t.version}` : t.name
  );

  const scenes = [];
  let remaining = duration;

  // Hook — hero-image or hero-title
  const hookDuration = Math.min(5, remaining);
  scenes.push({
    id: 'hook',
    purpose: 'hook',
    narration: tagline || name,
    shots: [{
      id: 'hook-1',
      duration: hookDuration,
      dsl_type: bestImage ? 'hero-image' : 'hero-title',
      asset: bestImage?.path || null,
      asset_usage: bestImage
        ? { type: 'image', crop: 'center', motion: 'zoom-in', overlay: name.toUpperCase() }
        : { type: 'text-animation', text: name.toUpperCase(), style: 'glow-pulse', motion: 'fade-in' },
      narration_segment: tagline || name,
    }],
  });
  remaining -= hookDuration;

  // Reveal — hero-image or subtitle
  const revealDuration = Math.min(10, remaining);
  if (revealDuration > 0) {
    scenes.push({
      id: 'reveal',
      purpose: 'reveal',
      narration: tagline || `Experience ${name}`,
      shots: [{
        id: 'reveal-1',
        duration: revealDuration,
        dsl_type: bestVideo ? 'video-clip' : bestImage ? 'hero-image' : 'subtitle',
        asset: bestVideo?.path || bestImage?.path || null,
        asset_usage: bestVideo
          ? { type: 'video', motion: 'static', overlay: null }
          : bestImage
            ? { type: 'image', crop: 'full', motion: 'ken-burns', overlay: null }
            : { type: 'text-animation', text: tagline || name, style: 'typewriter', motion: 'fade-in' },
        narration_segment: tagline || `Experience ${name}`,
      }],
    });
    remaining -= revealDuration;
  }

  // Details — vary between text-list, code-block, subtitle
  const detailDuration = Math.min(12, remaining);
  if (detailDuration > 0 && techItems.length > 0) {
    const shots = [];
    const perShot = Math.floor(detailDuration / Math.min(techItems.length, 3));

    // First: text-list with all tech items
    shots.push({
      id: 'details-1',
      duration: Math.min(perShot, detailDuration),
      dsl_type: 'text-list',
      asset: null,
      asset_usage: {
        type: 'text-animation',
        text: techItems.slice(0, 5).join(' · '),
        items: techItems.slice(0, 5),
        style: 'typewriter',
        motion: 'slide-up',
      },
      narration_segment: `Built with ${techItems.join(', ')}`,
    });

    scenes.push({
      id: 'details',
      purpose: 'details',
      narration: `Built with ${techItems.join(', ')}`,
      shots,
    });
    remaining -= detailDuration;
  } else if (detailDuration > 0) {
    // No tech stack — use description or generic text
    const detailText = repoProfile.description || tagline || name;
    scenes.push({
      id: 'details',
      purpose: 'details',
      narration: detailText,
      shots: [{
        id: 'details-1',
        duration: detailDuration,
        dsl_type: 'subtitle',
        asset: null,
        asset_usage: { type: 'text-animation', text: detailText, style: 'typewriter', motion: 'fade-in' },
        narration_segment: detailText,
      }],
    });
    remaining -= detailDuration;
  }

  // CTA — star-cta
  const ctaDuration = Math.min(5, remaining);
  if (ctaDuration > 0) {
    scenes.push({
      id: 'cta',
      purpose: 'cta',
      narration: 'Star on GitHub',
      shots: [{
        id: 'cta-1',
        duration: ctaDuration,
        dsl_type: 'star-cta',
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
