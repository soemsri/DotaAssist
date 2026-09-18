export interface AudioSettings {
  masterVolume: number; // 0.0 - 1.0
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  itemAdviceEnabled: boolean;
  minimapScannerEnabled: boolean;
  gankAlertsEnabled: boolean;
  minimapPosition: 'left' | 'right';
  voiceLanguage: 'en-US' | 'th-TH';
  tacticalCoachEnabled: boolean;
  powerSpikeAlertsEnabled: boolean;
  neutralItemAlertsEnabled: boolean;
  buybackAlertsEnabled: boolean;
  counterItemAlertsEnabled: boolean;
  tpScrollAlertEnabled: boolean;
  laneAssistantMode: 'auto' | 'always' | 'disabled';
  talentAlertsEnabled: boolean;
  voiceCommandEnabled: boolean;
}

const STORAGE_KEY = 'dotaassist_audio_settings';

interface VoicePhrases {
  wisdomShrine: string;
  powerRune: string;
  waterRune: string;
  bountyRune: string;
  tormentor: string;
  roshanWindow: string;
  roshanGuaranteed: string;
  aegisExpiring: string;
  nightfall: string;
  daybreak: string;
  allEnemiesMissing: string;
  gankWindowMinute6: string;
  noTpScroll: string;
  creepPullSmall: string;
  creepPullLarge: string;
  jungleStack: string;
  talentRecommendation: (level: number, side: string, talent: string, reason?: string) => string;
  itemAdviceStarting: (hero: string, items: string) => string;
  itemAdviceEarly: (hero: string, items: string) => string;
  itemAdviceCore: (hero: string, items: string) => string;
  itemAdviceLuxury: (hero: string, items: string) => string;
  levelSpike: (level: number, hero: string, combo: string) => string;
  neutralItemMissing: (tier: number, hero?: string, topItems?: string) => string;
  buybackDeficit: (shortfall: number) => string;
  overextendDanger: string;
  pushAdvantage: string;
  counterItemAdvice: (threat: string, items: string) => string;
  wardExpired: string;
  voiceRoshanRecorded: string;
  voiceBkbRecorded: string;
  voiceUltimateRecorded: (name: string) => string;
  voiceWardRecorded: string;
  voiceHudToggled: (minimized: boolean) => string;
  voiceAudioMuted: (muted: boolean) => string;
  voiceQueryRune: (name: string, seconds: number) => string;
  voiceQueryRoshan: (status: string) => string;
  voiceQueryItem: (item: string) => string;
  voiceQueryBuyback: (ready: boolean, shortfall?: number) => string;
  voiceUnrecognized: string;
}

