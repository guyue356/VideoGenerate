import { Play, Pause, Maximize2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export default function CompositionPreview({ project }) {
  const iframeRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const src = project ? `/api/assets/output/${encodeURIComponent(project)}/compositions/main.html` : '';

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime(t => {
        if (t >= duration) {
          setIsPlaying(false);
          return 0;
        }
        return t + 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    try {
      const tl = iframe.contentWindow.__timelines?.promo;
      if (!tl) return;

      if (isPlaying) {
        tl.pause();
        setIsPlaying(false);
      } else {
        if (tl.progress() >= 1) {
          tl.seek(0);
          setCurrentTime(0);
        }
        tl.play();
        setIsPlaying(true);
        if (!duration) {
          setDuration(tl.duration());
        }
      }
    } catch {}
  };

  const handleSeek = (e) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const tl = iframe.contentWindow.__timelines?.promo;
      if (!tl) return;
      const time = Number(e.target.value);
      tl.seek(time);
      setCurrentTime(time);
    } catch {}
  };

  return (
    <div className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-4 animate-fade-in">
      <h2 className="text-[18px] font-semibold">动画预览</h2>

      {/* iframe Container */}
      <div className="relative rounded-[var(--radius-lg)] overflow-hidden bg-black/5 border border-[var(--color-border)]">
        <div className="relative" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
          {src && (
            <iframe
              ref={iframeRef}
              src={src}
              className="absolute inset-0 w-full h-full border-0"
              style={{
                transform: 'scale(1)',
                transformOrigin: 'top left',
                width: '1920px',
                height: '1080px',
                maxWidth: '100%',
                maxHeight: '100%',
              }}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => {
                try {
                  const tl = iframeRef.current?.contentWindow?.__timelines?.promo;
                  if (tl) setDuration(tl.duration());
                } catch {}
              }}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center
                     hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer shadow-md"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--color-border-strong)] accent-[var(--color-accent)]"
        />

        <span className="text-[13px] text-[var(--color-text-tertiary)] tabular-nums w-20 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.03] transition-colors"
        >
          <Maximize2 size={16} />
        </a>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
