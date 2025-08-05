import { create } from 'zustand';

interface PlanStore {
  activePlanId: string | null;
  activeStyleId: string | null;
  activeProjectId: string | null;
  setActivePlanId: (planId: string | null) => void;
  setActiveStyleId: (styleId: string | null) => void;
  setActiveProjectId: (projectId: string | null) => void;
  clearActiveIds: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
  activePlanId: null,
  activeStyleId: null,
  activeProjectId: null,
  setActivePlanId: (planId) => set({ activePlanId: planId }),
  setActiveStyleId: (styleId) => set({ activeStyleId: styleId }),
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),
  clearActiveIds: () => set({ activePlanId: null, activeStyleId: null, activeProjectId: null }),
}));