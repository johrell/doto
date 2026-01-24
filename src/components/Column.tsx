import { useState } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import { SortableTaskCard } from './SortableTaskCard';
import { QuickAddInput, type QuickAddInputHandle } from './QuickAddInput';
import type { ColumnConfig } from '../config/columns';
import type { Task, Keyword, Group } from '../types';

const COMPLETED_PAGE_SIZE = 10;

interface ColumnProps {
  config: ColumnConfig;
  tasks: Task[];
  keywordMap: Record<string, Keyword>;
  groupMap: Record<string, Group>;
  index: number;
  isHighlighted?: boolean;
  onTaskClick?: (task: Task) => void;
  onQuickAdd?: (title: string) => void;
  quickAddRef?: React.RefObject<QuickAddInputHandle | null>;
}

export function Column({ config, tasks, keywordMap, groupMap, index, isHighlighted, onTaskClick, onQuickAdd, quickAddRef }: ColumnProps) {
  const [visibleCount, setVisibleCount] = useState(COMPLETED_PAGE_SIZE);

  // For the finished column, limit visible tasks
  const isFinishedColumn = config.status === 'finished';
  const visibleTasks = isFinishedColumn ? tasks.slice(0, visibleCount) : tasks;
  const hasMoreTasks = isFinishedColumn && tasks.length > visibleCount;
  const remainingCount = tasks.length - visibleCount;

  const taskIds = visibleTasks.map((t) => t.id);

  // Make the column a drop target
  const { setNodeRef } = useDroppable({
    id: config.status,
  });

  const isOver = isHighlighted;

  return (
    <div
      ref={setNodeRef}
      data-column-id={config.status}
      className={'rounded-lg p-5 min-h-[600px] animate-slide-up stagger-' + (index + 1) + ' transition-all duration-150'}
      style={{
        backgroundColor: isOver ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: isOver ? '2px solid var(' + config.accentVar + ')' : '1px solid var(--border-primary)',
        boxShadow: isOver
          ? '0 0 0 3px var(' + config.accentVar + '), inset 0 0 30px rgba(57, 255, 20, 0.15), 4px 4px 0 var(--border-secondary)'
          : '4px 4px 0 var(--border-secondary)',
        transform: isOver ? 'scale(1.01)' : undefined,
        opacity: 0
      }}
    >
      {/* Column Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-sm font-bold"
              style={{ color: 'var(' + config.accentVar + ')' }}
            >
              {config.icon}
            </span>
            <h2
              className="font-mono font-bold text-sm uppercase tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              {config.title}
            </h2>
          </div>
          <span
            className="px-2 py-0.5 font-mono text-xs"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(' + config.accentVar + ')',
              border: '1px solid var(--border-primary)'
            }}
          >
            {tasks.length}
          </span>
        </div>
        <p
          className="text-xs font-mono ml-10"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {config.subtitle}
        </p>
      </div>

      {/* Divider */}
      <div
        className="mb-4 font-mono text-[10px] tracking-widest overflow-hidden whitespace-nowrap"
        style={{ color: 'var(' + config.accentVar + ')' }}
      >
        {'─'.repeat(50)}
      </div>

      {/* Quick Add Input - only for Todo column */}
      {config.status === 'todo' && onQuickAdd && (
        <QuickAddInput ref={quickAddRef} onSubmit={onQuickAdd} />
      )}

      {/* Tasks */}
      <SortableContext
        id={config.status}
        items={taskIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3 min-h-[100px]">
          {tasks.length === 0 && (
            <div
              className="py-12 text-center rounded-md border-2 border-dashed"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-tertiary)'
              }}
            >
              <p className="text-xs font-mono uppercase tracking-wide">{'// drop tasks here'}</p>
            </div>
          )}
          {visibleTasks.map((task, taskIndex) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              keywords={task.keywords
                .map((id) => keywordMap[id])
                .filter((k): k is Keyword => k !== undefined)}
              group={task.groupId ? groupMap[task.groupId] : undefined}
              index={taskIndex}
              onClick={() => onTaskClick?.(task)}
            />
          ))}
          {hasMoreTasks && (
            <button
              onClick={() => setVisibleCount((prev) => prev + COMPLETED_PAGE_SIZE)}
              className="w-full py-2 font-mono text-xs uppercase tracking-wider transition-all duration-150 hover:opacity-80"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px dashed var(--border-primary)',
              }}
            >
              show more... ({remainingCount} remaining)
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Re-export TaskCard for use in DragOverlay
export { TaskCard };
