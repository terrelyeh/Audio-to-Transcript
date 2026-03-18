import { useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';

interface GlossaryModalProps {
  glossaryTerms: string[];
  handleRemoveTerm: (term: string) => void;
  onClose: () => void;
}

export default function GlossaryModal({ glossaryTerms, handleRemoveTerm, onClose }: GlossaryModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="管理專有名詞"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-card)] rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-[var(--border-subtle)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-800 dark:text-white flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            已儲存的專有名詞
            <span className="text-xs font-normal text-stone-400 nums">({glossaryTerms.length})</span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {glossaryTerms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {glossaryTerms.map((term, idx) => (
                <span key={idx} className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-sm text-stone-700 dark:text-stone-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20">
                  {term}
                  <button
                    onClick={() => handleRemoveTerm(term)}
                    className="text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 focus:outline-none transition-colors ml-0.5"
                    aria-label={`移除「${term}」`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">尚未儲存任何專有名詞</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-900 dark:hover:bg-white transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
