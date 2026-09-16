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
import { DataTransfer } from './components/DataTransfer';
import { TaskForm } from './components/TaskForm';
import { ConfirmModal } from './components/ConfirmModal';
import { ProjectList } from './components/ProjectList';
import { ChevronDownIcon, MoonIcon, PlusIcon, SearchIcon, XIcon } from './components/Icons';
import { Column, TaskCard } from './components/Column';
import { type QuickAddInputHandle } from './components/QuickAddInput';
import { useTheme } from './hooks/useTheme';
import { COLUMN_CONFIG } from './config/columns';
import { matchesTaskFilters, type DeadlineFilter } from './utils/taskFilters';
import { parseQuickAddInput } from './utils/taskParser';
import type { Task, Keyword, Status, CreateTaskInput } from './types';

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [query, setQuery] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [deletedTasks, setDeletedTasks] = useState<Array<{ task: Task; allIndex: number; statusIndex: number; projectIds: string[] }>>([]);
  const clearFilters = () => { setQuery(''); setKeywordFilter(''); setDeadlineFilter('all'); };
  const hasFilters = !!query.trim() || !!keywordFilter || deadlineFilter !== 'all';
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
        target.closest('button, a, select, [role="button"], [role="dialog"], [role="alertdialog"]') ||
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

  useEffect(() => { clearFilters(); }, [currentProject?.id]);

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
        .filter((task) => currentProjectTaskIds.includes(task.id))
        .filter((task) => matchesTaskFilters(task, query, keywordFilter, deadlineFilter, keywordStore.byId));
    }

    return grouped;
  }, [taskStore.byId, taskStore.orderByStatus, currentProjectTaskIds, query, keywordFilter, deadlineFilter, keywordStore.byId]);

  const totalTasks = useMemo(() =>
    Object.values(tasksByStatus).reduce((sum, tasks) => sum + tasks.length, 0),
    [tasksByStatus]
  );

  const selectedTask = selectedTaskId ? taskStore.byId[selectedTaskId] : null;

  // Header summary for the current project (unaffected by filters)
  const summary = useMemo(() => {
    const projectTasks = currentProjectTaskIds
      .map((id) => taskStore.byId[id])
      .filter((task): task is Task => task !== undefined);
    return {
      open: projectTasks.filter((task) => task.status !== 'finished').length,
      inProgress: projectTasks.filter((task) => task.status === 'inProgress').length,
      dueThisWeek: projectTasks.filter((task) => matchesTaskFilters(task, '', '', 'week', keywordStore.byId)).length,
      overdue: projectTasks.filter((task) => matchesTaskFilters(task, '', '', 'overdue', keywordStore.byId)).length,
    };
  }, [currentProjectTaskIds, taskStore.byId, keywordStore.byId]);

  // Change status from the task panel (appends to the end of the target column)
  const handleStatusChange = useCallback(
    (status: Status) => {
      if (!selectedTaskId) return;
      const destinationIndex = taskStore.orderByStatus[status].filter((id) => id !== selectedTaskId).length;
      taskStore.moveTask(selectedTaskId, status, destinationIndex);
    },
    [selectedTaskId, taskStore]
  );

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
        destinationIndex = taskStore.orderByStatus[destinationStatus].filter(id => id !== activeTaskId).length;
      } else {
        const overTask = taskStore.byId[overId];
        if (!overTask) return;

        destinationStatus = overTask.status;
        if (activeTaskId === overId) return;
        const tasksInColumn = taskStore.orderByStatus[destinationStatus];
        destinationIndex = tasksInColumn.indexOf(overId);
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
      const task = taskStore.byId[selectedTaskId];
      if (!task) return;
      const projectIds = projectStore.allIds.filter(id => projectStore.byId[id].taskIds.includes(task.id));
      setDeletedTasks(previous => [...previous, {
        task,
        allIndex: taskStore.allIds.indexOf(task.id),
        statusIndex: taskStore.orderByStatus[task.status].indexOf(task.id),
        projectIds,
      }]);
      for (const projectId of projectIds) projectStore.removeTaskFromProject(projectId, task.id);

      taskStore.deleteTask(selectedTaskId);
      setSelectedTaskId(null);
      setShowDeleteConfirm(false);
    }
  }, [selectedTaskId, taskStore, currentProject, projectStore]);

  const handleUndoDelete = () => {
    const deleted = deletedTasks[deletedTasks.length - 1];
    if (!deleted) return;
    const projectIds = deleted.projectIds.filter(id => projectStore.byId[id]);
    if (!projectIds.length) {
      setDeletedTasks(previous => previous.slice(0, -1));
      return;
    }
    taskStore.restoreTask(deleted.task, deleted.allIndex, deleted.statusIndex);
    for (const id of projectIds) projectStore.addTaskToProject(id, deleted.task.id);
    projectStore.setCurrentProject(projectIds[0]);
    clearFilters();
    setDeletedTasks(previous => previous.slice(0, -1));
  };

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-2.5 px-2.5 mb-6">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-sm font-medium"
            style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
            aria-hidden="true"
          >
            d
          </span>
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Doto</span>
        </div>

        <ProjectList />

        <div className="flex-1" />

        <div className="flex flex-col gap-0.5 pt-3 mt-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <DataTransfer theme={theme} />
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={toggleTheme}
            className="side-item"
          >
            <MoonIcon className="icon" />
            Dark mode
            <span className="switch ml-auto" aria-hidden="true">
              <span className="switch-knob" />
            </span>
          </button>
        </div>

        <p className="px-2.5 pt-3.5 font-mono text-[11px] leading-4" style={{ color: 'var(--text-tertiary)' }}>
          Stored in this browser.<br />No account, no sync.
        </p>
      </aside>

      {/* Main */}
      <div className="app-main">
        <header className="topbar">
          <div className="flex items-baseline gap-3.5 min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
              {currentProject?.name ?? 'Doto'}
            </h1>
            <p className="text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
              {summary.open} open · {summary.inProgress} in progress
              {summary.dueThisWeek > 0 && <> · {summary.dueThisWeek} due this week</>}
              {summary.overdue > 0 && <> · <span style={{ color: 'var(--danger)' }}>{summary.overdue} overdue</span></>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5" role="search" aria-label="Filter tasks">
            <label className="search-box">
              <SearchIcon />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
            </label>
            <label className="filter">
              <span>Label</span>
              <select value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} aria-label="Filter by label">
                <option value="">All</option>
                {keywordStore.allIds.map(id => <option key={id} value={id}>{keywordStore.byId[id].name}</option>)}
              </select>
              <ChevronDownIcon className="icon" />
            </label>
            <label className="filter">
              <span>Deadline</span>
              <select value={deadlineFilter} onChange={e => setDeadlineFilter(e.target.value as DeadlineFilter)} aria-label="Filter by deadline">
                <option value="all">Any</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
                <option value="week">Next 7 days</option>
                <option value="none">No deadline</option>
              </select>
              <ChevronDownIcon className="icon" />
            </label>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="btn btn-ghost">
                <XIcon />
                Clear
              </button>
            )}
            <button type="button" onClick={handleOpenCreate} className="btn btn-primary" style={{ paddingLeft: 10 }}>
              <PlusIcon />
              New task
            </button>
          </div>
        </header>

        {hasFilters && (
          <p role="status" className="text-sm px-8 pt-5 -mb-2" style={{ color: 'var(--text-secondary)' }}>
            {totalTasks === 0 ? 'No tasks match your filters.' : `Showing ${totalTasks} matching ${totalTasks === 1 ? 'task' : 'tasks'}.`}
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <main className="board">
            {COLUMN_CONFIG.map((column, index) => (
              <Column
                key={column.status}
                config={column}
                isFiltered={hasFilters}
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
          </main>

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
      </div>

      {deletedTasks.length > 0 && (
        <div className="toast">
          <span role="status" className="truncate">Deleted “{deletedTasks[deletedTasks.length - 1].task.title}”</span>
          <button type="button" onClick={handleUndoDelete} className="underline">Undo</button>
          <button type="button" onClick={() => setDeletedTasks([])} aria-label="Dismiss undo notification" className="inline-flex opacity-70 hover:opacity-100">
            <XIcon />
          </button>
        </div>
      )}

      {/* Task Form (edit mode) - Opens when clicking a task */}
      {selectedTask && (
        <TaskForm
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={handleCloseTaskForm}
          onSave={handleSaveEdit}
          onDelete={handleDeleteClick}
          onStatusChange={handleStatusChange}
          title="Edit task"
        />
      )}

      {/* Task Form (create mode) - Opens when Add Task button is clicked */}
      {isCreating && (
        <TaskForm
          task={null}
          isOpen={isCreating}
          onClose={handleCloseCreate}
          onSave={handleSaveCreate}
          title="New task"
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete task?"
        message={'"' + (selectedTask?.title || '') + '" will be deleted. You can undo this right after.'}
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
