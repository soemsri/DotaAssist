import { EnemyThreatAnalysis, TalentTierRecommendation, RawTalentTier } from '../types/meta';
import rawDotaTalents from '../data/dotaTalents.json';
import { apiService } from './apiService';

interface CuratedTalentTierConfig {
  left: {
    en: string;
    th: string;
    category?: 'survivability' | 'damage' | 'utility' | 'mobility';
  };
  right: {
    en: string;
    th: string;
    category?: 'survivability' | 'damage' | 'utility' | 'mobility';
  };
  defaultPick: 'left' | 'right';
  defaultReasonEn: string;
  defaultReasonTh: string;
  threatRules?: Array<{
    threat: 'magic_burst' | 'cc' | 'invis' | 'evasion' | 'regen' | 'illusions';
    pick: 'left' | 'right';
    reasonEn: string;
    reasonTh: string;
  }>;
}

type HeroTalentConfig = Record<10 | 15 | 20 | 25, CuratedTalentTierConfig>;

const CURATED_TALENTS: Record<string, HeroTalentConfig> = {
  antimage: {
    10: {
      left: { en: '+9 Attack Speed', th: '+9 ความเร็วโจมตี', category: 'damage' },
      right: { en: '+9 Strength (+180 HP)', th: '+9 Strength (+180 เลือด)', category: 'survivability' },
      defaultPick: 'left',
      defaultReasonEn: 'Faster creep clearing speed for Battle Fury acceleration.',
      defaultReasonTh: 'ฟาร์มครีปไวขึ้น เสริมจังหวะฟาร์ม Battle Fury',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'right',
          reasonEn: 'Survive heavy magic nukes and combo bursts without dying in disables.',
          reasonTh: 'เพิ่มเลือดเพื่อไม่ให้ตายคาคอมโบเวทหนักของศัตรู',
        },
        {
          threat: 'cc',
          pick: 'right',
          reasonEn: 'Extra raw HP buffer against long stun chains.',
          reasonTh: 'เพิ่มเลือดสำรองป้องกันการโดนสตั๊นรัวๆ',
        },
      ],
    },
    15: {
      left: { en: '-1s Blink Cooldown', th: '-1s คูลดาวน์ Blink', category: 'mobility' },
      right: { en: '+0.6s Mana Void Stun Duration', th: '+0.6s ระยะเวลาสตั๊น Mana Void', category: 'utility' },
      defaultPick: 'left',
      defaultReasonEn: 'Sub-4s Blink allows effortless repositioning and high map mobility.',
      defaultReasonTh: 'ลดคูลดาวน์บลิงก์เหลือต่ำกว่า 4 วินาที คล่องตัวสูงและหนีเอาตัวรอดง่าย',
      threatRules: [
        {
          threat: 'illusions',
          pick: 'right',
          reasonEn: 'AoE Mana Void stun lockdown on clustered illusion carriers.',
          reasonTh: 'เพิ่มสตั๊นหมู่ Mana Void เมื่อศัตรูรวมฝูงร่างเงา',
        },
        {
          threat: 'invis',
          pick: 'left',
          reasonEn: 'Shorter Blink cooldown to instantly disengage sneak initiations.',
          reasonTh: 'บลิงก์หนีได้เร็วขึ้นเมื่อโดนตัวล่องหนแอบเปิด',
        },
      ],
    },
    20: {
      left: { en: 'Counterspell Barrier / Dispel', th: 'Counterspell บาเรียสะท้อน / Dispel', category: 'survivability' },
      right: { en: '+200 Blink Cast Range', th: '+200 ระยะการร่าย Blink', category: 'mobility' },
      defaultPick: 'right',
      defaultReasonEn: 'Massive jump range to initiate on backline supports.',
      defaultReasonTh: 'ระยะโดดไกลขึ้นมากเพื่อล้วงซัพพอร์ตแถวหลัง',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'left',
          reasonEn: 'Free magic damage shield absorbs incoming burst spells.',
          reasonTh: 'เกราะดูดซับดาเมจเวท ป้องกันสกิลแรงของศัตรู',
        },
        {
          threat: 'cc',
          pick: 'left',
          reasonEn: 'Dispel status debuffs and deflect hostile disables.',
          reasonTh: 'ลบล้างสถานะสตั๊น/สโลว์ และสะท้อนสกิลล็อกขา',
        },
      ],
    },
    25: {
      left: { en: '-50s Mana Void Cooldown', th: '-50s คูลดาวน์ Mana Void', category: 'damage' },
      right: { en: '+20% Counterspell Magic Resist', th: '+20% ต้านทานเวท Counterspell', category: 'survivability' },
      defaultPick: 'left',
      defaultReasonEn: 'Enables Mana Void in virtually every skirmish and fight.',
      defaultReasonTh: 'ใช้อัลติเมทระเบิดมานาได้แทบทุกไฟต์',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'right',
          reasonEn: 'Near complete magic immunity (up to 85% effective resist).',
          reasonTh: 'ต้านทานเวทเกือบ 85% แทบไม่สะเทือนจากสกิลเวททุกชนิด',
        },
      ],
    },
  },

  axe: {
    10: {
      left: { en: '+20 Movement Speed', th: '+20 ความเร็วเคลื่อนที่', category: 'mobility' },
      right: { en: '+8 Armor', th: '+8 เกราะ', category: 'survivability' },
      defaultPick: 'right',
      defaultReasonEn: 'Massive physical damage reduction and synergy with Call.',
      defaultReasonTh: 'ลดดาเมจกายภาพมหาศาลและทำงานร่วมกับ Berserker\'s Call ได้ดีเยี่ยม',
      threatRules: [
        {
          threat: 'evasion',
          pick: 'right',
          reasonEn: 'High armor to tank physical agility carries.',
          reasonTh: 'เกราะหนาเพื่อยืนรับดาเมจจากแครี่สาย Agi',
        },
      ],
    },
    15: {
      left: { en: '+30 Berserker\'s Call Armor', th: '+30 เกราะช่วงกด Call', category: 'survivability' },
      right: { en: '+12% Battle Hunger Movement Speed', th: '+12% วิ่งเร็วจาก Battle Hunger', category: 'mobility' },
      defaultPick: 'left',
      defaultReasonEn: 'Unkillable armor spike during teamfight initiation.',
      defaultReasonTh: 'เกราะพุ่งสูงช่วงเปิดไฟต์ แทบไม่เข้าเนื้อ',
      threatRules: [
        {
          threat: 'regen',
          pick: 'left',
          reasonEn: 'Survive deep in enemy lines against high HP tanks.',
          reasonTh: 'ยืนชนในดงศัตรูตัวหนาได้อย่างปลอดภัย',
        },
      ],
    },
    20: {
      left: { en: 'Attacks Procs Counter Helix', th: 'การโจมตีธรรมดามีโอกาสสับหมุน Helix', category: 'damage' },
      right: { en: '+150 Culling Blade Damage', th: '+150 ดาเมจ Culling Blade', category: 'damage' },
      defaultPick: 'left',
      defaultReasonEn: 'Significantly increases sustained DPS while farming and fighting.',
      defaultReasonTh: 'เพิ่มดาเมจต่อเนื่องทั้งการฟาร์มและการดวลตัวต่อตัว',
      threatRules: [
        {
          threat: 'illusions',
          pick: 'left',
          reasonEn: 'Helix procs rapidly shred through dense illusion swarms.',
          reasonTh: 'สับหมุนต่อเนื่องละลายร่างเงาศัตรูอย่างรวดเร็ว',
        },
      ],
    },
    25: {
      left: { en: 'Battle Hunger Pierces Debuff Immunity', th: 'Battle Hunger ทะลุ BKB', category: 'damage' },
      right: { en: '+100 Berserker\'s Call AoE', th: '+100 รัศมี Berserker\'s Call', category: 'utility' },
      defaultPick: 'right',
      defaultReasonEn: 'Catches multiple heroes in Blink + Call initiations.',
      defaultReasonTh: 'บลิงก์เปิดล็อกศัตรูได้หลายตัวพร้อมกันในวงกว้าง',
      threatRules: [
        {
          threat: 'cc',
          pick: 'right',
          reasonEn: 'Massive Taunt radius stops whole enemy initiation squads.',
          reasonTh: 'กวาดหยุดทีมไฟต์ศัตรูได้ทั้งแผง',
        },
      ],
    },
  },

  juggernaut: {
    10: {
      left: { en: '+150 Blade Fury DPS', th: '+150 ดาเมจต่อวิ Blade Fury', category: 'damage' },
      right: { en: '+5 All Stats (+100 HP)', th: '+5 สเตตัสรวม (+100 เลือด)', category: 'survivability' },
      defaultPick: 'left',
      defaultReasonEn: 'High early kill potential and faster wave pushing.',
      defaultReasonTh: 'เบิร์สดาเมจสังหารศัตรูช่วงต้นเกมและดันเวฟไว',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'right',
          reasonEn: 'Extra HP to survive burst outside Blade Fury spin.',
          reasonTh: 'เพิ่มเลือดเอาตัวรอดช่วงที่ไม่ได้หมุน Blade Fury',
        },
        {
          threat: 'illusions',
          pick: 'left',
          reasonEn: 'High AoE magic DPS wipes illusion hordes quickly.',
          reasonTh: 'ดาเมจวงกว้างช่วยเคลียร์ร่างเงาและครีปฝูงได้ไว',
        },
      ],
    },
    15: {
      left: { en: '+25 Attack Speed', th: '+25 ความเร็วโจมตี', category: 'damage' },
      right: { en: '-20s Healing Ward Cooldown', th: '-20s คูลดาวน์ Healing Ward', category: 'utility' },
      defaultPick: 'left',
      defaultReasonEn: 'Scales directly with Omnislash slash frequency and right-clicks.',
      defaultReasonTh: 'เพิ่มความถี่ในการฟันระหว่างกด Omnislash และตีธรรมดา',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'right',
          reasonEn: 'Frequent Healing Wards sustain whole team after enemy burst.',
          reasonTh: 'ปักฮีลได้บ่อยเพื่อฟื้นฟูทีมหลังโดนเวทชุดใหญ่',
        },
      ],
    },
    20: {
      left: { en: '+50% Blade Dance Lifesteal', th: '+50% ดูดเลือดติดคริ Blade Dance', category: 'survivability' },
      right: { en: '+150 Blade Fury Radius', th: '+150 รัศมี Blade Fury', category: 'damage' },
      defaultPick: 'left',
      defaultReasonEn: 'Huge self-sustain in teamfights without relying on items.',
      defaultReasonTh: 'ดูดเลือดมหาศาล ยืนแลกในทีมไฟต์ได้ยาวนาน',
      threatRules: [
        {
          threat: 'illusions',
          pick: 'right',
          reasonEn: 'Giant spin radius catches slippery illusion heroes.',
          reasonTh: 'รัศมีหมุนกว้างครอบคลุมตัวแยกร่างทั้งหมด',
        },
      ],
    },
    25: {
      left: { en: '+475 Health', th: '+475 เลือด', category: 'survivability' },
      right: { en: '+1s Omnislash Duration', th: '+1s ระยะเวลา Omnislash', category: 'damage' },
      defaultPick: 'right',
      defaultReasonEn: 'Extra slashes guarantee solo-target kills on high priority cores.',
      defaultReasonTh: 'ฟันเพิ่มอีก 1 วินาที ปิดฉากตัวคอร์ศัตรูได้อย่างเด็ดขาด',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'left',
          reasonEn: 'Avoid instant deaths and survive late-game teamfight nukes.',
          reasonTh: 'เลือดเกือบ 500 ช่วยให้รอดจากสกิลเลทเกมที่รุนแรง',
        },
      ],
    },
  },

  crystal_maiden: {
    10: {
      left: { en: '+100 Crystal Nova Damage', th: '+100 ดาเมจ Crystal Nova', category: 'damage' },
      right: { en: '+200 Health', th: '+200 เลือด', category: 'survivability' },
      defaultPick: 'right',
      defaultReasonEn: 'Crucial health pool increase for squishy support.',
      defaultReasonTh: 'เพิ่มเลือดเพื่อไม่ให้บางจนโดนเก็บง่าย',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'right',
          reasonEn: 'Prevents being 1-shot by enemy nukers.',
          reasonTh: 'ป้องกันการโดนเวทคอมโบทีเดียวตาย',
        },
        {
          threat: 'invis',
          pick: 'right',
          reasonEn: 'Survive sneak ambushes from stealth hunters.',
          reasonTh: 'มีเลือดสำรองรอดจากการดักซุ่มของตัวล่องหน',
        },
      ],
    },
    15: {
      left: { en: 'Frostbite grants 200 Barrier', th: 'Frostbite ได้รับเกราะ 200 Barrier', category: 'survivability' },
      right: { en: '+125 Cast Range', th: '+125 ระยะร่ายสกิล', category: 'utility' },
      defaultPick: 'right',
      defaultReasonEn: 'Enables casting Frostbite and Nova from a safe distance.',
      defaultReasonTh: 'ยืนร่ายสกิลสตั๊น/สโลว์จากระยะปลอดภัยด้านหลัง',
      threatRules: [
        {
          threat: 'cc',
          pick: 'right',
          reasonEn: 'Stay outside enemy initiation and stun ranges.',
          reasonTh: 'ยืนอยู่นอกระยะการเปิดสตั๊นของศัตรู',
        },
      ],
    },
    20: {
      left: { en: '+200 Attack Speed', th: '+200 ความเร็วโจมตี', category: 'damage' },
      right: { en: '+50 Freezing Field Damage', th: '+50 ดาเมจ Freezing Field', category: 'damage' },
      defaultPick: 'right',
      defaultReasonEn: 'Massive teamfight AoE ultimate damage scaling.',
      defaultReasonTh: 'เสริมดาเมจพายุหิมะในทีมไฟต์ให้รุนแรงขึ้นมาก',
      threatRules: [
        {
          threat: 'illusions',
          pick: 'right',
          reasonEn: 'Freezing Field wipes illusion swarms in seconds.',
          reasonTh: 'พายุหิมะเคลียร์ร่างเงาศัตรูได้ในพริบตา',
        },
      ],
    },
    25: {
      left: { en: '+240 Crystal Nova AoE', th: '+240 รัศมี Crystal Nova', category: 'utility' },
      right: { en: '+1.25s Frostbite Duration', th: '+1.25s ระยะเวลา Frostbite', category: 'utility' },
      defaultPick: 'right',
      defaultReasonEn: 'Nearly 4 seconds of root disable per Frostbite.',
      defaultReasonTh: 'ล็อกขาขังศัตรูนานเกือบ 4 วินาที',
      threatRules: [
        {
          threat: 'evasion',
          pick: 'right',
          reasonEn: 'Root prevents blinking and mobility skills of slippery agility carries.',
          reasonTh: 'ล็อกขาไม่ให้แครี่คล่องตัวหรือหลบหลีกหนีรอดไปได้',
        },
      ],
    },
  },

  lion: {
    10: {
      left: { en: '+15 Movement Speed', th: '+15 ความเร็วเคลื่อนที่', category: 'mobility' },
      right: { en: '+60 Earth Spike Damage', th: '+60 ดาเมจ Earth Spike', category: 'damage' },
      defaultPick: 'left',
      defaultReasonEn: 'Better positioning for Blink Hex initiations.',
      defaultReasonTh: 'เดินทำตำแหน่งเพื่อบลิงก์เสก Hex ได้ไวขึ้น',
      threatRules: [
        {
          threat: 'invis',
          pick: 'left',
          reasonEn: 'Move quickly into Dust/Sentry range to catch invis runners.',
          reasonTh: 'เดินเข้าปารวมระยะดักจับตัวล่องหนได้ทัน',
        },
      ],
    },
    15: {
      left: { en: '+125 Cast Range', th: '+125 ระยะร่ายสกิล', category: 'utility' },
      right: { en: '+70 Mana Drain per second', th: '+70 ดูดมานาต่อวิ', category: 'utility' },
      defaultPick: 'left',
      defaultReasonEn: 'Crucial for safe Hex, Stun, and Finger targeting.',
      defaultReasonTh: 'สำคัญมากสำหรับการเสก Hex และแทงสตั๊นจากระยะปลอดภัย',
      threatRules: [
        {
          threat: 'cc',
          pick: 'left',
          reasonEn: 'Cast disables from outside enemy crowd-control zones.',
          reasonTh: 'ร่ายสกิลขัดจังหวะจากนอกระยะสกิลของศัตรู',
        },
      ],
    },
    20: {
      left: { en: '+20 Finger Damage per kill', th: '+20 ดาเมจ Finger ต่อคิล', category: 'damage' },
      right: { en: 'Earth Spike Reflects Damage', th: 'Earth Spike สะท้อนดาเมจ', category: 'utility' },
      defaultPick: 'left',
      defaultReasonEn: 'Snowballs Finger of Death into a 1500+ nuke.',
      defaultReasonTh: 'สโนว์บอลดาเมจ Finger of Death ให้ทะลุ 1500+ ดาเมจ',
      threatRules: [
        {
          threat: 'regen',
          pick: 'left',
          reasonEn: 'Huge burst finishes off high regen tanks before they heal.',
          reasonTh: 'เบิร์สดาเมจชุดเดียวปิดฉากตัวแทงก์ก่อนที่เลือดจะเด้งทัน',
        },
      ],
    },
    25: {
      left: { en: '+2.5s Hex Duration', th: '+2.5s ระยะเวลา Hex', category: 'utility' },
      right: { en: '+800 Mana Drain Health Steal AoE', th: '+800 ดูดเลือด/มานาหมู่', category: 'survivability' },
      defaultPick: 'left',
      defaultReasonEn: 'Creates a devastating 5.7-second uninterrupted hex lockdown.',
      defaultReasonTh: 'เสกเป็นแกะล็อกเป้าหมายนานเกือบ 6 วินาที สู้กลับไม่ได้',
      threatRules: [
        {
          threat: 'evasion',
          pick: 'left',
          reasonEn: 'Hex disables all evasion and passive abilities during lockdown.',
          reasonTh: 'Hex ปิดการหลบหลีกและพาสซีฟทั้งหมดของศัตรูอย่างสมบูรณ์',
        },
      ],
    },
  },

  phantom_assassin: {
    10: {
      left: { en: '+150 Health', th: '+150 เลือด', category: 'survivability' },
      right: { en: '+0.5s Phantom Strike Duration', th: '+0.5s ระยะเวลา Phantom Strike', category: 'damage' },
      defaultPick: 'right',
      defaultReasonEn: 'More sustained attack speed strikes on jump.',
      defaultReasonTh: 'ฟันรัวได้นานขึ้นหลังจากวาร์ปฟัน',
      threatRules: [
        {
          threat: 'magic_burst',
          pick: 'left',
          reasonEn: 'Extra buffer against magic bursts that ignore Blur evasion.',
          reasonTh: 'เพิ่มเลือดรับมือเวทเบิร์สที่หลบไม่ได้',
        },
      ],
    },
    15: {
      left: { en: '+25% Cleave', th: '+25% โจมตีกระจาย Cleave', category: 'damage' },
      right: { en: '+20% Blur Evasion', th: '+20% หลบหลีก Blur', category: 'survivability' },
      defaultPick: 'right',
      defaultReasonEn: 'Reaches over 70% physical evasion against enemy right-clicks.',
      defaultReasonTh: 'ดันอัตราหลบหลีกกายภาพขึ้นสูงกว่า 70%',
      threatRules: [
        {
          threat: 'illusions',
          pick: 'left',
          reasonEn: 'Cleaves through illusion swarms and jungle stacks effortlessly.',
          reasonTh: 'ฟันกระจายเคลียร์ร่างเงาและกองครีปป่าได้อย่างรวดเร็ว',
        },
      ],
    },
    20: {
      left: { en: '+60 Phantom Strike Attack Speed', th: '+60 ความเร็วโจมตี Phantom Strike', category: 'damage' },
      right: { en: '+25% Stifling Dagger Damage', th: '+25% ดาเมจมีด Stifling Dagger', category: 'damage' },
      defaultPick: 'left',
      defaultReasonEn: 'Instant burst attack speed when jumping target.',
      defaultReasonTh: 'สับรัวติดคริไวสุดๆ ทันทีที่กระโดดเข้าหาเป้าหมาย',
      threatRules: [
        {
          threat: 'cc',
          pick: 'right',
          reasonEn: 'Safe poke and critical crits from long range.',
          reasonTh: 'ปามีดส่องคริจากระยะไกลโดยไม่ต้องเสี่ยงโดนสตั๊น',
        },
      ],
    },
    25: {
      left: { en: 'Triple Stifling Dagger', th: 'ปามีด Stifling Dagger 3 แฉก', category: 'damage' },
      right: { en: '+7% Coup de Grace Chance', th: '+7% โอกาสติดคริ Coup de Grace', category: 'damage' },
      defaultPick: 'right',
      defaultReasonEn: 'Pushes critical proc chance to over 22% on every attack.',
      defaultReasonTh: 'เพิ่มโอกาสติดคริสูงขึ้นมาก ฟันติดบ่อยทุกจังหวะ',
      threatRules: [
        {
          threat: 'illusions',
          pick: 'left',
          reasonEn: 'Daggers clear multiple illusions and apply slows across teamfights.',
          reasonTh: 'ปามีดสามแฉกกระจายคริและสโลว์ศัตรูหลายตัวพร้อมกัน',
        },
      ],
    },
  },
};

