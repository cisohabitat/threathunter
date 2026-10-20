// Authored public capabilities only. Never import facts, worlds, sufficient sets or expected choices here.
import catalogue from "./public.json";
import type { MissionId } from "./contracts";
type Raw = (typeof catalogue)[MissionId];
export type PublicMission = Omit<Raw, "mechanic"> & {
  mechanic: Omit<Raw["mechanic"], "kind"> & {
    kind:
      | "triage"
      | "context"
      | "attribution"
      | "path"
      | "boundary"
      | "grant"
      | "intent"
      | "causal"
      | "capstone";
  };
};
export const missions = catalogue as Record<MissionId, PublicMission>;
