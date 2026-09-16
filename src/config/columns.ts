import type { Status } from '../types';

export const COLUMN_CONFIG = [
  {
    status: 'todo' as Status,
    title: 'To do',
    accentVar: '--accent-todo',
  },
  {
    status: 'inProgress' as Status,
    title: 'In progress',
    accentVar: '--accent-progress',
  },
  {
    status: 'finished' as Status,
    title: 'Done',
    accentVar: '--accent-done',
  },
] as const;

export type ColumnConfig = typeof COLUMN_CONFIG[number];
