export type VoiceCommandIntent =
  | 'roshan_death'
  | 'tormentor_death'
  | 'undo_objective'
  | 'enemy_bkb'
  | 'enemy_ultimate'
  | 'ward_placed'
  | 'hud_toggle'
  | 'audio_mute'
  | 'query_rune'
  | 'query_roshan'
  | 'query_next_item'
  | 'query_buyback'
  | 'query_lotus';

export type VoiceActivationMode = 'ptt' | 'continuous';

export interface VoicePttState {
  isPttActive: boolean;
  audioLevel: number; // 0 to 100 for live waveform visualization
  waveformBars: number[]; // e.g. 6 frequency amplitudes (0-100)
  activationMode: VoiceActivationMode;
  pttHotkey: string;
}

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
