'use client';

import { create } from 'zustand';

type Decision = 'approved' | 'rejected';

export type SettingsTab = 'general' | 'connections' | 'access' | 'models' | 'budget' | 'members' | 'devices';

/** A model the user connected themselves: any compatible endpoint, their own key. */
export type ModelConfig = { id: string; name: string; baseUrl: string; apiKey: string; model: string };

// Sample entries so the prototype is not empty; a real install starts with none.
const sampleModels: ModelConfig[] = [
  { id: 'm1', name: 'Claude Opus', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant-sample-4f2a', model: 'claude-opus-5-5' },
  { id: 'm2', name: 'Claude Haiku', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant-sample-4f2a', model: 'claude-haiku-5-5' },
  { id: 'm3', name: 'مدل محلی', baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'qwen2.5:14b' },
];

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

  /** Which settings section is open, so other screens can link straight to one. */
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;

  models: ModelConfig[];
  defaultModelId: string;
  /** Adds a model, or replaces the one with the same id. */
  saveModel: (model: Omit<ModelConfig, 'id'> & { id?: string }) => void;
  removeModel: (id: string) => void;
  setDefaultModel: (id: string) => void;

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

  settingsTab: 'general',
  setSettingsTab: (settingsTab) => set({ settingsTab }),

  models: sampleModels,
  defaultModelId: 'm1',
  saveModel: (model) =>
    set((s) => {
      if (model.id) return { models: s.models.map((m) => (m.id === model.id ? { ...model, id: m.id } : m)) };
      return { models: [...s.models, { ...model, id: `m${Date.now()}` }] };
    }),
  removeModel: (id) =>
    set((s) => {
      const models = s.models.filter((m) => m.id !== id);
      return { models, defaultModelId: s.defaultModelId === id ? (models[0]?.id ?? '') : s.defaultModelId };
    }),
  setDefaultModel: (defaultModelId) => set({ defaultModelId }),

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
