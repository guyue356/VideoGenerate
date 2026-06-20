import { Check, Circle, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const PHASES = [
  { id: 'understand', label: '项目分析', icon: '🔍', steps: ['analyze-repo', 'discover-features', 'scan-assets'] },
  { id: 'capture', label: '素材采集', icon: '📸', steps: ['plan', 'collect'] },
  { id: 'strategize', label: '策略制定', icon: '🎯', steps: ['build-strategy'] },
  { id: 'story', label: '故事脚本', icon: '📝', steps: ['generate'] },
  { id: 'compose', label: '视频合成', icon: '🎬', steps: ['timeline', 'html'] },
  { id: 'render', label: '渲染导出', icon: '🎥', steps: ['audio', 'video', 'review'] },
];

export default function ProgressPanel({ events, status, currentPhase, phaseStatus, phaseData, result, error, onViewPreview, onViewVideo }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (phaseId) => {
    setExpanded(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">生成中...</h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-1">
            {status === 'done' ? '视频生成完成！' : status === 'error' ? '出现了错误' : 'AI 正在为你制作视频'}
          </p>
        </div>
        {status === 'done' && (
          <div className="flex gap-2">
            <button
              onClick={onViewPreview}
              className="px-4 py-2 rounded-[var(--radius-full)] text-[14px] font-medium
                         border border-[var(--color-accent)] text-[var(--color-accent)]
                         hover:bg-[var(--color-accent-light)] transition-colors cursor-pointer"
            >
              预览动画
            </button>
            <button
              onClick={onViewVideo}
              className="px-4 py-2 rounded-[var(--radius-full)] text-[14px] font-medium text-white
                         hover:shadow-lg transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0071e3, #5e5ce6)' }}
            >
              观看视频
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {status === 'error' && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-error-light)] border border-[var(--color-error)]/20 flex items-start gap-3">
          <AlertCircle size={20} className="text-[var(--color-error)] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[14px] font-medium text-[var(--color-error)]">生成失败</div>
            <div className="text-[13px] text-[var(--color-error)]/80 mt-1">{error?.message || '发生了未知错误'}</div>
          </div>
        </div>
      )}

      {/* Phase Stepper */}
      <div className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-0">
        {PHASES.map((phase, index) => {
          const ps = phaseStatus(phase.id);
          const isExpanded = expanded[phase.id];
          const data = phaseData(phase.id);
          const phaseEvents = events.filter(e => e.phase === phase.id);

          return (
            <div key={phase.id}>
              {/* Phase Row */}
              <button
                onClick={() => toggleExpand(phase.id)}
                className="w-full flex items-center gap-4 py-3 cursor-pointer hover:bg-black/[0.02] rounded-[var(--radius-md)] transition-colors px-2"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {ps === 'done' ? (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  ) : ps === 'active' ? (
                    <div className="w-7 h-7 rounded-full border-2 border-[var(--color-accent)] flex items-center justify-center">
                      <Loader2 size={14} className="text-[var(--color-accent)] animate-spin" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-[var(--color-border-strong)] flex items-center justify-center">
                      <Circle size={8} className="text-[var(--color-text-tertiary)]" />
                    </div>
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{phase.icon}</span>
                    <span className={`text-[15px] font-semibold
                      ${ps === 'done' ? 'text-[var(--color-success)]' : ps === 'active' ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'}`}>
                      {phase.label}
                    </span>
                    {ps === 'active' && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse-dot" />
                    )}
                  </div>
                  {data && (
                    <SummaryText phase={phase.id} data={data} />
                  )}
                </div>

                {/* Expand Arrow */}
                {phaseEvents.length > 0 && (
                  <div className="text-[var(--color-text-tertiary)]">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </button>

              {/* Expanded Detail */}
              {isExpanded && phaseEvents.length > 0 && (
                <div className="ml-12 mb-3 space-y-1.5">
                  {phaseEvents.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px]">
                      {ev.status === 'complete' ? (
                        <Check size={12} className="text-[var(--color-success)]" />
                      ) : (
                        <Loader2 size={12} className="text-[var(--color-accent)] animate-spin" />
                      )}
                      <span className="text-[var(--color-text-secondary)]">{ev.step}</span>
                      {ev.data && typeof ev.data === 'object' && (
                        <span className="text-[var(--color-text-tertiary)]">
                          {Object.entries(ev.data).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Connector Line */}
              {index < PHASES.length - 1 && (
                <div className="ml-[27px] h-4 w-px bg-[var(--color-border)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryText({ phase, data }) {
  const text = {
    understand: () => `${data.name || ''} · ${data.type || ''} · 评分 ${data.score || '?'}/100`,
    capture: () => `${data.assets || 0} 个素材已规划`,
    strategize: () => data.value_prop || '',
    story: () => `${Array.isArray(data.scenes) ? data.scenes.length : data.scenes || 0} 个场景 · ${data.hook || ''}`,
    compose: () => `${data.duration || '?'}秒 · ${data.elements || 0} 个元素`,
    render: () => data.outputPath ? '视频已就绪' : `问题: ${data.issues ?? '?'}`,
  };

  const fn = text[phase];
  if (!fn) return null;

  return (
    <div className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5 truncate max-w-[400px]">
      {fn()}
    </div>
  );
}
