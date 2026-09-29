import {
  TacticalCoachState,
  TacticalDangerLevel,
  PowerSpikeMilestone,
  EnemyThreatAnalysis,
  BuybackStatusInfo,
  NeutralSlotStatusInfo,
  TpScrollStatusInfo,
  MacroStrategyPhase,
  HeroTalentsAnalysis,
  HeroSkillBuildAnalysis,
  VisionAdvisorState,
  NextActionItem,
  PreRuneShoveInfo,
  AntiWanderingRoamInfo,
  PowerSpikeActionInfo,
  HighGroundSiegeInfo,
} from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { MinimapScanResult } from './minimapScanner';
import { audioService } from './audioService';
import { getEnemyPickClasses } from './draftService';
import { neutralAdvisor, getHeroArchetype, isSupportHero } from './neutralAdvisor';
import { talentAdvisor } from './talentAdvisor';
import { skillAdvisor } from './skillAdvisor';
import { visionEngine } from './visionEngine';
import { alertProfiles } from './alertProfiles';
import { isBlinkDaggerHero, hasEquippedBlink } from './heroItemUtils';

// Standard Neutral Item Unlocks
const NEUTRAL_TIERS = [
  { tier: 1, startSeconds: 420 },   // 7:00
  { tier: 2, startSeconds: 1020 },  // 17:00
  { tier: 3, startSeconds: 1620 },  // 27:00
  { tier: 4, startSeconds: 2220 },  // 37:00
  { tier: 5, startSeconds: 3600 },  // 60:00
];

// Popular hero ultimate combo tips
const HERO_COMBOS: Record<string, { en: string; th: string }> = {
  antimage: {
    en: 'Blink on low-mana target -> Mana Void burst',
    th: 'บลิงก์เข้าหาตัวที่มานาเหลือน้อย -> กด Mana Void ระเบิดดาเมจ',
  },
  axe: {
    en: "Blink -> Berserker's Call -> Blade Mail -> Culling Blade",
    th: "บลิงก์ -> Berserker's Call -> กด Blade Mail -> ปิดด้วย Culling Blade",
  },
  juggernaut: {
    en: 'Blade Fury for magic immunity, Omnislash on isolated solo targets',
    th: 'Blade Fury กันเวท, ใช้ Omnislash เมื่อศัตรูอยู่เดี่ยวๆ ไม่ให้หารดาเมจ',
  },
  clinkz: {
    en: 'Tar Bomb + Strafe burst -> Death Pact for bonus damage/HP',
    th: 'ปา Tar Bomb + กด Strafe ยิงรัว -> เสริมด้วย Death Pact เพิ่มเลือดและดาเมจ',
  },
  lion: {
    en: 'Hex disable -> Earth Spike stun -> Finger of Death burst',
    th: 'เสก Hex -> แทงสตั๊น Earth Spike -> ปิดฉากด้วย Finger of Death',
  },
  pudge: {
    en: 'Meat Hook catch -> Dismember lockdown -> Rot slow',
    th: 'ดึง Meat Hook -> กัด Dismember ขังไว้ -> เปิด Rot สโลว์',
  },
  phantom_assassin: {
    en: 'Phantom Strike jump -> Stifling Dagger slow -> Coup de Grace crits',
    th: 'วาร์ปฟัน Phantom Strike -> ปามีดชะลอ -> สับติดคริ Coup de Grace',
  },
  faceless_void: {
    en: 'Time Walk initiate -> Chronosphere high-priority enemies',
    th: 'กระโดด Time Walk -> กางโดม Chronosphere ขังตัวสำคัญ',
  },
  legion_commander: {
    en: 'Blink -> Press The Attack -> Blade Mail -> Duel',
    th: 'บลิงก์ -> บัฟ Press The Attack -> เปิด Blade Mail -> ท้าดวล Duel',
  },
  invoker: {
    en: 'Cold Snap + Sun Strike or Chaos Meteor + Deafening Blast',
    th: 'Cold Snap + Sun Strike หรือปล่อยลูกไฟ Meteor + คลื่นลม Blast',
  },
  enigma: {
    en: 'Blink -> Midnight Pulse -> Black Hole on multiple enemies',
    th: 'บลิงก์ -> วางหลุมดำ Midnight Pulse -> ดูด Black Hole ล็อกทั้งทีม',
  },
  tidehunter: {
    en: 'Blink -> Ravage large teamfight initiation',
    th: 'บลิงก์ -> เสกหนาม Ravage เปิดไฟต์ทีมใหญ่',
  },
  witch_doctor: {
    en: 'Paralyzing Cask stun bounce -> Maledict curse -> Death Ward',
    th: 'ปาหัวกะโหลกชิ่ง -> สาป Maledict -> ปักเสา Death Ward ยิงแหลก',
  },
  crystal_maiden: {
    en: 'Frostbite root -> Crystal Nova slow -> Freezing Field channel',
    th: 'แช่แข็ง Frostbite -> สโลว์ Nova -> ร่ายพายุหิมะ Freezing Field',
  },
  sniper: {
    en: 'Keep safe range, Shrapnel zone control, Assassinate low-HP runners',
    th: 'ยืนยิงระยะปลอดภัย, โปรย Shrapnel คุมโซน, ส่อง Assassinate ตัวเลือดน้อย',
  },
  drow_ranger: {
    en: 'Gust silence away divers -> Multishot wave -> Marksmanship procs',
    th: 'พัดลม Gust ใบ้ตัวเข้าหา -> สาดธนู Multishot -> ยิงทะลุเกราะ Marksmanship',
  },
  lina: {
    en: 'Light Strike Array stun -> Dragon Slave -> Laguna Blade finish',
    th: 'เสกไฟสตั๊น -> พ่นมังกร Dragon Slave -> ฟาดสายฟ้า Laguna Blade',
  },
  bristleback: {
    en: 'Face back to attackers, spam Quill Spray + Goo slow',
    th: 'หันหลังรับดาเมจ, กดสแปมหนาม Quill Spray + พ่นน้ำลาย Goo สโลว์',
  },
};

export class TacticalCoachEngine {
  private lastProcessedLevel: number = 0;
  private lastAnnouncedTier: number = 0;
  private lastDangerAlertTime: number = 0;
  private lastBuybackAlertTime: number = 0;
  private lastTpAlertTime: number = 0;
  private lastDraftThreatAlertDone: boolean = false;
  private lastMatchId: string | null = null;
  private playedLaneAlerts: Set<string> = new Set();
  private announcedTalentLevels: Set<number> = new Set();
  private playedRuneShoveAlerts: Set<string> = new Set();
  private lastAntiWanderingAlertTime: number = 0;
  private lastNearItemAlertTime: number = 0;
  private lastHighGroundAlertTime: number = 0;
  private announcedLevel6Spike: boolean = false;
  private lastCacheKey: string | null = null;
  private lastCachedResult: TacticalCoachState | null = null;
  private lastAnnouncedActions: Map<string, number> = new Map();
  private lastHpDropSample: { hp: number; time: number } | null = null;

