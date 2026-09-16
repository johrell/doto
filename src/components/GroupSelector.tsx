import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGroupStore } from '../stores/groupStore';
import { useTaskStore } from '../stores/taskStore';
import { ColorPicker } from './ColorPicker';
import { CheckIcon, ChevronDownIcon, PlusIcon, TrashIcon } from './Icons';
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
          className="form-input flex items-center gap-2 text-left"
          aria-haspopup="listbox"
        >
          <span className="swatch" style={{ backgroundColor: selectedGroup.color }} />
          <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
            {selectedGroup.name}
          </span>
          <ChevronDownIcon style={{ color: 'var(--text-tertiary)' }} />
        </button>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search or add a group"
          className="form-input"
          aria-label="Search groups"
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="menu left-0 animate-scale-in" style={{ minWidth: '100%', width: 'max-content', maxWidth: 320 }}>
          {isCreating ? (
            /* Create New Group Form */
            <div className="menu-section">
              <div className="flex items-center gap-2">
                <span className="swatch" style={{ backgroundColor: newGroupColor }} />
                <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{searchQuery.trim()}</span>
              </div>
              <div>
                <span className="field-label">Color</span>
                <ColorPicker selectedColor={newGroupColor} onChange={setNewGroupColor} />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setSearchQuery(''); }}
                  className="btn btn-sm"
                >
                  Cancel
                </button>
                <button type="button" onClick={handleCreateGroup} className="btn btn-primary btn-sm">
                  Create
                </button>
              </div>
            </div>
          ) : (
            /* Group List */
            <div className="max-h-64 overflow-y-auto">
              {/* Clear Selection Option */}
              {selectedGroupId && (
                <>
                  <button type="button" onClick={handleClearSelection} className="menu-item">
                    <span className="swatch" style={{ border: '1px solid var(--border-secondary)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>No group</span>
                  </button>
                  <div className="menu-divider" />
                </>
              )}

              {filteredGroups.length === 0 && !searchQuery.trim() ? (
                <div className="menu-empty">No groups yet. Type to create one.</div>
              ) : (
                <>
                  {filteredGroups.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    const isEditing = editingGroupId === group.id;
                    const usageCount = groupUsage[group.id] || 0;

                    if (isEditing) {
                      return (
                        <div key={group.id} className="menu-section" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                          <div className="flex items-center gap-2">
                            <span className="swatch" style={{ backgroundColor: editingColor }} />
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                              @{group.name}
                            </span>
                          </div>
                          <ColorPicker selectedColor={editingColor} onChange={setEditingColor} />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingGroupId(null)} className="btn btn-sm">
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
                      <div key={group.id} className="menu-item" data-active={isSelected}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(group)}
                          className="swatch hover:ring-2 hover:ring-offset-1 transition-all"
                          style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: group.color }}
                          title="Edit color"
                          aria-label={'Edit color of ' + group.name}
                        />
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(group.id)}
                          className="flex-1 text-left truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {group.name}
                        </button>
                        {isSelected ? (
                          <CheckIcon style={{ color: 'var(--accent-done)' }} />
                        ) : (
                          <span className="side-count" style={{ marginLeft: 0 }}>{usageCount}</span>
                        )}
                        {usageCount === 0 && !isSelected && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="icon-btn icon-btn-danger"
                            style={{ width: 24, height: 24 }}
                            title="Delete unused group"
                            aria-label={'Delete ' + group.name}
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
                      {filteredGroups.length > 0 && <div className="menu-divider" />}
                      <button type="button" onClick={handleShowCreateForm} className="menu-item">
                        <PlusIcon style={{ color: 'var(--accent-done)' }} />
                        <span>Create {searchQuery.trim()}</span>
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

export default GroupSelector;
