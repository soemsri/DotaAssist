import { GSIPayload } from '../types/gsi';
import {
  SlarkReflexSettings,
  SlarkReflexState,
  DEFAULT_SLARK_REFLEX_SETTINGS,
} from '../types/slarkReflex';
import { audioService } from './audioService';

const STORAGE_KEY = 'dotaassist_slark_reflex_settings';

export class SlarkReflexService {
  private settings: SlarkReflexSettings;
  private state: SlarkReflexState;
  private listeners = new Set<() => void>();
  private lastCleanseTriggerClock: number | null = null;
  private lastShadowDanceTriggerClock: number | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.state = {
      heroName: '',
      isSlark: false,
      cleanseUrgent: false,
      cleanseHotkey: this.settings.darkPactHotkey,
      shadowDanceUrgent: false,
      shadowDanceHotkey: this.settings.shadowDanceHotkey,
      currentHpPercent: 100,
      hasDebuff: false,
      darkPactReady: false,
      shadowDanceReady: false,
    };
  }

  private loadSettings(): SlarkReflexSettings {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_SLARK_REFLEX_SETTINGS };
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SLARK_REFLEX_SETTINGS,
          ...parsed,
        };
      }
    } catch {
      // Fallback on corrupt storage
    }
    return { ...DEFAULT_SLARK_REFLEX_SETTINGS };
  }

  public saveSettings(newSettings: Partial<SlarkReflexSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {}
    }
    this.state.cleanseHotkey = this.settings.darkPactHotkey;
    this.state.shadowDanceHotkey = this.settings.shadowDanceHotkey;
    this.notify();
  }

  public getSettings(): SlarkReflexSettings {
    return { ...this.settings };
  }

  public getSnapshot(): SlarkReflexState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public testCleanseAlert() {
    audioService.triggerEmergencyReflex(this.settings.darkPactHotkey, 'cleanse');
  }

  public testShadowDanceAlert() {
    audioService.triggerEmergencyReflex(this.settings.shadowDanceHotkey, 'shadow_dance');
  }

  public processGSI(payload: GSIPayload | null, clockTime: number) {
    if (!payload?.hero) {
      if (this.state.cleanseUrgent || this.state.shadowDanceUrgent) {
        this.state = {
          ...this.state,
          cleanseUrgent: false,
          shadowDanceUrgent: false,
        };
        this.notify();
      }
      return;
    }

    const hero = payload.hero;
    const heroName = hero.name || '';
    const isSlark = heroName.toLowerCase().includes('slark');
    const currentHp = hero.health_percent ?? 100;

    // Resolve abilities from GSI payload
    let darkPactAbility: { can_cast: boolean; level: number; cooldown: number } | undefined;
    let shadowDanceAbility: { can_cast: boolean; level: number; cooldown: number } | undefined;

    if (payload.abilities) {
      for (const [key, ab] of Object.entries(payload.abilities)) {
        if (!ab) continue;
        if (ab.name === 'slark_dark_pact' || key === 'ability0') {
          darkPactAbility = ab;
        }
        if (ab.name === 'slark_shadow_dance' || key === 'ability3' || key === 'ability5') {
          shadowDanceAbility = ab;
        }
      }
    }

    const darkPactReady = Boolean(
      darkPactAbility &&
      darkPactAbility.can_cast &&
      (darkPactAbility.level ?? 1) > 0 &&
      (darkPactAbility.cooldown ?? 0) === 0
    );

    const shadowDanceReady = Boolean(
      shadowDanceAbility &&
      shadowDanceAbility.can_cast &&
      (shadowDanceAbility.level ?? 1) > 0 &&
      (shadowDanceAbility.cooldown ?? 0) === 0
    );

    const isHardDisabled = Boolean(
      hero.stunned || hero.silenced || hero.hexed || hero.muted
    );

    const hasDispellableDebuff = Boolean(
      hero.has_debuff || hero.disarmed
    );

    let nextCleanseUrgent = false;
    let nextShadowDanceUrgent = false;

    if (this.settings.enabled && isSlark && hero.alive) {
      // 1. Cleanse Trigger (Dark Pact)
      if (darkPactReady && !isHardDisabled && hasDispellableDebuff) {
        nextCleanseUrgent = true;
        const lastTrigger = this.lastCleanseTriggerClock ?? -999;
        if (clockTime - lastTrigger >= 4 || !this.state.cleanseUrgent) {
          this.lastCleanseTriggerClock = clockTime;
          audioService.triggerEmergencyReflex(this.settings.darkPactHotkey, 'cleanse');
        }
      }

      // 2. Shadow Dance Trigger (Ultimate Low-HP)
      if (shadowDanceReady && !isHardDisabled && currentHp <= this.settings.shadowDanceHpThreshold) {
        nextShadowDanceUrgent = true;
        const lastTrigger = this.lastShadowDanceTriggerClock ?? -999;
        if (clockTime - lastTrigger >= 8 || !this.state.shadowDanceUrgent) {
          this.lastShadowDanceTriggerClock = clockTime;
          audioService.triggerEmergencyReflex(this.settings.shadowDanceHotkey, 'shadow_dance');
        }
      } else if (currentHp > this.settings.shadowDanceHpThreshold + 5) {
        // Hysteresis threshold to reset trigger window
        nextShadowDanceUrgent = false;
      } else if (!shadowDanceReady) {
        nextShadowDanceUrgent = false;
      } else {
        // Retain previous state while within hysteresis buffer
        nextShadowDanceUrgent = this.state.shadowDanceUrgent;
      }
    }

    const stateChanged =
      this.state.isSlark !== isSlark ||
      this.state.heroName !== heroName ||
      this.state.cleanseUrgent !== nextCleanseUrgent ||
      this.state.shadowDanceUrgent !== nextShadowDanceUrgent ||
      this.state.currentHpPercent !== currentHp ||
      this.state.hasDebuff !== hasDispellableDebuff ||
      this.state.darkPactReady !== darkPactReady ||
      this.state.shadowDanceReady !== shadowDanceReady;

    if (stateChanged) {
      this.state = {
        heroName,
        isSlark,
        cleanseUrgent: nextCleanseUrgent,
        cleanseHotkey: this.settings.darkPactHotkey,
        shadowDanceUrgent: nextShadowDanceUrgent,
        shadowDanceHotkey: this.settings.shadowDanceHotkey,
        currentHpPercent: currentHp,
        hasDebuff: hasDispellableDebuff,
        darkPactReady,
        shadowDanceReady,
        lastCleanseTime: this.lastCleanseTriggerClock ?? undefined,
        lastShadowDanceTime: this.lastShadowDanceTriggerClock ?? undefined,
      };
      this.notify();
    }
  }

  public reset() {
    this.lastCleanseTriggerClock = null;
    this.lastShadowDanceTriggerClock = null;
    this.state = {
      ...this.state,
      cleanseUrgent: false,
      shadowDanceUrgent: false,
    };
    this.notify();
  }
}

export const slarkReflexService = new SlarkReflexService();
