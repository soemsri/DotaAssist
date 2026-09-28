import { DUTIES, FightDuty } from './teamfightAdvisor';
import type { Role } from './alertProfiles';
type Snapshot = { duties: Record<Role, FightDuty>; voice: boolean; error: string | null };
export class FightPreferences {
  private state: Snapshot = { duties: { carry: 'auto', mid: 'auto', offlane: 'auto', support: 'auto' }, voice: true, error: null };
  private listeners = new Set<() => void>();
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const saved = JSON.parse(storage?.getItem('dotaassist.teamfight.v1') ?? 'null');
      for (const role of Object.keys(this.state.duties) as Role[]) if (DUTIES.includes(saved?.duties?.[role])) this.state.duties[role] = saved.duties[role];
      if (typeof saved?.voice === 'boolean') this.state.voice = saved.voice;
    } catch { this.state.error = 'Saved teamfight preferences unavailable.'; }
  }
  getSnapshot = () => this.state;
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  setDuty(role: Role, duty: FightDuty) { if (DUTIES.includes(duty)) { this.state = { ...this.state, duties: { ...this.state.duties, [role]: duty } }; this.save(); } }
  setVoice(voice: boolean) { this.state = { ...this.state, voice }; this.save(); }
  private save() {
    try { if (!this.storage) throw Error(); this.storage.setItem('dotaassist.teamfight.v1', JSON.stringify(this.state)); this.state = { ...this.state, error: null }; }
    catch { this.state = { ...this.state, error: 'Session only: preferences could not be saved.' }; }
    this.listeners.forEach(cb => cb());
  }
}
let storage: Storage | undefined;
try { if (typeof window !== 'undefined') storage = window.localStorage; } catch { /* session preferences */ }
export const fightPreferences = new FightPreferences(storage);
