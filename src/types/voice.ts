export type VoiceCommandIntent =
  | 'roshan_death'
  | 'enemy_bkb'
  | 'enemy_ultimate'
  | 'ward_placed'
  | 'hud_toggle'
  | 'audio_mute'
  | 'query_rune'
  | 'query_roshan'
  | 'query_next_item'
  | 'query_buyback';

export type VoiceAssistantStatus =
  | 'listening'
  | 'processing'
  | 'paused'
  | 'disabled'
  | 'unsupported';

export interface EnemyCooldownTracker {
  id: string;
  name: string;
  skillOrItem: string;
  durationSeconds: number;
  expiresAtClockTime: number;
  remainingSeconds: number;
  icon?: string;
}

export interface VoiceRecognitionResult {
  id: string;
  transcript: string;
  intent: VoiceCommandIntent | null;
  confidence: number;
  matchedPhrase?: string;
  timestamp: number;
  feedbackText: string;
  success: boolean;
  isQuery?: boolean;
}

export interface VoiceCommandRule {
  intent: VoiceCommandIntent;
  phrasesTh: string[];
  phrasesEn: string[];
  actionType: 'action' | 'query';
  param?: string;
}
