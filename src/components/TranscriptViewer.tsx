import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileAudio, Loader2, FileText, Sparkles, Copy, Check, Download, Edit3, Users, Eye, Search, Clock, Wand2, SlidersHorizontal, Crosshair, ChevronDown } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { formatDuration, timeStrToSeconds, generateSRT } from '../lib/utils';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { AudioStatus, SummaryStatus } from '../hooks/useTranscription';

interface TranscriptViewerProps {
  file: File | null;
  audioUrl: string;
  audioDuration: number | null;
  setAudioDuration: (d: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioStatus: AudioStatus;
  summaryStatus: SummaryStatus;
  transcript: string;
  cleanedText: string;
  summaryText: string;
  activeTab: 'summary' | 'cleaned' | 'raw';
  setActiveTab: (t: 'summary' | 'cleaned' | 'raw') => void;
  getCurrentText: () => string;
  setCurrentText: (t: string) => void;
  handleReplaceAll: (from: string, to: string) => void;
}

export default function TranscriptViewer({
  file, audioUrl, audioDuration, setAudioDuration, audioRef,
  audioStatus, summaryStatus, transcript, cleanedText, summaryText,
  activeTab, setActiveTab, getCurrentText, setCurrentText, handleReplaceAll,
}: TranscriptViewerProps) {
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceTo, setReplaceTo] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [timeOffset, setTimeOffset] = useState(-9);
  const [lastClickedTimestamp, setLastClickedTimestamp] = useState<number | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts({
    onToggleEdit: useCallback(() => setIsEditing(prev => !prev), []),
    onExport: useCallback(() => setIsExportMenuOpen(prev => !prev), []),
    onFocusSearch: useCallback(() => searchInputRef.current?.focus(), []),
  });

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  const isProcessing = ['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus);
  const hasContent = !!(transcript || cleanedText || summaryText);
  const wordCount = getCurrentText().replace(/\s+/g, '').length;

  const seekAudio = (timeStr: string) => {
    const seconds = timeStrToSeconds(timeStr);
    setLastClickedTimestamp(seconds);
    const audio = audioRef.current;
    if (!audio) {
      alert('請先上傳音檔，才能點擊時間標記播放。');
      return;
    }
    const targetTime = Math.max(0, seconds + timeOffset);
    const doSeek = () => {
      audio.currentTime = targetTime;
      audio.play().catch(e => {
        console.log("Audio play prevented:", e);
      });
    };
    if (audio.readyState >= 1) {
      doSeek();
    } else {
      audio.addEventListener('loadedmetadata', doSeek, { once: true });
    }
  };

  const handleAutoCalibrate = () => {
    if (lastClickedTimestamp === null || !audioRef.current) return;
    const newOffset = Math.round(audioRef.current.currentTime - lastClickedTimestamp);
    setTimeOffset(newOffset);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCurrentText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = async (format: 'md' | 'txt' | 'srt' | 'docx') => {
    const baseName = file?.name.replace(/\.[^/.]+$/, "") || 'audio';

    if (format === 'docx') {
      const text = getCurrentText();
      const paragraphs = text.split('\n').map(line =>
        new Paragraph({ children: [new TextRun(line)] })
      );
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_${activeTab}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportMenuOpen(false);
      return;
    }

    let content = '';
    let mimeType = 'text/plain';
    if (format === 'srt') {
      content = generateSRT(activeTab === 'raw' ? transcript : cleanedText);
      if (!content) { alert('找不到時間標記，無法產生 SRT 字幕檔。請確認逐字稿中含有 [MM:SS] 格式的時間標記。'); return; }
      mimeType = 'text/srt';
    } else {
      content = getCurrentText();
      mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${activeTab}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const doReplaceAll = () => {
    handleReplaceAll(replaceFrom, replaceTo);
    setReplaceFrom('');
    setReplaceTo('');
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return <span>{text}</span>;
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/30 text-stone-900 dark:text-yellow-200 rounded-sm px-0.5 font-medium shadow-sm">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const parseTimestampsAndHighlight = (text: string) => {
    const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <button
            key={i}
            onClick={() => seekAudio(part)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-mono text-xs bg-blue-50/60 px-1.5 py-0.5 rounded mx-0.5 transition-colors cursor-pointer inline-flex items-center border border-blue-100"
            title={`點擊播放此段落 (自動校準 ${timeOffset > 0 ? '+' : ''}${timeOffset} 秒)`}
          >
            [{part}]
          </button>
        );
      }
      return <span key={i}>{highlightText(part)}</span>;
    });
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800 flex-1 flex flex-col min-h-0">
      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-slate-900 dark:bg-black px-4 py-2.5 flex flex-col gap-2 border-b border-slate-800 rounded-t-lg">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            onLoadedMetadata={(e) => setAudioDuration((e.target as HTMLAudioElement).duration)}
            className="w-full h-10"
          />
          {lastClickedTimestamp !== null && (
            <button
              onClick={handleAutoCalibrate}
              className="self-end flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full transition-colors"
              title="以目前播放位置自動計算 Offset"
            >
              <Crosshair className="w-3 h-3" /> 自動校準 Offset (offset: {timeOffset > 0 ? '+' : ''}{timeOffset}s)
            </button>
          )}
        </div>
      )}

