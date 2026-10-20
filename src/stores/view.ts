import { create } from "zustand";
export type Screen = "Leads" | "Explore" | "Case File" | "Timeline";
export const useNavigation = create<{
  screen: Screen;
  scrollPositions: Record<string, number>;
  timelinePages: Record<string, number>;
  rememberTimeline: (runId: string, page: number) => void;
  rememberScroll: (key: string, y: number) => void;
  editor: { runId: string; stage: number; notes: string } | null;
  rememberEditor: (runId: string, stage: number, notes: string) => void;
  setScreen: (screen: Screen) => void;
}>((set) => ({
  screen: "Leads",
  scrollPositions: {},
  timelinePages: {},
  rememberTimeline: (runId, page) =>
    set((state) => ({
      timelinePages: { ...state.timelinePages, [runId]: page },
    })),
  rememberScroll: (key, y) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [key]: y },
    })),
  editor: null,
  rememberEditor: (runId, stage, notes) =>
    set({ editor: { runId, stage, notes } }),
  setScreen: (screen) => set({ screen }),
}));
