import { useState, useCallback, useEffect, useRef } from 'react';
import { KeywordSelector } from './KeywordSelector';
import { GroupSelector } from './GroupSelector';
import type { Task, CreateTaskInput } from '../types';

/**
 * Props for the TaskForm component
 */
export interface TaskFormProps {
  /** Existing task data for edit mode (null for create mode) */
  task: Task | null;
  /** Whether the form is open */
  isOpen: boolean;
  /** Callback to close the form */
  onClose: () => void;
  /** Callback when form is submitted with task data */
  onSave: (data: CreateTaskInput) => void;
  /** Callback when delete is requested (edit mode only) */
  onDelete?: () => void;
  /** Title for the form header */
  title?: string;
}

/**
 * Form data structure
 */
interface FormData {
  title: string;
  description: string;
  externalRef: string;
  deadline: string;
  keywords: string[];
  groupId: string | null;
}

/**
 * Format a date for input[type="date"]
 */
function formatDateForInput(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Debounce delay for auto-save (ms)
 */
const AUTO_SAVE_DELAY = 500;

/**
 * TaskForm - Form component for creating and editing tasks
 *
 * In edit mode: Auto-saves changes after a short delay
 * In create mode: Shows a Create button to confirm task creation
 */
export function TaskForm({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  title,
}: TaskFormProps) {
  const isEditMode = !!task;
  const displayTitle = title ?? (isEditMode ? 'Task Properties' : 'New Task');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    externalRef: '',
    deadline: '',
    keywords: [],
    groupId: null,
  });

  // Track if this is the initial load (to prevent auto-save on mount)
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  // Focus title input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure panel is rendered
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close panel when clicking outside (but not on task cards or modals)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Don't close if clicking inside the panel
      if (panelRef.current?.contains(target)) {
        return;
      }

      // Don't close if clicking on a task card (let task click handler work)
      if (target.closest('[data-task-card]')) {
        return;
      }

      // Don't close if clicking on a modal (like confirm delete)
      if (target.closest('[role="alertdialog"]') || target.closest('[role="dialog"]')) {
        return;
      }

      // Close the panel
      onClose();
    }

    // Use setTimeout to avoid closing immediately on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Initialize form data when switching to a different task
  // Only sync when task ID changes, not when task data is updated from auto-save
  useEffect(() => {
    const newTaskId = task?.id ?? null;

    // Only reset form data if we're switching to a different task
    if (newTaskId !== currentTaskIdRef.current) {
      currentTaskIdRef.current = newTaskId;

      if (task) {
        setFormData({
          title: task.title,
          description: task.description || '',
          externalRef: task.externalRef || '',
          deadline: formatDateForInput(task.deadline),
          keywords: task.keywords || [],
          groupId: task.groupId ?? null,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          externalRef: '',
          deadline: '',
          keywords: [],
          groupId: null,
        });
      }
      isInitialMount.current = true;
    }
  }, [task]);

  // Auto-save in edit mode when formData changes
  useEffect(() => {
    // Skip auto-save on initial mount or in create mode
    if (isInitialMount.current || !isEditMode) {
      isInitialMount.current = false;
      return;
    }

    // Don't save if title is empty
    if (!formData.title.trim()) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      const taskData: CreateTaskInput = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        externalRef: formData.externalRef.trim() || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        status: task?.status || 'todo',
        keywords: formData.keywords,
        groupId: formData.groupId,
      };
      onSave(taskData);
    }, AUTO_SAVE_DELAY);

    // Cleanup timeout on unmount or before next effect
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, isEditMode, task?.status, onSave]);

  // Handle field change
  const handleChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Handle keyword change
  const handleKeywordsChange = useCallback((keywordIds: string[]) => {
    setFormData((prev) => ({ ...prev, keywords: keywordIds }));
  }, []);

  // Handle group change
  const handleGroupChange = useCallback((groupId: string | null) => {
    setFormData((prev) => ({ ...prev, groupId }));
  }, []);

  // Handle create submission (only for create mode)
  const handleCreate = useCallback(() => {
    if (!formData.title.trim()) {
      return;
    }

    const taskData: CreateTaskInput = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      externalRef: formData.externalRef.trim() || null,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      status: 'todo',
      keywords: formData.keywords,
      groupId: formData.groupId,
    };

    onSave(taskData);
  }, [formData, onSave]);

  // Handle escape key on panel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Handle Enter key in title to move to description
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        descriptionInputRef.current?.focus();
      }
    },
    []
  );

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed top-0 right-0 bottom-0 z-40 w-full max-w-md animate-slide-in-right"
      onKeyDown={handleKeyDown}
      role="region"
      aria-labelledby="task-form-title"
    >
      {/* Panel */}
      <div
        className="h-full overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h2
            id="task-form-title"
            className="font-mono text-sm uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            {'// '}{displayTitle}
          </h2>
          <button
            onClick={onClose}
            className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            aria-label="Close panel"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            [ESC]
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Title Field */}
          <div>
            <label
              htmlFor="task-title"
              className="block font-mono text-[10px] uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// title'} {!isEditMode && <span style={{ color: '#ff4444' }}>*</span>}
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              value={formData.title}
              onChange={handleChange('title')}
              onKeyDown={handleTitleKeyDown}
              placeholder="enter_task_title..."
              className="form-input font-mono text-sm"
            />
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="task-description"
              className="block font-mono text-[10px] uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// description'}
            </label>
            <textarea
              ref={descriptionInputRef}
              id="task-description"
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="add_description..."
              className="form-input font-mono text-sm"
              rows={4}
            />
          </div>

          {/* Keywords Field */}
          <div>
            <label
              className="block font-mono text-[10px] uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// keywords'}
            </label>
            <KeywordSelector
              selectedKeywordIds={formData.keywords}
              onChange={handleKeywordsChange}
            />
          </div>

          {/* Group Field */}
          <div>
            <label
              className="block font-mono text-[10px] uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// group'}
            </label>
            <GroupSelector
              selectedGroupId={formData.groupId}
              onChange={handleGroupChange}
            />
          </div>

          {/* External Reference Field */}
          <div>
            <label
              htmlFor="task-external-ref"
              className="block font-mono text-[10px] uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// external_ref'}
            </label>
            <input
              id="task-external-ref"
              type="text"
              value={formData.externalRef}
              onChange={handleChange('externalRef')}
              placeholder="https://github.com/issue/123"
              className="form-input font-mono text-sm"
            />
            <p className="mt-1.5 font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {'// link to external ticket or issue'}
            </p>
          </div>

          {/* Deadline Field */}
          <div>
            <label
              htmlFor="task-deadline"
              className="block font-mono text-[10px] uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// deadline'}
            </label>
            <input
              id="task-deadline"
              type="date"
              value={formData.deadline}
              onChange={handleChange('deadline')}
              className="form-input font-mono text-sm"
            />
          </div>

          {/* Read-only info for edit mode */}
          {isEditMode && task && (
            <div
              className="pt-4 border-t"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <p className="font-mono text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {'// created: '}{new Date(task.dateCreated).toLocaleDateString()}
                {task.dateCompleted && (
                  <>{' | completed: '}{new Date(task.dateCompleted).toLocaleDateString()}</>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Delete button (edit mode only) */}
          {isEditMode && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-200"
              style={{
                color: '#ff4444',
                border: '1px solid #ff4444',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              [DELETE]
            </button>
          ) : (
            <div />
          )}

          {/* Create button (create mode only) */}
          {!isEditMode && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!formData.title.trim()}
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              style={{
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                border: '1px solid var(--text-primary)',
                boxShadow: '2px 2px 0 var(--border-secondary)',
              }}
            >
              [CREATE TASK]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskForm;
