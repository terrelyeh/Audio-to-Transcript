import { Sparkles, Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface AppHeaderProps {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (v: boolean) => void;
}

export default function AppHeader({ isDark, setIsDark, isLeftPanelOpen, setIsLeftPanelOpen }: AppHeaderProps) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="切換操作面板"
        >
          {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="切換深色/淡色模式"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-white mb-3 flex items-center justify-center gap-3">
        <Sparkles className="w-8 h-8 text-indigo-600" />
        AI 語音轉錄與清稿工具
      </h1>
      <p className="text-lg text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
        上傳您的 Podcast 訪談或會議記錄音檔。我們將為您自動進行精準轉錄與專業清稿，並可根據您的需求，無限次產出不同格式的內容。
      </p>
    </header>
  );
}
