import { useState } from 'react';
import { Key, Check, Shield, ExternalLink } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../lib/utils';

interface ApiKeyInputProps {
  onKeySet: () => void;
}

export default function ApiKeyInput({ onKeySet }: ApiKeyInputProps) {
  const [key, setKey] = useState(getStoredApiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!key.trim()) return;
    setStoredApiKey(key.trim());
    setSaved(true);
    onKeySet();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">請輸入您的 Gemini API Key</h3>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300/80 mb-3 leading-relaxed">
        此工具需要 Google Gemini API Key 才能運作。
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 ml-1"
        >
          前往取得 API Key <ExternalLink className="w-3 h-3" />
        </a>
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          placeholder="AIzaSy..."
          className="flex-1 text-sm border border-amber-200 dark:border-amber-700/60 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 bg-[var(--bg-card)] dark:text-white transition-shadow"
        />
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {saved ? <Check className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          {saved ? '已儲存' : '儲存'}
        </button>
      </div>
      <div className="flex items-start gap-1.5 mt-3 text-[11px] text-amber-600/80 dark:text-amber-400/70">
        <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>您的 API Key 僅儲存在本機瀏覽器中，不會傳送至我們的伺服器。</p>
      </div>
    </div>
  );
}
