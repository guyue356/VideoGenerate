import { Music, Mic, Play, Pause } from 'lucide-react';
import { useRef, useState } from 'react';

function AudioPlayer({ label, icon: Icon, src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center
                   hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer shadow-sm flex-shrink-0"
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Icon size={15} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
        <span className="text-[13px] text-[var(--color-text-secondary)] truncate">{label}</span>
      </div>
      <a
        href={src}
        download
        className="text-[12px] text-[var(--color-accent)] hover:underline flex-shrink-0"
      >
        下载
      </a>
    </div>
  );
}

export default function AudioPreview({ project }) {
  if (!project) return null;

  const base = `/api/assets/output/${encodeURIComponent(project)}/audio`;
  const narrationSrc = `${base}/narration.wav`;
  const bgmSrc = `${base}/bgm.wav`;

  return (
    <div className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-4 animate-fade-in">
      <h2 className="text-[18px] font-semibold flex items-center gap-2">
        <Music size={18} />
        音频产物
      </h2>
      <div className="grid grid-cols-1 gap-2">
        <AudioPlayer label="TTS 旁白" icon={Mic} src={narrationSrc} />
        <AudioPlayer label="背景音乐" icon={Music} src={bgmSrc} />
      </div>
    </div>
  );
}
