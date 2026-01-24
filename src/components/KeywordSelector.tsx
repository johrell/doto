import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useKeywordStore } from '../stores/keywordStore';
import { useTaskStore } from '../stores/taskStore';
import { KeywordTag } from './KeywordTag';
import { ColorPicker } from './ColorPicker';
import type { Keyword } from '../types';

/**
 * Props for the KeywordSelector component
 */
export interface KeywordSelectorProps {
  /** Currently selected keyword IDs */
  selectedKeywordIds: string[];
  /** Callback when selection changes */
  onChange: (keywordIds: string[]) => void;
}

/**
 * Default color for new keywords
 */
const DEFAULT_COLOR = '#3b82f6';

/**
 * KeywordSelector - Dropdown with autocomplete for managing task keywords
 *
 * Features:
 * - Text input filters existing keywords
 * - Click to select/assign keywords to task
 * - Create new keywords inline with color picker
 * - Display selected keywords with remove option
 */
export function KeywordSelector({ selectedKeywordIds, onChange }: KeywordSelectorProps) {
  const keywordStore = useKeywordStore();
  const taskStore = useTaskStore();

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKeywordColor, setNewKeywordColor] = useState(DEFAULT_COLOR);
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState(DEFAULT_COLOR);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all keywords and filter by search query
  const allKeywords = keywordStore.getAllKeywords();

  // Get usage count for each keyword
  const keywordUsage = useMemo(() => {
    const allTasks = taskStore.getAllTasks();
    const usage: Record<string, number> = {};
    for (const keyword of allKeywords) {
      usage[keyword.id] = allTasks.filter((t) => t.keywords.includes(keyword.id)).length;
    }
    return usage;
  }, [allKeywords, taskStore]);
  
  const filteredKeywords = useMemo(() => {
    if (!searchQuery.trim()) return allKeywords;
    const query = searchQuery.toLowerCase().trim();
    return allKeywords.filter((k) => k.name.toLowerCase().includes(query));
  }, [allKeywords, searchQuery]);

  // Get selected keywords
  const selectedKeywords = useMemo(() => {
    return selectedKeywordIds
      .map((id) => keywordStore.getKeywordById(id))
      .filter((k): k is Keyword => k !== undefined);
  }, [selectedKeywordIds, keywordStore]);

  // Check if exact match exists (for showing create option)
  const exactMatchExists = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return allKeywords.some((k) => k.name.toLowerCase() === query);
  }, [allKeywords, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingKeywordId(null);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Start editing a keyword's color
  const handleStartEdit = useCallback((keyword: Keyword) => {
    setEditingKeywordId(keyword.id);
    setEditingColor(keyword.color);
    setIsCreating(false);
  }, []);

  // Save edited keyword color
  const handleSaveEdit = useCallback(() => {
    if (editingKeywordId) {
      keywordStore.updateKeyword({ id: editingKeywordId, color: editingColor });
      setEditingKeywordId(null);
    }
  }, [editingKeywordId, editingColor, keywordStore]);

  // Delete an unused keyword
  const handleDeleteKeyword = useCallback((keywordId: string) => {
    // Remove from selected if present
    if (selectedKeywordIds.includes(keywordId)) {
      onChange(selectedKeywordIds.filter((id) => id !== keywordId));
    }
    keywordStore.deleteKeyword(keywordId);
  }, [keywordStore, selectedKeywordIds, onChange]);

  // Handle selecting a keyword
  const handleSelectKeyword = useCallback((keywordId: string) => {
    if (!selectedKeywordIds.includes(keywordId)) {
      onChange([...selectedKeywordIds, keywordId]);
    }
    setSearchQuery('');
    setIsCreating(false);
  }, [selectedKeywordIds, onChange]);

  // Handle removing a keyword
  const handleRemoveKeyword = useCallback((keywordId: string) => {
    onChange(selectedKeywordIds.filter((id) => id !== keywordId));
  }, [selectedKeywordIds, onChange]);

  // Handle creating a new keyword
  const handleCreateKeyword = useCallback(() => {
    const trimmedName = searchQuery.trim();
    if (!trimmedName) return;

    const newKeyword = keywordStore.addKeyword({
      name: trimmedName,
      color: newKeywordColor,
    });

    handleSelectKeyword(newKeyword.id);
    setNewKeywordColor(DEFAULT_COLOR);
  }, [searchQuery, newKeywordColor, keywordStore, handleSelectKeyword]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsCreating(false);
    if (!isOpen) setIsOpen(true);
  }, [isOpen]);

  // Handle showing create form
  const handleShowCreateForm = useCallback(() => {
    setIsCreating(true);
  }, []);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsCreating(false);
      setSearchQuery('');
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && isCreating && searchQuery.trim()) {
      e.preventDefault();
      handleCreateKeyword();
    }
  }, [isCreating, searchQuery, handleCreateKeyword]);

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Keywords */}
      {selectedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedKeywords.map((keyword) => (
            <KeywordTag
              key={keyword.id}
              keyword={keyword}
              onRemove={() => handleRemoveKeyword(keyword.id)}
            />
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="search_keywords..."
            className="form-input font-mono text-xs"
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 overflow-hidden animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            boxShadow: '4px 4px 0 var(--border-secondary)',
          }}
        >
          {isCreating ? (
            /* Create New Keyword Form */
            <div className="p-4">
              <div className="mb-3">
                <label
                  className="block font-mono text-[10px] uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'// new_keyword'}
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2 font-mono text-xs"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <span
                    className="w-3 h-3 flex-shrink-0"
                    style={{ backgroundColor: newKeywordColor }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>
                    #{searchQuery.trim()}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label
                  className="block font-mono text-[10px] uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'// color'}
                </label>
                <ColorPicker
                  selectedColor={newKeywordColor}
                  onChange={setNewKeywordColor}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setSearchQuery('');
                  }}
                  className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  [ESC]
                </button>
                <button
                  type="button"
                  onClick={handleCreateKeyword}
                  className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                    border: '1px solid var(--text-primary)',
                  }}
                >
                  [CREATE]
                </button>
              </div>
            </div>
          ) : (
            /* Keyword List */
            <div className="max-h-64 overflow-y-auto">
              {filteredKeywords.length === 0 && !searchQuery.trim() ? (
                <div
                  className="px-4 py-6 text-center font-mono text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'// no keywords. type to create.'}
                </div>
              ) : (
                <>
                  {filteredKeywords.map((keyword) => {
                    const isSelected = selectedKeywordIds.includes(keyword.id);
                    const isEditing = editingKeywordId === keyword.id;
                    const usageCount = keywordUsage[keyword.id] || 0;

                    if (isEditing) {
                      return (
                        <div
                          key={keyword.id}
                          className="px-4 py-3 border-b"
                          style={{ borderColor: 'var(--border-primary)' }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="w-3 h-3 flex-shrink-0"
                              style={{ backgroundColor: editingColor }}
                            />
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                              #{keyword.name}
                            </span>
                          </div>
                          <div className="mb-3">
                            <ColorPicker
                              selectedColor={editingColor}
                              onChange={setEditingColor}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingKeywordId(null)}
                              className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider"
                              style={{
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-primary)',
                              }}
                            >
                              [ESC]
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider"
                              style={{
                                backgroundColor: 'var(--text-primary)',
                                color: 'var(--bg-primary)',
                                border: '1px solid var(--text-primary)',
                              }}
                            >
                              [SAVE]
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={keyword.id}
                        className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 font-mono text-xs"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--bg-secondary)'
                            : 'transparent',
                          opacity: isSelected ? 0.6 : 1,
                          borderLeft: isSelected ? '2px solid var(--accent-done)' : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleStartEdit(keyword)}
                          className="w-3 h-3 flex-shrink-0 hover:ring-2 hover:ring-offset-1 transition-all"
                          style={{ backgroundColor: keyword.color }}
                          title="Edit color"
                        />
                        <button
                          type="button"
                          onClick={() => handleSelectKeyword(keyword.id)}
                          disabled={isSelected}
                          className="flex-1 text-left"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          #{keyword.name}
                        </button>
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          ({usageCount})
                        </span>
                        {isSelected && (
                          <span
                            className="font-mono text-[10px]"
                            style={{ color: 'var(--accent-done)' }}
                          >
                            [ADDED]
                          </span>
                        )}
                        {usageCount === 0 && !isSelected && (
                          <button
                            type="button"
                            onClick={() => handleDeleteKeyword(keyword.id)}
                            className="font-mono text-[10px] hover:opacity-80 transition-opacity"
                            style={{ color: '#ff4444' }}
                            title="Delete unused keyword"
                          >
                            [DEL]
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Create New Option */}
                  {searchQuery.trim() && !exactMatchExists && (
                    <button
                      type="button"
                      onClick={handleShowCreateForm}
                      className="w-full px-4 py-2.5 flex items-center gap-2 transition-colors duration-150 text-left border-t font-mono text-xs"
                      style={{
                        borderColor: 'var(--border-primary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ color: 'var(--accent-done)' }}>[+]</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        create #{searchQuery.trim()}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KeywordSelector;