      {/* Document Title */}
      {file?.name && hasContent && (
        <div className="bg-white dark:bg-[#1a1a1a] px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
            <FileAudio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-800 dark:text-white truncate" title={file.name}>{file.name}</h2>
            {audioDuration !== null && <p className="text-[11px] text-slate-400">{formatDuration(audioDuration)}</p>}
          </div>
        </div>
      )}

      {/* Toolbar */}
      {hasContent && (
        <div className="bg-white dark:bg-[#1a1a1a] border-b border-slate-100 dark:border-slate-800 px-3 py-2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜尋文字... (⌘K)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-md pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                  isToolbarExpanded ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                }`}
                title="展開工具列"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">工具</span>
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors font-medium ${
                  isEditing ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-50 shadow-sm'
                }`}
              >
                {isEditing ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isEditing ? '編輯模式 (⌘E)' : '閱讀模式 (⌘E)'}
              </button>
            </div>
          </div>
          {isToolbarExpanded && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-500" />
                <input type="text" placeholder="原名" value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)} className="text-sm border border-stone-200 dark:border-stone-600 rounded-md px-2 py-1.5 w-20 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white" />
                <span className="text-stone-400">→</span>
                <input type="text" placeholder="新名" value={replaceTo} onChange={e => setReplaceTo(e.target.value)} className="text-sm border border-stone-200 dark:border-stone-600 rounded-md px-2 py-1.5 w-20 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white" />
                <button onClick={doReplaceAll} disabled={!replaceFrom || !replaceTo} className="text-xs bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 hover:bg-stone-100 text-stone-700 dark:text-stone-200 px-2.5 py-1.5 rounded-md font-medium disabled:opacity-50 transition-colors shadow-sm">替換</button>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <span className="text-xs text-stone-600 dark:text-stone-400">時間校準:</span>
                <input type="number" value={timeOffset} onChange={e => setTimeOffset(Number(e.target.value))} className="w-16 text-sm border border-stone-200 dark:border-stone-600 rounded-md px-2 py-1.5 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white" title="調整時間戳記的秒數誤差" />
                <span className="text-xs text-stone-500">秒</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a1a1a] shrink-0">
        <button onClick={() => setActiveTab('raw')} className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ activeTab === 'raw' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900' }`}>
          <FileText className="w-4 h-4" /> 原始逐字稿
        </button>
        <button onClick={() => setActiveTab('cleaned')} className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ activeTab === 'cleaned' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900' }`}>
          <Sparkles className="w-4 h-4" /> 清稿逐字稿
        </button>
        <button onClick={() => setActiveTab('summary')} className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ activeTab === 'summary' ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900' }`}>
          <Wand2 className="w-4 h-4" /> AI 整理內容
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-white dark:bg-[#1a1a1a] flex flex-col min-h-0">
        {audioStatus === 'idle' && summaryStatus === 'idle' && !transcript && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-6 text-center">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">上傳音檔並點擊「開始轉錄與清稿」<br/>結果將顯示於此</p>
          </div>
        )}

        {(isProcessing && (!transcript || (activeTab === 'cleaned' && !cleanedText))) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 mb-3 animate-spin text-slate-400" />
            <p className="text-slate-700 dark:text-slate-300 font-medium text-sm animate-pulse">
              {audioStatus === 'uploading' && '正在上傳音檔至伺服器...'}
              {audioStatus === 'processing' && '伺服器正在處理音檔...'}
              {audioStatus === 'transcribing' && '正在脩聽並轉錄音檔...'}
              {audioStatus === 'cleaning' && '正在進行 AI 清稿與語句修飾...'}
            </p>
            <p className="text-xs mt-1.5 text-slate-400">這可能需要幾分鐘的時間，請稍候</p>
          </div>
        )}

        {summaryStatus === 'summarizing' && activeTab === 'summary' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-6 text-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm z-10">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-indigo-500" />
            <p className="text-indigo-900 dark:text-indigo-300 font-medium text-lg animate-pulse">正在根據您的格式要求產生 AI 內容...</p>
          </div>
        )}

        {hasContent && (
          <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
            {isEditing ? (
              <textarea
                value={getCurrentText()}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder="內容將顯示於此，您可以直接點擊進行編輯..."
                className={`w-full h-full min-h-full resize-none border-0 bg-transparent p-0 focus:ring-0 text-slate-800 dark:text-slate-200 leading-7 outline-none ${
                  activeTab === 'raw' ? 'font-mono text-sm' : 'font-sans text-base'
                }`}
              />
            ) : (
              <div className={`whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-7 ${
                activeTab === 'raw' ? 'font-mono text-sm' : 'font-sans text-base'
              }`}>
                {parseTimestampsAndHighlight(getCurrentText())}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasContent && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a1a1a] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-stone-400">{wordCount.toLocaleString()} 字</span>
          <div className="flex items-center gap-2">
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={!getCurrentText()}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                下載
                <ChevronDown className="w-3 h-3" />
              </button>
              {isExportMenuOpen && (
                <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg overflow-hidden z-20 min-w-[120px]">
                  {(['md', 'txt', 'srt', 'docx'] as const).map(fmt => (
                    <button key={fmt} onClick={() => downloadFile(fmt)} className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" /> .{fmt}{fmt === 'srt' ? ' (字幕)' : fmt === 'docx' ? ' (Word)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={copyToClipboard}
              disabled={!getCurrentText()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white border border-transparent rounded-md text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已複製' : '複製內容'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
