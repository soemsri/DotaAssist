import type { GSIPayload } from '../types/gsi';
import { useFightPlan } from '../hooks/useFightPlan';
import { DUTIES, FightDuty } from '../services/teamfightAdvisor';
import { fightPreferences } from '../services/teamfightPreferences';
export function TeamfightPlan({ payload, connected, interactive = true }: { payload: GSIPayload | null; connected: boolean; interactive?: boolean }) {
  const { plan, role, preferences, thai } = useFightPlan(payload, connected);
  const t = (th: string, en: string) => thai ? th : en;
  const labels: Record<FightDuty, string> = { auto: t('ตาม role และฮีโร่', 'Role + hero'), initiate: t('เปิดไฟท์', 'Initiate'), follow: t('ตามดาเมจ', 'Follow up'), protect: t('ป้องกันเพื่อน', 'Protect'), counter: t('รอสวน', 'Counter-initiate') };
  return <section className="w-full rounded-xl border border-sky-800 bg-slate-950/95 p-3 space-y-2 text-xs text-slate-200">
    <h3 className="font-bold text-sky-300">{t('แผนทีมไฟท์ท้ายเกม', 'Late-game teamfight plan')} · {role}</h3>
    <fieldset disabled={!interactive} className="flex flex-wrap items-center gap-2 disabled:opacity-50">
      <label>{t('หน้าที่ ', 'Duty ')}<select className="bg-slate-800 rounded p-1" value={preferences.duties[role]} onChange={e => fightPreferences.setDuty(role, e.target.value as FightDuty)}>{DUTIES.map(d => <option key={d} value={d}>{labels[d]}</option>)}</select></label>
      <label><input type="checkbox" checked={preferences.voice} onChange={e => fightPreferences.setVoice(e.target.checked)} /> {t('เสียงเมื่อแผนเปลี่ยน', 'Speak plan changes')}</label>
    </fieldset>
    {preferences.error && <p role="status" className="text-amber-300">{preferences.error}</p>}
    {!plan ? <p className="text-slate-400">{t('แผนเริ่มนาที 30 เมื่อได้รับข้อมูลเกมสด', 'Available from 30:00 with live match data.')}</p> : <>
      <p><b>{t('หน้าที่: ', 'Task: ')}</b>{plan.task}</p>
      <p><b>{t('เป้าหมาย: ', 'Target: ')}</b>{plan.target}</p>
      <p className="text-amber-200"><b>{t('จังหวะ: ', 'Timing: ')}</b>{plan.timing}</p>
      <p><b>{t('ถอยเมื่อ: ', 'Disengage: ')}</b>{plan.retreat}</p>
      <div className="border-t border-slate-800 pt-2">
        <b>{t('ไอเทมแก้ปัญหา — คำแนะนำตามเงื่อนไข', 'Situational item options')}</b>
        {plan.items.map((item,i) => <p key={item.name}>{i === 0 ? t('หลัก: ', 'Primary: ') : t('ทางเลือก: ', 'Alternative: ')}<b>{item.name}</b> — {item.reason}</p>)}
        {!plan.items.length && <p>{t('ข้อมูลไม่พอ หรือมีตัวเลือกที่แนะนำแล้ว ไม่จำเป็นต้องซื้อเพิ่มตามแผนนี้', 'Insufficient data or suggested options already owned; no additional purchase suggested.')}</p>}
        <p className="text-slate-400">{plan.economy}</p>
      </div>
      {plan.estimates.map(text => <p key={text} className="text-amber-300">{text}</p>)}
      <p className="text-[10px] text-slate-400">{plan.evidence}</p>
    </>}
  </section>;
}
