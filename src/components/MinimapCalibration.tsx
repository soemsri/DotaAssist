import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { minimapScanner } from '../services/minimapScanner';

type Display = { name: string; width: number; height: number; scale: number };
type Selection = { monitor: number; x: number; y: number; width: number; height: number };
type Preview = { pixels: number[]; width: number; height: number };
export function MinimapCalibration() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selection, setSelection] = useState<Selection>({ monitor: 0, x: 0, y: 0, width: 250, height: 250 });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState('Minimap calibration required.');
  const [busy, setBusy] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  useEffect(() => minimapScanner.subscribe(result => setScanStatus(result.scanned ? 'Scanning active' : result.message)), []);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    invoke<Display[]>('minimap_displays').then(d => { if (active) setDisplays(d); }).catch(e => { if (active) setMessage(String(e)); });
    invoke<Selection>('minimap_calibration_status').then(s => {
      if (active) { setSelection(s); setMessage('Saved calibration loaded. Revalidate after changing the in-game minimap size or layout.'); }
    }).catch(e => { if (active) setMessage(String(e)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (preview && canvas.current) canvas.current.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(preview.pixels), preview.width, preview.height), 0, 0);
  }, [preview]);
  function edit(next: Selection) { setSelection(next); setPreview(null); }
  async function capture() {
    setBusy(true); setPreview(null);
    setMessage('Show Dota 2 with the minimap unobscured. Capturing in 5 seconds…');
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const ds = await invoke<Display[]>('minimap_displays'); setDisplays(ds);
      setPreview(await invoke<Preview>('preview_minimap', { selection }));
      setMessage('Verify that the preview contains the complete minimap and no other panels, then confirm. Use standard red enemy markers.');
    } catch (e) { setMessage(String(e)); }
    finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true);
    try {
      await invoke('confirm_minimap'); minimapScanner.resetState(); setPreview(null);
      setMessage('Calibration saved. Scanning starts when Dota 2 is foreground and live match data arrives.');
    } catch (e) { setMessage(String(e)); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-sky-500/40 p-4 text-sm">
    <h3 className="font-bold text-sky-300">Minimap setup</h3>
    <p>Choose the game monitor, then enter the minimap rectangle in physical pixels from that monitor’s top-left corner. Preview it while Dota 2 is in borderless mode.</p>
    <fieldset disabled={busy} className="space-y-3 disabled:opacity-50">
      <label className="block">Game monitor <select className="bg-slate-800 p-2" value={selection.monitor} onChange={e => edit({ ...selection, monitor: Number(e.target.value) })}>
        {displays.map((d, i) => <option key={i} value={i}>{i + 1}: {d.name} — {d.width} × {d.height} ({Math.round(d.scale * 100)}%)</option>)}
      </select></label>
      <div className="grid grid-cols-2 gap-2">{(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>{key === 'x' ? 'Left (px)' : key === 'y' ? 'Top (px)' : `${key} (px)`}
        <input className="block w-full bg-slate-800 p-2" type="number" min={key === 'x' || key === 'y' ? 0 : 100} step="1" value={selection[key]} onChange={e => edit({ ...selection, [key]: Number(e.target.value) })} />
      </label>)}</div>
      <button type="button" className="bg-sky-800 rounded px-3 py-2" onClick={capture}>Capture preview in 5 seconds</button>
      {preview && <div className="space-y-2"><canvas ref={canvas} width={preview.width} height={preview.height} className="max-w-full border border-slate-500" aria-label="Captured minimap preview" />
        <button type="button" className="bg-emerald-800 rounded px-3 py-2" onClick={confirm}>Confirm minimap preview &amp; save</button></div>}
    </fieldset>
    <p role="status" className="text-amber-200">{message}</p>
    {scanStatus && <p className="text-slate-300">{scanStatus}</p>}
    <p className="text-xs text-slate-400">Low-confidence scans suppress missing-enemy alerts. If scanning becomes unavailable, uncover the map or repeat this setup. Display resolution, scaling, or monitor changes require a new confirmed preview.</p>
  </section>;
}
