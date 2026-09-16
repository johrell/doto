import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Task, CreateTaskInput, UpdateTaskInput, Status } from '../types/index.js';

/**
 * Normalized state structure for tasks
 */
interface TaskState {
  /** Tasks indexed by ID for O(1) lookup */
  byId: Record<string, Task>;
  /** Ordered array of all task IDs */
  allIds: string[];
  /** Task IDs ordered by status for Kanban board */
  orderByStatus: Record<Status, string[]>;
}

/**
 * Task store actions
 */
interface TaskActions {
  /** Restore a deleted task at its previous position without replacing other tasks. */
  restoreTask: (task: Task, allIndex: number, statusIndex: number) => void;
  /** Add a new task to the store */
  addTask: (input: CreateTaskInput) => Task;
  /** Update an existing task */
  updateTask: (input: UpdateTaskInput) => Task | null;
  /** Delete a task by ID */
  deleteTask: (id: string) => boolean;
  /** Get a task by ID */
  getTaskById: (id: string) => Task | undefined;
  /** Get all tasks as an array */
  getAllTasks: () => Task[];
  /** Move a task to a different status column (handles dateCompleted) */
  moveTask: (taskId: string, newStatus: Status, destinationIndex: number) => Task | null;
  /** Reorder tasks within a status column */
  reorderTasks: (status: Status, taskIds: string[]) => void;
  /** Get ordered task IDs for a status */
  getTaskIdsForStatus: (status: Status) => string[];
  /** Initialize order from existing tasks (migration helper) */
  initializeOrder: () => void;
}

/**
 * Combined task store type
 */
export type TaskStore = TaskState & TaskActions;

/**
 * Generate a unique ID for new tasks
 */
function generateId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Initial state for the task store
 */
const initialState: TaskState = {
  byId: {},
  allIds: [],
  orderByStatus: {
    todo: [],
    inProgress: [],
    finished: [],
  },
};

/**
 * Build order from existing tasks
 * Helper function for migration from old store format
 */
function buildOrderFromTasks(byId: Record<string, Task>, allIds: string[]): Record<Status, string[]> {
  const orderByStatus: Record<Status, string[]> = {
    todo: [],
    inProgress: [],
    finished: [],
  };

  for (const id of allIds) {
    const task = byId[id];
    if (task) {
      orderByStatus[task.status].push(id);
    }
  }

  return orderByStatus;
}

/**
 * Task store with CRUD operations and localStorage persistence
 * Uses normalized data structure for efficient lookups and updates
 * Persists to localStorage key 'doto-tasks'
 */
