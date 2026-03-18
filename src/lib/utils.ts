import { GoogleGenAI } from '@google/genai';

// BYOK: env var (deployer) → localStorage (user) → null
const ENV_KEY = process.env.GEMINI_API_KEY;
export const hasEnvKey = !!ENV_KEY;

export function getStoredApiKey(): string {
  return localStorage.getItem('ai_transcriber_api_key') || '';
}

export function setStoredApiKey(key: string) {
  localStorage.setItem('ai_transcriber_api_key', key);
  _ai = null; // reset so next getAI() uses the new key
}

export function getEffectiveApiKey(): string {
  return ENV_KEY || getStoredApiKey();
}

let _ai: GoogleGenAI | null = null;
export function getAI(): GoogleGenAI {
  const key = getEffectiveApiKey();
  if (!key) throw new Error('請先輸入您的 Gemini API Key');
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

export interface Prompt {
  id: string;
  name: string;
  prompt: string;
}

export const DEFAULT_PROMPTS: Prompt[] = [
  { id: '1', name: '預設：重點與待辦事項', prompt: '條列式列出核心重點，並標示待辦事項 (Action Items)。' },
  { id: '2', name: '正式會議紀錄', prompt: '請整理成正式的會議紀錄格式，包含：會議主旨、討論重點、結論、後續追蹤事項。' },
  { id: '3', name: '部落格文章', prompt: '請將內容改寫成一篇流暢的部落格文章，適合發布在網路上。' },
  { id: '4', name: '客戶痛點分析', prompt: '請只列出客戶提到的痛點、抱怨與需求。' }
];

export const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB

export const loadPrompts = (): Prompt[] => {
  try {
    const saved = localStorage.getItem('ai_transcriber_prompts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PROMPTS;
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const timeStrToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

export const secondsToSRTTime = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},000`;
};

export const generateSRT = (text: string): string => {
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

export const classifyError = (message: string): string => {
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