export const PHRASES: Record<'en-US' | 'th-TH', VoicePhrases> = {
  'en-US': {
    wisdomShrine: 'Wisdom Shrine in thirty seconds',
    powerRune: 'Power Rune in twenty seconds',
    waterRune: 'Water Runes in twenty seconds',
    bountyRune: 'Bounty Runes in fifteen seconds',
    tormentor: 'Tormentor ready in thirty seconds',
    roshanWindow: 'Roshan respawn window is active',
    roshanGuaranteed: 'Roshan is guaranteed alive',
    aegisExpiring: 'Aegis expires in thirty seconds',
    nightfall: 'Nightfall approaching. Vision reduced, beware of enemy ganks.',
    daybreak: 'Daybreak approaching.',
    allEnemiesMissing: 'All enemies missing from minimap, play safe.',
    gankWindowMinute6: 'Minute 6 gank window, caution in side lanes.',
    noTpScroll: 'Warning: No Town Portal Scroll! Buy a TP scroll from shop or courier.',
    creepPullSmall: 'Pull creeps',
    creepPullLarge: 'Pull large camp',
    jungleStack: 'Stack jungle camp',
    itemAdviceStarting: (hero, items) => `Starting items for ${hero}: ${items}`,
    itemAdviceEarly: (hero, items) => `Early game items for ${hero}: ${items}`,
    itemAdviceCore: (_hero, items) => `Recommended core items: ${items}`,
    itemAdviceLuxury: (_hero, items) => `Late game luxury items: ${items}`,
    levelSpike: (level, hero, combo) =>
      `Level ${level} reached for ${hero}! Ultimate ready. Combo tip: ${combo}`,
    neutralItemMissing: (tier, hero, topItems) =>
      hero && topItems
        ? `Tier ${tier} neutral items unlocked! For ${hero}, recommend ${topItems}.`
        : `Tier ${tier} neutral items unlocked! Your neutral slot is empty, grab a token.`,
    buybackDeficit: (shortfall) =>
      `Warning: Need ${shortfall} more gold for buyback! Play safe and save gold.`,
    overextendDanger:
      'Danger! Enemies missing from minimap and your health is vulnerable. Fall back immediately.',
    pushAdvantage:
      'Enemy heroes down! Numbers advantage secured, push towers or take objectives now.',
    counterItemAdvice: (threat, items) =>
      `Countering ${threat}: Recommended items ${items}`,
    talentRecommendation: (level, side, talent, reason) =>
      reason
        ? `Level ${level} reached! Recommend ${side} talent: ${talent}. ${reason}`
        : `Level ${level} reached! Recommend ${side} talent: ${talent}.`,
    wardExpired: 'Observer ward has expired',
    voiceRoshanRecorded: 'Roshan death recorded',
    voiceBkbRecorded: 'Enemy BKB tracker started, ninety seconds',
    voiceUltimateRecorded: (name) => `Enemy ${name} tracker started`,
    voiceWardRecorded: 'Ward placement logged',
    voiceHudToggled: (minimized) => (minimized ? 'HUD minimized' : 'HUD expanded'),
    voiceAudioMuted: (muted) => (muted ? 'Voice alerts muted' : 'Voice alerts unmuted'),
    voiceQueryRune: (name, seconds) =>
      seconds <= 5
        ? `${name} is spawning now!`
        : `${name} in ${seconds} seconds`,
    voiceQueryRoshan: (status) => `Roshan status: ${status}`,
    voiceQueryItem: (item) => `Next recommended item: ${item}`,
    voiceQueryBuyback: (ready, shortfall) =>
      ready
        ? 'Buyback is ready'
        : `Need ${shortfall} more gold for buyback`,
    voiceUnrecognized: 'Command not recognized',
  },
  'th-TH': {
    wisdomShrine: 'วิสดอม ไชร์น ในอีก 30 วินาที',
    powerRune: 'พาวเวอร์ รูน ในอีก 20 วินาที',
    waterRune: 'วอเตอร์ รูน ในอีก 20 วินาที',
    bountyRune: 'รูนทอง ในอีก 15 วินาที',
    tormentor: 'ทอร์เมนเตอร์ พร้อมเกิดใน 30 วินาที',
    roshanWindow: 'หน้าต่างเกิดโรชานเปิดแล้ว',
    roshanGuaranteed: 'โรชานเกิดแน่นอนแล้ว',
    aegisExpiring: 'เอจิส จะหมดอายุในอีก 30 วินาที',
    nightfall: 'กำลังจะเข้าสู่เวลากลางคืน ระยะมองเห็นลดลง ระวังศัตรูดักซุ่ม',
    daybreak: 'กำลังจะเข้าสู่เวลากลางวัน',
    allEnemiesMissing: 'ศัตรูหายไปจากมินิแมพทั้งหมด ระวังตัว',
    gankWindowMinute6: 'นาทีที่ 6 ระวังศัตรูเดินแก๊ง เลนข้างระวังตัว',
    noTpScroll: 'คำเตือน! ไม่มีใบวาป อย่าลืมซื้อใบวาปสำรอง',
    creepPullSmall: 'พูลครีป',
    creepPullLarge: 'พูลครีปใหญ่',
    jungleStack: 'สแต็กครีปป่า',
    itemAdviceStarting: (hero, items) => `ไอเทมเริ่มต้นสำหรับ ${hero} แนะนำ ${items}`,
    itemAdviceEarly: (hero, items) => `ไอเทมช่วงต้นเกมสำหรับ ${hero} แนะนำ ${items}`,
    itemAdviceCore: (_hero, items) => `ช่วงกลางเกม แนะนำออก ${items}`,
    itemAdviceLuxury: (_hero, items) => `ช่วงท้ายเกม แนะนำออก ${items}`,
    levelSpike: (level, hero, combo) =>
      `เลเวล ${level} แล้วสำหรับ ${hero}! อัลติเมทพร้อมใช้งาน ทริคคอมโบ: ${combo}`,
    neutralItemMissing: (tier, hero, topItems) =>
      hero && topItems
        ? `ปลดล็อกไอเทมป่า เทียร์ ${tier} แล้ว! สำหรับ ${hero} แนะนำ ${topItems}`
        : `ปลดล็อกไอเทมป่า เทียร์ ${tier} แล้ว ช่องไอเทมป่ายังว่าง อย่าลืมไปเปิดเหรียญป่า`,
    buybackDeficit: (shortfall) =>
      `คำเตือน! ขาดเงินอีก ${shortfall} โกลด์ สำหรับ บายแบ็ค ระวังตัวและเก็บเงินไว้ก่อน`,
    overextendDanger:
      'อันตราย! ศัตรูหายจากมินิแมพและเลือดเหลือน้อย ถอยเข้าป้อมด่วน!',
    pushAdvantage:
      'ศัตรูตายหลายตัว! ได้เปรียบจำนวนคน ดันป้อมหรือเก็บอ็อบเจกต์ทันที',
    counterItemAdvice: (threat, items) =>
      `แก้ทาง ${threat}: แนะนำออก ${items}`,
    talentRecommendation: (level, side, talent, reason) =>
      reason
        ? `เลเวล ${level} แล้ว! แนะนำเลือกฝั่ง${side} ${talent} ${reason}`
        : `เลเวล ${level} แล้ว! แนะนำเลือกฝั่ง${side} ${talent}`,
    wardExpired: 'หวอร์ดหมดอายุแล้ว',
    voiceRoshanRecorded: 'บันทึกเวลาโรชานตายเรียบร้อยแล้ว',
    voiceBkbRecorded: 'เริ่มจับเวลา บีเคบี ศัตรู 90 วินาที',
    voiceUltimateRecorded: (name) => `เริ่มจับเวลาสกิล ${name} ของศัตรู`,
    voiceWardRecorded: 'บันทึกการปักหวอร์ดแล้ว',
    voiceHudToggled: (minimized) => (minimized ? 'ย่อหน้าต่างแล้ว' : 'ขยายหน้าต่างแล้ว'),
    voiceAudioMuted: (muted) => (muted ? 'ปิดเสียงเตือนแล้ว' : 'เปิดเสียงเตือนแล้ว'),
    voiceQueryRune: (name, seconds) =>
      seconds <= 5
        ? `${name} กำลังเกิดแล้ว!`
        : `${name} ในอีก ${seconds} วินาที`,
    voiceQueryRoshan: (status) => `สถานะโรชาน: ${status}`,
    voiceQueryItem: (item) => `ไอเทมแนะนำถัดไป: ${item}`,
    voiceQueryBuyback: (ready, shortfall) =>
      ready
        ? 'บายแบ็คพร้อมใช้งาน'
        : `ยังขาดเงินอีก ${shortfall} โกลด์ สำหรับบายแบ็ค`,
    voiceUnrecognized: 'ไม่พบคำสั่งที่ตรงกัน',
  },
};