export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      restoreTask: (task, allIndex, statusIndex) => {
        if (get().byId[task.id]) return;
        set((state) => {
          const allIds = [...state.allIds];
          const statusIds = [...state.orderByStatus[task.status]];
          allIds.splice(Math.max(0, allIndex), 0, task.id);
          statusIds.splice(Math.max(0, statusIndex), 0, task.id);
          return {
            byId: { ...state.byId, [task.id]: task },
            allIds,
            orderByStatus: { ...state.orderByStatus, [task.status]: statusIds },
          };
        });
      },

      addTask: (input: CreateTaskInput): Task => {
        const id = generateId();
        const now = new Date().toISOString();

        // Set dateStarted if task is created directly in inProgress
        const dateStarted = input.dateStarted ?? (input.status === 'inProgress' ? now : null);

        const task: Task = {
          id,
          title: input.title,
          description: input.description,
          externalRef: input.externalRef,
          dateCreated: input.dateCreated ?? now,
          deadline: input.deadline,
          dateStarted,
          dateCompleted: input.dateCompleted ?? null,
          status: input.status,
          keywords: input.keywords,
          groupId: input.groupId ?? null,
        };

        set((state) => ({
          byId: { ...state.byId, [id]: task },
          allIds: [id, ...state.allIds],
          orderByStatus: {
            ...state.orderByStatus,
            [task.status]: [id, ...state.orderByStatus[task.status]],
          },
        }));

        return task;
      },

      updateTask: (input: UpdateTaskInput): Task | null => {
        const { id, ...updates } = input;
        const existingTask = get().byId[id];

        if (!existingTask) {
          return null;
        }

        const updatedTask: Task = {
          ...existingTask,
          ...updates,
        };

        // Handle status change if needed
        const statusChanged = updates.status && updates.status !== existingTask.status;

        set((state) => {
          const newState: Partial<TaskState> = {
            byId: { ...state.byId, [id]: updatedTask },
          };

          if (statusChanged && updates.status) {
            // Remove from old status list, add to new
            const oldStatus = existingTask.status;
            const newStatus = updates.status;
            newState.orderByStatus = {
              ...state.orderByStatus,
              [oldStatus]: state.orderByStatus[oldStatus].filter((tid) => tid !== id),
              [newStatus]: [...state.orderByStatus[newStatus], id],
            };
          }

          return newState as TaskState;
        });

        return updatedTask;
      },

      deleteTask: (id: string): boolean => {
        const task = get().byId[id];

        if (!task) {
          return false;
        }

        set((state) => {
          const { [id]: _removed, ...remainingById } = state.byId;
          return {
            byId: remainingById,
            allIds: state.allIds.filter((taskId) => taskId !== id),
            orderByStatus: {
              ...state.orderByStatus,
              [task.status]: state.orderByStatus[task.status].filter((tid) => tid !== id),
            },
          };
        });

        return true;
      },

      getTaskById: (id: string): Task | undefined => {
        return get().byId[id];
      },

      getAllTasks: (): Task[] => {
        const state = get();
        return state.allIds.map((id) => state.byId[id]);
      },

      moveTask: (taskId: string, newStatus: Status, destinationIndex: number): Task | null => {
        const state = get();
        const task = state.byId[taskId];

        if (!task) {
          return null;
        }

        const oldStatus = task.status;
        const now = new Date().toISOString();

        // Determine dateStarted based on new status
        let dateStarted: string | null = task.dateStarted;
        if (newStatus === 'inProgress' && oldStatus !== 'inProgress') {
          // Moving TO inProgress - set dateStarted
          dateStarted = now;
        } else if (newStatus === 'todo' && oldStatus !== 'todo') {
          // Moving back to todo - clear dateStarted
          dateStarted = null;
        }

        // Determine dateCompleted based on new status
        let dateCompleted: string | null = task.dateCompleted;
        if (newStatus === 'finished' && oldStatus !== 'finished') {
          // Moving TO finished - set dateCompleted
          dateCompleted = now;
        } else if (newStatus !== 'finished' && oldStatus === 'finished') {
          // Moving OUT of finished - clear dateCompleted
          dateCompleted = null;
        }

        const updatedTask: Task = {
          ...task,
          status: newStatus,
          dateStarted,
          dateCompleted,
        };

        set((currentState) => {
          // Remove from old status
          const oldStatusList = currentState.orderByStatus[oldStatus].filter(
            (id) => id !== taskId
          );

          // Add to new status at the specified index
          let newStatusList: string[];
          if (oldStatus === newStatus) {
            // Same column - use the already-filtered list to avoid duplicates
            newStatusList = [...oldStatusList];
          } else {
            // Different column - use the destination column's list
            newStatusList = [...currentState.orderByStatus[newStatus]];
          }
          newStatusList.splice(destinationIndex, 0, taskId);

          return {
            byId: { ...currentState.byId, [taskId]: updatedTask },
            orderByStatus: {
              ...currentState.orderByStatus,
              [oldStatus]: oldStatusList,
              [newStatus]: newStatusList,
            },
          };
        });

        return updatedTask;
      },

      reorderTasks: (status: Status, taskIds: string[]): void => {
        set((state) => ({
          orderByStatus: {
            ...state.orderByStatus,
            [status]: taskIds,
          },
        }));
      },

      getTaskIdsForStatus: (status: Status): string[] => {
        return get().orderByStatus[status];
      },

      initializeOrder: (): void => {
        const state = get();
        const orderByStatus = buildOrderFromTasks(state.byId, state.allIds);
        set({ orderByStatus });
      },
    }),
    {
      name: 'doto-tasks',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        byId: state.byId,
        allIds: state.allIds,
        orderByStatus: state.orderByStatus,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TaskState> | undefined;
        
        // If we have persisted state
        if (persisted && persisted.byId && persisted.allIds) {
          // Check if orderByStatus needs to be initialized
          const hasOrder = persisted.orderByStatus && (
            persisted.orderByStatus.todo.length > 0 ||
            persisted.orderByStatus.inProgress.length > 0 ||
            persisted.orderByStatus.finished.length > 0
          );
          const hasTasks = persisted.allIds.length > 0;

          if (!hasOrder && hasTasks) {
            // Initialize order from tasks
            const orderByStatus = buildOrderFromTasks(persisted.byId, persisted.allIds);
            return {
              ...currentState,
              ...persisted,
              orderByStatus,
            };
          }
        }

        return {
          ...currentState,
          ...persisted,
        };
      },
    }
  )
);
