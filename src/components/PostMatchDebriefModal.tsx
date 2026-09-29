import React from 'react';
import { MatchRecord } from '../types/matchHistory';
import { matchTrackerService } from '../services/matchTrackerService';
import { audioService } from '../services/audioService';

interface Props {
  record: MatchRecord;
  onViewHistory?: () => void;
  onClose: () => void;
}

export const PostMatchDebriefModal: React.FC<Props> = ({ record, onViewHistory, onClose }) => {
  const scorecard = record.scorecard;
  if (!scorecard) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S':
        return 'text-amber-400 border-amber-400 bg-amber-400/10 shadow-amber-500/20';
      case 'A':
        return 'text-emerald-400 border-emerald-400 bg-emerald-400/10 shadow-emerald-500/20';
      case 'B':
        return 'text-cyan-400 border-cyan-400 bg-cyan-400/10 shadow-cyan-500/20';
      case 'C':
        return 'text-orange-400 border-orange-400 bg-orange-400/10 shadow-orange-500/20';
      default:
        return 'text-rose-400 border-rose-400 bg-rose-400/10 shadow-rose-500/20';
    }
  };

  const getPillarBadge = (grade: string) => {
    switch (grade) {
      case 'S':
      case 'A':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'B':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'C':
        return 'bg-orange-950/80 text-orange-300 border-orange-700/60';
      default:
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
    }
  };

  const handleReplayVoice = () => {
    if (scorecard.spokenSummary) {
      audioService.playPostMatchDebrief(scorecard.spokenSummary);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col gap-6 custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>🏅</span> บทวิเคราะห์และประเมินผลหลังจบเกม (Post-Match Debrief)
              </h2>
              {record.won !== null && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    record.won
                      ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
                      : 'bg-rose-900/60 text-rose-300 border-rose-500/50'
                  }`}
                >
                  {record.won ? 'VICTORY (ชนะ)' : 'DEFEAT (พ่ายแพ้)'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ฮีโร่: <span className="text-amber-300 font-semibold">{record.heroDisplayName}</span> | บทบาท:{' '}
              <span className="capitalize text-slate-200">{record.role}</span> | ความยาว:{' '}
              <span className="text-slate-200">{formatDuration(record.matchDuration)}</span> | KDA:{' '}
              <span className="text-slate-200">
                {record.kills}/{record.deaths}/{record.assists}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              matchTrackerService.dismissDebrief();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        {/* Overall Scorecard Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-950/70 border border-slate-800 rounded-xl p-5">
          <div
            className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 shadow-lg ${getGradeColor(
              scorecard.overallGrade
            )} shrink-0`}
          >
            <span className="text-4xl font-black">{scorecard.overallGrade}</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase mt-0.5">GRADE</span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold text-slate-300">
                คะแนนวินัยพื้นฐาน (Fundamentals Score)
              </span>
              <span className="text-lg font-bold text-amber-400">{scorecard.overallScore} / 100</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${scorecard.overallScore}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              ประเมินจาก 4 เสาหลัก: CS Pace ในเลน, การดันครีปก่อนเวลารูน, วินัยการถือ Aegis, และการสำรองเงิน Buyback
            </p>
          </div>
        </div>

        {/* 4 Pillars Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pillar 1: CS Pace */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🌾</span> CS Pace (10:00)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPillarBadge(
                  scorecard.pillars.csPace.grade
                )}`}
              >
                เกรด {scorecard.pillars.csPace.grade} ({scorecard.pillars.csPace.score}%)
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-1">{scorecard.pillars.csPace.details}</p>
            <span
              className={`text-[10px] font-semibold ${
                scorecard.pillars.csPace.status === 'ahead'
                  ? 'text-emerald-400'
                  : scorecard.pillars.csPace.status === 'on_pace'
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}
            >
              สถานะ: {scorecard.pillars.csPace.status === 'ahead' ? 'เหนือเกณฑ์เป้าหมาย' : scorecard.pillars.csPace.status === 'on_pace' ? 'ตามเป้าหมาย' : 'ต่ำกว่าเกณฑ์'}
            </span>
          </div>

          {/* Pillar 2: Pre-Rune Shove */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🌊</span> ดันเลนก่อนรูน (Pre-Rune)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPillarBadge(
                  scorecard.pillars.preRuneShove.grade
                )}`}
              >
                เกรด {scorecard.pillars.preRuneShove.grade} ({scorecard.pillars.preRuneShove.score}%)
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-1">{scorecard.pillars.preRuneShove.details}</p>
            <span className="text-[10px] text-slate-400">
              จังหวะ :40 ก่อนรูน 2, 4, 6, 8 นาที
            </span>
          </div>

          {/* Pillar 3: Aegis Discipline */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛡️</span> วินัยการใช้ Aegis
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPillarBadge(
                  scorecard.pillars.aegisDiscipline.grade
                )}`}
              >
                เกรด {scorecard.pillars.aegisDiscipline.grade} ({scorecard.pillars.aegisDiscipline.score}%)
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-1">{scorecard.pillars.aegisDiscipline.details}</p>
            <span className="text-[10px] text-slate-400">
              การกดดันป้อม High Ground เมื่อถือโล่
            </span>
          </div>

          {/* Pillar 4: Buyback Discipline */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>💰</span> วินัย Buyback (30:00+)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPillarBadge(
                  scorecard.pillars.buybackDiscipline.grade
                )}`}
              >
                เกรด {scorecard.pillars.buybackDiscipline.grade} ({scorecard.pillars.buybackDiscipline.score}%)
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-1">{scorecard.pillars.buybackDiscipline.details}</p>
            <span className="text-[10px] text-slate-400">
              อัตราสำรองเงิน Safe-to-Spend: {scorecard.pillars.buybackDiscipline.safeSpendCompliance}%
            </span>
          </div>
        </div>

        {/* Strengths & Blunders Section */}
        <div className="space-y-3 bg-slate-950/40 border border-slate-800 rounded-xl p-4">
          {scorecard.keyStrengths.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>🌟</span> จุดเด่นที่ทำได้ดี (Strengths)
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300">
                {scorecard.keyStrengths.map((str, idx) => (
                  <li key={idx}>{str}</li>
                ))}
              </ul>
            </div>
          )}

          {scorecard.topBlunders.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>⚠️</span> ข้อผิดพลาดสำคัญที่ควรปรับปรุง (Blunders)
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300">
                {scorecard.topBlunders.map((blunder, idx) => (
                  <li key={idx}>{blunder}</li>
                ))}
              </ul>
            </div>
          )}

          {scorecard.nextGameFocus.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>🎯</span> สิ่งที่ต้องโฟกัสในเกมถัดไป (Next Game Focus)
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-200/90 font-medium">
                {scorecard.nextGameFocus.map((foc, idx) => (
                  <li key={idx}>{foc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleReplayVoice}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
          >
            <span>🔊</span> ฟังบทสรุปเสียงอีกครั้ง
          </button>

          <div className="flex items-center gap-2">
            {onViewHistory && (
              <button
                onClick={() => {
                  matchTrackerService.dismissDebrief();
                  onClose();
                  onViewHistory();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-900/30"
              >
                <span>📊</span> ดูประวัติและกราฟวิเคราะห์เต็ม
              </button>
            )}
            <button
              onClick={() => {
                matchTrackerService.dismissDebrief();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            >
              รับทราบ / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
