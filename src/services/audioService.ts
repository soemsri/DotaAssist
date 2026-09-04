export interface AudioSettings {
  masterVolume: number; // 0.0 - 1.0
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  voiceLanguage: 'en-US' | 'th-TH';
}

class AudioNotificationService {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    sfxEnabled: true,
    voiceEnabled: true,
    voiceLanguage: 'en-US',
  };
  private isUnlocked: boolean = false;

  constructor() {
    this.setupAutoUnlock();
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }

      // Pre-warm SpeechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }

      // Remove listeners once unlocked
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    window.addEventListener('click', unlock, { once: false });
  }

  public initContext() {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else if (this.ctx) {
      this.isUnlocked = true;
    }
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public setMasterVolume(vol: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public setSfxEnabled(val: boolean) {
    this.settings.sfxEnabled = val;
  }

  public setVoiceEnabled(val: boolean) {
    this.settings.voiceEnabled = val;
  }

  public setVoiceLanguage(lang: 'en-US' | 'th-TH') {
    this.settings.voiceLanguage = lang;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Speak announcement using Web Speech API (TTS)
   */
  public speak(text: string, langOverride?: string) {
    if (!this.settings.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      // Cancel previous ongoing utterance if it's still talking
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.settings.masterVolume;
      utterance.rate = 1.05; // clear and slightly brisk for gaming
      utterance.pitch = 1.0;
      utterance.lang = langOverride || this.settings.voiceLanguage;

      // Pick an English or Thai voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const targetLang = utterance.lang;
        const matchingVoice = voices.find((v) => v.lang.startsWith(targetLang.split('-')[0])) || voices[0];
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[AudioService] SpeechSynthesis error:', err);
    }
  }

  // --- Objective-Specific Alerts (Chime + Speech) ---

  public playWisdomRuneAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(600, now, 0.25, 'sine');
      this.playTone(900, now + 0.18, 0.35, 'sine');
    }
    this.speak('Wisdom Rune in thirty seconds');
  }

  public playPowerRuneAlert(isWaterRune: boolean = false) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(750, now, 0.12, 'triangle');
      this.playTone(1050, now + 0.14, 0.2, 'triangle');
    }
    if (isWaterRune) {
      this.speak('Water Runes in twenty seconds');
    } else {
      this.speak('Power Rune in twenty seconds');
    }
  }

  public playBountyRuneAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(987.77, now, 0.1, 'sine');
      this.playTone(1318.51, now + 0.08, 0.25, 'sine');
    }
    this.speak('Bounty Runes in fifteen seconds');
  }

  public playTormentorAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(330, now, 0.3, 'sawtooth');
      this.playTone(440, now + 0.25, 0.4, 'sawtooth');
    }
    this.speak('Tormentor ready in thirty seconds');
  }

  public playRoshanAlert(message: string = 'Roshan respawn window is active') {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(220, now, 0.35, 'sawtooth');
      this.playTone(180, now + 0.3, 0.45, 'sawtooth');
    }
    this.speak(message);
  }

  public playAegisExpiringAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(550, now, 0.2, 'sine');
      this.playTone(440, now + 0.15, 0.3, 'sine');
    }
    this.speak('Aegis expires in thirty seconds');
  }

  public playDayNightAlert(isNightfall: boolean) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(400, now, 0.2, 'sine');
      this.playTone(isNightfall ? 300 : 500, now + 0.15, 0.3, 'sine');
    }
    if (isNightfall) {
      this.speak('Nightfall approaching. Roshan moves top.');
    } else {
      this.speak('Daybreak approaching. Roshan moves bottom.');
    }
  }

  public playWarningBeep() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(880, now, 0.15, 'sine');
    }
  }

  private playTone(freq: number, startTime: number, duration: number, type: OscillatorType) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(this.settings.masterVolume * 0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }
}

export const audioService = new AudioNotificationService();
