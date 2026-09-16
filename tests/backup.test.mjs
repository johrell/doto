import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/utils/backup.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { parseBackup, restoreBackup } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const collection = items => ({ byId: Object.fromEntries(items.map(item => [item.id, item])), allIds: items.map(item => item.id) });
const fixture = () => ({
  format: 'doto-backup', version: 1, exportedAt: '2026-09-16T12:00:00Z', theme: 'dark',
  tasks: { ...collection(['a', 'b'].map(id => ({
    id, title: `Task ${id}`, description: 'Details åäö', externalRef: null,
    dateCreated: '2026-09-16T12:00:00Z', deadline: null, dateStarted: null,
    dateCompleted: null, status: 'todo', keywords: ['k'], groupId: 'g',
  }))), orderByStatus: { todo: ['b', 'a'], inProgress: [], finished: [] } },
  projects: { ...collection([{ id: 'p', name: 'Work', taskIds: ['a', 'b'] }, { id: 'q', name: 'Other', taskIds: [] }]), currentProjectId: 'q' },
  keywords: collection([{ id: 'k', name: 'Urgent', color: '#ff0000' }]),
  groups: collection([{ id: 'g', name: 'Team', color: '#ffffff' }]),
});
class MemoryStorage {
  data = new Map([['unrelated', 'keep']]);
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}
test('round trip preserves all projects, task details, ordering, labels and theme', () => {
  const original = fixture();
  const parsed = parseBackup(JSON.stringify(original));
  assert.deepEqual(parsed, original);
  const storage = new MemoryStorage();
  restoreBackup(parsed, storage);
  for (const key of ['tasks', 'projects', 'keywords', 'groups']) {
    assert.deepEqual(JSON.parse(storage.getItem(`doto-${key}`)), { state: original[key], version: 0 });
  }
  assert.equal(storage.getItem('doto-theme'), 'dark');
  assert.equal(storage.getItem('unrelated'), 'keep');
});
test('rejects malformed, unsupported, and structurally inconsistent files', () => {
  assert.throws(() => parseBackup('not json'));
  for (const mutate of [
    b => { b.version = 2; }, b => { b.tasks.byId.a.title = 42; },
    b => { b.tasks.allIds.push('a'); }, b => { b.tasks.orderByStatus.todo = ['a', 'a']; },
    b => { b.tasks.orderByStatus.todo = ['a']; }, b => { b.tasks.byId.a.status = 'unknown'; },
    b => { b.projects.byId.p.taskIds.push('missing'); }, b => { b.projects.currentProjectId = 'missing'; },
    b => { b.tasks.byId.a.deadline = 'bad date'; }, b => { b.groups.byId.g = null; },
  ]) {
    const backup = fixture(); mutate(backup);
    assert.throws(() => parseBackup(JSON.stringify(backup)));
  }
});
test('supports empty backups and references to previously deleted labels', () => {
  const backup = fixture();
  backup.keywords = collection([]); backup.groups = collection([]);
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  backup.tasks = { ...collection([]), orderByStatus: { todo: [], inProgress: [], finished: [] } };
  backup.projects = { ...collection([]), currentProjectId: null };
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
});
test('ignores injected store actions', () => {
  const backup = fixture(); backup.tasks.addTask = 'malicious';
  assert.equal(parseBackup(JSON.stringify(backup)).tasks.addTask, undefined);
});
test('invalid import leaves storage untouched', () => {
  const storage = new MemoryStorage(); const before = new Map(storage.data);
  assert.throws(() => restoreBackup({}, storage));
  assert.deepEqual(storage.data, before);
});
test('storage failure rolls back both overwritten and newly created keys', () => {
  for (const existing of [false, true]) {
    const storage = new MemoryStorage();
    if (existing) storage.setItem('doto-tasks', 'original');
    const before = new Map(storage.data);
    let calls = 0;
    storage.setItem = function (key, value) {
      if (++calls === 3) throw new Error('QuotaExceededError');
      this.data.set(key, value);
    };
    assert.throws(() => restoreBackup(fixture(), storage), /existing data was kept/);
    assert.deepEqual(storage.data, before);
  }
});
