import type { Task, Project, Keyword, Group, Status } from '../types';

type Collection<T> = { byId: Record<string, T>; allIds: string[] };
export interface Backup {
  format: 'doto-backup';
  version: 1;
  exportedAt: string;
  tasks: Collection<Task> & { orderByStatus: Record<Status, string[]> };
  projects: Collection<Project> & { currentProjectId: string | null };
  keywords: Collection<Keyword>;
  groups: Collection<Group>;
  theme: 'light' | 'dark';
}

function check(condition: unknown): asserts condition {
  if (!condition) throw new Error('This file is not a valid Doto backup.');
}
function record(value: unknown): asserts value is Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value));
}
function strings(value: unknown): asserts value is string[] {
  check(Array.isArray(value) && value.every(id => typeof id === 'string'));
}
function collection(value: unknown) {
  record(value);
  record(value.byId);
  strings(value.allIds);
  check(new Set(value.allIds).size === value.allIds.length);
  check(Object.keys(value.byId).length === value.allIds.length);
  for (const id of value.allIds) {
    check(id.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(id));
    check(Object.prototype.hasOwnProperty.call(value.byId, id));
    const item = value.byId[id];
    record(item);
    check(item.id === id);
  }
}
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Validate the entire file before touching any browser data. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Choose a valid Doto JSON backup file.'); }
  record(data);
  check(data.format === 'doto-backup');
  if (data.version !== 1) throw new Error('This backup version is not supported.');
  check(date(data.exportedAt));
  check(data.theme === 'light' || data.theme === 'dark');
  for (const key of ['tasks', 'projects', 'keywords', 'groups']) collection(data[key]);
  // The collection checks above establish the shape; validate every entity below.
  const backup = data as unknown as Backup;
  for (const item of [...Object.values(backup.keywords.byId), ...Object.values(backup.groups.byId)]) {
    check(typeof item.name === 'string' && typeof item.color === 'string');
  }
  for (const task of Object.values(backup.tasks.byId)) {
    check(typeof task.title === 'string' && typeof task.description === 'string');
    check(nullableString(task.externalRef) && nullableString(task.groupId));
    check(date(task.dateCreated));
    for (const value of [task.deadline, task.dateStarted, task.dateCompleted]) check(value === null || date(value));
    check(['todo', 'inProgress', 'finished'].includes(task.status));
    strings(task.keywords);
    // Deleted labels can leave references behind in existing workspaces.
  }
  record(backup.tasks.orderByStatus);
  const ordered: string[] = [];
  for (const status of ['todo', 'inProgress', 'finished'] as const) {
    const ids = backup.tasks.orderByStatus[status];
    strings(ids);
    for (const id of ids) check(Object.prototype.hasOwnProperty.call(backup.tasks.byId, id) && backup.tasks.byId[id].status === status);
    ordered.push(...ids);
  }
  check(new Set(ordered).size === ordered.length && ordered.length === backup.tasks.allIds.length);
  for (const project of Object.values(backup.projects.byId)) {
    check(typeof project.name === 'string');
    strings(project.taskIds);
    check(new Set(project.taskIds).size === project.taskIds.length);
    for (const id of project.taskIds) check(Object.prototype.hasOwnProperty.call(backup.tasks.byId, id));
  }
  check(backup.projects.currentProjectId === null ||
    (typeof backup.projects.currentProjectId === 'string' && Object.prototype.hasOwnProperty.call(backup.projects.byId, backup.projects.currentProjectId)));
  // Pick only persisted fields so unexpected properties cannot replace store actions.
  const pick = <T>(value: Collection<T>): Collection<T> => ({ byId: value.byId, allIds: value.allIds });
  return {
    format: 'doto-backup', version: 1, exportedAt: backup.exportedAt,
    tasks: { ...pick(backup.tasks), orderByStatus: backup.tasks.orderByStatus },
    projects: { ...pick(backup.projects), currentProjectId: backup.projects.currentProjectId },
    keywords: pick(backup.keywords), groups: pick(backup.groups), theme: backup.theme,
  };
}

/** Restore all keys together, rolling back if storage is full or unavailable. Reload after success. */
export function restoreBackup(backup: Backup, storage: Storage = localStorage): void {
  const validated = parseBackup(JSON.stringify(backup));
  const entries = (['tasks', 'projects', 'keywords', 'groups'] as const).map(key => [
    `doto-${key}`, JSON.stringify({ state: validated[key], version: 0 }),
  ]);
  entries.push(['doto-theme', validated.theme]);
  const previous = entries.map(([key]) => [key, storage.getItem(key)] as const);
  const written: string[] = [];
  try {
    for (const [key, value] of entries) {
      storage.setItem(key, value);
      written.push(key);
    }
  } catch {
    for (const [key, value] of previous) {
      if (!written.includes(key)) continue;
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    throw new Error('Could not import the backup. Your existing data was kept. Check available browser storage and try again.');
  }
}
