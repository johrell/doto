import { useState, useCallback, useRef, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { ConfirmModal } from './ConfirmModal';
import type { Project } from '../types';

/**
 * Props for the ProjectDropdown component
 */
export interface ProjectDropdownProps {
  /** Optional callback when project changes */
  onProjectChange?: (projectId: string) => void;
}

/**
 * ProjectDropdown - Dropdown for switching between projects
 *
 * Features:
 * - Displays current project name with dropdown arrow
 * - Lists all projects in dropdown menu
 * - Click to switch projects
 * - Click outside closes dropdown
 * - Create new project inline
 * - Rename project inline
 * - Delete project with confirmation (cascading delete of tasks)
 */
export function ProjectDropdown({ onProjectChange }: ProjectDropdownProps) {
  const projectStore = useProjectStore();
  const taskStore = useTaskStore();

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Get current project and all projects
  const currentProject = projectStore.getCurrentProject();
  const allProjects = projectStore.getAllProjects();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewProjectName('');
        setEditingProjectId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // Focus input when editing
  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setIsCreating(false);
      setNewProjectName('');
      setEditingProjectId(null);
    }
  }, [isOpen]);

  // Select a project
  const handleSelectProject = useCallback(
    (projectId: string) => {
      projectStore.setCurrentProject(projectId);
      setIsOpen(false);
      setIsCreating(false);
      setEditingProjectId(null);
      onProjectChange?.(projectId);
    },
    [projectStore, onProjectChange]
  );

  // Start creating a new project
  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewProjectName('');
    setEditingProjectId(null);
  }, []);

  // Create the new project
  const handleCreateProject = useCallback(() => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) return;

    const newProject = projectStore.addProject({ name: trimmedName });
    projectStore.setCurrentProject(newProject.id);
    setIsCreating(false);
    setNewProjectName('');
    setIsOpen(false);
    onProjectChange?.(newProject.id);
  }, [newProjectName, projectStore, onProjectChange]);

  // Cancel creating
  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewProjectName('');
  }, []);

  // Start editing a project name
  const handleStartEdit = useCallback(
    (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setEditingProjectId(project.id);
      setEditingName(project.name);
      setIsCreating(false);
    },
    []
  );

  // Save edited project name
  const handleSaveEdit = useCallback(() => {
    if (!editingProjectId) return;

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setEditingProjectId(null);
      return;
    }

    projectStore.updateProject({ id: editingProjectId, name: trimmedName });
    setEditingProjectId(null);
    setEditingName('');
  }, [editingProjectId, editingName, projectStore]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditingName('');
  }, []);

  // Start delete confirmation
  const handleStartDelete = useCallback(
    (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setDeleteConfirmProject(project);
    },
    []
  );

  // Confirm delete (cascading)
  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmProject) return;

    // Get task IDs and delete project
    const taskIds = projectStore.deleteProjectWithTasks(deleteConfirmProject.id);

    // Delete all associated tasks
    for (const taskId of taskIds) {
      taskStore.deleteTask(taskId);
    }

    setDeleteConfirmProject(null);
    setIsOpen(false);
  }, [deleteConfirmProject, projectStore, taskStore]);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmProject(null);
  }, []);

  // Handle key events for creating
  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreateProject();
      } else if (e.key === 'Escape') {
        handleCancelCreate();
      }
    },
    [handleCreateProject, handleCancelCreate]
  );

  // Handle key events for editing
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  // Get task count for a project
  const getTaskCount = useCallback(
    (project: Project) => {
      return project.taskIds.length;
    },
    []
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Dropdown Trigger */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
          boxShadow: '2px 2px 0 var(--border-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '3px 3px 0 var(--border-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '2px 2px 0 var(--border-secondary)';
        }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>{'>'}</span>
        <span
          className="max-w-[120px] truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {currentProject?.name || 'SELECT_PROJECT'}
        </span>
        <span
          style={{
            color: 'var(--text-tertiary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            display: 'inline-block',
          }}
        >
          {isOpen ? '[-]' : '[+]'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 overflow-hidden animate-scale-in z-50"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            boxShadow: '4px 4px 0 var(--border-secondary)',
          }}
        >
          {/* Project List */}
          <div className="max-h-64 overflow-y-auto">
            {allProjects.map((project) => {
              const isSelected = project.id === projectStore.currentProjectId;
              const isEditing = project.id === editingProjectId;
              const taskCount = getTaskCount(project);

              return (
                <div
                  key={project.id}
                  className="group flex items-center px-4 py-2.5 transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
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
                  onClick={() => !isEditing && handleSelectProject(project.id)}
                >
                  {isEditing ? (
                    /* Edit Mode */
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleSaveEdit}
                      className="flex-1 px-2 py-1 font-mono text-xs"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex-1 min-w-0">
                        <span
                          className="block font-mono text-xs truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {isSelected && <span style={{ color: 'var(--accent-done)' }}>{'> '}</span>}
                          {project.name}
                        </span>
                        <span
                          className="font-mono text-[10px] uppercase"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          [{taskCount} {taskCount === 1 ? 'task' : 'tasks'}]
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {/* Edit Button */}
                        <button
                          onClick={(e) => handleStartEdit(e, project)}
                          className="px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-150"
                          style={{
                            color: 'var(--text-tertiary)',
                            border: '1px solid var(--border-primary)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                          }}
                          title="Rename project"
                        >
                          [EDIT]
                        </button>

                        {/* Delete Button - only show if more than one project */}
                        {allProjects.length > 1 && (
                          <button
                            onClick={(e) => handleStartDelete(e, project)}
                            className="px-1.5 py-0.5 font-mono text-[10px] transition-colors duration-150"
                            style={{
                              color: 'var(--text-tertiary)',
                              border: '1px solid var(--border-primary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                              e.currentTarget.style.color = '#ff4444';
                              e.currentTarget.style.borderColor = '#ff4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--text-tertiary)';
                              e.currentTarget.style.borderColor = 'var(--border-primary)';
                            }}
                            title="Delete project"
                          >
                            [DEL]
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div
            className="h-px"
            style={{ backgroundColor: 'var(--border-primary)' }}
          />

          {/* Create New Project */}
          {isCreating ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs" style={{ color: 'var(--accent-todo)' }}>{'>'}</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  placeholder="project_name..."
                  className="flex-1 px-2 py-1.5 font-mono text-xs"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelCreate}
                  className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  [ESC]
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                    border: '1px solid var(--text-primary)',
                  }}
                >
                  [ENTER]
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartCreate}
              className="w-full px-4 py-3 flex items-center gap-2 transition-colors duration-150 text-left font-mono text-xs"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ color: 'var(--accent-done)' }}>[+]</span>
              <span style={{ color: 'var(--text-primary)' }}>NEW_PROJECT</span>
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmProject}
        title="Delete Project?"
        message={
          deleteConfirmProject
            ? 'Are you sure you want to delete "' +
              deleteConfirmProject.name +
              '"? This will also delete ' +
              deleteConfirmProject.taskIds.length +
              ' task' +
              (deleteConfirmProject.taskIds.length === 1 ? '' : 's') +
              '. This action cannot be undone.'
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default ProjectDropdown;