  public reset() {
    this.lastProcessedLevel = 0;
    this.lastAnnouncedTier = 0;
    this.lastDangerAlertTime = 0;
    this.lastBuybackAlertTime = 0;
    this.lastTpAlertTime = 0;
    this.lastDraftThreatAlertDone = false;
    this.lastMatchId = null;
    this.playedLaneAlerts.clear();
    this.announcedTalentLevels.clear();
    this.lastAnnouncedActions.clear();
    this.lastHpDropSample = null;
    this.playedRuneShoveAlerts.clear();
    this.lastAntiWanderingAlertTime = 0;
    this.lastNearItemAlertTime = 0;
    this.lastHighGroundAlertTime = 0;
    this.announcedLevel6Spike = false;
    visionEngine.reset();
    this.lastCacheKey = null;
    this.lastCachedResult = null;
  }

  /**
   * Main pipeline: Evaluates state from GSI and Minimap, triggers timely voice alerts,
   * and returns structured coaching state for UI rendering.
   */
  public process(
    payload: GSIPayload | null,
    minimapResult: MinimapScanResult | null,
  ): TacticalCoachState {
    const map = payload?.map;
    const hero = payload?.hero;
    const player = payload?.player;
    const items = payload?.items;
    const draft = payload?.draft;

    const matchId = map?.matchid?.trim() || null;
    if (matchId && this.lastMatchId && matchId !== this.lastMatchId) {
      this.reset();
    }
    if (matchId) this.lastMatchId = matchId;

    const clockTime = Math.max(0, Math.floor(map?.clock_time ?? 0));
    const isGameActive = map?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS';

    const heroLevel = hero?.level || 0;
    const heroHp = hero?.health_percent ?? 100;
    const heroAlive = hero?.alive !== false;
    const gold = player?.gold ?? 0;
    const miaSig = minimapResult ? `${minimapResult.scanned}:${minimapResult.all_missing}` : 'none';
    const itemsSig = items
      ? `${items.teleport0?.name || ''}:${items.neutral0?.name || ''}:${items.slot0?.name || ''}:${items.slot1?.name || ''}:${items.slot2?.name || ''}:${items.slot3?.name || ''}:${items.slot4?.name || ''}:${items.slot5?.name || ''}`
      : 'none';
    const abilitiesSig = payload?.abilities ? Object.entries(payload.abilities).map(([k, v]) => `${k}:${v?.level ?? 0}`).join(',') : 'none';
    const wardsPlaced = player?.wards_placed ?? 0;
    const draftLen = draft ? Object.keys(draft).length : 0;
    const settings = audioService.getSettings();
    const laneMode = settings.laneAssistantMode;
    const lang = settings.voiceLanguage;
    const activeRole = alertProfiles.getSnapshot().active;

    // 0. Combat Detection & Suppression
    const inCombat = this.evaluateCombatState(hero, clockTime);
    audioService.setCombatState(inCombat);

    const cacheKey = `${matchId ?? ''}:${clockTime}:${hero?.name ?? ''}:${heroLevel}:${heroHp}:${heroAlive}:${gold}:${miaSig}:${itemsSig}:${abilitiesSig}:${wardsPlaced}:${draftLen}:${laneMode}:${lang}:${activeRole}:${inCombat}`;

    if (this.lastCacheKey === cacheKey && this.lastCachedResult) {
      return this.lastCachedResult;
    }

    // 1. Evaluate Player Inventory
    const equippedItemKeys = this.getEquippedItemKeys(items);

    // 2. Pillar 2: Power Spike & Skill Combos
    const powerSpike = this.evaluatePowerSpikes(hero, isGameActive);

    // 3. Pillar 4a: Neutral Item Slot
    const neutralSlot = this.evaluateNeutralSlot(clockTime, items, hero, isGameActive);

    // 4. Pillar 4b: Buyback Economy
    const buyback = this.evaluateBuyback(clockTime, hero, player, isGameActive);

    // 4c: Town Portal Scroll Status
    const tpScroll = this.evaluateTpScroll(clockTime, items, hero, isGameActive);

    // 4d: Lane Assistant (Creep Pull & Stack Voice Alerts for Support heroes)
    this.evaluateLaneAssistant(clockTime, hero, isGameActive);

    // 5. Pillar 1: Danger & Lane Coach
    const { dangerLevel, dangerReasons } = this.evaluateDanger(
      clockTime,
      hero,
      minimapResult,
      isGameActive,
    );

    // 6. Pillar 3: Adaptive Counter-Items
    const threats = this.evaluateCounterItems(draft, player?.team_name, equippedItemKeys);

    // Trigger initial counter recommendation voice callout once around 1:00
    if (isGameActive && clockTime >= 60 && clockTime <= 90 && !this.lastDraftThreatAlertDone && threats.length > 0) {
      this.lastDraftThreatAlertDone = true;
      const primaryThreat = threats[0];
      const topItems = primaryThreat.recommendedCounters.slice(0, 2).map((i) => i.displayName);
      audioService.playCounterItemAdvice(primaryThreat.threatName, topItems);
    }

    // 7. Pillar 5: Macro Strategy
    const macroPhase = this.evaluateMacroPhase(clockTime);

    // 8. Adaptive Talent Tree Advisor (Levels 10, 15, 20, 25)
    const talentTiers = talentAdvisor.getTalentRecommendations(hero?.name || '', threats);
    const activeMilestoneAdvice = talentAdvisor.getTalentAdviceForLevel(hero?.level || 1, talentTiers);
    const talentAnalysis: HeroTalentsAnalysis = {
      heroName: hero?.name || '',
      tiers: talentTiers,
      activeMilestoneAdvice,
    };

    // Voice announcement on reaching milestone levels 10, 15, 20, 25
    const currentHeroLevel = hero?.level || 1;
    if (isGameActive && currentHeroLevel >= 10) {
      const milestones: Array<10 | 15 | 20 | 25> = [10, 15, 20, 25];
      for (const m of milestones) {
        if (currentHeroLevel >= m && !this.announcedTalentLevels.has(m)) {
          this.announcedTalentLevels.add(m);
          const advice = talentTiers.find((t) => t.level === m);
          if (advice) {
            const isThai = audioService.getSettings().voiceLanguage === 'th-TH';
            const talentChoice = advice.recommended === 'left' ? advice.left : advice.right;
            const talentText = isThai ? (talentChoice.th || talentChoice.en) : talentChoice.en;
            const reason = isThai ? advice.reasonTh : advice.reasonEn;
            audioService.playTalentAlert(m, advice.recommended, talentText, reason);
          }
        }
      }
    }
 
    // 9. Dynamic Skill Build & Level-up Advisor (Visual-only HUD banner, no voice announcement)
    const skillBuildAnalysis: HeroSkillBuildAnalysis | undefined = payload ? skillAdvisor.evaluateSkillBuild(payload, threats) || undefined : undefined;

    // 10. Smart Ward Placement & Vision Timer (Automatic GSI tracking & expiry alert)
    const visionState: VisionAdvisorState = visionEngine.process(payload, clockTime);

    // 11. Smart Next Action evaluation
    const nextAction = this.evaluateNextAction(
      clockTime,
      hero,
      player,
      neutralSlot,
      tpScroll,
      buyback,
      inCombat,
      isGameActive,
    );

    // 12. Smurf/Immortal Coaching Insights (BalloonDota principles)
    // 12a: Pre-Rune Wave Shove (:40 before 2, 4, 6, 8, 10m)
    const preRuneShove = this.evaluatePreRuneShove(clockTime, isGameActive);

    // 12b: Anti-Wandering & Roam Punish (3:00 - 10:00)
    const antiWanderingRoam = this.evaluateAntiWandering(clockTime, minimapResult, isGameActive);

    // 12c: Power Spike Actionability & Near-Item Caution
    const powerSpikeAction = this.evaluatePowerSpikeAction(
      clockTime,
      hero,
      player,
      threats,
      equippedItemKeys,
      isGameActive,
    );

    // 12d: High Ground Siege Discipline (>= 20:00 Aegis Check)
    const highGroundSiege = this.evaluateHighGroundSiege(clockTime, equippedItemKeys, isGameActive);

    const result: TacticalCoachState = {
      dangerLevel,
      dangerReasons,
      powerSpike,
      threats,
      buyback,
      neutralSlot,
      tpScroll,
      macroPhase,
      talentAnalysis,
      skillBuildAnalysis,
      visionState,
      nextAction,
      inCombat,
      preRuneShove,
      antiWanderingRoam,
      powerSpikeAction,
      highGroundSiege,
    };

    this.lastCacheKey = cacheKey;
    this.lastCachedResult = result;
    return result;
  }

