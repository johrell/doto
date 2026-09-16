import type { Task, Keyword, Group } from '../types';
import { AlertIcon, CheckIcon, ClockIcon, PlayIcon } from './Icons';

function getDaysInProgress(dateStarted: string, endDate?: string): number {
  const start = new Date(dateStarted);
  const end = endDate ? new Date(endDate) : new Date();

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysInProgressLabel(days: number, forCompleted = false): string {
  if (days === 0) return forCompleted ? '< 1 day' : 'Started today';
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
  if (status === 'today') return 'Due today';
  if (status === 'tomorrow') return 'Due tomorrow';

  if (status === 'overdue') {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
    const diffDays = Math.round((today.getTime() - deadlineDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 6) return `${diffDays} days ago`;
  }

  return formatDate(deadline);
}

function DeadlineChip({ deadline }: { deadline: string }) {
  const status = getDeadlineStatus(deadline);
  const label = getDeadlineLabel(deadline, status);
  const isOverdue = status === 'overdue';
  const isSoon = status === 'soon' || status === 'today' || status === 'tomorrow';
  const className = 'meta' + (isOverdue ? ' meta-overdue' : isSoon ? ' meta-soon' : '');

  return (
    <span className={className}>
      {isOverdue ? <AlertIcon /> : <ClockIcon />}
      {label}
    </span>
  );
}

export interface TaskCardProps {
  task: Task;
  keywords: Keyword[];
  group?: Group;
  isDragging?: boolean;
  index?: number;
  onClick?: () => void;
}

export function TaskCard({ task, keywords, group, isDragging, onClick }: TaskCardProps) {
  const isDone = task.status === 'finished';
  const showStarted = task.status === 'inProgress' && task.dateStarted;
  const showDeadline = task.deadline && !task.dateCompleted;
  const hasMeta = showStarted || showDeadline || task.dateCompleted;

  return (
    <div
      data-task-card
      className={'card' + (isDone ? ' card-done' : '') + (isDragging ? ' card-dragging' : '')}
      onClick={onClick}
    >
      {group && (
        <div className="card-eyebrow">
          <span className="swatch" style={{ backgroundColor: group.color }} />
          <span>{group.name}</span>
        </div>
      )}

      <h3 className="card-title">{task.title}</h3>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <span
              key={keyword.id}
              className="chip"
              style={{
                color: keyword.color,
                backgroundColor: 'color-mix(in srgb, ' + keyword.color + ' calc(var(--tint-alpha) * 100%), transparent)',
              }}
            >
              #{keyword.name}
            </span>
          ))}
        </div>
      )}

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {showStarted && task.dateStarted && (
            <span className="meta meta-progress">
              <PlayIcon />
              {getDaysInProgressLabel(getDaysInProgress(task.dateStarted))}
            </span>
          )}
          {showDeadline && task.deadline && <DeadlineChip deadline={task.deadline} />}
          {task.dateCompleted && (
            <span className="meta meta-done">
              <CheckIcon />
              {formatDate(task.dateCompleted)}
              {task.dateStarted && (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {' · '}{getDaysInProgressLabel(getDaysInProgress(task.dateStarted, task.dateCompleted), true)}
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
