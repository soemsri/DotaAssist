import { alertProfiles, Objective } from './alertProfiles';
import { VoiceQueue } from './voiceQueue';

export interface ReminderContext {
  id: string;
  objective: Objective;
  target: number;
  label?: string;
  expiresAt?: number;
}

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
  healingLotus: string;
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
    healingLotus: 'Healing Lotus in fifteen seconds',
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
    wisdomShrine: 'รูนวิสดอม EXP ในอีก 30 วินาที',
    powerRune: 'รูนแม่น้ำ ในอีก 20 วินาที',
    waterRune: 'รูนน้ำ ในอีก 20 วินาที',
    bountyRune: 'รูนทอง ในอีก 15 วินาที',
    tormentor: 'บอสทอร์เมนเตอร์ พร้อมเกิดใน 30 วินาที',
    healingLotus: 'ดอกบัวฟื้นฟู ในอีก 15 วินาที',
    roshanWindow: 'ช่วงเวลาเกิดโรชานเริ่มแล้ว',
    roshanGuaranteed: 'โรชานเกิดแล้ว',
    aegisExpiring: 'โล่เอจิส จะหมดอายุในอีก 30 วินาที',
    nightfall: 'กำลังจะเข้าสู่เวลากลางคืน ระยะมองเห็นลดลง ระวังศัตรูดักซุ่ม',
    daybreak: 'กำลังจะเข้าสู่เวลากลางวัน',
    allEnemiesMissing: 'ศัตรูหายไปจากมินิแมพทั้งหมด ระวังตัว',
    gankWindowMinute6: 'นาทีที่ 6 ระวังศัตรูเดินแก๊ง เลนข้างระวังตัว',
    noTpScroll: 'คำเตือน! ไม่มีใบวาป อย่าลืมซื้อใบวาร์ปติดตัว',
    creepPullSmall: 'พูลครีป',
    creepPullLarge: 'พูลครีปใหญ่',
    jungleStack: 'สแต็กครีปป่า',
    itemAdviceStarting: (hero, items) => `ไอเทมเริ่มต้นสำหรับ ${hero} แนะนำ ${items}`,
    itemAdviceEarly: (hero, items) => `ไอเทมช่วงต้นเกมสำหรับ ${hero} แนะนำ ${items}`,
    itemAdviceCore: (_hero, items) => `ช่วงกลางเกม แนะนำออก ${items}`,
    itemAdviceLuxury: (_hero, items) => `ช่วงท้ายเกม แนะนำออก ${items}`,
    levelSpike: (level, hero, combo) =>
      `เลเวล ${level} แล้วสำหรับ ${hero}! อัลติเมทพร้อมใช้งาน คอมโบแนะนำ: ${combo}`,
    neutralItemMissing: (tier, hero, topItems) =>
      hero && topItems
        ? `ปลดล็อกไอเทมป่า เทียร์ ${tier} แล้ว! สำหรับ ${hero} แนะนำ ${topItems}`
        : `ปลดล็อกไอเทมป่า เทียร์ ${tier} แล้ว ช่องไอเทมป่ายังว่าง อย่าลืมไปเปิดเหรียญป่า`,
    buybackDeficit: (shortfall) =>
      `คำเตือน! ขาดเงินอีก ${shortfall} สำหรับบายแบ็ค ระวังตัวและเก็บเงินไว้ก่อน`,
    overextendDanger:
      'อันตราย! ศัตรูหายจากมินิแมพและเลือดเหลือน้อย รีบถอยเข้าป้อมด่วน!',
    pushAdvantage:
      'ศัตรูตายหลายตัว! ได้เปรียบจำนวนคน ดันป้อมหรือยึดพื้นที่ทันที',
    counterItemAdvice: (threat, items) =>
      `แก้ทาง ${threat}: แนะนำออก ${items}`,
    talentRecommendation: (level, side, talent, reason) =>
      reason
        ? `เลเวล ${level} แล้ว! แนะนำเลือกฝั่ง${side} ${talent} ${reason}`
        : `เลเวล ${level} แล้ว! แนะนำเลือกฝั่ง${side} ${talent}`,
    wardExpired: 'วอร์ดหมดอายุแล้ว',
    voiceRoshanRecorded: 'บันทึกเวลาโรชานตายเรียบร้อยแล้ว',
    voiceBkbRecorded: 'เริ่มจับเวลาไอเทม BKB ศัตรู 90 วินาที',
    voiceUltimateRecorded: (name) => `เริ่มจับเวลาสกิล ${name} ของศัตรู`,
    voiceWardRecorded: 'บันทึกการปักวอร์ดแล้ว',
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
        : `ยังขาดเงินอีก ${shortfall} สำหรับบายแบ็ค`,
    voiceUnrecognized: 'ไม่พบคำสั่งที่ตรงกัน',
  },
};

