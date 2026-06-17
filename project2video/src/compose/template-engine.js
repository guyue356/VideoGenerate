export function renderComposition(timeline, template) {
  const { manifest, styleCss, animations } = template;
  const { total_duration, elements, tone, music_style } = timeline;

  // Render each element using the template's handlers
  const renderedParts = elements.map(el => {
    const handlerName = manifest.dsl_handlers?.[el.type];
    const handler = animations.handlers?.[handlerName];

    if (handler) {
      return handler(el, manifest);
    }

    // Fallback: generic renderer
    return fallbackRenderer(el, manifest);
  });

  // Collect HTML and timeline JS
  const htmlParts = renderedParts.map(r => r.html).join('\n');
  const timelineParts = renderedParts.map(r => r.timeline).filter(Boolean).join('\n');

  // Build the full composition
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920, height=1080">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1920px; height: 1080px; overflow: hidden; }
    #stage { width: 1920px; height: 1080px; position: relative; }
    .clip { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    .overlay-text {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10;
    }
    ${styleCss}
  </style>
</head>
<body>
  <div id="stage" data-composition-id="promo" data-start="0" data-duration="${total_duration}"
       data-width="1920" data-height="1080"
       style="${manifest.bg_style || 'background: #0a0a0f'}">

    ${htmlParts}

    <audio id="bgm-audio" data-start="0" data-duration="${total_duration}"
           data-track-index="99" data-volume="0.4"
           src="audio/bgm.wav"></audio>

    <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      (function() {
        const tl = gsap.timeline({ paused: true });
        ${timelineParts}
        window.__timelines.promo = tl;
      })();
    </script>
  </div>
</body>
</html>`;
}

function fallbackRenderer(element, manifest) {
  const { type, start, duration, source, motion, overlay, text, text_style, shot_id } = element;

  const motionCSS = getMotionCSS(motion);
  const trackIndex = 0;
  const id = shot_id || `el-${type}-${start}`;

  switch (type) {
    case 'hero-title':
      return {
        html: `<h1 id="${id}" class="clip hero-title" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}"
                    style="display:flex;align-items:center;justify-content:center;font-size:5rem;color:#fff;font-family:monospace;text-shadow:0 0 30px #00ffff;">
                 ${text || 'Title'}
               </h1>`,
        timeline: `tl.from("#${id}", { opacity: 0, scale: 0.8, duration: 0.8, ease: "power3.out" }, ${start});`,
      };

    case 'subtitle':
      return {
        html: `<div id="${id}" class="clip subtitle" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}"
                     style="display:flex;align-items:center;justify-content:center;font-size:2.5rem;color:#eee;font-family:monospace;">
                 ${text || ''}
               </div>`,
        timeline: `tl.from("#${id}", { opacity: 0, y: 30, duration: 0.6 }, ${start});`,
      };

    case 'hero-image':
      return {
        html: `<div id="${id}" class="clip" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}">
                 <img src="${source}" style="width:100%;height:100%;object-fit:cover;" />
                 ${overlay ? `<div class="overlay-text" style="font-size:3rem;color:#fff;text-shadow:0 0 20px #00ffff;font-family:monospace;">${overlay}</div>` : ''}
               </div>`,
        timeline: motion === 'zoom-in'
          ? `tl.from("#${id} img", { scale: 1.1, duration: ${duration}, ease: "none" }, ${start});`
          : '',
      };

    case 'video-clip':
      return {
        html: `<video id="${id}" class="clip" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}"
                      src="${source}" muted playsinline
                      style="width:100%;height:100%;object-fit:cover;"></video>`,
        timeline: '',
      };

    case 'code-block':
      return {
        html: `<div id="${id}" class="clip code-block" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}"
                     style="display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);padding:60px;">
                 <pre style="font-size:1.2rem;color:#00ffff;font-family:monospace;white-space:pre-wrap;max-width:80%;">${escapeHtml(text || '// code')}</pre>
               </div>`,
        timeline: `tl.from("#${id}", { opacity: 0, x: -30, duration: 0.5 }, ${start});`,
      };

    case 'star-cta':
      return {
        html: `<div id="${id}" class="clip star-cta" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}"
                     style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;">
                 <div style="font-size:4rem;color:#fff;text-shadow:0 0 30px #ffaa00;">⭐ Star on GitHub</div>
                 <div style="font-size:1.5rem;color:#aaa;font-family:monospace;">${source || ''}</div>
               </div>`,
        timeline: `tl.from("#${id}", { opacity: 0, scale: 0.5, duration: 0.8, ease: "back.out(1.7)" }, ${start});`,
      };

    default:
      return {
        html: `<div id="${id}" class="clip" data-start="${start}" data-duration="${duration}" data-track-index="${trackIndex}"></div>`,
        timeline: '',
      };
  }
}

function getMotionCSS(motion) {
  switch (motion) {
    case 'zoom-in': return 'animation: zoom-in 3s ease-out forwards;';
    case 'slide-up': return 'animation: slide-up 0.5s ease-out;';
    case 'fade-in': return 'animation: fade-in 0.8s ease-out;';
    default: return '';
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
