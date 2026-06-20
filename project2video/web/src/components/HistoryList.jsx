import { useState } from 'react';
import { Film, Calendar, Clock, ExternalLink, RefreshCw, ChevronRight, Video, Music, FileText } from 'lucide-react';
import ProjectDetail from './ProjectDetail';

function formatDate(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ item }) {
  if (item.hasVideo) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">
        <Video size={10} /> 已完成
      </span>
    );
  }
  if (item.hasComposition) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
        <Film size={10} /> 已合成
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-black/5 text-[var(--color-text-tertiary)]">
      <Clock size={10} /> 进行中
    </span>
  );
}

function HistoryCard({ item, onSelect }) {
  const thumbnailSrc = `/api/assets/output/${encodeURIComponent(item.name)}/review-frames/frame-1.jpg`;

  return (
    <div
      onClick={() => onSelect(item.name)}
      className="glass-strong rounded-[var(--radius-xl)] overflow-hidden group hover:shadow-lg transition-all duration-200 cursor-pointer
                 hover:border-[var(--color-accent)] border border-transparent"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-[var(--color-bg-primary)] relative overflow-hidden">
        <img
          src={thumbnailSrc}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <ChevronRight size={20} className="text-[var(--color-text-primary)]" />
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge item={item} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{item.name}</div>
        <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-tertiary)]">
          {item.template && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {item.template}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDate(item.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
          {item.hasVideo && <span className="flex items-center gap-0.5"><Video size={10} /> 视频</span>}
          {item.hasComposition && <span className="flex items-center gap-0.5"><Film size={10} /> 动画</span>}
          {item.hasNarration && <span className="flex items-center gap-0.5"><Music size={10} /> 旁白</span>}
          {item.hasBgm && <span className="flex items-center gap-0.5"><Music size={10} /> BGM</span>}
        </div>
      </div>
    </div>
  );
}

export default function HistoryList({ history, onRefresh }) {
  const [selectedProject, setSelectedProject] = useState(null);

  if (selectedProject) {
    return (
      <ProjectDetail
        projectName={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-[28px] font-semibold tracking-tight">资产管理</h1>
        </div>
        <p className="text-[15px] text-[var(--color-text-secondary)] mb-8">所有生成的视频和中间产物</p>

        <div className="glass-strong rounded-[var(--radius-xl)] p-12 text-center">
          <Film size={48} className="mx-auto text-[var(--color-text-tertiary)] mb-4" />
          <p className="text-[15px] text-[var(--color-text-secondary)]">暂无生成记录</p>
          <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">生成你的第一个视频后会在这里显示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[28px] font-semibold tracking-tight">资产管理</h1>
        {onRefresh && (
          <button onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[13px]
                       text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                       bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]
                       transition-colors cursor-pointer">
            <RefreshCw size={13} /> 刷新
          </button>
        )}
      </div>
      <p className="text-[15px] text-[var(--color-text-secondary)] mb-6">
        已生成 {history.length} 个项目 · 点击查看详情和中间产物
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {history.map((item) => (
          <HistoryCard key={item.name} item={item} onSelect={setSelectedProject} />
        ))}
      </div>
    </div>
  );
}