function loadStoredSettings(): Partial<AudioSettings> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredSettings(settings: AudioSettings) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

class AudioNotificationService {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    sfxEnabled: true,
    voiceEnabled: true,
    itemAdviceEnabled: true,
    minimapScannerEnabled: false,
    gankAlertsEnabled: true,
    minimapPosition: 'left',
    voiceLanguage: 'en-US',
    tacticalCoachEnabled: true,
    powerSpikeAlertsEnabled: true,
    neutralItemAlertsEnabled: true,
    buybackAlertsEnabled: true,
    counterItemAlertsEnabled: true,
    tpScrollAlertEnabled: true,
    laneAssistantMode: 'auto',
    talentAlertsEnabled: true,
    voiceCommandEnabled: true,
    ...loadStoredSettings(),
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
    saveStoredSettings(this.settings);
  }

  public setSfxEnabled(val: boolean) {
    this.settings.sfxEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setVoiceEnabled(val: boolean) {
    this.settings.voiceEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setItemAdviceEnabled(val: boolean) {
    this.settings.itemAdviceEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setMinimapScannerEnabled(val: boolean) {
    this.settings.minimapScannerEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setGankAlertsEnabled(val: boolean) {
    this.settings.gankAlertsEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setMinimapPosition(pos: 'left' | 'right') {
    this.settings.minimapPosition = pos;
    saveStoredSettings(this.settings);
  }

  public setVoiceLanguage(lang: 'en-US' | 'th-TH') {
    this.settings.voiceLanguage = lang;
    saveStoredSettings(this.settings);
  }

  public setTacticalCoachEnabled(val: boolean) {
    this.settings.tacticalCoachEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setPowerSpikeAlertsEnabled(val: boolean) {
    this.settings.powerSpikeAlertsEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setNeutralItemAlertsEnabled(val: boolean) {
    this.settings.neutralItemAlertsEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setBuybackAlertsEnabled(val: boolean) {
    this.settings.buybackAlertsEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setCounterItemAlertsEnabled(val: boolean) {
    this.settings.counterItemAlertsEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setTpScrollAlertEnabled(val: boolean) {
    this.settings.tpScrollAlertEnabled = val;
    saveStoredSettings(this.settings);
  }

  public setLaneAssistantMode(mode: 'auto' | 'always' | 'disabled') {
    this.settings.laneAssistantMode = mode;
    saveStoredSettings(this.settings);
  }

  public setTalentAlertsEnabled(val: boolean) {
    this.settings.talentAlertsEnabled = val;
    saveStoredSettings(this.settings);
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  private currentAudio: HTMLAudioElement | null = null;

  public stopCurrentVoice() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  /**
   * Play pre-rendered studio audio clip with 100% offline support
   */
  public playClip(clipName: string, langOverride?: 'en-US' | 'th-TH') {
    if (!this.settings.voiceEnabled || typeof window === 'undefined') return;

    this.stopCurrentVoice();

    const lang = langOverride || this.settings.voiceLanguage;
    const folder = lang === 'th-TH' ? 'th' : 'en';
    const audioUrl = `/audio/${folder}/${clipName}.mp3`;

    try {
      const audio = new Audio(audioUrl);
      audio.volume = this.settings.masterVolume;
      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`[AudioService] Could not play local audio clip ${audioUrl}:`, err);
          // Fallback to TTS speak() if audio file fails
          this.speak(this.getClipText(clipName, lang), lang);
        });
      }
    } catch (err) {
      console.warn('[AudioService] Audio creation failed:', err);
      this.speak(this.getClipText(clipName, lang), lang);
    }
  }

  private getClipText(clipName: string, lang: 'en-US' | 'th-TH'): string {
    const phrases = PHRASES[lang];
    switch (clipName) {
      case 'wisdom_shrine': return phrases.wisdomShrine;
      case 'power_rune': return phrases.powerRune;
      case 'water_rune': return phrases.waterRune;
      case 'bounty_rune': return phrases.bountyRune;
      case 'tormentor': return phrases.tormentor;
      case 'roshan_window': return phrases.roshanWindow;
      case 'roshan_guaranteed': return phrases.roshanGuaranteed;
      case 'aegis_expiring': return phrases.aegisExpiring;
      case 'nightfall': return phrases.nightfall;
      case 'daybreak': return phrases.daybreak;
      case 'all_enemies_missing': return phrases.allEnemiesMissing;
      case 'gank_window': return phrases.gankWindowMinute6;
      case 'no_tp_scroll': return phrases.noTpScroll;
      case 'creep_pull_small': return phrases.creepPullSmall;
      case 'creep_pull_large': return phrases.creepPullLarge;
      case 'jungle_stack': return phrases.jungleStack;
      case 'item_advice_test':
        return lang === 'th-TH'
          ? 'ไอเทมช่วงต้นเกมสำหรับ Anti-Mage แนะนำ Quelling Blade, Tango, Power Treads'
          : 'Early game items for Anti-Mage: Quelling Blade, Tango, Power Treads';
      default: return '';
    }
  }

  /**
   * Speak announcement using Web Speech API (TTS) or Online High-Quality Natural TTS Fallback
   */
  public speak(text: string, langOverride?: string) {
    if (!this.settings.voiceEnabled || typeof window === 'undefined' || !text) {
      return;
    }

    this.stopCurrentVoice();

    const targetLang = (langOverride as 'en-US' | 'th-TH') || this.settings.voiceLanguage;

    // Check if native SpeechSynthesis has an actual installed voice for this language
    let hasNativeVoice = false;
    let matchingVoice: SpeechSynthesisVoice | undefined;

    if ('speechSynthesis' in window) {
      try {
        const voices = window.speechSynthesis.getVoices();
        const targetPrefix = targetLang.toLowerCase().split('-')[0];
        matchingVoice =
          voices.find((v) => v.lang.toLowerCase().replace('_', '-') === targetLang.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix));
        hasNativeVoice = Boolean(matchingVoice);
      } catch {}
    }

    if (hasNativeVoice && matchingVoice) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = this.settings.masterVolume;
        utterance.rate = 1.05; // clear and slightly brisk for gaming
        utterance.pitch = 1.0;
        utterance.lang = targetLang;
        utterance.voice = matchingVoice;
        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('[AudioService] SpeechSynthesis error, falling back to online TTS:', err);
      }
    }

    // Fallback: If no native voice installed on Windows (such as Thai on default Windows OS)
    // 1. Try Tauri Native fetch_tts_audio (bypasses browser Referer/CORS blocks 100% via Win32)
    if ('__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          const tl = targetLang.split('-')[0];
          invoke<string>('fetch_tts_audio', { text, lang: tl })
            .then((dataUri) => {
              this.stopCurrentVoice();
              const audio = new Audio(dataUri);
              audio.volume = this.settings.masterVolume;
              this.currentAudio = audio;
              audio.play().catch((err) => {
                console.warn('[AudioService] Native data URI play error:', err);
              });
            })
            .catch((err) => {
              console.warn('[AudioService] Native fetch_tts_audio invoke failed:', err);
            });
        })
        .catch(() => {});
      return;
    }

    // 2. Web browser direct audio stream fallback
    try {
      const tl = targetLang.split('-')[0];
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(text)}`;
      const audio = new Audio(ttsUrl);
      audio.volume = this.settings.masterVolume;
      this.currentAudio = audio;
      const p = audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('[AudioService] Online TTS playback failed:', err);
        });
      }
    } catch (err) {
      console.warn('[AudioService] Failed to initialize online TTS:', err);
    }
  }

  // --- Objective-Specific Alerts (Chime + Speech) ---

  public playWisdomShrineAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(600, now, 0.15, 'sine');
      this.playTone(900, now + 0.1, 0.2, 'sine');
    }
    this.playClip('wisdom_shrine');
  }

  public playPowerRuneAlert(isWaterRune: boolean = false) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(750, now, 0.1, 'sine');
      this.playTone(1050, now + 0.08, 0.15, 'sine');
    }
    this.playClip(isWaterRune ? 'water_rune' : 'power_rune');
  }

  public playBountyRuneAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(987.77, now, 0.08, 'sine');
      this.playTone(1318.51, now + 0.06, 0.18, 'sine');
    }
    this.playClip('bounty_rune');
  }

  public playTormentorAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(440, now, 0.15, 'triangle');
      this.playTone(550, now + 0.1, 0.2, 'triangle');
    }
    this.playClip('tormentor');
  }

  public playRoshanAlert(message: string = 'Roshan respawn window is active') {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(440, now, 0.15, 'sine');
      this.playTone(330, now + 0.1, 0.2, 'sine');
    }
    if (message.toLowerCase().includes('guaranteed')) {
      this.playClip('roshan_guaranteed');
    } else {
      this.playClip('roshan_window');
    }
  }

  public playAegisExpiringAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(550, now, 0.12, 'sine');
      this.playTone(440, now + 0.1, 0.18, 'sine');
    }
    this.playClip('aegis_expiring');
  }

  public playDayNightAlert(isNightfall: boolean) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(400, now, 0.12, 'sine');
      this.playTone(isNightfall ? 300 : 500, now + 0.1, 0.18, 'sine');
    }
    this.playClip(isNightfall ? 'nightfall' : 'daybreak');
  }

  public playItemAdvice(
    heroName: string,
    phase: 'starting' | 'early' | 'core' | 'luxury',
    items: Array<{ displayName: string }>,
    force: boolean = false
  ) {
    if ((!this.settings.itemAdviceEnabled && !force) || items.length === 0) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(520, now, 0.08, 'sine');
      this.playTone(660, now + 0.06, 0.12, 'sine');
    }

    const cleanHero = heroName ? heroName.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ') : '';
    const topItems = items.slice(0, 3).map((i) => i.displayName).join(', ');

    // Fast-path: If it's the standard Anti-Mage test from SettingsModal
    if (
      cleanHero.toLowerCase().includes('anti') &&
      phase === 'early' &&
      topItems.includes('Quelling Blade')
    ) {
      this.playClip('item_advice_test');
      return;
    }

    const lang = this.settings.voiceLanguage;
    const phrases = PHRASES[lang];
    let text = '';
    if (phase === 'starting') {
      text = phrases.itemAdviceStarting(cleanHero, topItems);
    } else if (phase === 'early') {
      text = phrases.itemAdviceEarly(cleanHero, topItems);
    } else if (phase === 'core') {
      text = phrases.itemAdviceCore(cleanHero, topItems);
    } else {
      text = phrases.itemAdviceLuxury(cleanHero, topItems);
    }

    this.speak(text);
  }

  public playAllEnemiesMissingAlert(force: boolean = false) {
    if (!this.settings.minimapScannerEnabled && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(587.33, now, 0.1, 'triangle');
      this.playTone(440, now + 0.08, 0.15, 'triangle');
    }
    this.playClip('all_enemies_missing');
  }

  public playGankWindowAlert(force: boolean = false) {
    if (!this.settings.gankAlertsEnabled && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(440, now, 0.1, 'triangle');
      this.playTone(554.37, now + 0.08, 0.15, 'triangle');
    }
    this.playClip('gank_window');
  }

  public playPowerSpikeAlert(level: number, heroName: string, comboTip: string, force: boolean = false) {
    if ((!this.settings.tacticalCoachEnabled || !this.settings.powerSpikeAlertsEnabled) && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.1, 'sine');
      this.playTone(659.25, now + 0.08, 0.1, 'sine');
      this.playTone(783.99, now + 0.16, 0.2, 'sine');
    }

    const cleanHero = heroName ? heroName.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ') : 'Hero';
    const lang = this.settings.voiceLanguage;
    const text = PHRASES[lang].levelSpike(level, cleanHero, comboTip);
    this.speak(text);
  }

  public playNeutralSlotReminder(
    tier: number,
    heroName?: string,
    topRecommendedItems?: string[] | string,
    force: boolean = false,
  ) {
    if ((!this.settings.tacticalCoachEnabled || !this.settings.neutralItemAlertsEnabled) && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(440, now, 0.1, 'triangle');
      this.playTone(660, now + 0.08, 0.15, 'triangle');
    }

    const cleanHero = heroName ? heroName.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ') : '';
    let itemsTh = '';
    let itemsEn = '';
    if (Array.isArray(topRecommendedItems)) {
      itemsTh = topRecommendedItems.join(' หรือ ');
      itemsEn = topRecommendedItems.join(' or ');
    } else if (typeof topRecommendedItems === 'string') {
      itemsTh = topRecommendedItems;
      itemsEn = topRecommendedItems;
    }

    const lang = this.settings.voiceLanguage;
    const text = PHRASES[lang].neutralItemMissing(tier, cleanHero, lang === 'th-TH' ? itemsTh : itemsEn);
    this.speak(text);
  }

  public playBuybackWarning(shortfall: number, force: boolean = false) {
    if ((!this.settings.tacticalCoachEnabled || !this.settings.buybackAlertsEnabled) && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(330, now, 0.12, 'sine');
      this.playTone(261.63, now + 0.1, 0.2, 'sine');
    }

    const lang = this.settings.voiceLanguage;
    const text = PHRASES[lang].buybackDeficit(shortfall);
    this.speak(text);
  }

  public playNoTpScrollAlert(force: boolean = false) {
    if ((!this.settings.tacticalCoachEnabled || !this.settings.tpScrollAlertEnabled) && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(392, now, 0.1, 'triangle');
      this.playTone(330, now + 0.08, 0.15, 'triangle');
    }

    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].noTpScroll);
  }

  public playOverextendDangerAlert(force: boolean = false) {
    if (!this.settings.tacticalCoachEnabled && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(880, now, 0.12, 'sawtooth');
      this.playTone(440, now + 0.1, 0.18, 'sawtooth');
    }

    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].overextendDanger);
  }

  public playPushAdvantageAlert(force: boolean = false) {
    if (!this.settings.tacticalCoachEnabled && !force) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.1, 'sine');
      this.playTone(783.99, now + 0.08, 0.15, 'sine');
    }

    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].pushAdvantage);
  }

  public playCounterItemAdvice(threat: string, itemNames: string[], force: boolean = false) {
    if ((!this.settings.tacticalCoachEnabled || !this.settings.counterItemAlertsEnabled) && !force) return;
    if (itemNames.length === 0) return;

    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(520, now, 0.08, 'sine');
      this.playTone(660, now + 0.06, 0.12, 'sine');
    }

    const lang = this.settings.voiceLanguage;
    const text = PHRASES[lang].counterItemAdvice(threat, itemNames.join(', '));
    this.speak(text);
  }

  public playCreepPullAlert(isLargeCamp: boolean = false, force: boolean = false) {
    if (this.settings.laneAssistantMode === 'disabled' && !force) return;
    this.initContext();
    const lang = this.settings.voiceLanguage;
    const text = isLargeCamp ? PHRASES[lang].creepPullLarge : PHRASES[lang].creepPullSmall;
    this.speak(text);
  }

  public playJungleStackAlert(force: boolean = false) {
    if (this.settings.laneAssistantMode === 'disabled' && !force) return;
    this.initContext();
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].jungleStack);
  }

  public playTalentAlert(
    level: number,
    pickSide: 'left' | 'right',
    talentName: string,
    reason?: string,
    force: boolean = false,
  ) {
    if ((!this.settings.tacticalCoachEnabled || !this.settings.talentAlertsEnabled) && !force) return;
    this.initContext();
    const lang = this.settings.voiceLanguage;
    const sideLabel = lang === 'th-TH' ? (pickSide === 'left' ? 'ซ้าย' : 'ขวา') : pickSide;
    const text = PHRASES[lang].talentRecommendation(level, sideLabel, talentName, reason);
    this.speak(text);
  }

  public playWardExpiredAlert(force: boolean = false) {
    if (!this.settings.voiceEnabled && !force) return;
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(400, now, 0.1, 'sine');
      this.playTone(300, now + 0.08, 0.15, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].wardExpired);
  }

  public playWarningBeep() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(880, now, 0.12, 'sine');
    }
  }

  public playVoiceCommandChime() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(587.33, now, 0.08, 'sine'); // D5
      this.playTone(880, now + 0.07, 0.12, 'sine'); // A5
    }
  }

  public speakVoiceFeedback(text: string) {
    if (!this.settings.voiceEnabled) return;
    this.speak(text);
  }

  private playTone(freq: number, startTime: number, duration: number, type: OscillatorType) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Softer volume (0.15 * masterVolume) so chimes are gentle and never overpower speech
      gain.gain.setValueAtTime(this.settings.masterVolume * 0.15, startTime);
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
