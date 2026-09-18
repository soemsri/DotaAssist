import { GSIPayload } from '../types/gsi';
import { audioService } from './audioService';
import { alertProfiles } from './alertProfiles';
import { NEUTRAL_TIER_TIMINGS } from '../data/timingRules';

export interface NeutralItemStatus {
  unlockedTier: number; // 0 to 5
  equippedTier: number; // 0 to 5
  equippedItemName: string | null;
  nextTier: number | null; // 1 to 5, or null if past tier 5
  nextTierTime: number | null;
  secondsUntilNextTier: number | null;
  isMissing: boolean;
  isOutdated: boolean;
  isUpToDate: boolean;
}

// Comprehensive catalog of Dota 2 neutral item base names
const KNOWN_TIER_ITEMS: Record<string, number> = {
  // Tier 1 (7:00)
  trusty_shovel: 1, arcane_ring: 1, mysterious_hat: 1, occult_bracelet: 1,
  safety_bubble: 1, spark_of_courage: 1, broom_handle: 1, duelist_gloves: 1,
  seeds_of_serenity: 1, lance_of_pursuit: 1, pig_pole: 1, chipped_vest: 1,
  fairy_trinket: 1, faded_broach: 1, ironwood_tree: 1, royal_jelly: 1,
  keen_optic: 1, poor_mans_shield: 1, iron_talon: 1, unstable_wand: 1,
  ocean_heart: 1, possessed_mask: 1,

  // Tier 2 (17:00)
  vambrace: 2, philosophers_stone: 2, specialists_array: 2, pupils_gift: 2,
  dragon_scale: 2, bullwhip: 2, ring_of_aquila: 2, grove_bow: 2,
  whisper_of_the_dread: 2, orb_of_destruction: 2, light_collector: 2,
  eye_of_the_vizier: 2, quicksilver_amulet: 2, brigands_blade: 2, clumsy_net: 2,
  misericorde: 2,

  // Tier 3 (27:00)
  paladin_sword: 3, elven_tunic: 3, cloak_of_flames: 3, ceremonial_robe: 3,
  psychic_headband: 3, enchanted_quiver: 3, ogre_seal_totem: 3, vindicators_axe: 3,
  dandelion_amulet: 3, defiant_shell: 3, craggy_coat: 3, mind_breaker: 3,
  quickening_charm: 3, spider_legs: 3, nemesis_curse: 3,

  // Tier 4 (37:00)
  timeless_relic: 4, spell_prism: 4, ascetic_cap: 4, ninja_gear: 4,
  havoc_hammer: 4, trickster_cloak: 4, ancient_guardian: 4, stormcrafter: 4,
  martyrs_plate: 4, avianas_feather: 4, telescope: 4, flicker: 4,
  witchbane: 4, penta_edged_sword: 4, the_leveller: 4, minotaur_horn: 4,

  // Tier 5 (60:00)
  apex: 5, fallen_sky: 5, pirate_hat: 5, ex_machina: 5,
  mirror_shield: 5, seer_stone: 5, giants_ring: 5, book_of_shadows: 5,
  force_boots: 5, desolator_2: 5, woodland_striders: 5, ballista: 5,
  arcanists_armor: 5, unwavering_condition: 5,
};

interface TierReminderState {
  count: number;
  lastClockTime: number;
}

export class NeutralItemService {
  private reminderState: Map<number, TierReminderState> = new Map();
  private readonly gracePeriodSeconds = 90; // 90s grace period after unlock
  private readonly reminderIntervalSeconds = 120; // 2 minutes between repeat reminders
  private readonly maxRemindersPerTier = 2; // Maximum 2 reminders per tier

  /** Classify the neutral item tier from item name string */
  public getNeutralItemTier(rawName: string | undefined | null): number {
    if (!rawName || rawName === 'empty' || rawName.trim() === '') {
      return 0;
    }

    const clean = rawName.toLowerCase().replace(/^item_/, '').trim();

    // Check token format: e.g. tier1_token, tier2_token
    const tokenMatch = clean.match(/tier([1-5])_token/);
    if (tokenMatch) {
      return parseInt(tokenMatch[1], 10);
    }

    // Check known dictionary
    if (clean in KNOWN_TIER_ITEMS) {
      return KNOWN_TIER_ITEMS[clean];
    }

    // Check if name has tier digit
    const genericTierMatch = clean.match(/tier_?([1-5])/);
    if (genericTierMatch) {
      return parseInt(genericTierMatch[1], 10);
    }

    return 0;
  }

  /** Calculate currently unlocked tier from game clock seconds */
  public getUnlockedTier(clockTime: number): number {
    let unlocked = 0;
    for (const entry of NEUTRAL_TIER_TIMINGS) {
      if (clockTime >= entry.time) {
        unlocked = entry.tier;
      }
    }
    return unlocked;
  }

