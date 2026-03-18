import { X, BookOpen } from 'lucide-react';

interface GlossaryModalProps {
  glossaryTerms: string[];
  handleRemoveTerm: (term: string) => void;
  onClose: () => void;
}

export default function GlossaryModal({ glossaryTerms, handleRemoveTerm, onClose }: GlossaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
          <h3 className="text-lg font-bold text-stone-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            已儲存的專有名詞 ({glossaryTerms.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {glossaryTerms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {glossaryTerms.map((term, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-700 dark:text-stone-200 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30">
                  {term}
                  <button
                    onClick={() => handleRemoveTerm(term)}
                    className="text-stone-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none transition-colors ml-1"
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
        <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-900 dark:hover:bg-white transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
