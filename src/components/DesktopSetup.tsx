import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface DesktopStatus {
  hotkey: string;
  dota_path: string | null;
  interactive: boolean;
  hotkey_ready: boolean;
  error: string | null;
}

export function DesktopSetup({ isConnected }: { isConnected: boolean }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [path, setPath] = useState('');
  const [hotkey, setHotkey] = useState('Ctrl+Shift+F10');
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
      setHotkey(status.hotkey); setMessage(`Interaction hotkey saved: ${status.hotkey}`);
    } catch (e) { setMessage(`Could not save hotkey: ${String(e)}`); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3 rounded-xl border border-amber-500/40 p-4 text-sm">
    <h3 className="font-bold text-amber-400">Desktop setup</h3>
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
    <label className="block">Overlay interaction hotkey
      <input className="block w-full bg-slate-800 p-2 rounded" value={hotkey} onChange={e => setHotkey(e.target.value)} />
    </label>
    <p className="text-xs text-slate-400">Use a combination such as Ctrl+Shift+F10. Press it to enable HUD clicks, then press again to return to click-through. Each time you enter the overlay it starts click-through.</p>
    <button disabled={busy} onClick={saveHotkey} className="bg-slate-700 rounded px-3 py-2 disabled:opacity-40">Save hotkey</button>
    {message && <p role="status" className="text-amber-200 break-words">{message}</p>}
  </section>;
}
