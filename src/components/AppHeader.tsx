import { Sparkles, Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface AppHeaderProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (v: boolean) => void;
}

export default function AppHeader({ isDark, setIsDark, isLeftPanelOpen, setIsLeftPanelOpen }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-5 h-10">
      {/* Left: logo + title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-white/60 dark:hover:text-stone-300 dark:hover:bg-white/5 transition-colors"
          aria-label="切換操作面板"
        >
          {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <h1 className="text-sm font-semibold text-stone-700 dark:text-stone-200 tracking-tight">
          AI 語音轉錄與清稿
        </h1>
      </div>

      {/* Right: utility */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-white/60 dark:hover:text-stone-300 dark:hover:bg-white/5 transition-colors"
        aria-label="切換深色/淡色模式"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