/**
 * Fallback generic heuristic talent generator for heroes without explicit curated tables
 */
function generateGenericTalents(
  _heroKey: string,
  threats: EnemyThreatAnalysis[],
): TalentTierRecommendation[] {
  const hasMagicBurst = threats.some((t) => t.threatType === 'magic_burst');
  const hasCC = threats.some((t) => t.threatType === 'cc');
  const hasIllusions = threats.some((t) => t.threatType === 'illusions');
  const hasEvasion = threats.some((t) => t.threatType === 'evasion');
  const hasRegen = threats.some((t) => t.threatType === 'regen');

  return [
    {
      level: 10,
      left: { en: '+175 Health / Magic Resist', th: '+175 เลือด / ต้านเวท', category: 'survivability' },
      right: { en: '+15 Attack Speed / Damage', th: '+15 ความเร็วโจมตี / ดาเมจ', category: 'damage' },
      recommended: hasMagicBurst || hasCC ? 'left' : 'right',
      reasonTh: hasMagicBurst || hasCC
        ? 'แนะนำฝั่งซ้าย: เพิ่มเลือดและต้านทานเวทเพื่อรับมือคอมโบเบิร์สของศัตรู'
        : 'แนะนำฝั่งขวา: เพิ่มความเร็วโจมตีและดาเมจช่วยดันเกมและฟาร์มไวขึ้น',
      reasonEn: hasMagicBurst || hasCC
        ? 'Recommend Left: Health & magic defense against enemy bursts.'
        : 'Recommend Right: Attack speed & damage for farming and lane dominance.',
      matchedThreat: hasMagicBurst ? 'magic_burst' : (hasCC ? 'cc' : undefined),
    },
    {
      level: 15,
      left: { en: '+125 Cast Range / Mobility', th: '+125 ระยะร่ายสกิล / ความคล่องตัว', category: 'mobility' },
      right: { en: '+15% Spell Amp / Cooldown', th: '+15% ดาเมจสกิล / ลดคูลดาวน์', category: 'utility' },
      recommended: hasCC ? 'left' : 'right',
      reasonTh: hasCC
        ? 'แนะนำฝั่งซ้าย: ระยะร่ายสกิลช่วยให้ยืนทำเกมจากตำแหน่งปลอดภัยนอกวงสตั๊น'
        : 'แนะนำฝั่งขวา: เสริมพลังสกิลและลดคูลดาวน์ให้ใช้งานได้ต่อเนื่อง',
      reasonEn: hasCC
        ? 'Recommend Left: Cast range keeps you positioned safely outside enemy CC.'
        : 'Recommend Right: Spell power and cooldown reduction for sustained fights.',
      matchedThreat: hasCC ? 'cc' : undefined,
    },
    {
      level: 20,
      left: { en: '+AoE Radius / Cleave', th: '+รัศมีสกิลหมู่ / โจมตีกระจาย', category: 'utility' },
      right: { en: '+Special Ability Critical / Burst', th: '+โอกาสติดคริติคอล / เบิร์สเป้าเดี่ยว', category: 'damage' },
      recommended: hasIllusions ? 'left' : (hasRegen ? 'right' : 'left'),
      reasonTh: hasIllusions
        ? 'แนะนำฝั่งซ้าย: สกิลวงกว้างช่วยเคลียร์ร่างเงาและยูนิตฝูงของศัตรูได้อย่างรวดเร็ว'
        : (hasRegen ? 'แนะนำฝั่งขวา: ดาเมจเป้าเดี่ยวหนักเพื่อเจาะเลือดตัวแทงก์/ดูดเลือด' : 'แนะนำฝั่งซ้าย: เพิ่มประสิทธิภาพสกิลหมู่ในทีมไฟต์'),
      reasonEn: hasIllusions
        ? 'Recommend Left: AoE clear rapidly decimates enemy illusion swarms.'
        : (hasRegen ? 'Recommend Right: Heavy single-target burst to pierce high-regen tanks.' : 'Recommend Left: Higher teamfight area control.'),
      matchedThreat: hasIllusions ? 'illusions' : (hasRegen ? 'regen' : undefined),
    },
    {
      level: 25,
      left: { en: 'Pierces Debuff Immunity / Extra Duration', th: 'สกิลทะลุ Debuff Immunity / ยืดเวลา', category: 'utility' },
      right: { en: 'Massive Ultimate CD / Survivability', th: 'ลดคูลดาวน์อัลติเมท / เลือดมหาศาล', category: 'survivability' },
      recommended: hasEvasion || hasCC ? 'left' : 'right',
      reasonTh: hasEvasion || hasCC
        ? 'แนะนำฝั่งซ้าย: สกิลทะลุ BKB และขัดจังหวะสำคัญ ช่วยพลิกเกมเลทเกม'
        : 'แนะนำฝั่งขวา: รีคูลดาวน์และเพิ่มความถึกเพื่อความต่อเนื่องในไฟต์ชี้ชะตา',
      reasonEn: hasEvasion || hasCC
        ? 'Recommend Left: BKB piercing ability turns the tide in late-game teamfights.'
        : 'Recommend Right: Lower cooldowns and survivability for decisive base pushes.',
      matchedThreat: hasCC ? 'cc' : (hasEvasion ? 'evasion' : undefined),
    },
  ];
}

