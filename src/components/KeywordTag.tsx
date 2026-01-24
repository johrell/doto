import type { Keyword } from '../types';

/**
 * Props for the KeywordTag component
 */
export interface KeywordTagProps {
  /** The keyword to display */
  keyword: Keyword;
  /** Optional callback when remove button is clicked */
  onRemove?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * KeywordTag - Displays a keyword with its name and color
 *
 * Renders a pill-shaped tag with the keyword's color as background.
 * Optionally shows a remove button when onRemove is provided.
 */
export function KeywordTag({ keyword, onRemove, size = 'md' }: KeywordTagProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wide ${sizeClasses}`}
      style={{
        backgroundColor: keyword.color + '15',
        color: keyword.color,
        border: '1px solid ' + keyword.color + '40',
      }}
    >
      #{keyword.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity duration-150"
          style={{ padding: size === 'sm' ? '1px' : '2px' }}
          aria-label={`Remove ${keyword.name}`}
        >
          [x]
        </button>
      )}
    </span>
  );
}

export default KeywordTag;
