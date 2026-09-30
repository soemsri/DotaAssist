export interface SlarkReflexSettings {
  enabled: boolean;
  darkPactHotkey: string; // e.g. "F", "Q", "Space"
  shadowDanceHotkey: string; // e.g. "R"
  shadowDanceHpThreshold: number; // e.g. 20 (percent)
}

export interface SlarkReflexState {
  heroName: string;
  isSlark: boolean;
  cleanseUrgent: boolean;
  cleanseHotkey: string;
  shadowDanceUrgent: boolean;
  shadowDanceHotkey: string;
  currentHpPercent: number;
  hasDebuff: boolean;
  darkPactReady: boolean;
  shadowDanceReady: boolean;
  lastCleanseTime?: number;
  lastShadowDanceTime?: number;
}

export const DEFAULT_SLARK_REFLEX_SETTINGS: SlarkReflexSettings = {
  enabled: true,
  darkPactHotkey: 'F',
  shadowDanceHotkey: 'R',
  shadowDanceHpThreshold: 20,
};
