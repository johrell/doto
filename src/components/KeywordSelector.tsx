import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useKeywordStore } from '../stores/keywordStore';
import { useTaskStore } from '../stores/taskStore';
import { KeywordTag } from './KeywordTag';
import { ColorPicker } from './ColorPicker';
import { CheckIcon, PlusIcon, TrashIcon } from './Icons';
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
        <div className="flex flex-wrap gap-1.5 mb-2">
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
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search or add a keyword"
        className="form-input"
        aria-label="Search keywords"
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="menu left-0 right-0 animate-scale-in">
          {isCreating ? (
            /* Create New Keyword Form */
            <div className="menu-section">
              <div className="flex items-center gap-2">
                <span className="swatch" style={{ backgroundColor: newKeywordColor }} />
                <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                  #{searchQuery.trim()}
                </span>
              </div>
              <div>
                <span className="field-label">Color</span>
                <ColorPicker selectedColor={newKeywordColor} onChange={setNewKeywordColor} />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setSearchQuery(''); }}
                  className="btn btn-sm"
                >
                  Cancel
                </button>
                <button type="button" onClick={handleCreateKeyword} className="btn btn-primary btn-sm">
                  Create
                </button>
              </div>
            </div>
          ) : (
            /* Keyword List */
            <div className="max-h-64 overflow-y-auto">
              {filteredKeywords.length === 0 && !searchQuery.trim() ? (
                <div className="menu-empty">No keywords yet. Type to create one.</div>
              ) : (
                <>
                  {filteredKeywords.map((keyword) => {
                    const isSelected = selectedKeywordIds.includes(keyword.id);
                    const isEditing = editingKeywordId === keyword.id;
                    const usageCount = keywordUsage[keyword.id] || 0;

                    if (isEditing) {
                      return (
                        <div key={keyword.id} className="menu-section" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                          <div className="flex items-center gap-2">
                            <span className="swatch" style={{ backgroundColor: editingColor }} />
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                              #{keyword.name}
                            </span>
                          </div>
                          <ColorPicker selectedColor={editingColor} onChange={setEditingColor} />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingKeywordId(null)} className="btn btn-sm">
                              Cancel
                            </button>
                            <button type="button" onClick={handleSaveEdit} className="btn btn-primary btn-sm">
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={keyword.id} className="menu-item" aria-disabled={isSelected}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(keyword)}
                          className="swatch hover:ring-2 hover:ring-offset-1 transition-all"
                          style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: keyword.color }}
                          title="Edit color"
                          aria-label={'Edit color of ' + keyword.name}
                        />
                        <button
                          type="button"
                          onClick={() => handleSelectKeyword(keyword.id)}
                          disabled={isSelected}
                          className="flex-1 text-left truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          #{keyword.name}
                        </button>
                        {isSelected ? (
                          <CheckIcon style={{ color: 'var(--accent-done)' }} />
                        ) : (
                          <span className="side-count" style={{ marginLeft: 0 }}>{usageCount}</span>
                        )}
                        {usageCount === 0 && !isSelected && (
                          <button
                            type="button"
                            onClick={() => handleDeleteKeyword(keyword.id)}
                            className="icon-btn icon-btn-danger"
                            style={{ width: 24, height: 24 }}
                            title="Delete unused keyword"
                            aria-label={'Delete ' + keyword.name}
                          >
                            <TrashIcon size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Create New Option */}
                  {searchQuery.trim() && !exactMatchExists && (
                    <>
                      {filteredKeywords.length > 0 && <div className="menu-divider" />}
                      <button type="button" onClick={handleShowCreateForm} className="menu-item">
                        <PlusIcon style={{ color: 'var(--accent-done)' }} />
                        <span>Create #{searchQuery.trim()}</span>
                      </button>
                    </>
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
