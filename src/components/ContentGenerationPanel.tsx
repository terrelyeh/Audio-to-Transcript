import { useState } from 'react';
import { Loader2, Plus, Check, X } from 'lucide-react';
import type { SummaryStatus } from '../hooks/useTranscription';
import type { Prompt } from '../lib/utils';

interface ContentGenerationPanelProps {
  cleanedText: string;
  summaryStatus: SummaryStatus;
  prompts: Prompt[];
  selectedPromptId: string;
  customPrompt: string;
  setCustomPrompt: (v: string) => void;
  handlePromptSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  saveNewPrompt: (name: string) => void;
  onGenerateSummary: () => void;
}

export default function ContentGenerationPanel({
  cleanedText, summaryStatus, prompts, selectedPromptId, customPrompt,
  setCustomPrompt, handlePromptSelect, saveNewPrompt, onGenerateSummary,
}: ContentGenerationPanelProps) {
  const [isNaming, setIsNaming] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');

  const handleConfirmSave = () => {
    if (newPromptName.trim()) {
      saveNewPrompt(newPromptName);
      setNewPromptName('');
      setIsNaming(false);
    }
  };

  const handleCancelSave = () => {
    setNewPromptName('');
    setIsNaming(false);
  };

  return (
    <div className={`bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border transition-all duration-300 ${cleanedText ? 'border-indigo-200 dark:border-indigo-800 shadow-md' : 'border-stone-100 dark:border-stone-800 shadow-sm opacity-75'}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${cleanedText ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-400'}`}>2</div>
        <h3 className={`text-lg font-bold ${cleanedText ? 'text-stone-900 dark:text-white' : 'text-stone-400'}`}>AI 內容產出</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">選擇產出格式</label>
          <select
            value={selectedPromptId}
            onChange={handlePromptSelect}
            className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white dark:bg-stone-800 dark:text-white"
            disabled={!cleanedText || summaryStatus === 'summarizing'}
          >
            {prompts.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">Prompt 內容 (可手動修改)</label>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="請輸入您希望 AI 產出的具體要求..."
            className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 pb-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-stone-50 dark:bg-stone-800 dark:text-white"
            rows={4}
            disabled={!cleanedText || summaryStatus === 'summarizing'}
          />
          {isNaming ? (
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <input
                type="text"
                value={newPromptName}
                onChange={e => setNewPromptName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmSave(); if (e.key === 'Escape') handleCancelSave(); }}
                placeholder="輸入格式名稱..."
                className="text-[10px] border border-indigo-300 dark:border-indigo-600 rounded px-2 py-1 w-28 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white"
                autoFocus
              />
              <button onClick={handleConfirmSave} className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors" title="確認">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCancelSave} className="p-1 text-stone-400 hover:text-stone-600 transition-colors" title="取消">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsNaming(true)}
              disabled={!cleanedText || summaryStatus === 'summarizing'}
              className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-medium bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3 h-3" /> 另存新格式
            </button>
          )}
        </div>

        <button
          onClick={onGenerateSummary}
          disabled={!cleanedText || summaryStatus === 'summarizing'}
          className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
            !cleanedText || summaryStatus === 'summarizing'
              ? 'bg-stone-300 dark:bg-stone-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]'
          }`}
        >
          {summaryStatus === 'summarizing' && <Loader2 className="w-5 h-5 animate-spin" />}
          {summaryStatus === 'idle' && '產生 AI 內容'}
          {summaryStatus === 'summarizing' && 'AI 正在努力撰寫中...'}
          {summaryStatus === 'success' && '重新產生內容'}
          {summaryStatus === 'error' && '重試'}
        </button>
      </div>
    </div>
  );
}
