export function convertToTimeline(story) {
  const elements = [];
  let currentTime = 0;

  for (const scene of story.scenes) {
    for (const shot of scene.shots) {
      const element = {
        start: currentTime,
        duration: shot.duration,
        type: mapToDSLElement(shot.asset_usage),
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
      if (shot.asset_usage?.type === 'text-animation') {
        element.text = shot.asset_usage.text || '';
        element.textStyle = shot.asset_usage.style || 'glow-pulse';
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

function mapToDSLElement(assetUsage) {
  if (!assetUsage) return 'hero-title';

  switch (assetUsage.type) {
    case 'image': return 'hero-image';
    case 'video': return 'video-clip';
    case 'code': return 'code-block';
    case 'text-animation': {
      const text = assetUsage.text || '';
      if (text.length <= 15 && text === text.toUpperCase()) return 'hero-title';
      if (text.length > 40) return 'text-list';
      return 'subtitle';
    }
    default: return 'subtitle';
  }
}