  // --- Evaluation Logic Helpers ---

  private evaluateCombatState(hero: GSIPayload['hero'], clockTime: number): boolean {
    if (!hero || hero.alive === false) {
      this.lastHpDropSample = null;
      return false;
    }
    const hp = hero.health_percent ?? 100;
    const isStunnedOrDisabled = Boolean(
      hero.stunned || hero.silenced || hero.hexed || hero.disarmed || hero.muted
    );
    const isCriticalHp = hp < 30;

    let rapidHpDrop = false;
    if (this.lastHpDropSample) {
      const dt = clockTime - this.lastHpDropSample.time;
      if (dt > 0 && dt <= 3) {
        if (this.lastHpDropSample.hp - hp >= 15) {
          rapidHpDrop = true;
        }
      }
      if (dt > 3 || dt < 0) {
        this.lastHpDropSample = { hp, time: clockTime };
      }
    } else {
      this.lastHpDropSample = { hp, time: clockTime };
    }

    return isStunnedOrDisabled || isCriticalHp || rapidHpDrop;
  }

  private evaluateNextAction(
    clockTime: number,
    hero: GSIPayload['hero'],
    player: GSIPayload['player'],
    neutralSlot: NeutralSlotStatusInfo,
    tpScroll: TpScrollStatusInfo,
    buyback: BuybackStatusInfo,
    inCombat: boolean,
    isGameActive: boolean,
  ): NextActionItem | null {
    if (!isGameActive) return null;

    const activeRole = alertProfiles.getSnapshot().active;
    const heroHp = hero?.health_percent ?? 100;
    const heroAlive = hero?.alive !== false;
    const candidates: NextActionItem[] = [];

    // 1. TORMENTOR_SPAWN (Priority: 95)
    // 30s before spawn at 20:00 (1200s): 1170s to 1220s
    if (clockTime >= 1170 && clockTime <= 1220) {
      candidates.push({
        id: 'TORMENTOR_SPAWN',
        category: 'objective',
        urgency: 'urgent',
        titleEn: 'Tormentor Boss Spawning',
        titleTh: 'บอส Tormentor กำลังเกิด',
        shortPillEn: '🛡️ Tormentor Ready',
        shortPillTh: '🛡️ ทอร์เมนเตอร์เกิด',
        icon: '🛡️',
        voiceEn: 'Tormentor ready in thirty seconds',
        voiceTh: 'บอสทอร์เมนเตอร์ พร้อมเกิดใน 30 วินาที',
        priorityScore: 95,
        expiresAtClockTime: 1220,
      });
    }

    // 2. WISDOM_RUNE (Priority: 90)
    // Every 7 minutes (420s): 7:00 (420), 14:00 (840), 21:00 (1260)...
    // Window: 30s before (:30) to 15s after (:15)
    if (clockTime >= 390) {
      const secInCycle = clockTime % 420;
      if (secInCycle >= 390 || secInCycle <= 15) {
        candidates.push({
          id: 'WISDOM_RUNE',
          category: 'macro',
          urgency: 'urgent',
          titleEn: 'Secure Wisdom Rune',
          titleTh: 'คุมรูนปัญญา Wisdom Shrine',
          shortPillEn: '⚡ Wisdom Rune',
          shortPillTh: '⚡ รูนปัญญา EXP',
          icon: '⚡',
          voiceEn: 'Wisdom Shrine in thirty seconds',
          voiceTh: 'รูนวิสดอม EXP ในอีก 30 วินาที',
          priorityScore: 90,
        });
      }
    }

    // 3. UNRELIABLE_GOLD_RISK (Priority: 88)
    // High unreliable gold when health is in danger zone (<40%)
    const unreliableGold = player?.gold_unreliable !== undefined ? player.gold_unreliable : (player?.gold ?? 0);
    if (heroAlive && unreliableGold >= 1200 && heroHp < 40) {
      candidates.push({
        id: 'UNRELIABLE_GOLD_RISK',
        category: 'economy',
        urgency: 'urgent',
        titleEn: 'High Unreliable Gold at Risk',
        titleTh: 'เสี่ยงเสียทองก่อนตาย รีบซื้อไอเทม',
        shortPillEn: '💰 Spend Gold Now',
        shortPillTh: '💰 รีบใช้เงินซื้อของ',
        icon: '💰',
        voiceEn: 'Warning: High unreliable gold, spend before dying',
        voiceTh: 'ระวังเงินหล่น รีบใช้เงินซื้อไอเทมก่อนตาย',
        priorityScore: 88,
      });

      // Trigger voice alert with 90s cooldown
      const lastAlert = this.lastAnnouncedActions.get('UNRELIABLE_GOLD_RISK') ?? -9999;
      if (clockTime - lastAlert >= 90 && !inCombat) {
        this.lastAnnouncedActions.set('UNRELIABLE_GOLD_RISK', clockTime);
        audioService.playUnreliableGoldAlert();
      }
    }

    // 4. NEUTRAL_TIER (Priority: 85)
    // Neutral slot unlocked and empty
    if (neutralSlot.tierUnlocked > 0 && neutralSlot.isSlotEmpty) {
      candidates.push({
        id: 'NEUTRAL_TIER',
        category: 'item',
        urgency: 'urgent',
        titleEn: `Equip Tier ${neutralSlot.tierUnlocked} Neutral Item`,
        titleTh: `ใส่ไอเทมป่าเทียร์ ${neutralSlot.tierUnlocked}`,
        shortPillEn: `📦 Equip Neutral T${neutralSlot.tierUnlocked}`,
        shortPillTh: `📦 ใส่ไอเทมป่า T${neutralSlot.tierUnlocked}`,
        icon: '📦',
        voiceEn: `Tier ${neutralSlot.tierUnlocked} neutral items unlocked!`,
        voiceTh: `ไอเทมป่าเทียร์ ${neutralSlot.tierUnlocked} ปลดล็อกแล้ว!`,
        priorityScore: 85,
      });
    }

    // 5. NO_TP_SCROLL (Priority: 80)
    // Alive, out of fountain, no TP
    if (tpScroll.alertActive) {
      candidates.push({
        id: 'NO_TP_SCROLL',
        category: 'utility',
        urgency: 'urgent',
        titleEn: 'Missing Town Portal Scroll',
        titleTh: 'ไม่มีใบวาปติดตัว รีบซื้อติดตัวไว้',
        shortPillEn: '📜 Buy TP Scroll',
        shortPillTh: '📜 ซื้อใบวาร์ป',
        icon: '📜',
        voiceEn: 'Warning: No Town Portal Scroll!',
        voiceTh: 'คำเตือน! ไม่มีใบวาปติดตัว',
        priorityScore: 80,
      });
    }

    // 6. LOTUS_HARVEST (Priority: 75)
    // Lotus pool spawns every 3m (180s): 3:00 (180), 6:00 (360), 9:00 (540)...
    // Window: 15s before (:45) to 10s after (:10)
    if (clockTime >= 165) {
      const secInCycle = clockTime % 180;
      if (secInCycle >= 165 || secInCycle <= 10) {
        candidates.push({
          id: 'LOTUS_HARVEST',
          category: 'macro',
          urgency: 'info',
          titleEn: 'Harvest Lotus Pool',
          titleTh: 'เก็บดอกบัวที่สระ Healing Lotus',
          shortPillEn: '🌿 Harvest Lotus',
          shortPillTh: '🌿 เก็บดอกบัว',
          icon: '🌿',
          voiceEn: 'Healing Lotus in fifteen seconds',
          voiceTh: 'ดอกบัวฟื้นฟู ในอีก 15 วินาที',
          priorityScore: 75,
        });
      }
    }

    // 7. CAMP_STACK (Priority: 70)
    // Relevant for support or offlane during laning phase / early mid game
    // Stack timing window: :48 to :55
    if (activeRole === 'support' || activeRole === 'offlane') {
      if (clockTime >= 60 && clockTime <= 1200) {
        const secInMin = clockTime % 60;
        if (secInMin >= 48 && secInMin <= 55) {
          candidates.push({
            id: 'CAMP_STACK',
            category: 'laning',
            urgency: 'info',
            titleEn: 'Stack Jungle Camps',
            titleTh: 'ดึงสแต็กแคมป์ครีปป่า',
            shortPillEn: '🎯 Stack Camp (:53)',
            shortPillTh: '🎯 สแต็กครีปป่า (:53)',
            icon: '🎯',
            voiceEn: 'Stack jungle camp',
            voiceTh: 'สแต็กครีปป่า',
            priorityScore: 70,
          });
        }
      }
    }

    // 8. BUYBACK_STATUS (Priority: 65)
    // Deficit during mid/late game (>= 25 mins)
    if (clockTime >= 1500 && buyback.state === 'deficit') {
      candidates.push({
        id: 'BUYBACK_STATUS',
        category: 'economy',
        urgency: 'info',
        titleEn: `Need ${buyback.deficit}g for Buyback`,
        titleTh: `ยังขาดเงินอีก ${buyback.deficit} สำหรับบายแบ็ค`,
        shortPillEn: '⚠️ No Buyback Gold',
        shortPillTh: '⚠️ เงินบายแบ็คไม่พอ',
        icon: '⚠️',
        voiceEn: 'Warning: Need more gold for buyback',
        voiceTh: 'ยังขาดเงินสำหรับบายแบ็ค',
        priorityScore: 65,
      });
    }

    if (candidates.length === 0) return null;

    // Sort by priorityScore descending
    candidates.sort((a, b) => b.priorityScore - a.priorityScore);
    return candidates[0];
  }