const DOTA_TALENTS_DB = rawDotaTalents as unknown as Record<string, RawTalentTier[]>;

/**
 * Evaluates raw talent choices for any hero against active enemy threats.
 */
function evaluateRawTalents(
  rawTiers: RawTalentTier[],
  threats: EnemyThreatAnalysis[],
): TalentTierRecommendation[] {
  const hasMagicBurst = threats.some((t) => t.threatType === 'magic_burst');
  const hasCC = threats.some((t) => t.threatType === 'cc');
  const hasIllusions = threats.some((t) => t.threatType === 'illusions');
  const hasEvasion = threats.some((t) => t.threatType === 'evasion');
  const hasRegen = threats.some((t) => t.threatType === 'regen');

  return rawTiers.map((tier) => {
    const leftText = (tier.left.en + ' ' + (tier.left.category || '')).toLowerCase();
    const rightText = (tier.right.en + ' ' + (tier.right.category || '')).toLowerCase();

    let recommended: 'left' | 'right' = tier.defaultPick || 'right';
    let reasonEn = tier.defaultReasonEn || 'Balanced core talent for standard pacing.';
    let reasonTh = tier.defaultReasonTh || 'ทักษะพื้นฐานมาตรฐานสำหรับจังหวะการเล่นทั่วไป';
    let matchedThreat: TalentTierRecommendation['matchedThreat'] = undefined;

    // 1. Magic burst threat: favors Health, Strength, Magic Resist, Barrier, Shield
    if (hasMagicBurst) {
      const leftDefense = /health|strength|magic resist|barrier|shield|hp|survivability/.test(leftText);
      const rightDefense = /health|strength|magic resist|barrier|shield|hp|survivability/.test(rightText);
      if (leftDefense && !rightDefense) {
        recommended = 'left';
        reasonEn = 'Bonus HP and magic defense against enemy burst magic damage.';
        reasonTh = 'เพิ่มเลือดและต้านทานเวทเพื่อรับมือคอมโบเวทหนักของศัตรู';
        matchedThreat = 'magic_burst';
      } else if (rightDefense && !leftDefense) {
        recommended = 'right';
        reasonEn = 'Bonus HP and magic defense against enemy burst magic damage.';
        reasonTh = 'เพิ่มเลือดและต้านทานเวทเพื่อรับมือคอมโบเวทหนักของศัตรู';
        matchedThreat = 'magic_burst';
      }
    }

    // 2. Illusion threat: favors Cleave, AoE, Radius, Bounce, DPS, Multishot
    if (!matchedThreat && hasIllusions) {
      const leftAoe = /cleave|aoe|radius|bounce|multishot|dps|split/.test(leftText);
      const rightAoe = /cleave|aoe|radius|bounce|multishot|dps|split/.test(rightText);
      if (leftAoe && !rightAoe) {
        recommended = 'left';
        reasonEn = 'Area-of-effect damage to rapidly wipe enemy illusion swarms.';
        reasonTh = 'ดาเมจวงกว้างช่วยเคลียร์ร่างเงาและยูนิตฝูงของศัตรูได้อย่างรวดเร็ว';
        matchedThreat = 'illusions';
      } else if (rightAoe && !leftAoe) {
        recommended = 'right';
        reasonEn = 'Area-of-effect damage to rapidly wipe enemy illusion swarms.';
        reasonTh = 'ดาเมจวงกว้างช่วยเคลียร์ร่างเงาและยูนิตฝูงของศัตรูได้อย่างรวดเร็ว';
        matchedThreat = 'illusions';
      }
    }

    // 3. Crowd Control threat: favors Cast Range, Mobility, Debuff Immunity, Status Resist, Blink
    if (!matchedThreat && hasCC) {
      const leftRange = /cast range|range|mobility|blink|debuff immunity|status resist/.test(leftText);
      const rightRange = /cast range|range|mobility|blink|debuff immunity|status resist/.test(rightText);
      if (leftRange && !rightRange) {
        recommended = 'left';
        reasonEn = 'Cast range and mobility keep you safely positioned outside enemy disables.';
        reasonTh = 'ระยะร่ายสกิลและความคล่องตัวช่วยให้ยืนทำเกมจากตำแหน่งปลอดภัยนอกวงสตั๊น';
        matchedThreat = 'cc';
      } else if (rightRange && !leftRange) {
        recommended = 'right';
        reasonEn = 'Cast range and mobility keep you safely positioned outside enemy disables.';
        reasonTh = 'ระยะร่ายสกิลและความคล่องตัวช่วยให้ยืนทำเกมจากตำแหน่งปลอดภัยนอกวงสตั๊น';
        matchedThreat = 'cc';
      }
    }

    // 4. Evasion threat: favors True Strike, Armor, Accuracy, Hex, Pierce
    if (!matchedThreat && hasEvasion) {
      const leftAntiEva = /true strike|accuracy|armor|hex|pierce/.test(leftText);
      const rightAntiEva = /true strike|accuracy|armor|hex|pierce/.test(rightText);
      if (leftAntiEva && !rightAntiEva) {
        recommended = 'left';
        reasonEn = 'Counters elusive evasion carries and physical right-clicks.';
        reasonTh = 'แก้ทางตัวหลบหลีกและแครี่สาย Agi กายภาพ';
        matchedThreat = 'evasion';
      } else if (rightAntiEva && !leftAntiEva) {
        recommended = 'right';
        reasonEn = 'Counters elusive evasion carries and physical right-clicks.';
        reasonTh = 'แก้ทางตัวหลบหลีกและแครี่สาย Agi กายภาพ';
        matchedThreat = 'evasion';
      }
    }

    // 5. Tank / Regen threat: favors Critical, Minus Armor, Attack Speed, Damage
    if (!matchedThreat && hasRegen) {
      const leftBurst = /critical|minus armor|damage|attack speed|dismember|multiplier/.test(leftText);
      const rightBurst = /critical|minus armor|damage|attack speed|dismember|multiplier/.test(rightText);
      if (leftBurst && !rightBurst) {
        recommended = 'left';
        reasonEn = 'High sustained burst damage to cut down high-health regenerative tanks.';
        reasonTh = 'ดาเมจหนักเพื่อเจาะเลือดตัวแทงก์และฟื้นฟูเลือด';
        matchedThreat = 'regen';
      } else if (rightBurst && !leftBurst) {
        recommended = 'right';
        reasonEn = 'High sustained burst damage to cut down high-health regenerative tanks.';
        reasonTh = 'ดาเมจหนักเพื่อเจาะเลือดตัวแทงก์และฟื้นฟูเลือด';
        matchedThreat = 'regen';
      }
    }

    return {
      level: tier.level,
      left: { ...tier.left },
      right: { ...tier.right },
      recommended,
      reasonEn,
      reasonTh,
      matchedThreat,
    };
  });
}

