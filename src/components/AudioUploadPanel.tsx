import React, { useState, type RefObject } from 'react';
import { Upload, FileAudio, Loader2, CheckCircle2, Check, Cloud, Info, ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import type { AudioStatus } from '../hooks/useTranscription';

interface AudioUploadPanelProps {
  // File state
  file: File | null;
  setFile: (f: File | null) => void;
  uploadMode: 'local' | 'drive';
  setUploadMode: (m: 'local' | 'drive') => void;
  driveLink: string;
  setDriveLink: (v: string) => void;
  isFetchingDrive: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDriveSubmit: () => void;
  // Glossary
  glossaryTerms: string[];
  termInput: string;
  setTermInput: (v: string) => void;
  handleAddTerms: () => void;
  setIsGlossaryModalOpen: (v: boolean) => void;
  // Transcription
  audioStatus: AudioStatus;
  audioProgress: number;
  transcript: string;
  cleanedText: string;
  onProcessAudio: () => void;
  onResetState: () => void;
  // Language
  transcriptionLang: string;
  onLangChange: (lang: string) => void;
}

const LANG_OPTIONS = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh-CN', label: '简体中文' },
];

export default function AudioUploadPanel({
  file, setFile, uploadMode, setUploadMode, driveLink, setDriveLink,
  isFetchingDrive, fileInputRef, handleFileChange, handleDrop, handleDragOver,
  handleDriveSubmit, glossaryTerms, termInput, setTermInput, handleAddTerms,
  setIsGlossaryModalOpen, audioStatus, audioProgress, transcript, cleanedText,
  onProcessAudio, onResetState, transcriptionLang, onLangChange,
}: AudioUploadPanelProps) {
  const [isAiInfoOpen, setIsAiInfoOpen] = useState(false);
  const isProcessing = ['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus);

  return (
    <div className="card card-accent p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-indigo-500/20">1</div>
        <h3 className="text-base font-bold text-stone-900 dark:text-white">語音轉錄與清稿</h3>
      </div>

      {/* Upload Tabs */}
      <div className="flex gap-1 mb-4 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
        <button
          onClick={() => setUploadMode('local')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${uploadMode === 'local' ? 'bg-[var(--bg-card)] text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          本地上傳
        </button>
        <button
          onClick={() => setUploadMode('drive')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${uploadMode === 'drive' ? 'bg-[var(--bg-card)] text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          Google Drive
        </button>
      </div>

      {uploadMode === 'local' ? (
        <div
          className={`group p-5 rounded-xl border-2 border-dashed transition-all duration-150 mb-4 cursor-pointer ${
            file ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-stone-200 dark:border-stone-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,video/*"
            className="hidden"
          />
          <div className="flex flex-col items-center text-center">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors ${
              file ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
            }`}>
              {file ? <FileAudio className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            {file ? (
              <>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white mb-0.5 truncate w-full px-2">{file.name}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 nums">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); onResetState(); }}
                  className="text-xs text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  移除檔案
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white mb-0.5">點擊或拖曳上傳音檔</h3>
                <p className="text-xs text-stone-400 dark:text-stone-500">支援 MP3, WAV, M4A（上限 70MB）</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-[var(--bg-inset)] mb-4">
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">貼上 Google Drive 檔案連結</label>
          <input
            type="text"
            value={driveLink}
            onChange={e => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 mb-3 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 bg-[var(--bg-card)] dark:text-white transition-shadow"
          />
          <button
            onClick={handleDriveSubmit}
            disabled={!driveLink || isFetchingDrive}
            className="w-full py-2 bg-[var(--bg-card)] border border-stone-200 dark:border-stone-600 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isFetchingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {isFetchingDrive ? '正在下載檔案...' : '載入檔案'}
          </button>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-2.5 text-center leading-relaxed">
            請確保連結權限已設為「知道連結的人均可檢視」<br/>
            <span className="text-stone-400/80">（右鍵檔案 → 共用 → 變更為「知道連結的人」）</span>
          </p>
        </div>
      )}

      {/* Glossary Section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">
            專有名詞字典 <span className="text-stone-400 font-normal text-xs">(選填)</span>
          </label>
          {glossaryTerms.length > 0 && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
              <Check className="w-3 h-3" /> 已儲存
            </span>
          )}
        </div>

        <button
          onClick={() => setIsAiInfoOpen(!isAiInfoOpen)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium mb-3 transition-colors"
        >
          {isAiInfoOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          為什麼要提供專有名詞？
        </button>

        {isAiInfoOpen && (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-800/40 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                <p className="font-medium mb-1 text-indigo-900 dark:text-indigo-200">提供專有名詞可大幅提升辨識準確度，避免同音異字：</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li><span className="font-medium text-indigo-900 dark:text-indigo-200">人名</span>：主持人、來賓姓名</li>
                  <li><span className="font-medium text-indigo-900 dark:text-indigo-200">術語</span>：技術名詞、品牌名</li>
                  <li><span className="font-medium text-indigo-900 dark:text-indigo-200">地名</span>：地點、機構名稱</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            value={termInput}
            onChange={e => setTermInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTerms(); } }}
            placeholder="輸入專有名詞，逗號或換行分隔，按 Enter 新增"
            className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-shadow bg-[var(--bg-inset)] dark:text-white resize-y min-h-[72px]"
            disabled={isProcessing}
          />
          <div className="flex items-center justify-between">
            {glossaryTerms.length > 0 ? (
              <button
                onClick={() => setIsGlossaryModalOpen(true)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                管理名詞 ({glossaryTerms.length})
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleAddTerms}
              disabled={!termInput.trim() || isProcessing}
              className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100 dark:border-indigo-800/60"
            >
              新增至字典
            </button>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">轉錄語言</label>
        <select
          value={transcriptionLang}
          onChange={e => onLangChange(e.target.value)}
          className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-shadow bg-[var(--bg-card)] dark:text-white"
          disabled={isProcessing}
        >
          {LANG_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Primary CTA */}
      <button
        onClick={onProcessAudio}
        disabled={!file || isProcessing}
        className="w-full py-3 px-4 rounded-xl font-medium text-white btn-primary flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
        {audioStatus === 'idle' && '開始轉錄與清稿'}
        {audioStatus === 'uploading' && '上傳音檔中...'}
        {audioStatus === 'processing' && '伺服器處理中...'}
        {audioStatus === 'transcribing' && '轉錄中...'}
        {audioStatus === 'cleaning' && '清稿中...'}
        {audioStatus === 'success' && '重新處理音檔'}
        {audioStatus === 'error' && '重試'}
      </button>

      {/* Audio Progress Steps */}
      {(audioStatus !== 'idle' || transcript) && (
        <div className="mt-5 p-4 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-subtle)]">
          <h4 className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-3">處理進度</h4>

          {audioStatus !== 'error' && audioStatus !== 'success' && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-1.5">
                <span>整體進度</span>
                <span className="nums">{audioProgress}%</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="progress-fill h-1.5 rounded-full"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
            </div>
          )}

          <ul className="space-y-2.5">
            {[
              { label: '上傳音檔', activeOn: 'uploading' as const, doneOn: ['processing', 'transcribing', 'cleaning', 'success'] },
              { label: '伺服器處理', activeOn: 'processing' as const, doneOn: ['transcribing', 'cleaning', 'success'] },
              { label: '語音轉錄', activeOn: 'transcribing' as const, doneOn: ['cleaning', 'success'] },
              { label: 'AI 清稿', activeOn: 'cleaning' as const, doneOn: [] as string[] },
            ].map((step, i) => {
              const isActive = audioStatus === step.activeOn;
              const isDone = i < 3
                ? (step.doneOn.includes(audioStatus) || !!transcript)
                : !!cleanedText;
              return (
                <li key={step.label} className="flex items-center gap-2.5">
                  <div className={`shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isDone ? 'text-emerald-500' : 'text-stone-300 dark:text-stone-600'}`}>
                    {isActive ? (
                      <div className="relative">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                      </div>
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-[1.5px] border-stone-300 dark:border-stone-600" />
                    )}
                  </div>
                  <span className={`text-sm ${isActive ? 'font-medium text-indigo-700 dark:text-indigo-300' : isDone ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
