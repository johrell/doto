import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  type Collision,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTaskStore } from './stores/taskStore';
import { useKeywordStore } from './stores/keywordStore';
import { useGroupStore } from './stores/groupStore';
import { useProjectStore } from './stores/projectStore';
import { TaskForm } from './components/TaskForm';
import { ConfirmModal } from './components/ConfirmModal';
import { ProjectDropdown } from './components/ProjectDropdown';
import { Column, TaskCard } from './components/Column';
import { type QuickAddInputHandle } from './components/QuickAddInput';
import { useTheme } from './hooks/useTheme';
import { COLUMN_CONFIG } from './config/columns';
import { parseQuickAddInput } from './utils/taskParser';
import type { Task, Keyword, Status, CreateTaskInput } from './types';

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const taskStore = useTaskStore();
  const keywordStore = useKeywordStore();
  const groupStore = useGroupStore();
  const projectStore = useProjectStore();

  // Ref for quick add input to enable global focus
  const quickAddRef = useRef<QuickAddInputHandle>(null);

  // Focus quick add input when pressing Enter outside of inputs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key
      if (e.key !== 'Enter') return;

      // Don't trigger if in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger if a modal or panel is open
      if (selectedTaskId || isCreating || showDeleteConfirm) return;

      // Focus the quick add input
      e.preventDefault();
      quickAddRef.current?.focus();
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedTaskId, isCreating, showDeleteConfirm]);

  // Ensure a default project exists on first load
  useEffect(() => {
    projectStore.ensureDefaultProject();
  }, [projectStore]);

  // Get current project
  const currentProject = projectStore.getCurrentProject();
  const currentProjectTaskIds = currentProject?.taskIds ?? [];

  // Filter tasks by current project
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Status, Task[]> = {
      todo: [],
      inProgress: [],
      finished: [],
    };

    const orderedStatuses: Status[] = ['todo', 'inProgress', 'finished'];
    for (const status of orderedStatuses) {
      const taskIds = taskStore.orderByStatus[status] || [];
      grouped[status] = taskIds
        .map((id) => taskStore.byId[id])
        .filter((task): task is Task => task !== undefined)
        .filter((task) => currentProjectTaskIds.includes(task.id));
    }

    return grouped;
  }, [taskStore.byId, taskStore.orderByStatus, currentProjectTaskIds]);

  const totalTasks = useMemo(() =>
    Object.values(tasksByStatus).reduce((sum, tasks) => sum + tasks.length, 0),
    [tasksByStatus]
  );

  const selectedTask = selectedTaskId ? taskStore.byId[selectedTaskId] : null;

  // Pointer-based collision detection
  const columnIds = ['todo', 'inProgress', 'finished'];
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // pointerWithin checks if pointer is inside droppable areas
    const collisions = pointerWithin(args);

    if (collisions.length === 0) {
      return [];
    }

    // Separate column and item collisions
    const columnCollisions: Collision[] = [];
    const itemCollisions: Collision[] = [];

    for (const collision of collisions) {
      if (columnIds.includes(collision.id as string)) {
        columnCollisions.push(collision);
      } else {
        itemCollisions.push(collision);
      }
    }

    // Prefer item collisions for precise positioning, fall back to column
    return itemCollisions.length > 0 ? itemCollisions : columnCollisions;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeTask = activeId ? taskStore.byId[activeId] : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;

    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = over.id as string;

    // If over a column directly
    if (columnIds.includes(overId)) {
      setOverColumnId(overId);
    } else {
      // Over a task - find which column it belongs to
      const overTask = taskStore.byId[overId];
      if (overTask) {
        setOverColumnId(overTask.status);
      } else {
        setOverColumnId(null);
      }
    }
  }, [taskStore.byId]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumnId(null);

      if (!over) return;

      const activeTaskId = active.id as string;
      const overId = over.id as string;

      let destinationStatus: Status;
      let destinationIndex: number;

      if (['todo', 'inProgress', 'finished'].includes(overId)) {
        destinationStatus = overId as Status;
        destinationIndex = tasksByStatus[destinationStatus].length;
      } else {
        const overTask = taskStore.byId[overId];
        if (!overTask) return;

        destinationStatus = overTask.status;
        const tasksInColumn = tasksByStatus[destinationStatus];
        destinationIndex = tasksInColumn.findIndex((t) => t.id === overId);
        if (destinationIndex === -1) destinationIndex = tasksInColumn.length;
      }

      taskStore.moveTask(activeTaskId, destinationStatus, destinationIndex);
    },
    [taskStore, tasksByStatus]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumnId(null);
  }, []);

  // Open task in edit mode
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
  }, []);

  // Close task form and focus quick add
  const handleCloseTaskForm = useCallback(() => {
    setSelectedTaskId(null);
    // Focus quick add after panel closes
    setTimeout(() => quickAddRef.current?.focus(), 100);
  }, []);

  // Save edited task
  const handleSaveEdit = useCallback(
    (data: CreateTaskInput) => {
      if (selectedTaskId) {
        // Auto-save: just update the task, don't close the panel
        taskStore.updateTask({
          id: selectedTaskId,
          ...data,
        });
      }
    },
    [selectedTaskId, taskStore]
  );

  // Open create form - "Add Task" button opens form in create mode
  const handleOpenCreate = useCallback(() => {
    setIsCreating(true);
    setSelectedTaskId(null);
  }, []);

  // Close create form and focus quick add
  const handleCloseCreate = useCallback(() => {
    setIsCreating(false);
    // Focus quick add after panel closes
    setTimeout(() => quickAddRef.current?.focus(), 100);
  }, []);

  // Save new task - auto-generates ID and dateCreated via taskStore.addTask
  // Associates the task with the current project
  const handleSaveCreate = useCallback(
    (data: CreateTaskInput) => {
      // taskStore.addTask handles:
      // - Auto-generated ID (task_[timestamp]_[random])
      // - Auto-generated dateCreated (current ISO timestamp)
      const newTask = taskStore.addTask(data);

      // Associate task with current project
      if (currentProject) {
        projectStore.addTaskToProject(currentProject.id, newTask.id);
      }

      setIsCreating(false);
    },
    [taskStore, currentProject, projectStore]
  );

  // Quick add task - parses #keywords and @group from input
  // Example: "Fix the bug #urgent #backend @frontend"
  const handleQuickAdd = useCallback(
    (input: string) => {
      const { title, hashtags, groupName } = parseQuickAddInput(input);

      if (!title) return;

      // Find or create keywords
      const keywordIds: string[] = [];
      for (const tag of hashtags) {
        // Check if keyword exists (case-insensitive)
        const existingKeyword = keywordStore.getAllKeywords().find(
          (k) => k.name.toLowerCase() === tag
        );
        if (existingKeyword) {
          keywordIds.push(existingKeyword.id);
        } else {
          // Create new keyword with a default color
          const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const newKeyword = keywordStore.addKeyword({ name: tag, color });
          keywordIds.push(newKeyword.id);
        }
      }

      // Find group by name (case-insensitive)
      let groupId: string | null = null;
      if (groupName) {
        const existingGroup = groupStore.getAllGroups().find(
          (g) => g.name.toLowerCase() === groupName
        );
        if (existingGroup) {
          groupId = existingGroup.id;
        }
        // Note: we don't auto-create groups, only use existing ones
      }

      const newTask = taskStore.addTask({
        title,
        description: '',
        status: 'todo',
        keywords: keywordIds,
        groupId,
        externalRef: null,
        deadline: null,
      });

      if (currentProject) {
        projectStore.addTaskToProject(currentProject.id, newTask.id);
      }
    },
    [taskStore, keywordStore, groupStore, currentProject, projectStore]
  );

  // Delete task flow - shows confirmation modal
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  // Confirm delete - removes task from store and project
  const handleConfirmDelete = useCallback(() => {
    if (selectedTaskId) {
      // Remove task from project first
      if (currentProject) {
        projectStore.removeTaskFromProject(currentProject.id, selectedTaskId);
      }

      taskStore.deleteTask(selectedTaskId);
      setSelectedTaskId(null);
      setShowDeleteConfirm(false);
    }
  }, [selectedTaskId, taskStore, currentProject, projectStore]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 80%, transparent)',
          borderColor: 'var(--border-primary)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <div className="flex items-center">
                <span
                  className="text-sm mr-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {'> '}
                </span>
                <h1
                  className="font-display text-5xl tracking-wide"
                  style={{ color: 'var(--text-primary)' }}
                >
                  DOTO
                </h1>
                <span
                  className="inline-block w-3 h-7 ml-1 animate-pulse"
                  style={{ backgroundColor: 'var(--terminal-glow, var(--text-primary))' }}
                />
              </div>
              <span
                className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                [{totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}]
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Project Dropdown */}
              <ProjectDropdown />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  boxShadow: '2px 2px 0 var(--border-secondary)',
                  color: theme === 'light' ? 'var(--accent-todo)' : 'var(--terminal-glow)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '3px 3px 0 var(--border-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '2px 2px 0 var(--border-secondary)';
                }}
                aria-label={'Switch to ' + (theme === 'light' ? 'dark' : 'light') + ' mode'}
              >
                {theme === 'light' ? '[LIGHT]' : '[DARK]'}
              </button>

              {/* Add Task Button - Opens form in create mode */}
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  border: '2px solid var(--text-primary)',
                  boxShadow: '3px 3px 0 var(--border-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '5px 5px 0 var(--border-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '3px 3px 0 var(--border-secondary)';
                }}
              >
                [+] New Task
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {COLUMN_CONFIG.map((column, index) => (
              <Column
                key={column.status}
                config={column}
                tasks={tasksByStatus[column.status]}
                keywordMap={keywordStore.byId}
                groupMap={groupStore.byId}
                index={index}
                isHighlighted={overColumnId === column.status}
                onTaskClick={handleTaskClick}
                onQuickAdd={column.status === 'todo' ? handleQuickAdd : undefined}
                quickAddRef={column.status === 'todo' ? quickAddRef : undefined}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                keywords={activeTask.keywords
                  .map((id) => keywordStore.byId[id])
                  .filter((k): k is Keyword => k !== undefined)}
                group={activeTask.groupId ? groupStore.byId[activeTask.groupId] : undefined}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Task Form (edit mode) - Opens when clicking a task */}
      {selectedTask && (
        <TaskForm
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={handleCloseTaskForm}
          onSave={handleSaveEdit}
          onDelete={handleDeleteClick}
          title="Edit Task"
        />
      )}

      {/* Task Form (create mode) - Opens when Add Task button is clicked */}
      {isCreating && (
        <TaskForm
          task={null}
          isOpen={isCreating}
          onClose={handleCloseCreate}
          onSave={handleSaveCreate}
          title="New Task"
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Task?"
        message={'Are you sure you want to delete "' + (selectedTask?.title || '') + '"? This action cannot be undone.'}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default App;
