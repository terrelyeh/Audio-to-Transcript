import { useState, useEffect } from 'react';
import { loadPrompts, DEFAULT_PROMPTS, type Prompt } from '../lib/utils';

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>(loadPrompts);
  const [selectedPromptId, setSelectedPromptId] = useState('1');
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPTS[0].prompt);

  useEffect(() => {
    localStorage.setItem('ai_transcriber_prompts', JSON.stringify(prompts));
  }, [prompts]);

  const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPromptId(id);
    const p = prompts.find(p => p.id === id);
    if (p) setCustomPrompt(p.prompt);
  };

  const saveNewPrompt = (name: string) => {
    if (!name.trim()) return;
    const newPrompt: Prompt = {
      id: Date.now().toString(),
      name: name.trim(),
      prompt: customPrompt
    };
    setPrompts([...prompts, newPrompt]);
    setSelectedPromptId(newPrompt.id);
  };

  return {
    prompts,
    selectedPromptId,
    customPrompt,
    setCustomPrompt,
    handlePromptSelect,
    saveNewPrompt,
  };
}
