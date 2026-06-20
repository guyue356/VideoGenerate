import { Download, ExternalLink } from 'lucide-react';

export default function VideoPlayer({ project }) {
  if (!project) return null;

  const videoSrc = `/api/assets/output/${encodeURIComponent(project)}/renders/${encodeURIComponent(project)}.mp4`;

  return (
    <div className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">最终视频</h2>
        <a
          href={videoSrc}
          download
          className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-full)] text-[14px] font-medium
                     bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors shadow-md"
        >
          <Download size={14} />
          下载 MP4
        </a>
      </div>

      {/* Video Element */}
      <div className="rounded-[var(--radius-lg)] overflow-hidden bg-black border border-[var(--color-border)]">
        <video
          controls
          className="w-full"
          style={{ maxHeight: '500px' }}
        >
          <source src={videoSrc} type="video/mp4" />
          您的浏览器不支持视频播放。
        </video>
      </div>

      {/* Direct link */}
      <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-tertiary)]">
        <ExternalLink size={12} />
        <a href={videoSrc} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] transition-colors underline underline-offset-2">
          在新标签页中打开视频
        </a>
      </div>
    </div>
  );
}