  private evaluatePowerSpikes(
    hero: GSIPayload['hero'],
    isGameActive: boolean,
  ): PowerSpikeMilestone | null {
    if (!hero || !hero.name) return null;

    const currentLevel = hero.level || 1;
    const cleanHeroKey = hero.name.replace(/^npc_dota_hero_/, '').toLowerCase();
    const combo = HERO_COMBOS[cleanHeroKey] || {
      en: 'Coordinate ultimate with your allies',
      th: 'ประสานงานใช้สกิลอัลติเมทพร้อมกับเพื่อนในทีม',
    };

    const lang = audioService.getSettings().voiceLanguage;
    const comboText = lang === 'th-TH' ? combo.th : combo.en;

    // Trigger voice alert when passing milestone levels 6, 12, 18
    if (isGameActive && this.lastProcessedLevel > 0) {
      if (currentLevel >= 6 && this.lastProcessedLevel < 6) {
        audioService.playPowerSpikeAlert(6, cleanHeroKey, comboText);
      } else if (currentLevel >= 12 && this.lastProcessedLevel < 12) {
        audioService.playPowerSpikeAlert(12, cleanHeroKey, comboText);
      } else if (currentLevel >= 18 && this.lastProcessedLevel < 18) {
        audioService.playPowerSpikeAlert(18, cleanHeroKey, comboText);
      }
    }
    this.lastProcessedLevel = currentLevel;

    // Current spike milestone status
    let spikeName = 'Level 6 Ultimate';
    if (currentLevel >= 18) spikeName = 'Max Level 18 Ultimate';
    else if (currentLevel >= 12) spikeName = 'Rank 2 Level 12 Ultimate';
    else if (currentLevel >= 6) spikeName = 'Rank 1 Level 6 Ultimate';

    return {
      level: currentLevel,
      isUnlocked: currentLevel >= 6,
      spikeName,
      comboTip: comboText,
    };
  }

  private evaluateNeutralSlot(
    clockTime: number,
    items: GSIPayload['items'],
    hero: GSIPayload['hero'],
    isGameActive: boolean,
  ): NeutralSlotStatusInfo {
    let tierUnlocked = 0;
    let nextTierSeconds = 420;

    for (const t of NEUTRAL_TIERS) {
      if (clockTime >= t.startSeconds) {
        tierUnlocked = t.tier;
      } else {
        nextTierSeconds = t.startSeconds - clockTime;
        break;
      }
    }

    const neutralItem = items?.neutral0;
    const isSlotEmpty = !neutralItem?.name || neutralItem.name === 'empty';
    const equippedItemName = isSlotEmpty ? null : neutralItem.name.replace(/^item_/, '').replace(/_/g, ' ');

    const heroKey = hero?.name || 'hero';
    const activeTier = tierUnlocked > 0 ? tierUnlocked : 1;
    const archetypeInfo = getHeroArchetype(heroKey);
    const heroRole = audioService.getSettings().voiceLanguage === 'th-TH' ? archetypeInfo.roleLabelTh : archetypeInfo.roleLabelEn;
    const recommendations = neutralAdvisor.getRecommendations(heroKey, activeTier);
    const allTierRecommendations = neutralAdvisor.getAllTierRecommendations(heroKey);

    let alertActive = false;
    if (tierUnlocked > 0 && isSlotEmpty) {
      alertActive = true;
      // Trigger voice alert once per tier unlock window (within 60s of tier start)
      if (isGameActive && tierUnlocked > this.lastAnnouncedTier) {
        this.lastAnnouncedTier = tierUnlocked;
        const heroClean = hero?.name ? hero.name.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ') : undefined;
        const topItems = recommendations.slice(0, 2).map((r) => r.displayName).join(', ');
        audioService.playNeutralSlotReminder(tierUnlocked, heroClean, topItems);
      }
    }

    return {
      tierUnlocked,
      nextTierSeconds: Math.max(0, nextTierSeconds),
      isSlotEmpty,
      equippedItemName,
      alertActive,
      heroRole,
      recommendations,
      allTierRecommendations,
    };
  }

