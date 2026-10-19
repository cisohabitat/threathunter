import { create } from "zustand";
export type Screen = "Leads" | "Explore" | "Case File" | "Timeline";
export const useNavigation = create<{
  screen: Screen;
  setScreen: (screen: Screen) => void;
}>((set) => ({ screen: "Leads", setScreen: (screen) => set({ screen }) }));
