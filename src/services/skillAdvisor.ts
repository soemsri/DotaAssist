import {
  EnemyThreatAnalysis,
  HeroSkillBuildAnalysis,
  HeroSkillInfo,
  SkillRecommendation,
  SituationalSkillRule,
} from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { apiService, RawSkillBuild } from './apiService';

class SkillAdvisorEngine {
  private cache = new Map<string, HeroSkillBuildAnalysis>();

  public clearCache() {
    this.cache.clear();
  }

  /**
   * Evaluates the hero's skills from GSI payload and returns the full 1-25 build progression,
   * current skill recommendation, and unspent ability point count.
   */
  public evaluateSkillBuild(
    payload: GSIPayload,
    threats: EnemyThreatAnalysis[] = [],
  ): HeroSkillBuildAnalysis | null {
    const hero = payload.hero;
    if (!hero || !hero.name) return null;

    const heroName = hero.name;
    const cleanKey = heroName.replace(/^npc_dota_hero_/, '').toLowerCase();
    const heroLevel = Math.max(1, hero.level || 1);

    const buildData: RawSkillBuild | null = apiService.getHeroSkillBuild(cleanKey);
    if (!buildData) return null;

    const abilities = payload.abilities || {};
    const heroAbilities = buildData.abilities;

    // Map slot to ability key and name
    const slotToAbility = new Map<string, HeroSkillInfo>();
    const keyToSlot = new Map<string, string>();
    for (const ab of heroAbilities) {
      slotToAbility.set(ab.slot, ab);
      keyToSlot.set(ab.key, ab.slot);
    }

    // Calculate learned levels for Q, W, E, R from GSI abilities
    const learnedLevelsBySlot: Record<string, number> = {
      Q: 0,
      W: 0,
      E: 0,
      R: 0,
    };

    let totalTalentsSpent = 0;
    let totalSkillsSpent = 0;

    for (const entry of Object.values(abilities)) {
      if (!entry || typeof entry.level !== 'number') continue;

      const slot = keyToSlot.get(entry.name);
      if (slot && learnedLevelsBySlot[slot] !== undefined) {
        learnedLevelsBySlot[slot] = Math.max(learnedLevelsBySlot[slot], entry.level);
      } else if (entry.name && entry.name.startsWith('special_bonus_') && entry.level > 0) {
        totalTalentsSpent += entry.level;
      }
    }

    totalSkillsSpent =
      learnedLevelsBySlot.Q +
      learnedLevelsBySlot.W +
      learnedLevelsBySlot.E +
      learnedLevelsBySlot.R;

    const totalSpentPoints = totalSkillsSpent + totalTalentsSpent;
    const unspentPoints = Math.max(0, heroLevel - totalSpentPoints);

    // Cache key incorporates hero, level, spent levels signature, and threats
    const spentSig = `Q${learnedLevelsBySlot.Q}W${learnedLevelsBySlot.W}E${learnedLevelsBySlot.E}R${learnedLevelsBySlot.R}T${totalTalentsSpent}`;
    const threatSig = threats.map((t) => t.threatType).sort().join(',');
    const cacheKey = `${cleanKey}:${heroLevel}:${spentSig}:${threatSig}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Determine current recommendation
    let currentRecommendation: SkillRecommendation | null = null;

    if (unspentPoints > 0) {
      // 1. Check early-game situational overrides (levels 1-4)
      let situationalOverride: SituationalSkillRule | null = null;
      if (heroLevel <= 4 && buildData.situationalRules && buildData.situationalRules.length > 0) {
        for (const rule of buildData.situationalRules) {
          if (rule.level === heroLevel) {
            const matchedThreat = threats.find((t) => t.threatType === rule.threat);
            if (matchedThreat) {
              situationalOverride = rule;
              break;
            }
          }
        }
      }

      if (situationalOverride) {
        const slot = situationalOverride.recommendedSlot;
        const abInfo = slotToAbility.get(slot);
        const curLevel = learnedLevelsBySlot[slot] || 0;
        const maxLevel = slot === 'R' ? 3 : 4;

        if (curLevel < maxLevel) {
          currentRecommendation = {
            heroLevel,
            slot,
            skillKey: abInfo?.key,
            skillName: abInfo?.name || `Skill ${slot}`,
            targetLevel: curLevel + 1,
            reasonEn: situationalOverride.reasonEn,
            reasonTh: situationalOverride.reasonTh,
            isTalent: false,
            unspentPoints,
          };
        }
      }

      // 2. Follow progression roadmap if no situational override matched
      if (!currentRecommendation) {
        // Point index in progression is totalSpentPoints (0-indexed for 1st point)
        const stepIndex = Math.min(totalSpentPoints, buildData.progression.length - 1);
        const step = buildData.progression[stepIndex];

        if (step) {
          if (step.isTalent || step.slot === 'Talent') {
            currentRecommendation = {
              heroLevel,
              slot: 'Talent',
              skillName: `Talent Lvl ${heroLevel}`,
              targetLevel: undefined,
              reasonEn: 'Special Bonus Talent Tree unlock available.',
              reasonTh: 'มีแต้มปลดล็อกผังต้นไม้ทักษะพิเศษ (Talent) ในเลเวลนี้',
              isTalent: true,
              unspentPoints,
            };
          } else if (step.slot === 'Stats') {
            currentRecommendation = {
              heroLevel,
              slot: 'Stats',
              skillName: '+2 All Attributes',
              targetLevel: undefined,
              reasonEn: 'Level up base attributes for bonus HP, mana, and damage.',
              reasonTh: 'อัพสเตตัสรวมเพื่อเพิ่มพลังชีวิต มานา และดาเมจพื้นฐาน',
              isTalent: false,
              unspentPoints,
            };
          } else {
            // Q, W, E, R slot
            let targetSlot = step.slot;
            let curLevel = learnedLevelsBySlot[targetSlot] || 0;
            let maxLevel = targetSlot === 'R' ? 3 : 4;

            // If this skill is already maxed or cannot be leveled, find fallback
            if (curLevel >= maxLevel) {
              const fallbackSlots = ['Q', 'W', 'E', 'R'].filter((s) => {
                const max = s === 'R' ? 3 : 4;
                return (learnedLevelsBySlot[s] || 0) < max;
              });
              if (fallbackSlots.length > 0) {
                targetSlot = fallbackSlots[0];
                curLevel = learnedLevelsBySlot[targetSlot] || 0;
              }
            }

            const abInfo = slotToAbility.get(targetSlot);
            const slotName = abInfo?.name || step.skillName;

            currentRecommendation = {
              heroLevel,
              slot: targetSlot,
              skillKey: abInfo?.key,
              skillName: slotName,
              targetLevel: curLevel + 1,
              reasonEn: `Meta progression recommends ${slotName} (Lvl ${curLevel + 1}) for optimal scaling.`,
              reasonTh: `ลำดับเมต้ายอดนิยมแนะนำอัพ ${slotName} (Lvl ${curLevel + 1}) เพื่อพัฒนาการที่ดีที่สุด`,
              isTalent: false,
              unspentPoints,
            };
          }
        }
      }
    }

    const analysis: HeroSkillBuildAnalysis = {
      heroName: buildData.heroName || cleanKey,
      abilities: heroAbilities,
      progression: buildData.progression,
      currentRecommendation,
      unspentPoints,
      learnedLevelsBySlot,
    };

    this.cache.set(cacheKey, analysis);
    return analysis;
  }
}

export const skillAdvisor = new SkillAdvisorEngine();
