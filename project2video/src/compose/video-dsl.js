// All valid DSL element types
const VALID_DSL_TYPES = [
  'hero-image', 'video-clip', 'code-block', 'hero-title',
  'subtitle', 'text-list', 'star-cta', 'overlay-text',
];

export function convertToTimeline(story) {
  const elements = [];
  let currentTime = 0;

  for (const scene of story.scenes) {
    for (const shot of scene.shots) {
      // Prefer LLM-specified dsl_type, fall back to mapping logic
      const dslType = resolveDSLElement(shot);

      const element = {
        start: currentTime,
        duration: shot.duration,
        type: dslType,
        source: shot.asset || null,
        motion: shot.asset_usage?.motion || 'fade-in',
        overlay: shot.asset_usage?.overlay || null,
        narration: shot.narration_segment || '',
        scene_id: scene.id,
        shot_id: shot.id,
      };

      // Copy type-specific properties
      if (shot.asset_usage?.type === 'video') {
        element.trim = shot.asset_usage.trim || null;
      }
      if (shot.asset_usage?.type === 'text-animation' || dslType === 'code-block' || dslType === 'text-list') {
        element.text = shot.asset_usage?.text || '';
        element.textStyle = shot.asset_usage?.style || 'glow-pulse';
      }
      if (shot.asset_usage?.items) {
        element.items = shot.asset_usage.items;
      }
      if (shot.asset_usage?.type === 'image') {
        element.crop = shot.asset_usage.crop || 'full';
      }
      if (shot.asset_usage?.type === 'code') {
        element.codeHighlight = shot.asset_usage.code_highlight || null;
      }

      elements.push(element);
      currentTime += shot.duration;
    }
  }

  return {
    total_duration: currentTime,
    tone: story.tone || 'cinematic',
    music_style: story.music_style || 'minimal',
    elements,
  };
}

function resolveDSLElement(shot) {
  // Priority 1: LLM-specified dsl_type (if valid)
  if (shot.dsl_type && VALID_DSL_TYPES.includes(shot.dsl_type)) {
    return shot.dsl_type;
  }

  // Priority 2: Map from asset_usage type
  return mapToDSLElement(shot.asset_usage);
}

function mapToDSLElement(assetUsage) {
  if (!assetUsage) return 'hero-title';

  switch (assetUsage.type) {
    case 'image': return 'hero-image';
    case 'video': return 'video-clip';
    case 'code': return 'code-block';
    case 'text-animation': {
      // If items array is provided, use text-list
      if (assetUsage.items && assetUsage.items.length > 0) return 'text-list';
      const text = assetUsage.text || '';
      if (text.length <= 15 && text === text.toUpperCase()) return 'hero-title';
      if (text.length > 40) return 'text-list';
      return 'subtitle';
    }
    default: return 'subtitle';
  }
}
