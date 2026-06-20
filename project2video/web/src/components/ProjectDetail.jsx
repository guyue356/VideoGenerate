import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Film, Music, Mic, Play, Pause, BookOpen, Palette, BarChart3,
  Image, FileJson, FileText, Download, ExternalLink, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle, Clock
} from 'lucide-react';
import { fetchProjectDetail } from '../lib/api';

// Small audio player for narration/bgm
function AudioPlayer({ label, icon: Icon, src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
      <audio ref={audioRef} src={src} preload="metadata" onEnded={() => setPlaying(false)} />
      <button onClick={toggle}
        className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center
                   hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer shadow-sm flex-shrink-0">
        {playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
      </button>
      <Icon size={14} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
      <span className="text-[13px] text-[var(--color-text-secondary)] flex-1 truncate">{label}</span>
      <a href={src} download className="text-[12px] text-[var(--color-accent)] hover:underline flex-shrink-0">下载</a>
    </div>
  );
}

// Collapsible section
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-strong rounded-[var(--radius-xl)] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 p-5 cursor-pointer hover:bg-black/[0.02] transition-colors">
        <Icon size={18} className="text-[var(--color-accent)]" />
        <span className="text-[16px] font-semibold text-[var(--color-text-primary)] flex-1 text-left">{title}</span>
        {open ? <ChevronDown size={16} className="text-[var(--color-text-tertiary)]" />
               : <ChevronRight size={16} className="text-[var(--color-text-tertiary)]" />}
      </button>
      {open && <div className="px-5 pb-5 pt-0 space-y-3">{children}</div>}
    </div>
  );
}

