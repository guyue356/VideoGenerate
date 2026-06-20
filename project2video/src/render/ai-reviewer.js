import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';

const FFMPEG_DIR = 'D:\\hsj\\Github\\ffmpeg\\bin';

/**
 * AI-powered review of rendered video.
 * Extracts keyframes, sends to MIMO v2.5 for visual analysis,
 * and checks HTML structure for issues.
 *
 * @param {Object} options
 * @param {string} options.videoPath - Path to rendered MP4
 * @param {string} options.htmlPath - Path to the HTML composition
 * @param {string} options.outputDir - Output directory
 * @param {Object} options.timeline - The timeline data
 * @param {Object} options.assetManifest - Asset manifest
 * @returns {Object} { issues: [], fixed: boolean }
 */
export async function reviewVideo({ videoPath, htmlPath, outputDir, timeline, assetManifest }) {
  const issues = [];

  // Step 1: Structural validation (no LLM needed)
  const structuralIssues = validateStructure(htmlPath, timeline, assetManifest);
  issues.push(...structuralIssues);

  // Step 2: Visual review with MIMO v2.5
  const visualIssues = await reviewVisually(videoPath, htmlPath, outputDir, timeline);
  issues.push(...visualIssues);

  return {
    issues,
    hasCriticalIssues: issues.some(i => i.severity === 'critical'),
    hasAnyIssues: issues.length > 0,
  };
}

/**
 * Validate HTML structure for common issues.
 */
