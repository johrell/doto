import { useState, useCallback, useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useKeywordStore } from '../stores/keywordStore';
import { useGroupStore } from '../stores/groupStore';

export interface QuickAddInputProps {
  onSubmit: (input: string) => void;
}

export interface QuickAddInputHandle {
  focus: () => void;
}

type AutocompleteType = 'keyword' | 'group' | null;

interface AutocompleteState {
  type: AutocompleteType;
  query: string;
  startIndex: number;
  selectedIndex: number;
}

export const QuickAddInput = forwardRef<QuickAddInputHandle, QuickAddInputProps>(function QuickAddInput({ onSubmit }, ref) {
  const keywordStore = useKeywordStore();
  const groupStore = useGroupStore();

  const [text, setText] = useState('');
  const [autocomplete, setAutocomplete] = useState<AutocompleteState | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  // Get filtered suggestions based on autocomplete state
  const { suggestions, canCreate } = useMemo(() => {
    if (!autocomplete) return { suggestions: [], canCreate: false, exactMatch: false };

    const query = autocomplete.query.toLowerCase().trim();

    if (autocomplete.type === 'keyword') {
      const allKeywords = keywordStore.getAllKeywords();
      const filtered = query
        ? allKeywords.filter((k) => k.name.toLowerCase().includes(query))
        : allKeywords;
      const exactMatch = query ? allKeywords.some((k) => k.name.toLowerCase() === query) : true;
      return {
        suggestions: filtered.slice(0, 6).map((k) => ({ id: k.id, name: k.name, color: k.color, isCreate: false })),
        canCreate: query.length > 0 && !exactMatch,
        exactMatch,
      };
    }

    if (autocomplete.type === 'group') {
      const allGroups = groupStore.getAllGroups();
      const filtered = query
        ? allGroups.filter((g) => g.name.toLowerCase().includes(query))
        : allGroups;
      const exactMatch = query ? allGroups.some((g) => g.name.toLowerCase() === query) : true;
      return {
        suggestions: filtered.slice(0, 6).map((g) => ({ id: g.id, name: g.name, color: g.color, isCreate: false })),
        canCreate: query.length > 0 && !exactMatch,
        exactMatch,
      };
    }

    return { suggestions: [], canCreate: false, exactMatch: false };
  }, [autocomplete, keywordStore, groupStore]);

  // Total items including create option
  const totalItems = suggestions.length + (canCreate ? 1 : 0);

  // Detect # or @ tokens while typing
  const detectAutocomplete = useCallback((value: string, cursorPos: number) => {
    // Look backwards from cursor to find # or @
    let tokenStart = -1;
    let tokenType: AutocompleteType = null;

    for (let i = cursorPos - 1; i >= 0; i--) {
      const char = value[i];

      // Stop at whitespace
      if (char === ' ' || char === '\t') break;

      if (char === '#') {
        tokenStart = i;
        tokenType = 'keyword';
        break;
      }

      if (char === '@') {
        tokenStart = i;
        tokenType = 'group';
        break;
      }
    }

    if (tokenType && tokenStart !== -1) {
      const query = value.slice(tokenStart + 1, cursorPos);
      setAutocomplete({
        type: tokenType,
        query,
        startIndex: tokenStart,
        selectedIndex: 0,
      });
    } else {
      setAutocomplete(null);
    }
  }, []);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart || value.length;
      setText(value);
      detectAutocomplete(value, cursorPos);
    },
    [detectAutocomplete]
  );

  // Handle creating a new keyword or group
  const handleCreate = useCallback(() => {
    if (!autocomplete || !autocomplete.query.trim()) return;

    const name = autocomplete.query.trim().toLowerCase();
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    if (autocomplete.type === 'keyword') {
      keywordStore.addKeyword({ name, color });
    } else if (autocomplete.type === 'group') {
      groupStore.addGroup({ name, color });
    }

    // Insert the name into text
    const before = text.slice(0, autocomplete.startIndex);
    const after = text.slice(autocomplete.startIndex + 1 + autocomplete.query.length);
    const prefix = autocomplete.type === 'keyword' ? '#' : '@';
    const newText = before + prefix + name + ' ' + after;

    setText(newText);
    setAutocomplete(null);

    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = before.length + prefix.length + name.length + 1;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [autocomplete, text, keywordStore, groupStore]);

  // Handle selecting a suggestion
  const handleSelectSuggestion = useCallback(
    (suggestion: { name: string }) => {
      if (!autocomplete) return;

      const before = text.slice(0, autocomplete.startIndex);
      const after = text.slice(
        autocomplete.startIndex + 1 + autocomplete.query.length
      );
      const prefix = autocomplete.type === 'keyword' ? '#' : '@';
      const newText = before + prefix + suggestion.name + ' ' + after;

      setText(newText);
      setAutocomplete(null);

      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = before.length + prefix.length + suggestion.name.length + 1;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [autocomplete, text]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (autocomplete && totalItems > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setAutocomplete((prev) =>
            prev
              ? { ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, totalItems - 1) }
              : null
          );
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setAutocomplete((prev) =>
            prev ? { ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) } : null
          );
          return;
        }

        if (e.key === 'Tab' || (e.key === 'Enter' && autocomplete)) {
          e.preventDefault();
          // Check if create option is selected (it's at the end)
          if (canCreate && autocomplete.selectedIndex === suggestions.length) {
            handleCreate();
          } else {
            const selected = suggestions[autocomplete.selectedIndex];
            if (selected) {
              handleSelectSuggestion(selected);
            }
          }
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setAutocomplete(null);
          return;
        }
      }

      // Submit on Enter when no autocomplete is active
      if (e.key === 'Enter' && !autocomplete) {
        e.preventDefault();
        if (text.trim()) {
          onSubmit(text.trim());
          setText('');
        }
      }
    },
    [autocomplete, totalItems, suggestions, canCreate, handleCreate, handleSelectSuggestion, text, onSubmit]
  );

  // Handle submit button click
  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
      setAutocomplete(null);
    }
  }, [text, onSubmit]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setAutocomplete(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mb-4 relative">
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2.5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '2px 2px 0 var(--border-secondary)',
        }}
      >
        <span className="font-mono text-sm" style={{ color: 'var(--accent-todo)' }}>
          {'>'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="task #tag @group..."
          className="flex-1 bg-transparent outline-none text-sm font-mono"
          style={{ color: 'var(--text-primary)' }}
        />
        {text.trim() && (
          <button
            onClick={handleSubmit}
            className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              border: '1px solid var(--text-primary)',
            }}
          >
            [ENTER]
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {autocomplete && totalItems > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 overflow-hidden animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            boxShadow: '4px 4px 0 var(--border-secondary)',
          }}
        >
          <div
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider border-b"
            style={{
              color: 'var(--text-tertiary)',
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            {autocomplete.type === 'keyword' ? '// keywords' : '// groups'}
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-3 py-2 flex items-center gap-2 text-left font-mono text-xs transition-colors"
              style={{
                backgroundColor:
                  index === autocomplete.selectedIndex
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                borderLeft:
                  index === autocomplete.selectedIndex
                    ? '2px solid var(--accent-done)'
                    : '2px solid transparent',
              }}
              onMouseEnter={() =>
                setAutocomplete((prev) => (prev ? { ...prev, selectedIndex: index } : null))
              }
            >
              <span
                className="w-3 h-3 flex-shrink-0"
                style={{ backgroundColor: suggestion.color }}
              />
              <span style={{ color: 'var(--text-primary)' }}>
                {autocomplete.type === 'keyword' ? '#' : '@'}
                {suggestion.name}
              </span>
            </button>
          ))}
          {/* Create new option */}
          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full px-3 py-2 flex items-center gap-2 text-left font-mono text-xs transition-colors border-t"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor:
                  autocomplete.selectedIndex === suggestions.length
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                borderLeft:
                  autocomplete.selectedIndex === suggestions.length
                    ? '2px solid var(--accent-done)'
                    : '2px solid transparent',
              }}
              onMouseEnter={() =>
                setAutocomplete((prev) =>
                  prev ? { ...prev, selectedIndex: suggestions.length } : null
                )
              }
            >
              <span style={{ color: 'var(--accent-done)' }}>[+]</span>
              <span style={{ color: 'var(--text-primary)' }}>
                create {autocomplete.type === 'keyword' ? '#' : '@'}
                {autocomplete.query}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default QuickAddInput;
