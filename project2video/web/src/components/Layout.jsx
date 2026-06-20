import { Film, FolderOpen, Settings, Sparkles } from 'lucide-react';

export default function Layout({ children, activeTab, onTabChange }) {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 glass-strong flex flex-col border-r border-[var(--color-border)]">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #0071e3, #5e5ce6)' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            Project2Video
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 mt-1">
          <SidebarItem
            icon={<Film size={18} />}
            label="生成视频"
            active={activeTab === 'generate'}
            onClick={() => onTabChange('generate')}
          />
          <SidebarItem
            icon={<FolderOpen size={18} />}
            label="资产管理"
            active={activeTab === 'history'}
            onClick={() => onTabChange('history')}
          />
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4">
          <SidebarItem
            icon={<Settings size={18} />}
            label="设置"
            active={activeTab === 'settings'}
            onClick={() => onTabChange('settings')}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[960px] mx-auto px-10 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[14px] font-medium transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
          : 'text-[var(--color-text-secondary)] hover:bg-black/[0.03] hover:text-[var(--color-text-primary)]'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
