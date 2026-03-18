import { useState, useCallback, useEffect, useRef } from 'react';
import { getAI, classifyError } from '../lib/utils';

export type AudioStatus = 'idle' | 'uploading' | 'processing' | 'transcribing' | 'cleaning' | 'success' | 'error';
export type SummaryStatus = 'idle' | 'summarizing' | 'success' | 'error';

const LANG_CONFIG: Record<string, { name: string; transcribePrompt: string; cleanPrompt: string }> = {
  'zh-TW': {
    name: '繁體中文',
    transcribePrompt: '請將這段語音轉錄為繁體中文逐字稿。',
    cleanPrompt: '以下是一段語音轉錄的逐字稿。請幫我進行「清稿」（Cleanup）。',
  },
  'en': {
    name: 'English',
    transcribePrompt: 'Please transcribe this audio into English.',
    cleanPrompt: 'Below is an audio transcription. Please clean it up.',
  },
  'ja': {
    name: '日本語',
    transcribePrompt: 'この音声を日本語で文字起こししてください。',
    cleanPrompt: '以下は音声の文字起こしです。クリーンアップしてください。',
  },
  'ko': {
    name: '한국어',
    transcribePrompt: '이 오디오를 한국어로 전사해 주세요.',
    cleanPrompt: '다음은 음성 전사입니다. 정리해 주세요.',
  },
  'zh-CN': {
    name: '简体中文',
    transcribePrompt: '请将这段语音转录为简体中文逐字稿。',
    cleanPrompt: '以下是一段语音转录的逐字稿。请帮我进行"清稿"。',
  },
};

