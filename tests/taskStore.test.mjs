import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
let compiled = ts.transpileModule(readFileSync(new URL('../src/stores/taskStore.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
for (const module of ['zustand', 'zustand/middleware']) compiled = compiled.replaceAll(`'${module}'`, JSON.stringify(import.meta.resolve(module)));
const { useTaskStore } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('undo restores full task and ordering without losing intervening edits or duplicating tasks', () => {
  const store = useTaskStore.getState();
  const input = { title: 'First', description: 'Details', status: 'todo', keywords: ['k'], groupId: 'g', externalRef: 'REF-1', deadline: '2026-09-16T00:00:00Z' };
  const first = store.addTask(input);
  const second = store.addTask({ ...input, title: 'Second' });
  assert.deepEqual(useTaskStore.getState().orderByStatus.todo, [second.id, first.id]);
  store.deleteTask(first.id);
  store.updateTask({ id: second.id, title: 'Edited' });
  store.restoreTask(first, 1, 1);
  store.restoreTask(first, 1, 1);
  assert.deepEqual(store.getTaskById(first.id), first);
  assert.equal(store.getTaskById(second.id).title, 'Edited');
  assert.deepEqual(useTaskStore.getState().allIds, [second.id, first.id]);
  assert.deepEqual(useTaskStore.getState().orderByStatus.todo, [second.id, first.id]);
});
