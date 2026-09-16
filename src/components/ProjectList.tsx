import { useState, useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { ConfirmModal } from './ConfirmModal';
import { FolderIcon, PencilIcon, PlusIcon, TrashIcon } from './Icons';
import type { Project } from '../types';

/**
 * Props for the ProjectList component
 */
export interface ProjectListProps {
  /** Optional callback when project changes */
  onProjectChange?: (projectId: string) => void;
}

/**
 * ProjectList - Sidebar list for switching between projects
 *
 * Features:
 * - Lists all projects with their task counts
 * - Click to switch projects
 * - Create new project inline
 * - Rename project inline
 * - Delete project with confirmation (cascading delete of tasks)
 */
export function ProjectList({ onProjectChange }: ProjectListProps) {
  const projectStore = useProjectStore();
  const taskStore = useTaskStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const allProjects = projectStore.getAllProjects();

  useEffect(() => {
    if (isCreating) inputRef.current?.focus();
  }, [isCreating]);

  useEffect(() => {
    if (editingProjectId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingProjectId]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      projectStore.setCurrentProject(projectId);
      setEditingProjectId(null);
      onProjectChange?.(projectId);
    },
    [projectStore, onProjectChange]
  );

  const handleCreateProject = useCallback(() => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) return;

    const newProject = projectStore.addProject({ name: trimmedName });
    projectStore.setCurrentProject(newProject.id);
    setIsCreating(false);
    setNewProjectName('');
    onProjectChange?.(newProject.id);
  }, [newProjectName, projectStore, onProjectChange]);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewProjectName('');
  }, []);

  const handleStartEdit = useCallback((e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setIsCreating(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingProjectId) return;

    const trimmedName = editingName.trim();
    if (trimmedName) {
      projectStore.updateProject({ id: editingProjectId, name: trimmedName });
    }
    setEditingProjectId(null);
    setEditingName('');
  }, [editingProjectId, editingName, projectStore]);

  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditingName('');
  }, []);

  const handleStartDelete = useCallback((e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setDeleteConfirmProject(project);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmProject) return;

    const taskIds = projectStore.deleteProjectWithTasks(deleteConfirmProject.id);
    for (const taskId of taskIds) {
      taskStore.deleteTask(taskId);
    }
    setDeleteConfirmProject(null);
  }, [deleteConfirmProject, projectStore, taskStore]);

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

  return (
    <div>
      <div className="flex items-center justify-between px-2.5 mb-1.5">
        <span className="side-label">Projects</span>
        <button
          type="button"
          onClick={() => { setIsCreating(true); setEditingProjectId(null); }}
          className="icon-btn"
          style={{ width: 24, height: 24 }}
          aria-label="New project"
          title="New project"
        >
          <PlusIcon />
        </button>
      </div>

      <nav aria-label="Projects" className="flex flex-col gap-0.5">
        {allProjects.map((project) => {
          const isSelected = project.id === projectStore.currentProjectId;
          const isEditing = project.id === editingProjectId;
          const taskCount = project.taskIds.length;

          if (isEditing) {
            return (
              <div key={project.id} className="px-1 py-0.5">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleSaveEdit}
                  className="form-input"
                  style={{ minHeight: 34, padding: '4px 10px' }}
                  aria-label="Project name"
                />
              </div>
            );
          }

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              aria-current={isSelected}
              className="side-item group"
              onClick={() => handleSelectProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectProject(project.id);
                }
              }}
            >
              <FolderIcon className="icon" />
              <span className="truncate">{project.name}</span>
              <span className="side-count group-hover:hidden">{taskCount}</span>
              <span className="hidden group-hover:flex items-center gap-0.5 ml-auto -mr-1.5">
                <button
                  type="button"
                  onClick={(e) => handleStartEdit(e, project)}
                  className="icon-btn"
                  style={{ width: 24, height: 24 }}
                  aria-label={'Rename ' + project.name}
                  title="Rename"
                >
                  <PencilIcon size={14} />
                </button>
                {allProjects.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleStartDelete(e, project)}
                    className="icon-btn icon-btn-danger"
                    style={{ width: 24, height: 24 }}
                    aria-label={'Delete ' + project.name}
                    title="Delete"
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </span>
            </div>
          );
        })}

        {isCreating && (
          <div className="px-1 py-0.5">
            <input
              ref={inputRef}
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => { if (!newProjectName.trim()) handleCancelCreate(); }}
              placeholder="Project name"
              className="form-input"
              style={{ minHeight: 34, padding: '4px 10px' }}
              aria-label="New project name"
            />
            <p className="field-hint px-1">Enter to create · Esc to cancel</p>
          </div>
        )}
      </nav>

      <ConfirmModal
        isOpen={!!deleteConfirmProject}
        title="Delete project?"
        message={
          deleteConfirmProject
            ? '"' + deleteConfirmProject.name + '" and its ' +
              deleteConfirmProject.taskIds.length +
              ' task' + (deleteConfirmProject.taskIds.length === 1 ? '' : 's') +
              ' will be deleted. This cannot be undone.'
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmProject(null)}
      />
    </div>
  );
}

export default ProjectList;