  private evaluateBuyback(
    clockTime: number,
    hero: GSIPayload['hero'],
    player: GSIPayload['player'],
    isGameActive: boolean,
  ): BuybackStatusInfo {
    if (clockTime < 1200 || !hero || !player) {
      return {
        state: 'early_game',
        buybackCost: hero?.buyback_cost || 0,
        currentGold: player?.gold || 0,
        deficit: 0,
        cooldownRemaining: hero?.buyback_cooldown || 0,
      };
    }

    const cost = hero.buyback_cost || 0;
    const gold = player.gold || 0;
    const cooldown = hero.buyback_cooldown || 0;
    const deficit = Math.max(0, cost - gold);

    let state: BuybackStatusInfo['state'] = 'ready';
    if (cooldown > 0) {
      state = 'cooldown';
    } else if (deficit > 0) {
      state = 'deficit';
      // Voice alert: In late game (>=25m), alert at most once every 3 minutes (180s)
      if (isGameActive && clockTime >= 1500 && clockTime - this.lastBuybackAlertTime >= 180) {
        this.lastBuybackAlertTime = clockTime;
        audioService.playBuybackWarning(deficit);
      }
    }

    return {
      state,
      hasBuyback: state === 'ready',
      buybackCost: cost,
      currentGold: gold,
      deficit,
      cooldownRemaining: cooldown,
    };
  }

  private evaluateTpScroll(
    clockTime: number,
    items: GSIPayload['items'],
    hero: GSIPayload['hero'],
    isGameActive: boolean,
  ): TpScrollStatusInfo {
    let hasTp = false;
    let charges = 0;
    let cooldownRemaining = 0;
    let isTravelBoots = false;

    // 1. Check dedicated teleport slot
    const tpSlot = items?.teleport0;
    if (tpSlot?.name && tpSlot.name !== 'empty') {
      if (tpSlot.name === 'item_travel_boots' || tpSlot.name === 'item_travel_boots_2') {
        hasTp = true;
        isTravelBoots = true;
        charges = 1;
        cooldownRemaining = tpSlot.cooldown || 0;
      } else if (tpSlot.name === 'item_tpscroll') {
        const c = typeof tpSlot.charges === 'number' ? tpSlot.charges : 1;
        if (c > 0) {
          hasTp = true;
          charges += c;
        }
        cooldownRemaining = tpSlot.cooldown || 0;
      }
    }

    // 2. Check main inventory and backpack for Boots of Travel or TP scrolls
    const allSlots = [
      items?.slot0, items?.slot1, items?.slot2, items?.slot3, items?.slot4, items?.slot5,
      items?.backpack0, items?.backpack1, items?.backpack2,
    ];
    for (const slot of allSlots) {
      if (!slot?.name || slot.name === 'empty') continue;
      if (slot.name === 'item_travel_boots' || slot.name === 'item_travel_boots_2') {
        hasTp = true;
        isTravelBoots = true;
        charges = Math.max(charges, 1);
        if (slot.cooldown && !cooldownRemaining) {
          cooldownRemaining = slot.cooldown;
        }
      } else if (slot.name === 'item_tpscroll') {
        const c = typeof slot.charges === 'number' ? slot.charges : 1;
        if (c > 0) {
          hasTp = true;
          charges += c;
        }
      }
    }

    // 3. Alert rules:
    // - Hero must be alive (dead heroes automatically receive 1 free TP scroll on respawn)
    // - Game must be active and clockTime >= 60s
    // - hasTp is false
    const isAlive = hero ? hero.alive !== false : true;
    let alertActive = false;

    if (isGameActive && clockTime >= 60 && isAlive && !hasTp) {
      alertActive = true;
      // Trigger voice warning with cooldown (75 seconds)
      if (clockTime - this.lastTpAlertTime >= 75) {
        this.lastTpAlertTime = clockTime;
        audioService.playNoTpScrollAlert();
      }
    }

    return {
      hasTp,
      charges,
      cooldownRemaining,
      isTravelBoots,
      alertActive,
    };
  }

  private evaluateLaneAssistant(
    clockTime: number,
    hero: GSIPayload['hero'],
    isGameActive: boolean,
  ) {
    // Active during Laning Phase: 1:00 (60s) to 10:00 (600s). First neutrals spawn at 1:00.
    if (!isGameActive || clockTime < 60 || clockTime > 600) return;
    if (hero && hero.alive === false) return;

    const mode = audioService.getSettings().laneAssistantMode;
    if (mode === 'disabled') return;
    if (mode === 'auto') {
      const heroName = hero?.name || '';
      if (!isSupportHero(heroName)) {
        return;
      }
    }

    const currentMinute = Math.floor(clockTime / 60);
    const secInMinute = clockTime % 60;

    // 1. Small camp pull at :15 -> alert at :08 (7s lead time)
    if (secInMinute >= 8 && secInMinute <= 10) {
      const alertKey = `pull_small_${currentMinute}`;
      if (!this.playedLaneAlerts.has(alertKey)) {
        this.playedLaneAlerts.add(alertKey);
        audioService.playCreepPullAlert(false);
      }
    }

    // 2. Large camp pull at :45 -> alert at :38 (7s lead time)
    if (secInMinute >= 38 && secInMinute <= 40) {
      const alertKey = `pull_large_${currentMinute}`;
      if (!this.playedLaneAlerts.has(alertKey)) {
        this.playedLaneAlerts.add(alertKey);
        audioService.playCreepPullAlert(true);
      }
    }

    // 3. Jungle stack at :53 -> alert at :46 (7s lead time)
    if (secInMinute >= 46 && secInMinute <= 48) {
      const alertKey = `stack_${currentMinute}`;
      if (!this.playedLaneAlerts.has(alertKey)) {
        this.playedLaneAlerts.add(alertKey);
        audioService.playJungleStackAlert();
      }
    }
  }

  private evaluateDanger(
    clockTime: number,
    hero: GSIPayload['hero'],
    minimapResult: MinimapScanResult | null,
    isGameActive: boolean,
  ): { dangerLevel: TacticalDangerLevel; dangerReasons: string[] } {
    const reasons: string[] = [];
    if (!hero || !hero.alive) {
      return { dangerLevel: 'safe', dangerReasons: [] };
    }

    const hpPercent = hero.health_percent || 100;
    const allMia = Boolean(minimapResult?.scanned && minimapResult.all_missing);
    const lowHp = hpPercent < 60;
    const criticalHp = hpPercent < 30;

    if (allMia && lowHp) {
      reasons.push('Enemies missing from minimap');
      reasons.push(`Low hero health (${hpPercent}%)`);
      // Trigger voice alert once every 60s
      if (isGameActive && clockTime - this.lastDangerAlertTime >= 60) {
        this.lastDangerAlertTime = clockTime;
        audioService.playOverextendDangerAlert();
      }
      return { dangerLevel: 'danger', dangerReasons: reasons };
    }

    if (allMia) {
      reasons.push('All enemies MIA from minimap');
      return { dangerLevel: 'caution', dangerReasons: reasons };
    }

    if (criticalHp) {
      reasons.push(`Critical low health (${hpPercent}%)`);
      return { dangerLevel: 'caution', dangerReasons: reasons };
    }

    return { dangerLevel: 'safe', dangerReasons: [] };
  }

