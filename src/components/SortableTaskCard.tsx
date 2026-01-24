import { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import type { Task, Keyword, Group } from '../types';

interface SortableTaskCardProps {
  task: Task;
  keywords: Keyword[];
  group?: Group;
  index: number;
  onClick?: () => void;
}

export function SortableTaskCard({ task, keywords, group, index, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
    zIndex: isDragging ? 50 : 'auto',
    pointerEvents: isDragging ? 'none' as const : 'auto' as const,
  };

  const handleClick = useCallback((_e: React.MouseEvent) => {
    if (!isDragging && onClick) {
      onClick();
    }
  }, [isDragging, onClick]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={handleClick}>
      <TaskCard task={task} keywords={keywords} group={group} index={index} />
    </div>
  );
}
