import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types/index.js';

/**
 * Default project name for first-time users
 */
const DEFAULT_PROJECT_NAME = 'My Project';

/**
 * Normalized state structure for projects
 */
interface ProjectState {
  /** Projects indexed by ID for O(1) lookup */
  byId: Record<string, Project>;
  /** Ordered array of all project IDs */
  allIds: string[];
  /** Currently selected project ID */
  currentProjectId: string | null;
}

/**
 * Project store actions
 */
interface ProjectActions {
  /** Add a new project to the store */
  addProject: (input: CreateProjectInput) => Project;
  /** Update an existing project */
  updateProject: (input: UpdateProjectInput) => Project | null;
  /** Delete a project by ID */
  deleteProject: (id: string) => boolean;
  /** Delete a project and return its task IDs for cascading deletion */
  deleteProjectWithTasks: (id: string) => string[];
  /** Get a project by ID */
  getProjectById: (id: string) => Project | undefined;
  /** Get all projects as an array */
  getAllProjects: () => Project[];
  /** Get the current project */
  getCurrentProject: () => Project | undefined;
  /** Set the current project ID */
  setCurrentProject: (id: string) => void;
  /** Add a task ID to a project */
  addTaskToProject: (projectId: string, taskId: string) => boolean;
  /** Remove a task ID from a project */
  removeTaskFromProject: (projectId: string, taskId: string) => boolean;
  /** Ensure a default project exists (called on app initialization) */
  ensureDefaultProject: () => Project;
}

/**
 * Combined project store type
 */
export type ProjectStore = ProjectState & ProjectActions;

/**
 * Generate a unique ID for new projects
 */
function generateId(): string {
  return 'project_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Initial state for the project store
 */
const initialState: ProjectState = {
  byId: {},
  allIds: [],
  currentProjectId: null,
};

/**
 * Project store with CRUD operations and localStorage persistence
 * Uses normalized data structure for efficient lookups and updates
 * Persists to localStorage key 'doto-projects'
 */
export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addProject: (input: CreateProjectInput): Project => {
        const id = generateId();
        
        const project: Project = {
          id,
          name: input.name,
          taskIds: input.taskIds ?? [],
        };

        set((state) => ({
          byId: { ...state.byId, [id]: project },
          allIds: [...state.allIds, id],
        }));

        return project;
      },

      updateProject: (input: UpdateProjectInput): Project | null => {
        const { id, ...updates } = input;
        const existingProject = get().byId[id];

        if (!existingProject) {
          return null;
        }

        const updatedProject: Project = {
          ...existingProject,
          ...updates,
        };

        set((state) => ({
          byId: { ...state.byId, [id]: updatedProject },
        }));

        return updatedProject;
      },

      deleteProject: (id: string): boolean => {
        const exists = id in get().byId;

        if (!exists) {
          return false;
        }

        set((state) => {
          const { [id]: _removed, ...remainingById } = state.byId;
          const newAllIds = state.allIds.filter((projectId) => projectId !== id);
          
          // If deleting current project, switch to first available or null
          let newCurrentProjectId = state.currentProjectId;
          if (state.currentProjectId === id) {
            newCurrentProjectId = newAllIds.length > 0 ? newAllIds[0] : null;
          }

          return {
            byId: remainingById,
            allIds: newAllIds,
            currentProjectId: newCurrentProjectId,
          };
        });

        return true;
      },

      deleteProjectWithTasks: (id: string): string[] => {
        const project = get().byId[id];

        if (!project) {
          return [];
        }

        // Get task IDs before deleting
        const taskIds = [...project.taskIds];

        // Delete the project
        get().deleteProject(id);

        // Return task IDs for caller to delete from taskStore
        return taskIds;
      },

      getProjectById: (id: string): Project | undefined => {
        return get().byId[id];
      },

      getAllProjects: (): Project[] => {
        const state = get();
        return state.allIds.map((id) => state.byId[id]);
      },

      getCurrentProject: (): Project | undefined => {
        const state = get();
        if (!state.currentProjectId) return undefined;
        return state.byId[state.currentProjectId];
      },

      setCurrentProject: (id: string): void => {
        const exists = id in get().byId;
        if (exists) {
          set({ currentProjectId: id });
        }
      },

      addTaskToProject: (projectId: string, taskId: string): boolean => {
        const project = get().byId[projectId];

        if (!project) {
          return false;
        }

        if (project.taskIds.includes(taskId)) {
          return true; // Task already in project
        }

        set((state) => ({
          byId: {
            ...state.byId,
            [projectId]: {
              ...project,
              taskIds: [...project.taskIds, taskId],
            },
          },
        }));

        return true;
      },

      removeTaskFromProject: (projectId: string, taskId: string): boolean => {
        const project = get().byId[projectId];

        if (!project) {
          return false;
        }

        set((state) => ({
          byId: {
            ...state.byId,
            [projectId]: {
              ...project,
              taskIds: project.taskIds.filter((tid) => tid !== taskId),
            },
          },
        }));

        return true;
      },

      ensureDefaultProject: (): Project => {
        const state = get();
        
        // If projects already exist, return current or first project
        if (state.allIds.length > 0) {
          if (state.currentProjectId && state.byId[state.currentProjectId]) {
            return state.byId[state.currentProjectId];
          }
          // Set current to first project if not set
          const firstProjectId = state.allIds[0];
          set({ currentProjectId: firstProjectId });
          return state.byId[firstProjectId];
        }

        // Create default project
        const defaultProject = get().addProject({ name: DEFAULT_PROJECT_NAME });
        set({ currentProjectId: defaultProject.id });
        return defaultProject;
      },
    }),
    {
      name: 'doto-projects',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        byId: state.byId,
        allIds: state.allIds,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);