class TalentAdvisorEngine {
  private recommendationCache = new Map<string, TalentTierRecommendation[]>();

  public clearCache() {
    this.recommendationCache.clear();
  }

  private evaluateCuratedConfig(
    config: HeroTalentConfig,
    threats: EnemyThreatAnalysis[],
  ): TalentTierRecommendation[] {
    const tiers: TalentTierRecommendation[] = [];
    const levels: Array<10 | 15 | 20 | 25> = [10, 15, 20, 25];

    for (const lvl of levels) {
      const tierConfig = config[lvl];
      let pick = tierConfig.defaultPick;
      let reasonEn = tierConfig.defaultReasonEn;
      let reasonTh = tierConfig.defaultReasonTh;
      let matchedThreat: TalentTierRecommendation['matchedThreat'] = undefined;

      if (tierConfig.threatRules && tierConfig.threatRules.length > 0) {
        for (const rule of tierConfig.threatRules) {
          const matched = threats.find((t) => t.threatType === rule.threat);
          if (matched) {
            pick = rule.pick;
            reasonEn = rule.reasonEn;
            reasonTh = rule.reasonTh;
            matchedThreat = rule.threat;
            break;
          }
        }
      }

      tiers.push({
        level: lvl,
        left: { ...tierConfig.left },
        right: { ...tierConfig.right },
        recommended: pick,
        reasonEn,
        reasonTh,
        matchedThreat,
      });
    }

    return tiers;
  }

