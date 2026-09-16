import type { Keyword } from '../types';
import { XIcon } from './Icons';

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
 * KeywordTag - Displays a keyword as a tinted chip in its color
 *
 * Optionally shows a remove button when onRemove is provided.
 */
export function KeywordTag({ keyword, onRemove, size = 'md' }: KeywordTagProps) {
  return (
    <span
      className={'chip' + (size === 'md' ? ' chip-md' : '')}
      style={{
        color: keyword.color,
        backgroundColor: 'color-mix(in srgb, ' + keyword.color + ' calc(var(--tint-alpha) * 100%), transparent)',
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
          aria-label={`Remove ${keyword.name}`}
        >
          <XIcon size={12} />
        </button>
      )}
    </span>
  );
}

export default KeywordTag;
