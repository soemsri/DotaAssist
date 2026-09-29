import React, { useState, useEffect } from 'react';
import { MatchRecord } from '../types/matchHistory';
import { matchTrackerService } from '../services/matchTrackerService';
import { PostMatchDebriefModal } from './PostMatchDebriefModal';

export const MatchHistoryView: React.FC = () => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await matchTrackerService.getMatchHistory(100);
      setMatches(records);
    } catch (e) {
      console.error('Failed to load match history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const unsub = matchTrackerService.subscribe(() => {
      loadHistory();
    });
    return unsub;
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('คุณต้องการลบประวัติแมตช์นี้หรือไม่?')) {
      await matchTrackerService.deleteMatchRecord(id);
      loadHistory();
    }
  };

  const handleClearAll = async () => {
    await matchTrackerService.clearAllMatches();
    setShowClearConfirm(false);
    loadHistory();
  };

  const filteredMatches = matches.filter((m) => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (gradeFilter !== 'all' && m.overallGrade !== gradeFilter) return false;
    return true;
  });

  // Calculate summary metrics
  const totalMatches = matches.length;
  const wins = matches.filter((m) => m.won === true).length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const avgScore =
    totalMatches > 0
      ? Math.round(matches.reduce((acc, m) => acc + m.overallScore, 0) / totalMatches)
      : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'S':
        return 'bg-amber-400/20 text-amber-300 border-amber-500/50';
      case 'A':
        return 'bg-emerald-400/20 text-emerald-300 border-emerald-500/50';
      case 'B':
        return 'bg-cyan-400/20 text-cyan-300 border-cyan-500/50';
      case 'C':
        return 'bg-orange-400/20 text-orange-300 border-orange-500/50';
      default:
        return 'bg-rose-400/20 text-rose-300 border-rose-500/50';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 max-w-6xl mx-auto p-4 sm:p-6 animate-fadeIn">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>📜</span> ประวัติแมตช์และบทวิเคราะห์ Fundamentals (Match History)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกสถิติภายในเครื่องด้วย SQLite แยก I/O ใน Background Worker เพื่อติดตามพัฒนาการแบบไร้ผลกระทบต่อ FPS
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <span>🔄</span> รีเฟรช
          </button>
          {totalMatches > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-800/50 transition"
            >
              <span>🗑️</span> ล้างประวัติทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <h3 className="text-lg font-bold text-white mb-2">ยืนยันการล้างประวัติแมตช์ทั้งหมด?</h3>
            <p className="text-xs text-slate-300 mb-6">
              ข้อมูลสถิติและคะแนน Scorecard ของทุกแมตช์ที่บันทึกไว้ใน SQLite จะถูกลบถาวรและไม่สามารถกู้คืนได้
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                ล้างข้อมูลทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">แมตช์ที่บันทึก</span>
          <span className="text-2xl font-black text-white mt-1">{totalMatches} แมตช์</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">อัตราการชนะ (Win Rate)</span>
          <span className="text-2xl font-black text-emerald-400 mt-1">{winRate}%</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">คะแนนวินัยเฉลี่ย</span>
          <span className="text-2xl font-black text-amber-400 mt-1">{avgScore} / 100</span>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">เกรดเฉลี่ยประเมิน</span>
          <span className="text-2xl font-black text-cyan-400 mt-1">
            {avgScore >= 90 ? 'S' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'D'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
        <span className="text-xs font-semibold text-slate-300">ตัวกรอง:</span>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">บทบาท:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">ทั้งหมด</option>
            <option value="carry">Carry</option>
            <option value="mid">Mid</option>
            <option value="offlane">Offlane</option>
            <option value="support">Support</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">เกรด:</span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">ทั้งหมด</option>
            <option value="S">เกรด S</option>
            <option value="A">เกรด A</option>
            <option value="B">เกรด B</option>
            <option value="C">เกรด C</option>
            <option value="D">เกรด D</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 ml-auto">
          แสดง {filteredMatches.length} จาก {totalMatches} รายการ
        </span>
      </div>

      {/* Match List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <div className="animate-spin text-3xl mb-2">⏳</div>
          <span className="text-xs">กำลังโหลดประวัติแมตช์จาก Local SQLite...</span>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center">
          <span className="text-4xl mb-3">🎮</span>
          <h3 className="text-sm font-bold text-slate-200 mb-1">ยังไม่มีประวัติการเล่นที่บันทึก</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            เมื่อเล่นแมตช์ Dota 2 และเกมเข้าสู่ช่วง POST_GAME ระบบจะวิเคราะห์คะแนน Fundamentals Scorecard และบันทึกประวัติให้อัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedMatch(m)}
              className="group bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
            >
              {/* Left Column: Hero & Match Meta */}
              <div className="flex items-center gap-4">
                {/* Grade Badge */}
                <div
                  className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 font-black text-lg ${getGradeBadge(
                    m.overallGrade
                  )}`}
                >
                  <span>{m.overallGrade}</span>
                  <span className="text-[9px] font-normal tracking-tight -mt-1">{m.overallScore}pt</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm group-hover:text-cyan-300 transition">
                      {m.heroDisplayName}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {m.role}
                    </span>
                    {m.won !== null && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.won
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                            : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                        }`}
                      >
                        {m.won ? 'ชนะ' : 'แพ้'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>{formatDate(m.timestamp)}</span>
                    <span>•</span>
                    <span>ระยะเวลา {formatDuration(m.matchDuration)}</span>
                    <span>•</span>
                    <span>
                      KDA: <strong className="text-slate-200">{m.kills}/{m.deaths}/{m.assists}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: CS & Net Worth & Blunders hint */}
              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                <div className="text-left sm:text-right text-xs">
                  <div className="text-slate-300 font-medium">
                    10m CS: <span className="font-bold text-amber-300">{m.csAt10}</span> / {m.csBenchmarkAt10}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Net Worth: {m.netWorth.toLocaleString()} | GPM: {m.gpm}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(m.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="ลบแมตช์นี้"
                  >
                    🗑️
                  </button>
                  <span className="text-slate-500 group-hover:text-slate-300 transition text-sm">
                    ➔
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Match Debrief Modal */}
      {selectedMatch && (
        <PostMatchDebriefModal
          record={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
};