export function formatThaiCountdown(label: string, seconds: number, objective?: Objective): string {
  const norm = label.toLowerCase();
  if (norm.includes('wisdom') || objective === 'rune_wisdom') {
    return `รูน EXP ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('water')) {
    return `รูนน้ำ ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('power') || objective === 'rune_power') {
    return `รูนแม่น้ำ ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('bounty') || objective === 'rune_bounty') {
    return `รูนทอง ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('tormentor') || objective === 'tormentor') {
    return `บอสทอร์เมนเตอร์ เกิดใน ${seconds} วินาที`;
  }
  if (norm.includes('lotus') || objective === 'lotus') {
    return `ดอกบัวฟื้นฟู ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('stack') || objective === 'camp_stack') {
    return `ดึงซ้อนครีปป่า ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('aegis')) {
    return `โล่เอจิส จะหมดอายุในอีก ${seconds} วินาที`;
  }
  if (norm.includes('nightfall')) {
    return `กำลังจะเข้าสู่เวลากลางคืน ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('daybreak')) {
    return `กำลังจะเข้าสู่เวลากลางวัน ในอีก ${seconds} วินาที`;
  }
  if (norm.includes('roshan') || objective === 'roshan') {
    return `โรชาน ในอีก ${seconds} วินาที`;
  }
  return `${label} ในอีก ${seconds} วินาที`;
}

export function normalizeThaiSpeech(text: string): string {
  return text
    .replace(/\bEXP\b/gi, 'อีเอ็กซ์พี')
    .replace(/\bBKB\b/gi, 'บีเคบี')
    .replace(/\bTP\b/gi, 'ทีพี')
    .replace(/\bHP\b/gi, 'เลือด')
    .replace(/\bCS\b/gi, 'ครีป')
    .replace(/\bTier\s*(\d+)/gi, 'เทียร์ $1')
    .replace(/\bAnti-Mage\b/gi, 'แอนตี้เมจ')
    .replace(/\bFaceless Void\b/gi, 'เฟซเลสวอยด์')
    .replace(/\bTidehunter\b/gi, 'ไทด์ฮันเตอร์')
    .replace(/\bEnigma\b/gi, 'อินิกม่า')
    .replace(/\bJuggernaut\b/gi, 'จัดเกอร์น็อต')
    .replace(/\bPhantom Assassin\b/gi, 'แฟนทอม')
    .replace(/\bCrystal Maiden\b/gi, 'คริสตัลไมเดน')
    .replace(/\bWitch Doctor\b/gi, 'วิชด็อกเตอร์')
    .replace(/\bBristleback\b/gi, 'บริสเทิลแบ็ค')
    .replace(/\bInvoker\b/gi, 'อินโวเกอร์')
    .replace(/\bSniper\b/gi, 'สไนเปอร์')
    .replace(/\bQuelling Blade\b/gi, 'ขวานตัดต้นไม้ Quelling Blade')
    .replace(/\bTango\b/gi, 'แทงโก้')
    .replace(/\bPower Treads\b/gi, 'รองเท้าแปลงร่าง Power Treads')
    .replace(/\bBlack King Bar\b/gi, 'บีเคบี')
    .replace(/\bBlink Dagger\b/gi, 'บลิงก์')
    .replace(/\bShiva's Guard\b/gi, 'ชิวาสการ์ด')
    .replace(/\bScythe of Vyse\b/gi, 'คทาเสกแกะ Hex')
    .replace(/หวอร์ด/g, 'วอร์ด')
    .replace(/ใบวาป/g, 'ใบวาร์ป')
    .replace(/พูลครีปใหญ่/g, 'ดึงครีปใหญ่')
    .replace(/พูลครีป/g, 'ดึง ครีป เลน')
    .replace(/ดึงครีปเลน/g, 'ดึง ครีป เลน')
    .replace(/สแต็กครีปป่า/g, 'ดึงซ้อนครีปป่า');
}

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

  private clock: number | null = null;
  private reminder: ReminderContext | null = null;
  private sequence = 0;
  private speechTimeout: ReturnType<typeof setTimeout> | undefined;
  private voiceQueue = new VoiceQueue({
    speak: (text, language, done) => this.startSpeech(text, language, done),
    cancel: () => {
      clearTimeout(this.speechTimeout);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
  }, () => this.clock, alertProfiles.enabled);

  public updateGameClock(clock: number) {
    this.clock = Number.isFinite(clock) ? clock : null;
    this.voiceQueue.reconcile();
  }
  public clearReminders(objective?: Objective) { this.voiceQueue.clear(objective); }
  public withReminder(context: ReminderContext, action: () => void) {
    const previous = this.reminder;
    this.reminder = context;
    try { action(); } finally { this.reminder = previous; }
  }

  constructor() {
    alertProfiles.subscribe(() => this.voiceQueue.reconcile());
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
    this.voiceQueue.setEnabled(val);
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

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (partial.voiceEnabled !== undefined) {
      this.voiceQueue.setEnabled(partial.voiceEnabled);
    }
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

  /** Preview speech and game reminders use the same serial queue. */
  public speak(text: string, langOverride?: string, objective?: Objective) {
    if (!this.settings.voiceEnabled) return;
    const context = this.reminder;
    const targetLang = langOverride ?? this.settings.voiceLanguage;
    this.voiceQueue.enqueue({
      id: context?.id ?? `preview-${++this.sequence}`,
      objective: context?.objective ?? objective,
      priority: context?.target,
      deadline: context?.label ? context.target : undefined,
      expiresAt: context?.expiresAt,
      language: targetLang,
      text: clock => {
        if (context?.label && clock !== null) {
          const remaining = Math.max(0, Math.ceil(context.target - clock));
          if (targetLang.startsWith('th')) {
            return formatThaiCountdown(context.label, remaining, context.objective ?? objective);
          }
          return `${context.label} in ${remaining} seconds`;
        }
        return text;
      },
    });
  }

  private startSpeech(text: string, language: string | undefined, done: () => void) {
    if (typeof window === 'undefined') { done(); return; }
    const targetLang = language ?? this.settings.voiceLanguage;
    const spokenText = targetLang.startsWith('th') ? normalizeThaiSpeech(text) : text;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      done();
    };

    const timeout = setTimeout(() => {
      this.stopCurrentVoice();
      finish();
    }, 15000);
    this.speechTimeout = timeout;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.volume = this.settings.masterVolume;
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.lang = targetLang;
      const voices = window.speechSynthesis.getVoices();
      const targetPrefix = targetLang.toLowerCase().split('-')[0];
      const voice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix));
      if (voice) utterance.voice = voice;

      utterance.onend = finish;
      utterance.onerror = finish;

      // In browser/desktop environment, if requested language is Thai (th-TH) and no Thai voice is installed in Windows:
      if (targetLang.startsWith('th') && !voice && voices.length > 0) {
        if ('__TAURI_INTERNALS__' in window) {
          import('@tauri-apps/api/core')
            .then(({ invoke }) => {
              invoke<string>('fetch_tts_audio', { text: spokenText, lang: 'th' })
                .then((dataUri) => {
                  this.stopCurrentVoice();
                  const audio = new Audio(dataUri);
                  audio.volume = this.settings.masterVolume;
                  this.currentAudio = audio;
                  audio.onended = finish;
                  audio.onerror = finish;
                  audio.play().catch(finish);
                })
                .catch(() => {
                  try { window.speechSynthesis.speak(utterance); } catch { finish(); }
                });
            })
            .catch(() => {
              try { window.speechSynthesis.speak(utterance); } catch { finish(); }
            });
          return;
        }
      }

      try {
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        finish();
        return;
      }
    }

    finish();
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
      case 'healing_lotus':
      case 'lotus': return phrases.healingLotus;
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

  // --- Objective-Specific Alerts (Chime + Speech) ---

  public playWisdomShrineAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(600, now, 0.15, 'sine');
      this.playTone(900, now + 0.1, 0.2, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].wisdomShrine, undefined, 'rune_wisdom');
  }

  public playPowerRuneAlert(isWaterRune: boolean = false) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(750, now, 0.12, 'triangle');
      this.playTone(1050, now + 0.14, 0.2, 'triangle');
    }
    const lang = this.settings.voiceLanguage;
    if (isWaterRune) {
      this.speak(PHRASES[lang].waterRune, undefined, 'rune_power');
    } else {
      this.speak(PHRASES[lang].powerRune, undefined, 'rune_power');
    }
  }

  public playBountyRuneAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(987.77, now, 0.08, 'sine');
      this.playTone(1318.51, now + 0.06, 0.18, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].bountyRune, undefined, 'rune_bounty');
  }

  public playLotusAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.12, 'sine');
      this.playTone(659.25, now + 0.08, 0.12, 'sine');
      this.playTone(783.99, now + 0.16, 0.2, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].healingLotus, undefined, 'lotus');
  }

  public playTormentorAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(440, now, 0.15, 'triangle');
      this.playTone(550, now + 0.1, 0.2, 'triangle');
    }
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].tormentor, undefined, 'tormentor');
  }

  public playRoshanAlert(message: string = 'Roshan respawn window is active') {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(440, now, 0.15, 'sine');
      this.playTone(330, now + 0.1, 0.2, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    let spoken = message;
    if (lang === 'th-TH') {
      const m = message.toLowerCase();
      if (m.includes('window') || m.includes('open') || m.includes('active')) {
        spoken = PHRASES['th-TH'].roshanWindow;
      } else if (m.includes('alive') || m.includes('guaranteed')) {
        spoken = PHRASES['th-TH'].roshanGuaranteed;
      }
    }
    this.speak(spoken, undefined, 'roshan');
  }

  public playAegisExpiringAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(550, now, 0.12, 'sine');
      this.playTone(440, now + 0.1, 0.18, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    this.speak(PHRASES[lang].aegisExpiring, undefined, 'roshan');
  }

  public playDayNightAlert(isNightfall: boolean) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(400, now, 0.12, 'sine');
      this.playTone(isNightfall ? 300 : 500, now + 0.1, 0.18, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    if (isNightfall) {
      this.speak(PHRASES[lang].nightfall, undefined, 'day_night');
    } else {
      this.speak(PHRASES[lang].daybreak, undefined, 'day_night');
    }
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

  public playNeutralTierAlert(tier: number) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.15, 'sine');
      this.playTone(659.25, now + 0.12, 0.25, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    const text = lang === 'th-TH'
      ? `ปลดล็อกไอเทมป่า เทียร์ ${tier} แล้ว`
      : `Neutral items tier ${tier} are now unlocked`;
    this.speak(text, undefined, 'neutral_item');
  }

  public playCampStackAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(493.88, now, 0.12, 'sine');
      this.playTone(587.33, now + 0.1, 0.2, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    const text = lang === 'th-TH'
      ? 'ดึงซ้อนครีปป่า ในอีก 10 วินาที'
      : 'Stack camp in ten seconds';
    this.speak(text, undefined, 'camp_stack');
  }

  public playEnemyUltimateReadyAlert(heroName: string, abilityName?: string) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.15, 'triangle');
      this.playTone(659.25, now + 0.12, 0.25, 'triangle');
    }
    const lang = this.settings.voiceLanguage;
    if (lang === 'th-TH') {
      const ability = abilityName && abilityName !== 'Ultimate' ? abilityName : 'อัลติ';
      this.speak(`สกิล${ability}ของ ${heroName} น่าจะพร้อมใช้งานแล้ว`, undefined, 'enemy_ultimate');
    } else {
      const label = abilityName && abilityName !== 'Ultimate' ? `${heroName} ${abilityName}` : `${heroName} ultimate`;
      this.speak(`${label} is estimated ready`, undefined, 'enemy_ultimate');
    }
  }

  public playEnemyUltimateRecordedAlert(heroName: string) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(700, now, 0.1, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    const text = lang === 'th-TH'
      ? `บันทึกเวลาอัลติของ ${heroName} แล้ว`
      : `${heroName} ultimate recorded`;
    this.speak(text, undefined, 'enemy_ultimate');
  }

  public playLaningMilestoneAlert(minute: number, lastHits: number, paceStatusOrWord: string, _netWorth?: number) {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.12, 'sine');
      this.playTone(659.25, now + 0.1, 0.15, 'sine');
      this.playTone(783.99, now + 0.2, 0.25, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    if (lang === 'th-TH') {
      const paceText = paceStatusOrWord.includes('ahead')
        ? 'เร็วกว่าเป้าหมาย'
        : paceStatusOrWord.includes('behind')
        ? 'ช้ากว่าเป้าหมาย'
        : 'ตามเป้าหมาย';
      const message = minute >= 10
        ? `ครบ 10 นาที: ลาสครีปได้ ${lastHits} ตัว ${paceText} จบช่วงยืนเลนแล้ว`
        : `นาทีที่ ${minute}: ลาสครีปได้ ${lastHits} ตัว ${paceText}`;
      this.speak(message);
    } else {
      const paceText = paceStatusOrWord.includes('pace')
        ? paceStatusOrWord
        : paceStatusOrWord === 'ahead'
        ? 'ahead of pace'
        : paceStatusOrWord === 'behind'
        ? 'behind pace'
        : 'on pace';
      const message = minute >= 10
        ? `Ten minutes: ${lastHits} last hits, ${paceText}. Laning phase complete.`
        : `${minute} minutes: ${lastHits} last hits, ${paceText}.`;
      this.speak(message);
    }
  }

  public playEnemyGlyphActivatedAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(392.00, now, 0.2, 'sawtooth');
      this.playTone(523.25, now + 0.15, 0.3, 'sawtooth');
    }
    const lang = this.settings.voiceLanguage;
    const text = lang === 'th-TH'
      ? 'ศัตรูกดใช้ป้อมอมตะแล้ว'
      : 'Enemy Glyph activated';
    this.speak(text, undefined, 'enemy_glyph');
  }

  public playEnemyGlyphReadyAlert() {
    this.initContext();
    if (this.settings.sfxEnabled && this.ctx) {
      const now = this.ctx.currentTime;
      this.playTone(523.25, now, 0.15, 'sine');
      this.playTone(659.25, now + 0.12, 0.25, 'sine');
    }
    const lang = this.settings.voiceLanguage;
    const text = lang === 'th-TH'
      ? 'ป้อมอมตะของศัตรูพร้อมใช้งานแล้ว'
      : 'Enemy Glyph is ready';
    this.speak(text, undefined, 'enemy_glyph');
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
