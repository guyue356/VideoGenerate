export const handlers = {
  renderHeroTitle(element, template) {
    const style = template.styles?.hero || {};
    const id = element.shot_id || `hero-title-${element.start}`;
    const end = element.start + element.duration;
    const text = element.text || 'Title';
    return {
      html: `<div id="${id}" class="clip"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                 <!-- 背景层：渐变 + 网格 -->
                 <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 70%);"></div>
                 <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px, transparent 1px);background-size:60px 60px;"></div>
                 <!-- 装饰线 -->
                 <div style="position:absolute;top:50%;left:8%;width:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);"></div>
                 <div style="position:absolute;top:50%;right:8%;width:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);"></div>
                 <!-- 角标 -->
                 <div style="position:absolute;top:40px;left:40px;width:30px;height:30px;border-top:2px solid rgba(255,255,255,0.2);border-left:2px solid rgba(255,255,255,0.2);"></div>
                 <div style="position:absolute;top:40px;right:40px;width:30px;height:30px;border-top:2px solid rgba(255,255,255,0.2);border-right:2px solid rgba(255,255,255,0.2);"></div>
                 <div style="position:absolute;bottom:40px;left:40px;width:30px;height:30px;border-bottom:2px solid rgba(255,255,255,0.2);border-left:2px solid rgba(255,255,255,0.2);"></div>
                 <div style="position:absolute;bottom:40px;right:40px;width:30px;height:30px;border-bottom:2px solid rgba(255,255,255,0.2);border-right:2px solid rgba(255,255,255,0.2);"></div>
                 <!-- 文字 -->
                 <h1 style="font-size:${style.font_size || '5rem'};color:${style.color || '#ffffff'};text-shadow:${style.text_shadow || '0 0 40px rgba(99,102,241,0.5)'};font-family:${style.font_family || 'system-ui,sans-serif'};font-weight:300;letter-spacing:-0.02em;position:relative;z-index:2;">
                   ${text}
                 </h1>
               </div>`,
      timeline: `
        tl.from("#${id} h1", { opacity: 0, scale: 0.7, y: 40, duration: 0.8, ease: "back.out(1.4)" }, ${element.start});
        tl.to("#${id}", { opacity: 0, scale: 1.02, duration: 0.4, ease: "power2.in" }, ${end} - 0.4);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },

  renderSubtitle(element, template) {
    const style = template.styles?.body || {};
    const id = element.shot_id || `subtitle-${element.start}`;
    const end = element.start + element.duration;
    return {
      html: `<div id="${id}" class="clip"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                 <!-- 背景：底部渐变 -->
                 <div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.08) 50%, rgba(99,102,241,0.15) 100%);"></div>
                 <!-- 玻璃卡片 -->
                 <div style="position:relative;background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px 80px;max-width:70%;">
                   <!-- 左侧彩色条 -->
                   <div style="position:absolute;left:0;top:20%;height:60%;width:3px;background:linear-gradient(180deg,#6366f1,#a78bfa,#6366f1);border-radius:2px;"></div>
                   <div style="font-size:${style.font_size || '2.5rem'};color:${style.color || '#e2e8f0'};font-family:${style.font_family || 'system-ui,sans-serif'};font-weight:300;line-height:1.4;">
                     ${element.text || ''}
                   </div>
                 </div>
               </div>`,
      timeline: `
        tl.from("#${id}", { opacity: 0, y: 30, duration: 0.6, ease: "power2.out" }, ${element.start});
        tl.to("#${id}", { opacity: 0, y: -20, duration: 0.4, ease: "power2.in" }, ${end} - 0.4);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },

  renderVideoClip(element, template) {
    const id = element.shot_id || `video-${element.start}`;
    const end = element.start + element.duration;
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
      timeline: `
        tl.from("#${id}", { opacity: 0, duration: 0.3 }, ${element.start});
        tl.to("#${id}", { opacity: 0, duration: 0.3 }, ${end} - 0.3);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },

  renderHeroImage(element, template) {
    const id = element.shot_id || `image-${element.start}`;
    const end = element.start + element.duration;
    const motion = element.motion || 'zoom-in';

    let entrance;
    switch (motion) {
      case 'zoom-in':
        entrance = `tl.from("#${id} img", { scale: 1.2, duration: ${element.duration}, ease: "power1.out" }, ${element.start});`;
        break;
      case 'zoom-out':
        entrance = `tl.from("#${id} img", { scale: 0.85, duration: ${element.duration}, ease: "power1.out" }, ${element.start});`;
        break;
      case 'ken-burns':
        entrance = `tl.from("#${id} img", { scale: 1.15, x: -40, duration: ${element.duration}, ease: "none" }, ${element.start});`;
        break;
      case 'slide-left':
        entrance = `tl.from("#${id} img", { x: 200, opacity: 0.8, duration: ${element.duration * 0.6}, ease: "power2.out" }, ${element.start});`;
        break;
      case 'slide-right':
        entrance = `tl.from("#${id} img", { x: -200, opacity: 0.8, duration: ${element.duration * 0.6}, ease: "power2.out" }, ${element.start});`;
        break;
      case 'slide-up':
        entrance = `tl.from("#${id} img", { y: 100, opacity: 0.8, duration: ${element.duration * 0.6}, ease: "power2.out" }, ${element.start});`;
        break;
      case 'fade-in':
        entrance = `tl.from("#${id}", { opacity: 0, duration: 0.6, ease: "power2.out" }, ${element.start});`;
        break;
      default:
        entrance = `tl.from("#${id} img", { scale: 1.1, duration: ${element.duration}, ease: "power1.out" }, ${element.start});`;
    }

    const exit = `tl.to("#${id}", { opacity: 0, duration: 0.3, ease: "power2.in" }, ${end} - 0.3);
        tl.set("#${id}", { opacity: 0 }, ${end});`;

    return {
      html: `<div id="${id}" class="clip hero-image"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0">
               <img src="${element.source}" style="width:100%;height:100%;object-fit:cover;" />
               ${element.overlay ? `<div class="overlay-text" style="font-size:3rem;color:#fff;text-shadow:0 0 20px #00ffff;font-family:monospace;">${element.overlay}</div>` : ''}
             </div>`,
      timeline: `${entrance}\n${exit}`,
    };
  },

  renderCodeBlock(element, template) {
    const style = template.styles?.code || {};
    const id = element.shot_id || `code-${element.start}`;
    const end = element.start + element.duration;
    const text = escapeHtml(element.text || '// code');
    const lines = text.split('\n');

    const lineAnimations = lines.map((_, i) =>
      `tl.from("#${id} .code-line:nth-child(${i + 1})", { opacity: 0, x: -15, duration: 0.3, ease: "power2.out" }, ${element.start} + ${i * 0.25});`
    ).join('\n');

    const linesHtml = lines.map((line, i) =>
      `<div class="code-line" style="min-height:1.6em;display:flex;"><span style="color:#555;min-width:2.5em;text-align:right;padding-right:1em;user-select:none;">${i + 1}</span><span>${line}</span></div>`
    ).join('');

    return {
      html: `<div id="${id}" class="clip code-block"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                 <!-- 背景 -->
                 <div style="position:absolute;inset:0;background:linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%);"></div>
                 <!-- 终端卡片 -->
                 <div style="position:relative;width:75%;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">
                   <!-- 终端标题栏 -->
                   <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.08);">
                     <div style="width:12px;height:12px;border-radius:50%;background:#ef4444;"></div>
                     <div style="width:12px;height:12px;border-radius:50%;background:#eab308;"></div>
                     <div style="width:12px;height:12px;border-radius:50%;background:#22c55e;"></div>
                     <span style="margin-left:12px;font-size:0.85rem;color:#64748b;font-family:monospace;">code.py</span>
                   </div>
                   <!-- 代码内容 -->
                   <div style="padding:20px 24px;font-size:${style.font_size || '1.1rem'};color:${style.color || '#7dd3fc'};font-family:'Fira Code','SF Mono',monospace;white-space:pre;line-height:1.7;text-align:left;">
                     ${linesHtml}
                   </div>
                 </div>
               </div>`,
      timeline: `
        tl.from("#${id}", { opacity: 0, scale: 0.95, duration: 0.3, ease: "power2.out" }, ${element.start});
        ${lineAnimations}
        tl.to("#${id}", { opacity: 0, duration: 0.3, ease: "power2.in" }, ${end} - 0.3);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },

  renderStarCTA(element, template) {
    const style = template.styles?.cta || {};
    const id = element.shot_id || `cta-${element.start}`;
    const end = element.start + element.duration;
    return {
      html: `<div id="${id}" class="clip star-cta"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                 <!-- 辐射光晕 -->
                 <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 40%, transparent 70%);"></div>
                 <!-- 脉冲环 -->
                 <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;height:300px;border-radius:50%;border:1px solid rgba(251,191,36,0.15);"></div>
                 <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:450px;height:450px;border-radius:50%;border:1px solid rgba(251,191,36,0.08);"></div>
                 <!-- 星星图标 + 文字 -->
                 <div style="position:relative;z-index:2;text-align:center;">
                   <div style="font-size:4rem;margin-bottom:16px;">⭐</div>
                   <div class="cta-text" style="font-size:${style.font_size || '3.5rem'};color:${style.color || '#fbbf24'};text-shadow:${style.text_shadow || '0 0 40px rgba(251,191,36,0.6)'};font-family:${style.font_family || 'system-ui,sans-serif'};font-weight:600;">
                     Star on GitHub
                   </div>
                   ${element.source ? `<div style="margin-top:16px;font-size:1.3rem;color:#94a3b8;font-family:monospace;">${element.source}</div>` : ''}
                 </div>
               </div>`,
      timeline: `
        tl.from("#${id}", { opacity: 0, scale: 0.3, rotation: -10, duration: 0.8, ease: "back.out(2)" }, ${element.start});
        tl.from("#${id} .cta-text", { textShadow: "0 0 0px ${style.color || '#fbbf24'}", duration: 1.2, ease: "power2.out" }, ${element.start} + 0.3);
        tl.to("#${id}", { opacity: 0, scale: 1.1, duration: 0.4, ease: "power2.in" }, ${end} - 0.4);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },

  renderTextList(element, template) {
    const items = (element.items && element.items.length > 0)
      ? element.items
      : (element.text || '').split(/[·|,]/).map(s => s.trim()).filter(Boolean);
    const id = element.shot_id || `text-list-${element.start}`;
    const end = element.start + element.duration;
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6366f1'];

    const itemsHtml = items.map((item, i) =>
      `<div class="list-item" style="display:flex;align-items:center;gap:16px;font-size:1.8rem;color:#e2e8f0;font-family:system-ui,sans-serif;padding:12px 24px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid ${colors[i % colors.length]};opacity:0;">
         <span style="color:${colors[i % colors.length]};font-weight:600;min-width:1.5em;">${String(i + 1).padStart(2, '0')}</span>
         <span>${item}</span>
       </div>`
    ).join('');

    const itemAnimations = items.map((_, i) =>
      `tl.to("#${id} .list-item:nth-child(${i + 1})", { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, ${element.start} + ${i * 0.3});`
    ).join('\n');

    const itemSets = items.map((_, i) =>
      `tl.set("#${id} .list-item:nth-child(${i + 1})", { opacity: 0, x: -30 }, ${element.start});`
    ).join('\n');

    return {
      html: `<div id="${id}" class="clip text-list"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;">
                 <!-- 背景 -->
                 <div style="position:absolute;inset:0;background:linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 60%);"></div>
                 <!-- 装饰竖线 -->
                 <div style="position:absolute;left:15%;top:10%;height:80%;width:1px;background:linear-gradient(180deg,transparent,rgba(99,102,241,0.2),transparent);"></div>
                 <!-- 列表容器 -->
                 <div style="position:relative;z-index:2;display:flex;flex-direction:column;gap:12px;max-width:65%;">
                   ${itemsHtml}
                 </div>
               </div>`,
      timeline: `
        ${itemSets}
        ${itemAnimations}
        tl.to("#${id}", { opacity: 0, duration: 0.3, ease: "power2.in" }, ${end} - 0.3);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },

  renderOverlayText(element, template) {
    const id = element.shot_id || `overlay-${element.start}`;
    const end = element.start + element.duration;
    return {
      html: `<div id="${id}" class="overlay-text"
                   data-start="${element.start}"
                   data-duration="${element.duration}"
                   data-track-index="0"
                   style="font-size:2rem;color:#00ffff;text-shadow:0 0 15px #00ffff;font-family:monospace;">
               ${element.text || ''}
             </div>`,
      timeline: `
        tl.from("#${id}", { opacity: 0, y: -10, duration: 0.4, ease: "power2.out" }, ${element.start});
        tl.to("#${id}", { opacity: 0, y: 10, duration: 0.3, ease: "power2.in" }, ${end} - 0.3);
        tl.set("#${id}", { opacity: 0 }, ${end});
      `,
    };
  },
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
