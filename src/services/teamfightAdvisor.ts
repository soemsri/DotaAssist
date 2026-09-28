import heroes from '../data/dotaHeroes.json';
import type { GSIPayload } from '../types/gsi';
import type { Role } from './alertProfiles';
import { getEnemyPickClasses } from './draftService';
import type { EnemyUltimateSlot } from './enemyUltimateService';

export type FightDuty = 'auto' | 'initiate' | 'follow' | 'protect' | 'counter';
export const DUTIES: FightDuty[] = ['auto', 'initiate', 'follow', 'protect', 'counter'];
export interface FightItem { name: string; reason: string }
export interface FightPlan {
  duty: Exclude<FightDuty, 'auto'>; task: string; target: string; timing: string;
  retreat: string; evidence: string; items: FightItem[]; economy: string;
  status: 'prepare' | 'wait' | 'recover' | 'unknown'; estimates: string[];
}
const catalog = new Map(heroes.map(h => [h.name, h]));
const normalize = (name: string) => name.startsWith('npc_dota_hero_') ? name : `npc_dota_hero_${name}`;
export function makeFightPlan(payload: GSIPayload | null, connected: boolean, role: Role, selected: FightDuty,
  slots: EnemyUltimateSlot[], thai: boolean): FightPlan | null {
  const p = payload;
  if (!connected || !p?.hero?.name || p.map?.game_state !== 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
    || !Number.isFinite(p.map.clock_time) || p.map.clock_time < 1800) return null;
  const t = (th: string, en: string) => thai ? th : en;
  const hero = catalog.get(normalize(p.hero.name));
  const duty = selected !== 'auto' ? selected : role === 'support' ? 'protect'
    : role === 'offlane' ? (hero?.roles.includes('Initiator') ? 'initiate' : 'counter')
    : role === 'mid' && hero?.roles.includes('Initiator') ? 'counter' : 'follow';
  const names = [...new Set([...getEnemyPickClasses(p.draft, p.player?.team_name).map(normalize),
    ...slots.filter(s => s.source === 'manual' && s.heroClass).map(s => normalize(s.heroClass))])];
  const enemies = names.map(name => catalog.get(name)).filter((h): h is typeof heroes[number] => !!h);
  const priority = [...enemies].sort((a,b) => {
    const score = (h: typeof a) => h.roles.includes('Support') ? 3 : h.roles.includes('Disabler') ? 2 : h.roles.includes('Carry') ? 1 : 0;
    return score(b)-score(a) || a.id-b.id;
  })[0];
  const task = {
    initiate: t('เปิดเมื่อเพื่อนตามถึง เลือกมุมเข้าและทางถอยก่อนใช้สกิล', 'Initiate only with allies in follow-up range; choose an approach and exit.'),
    follow: hero?.attack_type === 'Ranged'
      ? t('ยืนแนวหลัง ทำดาเมจจากระยะปลอดภัยหลังเพื่อนเปิด', 'Deal damage from the backline after allied initiation.')
      : t('รอเพื่อนเปิด แล้วเข้าถึงเป้าหมายที่ตีได้โดยไม่แยกจากทีม', 'Follow allied initiation onto a reachable target without separating from the team.'),
    protect: t('อยู่ในระยะช่วยตัวทำดาเมจ เก็บสกิลเซฟหรือหยุดตัวที่เข้าหาเพื่อน', 'Stay within reach of your damage dealer; reserve saves or control for divers.'),
    counter: t('เว้นระยะจากคนยืนหน้า รอศัตรูทุ่มสกิลแล้วค่อยสวน', 'Keep spacing behind the frontline and counter after enemy commitment.'),
  }[duty];
  const target = duty === 'protect'
    ? t('หยุดศัตรูที่กำลังเข้าถึงตัวทำดาเมจของเรา อย่าไล่จนพ้นระยะช่วยเพื่อน', 'Control whoever reaches your damage dealer; do not chase out of save range.')
    : priority
      ? t(`พิจารณากดดัน ${priority.localized_name} ก่อน ถ้าเห็นตัวและเข้าถึงได้อย่างปลอดภัย; จัดลำดับจากแท็กฮีโร่ ไม่ใช่ตำแหน่งจริง`, `Consider pressuring ${priority.localized_name} first if visible and safely reachable; priority uses hero tags, not live positioning.`)
      : t('ยังไม่ทราบทีมศัตรูครบ เล็งตัวที่เพื่อนล็อกได้และเข้าถึงอย่างปลอดภัย', 'Enemy lineup unavailable; focus a safely reachable target controlled by allies.');
  const owned = new Set(Object.values(p.items ?? {}).map(i => i?.name));
  const has = (key: string) => owned.has(`item_${key}`);
  const activeItems = Object.entries(p.items ?? {}).filter(([key]) => /^slot[0-5]$/.test(key)).map(([,v]) => v);
  const bkb = activeItems.find(i => i?.name === 'item_black_king_bar');
  const blink = activeItems.find(i => ['item_blink','item_overwhelming_blink','item_swift_blink','item_arcane_blink'].includes(i?.name ?? ''));
  const tool = duty === 'initiate' ? blink : duty === 'follow' ? bkb : undefined;
  const unknown = !enemies.length || !p.items || p.hero.alive === undefined || p.hero.health_percent === undefined;
  const status: FightPlan['status'] = (p.hero.alive === false || (p.hero.health_percent ?? 100) < 35) ? 'recover'
    : p.map.paused || (tool && ((tool.cooldown ?? 0) > 0 || tool.can_cast === false)) ? 'wait'
    : unknown ? 'unknown' : 'prepare';
  const timing = status === 'recover' ? t('ยังไม่พร้อมไฟท์: รอเกิดหรือฟื้นเลือดก่อน หลีกเลี่ยงการฝืนเข้า', 'Not ready: respawn or recover health before committing.')
    : status === 'wait' ? t('รอก่อน: เกมหยุดอยู่ หรือไอเทมสำคัญสำหรับหน้าที่ยังใช้ไม่ได้', 'Wait: the game is paused or a key tool for your duty is unavailable.')
    : status === 'unknown' ? t('ข้อมูลไม่พอให้สั่งเข้า ตั้งรับและตรวจตำแหน่งกับสกิลจากในเกมก่อน', 'Insufficient information to call an engage; hold and check positions and abilities in game.')
    : t('เตรียมได้ แต่เข้าต่อเมื่อเห็นเป้าหมาย เพื่อนตามถึง และตรวจสกิลสำคัญแล้ว; ถ้าศัตรูใช้สกิลหยุดหลักไป ให้พิจารณาตามทันที', 'Prepare, but commit only with target vision, allied follow-up and key abilities checked; consider following promptly after enemy control is spent.');
  const items: FightItem[] = [];
  const add = (key: string, name: string, th: string, en: string, upgrades: string[] = []) => {
    if (!has(key) && !upgrades.some(has) && items.length < 2) items.push({ name, reason: t(th,en) });
  };
  if (p.items && enemies.length) {
    if (duty === 'protect' || role === 'support') {
      add('force_staff', 'Force Staff', 'ถ้าปัญหาคือเพื่อนถูกเข้าถึง ให้พิจารณาเครื่องมือช่วยจัดระยะ', 'If allies are being reached, consider a repositioning tool.', ['hurricane_pike']);
      add('glimmer_cape', 'Glimmer Cape', 'ทางเลือกถ้าต้องช่วยเพื่อนรับแรงกดดัน; ตรวจการตรวจจับของศัตรูก่อนใช้', 'Alternative for protecting allies under pressure; check enemy detection.');
    } else {
      if (enemies.some(h => h.roles.includes('Disabler') || h.roles.includes('Nuker')))
        add('black_king_bar', 'Black King Bar', 'ถ้าโดนหยุดจนทำหน้าที่ไม่ได้ ให้พิจารณาป้องกันตัว; ไม่ได้กันทุกสกิล', 'If control prevents your contribution, consider protection; it does not stop every ability.');
      if (duty === 'initiate' && hero?.roles.includes('Initiator'))
        add('blink', 'Blink Dagger', 'ถ้าเปิดไม่ถึงเป้าหมาย ให้พิจารณาเครื่องมือเข้าถึงพร้อมเพื่อน', 'If you cannot reach an opening, consider an approach tool with allied follow-up.', ['overwhelming_blink','swift_blink','arcane_blink']);
      if (hero?.attack_type === 'Ranged')
        add('force_staff', 'Force Staff', 'ทางเลือกถ้าต้องรักษาระยะจากตัวเข้าประชิด', 'Alternative if you need spacing against divers.', ['hurricane_pike']);
      add('sheepstick', 'Scythe of Vyse', 'ถ้าอยู่รอดแล้วแต่ทีมล็อกเป้าหมายไม่ได้ ให้พิจารณาเพิ่มตัวหยุด', 'If survival is covered but targets escape, consider additional control.');
    }
  }
  const estimates = slots.filter(s => names.includes(normalize(s.heroClass)) && s.state === 'cooldown' && s.cooldownEndClock > p.map!.clock_time)
    .slice(0,2).map(s => t(`${s.heroName}: อัลติคาดว่าเหลือ ${Math.ceil(s.cooldownEndClock-p.map!.clock_time)} วินาที จากเวลาที่บันทึก ไม่ยืนยันว่าศัตรูไร้สกิล`, `${s.heroName}: ultimate estimated ${Math.ceil(s.cooldownEndClock-p.map!.clock_time)}s remaining from recorded cast; other abilities are unknown.`));
  return { duty, task, target, timing, status, items, estimates,
    retreat: t('ถอยเมื่อเพื่อนตามไม่ถึง ตัวทำดาเมจถูกแยก หรือเครื่องมือเอาตัวรอดหมด อย่าไล่เข้าพื้นที่มืด', 'Disengage if allies cannot follow, your damage dealer is isolated, or survival tools are spent; do not chase into fog.'),
    economy: p.hero.buyback_cost !== undefined && p.player?.gold !== undefined
      ? t(`เงินเหนือค่าบายแบ็ค ${Math.max(0,p.player.gold-p.hero.buyback_cost)}; ตรวจคูลดาวน์บายแบ็คและราคาในเกมก่อนซื้อ`, `Gold above buyback cost: ${Math.max(0,p.player.gold-p.hero.buyback_cost)}; check buyback cooldown and in-game prices before buying.`)
      : t('ไม่ทราบเงินสำรองบายแบ็ค ตรวจในเกมก่อนซื้อ', 'Buyback reserve unknown; check in game before buying.'),
    evidence: t(`แผนตามกฎ • role ${role} • ${hero?.localized_name ?? p.hero.name} • พบศัตรู ${enemies.length}/5 • ไม่ทราบตำแหน่ง/ไอเทม/สกิลศัตรูครบ`, `Rule-based plan • ${role} • ${hero?.localized_name ?? p.hero.name} • ${enemies.length}/5 enemies known • enemy positions/items/abilities incomplete`),
  };
}

/** Semantic changes only; clock/countdown ticks never trigger additional speech. */
export class FightVoiceGate {
  private match = ''; private key = ''; private lastAt = -Infinity;
  update(match: string, plan: FightPlan | null, clock: number, enabled: boolean): string | null {
    if (match !== this.match || clock < this.lastAt) { this.match = match; this.key = ''; this.lastAt = -Infinity; }
    if (!plan || !enabled) { this.key = ''; return null; }
    const key = `${plan.duty}:${plan.status}`;
    if (key === this.key) return null;
    this.key = key;
    if (clock-this.lastAt < 120 || plan.status === 'unknown') return null;
    this.lastAt = clock;
    return `${plan.task} ${plan.timing}`;
  }
}
