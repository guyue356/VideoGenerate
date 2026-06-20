import { BookOpen, Music, Clock } from 'lucide-react';

export default function StoryPreview({ story }) {
  if (!story) return null;

  return (
    <div className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-[var(--color-accent)]" />
        <h2 className="text-[18px] font-semibold">故事脚本</h2>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-6 text-[13px] text-[var(--color-text-secondary)]">
        {story.tone && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            风格: {story.tone}
          </span>
        )}
        {story.music_style && (
          <span className="flex items-center gap-1.5">
            <Music size={12} />
            {story.music_style}
          </span>
        )}
      </div>

      {/* Hook */}
      {story.hook && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-accent-light)] border border-[var(--color-accent)]/10">
          <div className="text-[12px] font-medium text-[var(--color-accent)] uppercase tracking-wide mb-1">开篇</div>
          <div className="text-[15px] text-[var(--color-text-primary)] font-medium">{story.hook}</div>
        </div>
      )}

      {/* Scenes */}
      <div className="space-y-3">
        {story.scenes?.map((scene, i) => (
          <div key={i} className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2 py-0.5 rounded-full">
                  场景 {i + 1}
                </span>
                <span className="text-[12px] text-[var(--color-text-tertiary)]">{scene.purpose}</span>
              </div>
              <span className="flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)]">
                <Clock size={11} />
                {scene.shots?.reduce((n, s) => n + s.duration, 0) || 0}s
              </span>
            </div>
            {scene.narration && (
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">{scene.narration}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
