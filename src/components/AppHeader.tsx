import { Sparkles, Moon, Sun, PanelLeftClose, PanelLeftOpen, Shield } from 'lucide-react';

interface AppHeaderProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (v: boolean) => void;
}

export default function AppHeader({ isDark, setIsDark, isLeftPanelOpen, setIsLeftPanelOpen }: AppHeaderProps) {
  return (
    <header className="mb-8">
      {/* Top bar: utility buttons */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="lg:hidden p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-300 dark:hover:bg-stone-800 transition-colors"
          aria-label="切換操作面板"
        >
          {isLeftPanelOpen ? <PanelLeftClose className="w-[18px] h-[18px]" /> : <PanelLeftOpen className="w-[18px] h-[18px]" />}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-300 dark:hover:bg-stone-800 transition-colors"
          aria-label="切換深色/淡色模式"
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
      </div>

      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">
          AI 語音轉錄與清稿工具
        </h1>
        <p className="text-base text-stone-500 dark:text-stone-400 max-w-lg mx-auto">
          上傳音檔，AI 自動轉錄、清稿，並產出你需要的內容格式。
        </p>
        <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 mt-3">
          <Shield className="w-3.5 h-3.5" />
          您的資料不會儲存在我們的伺服器。音檔僅透過 Google Gemini API 處理。
        </p>
      </div>
    </header>
  );
}
