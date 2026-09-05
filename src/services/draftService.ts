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
