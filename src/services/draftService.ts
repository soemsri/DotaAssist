import { GSIDraft, GSIDraftTeam, GSIPlayer } from '../types/gsi';

function getPickClasses(team?: GSIDraftTeam): string[] {
  if (!team) return [];

  return [
    team.pick0_class,
    team.pick1_class,
    team.pick2_class,
    team.pick3_class,
    team.pick4_class,
  ].filter((heroName): heroName is string => Boolean(heroName));
}

/** Resolve enemy picks only when the local player's team is known. Guessing a
 * side while spectating can turn allied picks into incorrect counter advice. */
export function getEnemyPickClasses(
  draft?: GSIDraft,
  playerTeam?: GSIPlayer['team_name'],
): string[] {
  if (!draft || !playerTeam) return [];
  return getPickClasses(playerTeam === 'radiant' ? draft.team3 : draft.team2);
}

/** Resolve ally picks for the local player's team during draft phase. */
export function getAllyPickClasses(
  draft?: GSIDraft,
  playerTeam?: GSIPlayer['team_name'],
): string[] {
  if (!draft || !playerTeam) return [];
  return getPickClasses(playerTeam === 'radiant' ? draft.team2 : draft.team3);
}

/** Resolve allied picks when the local player's team is known (alias for getAllyPickClasses). */
export const getAlliedPickClasses = getAllyPickClasses;

/** Resolve allied pick hero IDs from the draft. */
export function getAlliedPickIds(
  draft?: GSIDraft,
  playerTeam?: GSIPlayer['team_name'],
): number[] {
  if (!draft || !playerTeam) return [];
  const team = playerTeam === 'radiant' ? draft.team2 : draft.team3;
  if (!team) return [];
  return [
    team.pick0_id,
    team.pick1_id,
    team.pick2_id,
    team.pick3_id,
    team.pick4_id,
  ].filter((id): id is number => typeof id === 'number' && id > 0);
}

