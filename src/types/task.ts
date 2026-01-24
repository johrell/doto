import type { Status } from './status.js';

/**
 * Task interface
 * Represents a single task in the application
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Title of the task */
  title: string;
  /** Detailed description of the task */
  description: string;
  /** External reference (e.g., ticket number, issue URL) */
  externalRef: string | null;
  /** Date when the task was created (ISO 8601 string) */
  dateCreated: string;
  /** Optional deadline for the task (ISO 8601 string) */
  deadline: string | null;
  /** Date when the task was started/moved to in progress (ISO 8601 string, null if not started) */
  dateStarted: string | null;
  /** Date when the task was completed (ISO 8601 string, null if not completed) */
  dateCompleted: string | null;
  /** Current status of the task */
  status: Status;
  /** Array of keyword IDs associated with this task */
  keywords: string[];
  /** Group ID for categorizing the task (optional) */
  groupId: string | null;
}

/**
 * Type for creating a new task (without auto-generated fields)
 */
export type CreateTaskInput = Omit<Task, 'id' | 'dateCreated' | 'dateStarted' | 'dateCompleted'> & {
  dateCreated?: string;
  dateStarted?: string | null;
  dateCompleted?: string | null;
};

/**
 * Type for updating an existing task (all fields optional except id)
 */
export type UpdateTaskInput = Partial<Omit<Task, 'id'>> & { id: string };