export function useTranscription() {
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [audioProgress, setAudioProgress] = useState(0);
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'cleaned' | 'raw'>('summary');
  const originalTitle = useRef(document.title);

  const [hasDraft, setHasDraft] = useState(false);

  // Restore title when user returns to the tab
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        document.title = originalTitle.current;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (!transcript && !cleanedText && !summaryText) return;
    const timer = setTimeout(() => {
      localStorage.setItem('ai_transcriber_draft', JSON.stringify({
        transcript, cleanedText, summaryText, timestamp: Date.now(),
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [transcript, cleanedText, summaryText]);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_transcriber_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.transcript || draft.cleanedText || draft.summaryText) {
          setHasDraft(true);
        }
      }
    } catch {}
  }, []);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem('ai_transcriber_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.transcript) setTranscript(draft.transcript);
        if (draft.cleanedText) setCleanedText(draft.cleanedText);
        if (draft.summaryText) setSummaryText(draft.summaryText);
        setAudioStatus('success');
        setHasDraft(false);
      }
    } catch {}
  };

  const dismissDraft = () => {
    localStorage.removeItem('ai_transcriber_draft');
    setHasDraft(false);
  };

  const resetState = useCallback(() => {
    setAudioStatus('idle');
    setSummaryStatus('idle');
    setTranscript('');
    setCleanedText('');
    setSummaryText('');
    setErrorMessage('');
    localStorage.removeItem('ai_transcriber_draft');
    setHasDraft(false);
  }, []);

  const processAudio = async (file: File, glossaryTerms: string[], lang = 'zh-TW') => {
    const langCfg = LANG_CONFIG[lang] || LANG_CONFIG['zh-TW'];
    // Request notification permission on first use
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setAudioStatus('uploading');
    setAudioProgress(0);
    setSummaryStatus('idle');
    setErrorMessage('');
    setTranscript('');
    setCleanedText('');
    setSummaryText('');

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
      let uploadedFile = await getAI().files.upload({
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
        uploadedFile = await getAI().files.get({ name: uploadedFile.name! });
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
      const transcribeStream = await getAI().models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType || file.type || 'audio/mp3' } },
            { text: `${langCfg.transcribePrompt} 要求：
1. 盡可能保留所有細節，包含語氣詞。
2. 加上時間標記 (Timestamps)，格式為 [MM:SS] 或 [HH:MM:SS]，每隔一段對話或段落標記一次。
3. 根據語意適當分段。
4. **說話者辨識（Speaker Diarization）：請從語音內容辨識說話者，並直接用說話者的姓名或身份標示（例如「主持人：...」、「王小明：...」）。若無法辨識名字，則用角色（「主持人」、「來賓」）。若對話中只有一位說話者則不須標示。**${glossaryPrompt}` },
          ],
        },
      });
      let rafId: number;
      for await (const chunk of transcribeStream) {
        rawTranscript += chunk.text || '';
        cancelAnimationFrame(rafId);
        const snapshot = rawTranscript;
        rafId = requestAnimationFrame(() => setTranscript(snapshot));
      }
      setTranscript(rawTranscript);

      // Clean with streaming
      setAudioStatus('cleaning');
      startProgress(70, 95, 10000);
      const cleanGlossaryPrompt = glossaryTerms.length > 0 ? `\n6. 請特別注意以下專有名詞，確保辨識正確（可能包含人名、技術名詞、地名等）：\n${glossaryTerms.join(', ')}` : '';
      setActiveTab('cleaned');
      let cleaned = '';
      const cleanStream = await getAI().models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: `${langCfg.cleanPrompt} 要求：
1. 去除冗言贅字（如：嗯、啊、那個、就是說等）。
2. 修正語法錯誤，使句子通順。
3. 保持原本的語意和說話者的風格。
4. 重新排版，加上適當的標點符號和分段。
5. 保留原本的時間標記 (Timestamps)，格式必須維持 [MM:SS] 或 [HH:MM:SS]，不可更動格式。
6. **保留原始逐字稿中的說話者標示（如：「主持人：...」、「王小明：...」），勿刪除或合併。**${cleanGlossaryPrompt}

原始逐字稿：
${rawTranscript}`,
      });
      let rafId2: number;
      for await (const chunk of cleanStream) {
        cleaned += chunk.text || '';
        cancelAnimationFrame(rafId2);
        const snapshot = cleaned;
        rafId2 = requestAnimationFrame(() => setCleanedText(snapshot));
      }
      setCleanedText(cleaned);

      clearInterval(progressInterval);
      setAudioProgress(100);
      setAudioStatus('success');

      // Notify user if tab is not visible
      if (document.hidden) {
        document.title = '✅ 轉錄完成 — AI 語音轉錄';
        if (Notification.permission === 'granted') {
          new Notification('轉錄完成', { body: '您的音檔已完成轉錄與清稿' });
        }
      }

    } catch (error: any) {
      clearInterval(progressInterval!);
      setAudioProgress(0);
      console.error('processAudio error:', error);
      const msg = error?.message || error?.toString() || '發生未知錯誤，請重試。';
      setErrorMessage(classifyError(msg));
      setAudioStatus('error');
    }
  };

  const generateSummary = async (customPrompt: string, textToSummarize = cleanedText) => {
    if (!textToSummarize) return;
    setSummaryStatus('summarizing');
    setErrorMessage('');
    setActiveTab('summary');

    try {
      let summaryContent = '';
      const summaryStream = await getAI().models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: `以下是一段經過清稿的會議記錄/訪談逐字稿。請根據以下要求進行內容產出。
要求格式與風格：
${customPrompt}

清稿內容：
${textToSummarize}
`,
      });
      let sRafId: number;
      for await (const chunk of summaryStream) {
        summaryContent += chunk.text || '';
        cancelAnimationFrame(sRafId);
        const snapshot = summaryContent;
        sRafId = requestAnimationFrame(() => setSummaryText(snapshot));
      }
      setSummaryText(summaryContent);
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

  const handleReplaceAll = (replaceFrom: string, replaceTo: string) => {
    if (!replaceFrom || !replaceTo) return;
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(replaceFrom), 'g');
    setTranscript(prev => prev.replace(regex, replaceTo));
    setCleanedText(prev => prev.replace(regex, replaceTo));
    setSummaryText(prev => prev.replace(regex, replaceTo));
  };

  return {
    audioStatus,
    audioProgress,
    summaryStatus,
    transcript,
    cleanedText,
    summaryText,
    errorMessage,
    setErrorMessage,
    activeTab,
    setActiveTab,
    resetState,
    processAudio,
    generateSummary,
    getCurrentText,
    setCurrentText,
    handleReplaceAll,
    hasDraft,
    restoreDraft,
    dismissDraft,
  };
}
