import type { Status } from '../types';

export const COLUMN_CONFIG = [
  {
    status: 'todo' as Status,
    title: 'TODO',
    subtitle: '// waiting to begin',
    accentVar: '--accent-todo',
    icon: '[ ]'
  },
  {
    status: 'inProgress' as Status,
    title: 'IN_PROGRESS',
    subtitle: '// currently working',
    accentVar: '--accent-progress',
    icon: '[~]'
  },
  {
    status: 'finished' as Status,
    title: 'DONE',
    subtitle: '// completed tasks',
    accentVar: '--accent-done',
    icon: '[x]'
  },
] as const;

export type ColumnConfig = typeof COLUMN_CONFIG[number];
