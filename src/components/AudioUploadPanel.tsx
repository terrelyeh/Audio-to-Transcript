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
    <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold">1</div>
        <h3 className="text-lg font-bold text-stone-900 dark:text-white">語音轉錄與清稿</h3>
      </div>

      {/* Upload Tabs */}
      <div className="flex gap-2 mb-4 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
        <button
          onClick={() => setUploadMode('local')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${uploadMode === 'local' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          本地上傳
        </button>
        <button
          onClick={() => setUploadMode('drive')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${uploadMode === 'drive' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          Google Drive
        </button>
      </div>

      {uploadMode === 'local' ? (
        <div
          className={`p-5 rounded-xl border-2 border-dashed transition-colors mb-4 ${
            file ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-stone-200 dark:border-stone-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-stone-50 dark:hover:bg-stone-800'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,video/*"
            className="hidden"
          />
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-3">
              {file ? <FileAudio className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
            </div>
            {file ? (
              <>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white mb-1 truncate w-full px-2">{file.name}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  onClick={() => { setFile(null); onResetState(); }}
                  className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline"
                >
                  移除檔案
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-stone-900 dark:text-white mb-1">點擊或拖曳上傳音檔</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">支援 MP3, WAV, M4A (上限 70MB)</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors shadow-sm"
                >
                  選擇檔案
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 mb-4">
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">貼上 Google Drive 檔案連結</label>
          <input
            type="text"
            value={driveLink}
            onChange={e => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 mb-3 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white"
          />
          <button
            onClick={handleDriveSubmit}
            disabled={!driveLink || isFetchingDrive}
            className="w-full py-2 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isFetchingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {isFetchingDrive ? '正在下載檔案...' : '載入檔案 (上限 70MB)'}
          </button>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-2 text-center">請確保連結權限已設為「知道連結的人均可讀取」</p>
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">自訂專有名詞字典 <span className="text-stone-400 font-normal text-xs">(選填)</span></label>
          {glossaryTerms.length > 0 && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
              <Check className="w-3 h-3" /> 已自動儲存在瀏覽器
            </span>
          )}
        </div>

        <button
          onClick={() => setIsAiInfoOpen(!isAiInfoOpen)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium mb-3 transition-colors"
        >
          {isAiInfoOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          為什麼要提供專有名詞？ (AI 辨識提示)
        </button>

        {isAiInfoOpen && (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-800/60 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                <p className="font-medium mb-1 text-indigo-900 dark:text-indigo-200">提供專有名詞可大幅提升 AI 辨識準確度，避免同音異字。建議輸入：</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li><span className="font-medium text-indigo-900 dark:text-indigo-200">人名</span>：主持人與來賓的名字 (如：王小明)</li>
                  <li><span className="font-medium text-indigo-900 dark:text-indigo-200">技術名詞</span>：專案或技術名稱 (如：React, Gemini)</li>
                  <li><span className="font-medium text-indigo-900 dark:text-indigo-200">地名/機構</span>：特定地點或公司名 (如：台北車站)</li>
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
            placeholder="輸入專有名詞 (可用逗號或換行分隔多個，按 Enter 新增)"
            className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-stone-50 dark:bg-stone-800 dark:text-white resize-y min-h-[80px]"
            disabled={isProcessing}
          />
          <div className="flex items-center justify-between">
            {glossaryTerms.length > 0 ? (
              <button
                onClick={() => setIsGlossaryModalOpen(true)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                查看 / 管理已儲存的專有名詞 ({glossaryTerms.length})
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleAddTerms}
              disabled={!termInput.trim() || isProcessing}
              className="px-5 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              新增至字典
            </button>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">轉錄語言</label>
        <select
          value={transcriptionLang}
          onChange={e => onLangChange(e.target.value)}
          className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white dark:bg-stone-800 dark:text-white"
          disabled={isProcessing}
        >
          {LANG_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onProcessAudio}
        disabled={!file || isProcessing}
        className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
          !file || isProcessing
            ? 'bg-stone-300 dark:bg-stone-600 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]'
        }`}
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
        <div className="mt-5 p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800">
          <h4 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">處理進度</h4>

          {audioStatus !== 'error' && audioStatus !== 'success' && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-1.5">
                <span>整體進度</span>
                <span>{audioProgress}%</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${audioProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <ul className="space-y-3">
            {[
              { label: '1. 上傳音檔', activeOn: 'uploading' as const, doneOn: ['processing', 'transcribing', 'cleaning', 'success'] },
              { label: '2. 伺服器處理', activeOn: 'processing' as const, doneOn: ['transcribing', 'cleaning', 'success'] },
              { label: '3. 語音轉錄', activeOn: 'transcribing' as const, doneOn: ['cleaning', 'success'] },
              { label: '4. AI 清稿', activeOn: 'cleaning' as const, doneOn: [] as string[] },
            ].map((step, i) => {
              const isActive = audioStatus === step.activeOn;
              const isDone = i < 3
                ? (step.doneOn.includes(audioStatus) || !!transcript)
                : !!cleanedText;
              return (
                <li key={step.label} className="flex items-center gap-3">
                  <div className={`mt-0.5 ${isActive ? 'text-indigo-600' : isDone ? 'text-emerald-500' : 'text-stone-300'}`}>
                    {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : isDone ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-300 dark:border-stone-600" />}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-indigo-900 dark:text-indigo-300' : isDone ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-500'}`}>
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
