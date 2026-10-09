'use client';

import { create } from 'zustand';

type Decision = 'approved' | 'rejected';

type UiState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  activeTaskId: string;
  setActiveTask: (id: string) => void;
  /** A prompt typed on the home page, handed to the tasks page to start a run. */
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;

  openFileId: string | null;
  setOpenFile: (id: string | null) => void;

  /** approvalId → changeId → decision */
  decisions: Record<string, Record<string, Decision>>;
  decide: (approvalId: string, changeId: string, decision: Decision | null) => void;
  decideAll: (approvalId: string, changeIds: string[], decision: Decision) => void;
  resolved: Record<string, Decision>;
  resolve: (approvalId: string, decision: Decision) => void;
};

export const useUi = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeTaskId: 't1',
  setActiveTask: (activeTaskId) => set({ activeTaskId }),
  pendingPrompt: null,
  setPendingPrompt: (pendingPrompt) => set({ pendingPrompt }),

  openFileId: null,
  setOpenFile: (openFileId) => set({ openFileId }),

  decisions: {},
  decide: (approvalId, changeId, decision) =>
    set((s) => {
      const current = { ...(s.decisions[approvalId] ?? {}) };
      if (decision) current[changeId] = decision;
      else delete current[changeId];
      return { decisions: { ...s.decisions, [approvalId]: current } };
    }),
  decideAll: (approvalId, changeIds, decision) =>
    set((s) => ({
      decisions: { ...s.decisions, [approvalId]: Object.fromEntries(changeIds.map((id) => [id, decision])) },
    })),
  resolved: {},
  resolve: (approvalId, decision) => set((s) => ({ resolved: { ...s.resolved, [approvalId]: decision } })),
}));
