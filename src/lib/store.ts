'use client';

import { create } from 'zustand';

import type { Mode } from './api';

export type SettingsTab = 'general' | 'models' | 'workspace';

/** What the user has chosen for the next message; remembered across screens. */
export type RunOptions = { modelId?: string; agentId?: string | null; mode: Mode };

/** Pure interface state. Everything that comes from the backend lives in `backend.ts`. */
type UiState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  /** The task open on the tasks screen; null means "new task". */
  activeThread: string | null;
  setActiveThread: (threadId: string | null) => void;

  runOptions: RunOptions;
  setRunOptions: (options: Partial<RunOptions>) => void;

  /** Workspace path of the file open in the files screen. */
  openFile: string | null;
  setOpenFile: (path: string | null) => void;

  /** Which settings section is open, so other screens can link straight to one. */
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;

  /** The introduction, reopened on request (it opens by itself on first launch). */
  introOpen: boolean;
  setIntroOpen: (open: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeThread: null,
  setActiveThread: (activeThread) => set({ activeThread }),

  runOptions: { mode: 'ask' },
  setRunOptions: (options) => set((s) => ({ runOptions: { ...s.runOptions, ...options } })),

  openFile: null,
  setOpenFile: (openFile) => set({ openFile }),

  settingsTab: 'general',
  setSettingsTab: (settingsTab) => set({ settingsTab }),

  introOpen: false,
  setIntroOpen: (introOpen) => set({ introOpen }),
}));