function validateStructure(htmlPath, timeline, assetManifest) {
  const issues = [];

  if (!existsSync(htmlPath)) {
    issues.push({ type: 'missing_file', severity: 'critical', message: `HTML file not found: ${htmlPath}` });
    return issues;
  }

  const html = readFileSync(htmlPath, 'utf-8');
  const htmlDir = join(htmlPath, '..');

  // Check for missing image references
  const imgSrcMatches = html.matchAll(/src="([^"]+)"/g);
  for (const match of imgSrcMatches) {
    const src = match[1];
    if (src.startsWith('http') || src.startsWith('data:')) continue;

    // Check if file exists relative to the HTML file's directory
    const htmlDir = join(htmlPath, '..');
    const assetPath = join(htmlDir, src);
    if (!existsSync(assetPath)) {
      issues.push({
        type: 'missing_asset',
        severity: 'critical',
        message: `Image not found: ${src}`,
        fix: `Copy asset file to ${assetPath}`,
      });
    }
  }

  // Check for empty text elements
  const emptyTextPattern = /<(?:h1|div|pre)[^>]*class="[^"]*(?:hero-title|subtitle|code-block|text-list)[^"]*"[^>]*>\s*<\/(?:h1|div|pre)>/g;
  if (emptyTextPattern.test(html)) {
    issues.push({
      type: 'empty_content',
      severity: 'warning',
      message: 'Some text elements appear empty',
    });
  }

  // Check for missing audio
  if (html.includes('audio/bgm.wav')) {
    const audioDir = join(htmlDir, 'audio');
    if (!existsSync(join(audioDir, 'bgm.wav'))) {
      issues.push({
        type: 'missing_audio',
        severity: 'info',
        message: 'BGM audio file not found (video will be silent)',
      });
    }
  }

  // Check for duplicate consecutive image sources
  const sources = timeline.elements
    .filter(el => el.type === 'hero-image' && el.source)
    .map(el => el.source);
  let consecutiveDupes = 0;
  for (let i = 1; i < sources.length; i++) {
    if (sources[i] === sources[i - 1]) consecutiveDupes++;
  }
  if (consecutiveDupes >= 2) {
    issues.push({
      type: 'visual_monotony',
      severity: 'warning',
      message: `Same image used ${consecutiveDupes + 1} times consecutively — video may look repetitive`,
    });
  }

  // Check for missing font declarations
  const fontFamilies = html.match(/font-family:\s*([^;"]+)/g) || [];
  const missingFonts = [];
  for (const ff of fontFamilies) {
    const font = ff.replace(/font-family:\s*/, '').trim();
    if (font.includes('Fira Code') && !html.includes('@font-face') && !html.includes('fira-code')) {
      if (!missingFonts.includes('Fira Code')) missingFonts.push('Fira Code');
    }
  }
  if (missingFonts.length > 0) {
    issues.push({
      type: 'font_issue',
      severity: 'info',
      message: `Fonts used without @font-face: ${missingFonts.join(', ')}. HyperFrames will attempt auto-resolution.`,
    });
  }

  return issues;
}

/**
 * Visual review using MIMO v2.5 vision model.
 * Extracts keyframes and sends them for analysis.
 */
async function reviewVisually(videoPath, htmlPath, outputDir, timeline) {
  const issues = [];

  if (!existsSync(videoPath)) {
    issues.push({ type: 'missing_video', severity: 'critical', message: `Video file not found: ${videoPath}` });
    return issues;
  }

  // Extract keyframes
  const framesDir = join(outputDir, 'review-frames');
  mkdirSync(framesDir, { recursive: true });

  const duration = timeline.total_duration;
  const keyframeTimes = [
    Math.floor(duration * 0.1),   // 10% — near start
    Math.floor(duration * 0.5),   // 50% — middle
    Math.floor(duration * 0.9),   // 90% — near end
  ];

  const framePaths = [];
  for (let i = 0; i < keyframeTimes.length; i++) {
    const framePath = join(framesDir, `frame-${i}.jpg`);
    try {
      execSync(
        `"${join(FFMPEG_DIR, 'ffmpeg')}" -y -ss ${keyframeTimes[i]} -i "${videoPath}" -frames:v 1 -q:v 2 "${framePath}"`,
        { stdio: 'pipe', timeout: 10000 }
      );
      if (existsSync(framePath)) {
        framePaths.push({ path: framePath, time: keyframeTimes[i] });
      }
    } catch (err) {
      // FFmpeg extraction failed — skip visual review
    }
  }

  if (framePaths.length === 0) {
    issues.push({
      type: 'review_skip',
      severity: 'info',
      message: 'Could not extract keyframes for visual review',
    });
    return issues;
  }

  // Send to MIMO v2.5 for visual analysis
  const apiKey = process.env.MIMO_API_KEY;
  const baseURL = process.env.TTS_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1';

  if (!apiKey) {
    issues.push({
      type: 'review_skip',
      severity: 'info',
      message: 'MIMO API key not set, skipping visual review',
    });
    return issues;
  }

  const client = new OpenAI({ apiKey, baseURL });

  for (const frame of framePaths) {
    try {
      // Resize and compress for API
      const imgBuffer = await sharp(frame.path)
        .resize(640)
        .jpeg({ quality: 70 })
        .toBuffer();
      const base64 = imgBuffer.toString('base64');

      // Get the expected content for this time
      const expectedContent = getExpectedContent(timeline, frame.time);

      const res = await client.chat.completions.create({
        model: 'mimo-v2.5',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `这是一个技术项目宣传视频的截图（时间点 ${frame.time}s）。预期显示的内容：${expectedContent}。

请检查：
1. 图片是否正常显示（不是空白/黑屏）
2. 文字是否清晰可读
3. 布局是否合理（没有重叠/溢出）
4. 整体视觉效果如何

如果有问题，请具体说明。如果一切正常，请回答"OK"。用中文回答，不超过100字。`
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` }
            }
          ]
        }],
        max_tokens: 300,
      });

      // MIMO v2.5 puts response in reasoning_content
      const reviewText = res.choices[0].message.content || res.choices[0].message.reasoning_content || '';

      // Parse the review — look for "OK" or issue descriptions
      if (reviewText && !reviewText.includes('OK') && reviewText.length > 10) {
        // Check if the review mentions actual problems
        const hasProblem = reviewText.includes('问题') || reviewText.includes('空白') ||
          reviewText.includes('黑屏') || reviewText.includes('错误') || reviewText.includes('异常') ||
          reviewText.includes('重叠') || reviewText.includes('溢出') || reviewText.includes('看不清');

        if (hasProblem) {
          issues.push({
            type: 'visual_issue',
            severity: 'warning',
            message: `Frame at ${frame.time}s: ${reviewText.slice(0, 150)}`,
            frame: frame.path,
          });
        }
      }
    } catch (err) {
      // LLM call failed — skip this frame
    }
  }

  return issues;
}

/**
 * Get expected content description for a given time in the timeline.
 */
function getExpectedContent(timeline, time) {
  const element = timeline.elements.find(el => time >= el.start && time < el.start + el.duration);
  if (!element) return 'unknown';

  switch (element.type) {
    case 'hero-image':
      return `全屏图片 (source: ${element.source}), overlay文字: ${element.overlay || '无'}`;
    case 'hero-title':
      return `大标题文字: "${element.text || 'empty'}"`;
    case 'subtitle':
      return `副标题文字: "${element.text || 'empty'}"`;
    case 'code-block':
      return `代码块: "${(element.text || '').slice(0, 50)}"`;
    case 'text-list':
      return `文字列表: "${(element.text || '').slice(0, 50)}"`;
    case 'star-cta':
      return 'CTA按钮: "⭐ Star on GitHub"';
    default:
      return `${element.type}元素`;
  }
}

/**
 * Apply automatic fixes to the HTML based on review issues.
 *
 * @param {string} htmlPath - Path to the HTML file
 * @param {Object[]} issues - Issues from review
 * @returns {boolean} Whether any fixes were applied
 */
export function applyFixes(htmlPath, issues) {
  if (!existsSync(htmlPath)) return false;

  let html = readFileSync(htmlPath, 'utf-8');
  let fixed = false;

  for (const issue of issues) {
    switch (issue.type) {
      case 'empty_content': {
        // Add placeholder text to empty elements
        html = html.replace(
          /(<(?:h1|div)[^>]*class="[^"]*(?:hero-title|subtitle)[^"]*"[^>]*>)\s*(<\/(?:h1|div)>)/g,
          '$1Project$2'
        );
        fixed = true;
        break;
      }
      case 'visual_monotony': {
        // Add subtle variation to repeated images — change overlay text or add filter
        // This is a cosmetic fix; the real fix is in the story generation
        break;
      }
    }
  }

  if (fixed) {
    writeFileSync(htmlPath, html, 'utf-8');
  }

  return fixed;
}
