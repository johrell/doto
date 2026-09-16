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
  isFiltered?: boolean;
  onTaskClick?: (task: Task) => void;
  onQuickAdd?: (title: string) => void;
  quickAddRef?: React.RefObject<QuickAddInputHandle | null>;
}

export function Column({ config, tasks, keywordMap, groupMap, index, isHighlighted, isFiltered, onTaskClick, onQuickAdd, quickAddRef }: ColumnProps) {
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

  const accent = 'var(' + config.accentVar + ')';

  return (
    <section
      ref={setNodeRef}
      data-column-id={config.status}
      aria-label={config.title}
      className={'column animate-slide-up stagger-' + (index + 1) + (isHighlighted ? ' column-over' : '')}
      style={{
        opacity: 0,
        borderColor: isHighlighted ? accent : undefined,
        boxShadow: isHighlighted ? '0 0 0 3px color-mix(in srgb, ' + accent + ' 25%, transparent)' : undefined,
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between h-7 px-1">
        <div className="flex items-center gap-2">
          <span className="dot" style={{ backgroundColor: accent }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {config.title}
          </h2>
          <span className="count-pill">{tasks.length}</span>
        </div>
      </div>

      {/* Quick add - only for the To do column */}
      {config.status === 'todo' && onQuickAdd && (
        <QuickAddInput ref={quickAddRef} onSubmit={onQuickAdd} />
      )}

      {/* Tasks */}
      <SortableContext
        id={config.status}
        items={taskIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2.5 min-h-[100px]">
          {tasks.length === 0 && (
            <div className="empty-drop">
              {isFiltered ? 'No matching tasks' : 'Drop tasks here'}
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
              type="button"
              onClick={() => setVisibleCount((prev) => prev + COMPLETED_PAGE_SIZE)}
              className="btn btn-ghost w-full"
              style={{ border: '1px dashed var(--border-secondary)', fontSize: 13 }}
            >
              Show {Math.min(COMPLETED_PAGE_SIZE, remainingCount)} more · {remainingCount} hidden
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

// Re-export TaskCard for use in DragOverlay
export { TaskCard };