  private evaluateCounterItems(
    draft: GSIPayload['draft'],
    playerTeam: 'radiant' | 'dire' | undefined,
    equippedItems: Set<string>,
  ): EnemyThreatAnalysis[] {
    const enemyPickClasses = getEnemyPickClasses(draft, playerTeam);
    if (enemyPickClasses.length === 0) return [];

    const enemyNames = enemyPickClasses.map((c) =>
      c.replace(/^npc_dota_hero_/, '').toLowerCase(),
    );

    const results: EnemyThreatAnalysis[] = [];

    // 1. Invisibility threat
    const invisHeroes = ['riki', 'bounty_hunter', 'clinkz', 'nyx_assassin', 'weaver', 'sand_king', 'slark'];
    const matchedInvis = enemyNames.filter((e) => invisHeroes.includes(e));
    if (matchedInvis.length > 0) {
      results.push({
        threatType: 'invis',
        threatName: 'Invisibility & Sneak Ganks',
        enemyHeroes: matchedInvis,
        recommendedCounters: [
          {
            name: 'item_dust',
            displayName: 'Dust of Appearance',
            cost: 80,
            reason: 'Reveals and slows invisible enemies by 20%',
            isEquipped: equippedItems.has('item_dust'),
          },
          {
            name: 'item_ward_sentry',
            displayName: 'Sentry Ward',
            cost: 50,
            reason: 'Area True Sight to spot approaching invis heroes',
            isEquipped: equippedItems.has('item_ward_sentry') || equippedItems.has('item_ward_dispenser'),
          },
        ],
      });
    }

    // 2. Heavy CC / Stuns
    const ccHeroes = ['lion', 'shadow_shaman', 'bane', 'enigma', 'earthshaker', 'tidehunter', 'axe', 'faceless_void', 'magnataur', 'batrider'];
    const matchedCC = enemyNames.filter((e) => ccHeroes.includes(e));
    if (matchedCC.length > 0) {
      results.push({
        threatType: 'cc',
        threatName: 'Heavy Crowd Control & Stuns',
        enemyHeroes: matchedCC,
        recommendedCounters: [
          {
            name: 'item_black_king_bar',
            displayName: "Black King Bar (BKB)",
            cost: 4050,
            reason: 'Grants Debuff Immunity to freely cast spells in fights',
            isEquipped: equippedItems.has('item_black_king_bar'),
          },
          {
            name: 'item_sphere',
            displayName: "Linken's Sphere",
            cost: 4600,
            reason: 'Blocks point-target initiations and ultimates',
            isEquipped: equippedItems.has('item_sphere'),
          },
        ],
      });
    }

    // 3. High Regen / Lifesteal / Tank
    const regenHeroes = ['bristleback', 'huskar', 'alchemist', 'necrolyte', 'morphling', 'abaddon', 'skeleton_king'];
    const matchedRegen = enemyNames.filter((e) => regenHeroes.includes(e));
    if (matchedRegen.length > 0) {
      results.push({
        threatType: 'regen',
        threatName: 'Extreme Health Regen & Lifesteal',
        enemyHeroes: matchedRegen,
        recommendedCounters: [
          {
            name: 'item_spirit_vessel',
            displayName: 'Spirit Vessel',
            cost: 2840,
            reason: 'Reduces enemy healing by 45% and burns % current HP',
            isEquipped: equippedItems.has('item_spirit_vessel'),
          },
          {
            name: 'item_skadi',
            displayName: "Eye of Skadi",
            cost: 5300,
            reason: 'Attacks reduce healing and regen by 40%',
            isEquipped: equippedItems.has('item_skadi'),
          },
          {
            name: 'item_shivas_guard',
            displayName: "Shiva's Guard",
            cost: 4825,
            reason: 'Passive aura cuts healing and life steal by 25%',
            isEquipped: equippedItems.has('item_shivas_guard'),
          },
        ],
      });
    }

    // 4. Evasion
    const evasionHeroes = ['phantom_assassin', 'windrunner', 'brewmaster', 'broodmother', 'troll_warlord'];
    const matchedEvasion = enemyNames.filter((e) => evasionHeroes.includes(e));
    if (matchedEvasion.length > 0) {
      results.push({
        threatType: 'evasion',
        threatName: 'Evasion & High Agility',
        enemyHeroes: matchedEvasion,
        recommendedCounters: [
          {
            name: 'item_monkey_king_bar',
            displayName: 'Monkey King Bar (MKB)',
            cost: 4900,
            reason: '80% True Strike chance to pierce all physical evasion',
            isEquipped: equippedItems.has('item_monkey_king_bar'),
          },
          {
            name: 'item_bloodthorn',
            displayName: 'Bloodthorn',
            cost: 6800,
            reason: 'Silences target and grants allies 100% True Strike',
            isEquipped: equippedItems.has('item_bloodthorn'),
          },
        ],
      });
    }

    // 5. Heavy Magic Burst
    const magicHeroes = ['zeus', 'skywrath_mage', 'lina', 'tinker', 'leshrac', 'puck', 'queenofpain', 'pugna'];
    const matchedMagic = enemyNames.filter((e) => magicHeroes.includes(e));
    if (matchedMagic.length > 0) {
      results.push({
        threatType: 'magic_burst',
        threatName: 'High Magic Burst Damage',
        enemyHeroes: matchedMagic,
        recommendedCounters: [
          {
            name: 'item_pipe',
            displayName: 'Pipe of Insight',
            cost: 3375,
            reason: 'Teamwide barrier absorbing 450 magic spell damage',
            isEquipped: equippedItems.has('item_pipe'),
          },
          {
            name: 'item_mage_slayer',
            displayName: 'Mage Slayer',
            cost: 2625,
            reason: 'Attacks reduce target spell damage by 40%',
            isEquipped: equippedItems.has('item_mage_slayer'),
          },
        ],
      });
    }

    // 6. Illusions & Swarms
    const illusionHeroes = ['phantom_lancer', 'naga_siren', 'chaos_knight', 'terrorblade', 'meepo'];
    const matchedIllusion = enemyNames.filter((e) => illusionHeroes.includes(e));
    if (matchedIllusion.length > 0) {
      results.push({
        threatType: 'illusions',
        threatName: 'Illusion Swarm & Clones',
        enemyHeroes: matchedIllusion,
        recommendedCounters: [
          {
            name: 'item_maelstrom',
            displayName: 'Maelstrom / Mjollnir',
            cost: 2700,
            reason: 'Chain Lightning bounces clear through dense illusion waves',
            isEquipped: equippedItems.has('item_maelstrom') || equippedItems.has('item_mjollnir'),
          },
          {
            name: 'item_shivas_guard',
            displayName: "Shiva's Guard",
            cost: 4825,
            reason: 'AoE slow and blast reveals the real hero',
            isEquipped: equippedItems.has('item_shivas_guard'),
          },
        ],
      });
    }

    return results;
  }

