import { useState } from "react";
import { caseOrder, type CaseId } from "../journey/contracts";
import { readStoredRow } from "../persistence/rawRecovery";
export function RawRecovery() {
  const [mission, setMission] = useState<CaseId | "free">("M01"),
    [kind, setKind] = useState("active"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function download() {
    setBusy(true);
    setMessage("");
    const m01 = mission === "M01",
      p1 = mission === "M04" || mission === "M07",
      database = m01
        ? "threat-hunter-v1"
        : p1
          ? "threat-hunter-campaign-v1"
          : "threat-hunter-expansion-v1",
      store = m01 ? "runs" : "rows",
      key = m01
        ? kind === "active"
          ? "active"
          : "recovery-original"
        : `${kind === "active" ? "active" : "original"}:${mission}`;
    try {
      const row = await readStoredRow(database, store, key);
      if (!row) {
        setMessage(
          "No stored row was found for that selection. No database or save was created.",
        );
        return;
      }
      const text = JSON.stringify({
          kind: "threat-hunter-raw-row-recovery",
          schemaVersion: 1,
          database,
          store,
          key,
          row,
        }),
        url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        ),
        link = document.createElement("a");
      link.href = url;
      link.download = `threat-hunter-${mission}-raw-recovery.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "The exact selected stored row was exported without validation or modification. This recovery file is not a portable game import.",
      );
    } catch {
      setMessage(
        "The selected stored row could not be read. Its data has not been replaced. Retry or reload.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" aria-label="Emergency stored-data export">
      <h2>Export stored recovery data</h2>
      <p>
        This emergency path reads an existing stored row without loading the
        failed game interface, validating history or rewriting a save. It
        includes the selected row’s previous backup when present. In-memory
        edits that were never committed are not recovered by this export.
      </p>
      <label>
        Investigation
        <select
          value={mission}
          onChange={(e) => setMission(e.target.value as typeof mission)}
        >
          {caseOrder.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
          <option value="free">Seeded free hunt</option>
        </select>
      </label>
      <label>
        Stored record
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="active">Active save and its previous backup</option>
          <option value="original">Preserved recovery original</option>
        </select>
      </label>
      <button disabled={busy} onClick={() => void download()}>
        {busy ? "Reading the selected stored row…" : "Export raw stored row"}
      </button>
      {message ? <p role="status">{message}</p> : null}
      <p>
        Completed archives remain stored separately. This raw inspection file is
        distinct from normal portable save imports.
      </p>
    </section>
  );
}