  /** Get the unlock time for a given tier (1 to 5) */
  public getTierUnlockTime(tier: number): number {
    const entry = NEUTRAL_TIER_TIMINGS.find(e => e.tier === tier);
    return entry ? entry.time : 0;
  }

  /** Get next upcoming tier and unlock seconds */
  public getNextTierInfo(clockTime: number): { nextTier: number | null; nextTierTime: number | null; secondsUntil: number | null } {
    for (const entry of NEUTRAL_TIER_TIMINGS) {
      if (clockTime < entry.time) {
        return {
          nextTier: entry.tier,
          nextTierTime: entry.time,
          secondsUntil: entry.time - Math.floor(clockTime),
        };
      }
    }
    return { nextTier: null, nextTierTime: null, secondsUntil: null };
  }

  /** Calculate comprehensive neutral item status from GSI payload */
  public getNeutralItemStatus(payload: GSIPayload | null, clockTime: number): NeutralItemStatus {
    const unlockedTier = this.getUnlockedTier(clockTime);
    const rawItemName = payload?.items?.neutral0?.name ?? null;
    const equippedTier = this.getNeutralItemTier(rawItemName);
    const { nextTier, nextTierTime, secondsUntil } = this.getNextTierInfo(clockTime);

    const isMissing = unlockedTier > 0 && equippedTier === 0;
    const isOutdated = unlockedTier > 0 && equippedTier > 0 && equippedTier < unlockedTier;
    const isUpToDate = unlockedTier === 0 || equippedTier >= unlockedTier;

    return {
      unlockedTier,
      equippedTier,
      equippedItemName: rawItemName && rawItemName !== 'empty' ? rawItemName : null,
      nextTier,
      nextTierTime,
      secondsUntilNextTier: secondsUntil,
      isMissing,
      isOutdated,
      isUpToDate,
    };
  }

  /**
   * Check and trigger missing/outdated neutral item voice reminder with grace period and throttling.
   * - Grace period: 90 seconds after tier unlock.
   * - Throttling: 2 minutes between repeat reminders.
   * - Max: 2 reminders per tier.
   */
  public checkMissingOrOutdatedReminder(
    payload: GSIPayload | null,
    clockTime: number
  ): { alerted: boolean; type?: 'missing' | 'outdated'; tier?: number } {
    if (!alertProfiles.enabled('neutral_item')) {
      return { alerted: false };
    }

    const unlockedTier = this.getUnlockedTier(clockTime);
    if (unlockedTier === 0) {
      return { alerted: false };
    }

    const unlockTime = this.getTierUnlockTime(unlockedTier);

    // Enforce 90-second Grace Period
    if (clockTime < unlockTime + this.gracePeriodSeconds) {
      return { alerted: false };
    }

    const rawItemName = payload?.items?.neutral0?.name;
    const equippedTier = this.getNeutralItemTier(rawItemName);

    // If player is already up to date with current or higher tier, no alert
    if (equippedTier >= unlockedTier) {
      return { alerted: false };
    }

    // Retrieve or initialize tier reminder state
    let state = this.reminderState.get(unlockedTier);
    if (!state) {
      state = { count: 0, lastClockTime: -9999 };
      this.reminderState.set(unlockedTier, state);
    }

    // Cap at max 2 reminders per tier
    if (state.count >= this.maxRemindersPerTier) {
      return { alerted: false };
    }

    // Enforce 2-minute (120s) throttle between repeated reminders
    if (state.count > 0 && clockTime - state.lastClockTime < this.reminderIntervalSeconds) {
      return { alerted: false };
    }

    // Record reminder trigger
    state.count++;
    state.lastClockTime = clockTime;

    const alertType = equippedTier === 0 ? 'missing' : 'outdated';

    const isThai = audioService.getSettings().voiceLanguage === 'th-TH';

    if (alertType === 'missing') {
      const msg = isThai
        ? `เตือนความจำ: ช่องไอเทมป่ายังว่างอยู่ มีเทียร์ ${unlockedTier} พร้อมให้เลือก`
        : `Reminder: Neutral item slot is empty. Tier ${unlockedTier} is available.`;
      audioService.speak(msg, undefined, 'neutral_item');
    } else {
      const msg = isThai
        ? `เตือนความจำ: ยังใช้ไอเทมป่าเทียร์ ${equippedTier} อยู่ มีเทียร์ ${unlockedTier} พร้อมให้เปลี่ยนแล้ว`
        : `Reminder: Still using Tier ${equippedTier} neutral item. Tier ${unlockedTier} is available.`;
      audioService.speak(msg, undefined, 'neutral_item');
    }

    return { alerted: true, type: alertType, tier: unlockedTier };
  }

  /** Reset all reminder state on match switch or restart */
  public resetAlerts() {
    this.reminderState.clear();
  }
}

export const neutralItemService = new NeutralItemService();
