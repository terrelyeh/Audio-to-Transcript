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
  const [timeOffset, setTimeOffset] = useState(0);
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
        <mark key={i} className="bg-yellow-200/80 dark:bg-yellow-500/20 text-stone-900 dark:text-yellow-200 rounded-sm px-0.5 font-medium">{part}</mark>
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
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-mono text-xs nums bg-indigo-50/50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded-md mx-0.5 transition-colors cursor-pointer inline-flex items-center border border-indigo-100 dark:border-indigo-800/40"
            title={`點擊播放（校準 ${timeOffset > 0 ? '+' : ''}${timeOffset}s）`}
          >
            [{part}]
          </button>
        );
      }
      return <span key={i}>{highlightText(part)}</span>;
    });
  };

  // Tab config with disabled state
  const tabs = [
    { id: 'raw' as const, label: '原始逐字稿', icon: FileText, hasContent: !!transcript },
    { id: 'cleaned' as const, label: '清稿逐字稿', icon: Sparkles, hasContent: !!cleanedText },
    { id: 'summary' as const, label: 'AI 整理內容', icon: Wand2, hasContent: !!summaryText },
  ];

  return (
    <div className="card flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-[var(--bg-inset)] px-4 py-3 flex flex-col gap-2 border-b border-[var(--border-subtle)] rounded-t-xl">
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
              className="self-end flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 px-3 py-1 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/40"
              title="以目前播放位置自動計算 Offset"
            >
              <Crosshair className="w-3 h-3" /> 自動校準（offset: <span className="nums">{timeOffset > 0 ? '+' : ''}{timeOffset}s</span>）
            </button>
          )}
        </div>
      )}

      {/* Document Title */}
      {file?.name && hasContent && (
        <div className="bg-[var(--bg-card)] px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileAudio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-800 dark:text-white truncate" title={file.name}>{file.name}</h2>
            {audioDuration !== null && <p className="text-[11px] text-stone-400 dark:text-stone-500 nums">{formatDuration(audioDuration)}</p>}
          </div>
        </div>
      )}

      {/* Toolbar */}
      {hasContent && (
        <div className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-3 py-2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜尋文字… ⌘K"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 bg-[var(--bg-card)] dark:text-white transition-shadow"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  isToolbarExpanded ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400' : 'bg-[var(--bg-card)] border-stone-200 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
                aria-label="展開工具列"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">工具</span>
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  isEditing ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400' : 'bg-[var(--bg-card)] border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                {isEditing ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {isEditing ? '編輯中 ⌘E' : '閱讀 ⌘E'}
              </button>
            </div>
          </div>
          {isToolbarExpanded && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                <input type="text" placeholder="原名" value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)} className="text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1 w-20 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 bg-[var(--bg-card)] dark:text-white transition-shadow" />
                <span className="text-stone-300 dark:text-stone-600 text-xs">→</span>
                <input type="text" placeholder="新名" value={replaceTo} onChange={e => setReplaceTo(e.target.value)} className="text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1 w-20 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 bg-[var(--bg-card)] dark:text-white transition-shadow" />
                <button onClick={doReplaceAll} disabled={!replaceFrom || !replaceTo} className="text-xs bg-[var(--bg-card)] border border-stone-200 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-lg font-medium disabled:opacity-50 transition-colors">全部替換</button>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs text-stone-500 dark:text-stone-400">時間校準</span>
                <input type="number" value={timeOffset} onChange={e => setTimeOffset(Number(e.target.value))} className="w-14 text-sm border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 bg-[var(--bg-card)] dark:text-white nums transition-shadow" title="調整時間戳記的秒數誤差" />
                <span className="text-xs text-stone-400">秒</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-card)] shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors relative ${
                isActive
                  ? 'text-stone-900 dark:text-white'
                  : tab.hasContent
                    ? 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    : 'text-stone-300 dark:text-stone-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.hasContent && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-stone-900 dark:bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-[var(--bg-card)] flex flex-col min-h-0">
        {/* Empty state */}
        {audioStatus === 'idle' && summaryStatus === 'idle' && !transcript && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 p-6 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 -m-4 rounded-full bg-stone-100 dark:bg-stone-800/50 opacity-60" />
              <div className="absolute inset-0 -m-8 rounded-full bg-stone-100/50 dark:bg-stone-800/30 opacity-40" />
              <FileText className="w-12 h-12 relative opacity-30" />
            </div>
            <p className="text-sm text-stone-400 dark:text-stone-500">上傳音檔並點擊「開始轉錄與清稿」</p>
            <p className="text-xs text-stone-300 dark:text-stone-600 mt-1">轉錄結果將顯示於此</p>
          </div>
        )}

        {/* Processing overlay */}
        {(isProcessing && (!transcript || (activeTab === 'cleaned' && !cleanedText))) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-card)]/80 backdrop-blur-sm z-10">
            <Loader2 className="w-7 h-7 mb-3 animate-spin text-indigo-500" />
            <p className="shimmer-text font-medium text-sm">
              {audioStatus === 'uploading' && '正在上傳音檔...'}
              {audioStatus === 'processing' && '伺服器處理中...'}
              {audioStatus === 'transcribing' && '正在聆聽並轉錄音檔...'}
              {audioStatus === 'cleaning' && '正在進行 AI 清稿...'}
            </p>
            <p className="text-xs mt-1.5 text-stone-400 dark:text-stone-500">這可能需要幾分鐘，請稍候</p>
          </div>
        )}

        {/* Summary generating overlay */}
        {summaryStatus === 'summarizing' && activeTab === 'summary' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-card)]/80 backdrop-blur-sm z-10">
            <Loader2 className="w-7 h-7 mb-3 animate-spin text-indigo-500" />
            <p className="shimmer-text font-medium text-sm">正在產生 AI 內容...</p>
          </div>
        )}

        {hasContent && (
          <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
            {isEditing ? (
              <div className="relative h-full">
                <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/30 px-3 py-1.5 rounded-lg mb-3 border border-indigo-100 dark:border-indigo-800/40">
                  <Edit3 className="w-3 h-3" />
                  編輯模式 — 變更會自動儲存為草稿
                </div>
                <textarea
                  value={getCurrentText()}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="內容將顯示於此，您可以直接編輯..."
                  className={`w-full h-full min-h-full resize-none border-0 bg-transparent p-0 pt-9 focus:ring-0 text-stone-800 dark:text-stone-200 leading-7 outline-none ${
                    activeTab === 'raw' ? 'font-mono text-sm' : 'font-sans text-base'
                  }`}
                />
              </div>
            ) : (
              <div className={`whitespace-pre-wrap text-stone-800 dark:text-stone-200 leading-7 ${
                activeTab === 'raw' ? 'font-mono text-sm' : 'font-sans text-[15px]'
              }`}>
                {parseTimestampsAndHighlight(getCurrentText())}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasContent && (
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-stone-400 dark:text-stone-500 nums">{wordCount.toLocaleString()} 字</span>
          <div className="flex items-center gap-1.5">
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={!getCurrentText()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] border border-stone-200 dark:border-stone-600 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                下載
                <ChevronDown className="w-3 h-3" />
              </button>
              {isExportMenuOpen && (
                <div className="absolute bottom-full mb-1.5 right-0 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg overflow-hidden z-20 min-w-[140px]">
                  {(['md', 'txt', 'srt', 'docx'] as const).map(fmt => (
                    <button key={fmt} onClick={() => downloadFile(fmt)} className="w-full text-left px-4 py-2.5 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors">
                      <Download className="w-3.5 h-3.5 text-stone-400" />
                      .{fmt}
                      <span className="text-stone-400 dark:text-stone-500 text-xs ml-auto">
                        {fmt === 'srt' ? '字幕' : fmt === 'docx' ? 'Word' : fmt === 'md' ? 'Markdown' : '純文字'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={copyToClipboard}
              disabled={!getCurrentText()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 dark:bg-stone-200 border border-transparent rounded-lg text-xs font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-100 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已複製' : '複製'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
