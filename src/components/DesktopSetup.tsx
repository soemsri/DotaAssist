import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MinimapCalibration } from './MinimapCalibration';
import { objectiveTracker } from '../services/objectiveTracker';

export interface DesktopStatus {
  hotkey: string;
  roshan_hotkey: string;
  tormentor_hotkey: string;
  auto_copy_clipboard: boolean;
  dota_path: string | null;
  interactive: boolean;
  hotkey_ready: boolean;
  error: string | null;
}

export function DesktopSetup({ isConnected }: { isConnected: boolean }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [path, setPath] = useState('');
  const [hotkey, setHotkey] = useState('Ctrl+Shift+F10');
  const [roshanHotkey, setRoshanHotkey] = useState('Alt+F9');
  const [tormentorHotkey, setTormentorHotkey] = useState('Alt+F8');
  const [autoCopy, setAutoCopy] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([invoke<DesktopStatus>('desktop_status'), invoke<string[]>('detect_dota_installations')])
      .then(([status, detected]) => {
        if (!active) return;
        setPaths(detected);
        setPath(status.dota_path ?? (detected.length === 1 ? detected[0] : ''));
        setHotkey(status.hotkey);
        if (status.roshan_hotkey) setRoshanHotkey(status.roshan_hotkey);
        if (status.tormentor_hotkey) setTormentorHotkey(status.tormentor_hotkey);
        setAutoCopy(status.auto_copy_clipboard ?? true);
        objectiveTracker.setHotkeys(status.roshan_hotkey || 'Alt+F9', status.tormentor_hotkey || 'Alt+F8', status.hotkey);
        objectiveTracker.setAutoCopyClipboard(status.auto_copy_clipboard ?? true);
        if (status.error) setMessage(status.error);
      }).catch(e => { if (active) setMessage(String(e)); });
    return () => { active = false; };
  }, []);

  async function install() {
    setBusy(true); setMessage('');
    try {
      const result = await invoke<{ config_path: string; backup_path: string | null }>('install_gsi_config', { dotaPath: path });
      setMessage(`Installed: ${result.config_path}. ${result.backup_path ? `Backup: ${result.backup_path}. ` : ''}Restart Dota 2 with the -gamestateintegration launch option, then enter a match to verify.`);
    } catch (e) { setMessage(String(e)); }
    finally { setBusy(false); }
  }

  async function saveHotkey() {
    setBusy(true);
    try {
      const status = await invoke<DesktopStatus>('set_overlay_hotkey', { hotkey });
      setHotkey(status.hotkey);
      setMessage(`Interaction hotkey saved: ${status.hotkey}`);
    } catch (e) { setMessage(`Could not save hotkey: ${String(e)}`); }
    finally { setBusy(false); }
  }

  async function saveRoshanHotkey() {
    setBusy(true);
    try {
      const status = await invoke<DesktopStatus>('set_roshan_hotkey', { hotkey: roshanHotkey });
      setRoshanHotkey(status.roshan_hotkey);
      objectiveTracker.setHotkeys(status.roshan_hotkey, tormentorHotkey, hotkey);
      setMessage(`Roshan hotkey saved: ${status.roshan_hotkey}`);
    } catch (e) { setMessage(`Could not save Roshan hotkey: ${String(e)}`); }
    finally { setBusy(false); }
  }

  async function saveTormentorHotkey() {
    setBusy(true);
    try {
      const status = await invoke<DesktopStatus>('set_tormentor_hotkey', { hotkey: tormentorHotkey });
      setTormentorHotkey(status.tormentor_hotkey);
      objectiveTracker.setHotkeys(roshanHotkey, status.tormentor_hotkey, hotkey);
      setMessage(`Tormentor hotkey saved: ${status.tormentor_hotkey}`);
    } catch (e) { setMessage(`Could not save Tormentor hotkey: ${String(e)}`); }
    finally { setBusy(false); }
  }

  async function toggleAutoCopy(next: boolean) {
    setAutoCopy(next);
    objectiveTracker.setAutoCopyClipboard(next);
    try {
      await invoke<DesktopStatus>('set_auto_copy_clipboard', { enabled: next });
    } catch {}
  }

  return <section className="space-y-4 rounded-xl border border-amber-500/40 p-4 text-sm">
    <h3 className="font-bold text-amber-400">Desktop &amp; Hotkeys Setup</h3>
    <p>Choose your Dota 2 installation folder. Existing DotaAssist configuration will be backed up before replacement.</p>
    <label className="block">Dota 2 installation
      <input className="block w-full bg-slate-800 p-2 rounded" list="dota-installations" value={path}
        placeholder="C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta"
        onChange={e => { setPath(e.target.value); setConfirmed(false); }} />
    </label>
    <datalist id="dota-installations">{paths.map(p => <option key={p} value={p} />)}</datalist>
    <p className="text-xs text-slate-400">{paths.length ? `${paths.length} installation(s) detected; select or edit the path above.` : 'No installation detected. Paste the installation folder from Steam → Dota 2 → Manage → Browse local files.'}</p>
    <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I confirm this installation location.</label>
    <button disabled={busy || !confirmed || !path.trim()} onClick={install} className="bg-amber-600 rounded px-3 py-2 disabled:opacity-40">Install GSI configuration</button>
    <p role="status" className={isConnected ? 'text-emerald-400' : 'text-amber-300'}>{isConnected ? 'Connection verified — receiving Dota 2 game data.' : 'Waiting for game data. Start Dota 2 with -gamestateintegration and enter a match. Restart the game after configuration changes.'}</p>

    <div className="border-t border-slate-800 pt-3 space-y-3">
      <h4 className="font-semibold text-slate-200">Global Shortcut Hotkeys</h4>

      <div className="space-y-2">
        <label className="block">Overlay interaction hotkey
          <div className="flex gap-2 mt-1">
            <input className="block flex-1 bg-slate-800 p-2 rounded" value={hotkey} onChange={e => setHotkey(e.target.value)} />
            <button disabled={busy} onClick={saveHotkey} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 disabled:opacity-40">Save</button>
          </div>
        </label>
        <p className="text-xs text-slate-400">Toggles mouse interaction on the floating overlay without needing to click outside Dota 2.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block">Roshan Slain hotkey
            <div className="flex gap-2 mt-1">
              <input className="block flex-1 bg-slate-800 p-2 rounded" value={roshanHotkey} onChange={e => setRoshanHotkey(e.target.value)} />
              <button disabled={busy} onClick={saveRoshanHotkey} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 disabled:opacity-40">Save</button>
            </div>
          </label>
          <p className="text-xs text-slate-400 mt-1">Records Roshan death time immediately. Press again within 10s to undo.</p>
        </div>

        <div>
          <label className="block">Tormentor Slain hotkey
            <div className="flex gap-2 mt-1">
              <input className="block flex-1 bg-slate-800 p-2 rounded" value={tormentorHotkey} onChange={e => setTormentorHotkey(e.target.value)} />
              <button disabled={busy} onClick={saveTormentorHotkey} className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 disabled:opacity-40">Save</button>
            </div>
          </label>
          <p className="text-xs text-slate-400 mt-1">Records Tormentor death time immediately. Press again within 10s to undo.</p>
        </div>
      </div>

      <div className="pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoCopy} onChange={e => toggleAutoCopy(e.target.checked)} className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0" />
          <span className="text-slate-200">Auto-copy timing summary to clipboard on kill</span>
        </label>
        <p className="text-xs text-slate-400 ml-6">Automatically formats (e.g. &quot;Roshan 25:10 | Aegis 30:10 | Respawn 33:10-36:10&quot;) into clipboard so you can paste into team chat immediately.</p>
      </div>
    </div>

    <MinimapCalibration />
    {message && <p role="status" className="text-amber-200 break-words">{message}</p>}
  </section>;
}
