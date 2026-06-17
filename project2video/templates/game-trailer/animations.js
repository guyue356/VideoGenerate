export const handlers = {
  renderHeroTitle(element, template) {
    const style = template.styles?.hero || {};
    const id = element.shot_id || `hero-title-${element.start}`;
    return {
      html: `<h1 id="${id}" class="clip hero-title"
                  data-start="${element.start}"
                  data-duration="${element.duration}"
                  data-track-index="0"
                  style="font-size:${style.font_size || '5rem'};color:${style.color || '#00ffff'};text-shadow:${style.text_shadow || '0 0 30px #ff00ff'};font-family:${style.font_family || 'monospace'}">
               ${element.text || 'Title'}
             </h1>`,
      timeline: `
        tl.from("#${id}", {
          opacity: 0, scale: 0.8,
          duration: 0.8, ease: "power3.out"
        }, ${element.start});
      `,
    };
  },

  renderSubtitle(element, template) {
    const style = template.styles?.body || {};
    const id = element.shot_id || `subtitle-${element.start}`;
    return {
      html: `<div id="${id}" class="clip subtitle"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="font-size:${style.font_size || '2.5rem'};color:${style.color || '#fff'};font-family:${style.font_family || 'monospace'}">
               ${element.text || ''}
             </div>`,
      timeline: `
        tl.from("#${id}", {
          opacity: 0, y: 30,
          duration: 0.6, ease: "power2.out"
        }, ${element.start});
      `,
    };
  },

  renderVideoClip(element, template) {
    const id = element.shot_id || `video-${element.start}`;
    return {
      html: `<video id="${id}" class="clip video-clip"
                    data-start="${element.start}"
                    data-duration="${element.duration}"
                    data-track-index="0"
                    src="${element.source}"
                    muted playsinline
                    style="width:100%;height:100%;object-fit:cover;">
             </video>
             ${element.overlay ? `<div class="overlay-text" style="font-size:2rem;color:#00ffff;text-shadow:0 0 15px #00ffff;font-family:monospace;">${element.overlay}</div>` : ''}`,
      timeline: '',
    };
  },

  renderHeroImage(element, template) {
    const id = element.shot_id || `image-${element.start}`;
    return {
      html: `<div id="${id}" class="clip hero-image"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0">
               <img src="${element.source}" style="width:100%;height:100%;object-fit:cover;" />
               ${element.overlay ? `<div class="overlay-text" style="font-size:3rem;color:#fff;text-shadow:0 0 20px #00ffff;font-family:monospace;">${element.overlay}</div>` : ''}
             </div>`,
      timeline: element.motion === 'zoom-in'
        ? `tl.from("#${id} img", { scale: 1.15, duration: ${element.duration}, ease: "none" }, ${element.start});`
        : element.motion === 'ken-burns'
          ? `tl.from("#${id} img", { scale: 1.1, x: -30, duration: ${element.duration}, ease: "none" }, ${element.start});`
          : '',
    };
  },

  renderCodeBlock(element, template) {
    const style = template.styles?.code || {};
    const id = element.shot_id || `code-${element.start}`;
    return {
      html: `<div id="${id}" class="clip code-block"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="background:${style.bg || 'rgba(0,0,0,0.9)'};padding:60px;">
               <pre style="font-size:${style.font_size || '1.2rem'};color:${style.color || '#00ffff'};font-family:monospace;white-space:pre-wrap;max-width:80%;line-height:1.6;">
${escapeHtml(element.text || '// code')}
               </pre>
             </div>`,
      timeline: `
        tl.from("#${id}", {
          opacity: 0, x: -30,
          duration: 0.5, ease: "power2.out"
        }, ${element.start});
      `,
    };
  },

  renderStarCTA(element, template) {
    const style = template.styles?.cta || {};
    const id = element.shot_id || `cta-${element.start}`;
    return {
      html: `<div id="${id}" class="clip star-cta"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0">
               <div class="cta-text" style="font-size:${style.font_size || '3.5rem'};color:${style.color || '#ffaa00'};text-shadow:${style.text_shadow || '0 0 30px #ffaa00'};font-family:monospace;">
                 ⭐ Star on GitHub
               </div>
               ${element.source ? `<div class="cta-url" style="font-size:1.5rem;color:#aaa;font-family:monospace;">${element.source}</div>` : ''}
             </div>`,
      timeline: `
        tl.from("#${id}", {
          opacity: 0, scale: 0.5,
          duration: 0.8, ease: "back.out(1.7)"
        }, ${element.start});
      `,
    };
  },

  renderTextList(element, template) {
    const items = (element.text || '').split(/[·|,]/).map(s => s.trim()).filter(Boolean);
    const id = element.shot_id || `text-list-${element.start}`;
    const itemsHtml = items.map((item, i) =>
      `<div class="list-item" style="font-size:2rem;color:#fff;font-family:monospace;">${item}</div>`
    ).join('');

    return {
      html: `<div id="${id}" class="clip text-list"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0">
               ${itemsHtml}
             </div>`,
      timeline: items.map((_, i) =>
        `tl.from("#${id} .list-item:nth-child(${i + 1})", { opacity: 0, x: -20, duration: 0.4 }, ${element.start} + ${i * 0.3});`
      ).join('\n'),
    };
  },

  renderOverlayText(element, template) {
    const id = element.shot_id || `overlay-${element.start}`;
    return {
      html: `<div id="${id}" class="overlay-text"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="font-size:2rem;color:#00ffff;text-shadow:0 0 15px #00ffff;font-family:monospace;">
               ${element.text || ''}
             </div>`,
      timeline: `
        tl.from("#${id}", {
          opacity: 0, y: -10,
          duration: 0.4, ease: "power2.out"
        }, ${element.start});
      `,
    };
  },
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
