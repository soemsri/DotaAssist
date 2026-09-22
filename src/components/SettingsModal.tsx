import React, { useState, useSyncExternalStore } from 'react';
import { AlertProfileControls } from './AlertProfileControls';
import { DesktopSetup } from './DesktopSetup';
import { X, Copy, Check, Volume2, Shield, FolderOpen, Monitor, Mic, Globe, Keyboard, Scroll, Compass, GitBranch, Eye } from 'lucide-react';
import { audioService } from '../services/audioService';
import { objectiveTracker } from '../services/objectiveTracker';
import { voiceCommandService } from '../services/voiceCommandService';

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
  const [voiceCommandEnabled, setVoiceCommandEnabled] = useState(currentSettings.voiceCommandEnabled ?? true);
  const [voiceLang, setVoiceLang] = useState<'en-US' | 'th-TH'>(currentSettings.voiceLanguage);
  const [tpScrollAlertEnabled, setTpScrollAlertEnabled] = useState(currentSettings.tpScrollAlertEnabled);
  const [laneAssistantMode, setLaneAssistantMode] = useState<'auto' | 'always' | 'disabled'>(currentSettings.laneAssistantMode || 'auto');
  const [talentAlertsEnabled, setTalentAlertsEnabled] = useState(currentSettings.talentAlertsEnabled ?? true);
  const [minimapScannerEnabled, setMinimapScannerEnabled] = useState(currentSettings.minimapScannerEnabled ?? false);
  const [minimapPosition, setMinimapPosition] = useState<'left' | 'right'>(currentSettings.minimapPosition || 'left');

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

  const handleToggleVoiceCommand = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setVoiceCommandEnabled(next);
    audioService.updateSettings({ voiceCommandEnabled: next });
    if (next) {
      voiceCommandService.startListening();
    } else {
      voiceCommandService.stopListening();
    }
  };

  const handleToggleTpScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setTpScrollAlertEnabled(next);
    audioService.setTpScrollAlertEnabled(next);
  };

  const handleLangChange = (lang: 'en-US' | 'th-TH') => {
    setVoiceLang(lang);
    audioService.setVoiceLanguage(lang);
  };

  const handleLaneModeChange = (mode: 'auto' | 'always' | 'disabled') => {
    setLaneAssistantMode(mode);
    audioService.setLaneAssistantMode(mode);
  };

  const handleToggleTalentAlerts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setTalentAlertsEnabled(next);
    audioService.setTalentAlertsEnabled(next);
  };

  const handleToggleMinimapScanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setMinimapScannerEnabled(next);
    audioService.setMinimapScannerEnabled(next);
  };

  const handleMinimapPositionChange = (pos: 'left' | 'right') => {
    setMinimapPosition(pos);
    audioService.setMinimapPosition(pos);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
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

            {/* TP Alert Toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tpScrollAlertEnabled}
                  onChange={handleToggleTpScroll}
                  className="accent-amber-500 rounded"
                />
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                <span>TP Alert</span>
              </label>
            </div>

            {/* Talent Tree Voice Alert Toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={talentAlertsEnabled}
                  onChange={handleToggleTalentAlerts}
                  className="accent-amber-500 rounded"
                />
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                <span>Talent Tree</span>
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

            {/* Lane Assistant (Pull & Stack) Mode */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Lane Assist:</span>
              </div>
              <select
                value={laneAssistantMode}
                onChange={(e) => handleLaneModeChange(e.target.value as 'auto' | 'always' | 'disabled')}
                className="bg-slate-800 text-amber-400 text-xs rounded border border-slate-700 px-1 py-0.5 outline-none"
                title="Lane Assistant: Creep pull (:15/:45) & Jungle stack (:53) voice alerts during 1:00-10:00"
              >
                <option value="auto">Auto (Support only)</option>
                <option value="always">Always On (All Heroes)</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Minimap MIA Scanner (Experimental Screen Capture) */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={minimapScannerEnabled}
                  onChange={handleToggleMinimapScanner}
                  className="accent-amber-500 rounded"
                />
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                <span>MIA Scanner (Exp)</span>
              </label>
            </div>

            {/* Minimap Position */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Map Pos:</span>
              </div>
              <select
                value={minimapPosition}
                onChange={(e) => handleMinimapPositionChange(e.target.value as 'left' | 'right')}
                className="bg-slate-800 text-amber-400 text-xs rounded border border-slate-700 px-1 py-0.5 outline-none"
              >
                <option value="left">Left Corner</option>
                <option value="right">Right Corner</option>
              </select>
            </div>
          </div>

          {/* Performance Optimization Note */}
          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center gap-2">
            <span className="text-amber-400 font-bold">💡 Performance Tip:</span>
            <span>MIA Scanner uses desktop screen capture. Keep disabled for maximum game FPS and 0% GPU capture overhead.</span>
          </div>

          {/* Hands-Free Voice Commands Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-100">
                  Hands-Free Voice Command &amp; Query (ระบบสั่งการและถามตอบด้วยเสียง)
                </span>
              </div>
              <label className="text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceCommandEnabled}
                  onChange={handleToggleVoiceCommand}
                  className="accent-emerald-500 rounded"
                />
                <span className="font-semibold text-emerald-400">
                  {voiceCommandEnabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="text-[11px] text-slate-400">
              {voiceLang === 'th-TH'
                ? 'ไมค์ทำงานเบื้องหลังอัตโนมัติ พูดสั่งการได้ทันที เช่น "โรชานตาย", "ศัตรูกดบีเคบี", "เวลารูน", หรือ "ไอเทมต่อไป"'
                : 'Continuous background mic listening. Speak commands hands-free e.g. "Roshan dead", "BKB used", "Next rune", or "Next item".'}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-semibold">Test Voice Commands:</span>
              <button
                onClick={() =>
                  voiceCommandService.processTranscript(
                    voiceLang === 'th-TH' ? 'โรชานตาย' : 'roshan dead'
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
              >
                🎙️ "{voiceLang === 'th-TH' ? 'โรชานตาย' : 'roshan dead'}"
              </button>
              <button
                onClick={() =>
                  voiceCommandService.processTranscript(
                    voiceLang === 'th-TH' ? 'ศัตรูกดบีเคบี' : 'bkb used'
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
              >
                🎙️ "{voiceLang === 'th-TH' ? 'ศัตรูกดบีเคบี' : 'bkb used'}"
              </button>
              <button
                onClick={() =>
                  voiceCommandService.processTranscript(
                    voiceLang === 'th-TH' ? 'เวลารูน' : 'next rune'
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
              >
                🎙️ "{voiceLang === 'th-TH' ? 'เวลารูน' : 'next rune'}"
              </button>
              <button
                onClick={() =>
                  voiceCommandService.processTranscript(
                    voiceLang === 'th-TH' ? 'ไอเทมต่อไป' : 'next item'
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
              >
                🎙️ "{voiceLang === 'th-TH' ? 'ไอเทมต่อไป' : 'next item'}"
              </button>
              <button
                onClick={() =>
                  voiceCommandService.processTranscript(
                    voiceLang === 'th-TH' ? 'เวลาดอกบัว' : 'lotus time'
                  )
                }
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition"
              >
                🎙️ "{voiceLang === 'th-TH' ? 'เวลาดอกบัว' : 'lotus time'}"
              </button>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => audioService.playWisdomShrineAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-purple-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🔮 รูน EXP (7m)' : '🔮 Wisdom Shrine (7m)'}
              </button>
              <button
                onClick={() => audioService.playPowerRuneAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '⚡ รูนแม่น้ำ (2m)' : '⚡ Power Rune (2m)'}
              </button>
              <button
                onClick={() => audioService.playBountyRuneAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '💰 รูนทอง (4m)' : '💰 Bounty Rune (4m)'}
              </button>
              <button
                onClick={() => audioService.playLotusAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🪷 ดอกบัวฟื้นฟู (3m)' : '🪷 Healing Lotus (3m)'}
              </button>
              <button
                onClick={() => audioService.playTormentorAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-blue-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🛡️ บอสทอร์เมนเตอร์ (20m)' : '🛡️ Tormentor (20m)'}
              </button>
              <button
                onClick={() => audioService.playRoshanAlert('Roshan respawn window is active')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🐉 เตือนโรชาน' : '🐉 Roshan Warning'}
              </button>
              <button
                onClick={() => audioService.playAegisExpiringAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '⏳ โล่เอจิสใกล้หมด' : '⏳ Aegis Expiring'}
              </button>
              <button
                onClick={() => audioService.playNeutralTierAlert(1)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '📦 ปลดล็อกไอเทมป่า' : '📦 Neutral Tier Alert'}
              </button>
              <button
                onClick={() => {
                  const isTh = voiceLang === 'th-TH';
                  audioService.speak(
                    isTh ? 'เตือนความจำ: ช่องไอเทมป่ายังว่างอยู่ มีเทียร์ 1 พร้อมให้เลือก' : 'Reminder: Neutral item slot is empty. Tier 1 is available.',
                    undefined,
                    'neutral_item'
                  );
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-orange-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '⚠️ เตือนลืมใส่ไอเทมป่า' : '⚠️ Missing Neutral Reminder'}
              </button>
              <button
                onClick={() => audioService.playCampStackAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🌲 ดึงซ้อนครีปป่า' : '🌲 Camp Stacking'}
              </button>
              <button
                onClick={() => audioService.playEnemyUltimateReadyAlert('Enigma', 'Black Hole')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '⚔️ สกิลอัลติศัตรูพร้อม' : '⚔️ Enemy Ultimate Ready'}
              </button>
              <button
                onClick={() => audioService.playLaningMilestoneAlert(5, 28, 'on pace')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🌾 ระยะยืนเลน 5 นาที' : '🌾 Laning Milestone (5m)'}
              </button>
              <button
                onClick={() => audioService.playEnemyGlyphActivatedAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '⚡ ศัตรูกดป้อมอมตะ' : '⚡ Glyph Activated (7s)'}
              </button>
              <button
                onClick={() => audioService.playEnemyGlyphReadyAlert()}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-300 font-semibold transition text-left"
              >
                {voiceLang === 'th-TH' ? '🛡️ ป้อมอมตะพร้อมใช้' : '🛡️ Glyph Ready'}
              </button>
              <button
                onClick={() => audioService.playNoTpScrollAlert(true)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-950/60 border border-amber-800/60 text-xs text-amber-300 font-semibold transition text-left"
              >
                📜 No TP Scroll
              </button>
              <button
                onClick={() => audioService.playCreepPullAlert(false, true)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-semibold transition text-left"
              >
                🌾 Pull Creeps (:15)
              </button>
              <button
                onClick={() => audioService.playCreepPullAlert(true, true)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-semibold transition text-left"
              >
                🌲 Pull Large (:45)
              </button>
              <button
                onClick={() => audioService.playJungleStackAlert(true)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-sky-950/60 border border-sky-800/60 text-xs text-sky-300 font-semibold transition text-left"
              >
                🏕️ Stack Camp (:53)
              </button>
              <button
                onClick={() => {
                  const isThai = voiceLang === 'th-TH';
                  audioService.playTalentAlert(
                    10,
                    'left',
                    isThai ? '+9 ความแข็งแกร่ง' : '+9 Strength',
                    isThai ? 'เพิ่มเลือดป้องกันเวทเบิร์สต์' : 'Bonus HP against enemy magic burst',
                    true,
                  );
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-semibold transition text-left"
              >
                🌳 Talent Advice (Lvl 10)
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
