import { useState } from "react";
import { CompareButton } from "../comparison/Comparison";
import { keyOf, type Finding, type PublicRecord } from "./contracts";
import type { PublicMission } from "./public";
export type Update = (change: (f: Finding) => Finding) => void;
export function RecordCard({
  record: r,
  definition: p,
  finding: f,
  update,
  busy = false,
}: {
  record: PublicRecord;
  definition: PublicMission;
  finding?: Finding;
  update?: Update;
  busy?: boolean;
}) {
  const [claim, setClaim] = useState(p.mechanic.claims[0].id),
    [role, setRole] = useState<Finding["links"][number]["role"]>("supports");
  const contains = (refs: Finding["evidence"]) =>
    refs.some((ref) => keyOf(ref) === keyOf(r.ref));
  const toggle = (refs: Finding["evidence"]) =>
    contains(refs)
      ? refs.filter((ref) => keyOf(ref) !== keyOf(r.ref))
      : [...refs, r.ref];
  return (
    <article className="record" aria-label={r.title}>
      <div className="record-top">
        <h3>{r.title}</h3>
        <span>
          {r.coverage === "covered"
            ? "Collected within stated capability"
            : r.coverage === "partial"
              ? "Partial collection"
              : "Collection unavailable"}
        </span>
      </div>
      <p>{r.text}</p>
      <p className="muted">
        {r.sourceId.replaceAll("_", " ")} · scope {r.entityIds.join(" / ")} ·
        through step {r.cutoffTick} · delivered {r.deliveredTick} ·{" "}
        {r.eventTick === null
          ? "No event step specified"
          : `event step ${r.eventTick}`}{" "}
        · lineage {r.lineage}
      </p>
      {r.caveats.map((text) => (
        <p className="muted" key={text}>
          {text}
        </p>
      ))}
      <div className="actions">
        <CompareButton reference={r.ref} />
        {f && update ? (
          <>
            <button
              disabled={busy}
              aria-pressed={contains(f.evidence)}
              onClick={() =>
                update((f) => ({ ...f, evidence: toggle(f.evidence) }))
              }
            >
              {contains(f.evidence)
                ? "Remove citation · free"
                : "Cite in finding · free"}
            </button>
            <button
              disabled={busy}
              aria-pressed={contains(f.alternativeEvidence)}
              onClick={() =>
                update((f) => ({
                  ...f,
                  alternativeEvidence: toggle(f.alternativeEvidence),
                }))
              }
            >
              {contains(f.alternativeEvidence)
                ? "Remove alternative evidence · free"
                : "Test another explanation · free"}
            </button>
          </>
        ) : null}
      </div>
      {f && update ? (
        <details>
          <summary>Connect this observation to a claim</summary>
          <label>
            Claim
            <select value={claim} onChange={(e) => setClaim(e.target.value)}>
              {p.mechanic.claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Evidence relationship
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="supports">Supports</option>
              <option value="weakens">Weakens</option>
              <option value="sets_scope">Sets scope</option>
              <option value="limits_confidence">Limits confidence</option>
            </select>
          </label>
          <button
            disabled={busy}
            onClick={() =>
              update((f) => ({
                ...f,
                links: [
                  ...f.links.filter(
                    (l) => keyOf(l.ref) !== keyOf(r.ref) || l.claimId !== claim,
                  ),
                  { ref: r.ref, claimId: claim, role },
                ],
              }))
            }
          >
            Attach observation to selected claim · free
          </button>
          {f.links
            .filter((l) => keyOf(l.ref) === keyOf(r.ref))
            .map((l) => (
              <p key={l.claimId}>
                {p.mechanic.claims.find((c) => c.id === l.claimId)?.label}:{" "}
                {l.role.replaceAll("_", " ")}{" "}
                <button
                  disabled={busy}
                  onClick={() =>
                    update((f) => ({
                      ...f,
                      links: f.links.filter((x) => x !== l),
                    }))
                  }
                >
                  Remove relationship · free
                </button>
              </p>
            ))}
        </details>
      ) : null}
    </article>
  );
}
export function Records({
  records,
  page: controlledPage,
  onPageChange,
  ...props
}: {
  records: PublicRecord[];
  page?: number;
  onPageChange?: (page: number) => void;
  definition: PublicMission;
  finding?: Finding;
  update?: Update;
  busy?: boolean;
}) {
  const [ownPage, setOwnPage] = useState(0),
    requested = controlledPage ?? ownPage,
    setPage = onPageChange ?? setOwnPage,
    last = Math.max(0, Math.ceil(records.length / 20) - 1),
    page = Math.min(requested, last);
  return (
    <>
      {records.length > 20 ? (
        <nav aria-label="Acquired observation pages">
          <p>
            Page {page + 1} of {last + 1} · 20 observations per page
          </p>
          <button disabled={!page} onClick={() => setPage(0)}>
            First observations
          </button>
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Previous observations
          </button>
          <button disabled={page === last} onClick={() => setPage(page + 1)}>
            Next observations
          </button>
          <button disabled={page === last} onClick={() => setPage(last)}>
            Latest observations
          </button>
        </nav>
      ) : null}
      {records.slice(page * 20, page * 20 + 20).map((r) => (
        <RecordCard key={keyOf(r.ref)} record={r} {...props} />
      ))}
    </>
  );
}
