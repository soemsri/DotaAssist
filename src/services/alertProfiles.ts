import heroes from '../data/dotaHeroes.json';
import { TimingEventAlert } from '../types/meta';

export const ROLES = ['carry', 'mid', 'offlane', 'support'] as const;
export type Role = typeof ROLES[number];
export type Objective = TimingEventAlert['type'];
export const OBJECTIVES: Record<Objective, string> = {
  rune_bounty: 'Bounty runes', rune_power: 'Power / water runes', rune_wisdom: 'Wisdom shrines',
  roshan: 'Roshan / Aegis', tormentor: 'Tormentor', lotus: 'Lotus pools', day_night: 'Day / night',
  neutral_item: 'Neutral items', camp_stack: 'Camp stacking', enemy_ultimate: 'Enemy ultimates',
  enemy_glyph: 'Enemy glyph',
};
type Profile = Record<Objective, boolean>;
type Profiles = Record<Role, Profile>;
const defaults = (): Profiles => {
  const profile = (disabled: Objective[] = []): Profile => Object.fromEntries(
    Object.keys(OBJECTIVES).map(key => [key, !disabled.includes(key as Objective)]),
  ) as Profile;
  return {
    carry: profile(['rune_wisdom', 'rune_power', 'camp_stack']),
    mid: profile(['lotus', 'rune_wisdom', 'camp_stack']),
    offlane: profile(['rune_power']),
    support: profile(),
  };
};
export function suggestRole(heroName: string): { role: Role; hero: string; reason: string } | null {
  const hero = heroes.find(h => h.name === heroName);
  if (!hero) return null;
  const tags = hero.roles;
  // Bundled broad hero tags are a heuristic, not a prediction of the player's lane.
  const role: Role | null = tags.includes('Support') ? 'support'
    : tags.includes('Durable') && tags.includes('Initiator') ? 'offlane'
    : hero.primary_attr !== 'agi' && tags.includes('Nuker') && tags.includes('Carry') ? 'mid'
    : tags.includes('Carry') ? 'carry' : null;
  return role ? { role, hero: hero.localized_name, reason: `Based on bundled hero tags: ${tags.join(', ')}. Heroes can fill multiple roles.` } : null;
}
interface Snapshot {
  active: Role;
  profiles: Profiles;
  pending: (NonNullable<ReturnType<typeof suggestRole>> & { key: string }) | null;
  error: string | null;
}
export class AlertProfiles {
  private state: Snapshot = { active: 'support', profiles: defaults(), pending: null, error: null };
  private listeners = new Set<() => void>();
  private observed = '';
  private resolved = new Set<string>();
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const saved = JSON.parse(storage?.getItem('dotaassist.alertProfiles.v1') ?? 'null');
      if (saved?.version !== 1) return;
      if (ROLES.includes(saved.active)) this.state.active = saved.active;
      for (const role of ROLES) for (const key of Object.keys(OBJECTIVES) as Objective[]) {
        if (typeof saved.profiles?.[role]?.[key] === 'boolean') this.state.profiles[role][key] = saved.profiles[role][key];
      }
    } catch { this.state.error = 'Saved profiles could not be loaded; using defaults.'; }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(persist = false) {
    if (persist) {
      try {
        if (!this.storage) throw new Error('Storage unavailable');
        this.storage.setItem('dotaassist.alertProfiles.v1', JSON.stringify({ version: 1, active: this.state.active, profiles: this.state.profiles }));
        this.state = { ...this.state, error: null };
      } catch { this.state = { ...this.state, error: 'Changes apply for this session but could not be saved.' }; }
    }
    this.listeners.forEach(listener => listener());
  }
  enabled = (objective: Objective) => this.state.profiles[this.state.active][objective];
  select(role: Role) {
    if (this.state.pending) this.resolved.add(this.state.pending.key);
    this.state = { ...this.state, active: role, pending: null };
    this.publish(true);
  }
  edit(role: Role, objective: Objective, enabled: boolean) {
    this.state = { ...this.state, profiles: { ...this.state.profiles, [role]: { ...this.state.profiles[role], [objective]: enabled } } };
    this.publish(true);
  }
  reset(role: Role) {
    this.state = { ...this.state, profiles: { ...this.state.profiles, [role]: defaults()[role] } };
    this.publish(true);
  }
  observe(heroName: string | undefined, matchId?: string) {
    if (!heroName) return; // A temporary disconnect must not switch profiles or repeat a prompt.
    const key = `${matchId || 'unknown'}:${heroName}`;
    if (key === this.observed) return;
    this.observed = key;
    const suggestion = suggestRole(heroName);
    this.state = { ...this.state, pending: suggestion && !this.resolved.has(key) ? { ...suggestion, key } : null };
    this.publish();
  }
  dismiss() {
    if (this.state.pending) this.resolved.add(this.state.pending.key);
    this.state = { ...this.state, pending: null }; this.publish();
  }
}
function storage() { try { return typeof window === 'undefined' ? undefined : window.localStorage; } catch { return undefined; } }
export const alertProfiles = new AlertProfiles(storage());
