// Public, authored context. Never derived from the selected private world.
export const sources = {
  "Q-H": {
    can: "Compare this session with a bounded 14-day sign-in baseline.",
    cannot:
      "A baseline does not prove that a legitimate exception is impossible.",
    coverage: "Loaded historical identity records; static for this case.",
  },
  "Q-D": {
    can: "Check the session client's organisation-device mapping.",
    cannot: "Device registration does not identify who operated the session.",
    coverage:
      "Registry mapping only; an unavailable mapping is reported explicitly.",
  },
  "Q-C": {
    can: "Check whether person, client, time and task match a work approval.",
    cannot: "An approval does not authorise every later action.",
    coverage:
      "The applicable work register; missing archive coverage is explicit.",
  },
  "Q-F": {
    can: "Inspect recorded application access scope through your chosen cutoff.",
    cannot:
      "An empty result does not cover later activity or missing collection.",
    coverage:
      "Application access scope only; each refresh keeps its original cutoff.",
  },
} as const;
export const glossary = [
  [
    "Session",
    "A period of authenticated access. This case investigates one session, not the whole organisation.",
  ],
  [
    "Client",
    "The device or software presenting the connection; an unfamiliar client does not establish malicious intent.",
  ],
  [
    "Baseline",
    "A relevant comparison with usual activity, not a rule that all exceptions are wrong.",
  ],
  [
    "Collection gap",
    "A source could not record the activity in scope. Missing records cannot prove nothing happened.",
  ],
  [
    "Cutoff",
    "The last simulation step covered by a captured snapshot. A later delivery does not extend that cutoff.",
  ],
  [
    "Corroboration",
    "Support from a source with a different origin. Several copies of one event are not independent witnesses.",
  ],
  [
    "Confidence",
    "How strongly the cited evidence supports the claim; separate from how serious a risk would be.",
  ],
  [
    "Handoff",
    "A scoped recommendation to the responsible response team, with evidence, limits and follow-up.",
  ],
] as const;
export const profiles = [
  [
    "U-01",
    "Finance account",
    "Used for the holder's finance work. Identity records show sign-ins; they cannot identify the operator by themselves.",
  ],
  [
    "S-01",
    "Investigated session",
    "The successful 02:13 connection. You can investigate and recommend scoped revocation; the response team owns that control.",
  ],
  [
    "FIN-01",
    "Finance Portal",
    "Supports ordinary finance work and depends on authenticated sessions. Disrupting unrelated finance access is outside your authority.",
  ],
  [
    "RPT-01",
    "Report service",
    "Provides reports used by finance. Application audit can describe recorded access scope, subject to collection coverage.",
  ],
  [
    "Registry",
    "Device registry",
    "Maintains enrolled-device mappings. A mapping is context, not proof of authorship.",
  ],
  [
    "Work register",
    "Approved-work source",
    "Records permitted person/client/time/task combinations. Availability and completeness must be established from its result.",
  ],
] as const;