  private evaluateMacroPhase(clockTime: number): MacroStrategyPhase {
    const lang = audioService.getSettings().voiceLanguage;
    const isThai = lang === 'th-TH';

    if (clockTime < 600) {
      // 0:00 - 10:00 Laning
      return {
        phase: 'laning',
        phaseTitle: isThai ? 'ช่วงยืนเลนและคุมรูน' : 'Laning Phase & Rune Control',
        timeRange: '0:00 – 10:00',
        keyObjectives: [
          isThai ? 'แย่งรูนน้ำที่ 2:00 และ 4:00 (เลนกลาง)' : 'Contest 2m & 4m Water Runes (Mid)',
          isThai ? 'คุมรูนแม่น้ำนาทีที่ 6:00 เพื่อชิงความได้เปรียบ' : 'Secure 6:00 River Power Rune',
          isThai ? 'เก็บ Wisdom Rune และปลดล็อกไอเทมป่าที่นาที 7:00' : 'Grab Wisdom Rune & Tier 1 Neutrals at 7:00',
          isThai ? 'รักษาแนวครีปใกล้ป้อมเราเพื่อความปลอดภัย' : 'Hold creep wave near your tower for safety',
        ],
        coachAdvice: isThai
          ? 'โฟกัสการลาสต์และเดไนย์ครีป คอยมองมินิแมพเมื่อถึงนาทีที่ 6 ระวังศัตรูเดินแก๊ง'
          : 'Focus on last-hitting and denies. Watch minimap at minute 6 for enemy roams.',
      };
    }

    if (clockTime < 1200) {
      // 10:00 - 20:00 Mid Game
      return {
        phase: 'mid',
        phaseTitle: isThai ? 'ช่วงกลางเกมและคุมพื้นที่' : 'Mid Game & Map Control',
        timeRange: '10:00 – 20:00',
        keyObjectives: [
          isThai ? 'ทำลายป้อม Tier 1 ด้านนอกเพื่อบีบพื้นที่ฟาร์มศัตรู' : 'Destroy outer Tier 1 towers to shrink enemy farm',
          isThai ? 'ปลดล็อกไอเทมป่า เทียร์ 2 ที่นาที 17:00' : 'Collect Tier 2 Neutral Items at 17:00',
          isThai ? 'กด Smoke of Deceit ดักฆ่าตัวคอร์ที่แยกดัน' : 'Smoke gank isolated enemy split-pushers',
          isThai ? 'เตรียมพร้อมตี Tormentor ตอนนาทีที่ 20:00' : 'Gather team for Tormentor spawn at 20:00',
        ],
        coachAdvice: isThai
          ? 'ดันป้อมนอกให้หมด ปักวอร์ดในป่าศัตรู และรวมทีมไปตี Tormentor ทันทีที่เกิด'
          : 'Take outer towers, place aggressive jungle wards, and take Tormentor on spawn.',
      };
    }

    if (clockTime < 1800) {
      // 20:00 - 30:00 Objective & Roshan
      return {
        phase: 'roshan',
        phaseTitle: isThai ? 'ล่าอ็อบเจกต์และคุม Roshan' : 'Objective & Roshan Control',
        timeRange: '20:00 – 30:00',
        keyObjectives: [
          isThai ? 'กำจัด Tormentor เพื่อรับ Aghanim Shard ฟรี' : "Kill Tormentor for free Aghanim's Shard",
          isThai ? 'คุมวิชั่นหลุม Roshan ตามเวลากลางวัน/กลางคืน' : 'Control vision around the active Roshan pit',
          isThai ? 'ชิง Aegis of the Immortal ก่อนบุกป้อม Tier 2/3' : 'Secure Aegis before pushing high ground towers',
          isThai ? 'ปลดล็อกไอเทมป่า เทียร์ 3 ที่นาที 27:00' : 'Collect Tier 3 Neutral Items at 27:00',
        ],
        coachAdvice: isThai
          ? 'เอา Tormentor Shard ให้ครบ และอย่าเพิ่งบุกบ้านศัตรูถ้ายังไม่มี Aegis'
          : 'Secure Tormentor Shard and do not push high ground without Aegis.',
      };
    }

    // 30:00+ Late Game
    return {
      phase: 'late',
      phaseTitle: isThai ? 'ช่วงเลทเกมและบุกขึ้นบ้าน' : 'Late Game & High Ground Siege',
      timeRange: '30:00+',
      keyObjectives: [
        isThai ? 'เก็บเงินสำรอง Buyback ไว้เสมอ ห้ามใช้เงินจนหมด' : 'Save reserve gold for Buyback at all times',
        isThai ? 'ชิง Roshan เพื่อเอา Aegis + Cheese + Refresher' : 'Contest Roshan for Aegis, Cheese & Refresher Shard',
        isThai ? 'บุกขึ้น High Ground เมื่อได้เปรียบจำนวนคน' : 'Siege High Ground only with numbers or Aegis lead',
        isThai ? 'ปลดล็อกไอเทมป่า เทียร์ 4 ที่ 37:00 และ เทียร์ 5 ที่ 60:00' : 'Collect Tier 4 (37m) and Tier 5 (60m) Neutrals',
      ],
      coachAdvice: isThai
        ? 'การตายในเลทเกมส่งผลถึงแพ้ชนะ เก็บเงินบายแบ็คและเดินเกาะกลุ่มกับเพื่อนเสมอ'
        : 'Late-game deaths can end the match. Always have buyback and stay grouped.',
    };
  }

  private getEquippedItemKeys(items?: GSIPayload['items']): Set<string> {
    const keys = new Set<string>();
    if (!items) return keys;

    const slots = [
      items.slot0, items.slot1, items.slot2, items.slot3, items.slot4, items.slot5,
      items.backpack0, items.backpack1, items.backpack2,
    ];

    slots.forEach((item) => {
      if (item?.name && item.name !== 'empty') {
        keys.add(item.name.toLowerCase());
      }
    });

    return keys;
  }

  private evaluatePreRuneShove(
    clockTime: number,
    isGameActive: boolean,
  ): PreRuneShoveInfo | null {
    if (!isGameActive || clockTime < 60 || clockTime > 600) return null;

    const currentMinute = Math.floor(clockTime / 60);
    const secInMinute = clockTime % 60;
    const targetMinute = currentMinute + 1;

    // Runes spawn on even minutes: 2, 4, 6, 8, 10
    if (targetMinute % 2 !== 0) return null;

    // Window: :40 to :55 seconds of the preceding odd minute
    const isInWindow = secInMinute >= 40 && secInMinute <= 55;
    if (!isInWindow) return null;

    const runeType: 'water' | 'power' = targetMinute <= 4 ? 'water' : 'power';
    const secondsRemaining = (targetMinute * 60) - clockTime;

    const isThai = audioService.getSettings().voiceLanguage === 'th-TH';
    const runeLabel = runeType === 'water' ? (isThai ? 'น้ำ' : 'water') : (isThai ? 'แม่น้ำ' : 'power');
    const tipEn = `Pre-Rune Shove: Push mid wave into tower now for minute ${targetMinute} ${runeType} rune advantage!`;
    const tipTh = `ดันเวฟครีปเข้าใต้ป้อมศัตรูตอนนี้ เพื่อคุมรูน${runeLabel}นาทีที่ ${targetMinute}!`;

    const alertKey = `rune_shove_${targetMinute}`;
    if (secInMinute >= 40 && secInMinute <= 46 && !this.playedRuneShoveAlerts.has(alertKey)) {
      this.playedRuneShoveAlerts.add(alertKey);
      const activeRole = alertProfiles.getSnapshot().active;
      if (activeRole === 'mid') {
        audioService.playPreRuneShoveAlert(runeType, targetMinute);
      }
    }

    return {
      active: true,
      runeType,
      targetMinute,
      secondsRemaining: Math.max(0, secondsRemaining),
      tipEn,
      tipTh,
    };
  }

