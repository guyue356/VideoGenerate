import { useState, useCallback, useEffect } from 'react';
import Layout from './components/Layout';
import GenerateForm from './components/GenerateForm';
import ProgressPanel from './components/ProgressPanel';
import StoryPreview from './components/StoryPreview';
import CompositionPreview from './components/CompositionPreview';
import AudioPreview from './components/AudioPreview';
import VideoPlayer from './components/VideoPlayer';
import HistoryList from './components/HistoryList';
import { useSSE } from './hooks/useSSE';
import { startGeneration, fetchHistory } from './lib/api';

export default function App() {
  const [tab, setTab] = useState('generate');
  const [jobId, setJobId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (tab === 'history') {
      fetchHistory().then(setHistory).catch(() => {});
    }
  }, [tab]);

  const { events, status, result, error, currentPhase, phaseStatus, phaseData } = useSSE(jobId);

  const handleGenerate = useCallback(async (options) => {
    try {
      const { jobId: id } = await startGeneration(options);
      setJobId(id);
      // Extract project name from path
      const name = options.projectPath.split(/[/\\]/).filter(Boolean).pop() || 'project';
      setProjectName(name);
    } catch (err) {
      console.error('Failed to start generation:', err);
    }
  }, []);

  const isRunning = status === 'connecting' || status === 'running';
  const isDone = status === 'done';

  // Refresh history when generation completes
  useEffect(() => {
    if (isDone) {
      fetchHistory().then(setHistory).catch(() => {});
    }
  }, [isDone]);
  const storyData = phaseData('story');

  const handleNewGeneration = () => {
    setJobId(null);
    setProjectName('');
  };

  return (
    <Layout activeTab={tab} onTabChange={setTab}>
      {tab === 'generate' && !jobId && (
        <GenerateForm onGenerate={handleGenerate} isRunning={isRunning} />
      )}

      {tab === 'generate' && jobId && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={handleNewGeneration}
            className="text-[14px] text-[var(--color-accent)] hover:underline cursor-pointer"
          >
            ← 新建生成
          </button>

          {/* Progress */}
          <ProgressPanel
            events={events}
            status={status}
            currentPhase={currentPhase}
            phaseStatus={phaseStatus}
            phaseData={phaseData}
            result={result}
            error={error}
            onViewPreview={() => {}}
            onViewVideo={() => {}}
          />

          {/* Story Preview (shown after story phase completes) */}
          {storyData && (
            <StoryPreview story={storyData} />
          )}

          {/* Composition Preview (shown after compose phase completes) */}
          {phaseStatus('compose') === 'done' && (
            <CompositionPreview project={projectName} />
          )}

          {/* Audio Preview (shown after render phase completes) */}
          {isDone && (
            <AudioPreview project={projectName} />
          )}

          {/* Video Player (shown after render phase completes) */}
          {isDone && (
            <VideoPlayer project={projectName} />
          )}
        </div>
      )}

      {tab === 'history' && (
        <HistoryList history={history} onRefresh={() => fetchHistory().then(setHistory).catch(() => {})} />
      )}

      {tab === 'settings' && (
        <div className="animate-fade-in">
          <h1 className="text-[28px] font-semibold tracking-tight mb-2">设置</h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mb-8">在 .env 文件中配置 TTS 提供商、API 密钥等</p>

          <div className="glass-strong rounded-[var(--radius-xl)] p-6 space-y-4">
            <div className="text-[14px] text-[var(--color-text-secondary)]">
              <p className="mb-3">环境变量在项目根目录的 <code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-[13px]">.env</code> 文件中配置：</p>
              <ul className="space-y-2 ml-4">
                <li><code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-[13px]">TTS_PROVIDER</code> — mimo 或 openai</li>
                <li><code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-[13px]">TTS_VOICE</code> — Chloe, Mia, 冰糖, 茉莉</li>
                <li><code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-[13px]">LLM_PROVIDER</code> — deepseek 或 openai</li>
                <li><code className="bg-black/[0.05] px-1.5 py-0.5 rounded text-[13px]">PORT</code> — 服务端口（默认: 3000）</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
