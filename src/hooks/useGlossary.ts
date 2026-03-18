import { useState, useEffect } from 'react';

export function useGlossary() {
  const [glossaryTerms, setGlossaryTerms] = useState<string[]>(() => {
    const saved = localStorage.getItem('ai_transcriber_glossary') || '';
    return saved.split(/[,，\n]+/).map(t => t.trim()).filter(Boolean);
  });
  const [termInput, setTermInput] = useState('');
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('ai_transcriber_glossary', glossaryTerms.join(', '));
  }, [glossaryTerms]);

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

  return {
    glossaryTerms,
    termInput,
    setTermInput,
    isGlossaryModalOpen,
    setIsGlossaryModalOpen,
    handleAddTerms,
    handleRemoveTerm,
  };
}
