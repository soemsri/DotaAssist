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
} from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { MinimapScanResult } from './minimapScanner';
import { audioService } from './audioService';
import { getEnemyPickClasses } from './draftService';
import { neutralAdvisor, getHeroArchetype, isSupportHero } from './neutralAdvisor';
import { talentAdvisor } from './talentAdvisor';
import { skillAdvisor } from './skillAdvisor';
import { visionEngine } from './visionEngine';

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
  private lastCacheKey: string | null = null;
  private lastCachedResult: TacticalCoachState | null = null;

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
    const itemsSig = items ? `${items.teleport0?.name || ''}:${items.neutral0?.name || ''}:${items.slot0?.name || ''}` : 'none';
    const abilitiesSig = payload?.abilities ? Object.entries(payload.abilities).map(([k, v]) => `${k}:${v?.level ?? 0}`).join(',') : 'none';
    const wardsPlaced = player?.wards_placed ?? 0;
    const draftLen = draft ? Object.keys(draft).length : 0;
    const settings = audioService.getSettings();
    const laneMode = settings.laneAssistantMode;
    const lang = settings.voiceLanguage;

    const cacheKey = `${matchId ?? ''}:${clockTime}:${hero?.name ?? ''}:${heroLevel}:${heroHp}:${heroAlive}:${gold}:${miaSig}:${itemsSig}:${abilitiesSig}:${wardsPlaced}:${draftLen}:${laneMode}:${lang}`;

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
            // Speak English talent name (e.g. Plus 9 Strength) with Thai strategic reasoning as agreed in alignment
            const talentText = advice.recommended === 'left' ? advice.left.en : advice.right.en;
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
    };

    this.lastCacheKey = cacheKey;
    this.lastCachedResult = result;
    return result;
  }

  // --- Evaluation Logic Helpers ---

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
}

export const tacticalCoach = new TacticalCoachEngine();
