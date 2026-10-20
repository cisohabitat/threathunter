import {
  StrictMode,
  Component,
  lazy,
  Suspense,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../ui/styles.css";
const Campaign = lazy(() => import("../campaign/Campaign"));
function Root() {
  const [selected, setSelected] = useState<"M04" | "M07" | null>(null);
  const [visited, setVisited] = useState<("M04" | "M07")[]>([]);
  const [homeRequest, setHomeRequest] = useState(0);
  function open(mission: "M04" | "M07") {
    setVisited((previous) =>
      previous.includes(mission) ? previous : [...previous, mission],
    );
    setSelected(mission);
    window.scrollTo(0, 0);
  }
  function returnHome() {
    setHomeRequest((request) => request + 1);
    setSelected(null);
    window.scrollTo(0, 0);
  }
  // Keep loaded investigations mounted: changing cases cannot discard volatile work.
  return (
    <>
      <div hidden={selected !== null}>
        <App openCampaign={open} homeRequest={homeRequest} />
      </div>
      {visited.map((mission) => (
        <div key={mission} hidden={selected !== mission}>
          <Suspense
            fallback={
              <main>
                <h1>Preparing investigation…</h1>
                <button onClick={returnHome}>Return home</button>
              </main>
            }
          >
            <Campaign
              missionId={mission}
              active={selected === mission}
              onOpenMission={(next) => {
                if (next === "M01") setSelected(null);
                else open(next);
                window.scrollTo(0, 0);
              }}
              onExit={returnHome}
            />
          </Suspense>
        </div>
      ))}
    </>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>The interface could not load.</h1>
        <p>Your last committed local save is retained. Reload to recover it.</p>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
