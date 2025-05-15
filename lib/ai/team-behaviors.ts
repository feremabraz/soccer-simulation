/**
 * Team Behavior System using Jotai
 *
 * Implements team-level behavior coordination, tactical adjustments,
 * set-piece organization and opposition analysis
 */

import type { BallEntity } from '@/lib/core/ball';
import type { PlayerEntity } from '@/lib/core/player';
import type { TeamEntity } from '@/lib/core/team';
import type { MatchState } from '@/lib/match/match-state';
import { jotaiStore } from '@/lib/state/jotai-store';
import type { TeamId, Vector2D } from '@/lib/utils/types';
import { type PrimitiveAtom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { NodeResult } from './behavior-tree';

// Type definitions
export type TeamBehaviorType =
  | 'highPress'
  | 'midBlock'
  | 'lowBlock'
  | 'possession'
  | 'counterAttack'
  | 'widePlay'
  | 'narrowPlay'
  | 'setpieceAttack'
  | 'setpieceDefense'
  | 'parkTheBus'
  | 'allOutAttack';

export interface TeamTacticalState {
  currentBehavior: TeamBehaviorType;
  behaviorStartTime: number;
  defensiveLineHeight: number;
  pressingIntensity: number;
  width: number;
  verticalCompactness: number;
  passingStyle: 'short' | 'mixed' | 'long';
  tempo: number;
  markingAssignments: Map<string, string>; // Maps opponent ID to player ID
  zonalDefenseAreas: Map<string, Vector2D>; // Maps player ID to zone center
  threatAssessment: {
    dangerousOpponents: number[];
    vulnerableAreas: Vector2D[];
    possessionRisk: number; // 0-10
  };
}

// Team behavior node interface
export interface TeamBehaviorNode {
  execute(team: TeamEntity, context: TeamBehaviorContext): NodeResult;
}

// Context for team behavior execution
export interface TeamBehaviorContext {
  ball: BallEntity;
  matchState: MatchState;
  opposition: TeamEntity;
  behaviorState: TeamTacticalState;
  deltaTime: number;
}

// State atoms
const initialTeamTacticalState: TeamTacticalState = {
  currentBehavior: 'midBlock',
  behaviorStartTime: 0,
  defensiveLineHeight: 5,
  pressingIntensity: 5,
  width: 5,
  verticalCompactness: 5,
  passingStyle: 'mixed',
  tempo: 5,
  markingAssignments: new Map(),
  zonalDefenseAreas: new Map(),
  threatAssessment: {
    dangerousOpponents: [],
    vulnerableAreas: [],
    possessionRisk: 5,
  },
};

// Team tactical state atom family
export const teamTacticalStateAtom = atomFamily<TeamId, PrimitiveAtom<TeamTacticalState>>(
  (_teamId) => atom<TeamTacticalState>({ ...initialTeamTacticalState })
);

// Behavior context atom family
export const teamBehaviorContextAtom = atomFamily<
  TeamId,
  PrimitiveAtom<TeamBehaviorContext | null>
>((_teamId) => atom<TeamBehaviorContext | null>(null));

// Stats for team behaviors
export interface TeamBehaviorStats {
  behaviorChanges: number;
  behaviorDuration: Record<TeamBehaviorType, number>;
  successfulTacticalShifts: number;
  setpieceSuccess: number;
  setpieceTotal: number;
  defensiveRecoveries: number;
  counterAttackOpportunities: number;
  lastUpdateTime: number;
}

// Team behavior stats atom family
export const teamBehaviorStatsAtom = atomFamily<TeamId, PrimitiveAtom<TeamBehaviorStats>>(
  (_teamId) =>
    atom<TeamBehaviorStats>({
      behaviorChanges: 0,
      behaviorDuration: {
        highPress: 0,
        midBlock: 0,
        lowBlock: 0,
        possession: 0,
        counterAttack: 0,
        widePlay: 0,
        narrowPlay: 0,
        setpieceAttack: 0,
        setpieceDefense: 0,
        parkTheBus: 0,
        allOutAttack: 0,
      },
      successfulTacticalShifts: 0,
      setpieceSuccess: 0,
      setpieceTotal: 0,
      defensiveRecoveries: 0,
      counterAttackOpportunities: 0,
      lastUpdateTime: 0,
    })
);

// Selector for team behavior stats
export const teamBehaviorStatsSelector = atom(
  (get) => (teamId: TeamId) => get(teamBehaviorStatsAtom(teamId))
);

// -------------------------
// Team Behavior System
// -------------------------

/**
 * Analyzes the current match situation and determines the optimal team behavior
 */
export function analyzeTacticalSituation(
  team: TeamEntity,
  _opposition: TeamEntity,
  matchState: MatchState,
  ball: BallEntity
): TeamBehaviorType {
  const scoreLineDifference =
    team.id === 'home'
      ? matchState.score.home - matchState.score.away
      : matchState.score.away - matchState.score.home;
  const matchTimeRemaining = 90 - matchState.gameTime;
  const isWinning = scoreLineDifference > 0;
  const isLosing = scoreLineDifference < 0;
  const isTied = scoreLineDifference === 0;
  const ballInOurHalf =
    (team.id === 'home' && ball.position.x < 50) || (team.id === 'away' && ball.position.x > 50);
  const hasSetPiece = matchState.setpiece.type !== null;

  // Check if it's a set piece situation
  if (hasSetPiece) {
    const isOurSetPiece = matchState.setpiece?.team === team.id;
    return isOurSetPiece ? 'setpieceAttack' : 'setpieceDefense';
  }

  // Late game adjustments
  if (matchTimeRemaining < 10) {
    if (isWinning) {
      return 'parkTheBus'; // Hold the lead
    }
    if (isLosing) {
      return 'allOutAttack'; // Chase the game
    }
    if (isTied) {
      return 'midBlock'; // Balance
    }
  }

  // Team has ball possession
  if (ball.possessor && ball.lastTouchTeam === team.id) {
    // Base decision on team's tactical style and match situation
    switch (team.tactics.style) {
      case 'possession':
        return 'possession';
      case 'counter':
        return ballInOurHalf ? 'counterAttack' : 'possession';
      case 'direct':
        return 'widePlay';
      case 'wing':
        return 'widePlay';
      case 'pressing':
        return isLosing ? 'allOutAttack' : 'possession';
    }
  }

  // Opposition has ball
  switch (team.tactics.defensiveStyle) {
    case 'highpress':
      return 'highPress';
    case 'midblock':
      return 'midBlock';
    case 'lowblock':
      return 'lowBlock';
    case 'manmarking':
    case 'zonalmarking':
      return ballInOurHalf ? 'midBlock' : 'lowBlock';
  }
}

/**
 * Identifies dangerous opponents based on their position, attributes and current match context
 */
export function identifyDangerousOpponents(
  team: TeamEntity,
  opposition: TeamEntity,
  _matchState: MatchState,
  ball: BallEntity
): number[] {
  const dangerousPlayers: number[] = [];
  const ourGoalPosition: Vector2D = team.id === 'home' ? { x: 0, y: 50 } : { x: 100, y: 50 };

  for (const player of opposition.players) {
    // Skip injured or carded players
    if (player.injured || player.redCard) continue;

    // Calculate threat level based on position, role and attributes
    let threatLevel = 0;

    // Position-based threat
    const distanceToOurGoal = Math.sqrt(
      (player.position.x - ourGoalPosition.x) ** 2 + (player.position.y - ourGoalPosition.y) ** 2
    );
    threatLevel += Math.max(0, 100 - distanceToOurGoal);

    // Role-based threat
    if (player.role === 'FWD') threatLevel += 30;
    else if (player.role === 'MID') threatLevel += 15;

    // Attribute-based threat
    threatLevel += player.attributes.finishing * 3;
    threatLevel += player.attributes.dribbling * 2;
    threatLevel += player.attributes.speed * 2;

    // Ball possession increases threat
    if (ball.possessor && ball.possessor.id === player.id) {
      threatLevel += 50;
    }

    // If threat level is high enough, add to dangerous players list
    if (threatLevel > 100) {
      dangerousPlayers.push(player.id);
    }
  }

  // Sort by threat level (in a real implementation we'd keep the scores)
  return dangerousPlayers;
}

/**
 * Creates marking assignments for the team's defenders
 */
export function createMarkingAssignments(
  defenders: PlayerEntity[],
  dangerousOpponents: PlayerEntity[]
): Map<string, string> {
  const assignments = new Map<string, string>();

  // Sort defenders by defensive attributes
  const sortedDefenders = [...defenders].sort(
    (a, b) => b.attributes.tackling - a.attributes.tackling
  );

  // Sort attackers by offensive threat
  const sortedAttackers = [...dangerousOpponents].sort(
    (a, b) =>
      b.attributes.finishing +
      b.attributes.dribbling -
      (a.attributes.finishing + a.attributes.dribbling)
  );

  // Assign the best defender to the most dangerous attacker
  for (let i = 0; i < Math.min(sortedDefenders.length, sortedAttackers.length); i++) {
    assignments.set(String(sortedAttackers[i].id), String(sortedDefenders[i].id));
  }

  return assignments;
}

/**
 * Creates zonal defense areas for players when using zonal marking
 */
export function createZonalDefenseAreas(
  _team: TeamEntity,
  formationPositions: Record<string, Vector2D>
): Map<string, Vector2D> {
  const zonalAreas = new Map<string, Vector2D>();

  // Use formation positions as the base for zonal responsibility
  for (const [playerId, position] of Object.entries(formationPositions)) {
    zonalAreas.set(String(playerId), { ...position });
  }

  return zonalAreas;
}

/**
 * Adjusts team tactical parameters based on the selected behavior
 */
export function applyTeamBehavior(
  _team: TeamEntity,
  behaviorType: TeamBehaviorType,
  currentState: TeamTacticalState,
  _matchState: MatchState
): TeamTacticalState {
  // Start with current state
  const newState: TeamTacticalState = { ...currentState };
  newState.currentBehavior = behaviorType;

  // Apply behavior-specific tactical settings
  switch (behaviorType) {
    case 'highPress':
      newState.defensiveLineHeight = 8;
      newState.pressingIntensity = 9;
      newState.verticalCompactness = 7;
      newState.width = 7;
      newState.passingStyle = 'mixed';
      newState.tempo = 7;
      break;

    case 'midBlock':
      newState.defensiveLineHeight = 5;
      newState.pressingIntensity = 5;
      newState.verticalCompactness = 8;
      newState.width = 6;
      break;

    case 'lowBlock':
      newState.defensiveLineHeight = 2;
      newState.pressingIntensity = 3;
      newState.verticalCompactness = 9;
      newState.width = 5;
      break;

    case 'possession':
      newState.defensiveLineHeight = 6;
      newState.passingStyle = 'short';
      newState.tempo = 4;
      newState.width = 7;
      break;

    case 'counterAttack':
      newState.defensiveLineHeight = 4;
      newState.passingStyle = 'long';
      newState.tempo = 8;
      newState.width = 4;
      break;

    case 'widePlay':
      newState.width = 9;
      newState.tempo = 6;
      newState.passingStyle = 'mixed';
      break;

    case 'narrowPlay':
      newState.width = 3;
      newState.verticalCompactness = 7;
      newState.passingStyle = 'short';
      break;

    case 'setpieceAttack':
      // Set piece specific positioning would be handled by formation system
      newState.pressingIntensity = 2;
      break;

    case 'setpieceDefense':
      newState.pressingIntensity = 7;
      newState.verticalCompactness = 9;
      break;

    case 'parkTheBus':
      newState.defensiveLineHeight = 1;
      newState.pressingIntensity = 2;
      newState.verticalCompactness = 10;
      newState.width = 4;
      newState.tempo = 2;
      newState.passingStyle = 'long';
      break;

    case 'allOutAttack':
      newState.defensiveLineHeight = 8;
      newState.pressingIntensity = 8;
      newState.verticalCompactness = 3;
      newState.width = 8;
      newState.tempo = 9;
      newState.passingStyle = 'mixed';
      break;
  }

  return newState;
}

/**
 * Updates team behavior including marking assignments and zonal defense based on match state
 */
export function updateTeamBehavior(
  team: TeamEntity,
  opposition: TeamEntity,
  matchState: MatchState,
  ball: BallEntity,
  currentState: TeamTacticalState
): TeamTacticalState {
  // Analyze the current tactical situation
  const optimalBehavior = analyzeTacticalSituation(team, opposition, matchState, ball);

  // Only change behavior if it's different from current or contextually necessary
  let newState = currentState;
  if (optimalBehavior !== currentState.currentBehavior) {
    // Apply the new behavior settings
    newState = applyTeamBehavior(team, optimalBehavior, currentState, matchState);
    newState.behaviorStartTime = matchState.gameTime;
  }

  // Identify dangerous opponents for man-marking
  const dangerousOpponentIds = identifyDangerousOpponents(team, opposition, matchState, ball);
  const dangerousOpponents = opposition.players.filter((p) => dangerousOpponentIds.includes(p.id));

  // Update marking assignments if we're defending
  if (
    ['highPress', 'midBlock', 'lowBlock', 'setpieceDefense', 'parkTheBus'].includes(optimalBehavior)
  ) {
    const defenders = team.players.filter((p) => p.role === 'DEF' || p.role === 'MID');
    newState.markingAssignments = createMarkingAssignments(defenders, dangerousOpponents);
  }

  // Update zonal defense areas
  newState.zonalDefenseAreas = createZonalDefenseAreas(team, team.formationPositions);

  // Update threat assessment
  newState.threatAssessment = {
    dangerousOpponents: dangerousOpponentIds,
    vulnerableAreas: calculateVulnerableAreas(team, opposition, ball),
    possessionRisk: calculatePossessionRisk(team, opposition, ball, matchState),
  };

  return newState;
}

/**
 * Identifies vulnerable areas in the team's defense
 */
function calculateVulnerableAreas(
  team: TeamEntity,
  _opposition: TeamEntity,
  _ball: BallEntity
): Vector2D[] {
  const vulnerableAreas: Vector2D[] = [];

  // This is a simplified implementation
  // A full implementation would use spatial analysis to find gaps in defensive coverage

  // Add the areas between defenders as vulnerable
  const defenders = team.players.filter((p) => p.role === 'DEF');
  if (defenders.length >= 2) {
    // Sort defenders by their y position (horizontal across the pitch)
    const sortedByY = [...defenders].sort((a, b) => a.position.y - b.position.y);

    // Check for gaps between adjacent defenders
    for (let i = 0; i < sortedByY.length - 1; i++) {
      const current = sortedByY[i];
      const next = sortedByY[i + 1];
      const gapSize = next.position.y - current.position.y;

      // If gap is large enough, consider it vulnerable
      if (gapSize > 15) {
        vulnerableAreas.push({
          x: (current.position.x + next.position.x) / 2,
          y: (current.position.y + next.position.y) / 2,
        });
      }
    }
  }

  return vulnerableAreas;
}

/**
 * Calculates the risk level when in possession
 */
function calculatePossessionRisk(
  team: TeamEntity,
  opposition: TeamEntity,
  ball: BallEntity,
  matchState: MatchState
): number {
  // Base risk level
  let risk = 5;

  // Increase risk if ball is in our half
  const inOurHalf =
    (team.id === 'home' && ball.position.x < 50) || (team.id === 'away' && ball.position.x > 50);
  if (inOurHalf) {
    risk += 2;
  }

  // Increase risk if opposition is pressing high
  const oppositionTacticalState = matchState.tacticalState?.get(opposition.id);
  if (oppositionTacticalState && oppositionTacticalState.pressingIntensity > 7) {
    risk += 2;
  }

  // Increase risk if losing and late in game (desperation from opposition)
  const scoreLineDifference =
    team.id === 'home'
      ? matchState.score.home - matchState.score.away
      : matchState.score.away - matchState.score.home;
  if (scoreLineDifference < 0 && matchState.gameTime > 75) {
    risk += 1;
  }

  // Cap risk between 0-10
  return Math.max(0, Math.min(10, risk));
}

/**
 * Team behavior system main update function
 * This is the entry point that should be called from the match engine
 */
export function updateTeamBehaviors(
  team: TeamEntity,
  opposition: TeamEntity,
  matchState: MatchState,
  ball: BallEntity,
  deltaTime: number
): void {
  // Get the current team tactical state from Jotai atom
  const tacticalStateAtom = teamTacticalStateAtom(team.id);
  const currentState = jotaiStore.get(tacticalStateAtom);

  // Update the team behavior
  const newState = updateTeamBehavior(team, opposition, matchState, ball, currentState);

  // Update stats if behavior changed
  if (newState.currentBehavior !== currentState.currentBehavior) {
    const statsAtom = teamBehaviorStatsAtom(team.id);
    const stats = jotaiStore.get(statsAtom);

    const newStats = {
      ...stats,
      behaviorChanges: stats.behaviorChanges + 1,
      behaviorDuration: {
        ...stats.behaviorDuration,
        [newState.currentBehavior]:
          stats.behaviorDuration[newState.currentBehavior as TeamBehaviorType] + 1,
      },
      lastUpdateTime: matchState.gameTime,
    };

    jotaiStore.set(statsAtom, newStats);
  }

  // Store the tactical state on the matchState object if needed
  // This requires an update to MatchState class (separate change)

  // Update the Jotai atom with the new state
  jotaiStore.set(tacticalStateAtom, newState);

  // Update the team behavior context for UI and debugging
  const contextAtom = teamBehaviorContextAtom(team.id);
  jotaiStore.set(contextAtom, {
    ball,
    matchState,
    opposition,
    behaviorState: newState,
    deltaTime,
  });
}

// Export pattern for Jotai-based team behaviors
export const teamBehaviors = {
  // Core functions
  analyzeTacticalSituation,
  applyTeamBehavior,
  updateTeamBehavior,
  updateTeamBehaviors,

  // Analysis functions
  identifyDangerousOpponents,
  createMarkingAssignments,
  createZonalDefenseAreas,

  // Atoms
  teamTacticalStateAtom,
  teamBehaviorContextAtom,
  teamBehaviorStatsAtom,
  teamBehaviorStatsSelector,
};
