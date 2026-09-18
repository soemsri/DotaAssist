import { useEffect, useState, useSyncExternalStore } from 'react';
import { alertProfiles, OBJECTIVES, Objective, Role, ROLES } from '../services/alertProfiles';
import { TIMING_RULES } from '../data/timingRules';

export function RulesLabel() {
  return <div className="text-xs text-amber-300" title="Supported bundled rules; the running game patch is not detected. Rules change only with reviewed app releases.">
    Supported patch: <strong>{TIMING_RULES.patch}</strong> · Bundled rules
  </div>;
}

export function AlertProfileControls({ editor = false }: { editor?: boolean }) {
  const state = useSyncExternalStore(alertProfiles.subscribe, alertProfiles.getSnapshot);
  const [editing, setEditing] = useState<Role>(state.active);
  const [candidate, setCandidate] = useState<Role>(state.pending?.role ?? state.active);
  useEffect(() => { setCandidate(state.pending?.role ?? state.active); }, [state.pending?.key, state.active]);
  return <section className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 space-y-2">
    <RulesLabel />
    <label className="flex items-center gap-2">Active alert profile
      <select aria-label="Active alert profile" className="bg-slate-800 rounded p-1 capitalize" value={state.active} onChange={e => alertProfiles.select(e.target.value as Role)}>
        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
      </select>
    </label>
    {state.pending && <div className="rounded border border-amber-500/40 p-2 space-y-2">
      <p><strong>{state.pending.hero}</strong>: suggested role <strong>{state.pending.role}</strong>.</p>
      <p className="text-slate-400">{state.pending.reason} Keeping {state.active} until you confirm.</p>
      <select aria-label="Suggested role" value={candidate} onChange={e => setCandidate(e.target.value as Role)} className="bg-slate-800 rounded p-1">
        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
      </select>
      <div className="flex gap-2">
        <button className="rounded bg-amber-600 px-2 py-1" onClick={() => alertProfiles.select(candidate)}>Confirm role</button>
        <button className="rounded bg-slate-700 px-2 py-1" onClick={() => alertProfiles.dismiss()}>Keep current</button>
      </div>
    </div>}
    {editor && <div className="space-y-2 border-t border-slate-700 pt-2">
      <label>Edit preset <select aria-label="Preset to edit" value={editing} onChange={e => setEditing(e.target.value as Role)} className="bg-slate-800 rounded p-1 ml-2">
        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
      </select></label>
      <p className="text-slate-400">Enabled objectives appear in timers and can announce. Master audio switches still apply. Editing another preset does not activate it.</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(OBJECTIVES) as Objective[]).map(key => <label key={key} className="flex items-center gap-2">
          <input type="checkbox" checked={state.profiles[editing][key]} onChange={e => alertProfiles.edit(editing, key, e.target.checked)} />{OBJECTIVES[key]}
        </label>)}
      </div>
      <p className="text-slate-400">Lotus reminders are visual only. Presets change reminders, never gameplay timing rules.</p>
      <button className="bg-slate-700 rounded px-2 py-1" onClick={() => alertProfiles.reset(editing)}>Reset {editing} preset</button>
    </div>}
    {state.error && <p role="alert" className="text-amber-300">{state.error}</p>}
  </section>;
}
