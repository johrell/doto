import type { Task, Keyword, Group } from '../types';

function getDaysInProgress(dateStarted: string, endDate?: string): number {
  const start = new Date(dateStarted);
  const end = endDate ? new Date(endDate) : new Date();

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysInProgressLabel(days: number, forCompleted = false): string {
  if (days === 0) return forCompleted ? '< 1 day' : 'started today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

type DeadlineStatus = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal';

function getDeadlineStatus(deadline: string): DeadlineStatus {
  const now = new Date();
  const deadlineDate = new Date(deadline);

  // Reset time to compare dates only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());

  const diffTime = deadlineDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 2) return 'soon';
  return 'normal';
}

function getDeadlineLabel(deadline: string, status: DeadlineStatus): string {
  if (status === 'today') return 'due today';
  if (status === 'tomorrow') return 'due tomorrow';

  if (status === 'overdue') {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
    const diffDays = Math.round((today.getTime() - deadlineDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'yesterday';
    if (diffDays <= 6) return `${diffDays} days ago`;
  }

  return formatDate(deadline);
}

export interface TaskCardProps {
  task: Task;
  keywords: Keyword[];
  group?: Group;
  isDragging?: boolean;
  index?: number;
  onClick?: () => void;
}

export function TaskCard({ task, keywords, group, isDragging, index = 0, onClick }: TaskCardProps) {
  return (
    <div
      data-task-card
      className={'rounded-md cursor-grab active:cursor-grabbing card-hover animate-slide-up overflow-hidden' + (onClick ? ' cursor-pointer' : '')}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        boxShadow: isDragging ? 'var(--shadow-lg), 0 0 20px rgba(57, 255, 20, 0.2)' : '2px 2px 0 var(--border-secondary)',
        transform: isDragging ? 'rotate(2deg) scale(1.02)' : undefined,
        animationDelay: (index * 0.03) + 's',
        opacity: 0
      }}
      onClick={onClick}
    >
      <div className="flex">
        {/* Group color bar */}
        {group && (
          <div
            className="w-1 flex-shrink-0"
            style={{ backgroundColor: group.color }}
          />
        )}
        <div className="flex-1 p-4">
          <h3
            className="font-mono font-medium text-sm leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {task.title}
          </h3>

          {group && (
            <p
              className="text-xs font-mono mt-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {'// '}{group.name}
            </p>
          )}

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {keywords.map((keyword) => (
                <span
                  key={keyword.id}
                  className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
                  style={{
                    backgroundColor: keyword.color + '15',
                    color: keyword.color,
                    border: '1px solid ' + keyword.color + '40'
                  }}
                >
                  #{keyword.name}
                </span>
              ))}
            </div>
          )}

          {/* In Progress: show days in progress and deadline on same row */}
          {task.status === 'inProgress' && (task.dateStarted || task.deadline) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {task.dateStarted && (
                <div
                  className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded w-fit"
                  style={{
                    backgroundColor: 'rgba(45, 156, 219, 0.15)',
                    color: '#2d9cdb',
                    border: '1px solid rgba(45, 156, 219, 0.3)'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12" />
                  </svg>
                  {getDaysInProgressLabel(getDaysInProgress(task.dateStarted))}
                </div>
              )}
              {task.deadline && (() => {
                const status = getDeadlineStatus(task.deadline);
                const label = getDeadlineLabel(task.deadline, status);
                const isOverdue = status === 'overdue';
                const isSoon = status === 'soon' || status === 'today' || status === 'tomorrow';

                return (
                  <div
                    className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded w-fit"
                    style={{
                      backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : isSoon ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                      color: isOverdue ? '#ef4444' : isSoon ? '#ca8a04' : 'var(--text-tertiary)',
                      border: isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : isSoon ? '1px solid rgba(234, 179, 8, 0.3)' : 'none'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {label}
                  </div>
                );
              })()}
            </div>
          )}

          {task.dateCompleted ? (
            <div
              className="flex items-center gap-1.5 mt-3 text-xs font-mono px-2 py-1 rounded w-fit"
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {formatDate(task.dateCompleted)}
              {task.dateStarted && (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {' · '}{getDaysInProgressLabel(getDaysInProgress(task.dateStarted, task.dateCompleted), true)}
                </span>
              )}
            </div>
          ) : task.status !== 'inProgress' && task.deadline && (() => {
            const status = getDeadlineStatus(task.deadline);
            const label = getDeadlineLabel(task.deadline, status);
            const isOverdue = status === 'overdue';
            const isSoon = status === 'soon' || status === 'today' || status === 'tomorrow';

            return (
              <div
                className="flex items-center gap-1.5 mt-3 text-xs font-mono px-2 py-1 rounded w-fit"
                style={{
                  backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.15)' : isSoon ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
                  color: isOverdue ? '#ef4444' : isSoon ? '#ca8a04' : 'var(--text-tertiary)',
                  border: isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : isSoon ? '1px solid rgba(234, 179, 8, 0.3)' : 'none'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {label}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
