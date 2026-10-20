import { useMemo, useState } from "react";
import { latestViews } from "./observations";
import type { Finding, PublicRecord } from "./contracts";
import type { View } from "./contracts";
import type { PublicMission } from "./public";
import type { Update } from "./Records";
import { keyOf } from "./contracts";
const titles = {
  triage: "Your investigation queue",
  context: "Task and behaviour context",
  attribution: "Credential, session and person",
  path: "Follow the documented management path",
  boundary: "Application, identity and workload boundaries",
  grant: "Emergency authority has a boundary",
  intent: "Observation and intent are different claims",
  causal: "Separate the explanations before joining them",
  capstone: "A prioritised, bounded handoff",
};
export function Mechanic({
  view: v,
  definition: p,
  update,
  scope,
  busy,
}: {
  view: View;
  definition: PublicMission;
  update: Update;
  scope: (target: string) => void;
  busy: boolean;
}) {
  const kind = p.mechanic.kind,
    known = v.entityIds.map((id) => p.entities.find((e) => e.id === id)!),
    baseline = latestViews(v.records, ["scope_catalogue"]),
    activity = latestViews(v.records, ["session_audit", "service_journal"]),
    work = latestViews(v.records, ["work_register", "directory_callback"]);
  const recordIndex = useMemo(
    () => new Map(v.records.map((r) => [keyOf(r.ref), r])),
    [v.records],
  );
  const ordered = [
    ...v.finding.priorities,
    ...known
      .map((e) => e.id)
      .filter((id) => !v.finding.priorities.includes(id)),
  ];
  function move(id: string, delta: number) {
    const order = [...ordered],
      i = order.indexOf(id),
      j = i + delta;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    update((f) => ({ ...f, priorities: order }));
  }
  return (
    <section
      className={`panel mechanic mechanic-${kind}`}
      aria-label={`${p.missionId} investigation workspace`}
    >
      <p className="eyebrow">{p.trigger} · your investigative choices</p>
      <h2>{titles[kind]}</h2>
      <p>{p.mechanic.question}</p>
      {kind === "triage" || kind === "capstone" ? (
        <>
          <p>
            Order the known scopes by what deserves attention. Compare
            consequence and source capability; this queue does not run a query
            or decide the finding.
          </p>
          <ol className="priority-queue">
            {ordered.map((id, i) => {
              const e = known.find((e) => e.id === id)!;
              return (
                <li key={id}>
                  <h3>{e.name}</h3>
                  <p>{e.impact}</p>
                  <div className="actions">
                    <button disabled={busy || !i} onClick={() => move(id, -1)}>
                      Move {id} earlier · free
                    </button>
                    <button
                      disabled={busy || i === ordered.length - 1}
                      onClick={() => move(id, 1)}
                    >
                      Move {id} later · free
                    </button>
                    <button disabled={busy} onClick={() => scope(id)}>
                      Investigate {id} · free
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <button
            disabled={busy}
            onClick={() => update((f) => ({ ...f, priorities: ordered }))}
          >
            Save this priority order · free
          </button>
        </>
      ) : null}
      <p className="muted">
        Summaries show the latest acquired view per source, with its cutoff.
        Earlier snapshots remain in the acquired-observation list and
        comparison.
      </p>
      {kind === "context" || kind === "grant" ? (
        <div className="mechanic-columns">
          <section>
            <h3>
              {kind === "grant"
                ? "Granted task / target / interval"
                : "Assigned work and permission"}
            </h3>
            {work.length ? (
              work.map((r) => (
                <p key={keyOf(r.ref)}>
                  {r.text}
                  <small>
                    {" "}
                    Through step {r.cutoffTick}; delivered {r.deliveredTick}.
                  </small>
                </p>
              ))
            ) : (
              <p>
                No work authorisation has been acquired. A familiar identity or
                a valid privilege does not fill this gap.
              </p>
            )}
          </section>
          <section>
            <h3>Actual acquired session action</h3>
            {activity.length ? (
              activity.map((r) => (
                <p key={keyOf(r.ref)}>
                  {r.text}
                  <small>
                    {" "}
                    Through step {r.cutoffTick}; delivered {r.deliveredTick}.
                  </small>
                </p>
              ))
            ) : (
              <p>
                No scoped activity snapshot has been acquired. Read the source
                capability before choosing the next check.
              </p>
            )}
          </section>
        </div>
      ) : null}
      {kind === "path" || kind === "boundary" ? (
        <>
          <p>
            {kind === "boundary"
              ? "A workstation, an app and a delegated workload have different collection boundaries. Follow only a relationship established by an acquired record."
              : "A connection is an access path, not a verdict. Acquire the documented route and compare its actual target with the approved task."}
          </p>
          <div className="scope-cards">
            {known.map((e) => (
              <article key={e.id} className="scope-card">
                <h3>{e.id}</h3>
                <p>{e.purpose}</p>
                <p>{e.capability}</p>
                <button
                  disabled={busy}
                  aria-pressed={v.scope === e.id}
                  onClick={() => scope(e.id)}
                >
                  Follow {e.id} · free
                </button>
              </article>
            ))}
          </div>
          {baseline.map((r) => (
            <p key={keyOf(r.ref)}>
              {r.text}
              <small>
                {" "}
                Through step {r.cutoffTick}; delivered {r.deliveredTick}.
              </small>
            </p>
          ))}
        </>
      ) : null}
      {kind === "attribution" || kind === "intent" ? (
        <div className="mechanic-columns">
          <section>
            <h3>What a source records</h3>
            {activity.length ? (
              activity.map((r) => (
                <p key={keyOf(r.ref)}>
                  {r.text}
                  <small>
                    {" "}
                    Through step {r.cutoffTick}; delivered {r.deliveredTick}.
                  </small>
                </p>
              ))
            ) : (
              <p>
                Start with the acquired session or credential observation. Keep
                its target and time bounds attached.
              </p>
            )}
          </section>
          <section>
            <h3>
              {kind === "intent"
                ? "What would establish motive?"
                : "What would establish the person?"}
            </h3>
            <p>
              The credential label, work report or policy mismatch alone does
              not identify the operator or establish intent. Use Case File
              relationships to state which claim each observation can support,
              weaken or limit.
            </p>
          </section>
        </div>
      ) : null}
      {kind === "causal" ? (
        <>
          <p>
            Place delivered observations under the claim they bear on, using
            each record’s relationship controls. Shared time does not join
            claims automatically.
          </p>
          <div className="claim-board">
            {p.mechanic.claims.map((c) => (
              <ClaimColumn
                key={c.id}
                claim={c}
                links={v.finding.links.filter((l) => l.claimId === c.id)}
                records={recordIndex}
              />
            ))}
          </div>
        </>
      ) : null}
      <label>
        Working investigation boundary
        <select
          disabled={busy}
          value={v.finding.mechanicChoice}
          onChange={(e) =>
            update((f) => ({ ...f, mechanicChoice: e.target.value }))
          }
        >
          <option value="">Choose your current boundary…</option>
          {p.mechanic.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        This records your reasoning; it is not a correctness check. You can
        change it before closing, for free.
      </p>
    </section>
  );
}

function ClaimColumn({
  claim,
  links,
  records,
}: {
  claim: { id: string; label: string };
  links: Finding["links"];
  records: Map<string, PublicRecord>;
}) {
  const [requested, setPage] = useState(0),
    last = Math.max(0, Math.ceil(links.length / 20) - 1),
    page = Math.min(requested, last);
  return (
    <section>
      <h3>{claim.label}</h3>
      {links.length > 20 ? (
        <nav aria-label={`${claim.label} relationships`}>
          <p>
            Page {page + 1} of {last + 1} · 20 relationships per page
          </p>
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Previous relationships
          </button>
          <button disabled={page === last} onClick={() => setPage(page + 1)}>
            Next relationships
          </button>
        </nav>
      ) : null}
      {links.slice(page * 20, page * 20 + 20).map((l) => {
        const r = records.get(keyOf(l.ref));
        return r ? (
          <p key={keyOf(l.ref)}>
            <strong>{l.role.replaceAll("_", " ")}:</strong> {r.text}
            <small>
              {" "}
              Through step {r.cutoffTick}; delivered {r.deliveredTick}.
            </small>
          </p>
        ) : null;
      })}
      {!links.length ? (
        <p>No acquired observation has been connected to this claim.</p>
      ) : null}
    </section>
  );
}
