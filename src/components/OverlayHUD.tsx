import React, { useEffect, useState } from 'react';
import { TimingEventAlert, PopularItem, TacticalCoachState } from '../types/meta';
import { GSIPayload } from '../types/gsi';
import { Bell, Minimize2, Maximize2, Package, X, Settings, Volume2, VolumeX, ShieldAlert, Sparkles, Flame, Droplets, Eye, Zap, Coins, Scroll, GitBranch, Mic, MicOff } from 'lucide-react';
import { timingEngine } from '../services/timingEngine';
import { audioService } from '../services/audioService';
import { minimapScanner, MinimapScanResult } from '../services/minimapScanner';
import { tacticalCoach } from '../services/tacticalCoach';
import { voiceCommandService } from '../services/voiceCommandService';
import { EnemyCooldownTracker, VoiceRecognitionResult } from '../types/voice';

interface Props {
  payload: GSIPayload | null;
  isConnected: boolean;
  alerts: TimingEventAlert[];
  items: PopularItem[];
  coachState?: TacticalCoachState;
  scanResult?: MinimapScanResult | null;
  onOpenSettings: () => void;
  onExitOverlay: () => void;
}

export const OverlayHUD: React.FC<Props> = ({
  payload,
  isConnected,
  alerts,
  items,
  coachState: propCoachState,
  scanResult: propScanResult,
  onOpenSettings,
  onExitOverlay,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [opacity, setOpacity] = useState(90);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeCooldowns, setActiveCooldowns] = useState<EnemyCooldownTracker[]>(
    voiceCommandService.getActiveCooldowns()
  );
  const [voiceToast, setVoiceToast] = useState<VoiceRecognitionResult | null>(null);
  const [voiceListening, setVoiceListening] = useState<boolean>(
    voiceCommandService.getStatus() === 'listening'
  );
  const [localScanResult, setLocalScanResult] = useState<MinimapScanResult | null>(
    propScanResult !== undefined ? propScanResult : minimapScanner.getLastResult()
  );

  useEffect(() => {
    voiceCommandService.registerHudToggleHandler(() => {
      setCollapsed((prev) => !prev);
    });

    const unsubCooldowns = voiceCommandService.subscribeCooldowns((cds) => {
      setActiveCooldowns(cds);
    });

    const unsubResult = voiceCommandService.subscribeResult((res) => {
      setVoiceToast(res);
    });

    const unsubStatus = voiceCommandService.subscribeStatus((st) => {
      setVoiceListening(st === 'listening');
    });

    return () => {
      unsubCooldowns();
      unsubResult();
      unsubStatus();
    };
  }, []);

  // Auto-dismiss voice toast after 3.5 seconds
  useEffect(() => {
    if (!voiceToast) return;
    const timer = setTimeout(() => {
      setVoiceToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [voiceToast]);

  useEffect(() => {
    if (propScanResult !== undefined) return;
    return minimapScanner.subscribe((res) => setLocalScanResult(res));
  }, [propScanResult]);

  const clockTime = payload?.map?.clock_time ?? 0;

  // Tick active cooldowns
  useEffect(() => {
    voiceCommandService.tick(clockTime);
  }, [clockTime]);
  const formattedTime = isConnected ? timingEngine.formatTime(clockTime) : '--:--';
  const mostUrgentAlert = alerts[0];
  const popularItem = items.find((item) => item.tier === 'core') ?? items[0];
  const roshanState = timingEngine.getRoshanState();
  const tormentorState = timingEngine.getTormentorState();
  const coachState = propCoachState ?? tacticalCoach.process(payload, scanResult);
  const isThai = audioService.getSettings().voiceLanguage === "th-TH";
  const talentMilestone = coachState.talentAnalysis?.activeMilestoneAdvice;
  const skillRecommendation = coachState.skillBuildAnalysis?.currentRecommendation;

  const [dismissedTalentLevel, setDismissedTalentLevel] = useState<number | null>(null);
  const [talentBannerExpiry, setTalentBannerExpiry] = useState<number | null>(null);
  const lastObservedTalentLevel = React.useRef<number | null>(null);

  useEffect(() => {
    if (talentMilestone && talentMilestone.level !== lastObservedTalentLevel.current) {
      lastObservedTalentLevel.current = talentMilestone.level;
      setDismissedTalentLevel(null);
      setTalentBannerExpiry(Date.now() + 30000);
    }
  }, [talentMilestone]);

  const isTalentBannerVisible = Boolean(
    talentMilestone &&
    dismissedTalentLevel !== talentMilestone.level &&
    talentBannerExpiry &&
    Date.now() < talentBannerExpiry
  );

  const [dismissedSkillPoint, setDismissedSkillPoint] = useState<string | null>(null);
  const [skillBannerFirstSeen, setSkillBannerFirstSeen] = useState<number | null>(null);
  const lastSkillRecKey = React.useRef<string | null>(null);

  const currentRecKey = skillRecommendation
    ? `${skillRecommendation.heroLevel}:${skillRecommendation.slot}:${skillRecommendation.unspentPoints}`
    : null;

  useEffect(() => {
    if (currentRecKey && currentRecKey !== lastSkillRecKey.current) {
      lastSkillRecKey.current = currentRecKey;
      setDismissedSkillPoint(null);
      setSkillBannerFirstSeen(Date.now());
    } else if (!currentRecKey) {
      lastSkillRecKey.current = null;
      setSkillBannerFirstSeen(null);
    }
  }, [currentRecKey]);

  // Collapse into compact pill after 15 seconds if unspent
  const isSkillBannerCollapsed = Boolean(
    skillBannerFirstSeen && Date.now() - skillBannerFirstSeen > 15000
  );

  const isSkillBannerVisible = Boolean(
    skillRecommendation &&
    dismissedSkillPoint !== currentRecKey &&
    !isSkillBannerCollapsed
  );

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSfxEnabled(next);
    audioService.setVoiceEnabled(next);
  };

  const handleRecordRoshan = () => {
    timingEngine.recordRoshanDeath(clockTime);
  };

  const handleRecordTormentor = () => {
    timingEngine.recordTormentorDeath(clockTime);
  };

  const getAlertIcon = (type: TimingEventAlert['type']) => {
    switch (type) {
      case 'rune_wisdom':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 'rune_power':
        return <Flame className="w-3.5 h-3.5 text-sky-400" />;
      case 'rune_bounty':
        return <span className="w-3.5 h-3.5 rounded-full bg-amber-400 font-bold text-[9px] flex items-center justify-center text-slate-950">B</span>;
      case 'roshan':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
      case 'tormentor':
        return <Flame className="w-3.5 h-3.5 text-blue-400" />;
      case 'lotus':
        return <Droplets className="w-3.5 h-3.5 text-emerald-400" />;
      case 'danger':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col justify-start items-center p-2 select-none"
      style={{ opacity: opacity / 100 }}
    >
      {collapsed ? (
        /* Collapsed minimal badge */
        <button
          data-tauri-drag-region
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between bg-slate-950/95 border border-slate-700/80 px-3 py-2 rounded-2xl shadow-lg text-xs hover:border-amber-400 transition cursor-move text-slate-100"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono font-black text-amber-400">{formattedTime}</span>
            {coachState.dangerLevel === 'danger' ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500 font-bold text-[9px] animate-pulse flex items-center gap-0.5">
                <ShieldAlert className="w-2.5 h-2.5" />
                <span>DANGER!</span>
              </span>
            ) : scanResult?.scanned && scanResult.all_missing ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500 font-bold text-[9px] animate-pulse flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" />
                <span>MIA!</span>
              </span>
            ) : null}
            {coachState.neutralSlot.alertActive && (
              <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500 font-bold text-[9px]">
                ! T{coachState.neutralSlot.tierUnlocked}
              </span>
            )}
            {coachState.tpScroll?.alertActive && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500 font-bold text-[9px] flex items-center gap-0.5">
                <Scroll className="w-2.5 h-2.5" />
                <span>NO TP</span>
              </span>
            )}
            {talentMilestone && (
              <span
                className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold text-[9px] flex items-center gap-0.5"
                title={`Lvl ${talentMilestone.level} Talent Spike!`}
              >
                <GitBranch className="w-2.5 h-2.5 text-emerald-400" />
                <span>L{talentMilestone.level}</span>
              </span>
            )}
            {skillRecommendation && (
              <span
                className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500 font-bold text-[9px] flex items-center gap-0.5"
                title={`Skill Point Ready: [${skillRecommendation.slot}] ${skillRecommendation.skillName}`}
              >
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>[{skillRecommendation.slot}]</span>
              </span>
            )}
            {coachState.visionState?.nearestExpirySeconds !== null && coachState.visionState?.nearestExpirySeconds !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded font-bold text-[9px] flex items-center gap-0.5 border ${
                  coachState.visionState.nearestExpirySeconds <= 30
                    ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                    : 'bg-sky-950 text-sky-300 border-sky-500/70'
                }`}
                title={`Active Observer Ward: ${Math.floor(coachState.visionState.nearestExpirySeconds / 60)}:${(coachState.visionState.nearestExpirySeconds % 60).toString().padStart(2, '0')} remaining`}
              >
                <Eye className="w-2.5 h-2.5 text-sky-400" />
                <span>
                  {Math.floor(coachState.visionState.nearestExpirySeconds / 60)}:{(coachState.visionState.nearestExpirySeconds % 60).toString().padStart(2, '0')}
                </span>
              </span>
            )}
            {activeCooldowns.map((cd) => (
              <span
                key={cd.id}
                className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500 font-bold text-[9px] flex items-center gap-0.5 animate-pulse"
                title={`${cd.name}: ${Math.floor(cd.remainingSeconds / 60)}:${(cd.remainingSeconds % 60).toString().padStart(2, '0')}`}
              >
                <span>{cd.icon || '🛡️'}</span>
                <span>
                  {cd.skillOrItem.toUpperCase()} {Math.floor(cd.remainingSeconds / 60)}:{(cd.remainingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </span>
            ))}
          </div>
          {mostUrgentAlert && (
            <span className="text-slate-200 text-[11px] truncate max-w-[140px]">
              {mostUrgentAlert.title} ({mostUrgentAlert.secondsRemaining}s)
            </span>
          )}
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </button>
      ) : (
        /* Full Compact Overlay Widget */
        <div className="w-full bg-slate-950/95 border border-slate-700/90 rounded-2xl shadow-lg p-3 text-slate-100 flex flex-col gap-2.5">
          {/* Header */}
          <div data-tauri-drag-region className="flex items-center justify-between pb-2 border-b border-slate-800 cursor-move">
            <div data-tauri-drag-region className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                HUD
              </span>
              <span className="font-mono text-xs font-bold text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded">
                {formattedTime}
              </span>
              {scanResult?.scanned && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    scanResult.all_missing
                      ? 'bg-rose-950/80 text-rose-400 border border-rose-500 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                  title={scanResult.message}
                >
                  <Eye className={`w-2.5 h-2.5 ${scanResult.all_missing ? 'text-rose-400' : 'text-emerald-400'}`} />
                  <span>{scanResult.all_missing ? 'MIA!' : `${scanResult.enemies_visible_count} Vis`}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const nextListening = voiceCommandService.toggleListening();
                  setVoiceListening(nextListening);
                }}
                className={`p-1 rounded transition ${
                  voiceListening
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
                title={
                  voiceListening
                    ? isThai
                      ? 'ไมค์กำลังฟังคำสั่งเสียง (คลิกเพื่อปิด)'
                      : 'Mic Listening (Click to mute)'
                    : isThai
                    ? 'เปิดไมค์สั่งการด้วยเสียง'
                    : 'Enable Voice Commands'
                }
              >
                {voiceListening ? (
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                ) : (
                  <MicOff className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleToggleSound}
                className={`p-1 rounded transition ${
                  soundEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-400'
                }`}
                title={soundEnabled ? 'Mute Voice & Audio' : 'Unmute Voice & Audio'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onOpenSettings}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
                title="Collapse to pill"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onExitOverlay}
                className="p-1 text-slate-400 hover:text-rose-400 rounded"
                title="Exit overlay to Strategy Dashboard"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Voice Command Toast Banner if Active */}
          {voiceToast && (
            <div
              className={`border px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-between shadow-lg backdrop-blur transition-all ${
                voiceToast.success
                  ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/95 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-cyan-900 text-cyan-200 font-bold">
                      {voiceToast.isQuery ? 'QUERY' : 'COMMAND'}
                    </span>
                    <span className="font-bold text-white truncate">"{voiceToast.transcript}"</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-medium truncate">
                    ➜ {voiceToast.feedbackText}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setVoiceToast(null)}
                className="text-cyan-400 hover:text-white p-1 shrink-0"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Tactical Danger Alert Banner if Active */}
          {coachState.dangerLevel === 'danger' && (
            <div className="bg-rose-950/90 border border-rose-500 text-rose-200 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center justify-between shadow-[0_0_10px_rgba(244,63,94,0.4)] animate-pulse">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">DANGER: Enemies MIA &amp; Low HP!</span>
              </div>
              <span className="text-[9px] uppercase tracking-wide bg-rose-900 px-1.5 py-0.5 rounded shrink-0">
                FALL BACK
              </span>
            </div>
          )}

          {/* Tactical Coach Quick Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap px-0.5 text-[10px]">
            {coachState.powerSpike && coachState.powerSpike.isUnlocked && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>Lvl {coachState.powerSpike.level} Spike</span>
              </span>
            )}

            {coachState.neutralSlot.alertActive ? (
              <span
                className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500 font-bold font-mono flex items-center gap-0.5"
                title={
                  coachState.neutralSlot.recommendations?.length
                    ? `Top: ${coachState.neutralSlot.recommendations.slice(0, 3).map((r) => r.displayName).join(', ')}`
                    : undefined
                }
              >
                <Package className="w-2.5 h-2.5 text-purple-400" />
                <span>
                  ! T{coachState.neutralSlot.tierUnlocked}
                  {coachState.neutralSlot.recommendations?.[0]
                    ? `: ${coachState.neutralSlot.recommendations[0].displayName}`
                    : ''}
                </span>
              </span>
            ) : coachState.neutralSlot.equippedItemName ? (
              <span
                className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono capitalize truncate max-w-[110px]"
                title={coachState.neutralSlot.equippedItemName}
              >
                📦 {coachState.neutralSlot.equippedItemName}
              </span>
            ) : null}

            {coachState.buyback.state === 'deficit' ? (
              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold font-mono flex items-center gap-0.5">
                <Coins className="w-2.5 h-2.5 text-rose-400" />
                <span>BB: -{coachState.buyback.deficit}g</span>
              </span>
            ) : coachState.buyback.state === 'ready' ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 font-mono font-bold flex items-center gap-0.5">
                <Coins className="w-2.5 h-2.5 text-emerald-400" />
                <span>BB: OK</span>
              </span>
            ) : null}

            {coachState.tpScroll?.alertActive ? (
              <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500 font-bold font-mono flex items-center gap-0.5">
                <Scroll className="w-2.5 h-2.5 text-amber-400" />
                <span>NO TP!</span>
              </span>
            ) : coachState.tpScroll?.isTravelBoots ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-500/40 font-mono text-[10px] flex items-center gap-0.5" title="Boots of Travel">
                <span>👢 BoT</span>
              </span>
            ) : coachState.tpScroll?.hasTp ? (
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[10px] flex items-center gap-0.5" title={`${coachState.tpScroll.charges} TP scrolls`}>
                <Scroll className="w-2.5 h-2.5 text-slate-400" />
                <span>{coachState.tpScroll.charges} TP</span>
              </span>
            ) : null}

            {talentMilestone && (
              <button
                onClick={() => {
                  setDismissedTalentLevel(null);
                  setTalentBannerExpiry(Date.now() + 30000);
                }}
                className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/60 font-bold font-mono flex items-center gap-0.5 transition"
                title={`Lvl ${talentMilestone.level} Talent Recommended (Click to view)`}
              >
                <GitBranch className="w-2.5 h-2.5 text-emerald-400" />
                <span>⭐ L{talentMilestone.level}</span>
              </button>
            )}

            {skillRecommendation && (
              <button
                onClick={() => {
                  setDismissedSkillPoint(null);
                  setSkillBannerFirstSeen(Date.now());
                }}
                className="px-1.5 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/70 font-bold font-mono flex items-center gap-0.5 transition"
                title={`Skill Point Ready! [${skillRecommendation.slot}] ${skillRecommendation.skillName} (Click to expand)`}
              >
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>⚡ [{skillRecommendation.slot}]</span>
              </button>
            )}

            {coachState.visionState?.activeWards && coachState.visionState.activeWards.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded font-bold font-mono text-[10px] flex items-center gap-1 border ${
                  (coachState.visionState.nearestExpirySeconds ?? 999) <= 30
                    ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                    : 'bg-sky-950/80 text-sky-300 border-sky-500/60'
                }`}
                title={`Active Observer Wards (${coachState.visionState.activeWards.length}): Nearest expires in ${Math.floor((coachState.visionState.nearestExpirySeconds ?? 0) / 60)}:${((coachState.visionState.nearestExpirySeconds ?? 0) % 60).toString().padStart(2, '0')}`}
              >
                <Eye className="w-2.5 h-2.5 text-sky-400" />
                <span>
                  👁️ {Math.floor((coachState.visionState.nearestExpirySeconds ?? 0) / 60)}:{((coachState.visionState.nearestExpirySeconds ?? 0) % 60).toString().padStart(2, '0')}
                  {coachState.visionState.activeWards.length > 1 ? ` (${coachState.visionState.activeWards.length})` : ''}
                </span>
              </span>
            )}

            {activeCooldowns.map((cd) => (
              <span
                key={cd.id}
                className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/80 font-bold font-mono text-[10px] flex items-center gap-1 animate-pulse shadow-sm"
                title={`${cd.name} Cooldown: ${Math.floor(cd.remainingSeconds / 60)}:${(cd.remainingSeconds % 60).toString().padStart(2, '0')} remaining`}
              >
                <span>{cd.icon || '🛡️'}</span>
                <span>
                  {cd.name}: {Math.floor(cd.remainingSeconds / 60)}:{(cd.remainingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </span>
            ))}
          </div>

          {coachState.neutralSlot.alertActive && coachState.neutralSlot.recommendations && coachState.neutralSlot.recommendations.length > 0 && (
            <div className="mx-0.5 px-2 py-1 rounded-lg bg-purple-950/90 border border-purple-600/70 text-[10px] text-purple-200 flex items-center justify-between gap-1 shadow-md">
              <div className="flex items-center gap-1.5 truncate">
                <Package className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="font-bold text-purple-300">T{coachState.neutralSlot.tierUnlocked}:</span>
                <span className="truncate font-semibold text-white">
                  {coachState.neutralSlot.recommendations.slice(0, 2).map((r) => r.displayName).join(' / ')}
                </span>
              </div>
              <span className="text-[9px] bg-purple-900/90 text-purple-300 px-1 rounded font-mono shrink-0">
                {coachState.neutralSlot.heroRole || 'Recommended'}
              </span>
            </div>
          )}

          {isTalentBannerVisible && talentMilestone && (
            <div className="mx-0.5 px-2 py-1 rounded-lg bg-emerald-950/95 border border-emerald-600/80 text-[10px] text-emerald-200 flex items-center justify-between gap-1 shadow-md">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <GitBranch className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-bold text-emerald-300 shrink-0">L{talentMilestone.level}:</span>
                <span className="truncate font-semibold text-white">
                  {talentMilestone.recommended === "left"
                    ? isThai ? talentMilestone.left.th : talentMilestone.left.en
                    : isThai ? talentMilestone.right.th : talentMilestone.right.en}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    const side = talentMilestone.recommended;
                    const choice = talentMilestone[side].en;
                    const reason = isThai ? talentMilestone.reasonTh : talentMilestone.reasonEn;
                    audioService.playTalentAlert(talentMilestone.level, side, choice, reason, true);
                  }}
                  className="p-1 rounded hover:bg-emerald-900 text-emerald-300 hover:text-white transition shrink-0"
                  title="Voice Announce Talent Advice"
                >
                  <Volume2 className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => setDismissedTalentLevel(talentMilestone.level)}
                  className="p-1 rounded hover:bg-emerald-900 text-emerald-400 hover:text-white transition shrink-0"
                  title="Dismiss (Minimize to ⭐ pill)"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {isSkillBannerVisible && skillRecommendation && (
            <div className="mx-0.5 px-2 py-1.5 rounded-lg bg-amber-950/95 border border-amber-500/80 text-[10px] text-amber-200 flex items-center justify-between gap-1 shadow-md">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex flex-col truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-amber-300 bg-amber-900/90 px-1 py-0.2 rounded text-[9px]">
                      [{skillRecommendation.slot}]
                    </span>
                    <span className="truncate font-bold text-white">
                      {skillRecommendation.skillName}
                      {skillRecommendation.targetLevel ? ` (Lvl ${skillRecommendation.targetLevel})` : ''}
                    </span>
                    {skillRecommendation.unspentPoints > 1 && (
                      <span className="text-[8px] text-amber-400 font-mono">
                        (+{skillRecommendation.unspentPoints} pts)
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-amber-200/80 truncate">
                    {isThai ? skillRecommendation.reasonTh : skillRecommendation.reasonEn}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setDismissedSkillPoint(currentRecKey)}
                  className="p-1 rounded hover:bg-amber-900 text-amber-400 hover:text-white transition shrink-0"
                  title="Dismiss (Minimize to ⚡ pill)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Quick objective death buttons. GSI can update Roshan automatically;
              these controls remain useful when optional fields are unavailable. */}
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {!roshanState.isDead ? (
              <button
                onClick={handleRecordRoshan}
                className="w-full py-1 px-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Mark Roshan Slain (5m Aegis)</span>
              </button>
            ) : (
              <div className="w-full flex items-center justify-between bg-rose-950/40 border border-rose-800/80 rounded-lg px-2 py-1 text-[11px]">
                <span className="text-rose-300 font-semibold">Roshan Dead</span>
                <button
                  onClick={() => timingEngine.resetRoshan()}
                  className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                >
                  Reset
                </button>
              </div>
            )}

            {!tormentorState.isDead ? (
              <button
                onClick={handleRecordTormentor}
                className="py-1 px-2 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-700/80 text-blue-200 text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
              >
                <Flame className="w-3 h-3 text-blue-400" />
                <span>Tormentor Slain</span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/80 rounded-lg px-2 py-1 text-[10px]">
                <span className="text-blue-300 font-semibold">Tormentor Dead</span>
                <button
                  onClick={() => timingEngine.resetTormentor()}
                  className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Timers list */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Upcoming Objectives</span>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-3 text-[11px] text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800/60">
                {isConnected ? 'No immediate objectives' : 'Waiting for Dota 2 match...'}
              </div>
            ) : (
              alerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs border transition-all ${
                    a.urgent
                      ? 'bg-amber-950/70 border-amber-500 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-900/90 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <span className="shrink-0">{getAlertIcon(a.type)}</span>
                    <span className="font-semibold text-xs truncate">{a.title}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded shrink-0 ${
                      a.urgent ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-800 text-amber-400'
                    }`}
                  >
                    {a.secondsRemaining > 0 ? `${a.secondsRemaining}s` : 'NOW'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Popular item from OpenDota */}
          {popularItem && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  <span>Recommended Item</span>
                </div>
                <button
                  onClick={() =>
                    audioService.playItemAdvice(
                      payload?.hero?.name ?? '',
                      popularItem.tier,
                      items.filter((i) => i.tier === popularItem.tier),
                      true,
                    )
                  }
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[9px] border border-amber-500/40 transition"
                  title="Speak Item Recommendation"
                >
                  <Volume2 className="w-2.5 h-2.5" />
                  <span>Speak</span>
                </button>
              </div>
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2 text-xs">
                <div className="flex justify-between font-bold text-slate-200">
                  <span className="truncate mr-2">{popularItem.displayName}</span>
                  <span className="text-amber-400 font-mono shrink-0">
                    {popularItem.cost === null ? 'N/A' : `${popularItem.cost}g`}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {popularItem.reason}
                </div>
              </div>
            </div>
          )}

          {/* HUD Opacity Slider */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Opacity</span>
            <input
              type="range"
              min="30"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-28 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-mono w-6 text-right">{opacity}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
