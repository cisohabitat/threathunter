import { create } from "zustand";
export type Screen = "Leads" | "Explore" | "Case File" | "Timeline";
export const useNavigation = create<{
  screen: Screen;
  scrollPositions: Record<string, number>;
  rememberScroll: (key: string, y: number) => void;
  editor: { runId: string; stage: number; notes: string } | null;
  rememberEditor: (runId: string, stage: number, notes: string) => void;
  setScreen: (screen: Screen) => void;
}>((set) => ({
  screen: "Leads",
  scrollPositions: {},
  rememberScroll: (key, y) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [key]: y },
    })),
  editor: null,
  rememberEditor: (runId, stage, notes) =>
    set({ editor: { runId, stage, notes } }),
  setScreen: (screen) => set({ screen }),
}));
