/**
 * Group interface
 * Groups are used to categorize tasks with a single colored label
 */
export interface Group {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Color for visual representation (hex format, e.g., '#ff5733') */
  color: string;
}

/**
 * Type for creating a new group (without id, as it will be generated)
 */
export type CreateGroupInput = Omit<Group, 'id'>;

/**
 * Type for updating an existing group (all fields optional except id)
 */
export type UpdateGroupInput = Partial<Omit<Group, 'id'>> & { id: string };
