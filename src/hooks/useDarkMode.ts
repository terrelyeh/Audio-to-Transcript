import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('ai_transcriber_dark') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('ai_transcriber_dark', String(isDark));
  }, [isDark]);

  return [isDark, setIsDark] as const;
}
