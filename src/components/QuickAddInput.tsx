import { useState, useCallback, useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useKeywordStore } from '../stores/keywordStore';
import { useGroupStore } from '../stores/groupStore';
import { PlusIcon } from './Icons';

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
    <div className="relative">
      <div className="quick-add">
        <PlusIcon />
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a task… #tag @group"
          aria-label="Add a task"
        />
        {text.trim() ? (
          <button type="button" onClick={handleSubmit} className="btn btn-primary btn-sm" style={{ height: 28 }}>
            Add
          </button>
        ) : (
          <span className="kbd" aria-hidden="true">↵</span>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {autocomplete && totalItems > 0 && (
        <div ref={dropdownRef} className="menu left-0 right-0 animate-scale-in" role="listbox">
          <div className="menu-heading">
            {autocomplete.type === 'keyword' ? 'Keywords' : 'Groups'}
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === autocomplete.selectedIndex}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="menu-item"
              data-active={index === autocomplete.selectedIndex}
              onMouseEnter={() =>
                setAutocomplete((prev) => (prev ? { ...prev, selectedIndex: index } : null))
              }
            >
              <span className="swatch" style={{ backgroundColor: suggestion.color }} />
              <span>
                {autocomplete.type === 'keyword' ? '#' : '@'}
                {suggestion.name}
              </span>
            </button>
          ))}
          {/* Create new option */}
          {canCreate && (
            <>
              {suggestions.length > 0 && <div className="menu-divider" />}
              <button
                type="button"
                role="option"
                aria-selected={autocomplete.selectedIndex === suggestions.length}
                onClick={handleCreate}
                className="menu-item"
                data-active={autocomplete.selectedIndex === suggestions.length}
                onMouseEnter={() =>
                  setAutocomplete((prev) =>
                    prev ? { ...prev, selectedIndex: suggestions.length } : null
                  )
                }
              >
                <PlusIcon style={{ color: 'var(--accent-done)' }} />
                <span>
                  Create {autocomplete.type === 'keyword' ? '#' : '@'}
                  {autocomplete.query}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default QuickAddInput;
