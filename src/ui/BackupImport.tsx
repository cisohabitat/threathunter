import { useState } from "react";
export function BackupImport({
  disabled,
  replace,
  backups,
  download,
}: {
  disabled: boolean;
  replace: (text: string) => Promise<void>;
  backups: string[];
  download: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="backup-import">
      <summary>Import another backup</summary>
      <p>
        Replace this active investigation with a validated backup for this slot.
        The exact existing saved row is retained separately; a completed finding
        remains archived. Save unfinished notes first.
      </p>
      <label>
        <input
          type="checkbox"
          checked={confirm}
          disabled={disabled}
          onChange={(e) => setConfirm(e.target.checked)}
        />
        I want to replace this active investigation and preserve its saved
        backup.
      </label>
      {confirm ? (
        <label>
          Choose replacement save
          <input
            type="file"
            accept="application/json,.json"
            disabled={disabled}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setError("Save exceeds 2 MiB. Stored data has not changed.");
                return;
              }
              setError("");
              await replace(await file.text());
              setConfirm(false);
            }}
          />
        </label>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {backups.length ? (
        <details>
          <summary>Preserved replacement backups ({backups.length})</summary>
          {backups.map((id, i) => (
            <button key={id} onClick={() => void download(id)}>
              Export preserved backup {i + 1}
            </button>
          ))}
        </details>
      ) : null}
    </details>
  );
}
