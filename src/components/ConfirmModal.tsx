import { useCallback } from 'react';

/**
 * Props for the ConfirmModal component
 */
export interface ConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Modal message/description */
  message: string;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Whether the action is destructive (red confirm button) */
  isDestructive?: boolean;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled or closed */
  onCancel: () => void;
}

/**
 * ConfirmModal - Reusable confirmation dialog
 *
 * Displays a modal with title, message, and confirm/cancel buttons.
 * Supports destructive actions with red styling.
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div
        className="w-full max-w-sm p-6 animate-scale-in"
        style={{
          backgroundColor: 'var(--bg-card)',
          boxShadow: '6px 6px 0 var(--border-secondary)',
          border: '2px solid var(--border-primary)',
        }}
      >
        {/* Terminal-style header bar */}
        <div
          className="flex items-center gap-2 mb-4 pb-3"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5"
            style={{
              backgroundColor: isDestructive ? '#ff4444' : 'var(--accent-todo)',
              color: isDestructive ? '#fff' : '#000',
            }}
          >
            {isDestructive ? 'WARNING' : 'CONFIRM'}
          </span>
        </div>

        <h3
          id="confirm-modal-title"
          className="font-mono text-sm uppercase tracking-wide mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {'// '}{title}
        </h3>
        <p
          id="confirm-modal-message"
          className="font-mono text-xs mb-6 leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {message}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-150"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            [{cancelText}]
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
            style={{
              backgroundColor: isDestructive ? '#ff4444' : 'var(--text-primary)',
              color: isDestructive ? 'white' : 'var(--bg-primary)',
              border: isDestructive ? '1px solid #ff4444' : '1px solid var(--text-primary)',
              boxShadow: isDestructive ? '2px 2px 0 #aa2222' : '2px 2px 0 var(--border-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = isDestructive ? '3px 3px 0 #aa2222' : '3px 3px 0 var(--border-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = isDestructive ? '2px 2px 0 #aa2222' : '2px 2px 0 var(--border-secondary)';
            }}
          >
            [{confirmText}]
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