  private evaluateAntiWandering(
    clockTime: number,
    minimapResult: MinimapScanResult | null,
    isGameActive: boolean,
  ): AntiWanderingRoamInfo | null {
    if (!isGameActive || clockTime < 180 || clockTime > 600) return null;

    const activeRole = alertProfiles.getSnapshot().active;
    const isMid = activeRole === 'mid';

    const isEnemyMissing = Boolean(
      minimapResult?.scanned &&
      (minimapResult.all_missing || (minimapResult.enemies_visible_count !== undefined && minimapResult.enemies_visible_count <= 2))
    );

    if (!isEnemyMissing) return null;

    const tipEn = isMid
      ? 'Enemy Mid roaming! Shove mid wave and damage Tier 1 tower. Do not wander through river without vision.'
      : 'Enemy Mid missing! Possible side lane roam, fall back near your tower.';
    const tipTh = isMid
      ? 'มิดศัตรูเดินแก๊ง! ดันครีปตอดป้อมกลางทันที อย่าเดินตามในแม่น้ำที่ไม่มีวอร์ด'
      : 'มิดศัตรูหายไปจากเลนกลาง! ระวังโดนเดินแก๊ง ถอยเข้าใกล้ป้อมเรา';

    if (clockTime - this.lastAntiWanderingAlertTime >= 75) {
      this.lastAntiWanderingAlertTime = clockTime;
      audioService.playEnemyMidRoamAlert(isMid);
    }

    return {
      active: true,
      isMid,
      tipEn,
      tipTh,
    };
  }

  private evaluatePowerSpikeAction(
    clockTime: number,
    hero: GSIPayload['hero'],
    player: GSIPayload['player'],
    threats: EnemyThreatAnalysis[],
    equippedItems: Set<string>,
    isGameActive: boolean,
  ): PowerSpikeActionInfo | null {
    if (!isGameActive || !hero) return null;

    const currentLevel = hero.level || 1;
    const gold = player?.gold || 0;

    const keyItemPool: Array<{ key: string; name: string; cost: number }> = [];

    // 1. Hero-specific Blink Dagger power spike:
    // Only recommend Blink Dagger if the hero genuinely builds/needs it for initiation,
    // and does NOT already own Blink Dagger or any upgraded Blink item.
    if (!hasEquippedBlink(equippedItems) && isBlinkDaggerHero(hero.name)) {
      keyItemPool.push({ key: 'item_blink', name: 'Blink Dagger', cost: 2250 });
    }

    // 2. Black King Bar (BKB) power spike:
    // Core fight/survival item if not already equipped
    if (!equippedItems.has('item_black_king_bar')) {
      keyItemPool.push({ key: 'item_black_king_bar', name: 'Black King Bar (BKB)', cost: 4050 });
    }

    // 3. Dynamic threat counters (only if not already equipped)
    for (const t of threats) {
      for (const counter of t.recommendedCounters) {
        if (!counter.isEquipped && !equippedItems.has(counter.name) && counter.cost > 2000) {
          if (!keyItemPool.some((k) => k.key === counter.name)) {
            keyItemPool.push({ key: counter.name, name: counter.displayName, cost: counter.cost });
          }
        }
      }
    }

    // 4. Near-Item Caution: Within 500 gold of high-impact unequipped item
    for (const item of keyItemPool) {
      if (equippedItems.has(item.key)) continue;

      const deficit = item.cost - gold;
      if (deficit > 0 && deficit <= 500) {
        const tipEn = `Key item ${item.name} within ${deficit}g! Play safe near vision and avoid coinflip fights.`;
        const tipTh = `ขาดอีก ${deficit} โกลด์จะได้ ${item.name}! เล่นปลอดภัยอย่าเพิ่งเปิดไฟต์เสี่ยง`;

        if (clockTime - this.lastNearItemAlertTime >= 90) {
          this.lastNearItemAlertTime = clockTime;
          audioService.playNearItemCautionAlert(item.name, deficit);
        }

        return {
          state: 'near_item',
          itemName: item.name,
          deficit,
          tipEn,
          tipTh,
        };
      }
    }

    // 2. Level 6 Spike Ready
    if (currentLevel >= 6 && currentLevel <= 7 && !this.announcedLevel6Spike) {
      this.announcedLevel6Spike = true;
      const heroClean = hero?.name ? hero.name.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ') : 'Hero';
      audioService.playPowerSpikeReadyActionAlert(heroClean, 'Level 6 Ultimate');
      return {
        state: 'ready',
        spikeName: 'Level 6 Ultimate',
        tipEn: 'Power Spike Ready: Group with team or Smoke for an objective!',
        tipTh: 'พาวเวอร์สไปก์พร้อมแล้ว รวมทีมกดสโม้กเปิดไฟต์หรือยึดป้อม',
      };
    }

    return {
      state: currentLevel >= 6 ? 'ready' : 'farming',
      tipEn: currentLevel >= 6 ? 'Power spike active. Look for active map movements.' : 'Farming phase. Prioritize safe creep waves and item timings.',
      tipTh: currentLevel >= 6 ? 'พาวเวอร์สไปก์พร้อมใช้งาน มองหาจังหวะคุมพื้นที่' : 'ช่วงฟาร์มสะสมไอเทม เน้นเก็บครีปเลนปลอดภัยก่อนเปิดไฟต์',
    };
  }

  private evaluateHighGroundSiege(
    clockTime: number,
    equippedItems: Set<string>,
    isGameActive: boolean,
  ): HighGroundSiegeInfo | null {
    if (!isGameActive || clockTime < 1200) return null;

    const hasAegis = equippedItems.has('item_aegis');

    if (!hasAegis) {
      const tipEn = 'High Ground Caution: Do not force high ground without Aegis or a pick-off. Fall back to Roshan or Tormentor!';
      const tipTh = 'อย่าเพิ่งฝืนขึ้นบ้านถ้ายังไม่มี Aegis ถอยมาคุม Roshan หรือ Tormentor ก่อน';

      if (clockTime - this.lastHighGroundAlertTime >= 300) {
        this.lastHighGroundAlertTime = clockTime;
        audioService.playHighGroundCautionAlert();
      }

      return {
        caution: true,
        hasAegis: false,
        tipEn,
        tipTh,
      };
    }

    return {
      caution: false,
      hasAegis: true,
      tipEn: 'Aegis secured! Siege high ground or force Tier 3 objectives with your advantage.',
      tipTh: 'มี Aegis พร้อมแล้ว! บุกขึ้นบ้านหรือกดดันป้อม Tier 3 โดยใช้ความได้เปรียบ',
    };
  }
}

export const tacticalCoach = new TacticalCoachEngine();
