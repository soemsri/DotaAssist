export interface MatchPillarScore {
  score: number; // 0 - 100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  details: string;
}

export interface CSPacePillar extends MatchPillarScore {
  actualCs: number;
  expectedCs: number;
  denies: number;
  status: 'ahead' | 'on_pace' | 'behind';
}

export interface PreRuneShovePillar extends MatchPillarScore {
  successfulShoves: number;
  totalRunes: number;
  shovePercentage: number;
}

export interface AegisDisciplinePillar extends MatchPillarScore {
  aegisCount: number;
  towersTakenWithAegis: number;
  wastedAegisCount: number; // died or farmed passively with zero objectives
}

export interface BuybackDisciplinePillar extends MatchPillarScore {
  deathsPost30: number;
  deathsWithoutBuybackPost30: number;
  safeSpendCompliance: number; // percentage of time player stayed above safe-to-spend
}

export interface FundamentalsScorecard {
  overallScore: number; // 0 - 100
  overallGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  pillars: {
    csPace: CSPacePillar;
    preRuneShove: PreRuneShovePillar;
    aegisDiscipline: AegisDisciplinePillar;
    buybackDiscipline: BuybackDisciplinePillar;
  };
  keyStrengths: string[];
  topBlunders: string[];
  nextGameFocus: string[];
  spokenSummary: string; // 15s natural Thai TTS summary
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  heroId: number;
  heroName: string;
  heroDisplayName: string;
  role: 'carry' | 'mid' | 'offlane' | 'support';
  matchDuration: number; // in seconds
  won: boolean | null;
  kills: number;
  deaths: number;
  assists: number;
  csAt10: number;
  deniesAt10: number;
  csBenchmarkAt10: number;
  netWorth: number;
  gpm: number;
  xpm: number;
  overallScore: number;
  overallGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  dataJson: string; // JSON serialized FundamentalsScorecard & detailed events
  scorecard?: FundamentalsScorecard;
}

export interface MatchHistoryFilter {
  heroId?: number;
  role?: string;
  grade?: string;
  wonOnly?: boolean;
}
