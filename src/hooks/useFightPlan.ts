import { useSyncExternalStore } from 'react';
import type { GSIPayload } from '../types/gsi';
import { alertProfiles } from '../services/alertProfiles';
import { enemyUltimateService } from '../services/enemyUltimateService';
import { audioService } from '../services/audioService';
import { fightPreferences } from '../services/teamfightPreferences';
import { makeFightPlan } from '../services/teamfightAdvisor';
export function useFightPlan(payload: GSIPayload | null, connected: boolean) {
  const { active: role } = useSyncExternalStore(alertProfiles.subscribe, alertProfiles.getSnapshot);
  const preferences = useSyncExternalStore(fightPreferences.subscribe, fightPreferences.getSnapshot);
  const { slots } = useSyncExternalStore(enemyUltimateService.subscribe, enemyUltimateService.getSnapshot);
  const thai = audioService.getSettings().voiceLanguage === 'th-TH';
  return { plan: makeFightPlan(payload, connected, role, preferences.duties[role], slots, thai), role, preferences, thai };
}
