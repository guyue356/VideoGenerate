import { useState, useEffect } from 'react';
import { FolderOpen, Zap, Volume2, VolumeX, ChevronRight, Music } from 'lucide-react';
import { fetchTemplates, fetchVoices } from '../lib/api';

const TEMPLATE_PREVIEWS = {
  'game-trailer': { emoji: '🎮', color: '#5e5ce6', desc: '赛博朋克霓虹，适合游戏' },
  'product-hunter': { emoji: '🚀', color: '#ff9f0a', desc: '简洁白色，适合产品展示' },
  'minimal': { emoji: '✨', color: '#30d158', desc: '暗色极简，通用百搭' },
};

const BGM_STYLES = [
  { id: 'auto', label: '自动', desc: 'AI 根据项目风格选择' },
  { id: 'minimal', label: '极简', desc: '轻柔、简洁的背景音' },
  { id: 'electronic', label: '电子', desc: '科技感电子节拍' },
  { id: 'cinematic', label: '电影', desc: '史诗感管弦配乐' },
];

export default function GenerateForm({ onGenerate, isRunning }) {
  const [projectPath, setProjectPath] = useState('');
  const [template, setTemplate] = useState('');
  const [duration, setDuration] = useState(35);
  const [skipTTS, setSkipTTS] = useState(false);
  const [fast, setFast] = useState(false);
  const [bgmStyle, setBgmStyle] = useState('auto');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => {});
    fetchVoices().then(data => {
      setVoices(data.voices || []);
      setSelectedVoice(data.voices?.[0]?.id || '');
    }).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectPath.trim() || isRunning) return;
    onGenerate({
      projectPath: projectPath.trim(),
      template: template || undefined,
      duration,
      skipTTS,
      fast,
      bgmStyle: bgmStyle !== 'auto' ? bgmStyle : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          生成视频
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] mt-1">
          用 AI 将你的代码仓库转化为宣传视频
        </p>
      </div>

      {/* Project Path */}
      <div className="space-y-2">
        <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          项目路径
        </label>
        <div className="relative">
          <FolderOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={projectPath}
            onChange={e => setProjectPath(e.target.value)}
            placeholder="./你的/项目/路径"
            className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-strong)]
                       text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-0 focus:border-transparent
                       transition-all duration-200"
          />
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-3">
        <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          模板
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(templates.length > 0 ? templates : Object.keys(TEMPLATE_PREVIEWS).map(id => ({ id }))).map(t => {
            const id = t.id;
            const preview = TEMPLATE_PREVIEWS[id] || { emoji: '📦', color: '#86868b', desc: '' };
            const isSelected = template === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTemplate(isSelected ? '' : id)}
                className={`relative p-4 rounded-[var(--radius-lg)] border-2 text-left transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-md'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] hover:shadow-sm'
                  }`}
              >
                <div className="text-2xl mb-2">{preview.emoji}</div>
                <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{id}</div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">{preview.desc}</div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-[var(--color-text-tertiary)]">
          留空则由 AI 根据项目类型自动选择
        </p>
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Duration */}
        <div className="space-y-2">
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            时长: {duration}秒
          </label>
          <input
            type="range"
            min="20"
            max="60"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-[var(--color-border-strong)] accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-[11px] text-[var(--color-text-tertiary)]">
            <span>20秒</span>
            <span>60秒</span>
          </div>
        </div>

        {/* Voice */}
        <div className="space-y-2">
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            TTS 语音
          </label>
          <div className="flex items-center gap-2">
            {skipTTS ? (
              <VolumeX size={16} className="text-[var(--color-text-tertiary)]" />
            ) : (
              <Volume2 size={16} className="text-[var(--color-accent)]" />
            )}
            <select
              value={skipTTS ? 'off' : selectedVoice}
              onChange={e => {
                if (e.target.value === 'off') {
                  setSkipTTS(true);
                } else {
                  setSkipTTS(false);
                  setSelectedVoice(e.target.value);
                }
              }}
              className="flex-1 py-2 px-3 rounded-[var(--radius-md)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-strong)]
                         text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              {voices.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.language})</option>
              ))}
              <option value="off">不使用语音</option>
            </select>
          </div>
        </div>
      </div>

      {/* BGM Style */}
      <div className="space-y-3">
        <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wide flex items-center gap-1.5">
          <Music size={13} />
          背景音乐
        </label>
        <div className="grid grid-cols-4 gap-2">
          {BGM_STYLES.map(s => {
            const isSelected = bgmStyle === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setBgmStyle(s.id)}
                className={`p-3 rounded-[var(--radius-md)] border text-center transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-sm'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)]'
                  }`}
              >
                <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">{s.label}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6">
        <Toggle label="快速模式" sublabel="跳过 LLM 分析" checked={fast} onChange={setFast} />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!projectPath.trim() || isRunning}
        className="w-full py-3.5 rounded-[var(--radius-full)] text-[16px] font-semibold text-white
                   transition-all duration-200 cursor-pointer
                   disabled:opacity-40 disabled:cursor-not-allowed
                   hover:shadow-lg active:scale-[0.98]"
        style={{
          background: isRunning
            ? 'var(--color-text-tertiary)'
            : 'linear-gradient(135deg, #0071e3, #5e5ce6)',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          {isRunning ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              生成视频
              <ChevronRight size={18} />
            </>
          )}
        </span>
      </button>
    </form>
  );
}

function Toggle({ label, sublabel, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 cursor-pointer"
    >
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5
        ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <div>
        <div className="text-[14px] font-medium text-[var(--color-text-primary)]">{label}</div>
        {sublabel && <div className="text-[12px] text-[var(--color-text-tertiary)]">{sublabel}</div>}
      </div>
    </button>
  );
}
