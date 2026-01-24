import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGroupStore } from '../stores/groupStore';
import { useTaskStore } from '../stores/taskStore';
import { ColorPicker } from './ColorPicker';
import type { Group } from '../types';

/**
 * Props for the GroupSelector component
 */
export interface GroupSelectorProps {
  /** Currently selected group ID (null if none) */
  selectedGroupId: string | null;
  /** Callback when selection changes */
  onChange: (groupId: string | null) => void;
}

/**
 * Default color for new groups
 */
const DEFAULT_COLOR = '#8b5cf6';

/**
 * GroupSelector - Dropdown with autocomplete for selecting a single group
 *
 * Features:
 * - Text input filters existing groups
 * - Click to select a group (single selection)
 * - Create new groups inline with color picker
 * - Clear selection option
 */
export function GroupSelector({ selectedGroupId, onChange }: GroupSelectorProps) {
  const groupStore = useGroupStore();
  const taskStore = useTaskStore();

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_COLOR);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState(DEFAULT_COLOR);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all groups and filter by search query
  const allGroups = groupStore.getAllGroups();

  // Get usage count for each group
  const groupUsage = useMemo(() => {
    const allTasks = taskStore.getAllTasks();
    const usage: Record<string, number> = {};
    for (const group of allGroups) {
      usage[group.id] = allTasks.filter((t) => t.groupId === group.id).length;
    }
    return usage;
  }, [allGroups, taskStore]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return allGroups;
    const query = searchQuery.toLowerCase().trim();
    return allGroups.filter((g) => g.name.toLowerCase().includes(query));
  }, [allGroups, searchQuery]);

  // Get selected group
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groupStore.getGroupById(selectedGroupId) ?? null;
  }, [selectedGroupId, groupStore]);

  // Check if exact match exists (for showing create option)
  const exactMatchExists = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return allGroups.some((g) => g.name.toLowerCase() === query);
  }, [allGroups, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingGroupId(null);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Start editing a group's color
  const handleStartEdit = useCallback((group: Group) => {
    setEditingGroupId(group.id);
    setEditingColor(group.color);
    setIsCreating(false);
  }, []);

  // Save edited group color
  const handleSaveEdit = useCallback(() => {
    if (editingGroupId) {
      groupStore.updateGroup({ id: editingGroupId, color: editingColor });
      setEditingGroupId(null);
    }
  }, [editingGroupId, editingColor, groupStore]);

  // Delete an unused group
  const handleDeleteGroup = useCallback((groupId: string) => {
    // Clear selection if this group was selected
    if (selectedGroupId === groupId) {
      onChange(null);
    }
    groupStore.deleteGroup(groupId);
  }, [groupStore, selectedGroupId, onChange]);

  // Handle selecting a group
  const handleSelectGroup = useCallback(
    (groupId: string) => {
      onChange(groupId);
      setSearchQuery('');
      setIsCreating(false);
      setIsOpen(false);
    },
    [onChange]
  );

  // Handle clearing selection
  const handleClearSelection = useCallback(() => {
    onChange(null);
    setSearchQuery('');
    setIsOpen(false);
  }, [onChange]);

  // Handle creating a new group
  const handleCreateGroup = useCallback(() => {
    const trimmedName = searchQuery.trim();
    if (!trimmedName) return;

    const newGroup = groupStore.addGroup({
      name: trimmedName,
      color: newGroupColor,
    });

    handleSelectGroup(newGroup.id);
    setNewGroupColor(DEFAULT_COLOR);
  }, [searchQuery, newGroupColor, groupStore, handleSelectGroup]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setIsCreating(false);
      if (!isOpen) setIsOpen(true);
    },
    [isOpen]
  );

  // Handle showing create form
  const handleShowCreateForm = useCallback(() => {
    setIsCreating(true);
  }, []);

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsCreating(false);
        setSearchQuery('');
        inputRef.current?.blur();
      } else if (e.key === 'Enter' && isCreating && searchQuery.trim()) {
        e.preventDefault();
        handleCreateGroup();
      }
    },
    [isCreating, searchQuery, handleCreateGroup]
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Group Display or Search Input */}
      {selectedGroup && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 font-mono text-xs"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <span
            className="w-3 h-3 flex-shrink-0"
            style={{ backgroundColor: selectedGroup.color }}
          />
          <span className="flex-1" style={{ color: 'var(--text-primary)' }}>
            {selectedGroup.name}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>[v]</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="search_groups..."
            className="form-input font-mono text-xs"
          />
        </div>
      )}

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
            /* Create New Group Form */
            <div className="p-4">
              <div className="mb-3">
                <label
                  className="block font-mono text-[10px] uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'// new_group'}
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
                    style={{ backgroundColor: newGroupColor }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{searchQuery.trim()}</span>
                </div>
              </div>

              <div className="mb-4">
                <label
                  className="block font-mono text-[10px] uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'// color'}
                </label>
                <ColorPicker selectedColor={newGroupColor} onChange={setNewGroupColor} />
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
                  onClick={handleCreateGroup}
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
            /* Group List */
            <div className="max-h-64 overflow-y-auto">
              {/* Clear Selection Option */}
              {selectedGroupId && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 text-left border-b font-mono text-xs"
                  style={{ borderColor: 'var(--border-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    className="w-3 h-3 flex-shrink-0 border"
                    style={{ borderColor: 'var(--text-tertiary)' }}
                  />
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {'// no_group'}
                  </span>
                </button>
              )}

              {filteredGroups.length === 0 && !searchQuery.trim() ? (
                <div
                  className="px-4 py-6 text-center font-mono text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'// no groups. type to create.'}
                </div>
              ) : (
                <>
                  {filteredGroups.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    const isEditing = editingGroupId === group.id;
                    const usageCount = groupUsage[group.id] || 0;

                    if (isEditing) {
                      return (
                        <div
                          key={group.id}
                          className="px-4 py-3 border-b"
                          style={{ borderColor: 'var(--border-primary)' }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="w-3 h-3 flex-shrink-0"
                              style={{ backgroundColor: editingColor }}
                            />
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                              @{group.name}
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
                              onClick={() => setEditingGroupId(null)}
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
                        key={group.id}
                        className="w-full px-4 py-2.5 flex items-center gap-3 transition-colors duration-150 font-mono text-xs"
                        style={{
                          backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
                          borderLeft: isSelected ? '2px solid var(--accent-done)' : '2px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleStartEdit(group)}
                          className="w-3 h-3 flex-shrink-0 hover:ring-2 hover:ring-offset-1 transition-all"
                          style={{ backgroundColor: group.color }}
                          title="Edit color"
                        />
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(group.id)}
                          className="flex-1 text-left"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          @{group.name}
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
                            [SELECTED]
                          </span>
                        )}
                        {usageCount === 0 && !isSelected && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="font-mono text-[10px] hover:opacity-80 transition-opacity"
                            style={{ color: '#ff4444' }}
                            title="Delete unused group"
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
                        create {searchQuery.trim()}
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

export default GroupSelector;
