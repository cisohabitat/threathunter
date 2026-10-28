import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import * as campaign from "../campaign/storage";
import * as expansion from "../expansion/storage";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
function post(name: string, data: unknown) {
  const channel = new BroadcastChannel(name);
  channel.postMessage(data);
  channel.close();
}

it.each([
  [
    "campaign",
    campaign.subscribe,
    "threat-hunter-campaign-changes",
    "M04",
    "M07",
  ],
  [
    "expansion",
    expansion.subscribe,
    "threat-hunter-expansion-changes",
    "M02",
    "free",
  ],
] as const)(
  "%s save notifications wake only the committed mission",
  async (_family, subscribe, name, mine, other) => {
    const notify = vi.fn();
    const stop = (subscribe as (m: string, n: () => void) => () => void)(
      mine,
      notify,
    );
    post(name, { mission: other });
    await settle();
    expect(notify).not.toHaveBeenCalled();
    post(name, { mission: mine });
    await settle();
    expect(notify).toHaveBeenCalledTimes(1);
    // An unscoped message from an older build still refreshes.
    post(name, "changed");
    await settle();
    expect(notify).toHaveBeenCalledTimes(2);
    stop();
  },
);
