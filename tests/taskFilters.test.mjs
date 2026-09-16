import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/utils/taskFilters.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { matchesTaskFilters: matches } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const task = { title: 'Ship dashboard', description: 'Fix layout', externalRef: 'ISSUE-42', keywords: ['k'], status: 'todo', deadline: null };
const keywords = { k: { name: 'Urgent' } };
const now = new Date(2026, 8, 16, 12);
const check = (overrides, query = '', label = '', deadline = 'all') => matches({ ...task, ...overrides }, query, label, deadline, keywords, now);
test('search combines words across task fields and labels, case insensitively', () => {
  assert.equal(check({}, ' SHIP urgent issue-42 layout '), true);
  assert.equal(check({}, 'missing'), false);
  assert.equal(check({}, 'ship', 'other'), false);
  assert.equal(check({}, 'ship', 'k'), true);
  assert.equal(check({ keywords: ['deleted-label'] }, 'ship'), true);
});
test('deadline filters use calendar days and exclude completed tasks from due work', () => {
  const date = day => new Date(2026, 8, day).toISOString();
  assert.equal(check({ deadline: date(15) }, '', '', 'overdue'), true);
  assert.equal(check({ deadline: date(16) }, '', '', 'overdue'), false);
  assert.equal(check({ deadline: date(16) }, '', '', 'today'), true);
  assert.equal(check({ deadline: date(17) }, '', '', 'today'), false);
  assert.equal(check({ deadline: date(22) }, '', '', 'week'), true);
  assert.equal(check({ deadline: date(23) }, '', '', 'week'), false);
  assert.equal(check({ deadline: date(15), status: 'finished' }, '', '', 'overdue'), false);
  assert.equal(check({}, '', '', 'none'), true);
  assert.equal(check({}, '', '', 'today'), false);
});
