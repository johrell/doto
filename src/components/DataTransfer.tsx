import { useRef, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import { useKeywordStore } from '../stores/keywordStore';
import { useGroupStore } from '../stores/groupStore';
import { parseBackup, restoreBackup } from '../utils/backup';
import { DownloadIcon, UploadIcon } from './Icons';
import type { Theme } from '../hooks/useTheme';

/**
 * DataTransfer - Export and import rows for the sidebar
 */
export function DataTransfer({ theme }: { theme: Theme }) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const exportData = () => {
    try {
      const backup = parseBackup(JSON.stringify({
        format: 'doto-backup', version: 1, exportedAt: new Date().toISOString(),
        tasks: useTaskStore.getState(), projects: useProjectStore.getState(),
        keywords: useKeywordStore.getState(), groups: useGroupStore.getState(), theme,
      }));
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `doto-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Backup downloaded. Import it in Doto on your other browser or computer.');
    } catch {
      setMessage('Could not export your data. Please try again.');
    }
  };

  const importData = async (file: File) => {
    setBusy(true);
    setMessage('');
    try {
      const backup = parseBackup(await file.text());
      const confirmed = window.confirm(
        `Import ${backup.projects.allIds.length} projects and ${backup.tasks.allIds.length} tasks?\n\n` +
        'This replaces ALL existing projects, tasks, keywords, groups, and your theme in this browser. Export your current data first if you want to keep it.\n\nThe app will reload after import.'
      );
      if (!confirmed) return;
      restoreBackup(backup);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not read the backup file.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <button type="button" onClick={exportData} disabled={busy} className="side-item">
        <DownloadIcon className="icon" />
        Export backup
      </button>
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="side-item">
        <UploadIcon className="icon" />
        {busy ? 'Reading backup…' : 'Import backup'}
      </button>
      <p role="status" className={message ? 'px-2.5 pt-1 text-xs leading-relaxed' : 'sr-only'}
        style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label="Import Doto backup"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) void importData(file);
        }} />
    </div>
  );
}
