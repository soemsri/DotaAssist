import React, { useState } from 'react';
import { X, Copy, Check, Volume2, Shield, FolderOpen } from 'lucide-react';
import { audioService } from '../services/audioService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GSI_CFG_CONTENT = `"Dota 2 Integration Configuration"
{
    "uri"           "http://127.0.0.1:3000/gsi"
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
        "wearables"     "0"
    }
}`;

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [volume, setVolume] = useState(60);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GSI_CFG_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    audioService.setVolume(v / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              DotaAssist Configuration & Setup
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GSI Setup Guide */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              1. Dota 2 Game State Integration (GSI) Setup
            </h3>
            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              To allow DotaAssist to receive live game state (clock, runes, inventory, draft), save the following file as:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 break-all mb-2">
              .../dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_dotaassist.cfg
            </div>

            <div className="relative bg-slate-950 rounded-lg p-3 border border-slate-800 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto">
              <pre>{GSI_CFG_CONTENT}</pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Config'}</span>
              </button>
            </div>
          </div>

          {/* Sound settings and testing */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-sky-400" />
              2. Audio Cue Synthesizer & Volume
            </h3>
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 mb-3">
              <span className="text-xs text-slate-400">Master Volume:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono text-amber-400 w-8">{volume}%</span>
            </div>

            <div className="text-[11px] text-slate-400 mb-1.5">Test Audio Notifications:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => audioService.playWisdomRuneAlert()}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-purple-300 transition"
              >
                Wisdom Rune (7m)
              </button>
              <button
                onClick={() => audioService.playPowerRuneAlert()}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-300 transition"
              >
                Power Rune (2m)
              </button>
              <button
                onClick={() => audioService.playBountyRuneAlert()}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 transition"
              >
                Bounty Rune (3m)
              </button>
              <button
                onClick={() => audioService.playTormentorAlert()}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-blue-300 transition"
              >
                Tormentor (20m)
              </button>
              <button
                onClick={() => audioService.playRoshanAlert()}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-300 transition"
              >
                Roshan Warning
              </button>
              <button
                onClick={() => audioService.playWarningBeep()}
                className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition"
              >
                Urgent Beep
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
