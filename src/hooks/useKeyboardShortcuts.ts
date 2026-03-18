import { useEffect } from 'react';

interface ShortcutActions {
  onToggleEdit: () => void;
  onExport: () => void;
  onFocusSearch: () => void;
}

export function useKeyboardShortcuts({ onToggleEdit, onExport, onFocusSearch }: ShortcutActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          onExport();
          break;
        case 'e':
          e.preventDefault();
          onToggleEdit();
          break;
        case 'k':
          e.preventDefault();
          onFocusSearch();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onToggleEdit, onExport, onFocusSearch]);
}
