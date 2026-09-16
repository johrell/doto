import type { Task, Keyword } from '../types';

export type DeadlineFilter = 'all' | 'overdue' | 'today' | 'week' | 'none';

export function matchesTaskFilters(task: Task, query: string, keywordId: string, deadline: DeadlineFilter, keywords: Record<string, Keyword>, now = new Date()): boolean {
  const text = [task.title, task.description, task.externalRef ?? '', ...task.keywords.map(id => keywords[id]?.name ?? '')].join(' ').toLowerCase();
  if (!query.toLowerCase().trim().split(/\s+/).every(word => text.includes(word))) return false;
  if (keywordId && !task.keywords.includes(keywordId)) return false;
  if (deadline === 'all') return true;
  if (deadline === 'none') return !task.deadline;
  if (!task.deadline || task.status === 'finished') return false;
  const due = new Date(task.deadline);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  if (deadline === 'overdue') return due < today;
  return due >= today && due < (deadline === 'today' ? tomorrow : nextWeek);
}
