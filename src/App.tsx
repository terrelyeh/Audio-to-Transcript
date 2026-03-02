import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, Loader2, CheckCircle2, AlertCircle, FileText, Sparkles, Copy, Check, Download, Edit3, Users, Eye, Plus, Search, Clock, Wand2, Cloud, Info, X, ChevronDown, ChevronRight, BookOpen, Moon, Sun, SlidersHorizontal, Crosshair, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_PROMPTS = [
  { id: '1', name: '預設：重點與待辦事項', prompt: '條列式列出核心重點，並標示待辦事項 (Action Items)。' },
  { id: '2', name: '正式會議紀錄', prompt: '請整理成正式的會議紀錄格式，包含：會議主旨、討論重點、結論、後續追蹤事項。' },
  { id: '3', name: '部落格文章', prompt: '請將內容改寫成一篇流暢的部落格文章，適合發布在網路上。' },
  { id: '4', name: '客戶痛點分析', prompt: '請只列出客戶提到的痛點、抱怨與需求。' }
];

const MAX_FILE_SIZE = 65 * 1024 * 1024; // 65MB

const loadPrompts = () => {
  try {
    const saved = localStorage.getItem('ai_transcriber_prompts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PROMPTS;
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const timeStrToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

const secondsToSRTTime = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},000`;
};

const generateSRT = (text: string): string => {
  const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
  const matches = [...text.matchAll(timestampRegex)];
  if (matches.length === 0) return '';
  let srt = '';
  for (let i = 0; i < matches.length; i++) {
    const startTs = timeStrToSeconds(matches[i][1]);
    const endTs = matches[i + 1] ? timeStrToSeconds(matches[i + 1][1]) : startTs + 5;
    const startIdx = (matches[i].index ?? 0) + matches[i][0].length;
    const endIdx = matches[i + 1]?.index ?? text.length;
    const content = text.substring(startIdx, endIdx).replace(/\[.*?\]/g, '').trim().replace(/\n+/g, ' ');
    if (content) {
      srt += `${i + 1}\n${secondsToSRTTime(startTs)} --> ${secondsToSRTTime(endTs)}\n${content}\n\n`;
    }
  }
  return srt;
};

const classifyError = (message: string): string => {
  if (!message) return '發生未知錯誤，請重試。';
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
    return 'AI 伺服器請求量超過配額限制。請稍等 1~2 分鐘後點擊「重試」即可，不需要重新上傳音檔。';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('ERR_NETWORK')) {
    return '網路連線失敗，請確認您的網路狀態後重試。';
  }
  if (message.includes('INVALID_ARGUMENT') || message.includes('mimeType') || message.includes('unsupported')) {
    return '音檔格式不支援，請嘗試轉換為 MP3 或 WAV 格式再上傳。';
  }
  if (message.includes('File processing failed') || message.includes('FAILED')) {
    return '伺服器無法處理此音檔，請確認檔案未損壞，或嘗試其他格式。';
  }
  return message;
};

export default function App() {
  // Dark mode
  const [isDark, setIsDark] = useState(() => localStorage.getItem('ai_transcriber_dark') === 'true');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('ai_transcriber_dark', String(isDark));
  }, [isDark]);

  // Core State
  const [file, setFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  
  // Upload State
  const [uploadMode, setUploadMode] = useState<'local' | 'drive'>('local');
  const [driveLink, setDriveLink] = useState('');
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);

  // Split Status States
  const [audioStatus, setAudioStatus] = useState<'idle' | 'uploading' | 'processing' | 'transcribing' | 'cleaning' | 'success' | 'error'>('idle');
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'summarizing' | 'success' | 'error'>('idle');
  
  const [transcript, setTranscript] = useState<string>('');
  const [cleanedText, setCleanedText] = useState<string>('');
  const [summaryText, setSummaryText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'cleaned' | 'raw'>('summary');
  const [copied, setCopied] = useState(false);

  // UI State
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Advanced Features State
  const [glossaryTerms, setGlossaryTerms] = useState<string[]>(() => {
    const saved = localStorage.getItem('ai_transcriber_glossary') || '';
    return saved.split(/[,，\n]+/).map(t => t.trim()).filter(Boolean);
  });
  const [termInput, setTermInput] = useState('');
  const [prompts, setPrompts] = useState(loadPrompts);
  const [selectedPromptId, setSelectedPromptId] = useState('1');
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPTS[0].prompt);

  useEffect(() => {
    localStorage.setItem('ai_transcriber_glossary', glossaryTerms.join(', '));
  }, [glossaryTerms]);

  useEffect(() => {
    localStorage.setItem('ai_transcriber_prompts', JSON.stringify(prompts));
  }, [prompts]);

  const handleAddTerms = () => {
    if (!termInput.trim()) return;
    const newTerms = termInput.split(/[,，\n]+/).map(t => t.trim()).filter(Boolean);
    const uniqueTerms = Array.from(new Set([...glossaryTerms, ...newTerms]));
    setGlossaryTerms(uniqueTerms);
    setTermInput('');
  };

  const handleRemoveTerm = (termToRemove: string) => {
    setGlossaryTerms(glossaryTerms.filter(t => t !== termToRemove));
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceTo, setReplaceTo] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isAiInfoOpen, setIsAiInfoOpen] = useState(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [timeOffset, setTimeOffset] = useState(-9);
  const [lastClickedTimestamp, setLastClickedTimestamp] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle Audio URL creation/cleanup
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl('');
      setAudioDuration(null);
    }
  }, [file]);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      const msg = `檔案大小超過限制！目前最大支援 65MB（您上傳的檔案為 ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB）。`;
      alert(msg);
      setErrorMessage(msg);
      setAudioStatus('error');
      setFile(null);
      return false;
    }
    setFile(selectedFile);
    resetState();
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('audio/') || droppedFile.type.startsWith('video/')) {
        validateAndSetFile(droppedFile);
      } else {
        setErrorMessage('請上傳音訊或影片檔案。');
        setAudioStatus('error');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDriveSubmit = async () => {
    if (!driveLink) return;
    setIsFetchingDrive(true);
    setAudioStatus('uploading');
    setErrorMessage('');
    try {
      const res = await fetch('/api/fetch-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: driveLink })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '下載失敗');
      }
      
      const blob = await res.blob();
      const filename = "drive_audio_" + Date.now() + (blob.type.includes('video') ? '.mp4' : '.mp3');
      const downloadedFile = new File([blob], filename, { type: blob.type || 'audio/mp3' });
      
      if (validateAndSetFile(downloadedFile)) {
        setUploadMode('local');
        setDriveLink('');
        setAudioStatus('idle');
      }
    } catch (e: any) {
      const errMsg = e.message?.includes('timeout') || e.message?.includes('504')
        ? 'Google Drive 下載逾時，請確認檔案小於 65MB 且連結權限正確。'
        : classifyError(e.message);
      setErrorMessage(errMsg);
      setAudioStatus('error');
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const resetState = () => {
    setAudioStatus('idle');
    setSummaryStatus('idle');
    setTranscript('');
    setCleanedText('');
    setSummaryText('');
    setErrorMessage('');
    setIsEditing(false);
    setSearchQuery('');
    setLastClickedTimestamp(null);
  };

  const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPromptId(id);
    const p = prompts.find(p => p.id === id);
    if (p) setCustomPrompt(p.prompt);
  };

  const handleSaveNewPrompt = () => {
    const name = window.prompt('請輸入新格式的名稱：');
    if (name && name.trim()) {
      const newPrompt = {
        id: Date.now().toString(),
        name: name.trim(),
        prompt: customPrompt
      };
      setPrompts([...prompts, newPrompt]);
      setSelectedPromptId(newPrompt.id);
    }
  };

  // Step 1: Process Audio (Transcribe & Clean)
  const processAudio = async () => {
    if (!file) return;

    setAudioStatus('uploading');
    setAudioProgress(0);
    setSummaryStatus('idle');
    setErrorMessage('');
    setTranscript('');
    setCleanedText('');
    setSummaryText('');
    setIsEditing(false);

    let progressInterval: ReturnType<typeof setInterval>;
    const startProgress = (start: number, end: number, duration: number) => {
      clearInterval(progressInterval);
      let current = start;
      const step = (end - start) / (duration / 100);
      progressInterval = setInterval(() => {
        current += step;
        if (current >= end) { current = end; clearInterval(progressInterval); }
        setAudioProgress(Math.floor(current));
      }, 100);
    };

    try {
      startProgress(0, 20, 3000);
      let uploadedFile = await ai.files.upload({
        file: file,
        config: { mimeType: file.type || 'audio/mp3' }
      });

      if (uploadedFile.state === 'PROCESSING') {
        setAudioStatus('processing');
        startProgress(20, 40, 5000);
      } else {
        setAudioProgress(40);
      }
      while (uploadedFile.state === 'PROCESSING') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        uploadedFile = await ai.files.get({ name: uploadedFile.name! });
      }
      if (uploadedFile.state === 'FAILED') {
        clearInterval(progressInterval);
        throw new Error('File processing failed on the server.');
      }

      // Transcribe with streaming
      setAudioStatus('transcribing');
      startProgress(40, 70, 15000);
      const glossaryPrompt = glossaryTerms.length > 0 ? `\n4. 請特別注意以下專有名詞，確保辨識正確（可能包含人名、技術名詞、地名等）：\n${glossaryTerms.join(', ')}` : '';
      setActiveTab('raw');
      let rawTranscript = '';
      const transcribeStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType || file.type || 'audio/mp3' } },
            { text: `請將這段語音轉錄為繁體中文逐字稿。要求：
1. 盡可能保留所有細節，包含語氣詞。
2. 加上時間標記 (Timestamps)，格式為 [MM:SS] 或 [HH:MM:SS]，每隔一段對話或段落標記一次。
3. 根據語意適當分段。
4. **說話者辨識（Speaker Diarization）：請從語音內容辨識說話者，並直接用說話者的姓名或身份標示（例如「主持人：...」、「王小明：...」）。若無法辨識名字，則用角色（「主持人」、「來賓」）。若對話中只有一位說話者則不須標示。**${glossaryPrompt}` },
          ],
        },
      });
      for await (const chunk of transcribeStream) {
        rawTranscript += chunk.text || '';
        setTranscript(rawTranscript);
      }

      // Clean with streaming
      setAudioStatus('cleaning');
      startProgress(70, 95, 10000);
      const cleanGlossaryPrompt = glossaryTerms.length > 0 ? `\n6. 請特別注意以下專有名詞，確保辨識正確（可能包含人名、技術名詞、地名等）：\n${glossaryTerms.join(', ')}` : '';
      setActiveTab('cleaned');
      let cleaned = '';
      const cleanStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: `以下是一段語音轉錄的逐字稿。請幫我進行「清稿」（Cleanup）。要求：
1. 去除冗言贅字（如：嗯、啊、那個、就是說等）。
2. 修正語法錯誤，使句子通順。
3. 保持原本的語意和說話者的風格。
4. 重新排版，加上適當的標點符號和分段。
5. 保留原本的時間標記 (Timestamps)。
6. **保留原始逐字稿中的說話者標示（如：[說話者A]），勿删除或合並。**${cleanGlossaryPrompt}

原始逐字稿：
${rawTranscript}`,
      });
      for await (const chunk of cleanStream) {
        cleaned += chunk.text || '';
        setCleanedText(cleaned);
      }

      clearInterval(progressInterval);
      setAudioProgress(100);
      setAudioStatus('success');

    } catch (error: any) {
      clearInterval(progressInterval!);
      setAudioProgress(0);
      console.error('processAudio error:', error);
      const msg = error?.message || error?.toString() || '發生未知錯誤，請重試。';
      setErrorMessage(classifyError(msg));
      setAudioStatus('error');
    }
  };

  // Step 2: Generate Summary/Content
  const generateSummary = async (textToSummarize = cleanedText) => {
    if (!textToSummarize) return;
    
    setSummaryStatus('summarizing');
    setErrorMessage('');
    setActiveTab('summary');
    setIsEditing(false);

    try {
      let summaryContent = '';
      const summaryStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: `以下是一段經過清稿的會議記錄/訪談逐字稿。請根據以下要求進行內容產出。
要求格式與風格：
${customPrompt}

清稿內容：
${textToSummarize}
`,
      });
      for await (const chunk of summaryStream) {
        summaryContent += chunk.text || '';
        setSummaryText(summaryContent);
      }
      setSummaryStatus('success');
    } catch (error: any) {
      console.error('generateSummary error:', error);
      const msg = error?.message || error?.toString() || '發生未知錯誤，請重試。';
      setErrorMessage(classifyError(msg));
      setSummaryStatus('error');
    }
  };

  const getCurrentText = () => {
    if (activeTab === 'summary') return summaryText;
    if (activeTab === 'cleaned') return cleanedText;
    return transcript;
  };

  const setCurrentText = (text: string) => {
    if (activeTab === 'summary') setSummaryText(text);
    else if (activeTab === 'cleaned') setCleanedText(text);
    else setTranscript(text);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCurrentText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (format: 'md' | 'txt' | 'srt') => {
    const baseName = file?.name.replace(/\.[^/.]+$/, "") || 'audio';
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

  const handleReplaceAll = () => {
    if (!replaceFrom || !replaceTo) return;
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(replaceFrom), 'g');
    
    setTranscript(prev => prev.replace(regex, replaceTo));
    setCleanedText(prev => prev.replace(regex, replaceTo));
    setSummaryText(prev => prev.replace(regex, replaceTo));
    
    setReplaceFrom('');
    setReplaceTo('');
  };

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
        setErrorMessage('播放失敗：瀏覽器阻擋了自動播放，請先手動點擊播放器播放一次。');
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

  const highlightText = (text: string) => {
    if (!searchQuery) return <span>{text}</span>;
    
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-300 text-stone-900 rounded-sm px-0.5 font-medium shadow-sm">{part}</mark>
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
            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 font-mono bg-indigo-50 px-1.5 py-0.5 rounded mx-1 transition-colors cursor-pointer inline-flex items-center"
            title={`點擊播放此段落 (自動校準 ${timeOffset > 0 ? '+' : ''}${timeOffset} 秒)`}
          >
            [{part}]
          </button>
        );
      }
      return <span key={i}>{highlightText(part)}</span>;
    });
  };

  const isProcessing = ['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus);
  const hasContent = !!(transcript || cleanedText || summaryText);
  const wordCount = getCurrentText().replace(/\s+/g, '').length;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 text-center relative">
          <div className="absolute right-0 top-0 flex items-center gap-2">
            <button
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="lg:hidden p-2 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="切換操作面板"
            >
              {isLeftPanelOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column */}
          <div className={`lg:col-span-4 space-y-6 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto custom-scrollbar pb-4 ${!isLeftPanelOpen ? 'hidden lg:block' : ''}`}>
            
            {/* Step 1: Audio Processing */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="text-lg font-bold text-stone-900">語音轉錄與清稿</h3>
              </div>

              {/* Upload Tabs */}
              <div className="flex gap-2 mb-4 bg-stone-100 p-1 rounded-lg">
                <button 
                  onClick={() => setUploadMode('local')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${uploadMode === 'local' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  本地上傳
                </button>
                <button 
                  onClick={() => setUploadMode('drive')}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${uploadMode === 'drive' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  Google Drive
                </button>
              </div>

              {uploadMode === 'local' ? (
                <div 
                  className={`p-5 rounded-xl border-2 border-dashed transition-colors mb-4 ${
                    file ? 'border-indigo-300 bg-indigo-50/50' : 'border-stone-200 hover:border-indigo-300 hover:bg-stone-50'
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
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                      {file ? <FileAudio className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                    </div>
                    
                    {file ? (
                      <>
                        <h3 className="text-sm font-medium text-stone-900 mb-1 truncate w-full px-2">{file.name}</h3>
                        <p className="text-xs text-stone-500 mb-3">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        <button 
                          onClick={() => { setFile(null); resetState(); }}
                          className="text-xs text-stone-500 hover:text-stone-700 underline"
                        >
                          移除檔案
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium text-stone-900 mb-1">點擊或拖曳上傳音檔</h3>
                        <p className="text-xs text-stone-500 mb-3">支援 MP3, WAV, M4A (上限 100MB)</p>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
                        >
                          選擇檔案
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl border-2 border-stone-200 bg-stone-50 mb-4">
                  <label className="block text-sm font-medium text-stone-700 mb-2">貼上 Google Drive 檔案連結</label>
                  <input 
                    type="text" 
                    value={driveLink}
                    onChange={e => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full text-sm border border-stone-200 rounded-lg p-2.5 mb-3 outline-none focus:border-indigo-500 bg-white"
                  />
                  <button
                    onClick={handleDriveSubmit}
                    disabled={!driveLink || isFetchingDrive}
                    className="w-full py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isFetchingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                    {isFetchingDrive ? '正在下載檔案...' : '載入檔案 (上限 100MB)'}
                  </button>
                  <p className="text-[10px] text-stone-500 mt-2 text-center">請確保連結權限已設為「知道連結的人均可讀取」</p>
                </div>
              )}

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-stone-800">自訂專有名詞字典 <span className="text-stone-400 font-normal text-xs">(選填)</span></label>
                  {glossaryTerms.length > 0 && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
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
                  <div className="bg-indigo-50/60 border border-indigo-100/60 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-indigo-900/80 leading-relaxed">
                        <p className="font-medium mb-1 text-indigo-900">提供專有名詞可大幅提升 AI 辨識準確度，避免同音異字。建議輸入：</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li><span className="font-medium text-indigo-900">人名</span>：主持人與來賓的名字 (如：王小明)</li>
                          <li><span className="font-medium text-indigo-900">技術名詞</span>：專案或技術名稱 (如：React, Gemini)</li>
                          <li><span className="font-medium text-indigo-900">地名/機構</span>：特定地點或公司名 (如：台北車站)</li>
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
                    className="w-full text-sm border border-stone-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-stone-50 resize-y min-h-[80px]"
                    disabled={['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus)}
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
                      disabled={!termInput.trim() || ['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus)}
                      className="px-5 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      新增至字典
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={processAudio}
                disabled={!file || ['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus)}
                className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
                  !file || ['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus)
                    ? 'bg-stone-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {['uploading', 'processing', 'transcribing', 'cleaning'].includes(audioStatus) && <Loader2 className="w-5 h-5 animate-spin" />}
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
                <div className="mt-5 p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">處理進度</h4>
                  
                  {/* Progress Bar */}
                  {audioStatus !== 'error' && audioStatus !== 'success' && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-stone-500 mb-1.5">
                        <span>整體進度</span>
                        <span>{audioProgress}%</span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${audioProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className={`mt-0.5 ${audioStatus === 'uploading' ? 'text-indigo-600' : (['processing', 'transcribing', 'cleaning', 'success'].includes(audioStatus) || transcript ? 'text-emerald-500' : 'text-stone-300')}`}>
                        {audioStatus === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> : (['processing', 'transcribing', 'cleaning', 'success'].includes(audioStatus) || transcript ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-300" />)}
                      </div>
                      <span className={`text-sm font-medium ${audioStatus === 'uploading' ? 'text-indigo-900' : (['processing', 'transcribing', 'cleaning', 'success'].includes(audioStatus) || transcript ? 'text-stone-900' : 'text-stone-500')}`}>
                        1. 上傳音檔
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`mt-0.5 ${audioStatus === 'processing' ? 'text-indigo-600' : (['transcribing', 'cleaning', 'success'].includes(audioStatus) || transcript ? 'text-emerald-500' : 'text-stone-300')}`}>
                        {audioStatus === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : (['transcribing', 'cleaning', 'success'].includes(audioStatus) || transcript ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-300" />)}
                      </div>
                      <span className={`text-sm font-medium ${audioStatus === 'processing' ? 'text-indigo-900' : (['transcribing', 'cleaning', 'success'].includes(audioStatus) || transcript ? 'text-stone-900' : 'text-stone-500')}`}>
                        2. 伺服器處理
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`mt-0.5 ${audioStatus === 'transcribing' ? 'text-indigo-600' : (['cleaning', 'success'].includes(audioStatus) || transcript ? 'text-emerald-500' : 'text-stone-300')}`}>
                        {audioStatus === 'transcribing' ? <Loader2 className="w-5 h-5 animate-spin" /> : (['cleaning', 'success'].includes(audioStatus) || transcript ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-300" />)}
                      </div>
                      <span className={`text-sm font-medium ${audioStatus === 'transcribing' ? 'text-indigo-900' : (['cleaning', 'success'].includes(audioStatus) || transcript ? 'text-stone-900' : 'text-stone-500')}`}>
                        3. 語音轉錄
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className={`mt-0.5 ${audioStatus === 'cleaning' ? 'text-indigo-600' : (cleanedText ? 'text-emerald-500' : 'text-stone-300')}`}>
                        {audioStatus === 'cleaning' ? <Loader2 className="w-5 h-5 animate-spin" /> : (cleanedText ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-stone-300" />)}
                      </div>
                      <span className={`text-sm font-medium ${audioStatus === 'cleaning' ? 'text-indigo-900' : (cleanedText ? 'text-stone-900' : 'text-stone-500')}`}>
                        4. AI 清稿
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Step 2: AI Content Generation */}
            <div className={`bg-white p-6 rounded-2xl border transition-all duration-300 ${cleanedText ? 'border-indigo-200 shadow-md' : 'border-stone-100 shadow-sm opacity-75'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${cleanedText ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-400'}`}>2</div>
                <h3 className={`text-lg font-bold ${cleanedText ? 'text-stone-900' : 'text-stone-400'}`}>AI 內容產出</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">選擇產出格式</label>
                  <select
                    value={selectedPromptId}
                    onChange={handlePromptSelect}
                    className="w-full text-sm border border-stone-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white"
                    disabled={!cleanedText || summaryStatus === 'summarizing'}
                  >
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="relative">
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">Prompt 內容 (可手動修改)</label>
                  <textarea
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="請輸入您希望 AI 產出的具體要求..."
                    className="w-full text-sm border border-stone-200 rounded-lg p-2.5 pb-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-stone-50"
                    rows={4}
                    disabled={!cleanedText || summaryStatus === 'summarizing'}
                  />
                  <button
                    onClick={handleSaveNewPrompt}
                    disabled={!cleanedText || summaryStatus === 'summarizing'}
                    className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-medium bg-white border border-stone-200 text-stone-600 px-2 py-1 rounded hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> 另存新格式
                  </button>
                </div>

                <button
                  onClick={() => generateSummary()}
                  disabled={!cleanedText || summaryStatus === 'summarizing'}
                  className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
                    !cleanedText || summaryStatus === 'summarizing'
                      ? 'bg-stone-300 cursor-not-allowed'
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

            {/* Global Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 lg:sticky lg:top-8 lg:h-[calc(100vh-6rem)] flex flex-col">
            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 flex-1 flex flex-col min-h-0">
              
              {/* Audio Player */}
              {audioUrl && (
                <div className="bg-stone-900 dark:bg-stone-950 px-4 py-3 flex flex-col gap-2 border-b border-stone-800">
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
                <div className="bg-white dark:bg-stone-900 px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
                    <FileAudio className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-stone-800 dark:text-white truncate" title={file.name}>{file.name}</h2>
                    {audioDuration !== null && <p className="text-xs text-stone-400">{formatDuration(audioDuration)}</p>}
                  </div>
                </div>
              )}

              {/* Toolbar */}
              {hasContent && (
                <div className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Search */}
                    <div className="relative flex-1 max-w-[220px]">
                      <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="搜尋文字..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full text-sm border border-stone-200 dark:border-stone-600 rounded-md pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Expand toolbar */}
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
                      {/* Edit mode */}
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors font-medium ${
                          isEditing ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-50 shadow-sm'
                        }`}
                      >
                        {isEditing ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {isEditing ? '編輯模式' : '閱讀模式'}
                      </button>
                    </div>
                  </div>
                  {/* Expanded tools */}
                  {isToolbarExpanded && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-200 dark:border-stone-700">
                      {/* Replace */}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-stone-500" />
                        <input type="text" placeholder="原名" value={replaceFrom} onChange={e => setReplaceFrom(e.target.value)} className="text-sm border border-stone-200 dark:border-stone-600 rounded-md px-2 py-1.5 w-20 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white" />
                        <span className="text-stone-400">→</span>
                        <input type="text" placeholder="新名" value={replaceTo} onChange={e => setReplaceTo(e.target.value)} className="text-sm border border-stone-200 dark:border-stone-600 rounded-md px-2 py-1.5 w-20 outline-none focus:border-indigo-500 bg-white dark:bg-stone-700 dark:text-white" />
                        <button onClick={handleReplaceAll} disabled={!replaceFrom || !replaceTo} className="text-xs bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 hover:bg-stone-100 text-stone-700 dark:text-stone-200 px-2.5 py-1.5 rounded-md font-medium disabled:opacity-50 transition-colors shadow-sm">替換</button>
                      </div>
                      {/* Time Offset */}
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
              <div className="flex border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
                <button onClick={() => setActiveTab('raw')} className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ activeTab === 'raw' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800' }`}>
                  <FileText className="w-4 h-4" /> 原始逐字稿
                </button>
                <button onClick={() => setActiveTab('cleaned')} className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ activeTab === 'cleaned' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800' }`}>
                  <Sparkles className="w-4 h-4" /> 清稿逐字稿
                </button>
                <button onClick={() => setActiveTab('summary')} className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ activeTab === 'summary' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800' }`}>
                  <Wand2 className="w-4 h-4" /> AI 整理內容
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 relative bg-white dark:bg-stone-900 flex flex-col min-h-0">
                {audioStatus === 'idle' && summaryStatus === 'idle' && !transcript && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-6 text-center">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">上傳音檔並點擊「開始轉錄與清稿」<br/>結果將顯示於此</p>
                  </div>
                )}

                {(isProcessing && (!transcript || (activeTab === 'cleaned' && !cleanedText))) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-6 text-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm z-10">
                    <Loader2 className="w-12 h-12 mb-4 animate-spin text-indigo-500" />
                    <p className="text-indigo-900 dark:text-indigo-300 font-medium text-lg animate-pulse">
                      {audioStatus === 'uploading' && '正在上傳音檔至伺服器...'}
                      {audioStatus === 'processing' && '伺服器正在處理音檔...'}
                      {audioStatus === 'transcribing' && '正在脩聽並轉錄音檔...'}
                      {audioStatus === 'cleaning' && '正在進行 AI 清稿與語句修飾...'}
                    </p>
                    <p className="text-sm mt-2 text-stone-500">這可能需要幾分鐘的時間，請稍候</p>
                  </div>
                )}

                {summaryStatus === 'summarizing' && activeTab === 'summary' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 p-6 text-center bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm z-10">
                    <Loader2 className="w-12 h-12 mb-4 animate-spin text-indigo-500" />
                    <p className="text-indigo-900 dark:text-indigo-300 font-medium text-lg animate-pulse">正在根據您的格式要求產生 AI 內容...</p>
                  </div>
                )}

                {/* Text Area */}
                {hasContent && (
                  <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
                    {isEditing ? (
                      <textarea
                        value={getCurrentText()}
                        onChange={(e) => setCurrentText(e.target.value)}
                        placeholder="內容將顯示於此，您可以直接點擊進行編輯..."
                        className={`w-full h-full min-h-full resize-none border-0 bg-transparent p-0 focus:ring-0 text-stone-800 dark:text-stone-200 leading-relaxed outline-none ${
                          activeTab === 'raw' ? 'font-mono text-sm' : 'font-sans text-base'
                        }`}
                      />
                    ) : (
                      <div className={`whitespace-pre-wrap text-stone-800 dark:text-stone-200 leading-relaxed ${
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
                <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-xs text-stone-400">{wordCount.toLocaleString()} 字</span>
                  <div className="flex items-center gap-2">
                    {/* Export dropdown */}
                    <div className="relative">
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
                          {(['md', 'txt', 'srt'] as const).map(fmt => (
                            <button key={fmt} onClick={() => downloadFile(fmt)} className="w-full text-left px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center gap-2">
                              <Download className="w-3.5 h-3.5" /> .{fmt}{fmt === 'srt' ? ' (字幕)' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={copyToClipboard}
                      disabled={!getCurrentText()}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? '已複製' : '複製內容'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Glossary Modal */}
      {isGlossaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                已儲存的專有名詞 ({glossaryTerms.length})
              </h3>
              <button
                onClick={() => setIsGlossaryModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {glossaryTerms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {glossaryTerms.map((term, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-sm font-medium text-stone-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/30">
                      {term}
                      <button
                        onClick={() => handleRemoveTerm(term)}
                        className="text-stone-400 hover:text-red-500 focus:outline-none transition-colors ml-1"
                        title="移除此名詞"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-stone-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>目前沒有儲存任何專有名詞</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
              <button
                onClick={() => setIsGlossaryModalOpen(false)}
                className="px-5 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900 transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
