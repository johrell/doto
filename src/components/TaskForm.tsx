import { useState, useCallback, useEffect, useRef } from 'react';
import { KeywordSelector } from './KeywordSelector';
import { GroupSelector } from './GroupSelector';
import { COLUMN_CONFIG } from '../config/columns';
import { LinkIcon, TrashIcon, XIcon } from './Icons';
import type { Task, CreateTaskInput, Status } from '../types';

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
  /** Callback when the status is changed from the panel (edit mode only) */
  onStatusChange?: (status: Status) => void;
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
 * Format a date for display in the timeline
 */
function formatDisplayDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Whole days a deadline is past, 0 when not overdue
 */
function getOverdueDays(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  return Math.max(0, Math.round((today.getTime() - deadlineDay.getTime()) / (1000 * 60 * 60 * 24)));
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
  onStatusChange,
  title,
}: TaskFormProps) {
  const isEditMode = !!task;
  const displayTitle = title ?? (isEditMode ? 'Edit task' : 'New task');

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

  const timeline: string[] = [];
  if (isEditMode && task) {
    timeline.push('Created ' + formatDisplayDate(task.dateCreated));
    if (task.dateStarted) timeline.push('Started ' + formatDisplayDate(task.dateStarted));
    if (task.dateCompleted) timeline.push('Completed ' + formatDisplayDate(task.dateCompleted));
  }
  const overdueDays = isEditMode && task && task.deadline && !task.dateCompleted ? getOverdueDays(task.deadline) : 0;

  return (
    <div
      ref={panelRef}
      className="panel animate-slide-in-right"
      onKeyDown={handleKeyDown}
      role="region"
      aria-labelledby="task-form-title"
    >
      {/* Header */}
      <div className="panel-header">
        <h2 id="task-form-title" className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {displayTitle}
        </h2>
        <button type="button" onClick={onClose} className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Close panel" title="Close (Esc)">
          <XIcon />
        </button>
      </div>

      {/* Form */}
      <div className="panel-body">
        {/* Status (edit mode only) */}
        {isEditMode && task && onStatusChange && (
          <div className="segmented" role="group" aria-label="Status">
            {COLUMN_CONFIG.map((column) => (
              <button
                key={column.status}
                type="button"
                className="segment"
                aria-pressed={task.status === column.status}
                onClick={() => task.status !== column.status && onStatusChange(column.status)}
              >
                <span className="swatch" style={{ borderRadius: '50%', backgroundColor: 'var(' + column.accentVar + ')' }} />
                {column.title}
              </button>
            ))}
          </div>
        )}

        {/* Title Field */}
        <div>
          <label htmlFor="task-title" className="field-label">
            Title{!isEditMode && <span style={{ color: 'var(--danger)' }}> *</span>}
          </label>
          <input
            ref={titleInputRef}
            id="task-title"
            type="text"
            value={formData.title}
            onChange={handleChange('title')}
            onKeyDown={handleTitleKeyDown}
            placeholder="What needs doing?"
            className="form-input"
          />
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="task-description" className="field-label">Description</label>
          <textarea
            ref={descriptionInputRef}
            id="task-description"
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Add details, links or notes"
            className="form-input"
            rows={4}
          />
        </div>

        {/* Keywords Field */}
        <div>
          <span className="field-label">Keywords</span>
          <KeywordSelector
            selectedKeywordIds={formData.keywords}
            onChange={handleKeywordsChange}
          />
        </div>

        {/* Group and Deadline */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="min-w-0">
            <span className="field-label">Group</span>
            <GroupSelector
              selectedGroupId={formData.groupId}
              onChange={handleGroupChange}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="task-deadline" className="field-label">Deadline</label>
            <input
              id="task-deadline"
              type="date"
              value={formData.deadline}
              onChange={handleChange('deadline')}
              className="form-input"
              style={overdueDays > 0 ? { color: 'var(--danger)' } : undefined}
            />
          </div>
        </div>

        {/* External Reference Field */}
        <div>
          <label htmlFor="task-external-ref" className="field-label">External reference</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              id="task-external-ref"
              type="text"
              value={formData.externalRef}
              onChange={handleChange('externalRef')}
              placeholder="Ticket number or issue link"
              className="form-input"
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        {/* Timeline (edit mode only) */}
        {isEditMode && task && (
          <div className="info-box">
            <span className="field-label" style={{ marginBottom: 0 }}>Timeline</span>
            <span>{timeline.join(' · ')}</span>
            {overdueDays > 0 && (
              <span style={{ color: 'var(--danger)' }}>
                Overdue by {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="panel-footer">
        {isEditMode ? (
          <span className="meta">
            <span className="swatch" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-done)' }} />
            Saved automatically
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Esc to cancel</span>
        )}

        {isEditMode && onDelete && (
          <button type="button" onClick={onDelete} className="btn btn-danger btn-sm">
            <TrashIcon />
            Delete task
          </button>
        )}

        {!isEditMode && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={!formData.title.trim()}
            className="btn btn-primary"
          >
            Create task
          </button>
        )}
      </div>
    </div>
  );
}

export default TaskForm;
