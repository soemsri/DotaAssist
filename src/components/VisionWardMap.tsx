import React, { useState } from 'react';
import { TacticalCoachState } from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { audioService } from '../services/audioService';
import {
  Eye,
  Crosshair,
  Compass,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  coachState: TacticalCoachState;
  payload: GSIPayload | null;
  isConnected: boolean;
}

export const VisionWardMap: React.FC<Props> = ({
  coachState,
  payload,
  isConnected,
}) => {
  const isThai = audioService.getSettings().voiceLanguage === 'th-TH';
  const visionState = coachState.visionState;
  const playerTeam = (payload?.player?.team_name?.toLowerCase() === 'dire' ? 'dire' : 'radiant') as 'radiant' | 'dire';
  const isDaytime = payload?.map?.daytime !== false;

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(
    visionState?.recommendedSpots?.[0]?.id || 'top_power_rune_cliff'
  );
  const [filterType, setFilterType] = useState<'all' | 'observer' | 'sentry_deward'>('all');
  const [filterPhase, setFilterPhase] = useState<'all' | 'laning' | 'mid' | 'objective' | 'late'>('all');

  const spots = visionState?.recommendedSpots || [];
  const selectedSpot = spots.find((s) => s.id === selectedSpotId) || spots[0];

  const filteredSpots = spots.filter((spot) => {
    if (filterType !== 'all' && spot.type !== filterType) return false;
    if (filterPhase !== 'all' && spot.phase !== filterPhase && spot.phase !== 'any') return false;
    return true;
  });

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner & Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white uppercase">
                  {isThai ? 'ผังวิสัยทัศน์และการปักหวอร์ด (Vision & Ward Map)' : 'Tactical Vision & Ward Map'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold font-mono border border-slate-700">
                  {isThai ? (playerTeam === 'radiant' ? 'ฝั่ง Radiant' : 'ฝั่ง Dire') : `${playerTeam.toUpperCase()} Perspective`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isThai
                  ? 'ระบบแนะนำจุดปัก Observer / Sentry ตามเวลาเกม และเคานต์ดาวน์อายุหวอร์ดอัตโนมัติ'
                  : 'Phase-adaptive Observer & Sentry hotspots with automatic 6-minute expiration tracking'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {visionState?.activeWards && visionState.activeWards.length > 0 ? (
              <span className="text-xs px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/50 font-bold font-mono flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {isThai
                    ? `หวอร์ดทำงานอยู่: ${visionState.activeWards.length} อัน (เหลือ ${formatSeconds(visionState.nearestExpirySeconds || 0)})`
                    : `Active Wards: ${visionState.activeWards.length} (Next: ${formatSeconds(visionState.nearestExpirySeconds || 0)})`}
                </span>
              </span>
            ) : (
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                {isThai ? 'ยังไม่มีหวอร์ดที่กำลังนับเวลา' : 'No Active Ward Timers'}
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-3">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">{isThai ? 'ประเภท:' : 'Type:'}</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isThai ? 'ทั้งหมด' : 'All'}
            </button>
            <button
              onClick={() => setFilterType('observer')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                filterType === 'observer'
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Observer Ward</span>
            </button>
            <button
              onClick={() => setFilterType('sentry_deward')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                filterType === 'sentry_deward'
                  ? 'bg-sky-400 text-slate-950 font-black'
                  : 'bg-slate-800 text-sky-300 hover:bg-slate-700'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>Sentry Dewarding</span>
            </button>
          </div>

          {/* Phase Filter */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">{isThai ? 'ช่วงเกม:' : 'Phase:'}</span>
            {(['all', 'laning', 'mid', 'objective', 'late'] as const).map((phase) => {
              const label =
                phase === 'all'
                  ? isThai ? 'ทุกช่วง' : 'All Phases'
                  : phase === 'laning'
                  ? isThai ? 'ต้นเกม (0-10m)' : 'Laning'
                  : phase === 'mid'
                  ? isThai ? 'กลางเกม (10-20m)' : 'Mid Game'
                  : phase === 'objective'
                  ? isThai ? 'ชิงบอส (Roshan/Tormentor)' : 'Objectives'
                  : isThai ? 'ท้ายเกม (ดันบ้าน)' : 'Late Game';

              return (
                <button
                  key={phase}
                  onClick={() => setFilterPhase(phase)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition ${
                    filterPhase === phase
                      ? 'bg-slate-100 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Interactive SVG Map & Spot Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2/3): Interactive Tactical SVG Map */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">
                {isThai ? 'แผนที่ยุทธศาสตร์ Dota 2 (คลิกที่จุดเพื่อดูรายละเอียด)' : 'Interactive Dota 2 Tactical Map (Click hotspot)'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                <span>Observer</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
                <span>Sentry Deward</span>
              </span>
            </div>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full max-w-[580px] aspect-square bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-inner select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
            >
              {/* Background Grid & Terrain Zones */}
              <rect x="0" y="0" width="100" height="100" fill="#090d16" />

              {/* Radiant Jungle Tint (Bottom-Left) */}
              <path
                d="M 0 100 L 0 50 Q 25 60 50 100 Z"
                fill="#0d2818"
                opacity="0.35"
              />

              {/* Dire Jungle Tint (Top-Right) */}
              <path
                d="M 100 0 L 100 50 Q 75 40 50 0 Z"
                fill="#2c1115"
                opacity="0.35"
              />

              {/* River Flow (Diagonal cyan/blue path) */}
              <path
                d="M 12 18 Q 30 35 48 50 T 88 82"
                fill="none"
                stroke="#1e3a8a"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M 12 18 Q 30 35 48 50 T 88 82"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.5"
              />

              {/* Lanes (Top, Mid, Bot) */}
              {/* Top Lane */}
              <path
                d="M 16 84 L 16 16 L 84 16"
                fill="none"
                stroke="#334155"
                strokeWidth="2.5"
                strokeDasharray="2 2"
              />
              {/* Mid Lane */}
              <path
                d="M 18 82 L 82 18"
                fill="none"
                stroke="#475569"
                strokeWidth="2.5"
                strokeDasharray="2 2"
              />
              {/* Bot Lane */}
              <path
                d="M 16 84 L 84 84 L 84 16"
                fill="none"
                stroke="#334155"
                strokeWidth="2.5"
                strokeDasharray="2 2"
              />

              {/* Radiant Fountain (Bottom-Left) */}
              <rect x="3" y="87" width="10" height="10" rx="3" fill="#059669" opacity="0.8" />
              <text x="8" y="93.5" fill="#ecfdf5" fontSize="2.8" fontWeight="bold" textAnchor="middle">
                RAD
              </text>

              {/* Dire Fountain (Top-Right) */}
              <rect x="87" y="3" width="10" height="10" rx="3" fill="#dc2626" opacity="0.8" />
              <text x="92" y="9.5" fill="#fef2f2" fontSize="2.8" fontWeight="bold" textAnchor="middle">
                DIRE
              </text>

              {/* Roshan Pits */}
              {/* North Pit (Night Pit - Top-Left) */}
              <circle
                cx="20"
                cy="20"
                r="4.5"
                fill="#1e1b4b"
                stroke={!isDaytime ? '#a855f7' : '#475569'}
                strokeWidth={!isDaytime ? '1' : '0.6'}
              />
              <text x="20" y="21.2" fill="#c084fc" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                🌙 ROSH
              </text>

              {/* South Pit (Day Pit - Bottom-Right) */}
              <circle
                cx="80"
                cy="80"
                r="4.5"
                fill="#451a03"
                stroke={isDaytime ? '#f59e0b' : '#475569'}
                strokeWidth={isDaytime ? '1' : '0.6'}
              />
              <text x="80" y="81.2" fill="#fde047" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                ☀️ ROSH
              </text>

              {/* Tormentors */}
              <rect x="13" y="41" width="6" height="6" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" />
              <text x="16" y="45" fill="#7dd3fc" fontSize="2.2" fontWeight="bold" textAnchor="middle">
                TOR
              </text>

              <rect x="81" y="53" width="6" height="6" rx="1.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" />
              <text x="84" y="57" fill="#7dd3fc" fontSize="2.2" fontWeight="bold" textAnchor="middle">
                TOR
              </text>

              {/* Render Vision Radius circle for Selected Spot */}
              {selectedSpot && (
                <circle
                  cx={selectedSpot.x}
                  cy={selectedSpot.y}
                  r={selectedSpot.visionRadius}
                  fill={selectedSpot.type === 'observer' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.18)'}
                  stroke={selectedSpot.type === 'observer' ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="0.6"
                  strokeDasharray="1.5 1.5"
                />
              )}

              {/* Render All Ward Hotspot Markers */}
              {filteredSpots.map((spot) => {
                const isSelected = spot.id === selectedSpotId;
                const isObserver = spot.type === 'observer';

                return (
                  <g
                    key={spot.id}
                    onClick={() => setSelectedSpotId(spot.id)}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    {/* Pulsing ring for selected spot */}
                    {isSelected && (
                      <circle
                        cx={spot.x}
                        cy={spot.y}
                        r="3.5"
                        fill="none"
                        stroke={isObserver ? '#f59e0b' : '#38bdf8'}
                        strokeWidth="0.8"
                        opacity="0.9"
                      />
                    )}

                    {/* Marker Core */}
                    {isObserver ? (
                      <circle
                        cx={spot.x}
                        cy={spot.y}
                        r={isSelected ? 2.5 : 1.9}
                        fill="#f59e0b"
                        stroke="#0f172a"
                        strokeWidth="0.6"
                        filter="drop-shadow(0 0 2px rgba(245,158,11,0.8))"
                      />
                    ) : (
                      <rect
                        x={spot.x - (isSelected ? 2.2 : 1.7)}
                        y={spot.y - (isSelected ? 2.2 : 1.7)}
                        width={isSelected ? 4.4 : 3.4}
                        height={isSelected ? 4.4 : 3.4}
                        transform={`rotate(45 ${spot.x} ${spot.y})`}
                        fill="#38bdf8"
                        stroke="#0f172a"
                        strokeWidth="0.6"
                        filter="drop-shadow(0 0 2px rgba(56,189,248,0.8))"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Column (1/3): Spot Details & Live Active Wards */}
        <div className="space-y-4">
          {/* Selected Spot Details Card */}
          {selectedSpot ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      selectedSpot.type === 'observer'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                    }`}
                  >
                    {selectedSpot.type === 'observer' ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <Crosshair className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white leading-snug">
                      {isThai ? selectedSpot.nameTh : selectedSpot.nameEn}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedSpot.type === 'observer' ? 'Observer Ward' : 'Sentry Dewarding'} · ({selectedSpot.x}%, {selectedSpot.y}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Tactical Explanation */}
              <div className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{isThai ? 'วัตถุประสงค์เชิงกลยุทธ์:' : 'Strategic Purpose:'}</span>
                </div>
                {isThai ? selectedSpot.descTh : selectedSpot.descEn}
              </div>

              {/* Meta Tags */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">{isThai ? 'ช่วงเวลาที่แนะนำ' : 'Best Phase'}</span>
                  <span className="font-bold text-white capitalize">{selectedSpot.phase}</span>
                </div>
                <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">{isThai ? 'ทีมที่ได้เปรียบ' : 'Team Advantage'}</span>
                  <span className="font-bold text-white capitalize">{selectedSpot.team}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Active Wards Live Tracker Panel */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isThai ? 'หวอร์ดที่กำลังนับเวลา (Active Timers)' : 'Active Ward Countdowns'}
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {visionState?.activeWards?.length || 0} / 6m
              </span>
            </div>

            {!visionState?.activeWards || visionState.activeWards.length === 0 ? (
              <div className="text-center py-5 text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {isConnected
                  ? isThai
                    ? 'ปัก Observer Ward ในเกม Dota 2 เพื่อเริ่มนับเวลาถอยหลังอัตโนมัติ'
                    : 'Place an Observer Ward in-game to start tracking 6m lifetime automatically.'
                  : isThai
                  ? 'เชื่อมต่อ Dota 2 เพื่อตรวจจับการปักหวอร์ดแบบเรียลไทม์'
                  : 'Connect Dota 2 to track ward placements in real time.'}
              </div>
            ) : (
              <div className="space-y-2">
                {visionState.activeWards.map((ward, idx) => {
                  const percentLeft = Math.max(0, Math.min(100, (ward.remainingSeconds / ward.totalDurationSeconds) * 100));
                  const isLow = ward.remainingSeconds <= 30;

                  return (
                    <div
                      key={ward.id}
                      className={`p-2.5 rounded-xl border transition ${
                        isLow
                          ? 'bg-rose-950/60 border-rose-500/70 shadow-md'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Eye className={`w-3.5 h-3.5 ${isLow ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                          <span className="text-xs font-bold text-white">
                            {isThai ? `หวอร์ด #${idx + 1}` : `Observer Ward #${idx + 1}`}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-mono font-black ${
                            isLow ? 'text-rose-400 animate-pulse' : 'text-amber-300'
                          }`}
                        >
                          {formatSeconds(ward.remainingSeconds)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 rounded-full ${
                            isLow ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-500 to-amber-300'
                          }`}
                          style={{ width: `${percentLeft}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                        <span>{isThai ? `ปักเวลา ${formatSeconds(ward.placedAtClockTime)}` : `Placed at ${formatSeconds(ward.placedAtClockTime)}`}</span>
                        <span>{isThai ? `หมดเวลา ${formatSeconds(ward.expiresAtClockTime)}` : `Expires at ${formatSeconds(ward.expiresAtClockTime)}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
