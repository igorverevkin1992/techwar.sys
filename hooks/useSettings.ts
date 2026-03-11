import { createContext, useContext, useState, useCallback, createElement, ReactNode } from 'react';
import { AGENT_MODELS, AVAILABLE_MODELS } from '../constants';

export type AgentKey = keyof typeof AGENT_MODELS;

export interface AppSettings {
  modelOverrides: Partial<Record<AgentKey, string>>;
  autoSeoEnabled: boolean;
  showRussianScript: boolean;
  parallelActWriting: boolean;
}

const STORAGE_KEY = 'narrative_war_settings';

const DEFAULTS: AppSettings = {
  modelOverrides: {},
  autoSeoEnabled: true,
  showRussianScript: true,
  parallelActWriting: false,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getModel(settings: AppSettings, agent: AgentKey): string {
  return settings.modelOverrides[agent] ?? AGENT_MODELS[agent];
}

export const SettingsContext = createContext<{
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getModel: (agent: AgentKey) => string;
}>({ settings: DEFAULTS, updateSettings: () => {}, getModel: () => '' });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(load);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const getModelFn = useCallback((agent: AgentKey): string => {
    return settings.modelOverrides[agent] ?? AGENT_MODELS[agent];
  }, [settings.modelOverrides]);

  return createElement(SettingsContext.Provider, { value: { settings, updateSettings, getModel: getModelFn } }, children);
}

export function useSettings() {
  return useContext(SettingsContext);
}

export { AVAILABLE_MODELS };
