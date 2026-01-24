/**
 * Project interface
 * Represents a project that contains multiple tasks
 */
export interface Project {
  /** Unique identifier for the project */
  id: string;
  /** Name of the project */
  name: string;
  /** Array of task IDs that belong to this project */
  taskIds: string[];
}

/**
 * Type for creating a new project (without id, as it will be generated)
 */
export type CreateProjectInput = Omit<Project, 'id' | 'taskIds'> & {
  taskIds?: string[];
};

/**
 * Type for updating an existing project (all fields optional except id)
 */
export type UpdateProjectInput = Partial<Omit<Project, 'id'>> & { id: string };
