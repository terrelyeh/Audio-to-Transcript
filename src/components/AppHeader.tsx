import { Sparkles, Moon, Sun, PanelLeftClose, PanelLeftOpen, Shield } from 'lucide-react';

interface AppHeaderProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (v: boolean) => void;
}

export default function AppHeader({ isDark, setIsDark, isLeftPanelOpen, setIsLeftPanelOpen }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-5">
      {/* Left: logo + title + privacy */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-white/60 dark:hover:text-stone-300 dark:hover:bg-white/5 transition-colors"
          aria-label="切換操作面板"
        >
          {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-stone-800 dark:text-white tracking-tight leading-tight">
            AI 語音轉錄與清稿工具
          </h1>
          <p className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5">
            <Shield className="w-3 h-3 shrink-0" />
            您的資料不會儲存在我們的伺服器。音檔僅透過 Google Gemini API 處理。
          </p>
        </div>
      </div>

      {/* Right: utility */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-white/60 dark:hover:text-stone-300 dark:hover:bg-white/5 transition-colors"
        aria-label="切換深色/淡色模式"
      >
        {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>
    </header>
  );
}
