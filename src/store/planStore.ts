import { create } from 'zustand';

interface PlanStore {
  activePlanId: string | null;
  activeStyleId: string | null;
  setActivePlanId: (planId: string | null) => void;
  setActiveStyleId: (styleId: string | null) => void;
  clearActiveIds: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  activePlanId: null,
  activeStyleId: null,
  setActivePlanId: (planId) => set({ activePlanId: planId }),
  setActiveStyleId: (styleId) => set({ activeStyleId: styleId }),
  clearActiveIds: () => set({ activePlanId: null, activeStyleId: null }),
}));