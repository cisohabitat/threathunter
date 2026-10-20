import {
  StrictMode,
  Component,
  lazy,
  Suspense,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RawRecovery } from "../ui/RawRecovery";
import { caseOrder, type CaseId } from "../journey/contracts";
import "../ui/styles.css";
const Campaign = lazy(() => import("../campaign/Campaign"));
const Expansion = lazy(() => import("../expansion/Expansion"));
type Destination = Exclude<CaseId, "M01"> | "free";
function readRoute(): Destination | "M01" | null {
  if (location.pathname.toLowerCase() === "/hunt/free") return "free";
  const match = /^\/case\/(m\d{2})\/?$/i.exec(location.pathname);
  const id = match?.[1].toUpperCase();
  return id && caseOrder.some((known) => known === id) ? (id as CaseId) : null;
}
function address(path: string) {
  if (location.pathname !== path) history.pushState({}, "", path);
}
function Root() {
  const [initial] = useState(readRoute),
    initialDestination = initial === "M01" ? null : initial;
  const [selected, setSelected] = useState<Destination | null>(
    initialDestination,
  );
  const [visited, setVisited] = useState<Destination[]>(
    initialDestination ? [initialDestination] : [],
  );
  const [homeRequest, setHomeRequest] = useState(0),
    [caseRequest, setCaseRequest] = useState(initial === "M01" ? 1 : 0);
  function open(mission: Destination) {
    setVisited((previous) =>
      previous.includes(mission) ? previous : [...previous, mission],
    );
    setSelected(mission);
    address(
      mission === "free" ? "/hunt/free" : `/case/${mission.toLowerCase()}`,
    );
    window.scrollTo(0, 0);
  }
  function returnHome() {
    address("/");
    setHomeRequest((request) => request + 1);
    setSelected(null);
    window.scrollTo(0, 0);
  }
  function openCase(next: CaseId) {
    if (next === "M01") {
      address("/case/m01");
      setSelected(null);
      setCaseRequest((request) => request + 1);
      window.scrollTo(0, 0);
    } else open(next);
  }
  useEffect(() => {
    const restore = () => {
      const next = readRoute();
      if (next === "M01") {
        setSelected(null);
        setCaseRequest((request) => request + 1);
      } else if (next) {
        setVisited((previous) =>
          previous.includes(next) ? previous : [...previous, next],
        );
        setSelected(next);
      } else {
        setSelected(null);
        setHomeRequest((request) => request + 1);
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  // Keep loaded investigations mounted: changing cases cannot discard volatile work.
  return (
    <>
      <div hidden={selected !== null}>
        <App
          openCampaign={open}
          openFreeHunt={() => open("free")}
          homeRequest={homeRequest}
          caseRequest={caseRequest}
          active={selected === null}
        />
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
            {mission === "M04" || mission === "M07" ? (
              <Campaign
                missionId={mission}
                active={selected === mission}
                onExit={returnHome}
                onOpenMission={openCase}
              />
            ) : (
              <Expansion
                slot={mission}
                active={selected === mission}
                onExit={returnHome}
                onOpenMission={openCase}
              />
            )}
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
        <RawRecovery />
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
