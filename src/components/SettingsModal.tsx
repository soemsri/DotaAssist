import { AlertProfileControls } from './AlertProfileControls';
import { DesktopSetup } from './DesktopSetup';
import React, { useState, useSyncExternalStore } from 'react';
import { X, Copy, Check, Volume2, Shield, FolderOpen, Monitor, Mic, Globe, Keyboard } from 'lucide-react';
import { audioService } from '../services/audioService';
import { objectiveTracker } from '../services/objectiveTracker';

interface Props {
  isOpen: boolean;
  isConnected: boolean;
  onClose: () => void;
}

const GSI_CFG_CONTENT = `"Dota 2 Integration Configuration"
{
    "uri"           "http://127.0.0.1:3001/gsi"
    "timeout"       "5.0"
    "buffer"        "0.1"
    "throttle"      "0.1"
    "heartbeat"     "30.0"
    "data"
    {
        "provider"      "1"
        "map"           "1"
        "player"        "1"
        "hero"          "1"
        "abilities"     "1"
        "items"         "1"
        "draft"         "1"
        "events"        "1"
        "roshan"        "1"
        "wearables"     "0"
    }
}`;

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, isConnected }) => {
  const [copied, setCopied] = useState(false);
  const currentSettings = audioService.getSettings();
  const [volume, setVolume] = useState(Math.round(currentSettings.masterVolume * 100));
  const [sfxEnabled, setSfxEnabled] = useState(currentSettings.sfxEnabled);
  const [voiceEnabled, setVoiceEnabled] = useState(currentSettings.voiceEnabled);
  const [voiceLang, setVoiceLang] = useState<'en-US' | 'th-TH'>(currentSettings.voiceLanguage);

  const trackerState = useSyncExternalStore(objectiveTracker.subscribe, objectiveTracker.getSnapshot);
  const [browserRoshanKey, setBrowserRoshanKey] = useState(trackerState.roshanHotkey);
  const [browserTormentorKey, setBrowserTormentorKey] = useState(trackerState.tormentorHotkey);
  const [hotkeyMsg, setHotkeyMsg] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GSI_CFG_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    audioService.setMasterVolume(v / 100);
  };

  const handleToggleSfx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setSfxEnabled(next);
    audioService.setSfxEnabled(next);
  };

  const handleToggleVoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setVoiceEnabled(next);
    audioService.setVoiceEnabled(next);
  };

  const handleLangChange = (lang: 'en-US' | 'th-TH') => {
    setVoiceLang(lang);
    audioService.setVoiceLanguage(lang);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              DotaAssist Configuration &amp; Setup Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {'__TAURI_INTERNALS__' in window ? (
          <DesktopSetup isConnected={isConnected} />
        ) : (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Objective Hotkeys &amp; Clipboard (Web / Browser Mode)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300">Roshan Slain hotkey
                  <input
                    className="block w-full bg-slate-800 p-2 rounded mt-1 text-xs"
                    value={browserRoshanKey}
                    onChange={e => setBrowserRoshanKey(e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs text-slate-300">Tormentor Slain hotkey
                  <input
                    className="block w-full bg-slate-800 p-2 rounded mt-1 text-xs"
                    value={browserTormentorKey}
                    onChange={e => setBrowserTormentorKey(e.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={trackerState.autoCopyClipboard}
                  onChange={e => objectiveTracker.setAutoCopyClipboard(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span className="text-slate-200">Auto-copy timing summary to clipboard on kill</span>
              </label>
              <button
                onClick={() => {
                  const res = objectiveTracker.setHotkeys(browserRoshanKey, browserTormentorKey);
                  if (res.success) {
                    setHotkeyMsg('Hotkeys saved.');
                  } else {
                    setHotkeyMsg(res.error || 'Failed to save hotkeys.');
                  }
                  setTimeout(() => setHotkeyMsg(''), 3000);
                }}
                className="bg-slate-700 hover:bg-slate-600 rounded px-3 py-1.5 text-xs font-semibold"
              >
                Save Hotkeys
              </button>
            </div>
            {hotkeyMsg && <p className="text-xs text-amber-300">{hotkeyMsg}</p>}
          </div>
        )}

        <AlertProfileControls editor />

        {/* Section 1: Important Dota 2 Video Settings */}
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>CRITICAL: Dota 2 Display Mode Requirement</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            To allow the overlay window to float on top of Dota 2 while playing, Dota 2 must run in <strong className="text-amber-300">Borderless Window</strong> mode (Exclusive Fullscreen blocks all desktop windows).
          </p>
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
            Dota 2 Settings ➜ Video ➜ Display Mode: <span className="text-emerald-400 font-bold">Borderless Window</span> (or Launch Option: <span className="text-amber-300">-windowed -noborder</span>)
          </div>
        </div>

        {/* Section 2: Audio & Voice Announcer Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span>Voice Announcer &amp; Audio Notifications</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            {/* Master Volume */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Master Volume:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-xs font-mono text-amber-400 w-8">{volume}%</span>
              </div>
            </div>

            {/* Voice Speech Toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={handleToggleVoice}
                  className="accent-amber-500 rounded"
                />
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>Spoken Voice</span>
              </label>
            </div>

            {/* SFX Chimes Toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sfxEnabled}
                  onChange={handleToggleSfx}
                  className="accent-amber-500 rounded"
                />
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Sound Chimes</span>
              </label>
            </div>

            {/* Voice Language */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice:</span>
              </div>
              <select
                value={voiceLang}
                onChange={(e) => handleLangChange(e.target.value as 'en-US' | 'th-TH')}
                className="bg-slate-800 text-amber-400 text-xs rounded border border-slate-700 px-1 py-0.5 outline-none"
              >
                <option value="en-US">English</option>
                <option value="th-TH">Thai</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Voice reminders play one at a time, with the most urgent queued reminder first.
            Countdowns use the latest game clock when speech starts. Expired reminders are skipped.
            Disabling voice clears speech immediately; profile changes stop reminders for disabled objectives.
          </p>

          {/* Audio Test Panel */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
              Click to Test Sound &amp; Voice Output:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => audioService.playWisdomShrineAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-purple-300 font-semibold transition text-left"
              >
                🔮 Wisdom Shrine (7m)
              </button>
              <button
                onClick={() => audioService.playPowerRuneAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-300 font-semibold transition text-left"
              >
                ⚡ Power Rune (2m)
              </button>
              <button
                onClick={() => audioService.playBountyRuneAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-semibold transition text-left"
              >
                💰 Bounty Rune (4m)
              </button>
              <button
                onClick={() => audioService.playTormentorAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-blue-300 font-semibold transition text-left"
              >
                🛡️ Tormentor (20m)
              </button>
              <button
                onClick={() => audioService.playRoshanAlert('Roshan respawn window is active')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-300 font-semibold transition text-left"
              >
                🐉 Roshan Warning
              </button>
              <button
                onClick={() => audioService.playAegisExpiringAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                ⏳ Aegis Expiring
              </button>
              <button
                onClick={() => audioService.playNeutralTierAlert(1)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-semibold transition text-left"
              >
                📦 Neutral Tier Alert
              </button>
              <button
                onClick={() => audioService.speak('Reminder: Neutral item slot is empty. Tier 1 is available.', undefined, 'neutral_item')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-orange-300 font-semibold transition text-left"
              >
                ⚠️ Missing Neutral Reminder
              </button>
              <button
                onClick={() => audioService.playCampStackAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                🌲 Camp Stacking
              </button>
              <button
                onClick={() => audioService.playEnemyUltimateReadyAlert('Enigma', 'Black Hole')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-300 font-semibold transition text-left"
              >
                ⚔️ Enemy Ultimate Ready
              </button>
              <button
                onClick={() => audioService.playLaningMilestoneAlert(5, 28, 'on pace')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-semibold transition text-left"
              >
                🌾 Laning Milestone (5m)
              </button>
              <button
                onClick={() => audioService.playEnemyGlyphActivatedAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-300 font-semibold transition text-left"
              >
                ⚡ Glyph Activated (7s)
              </button>
              <button
                onClick={() => audioService.playEnemyGlyphReadyAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                🛡️ Glyph Ready
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: GSI Configuration Guide */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Dota 2 Game State Integration (GSI) File</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ensure the following file exists in your Steam Dota 2 directory so the game sends live game clock and event data to DotaAssist:
          </p>

          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400">Windows File Path:</div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 break-all select-all">
              C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\gamestate_integration_dotaassist.cfg
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Linux File Path:</div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 break-all select-all">
              ~/.steam/steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_dotaassist.cfg
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto">
            <pre>{GSI_CFG_CONTENT}</pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Config'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