  public getTalentRecommendations(
    heroNameOrKey: string,
    threats: EnemyThreatAnalysis[],
  ): TalentTierRecommendation[] {
    const cleanKey = heroNameOrKey.replace(/^npc_dota_hero_/, '').toLowerCase();
    if (!cleanKey) return [];

    const threatSig = threats.map((t) => t.threatType).sort().join(',');
    const cacheKey = `${cleanKey}:${threatSig}`;
    const cached = this.recommendationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let recommendations: TalentTierRecommendation[];

    // 1. High-priority hand-curated hero table
    const curatedConfig = CURATED_TALENTS[cleanKey];
    if (curatedConfig) {
      recommendations = this.evaluateCuratedConfig(curatedConfig, threats);
    } else {
      // 2. OpenDota live API / dynamic cache
      const liveTiers = apiService.getHeroTalents(cleanKey);
      if (liveTiers && liveTiers.length === 4) {
        recommendations = evaluateRawTalents(liveTiers, threats);
      } else {
        // 3. Bundled 127+ heroes static dataset
        const bundledTiers = DOTA_TALENTS_DB[cleanKey];
        if (bundledTiers && bundledTiers.length === 4) {
          recommendations = evaluateRawTalents(bundledTiers, threats);
        } else {
          // 4. Fallback generic archetype generator
          recommendations = generateGenericTalents(cleanKey, threats);
        }
      }
    }

    this.recommendationCache.set(cacheKey, recommendations);
    return recommendations;
  }

  public getTalentAdviceForLevel(
    currentLevel: number,
    tiers: TalentTierRecommendation[],
  ): TalentTierRecommendation | null {
    if (currentLevel < 10) return null;
    if (currentLevel >= 10 && currentLevel < 15) return tiers.find((t) => t.level === 10) || null;
    if (currentLevel >= 15 && currentLevel < 20) return tiers.find((t) => t.level === 15) || null;
    if (currentLevel >= 20 && currentLevel < 25) return tiers.find((t) => t.level === 20) || null;
    if (currentLevel >= 25) return tiers.find((t) => t.level === 25) || null;
    return null;
  }
}

export const talentAdvisor = new TalentAdvisorEngine();
