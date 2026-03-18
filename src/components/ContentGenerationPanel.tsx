import React, { useState } from 'react';
import { Loader2, Plus, Check, X, Wand2 } from 'lucide-react';
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

  const isReady = !!cleanedText;
  const isBusy = summaryStatus === 'summarizing';

  return (
    <div className={`card p-5 transition-all duration-300 ${isReady ? 'card-accent opacity-100' : 'opacity-60'}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm transition-colors ${
          isReady
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-indigo-500/20'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
        }`}>2</div>
        <h3 className={`text-sm font-bold transition-colors ${isReady ? 'text-stone-900 dark:text-white' : 'text-stone-400'}`}>AI 內容產出</h3>
      </div>

      {!isReady ? (
        <p className="text-sm text-stone-400 dark:text-stone-500 flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          完成清稿後即可產生 AI 內容
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">選擇產出格式</label>
            <select
              value={selectedPromptId}
              onChange={handlePromptSelect}
              className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-shadow bg-[var(--bg-card)] dark:text-white"
              disabled={isBusy}
            >
              {prompts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Prompt 內容（可手動修改）</label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="請輸入您希望 AI 產出的具體要求..."
              className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 pb-10 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-shadow bg-[var(--bg-inset)] dark:text-white"
              rows={4}
              disabled={isBusy}
            />
            {isNaming ? (
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <input
                  type="text"
                  value={newPromptName}
                  onChange={e => setNewPromptName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirmSave(); if (e.key === 'Escape') handleCancelSave(); }}
                  placeholder="格式名稱..."
                  className="text-[11px] border border-indigo-300 dark:border-indigo-600 rounded-md px-2 py-1 w-28 outline-none focus:border-indigo-500 bg-[var(--bg-card)] dark:text-white"
                  autoFocus
                />
                <button onClick={handleConfirmSave} className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors" aria-label="確認">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleCancelSave} className="p-1 text-stone-400 hover:text-stone-600 transition-colors" aria-label="取消">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsNaming(true)}
                disabled={isBusy}
                className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-medium bg-[var(--bg-card)] border border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 px-2 py-1 rounded-md hover:bg-stone-50 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> 另存新格式
              </button>
            )}
          </div>

          {/* Secondary CTA — outlined style to differentiate from Step 1 */}
          <button
            onClick={onGenerateSummary}
            disabled={isBusy}
            className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              isBusy
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                : 'bg-[var(--bg-card)] border-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-[0.98]'
            }`}
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                正在產生內容...
              </>
            ) : summaryStatus === 'success' ? (
              '重新產生內容'
            ) : summaryStatus === 'error' ? (
              '重試'
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                產生 AI 內容
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
