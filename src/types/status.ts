/**
 * Status type for tasks
 * Represents the current state of a task in the workflow
 */
export type Status = 'todo' | 'inProgress' | 'finished';

/**
 * Array of all valid status values
 * Useful for validation and UI rendering
 */
export const STATUS_VALUES: readonly Status[] = ['todo', 'inProgress', 'finished'] as const;

/**
 * Type guard to check if a value is a valid Status
 */
export function isValidStatus(value: unknown): value is Status {
  return typeof value === 'string' && STATUS_VALUES.includes(value as Status);
}