// Format timestamp to readable date
function formatDate(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Format seconds to m:ss
function formatDuration(sec) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ProjectDetail({ projectName, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectName) return;
    setLoading(true);
    fetchProjectDetail(projectName).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [projectName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-secondary)]">项目不存在或已删除</p>
        <button onClick={onBack} className="mt-4 text-[var(--color-accent)] hover:underline cursor-pointer">← 返回</button>
      </div>
    );
  }

  const base = `/api/assets/output/${encodeURIComponent(projectName)}`;
  const totalDuration = data.story?.scenes?.reduce((n, s) => n + (s.duration || 0), 0) || data.timeline?.total_duration || 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                     flex items-center justify-center hover:bg-[var(--color-bg-primary)] transition-colors cursor-pointer">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)]">{data.name}</h1>
          <p className="text-[13px] text-[var(--color-text-tertiary)] flex items-center gap-2">
            <Clock size={12} />
            {formatDate(data.createdAt)}
            {data.template && <span className="ml-1 px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[11px]">{data.template}</span>}
            <span>{formatDuration(totalDuration)}</span>
          </p>
        </div>
      </div>

      {/* Final Video */}
      {data.hasVideo && (
        <Section title="最终视频" icon={Film}>
          <div className="rounded-[var(--radius-lg)] overflow-hidden bg-black border border-[var(--color-border)]">
            <video controls className="w-full" style={{ maxHeight: '400px' }}>
              <source src={`${base}/renders/${encodeURIComponent(projectName)}.mp4`} type="video/mp4" />
            </video>
          </div>
          <div className="flex justify-end">
            <a href={`${base}/renders/${encodeURIComponent(projectName)}.mp4`} download
               className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-full)] text-[13px] font-medium
                          bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm">
              <Download size={13} /> 下载 MP4
            </a>
          </div>
        </Section>
      )}

      {/* Audio */}
      {(data.hasNarration || data.hasBgm) && (
        <Section title="音频产物" icon={Music}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.hasNarration && <AudioPlayer label="TTS 旁白" icon={Mic} src={`${base}/audio/narration.wav`} />}
            {data.hasBgm && <AudioPlayer label="背景音乐" icon={Music} src={`${base}/audio/bgm.wav`} />}
          </div>
        </Section>
      )}

      {/* Story */}
      {data.story && (
        <Section title="故事脚本" icon={BookOpen}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <InfoCard label="风格" value={data.story.tone} />
            <InfoCard label="音乐" value={data.story.music_style} />
            <InfoCard label="场景" value={`${data.story.scenes?.length || 0} 个`} />
          </div>
          {data.story.hook && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15">
              <div className="text-[11px] text-[var(--color-accent)] font-medium uppercase tracking-wide mb-1">开篇 Hook</div>
              <div className="text-[14px] text-[var(--color-text-primary)]">{data.story.hook}</div>
            </div>
          )}
          <div className="space-y-2 mt-3">
            {data.story.scenes?.map((scene, i) => (
              <div key={i} className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-[var(--color-accent)]">场景 {i + 1}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/5 text-[var(--color-text-tertiary)]">{scene.purpose}</span>
                  <span className="text-[11px] text-[var(--color-text-tertiary)] ml-auto">{formatDuration(scene.duration)} · {scene.shots} 镜头</span>
                </div>
                <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{scene.narration}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Composition Preview */}
      {data.hasComposition && (
        <Section title="动画预览" icon={Palette} defaultOpen={false}>
          <div className="relative rounded-[var(--radius-lg)] overflow-hidden bg-black/5 border border-[var(--color-border)]">
            <div style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`${base}/compositions/main.html`}
                className="absolute inset-0 w-full h-full border-0"
                style={{ transform: 'scale(1)', transformOrigin: 'top left', width: '1920px', height: '1080px', maxWidth: '100%', maxHeight: '100%' }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <a href={`${base}/compositions/main.html`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 text-[13px] text-[var(--color-accent)] hover:underline">
              <ExternalLink size={12} /> 新标签页打开
            </a>
          </div>
        </Section>
      )}

      {/* Review Frames */}
      {data.reviewFrames?.length > 0 && (
        <Section title="审片帧" icon={Image} defaultOpen={false}>
          <div className="grid grid-cols-3 gap-3">
            {data.reviewFrames.map((f, i) => (
              <div key={i} className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]">
                <img src={`${base}/review-frames/${f}`} alt={f} className="w-full h-auto" loading="lazy" />
                <div className="p-2 text-center text-[11px] text-[var(--color-text-tertiary)]">{f}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Strategy */}
      {data.strategy && (
        <Section title="营销策略" icon={BarChart3} defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoCard label="价值主张" value={data.strategy.value_prop} />
            <InfoCard label="故事角度" value={data.strategy.story_angle} />
            <InfoCard label="推荐模板" value={data.strategy.template_recommendation} />
          </div>
        </Section>
      )}

      {/* Intermediate Data */}
      <Section title="中间数据文件" icon={FileJson} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.intermediates?.map(f => (
            <a key={f} href={`${base}/intermediates/${f}`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                          hover:border-[var(--color-accent)] hover:shadow-sm transition-all">
              <FileJson size={15} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
              <span className="text-[13px] text-[var(--color-text-primary)] truncate flex-1">{f}</span>
              <ExternalLink size={12} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
            </a>
          ))}
        </div>
      </Section>

      {/* LLM Logs */}
      {data.hasLlmLogs && (
        <Section title="LLM 日志" icon={FileText} defaultOpen={false}>
          <div className="flex gap-2">
            <a href={`${base}/llm-logs.md`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-[13px]
                          bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
              <ExternalLink size={13} /> 查看
            </a>
            <a href={`${base}/llm-logs.md`} download
               className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] text-[13px]
                          bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
              <Download size={13} /> 下载
            </a>
          </div>
        </Section>
      )}

      {/* Assets */}
      {data.assetFiles?.length > 0 && (
        <Section title="项目素材" icon={Image} defaultOpen={false}>
          <div className="text-[13px] text-[var(--color-text-tertiary)] mb-2">{data.assetFiles.length} 个文件</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.assetFiles.filter(f => /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(f)).map(f => (
              <div key={f} className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] bg-black/5">
                <img src={`${base}/assets/${f}`} alt={f} className="w-full h-24 object-contain" loading="lazy" />
                <div className="p-1.5 text-[10px] text-[var(--color-text-tertiary)] truncate text-center">{f}</div>
              </div>
            ))}
          </div>
          {data.assetFiles.filter(f => !/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(f)).length > 0 && (
            <div className="mt-2 space-y-1">
              {data.assetFiles.filter(f => !/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(f)).map(f => (
                <div key={f} className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
                  <FileText size={12} /> {f}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
      <div className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-[13px] text-[var(--color-text-primary)] font-medium">{value || '--'}</div>
    </div>
  );
}
