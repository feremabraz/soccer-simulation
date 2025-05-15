import type { PlayerEntity } from '../core/player';
import type { TeamEntity } from '../core/team';
import type { PlayerId, TeamSide } from '../utils/types';

export interface SubstitutionRequest {
  team: TeamSide;
  playerOut: PlayerId;
  playerIn: PlayerId;
}

export class SubstitutionSystem {
  private benchPlayers: {
    home: PlayerEntity[];
    away: PlayerEntity[];
  } = {
    home: [],
    away: [],
  };

  // Initialize bench players
  initializeBench(homeBench: PlayerEntity[], awayBench: PlayerEntity[]): void {
    this.benchPlayers.home = homeBench;
    this.benchPlayers.away = awayBench;
  }

  // Get available bench players for a team
  getAvailableBenchPlayers(team: TeamSide): PlayerEntity[] {
    return this.benchPlayers[team];
  }

  // Make the substitution
  makeSubstitution(
    request: SubstitutionRequest,
    homeTeam: TeamEntity,
    awayTeam: TeamEntity,
    activePlayers: PlayerEntity[]
  ): { success: boolean; message: string; updatedPlayers?: PlayerEntity[] } {
    const team = request.team === 'home' ? homeTeam : awayTeam;
    const benchPlayers = this.benchPlayers[request.team];

    // Find player to substitute out
    const playerOutIndex = activePlayers.findIndex(
      (p) => p.team === request.team && p.id === request.playerOut
    );

    if (playerOutIndex === -1) {
      return { success: false, message: 'Player to substitute out not found on the field' };
    }

    // Find player to substitute in
    const playerInIndex = benchPlayers.findIndex((p) => p.id === request.playerIn);

    if (playerInIndex === -1) {
      return { success: false, message: 'Player to substitute in not found on the bench' };
    }

    // Get the players
    const playerOut = activePlayers[playerOutIndex];
    const playerIn = benchPlayers[playerInIndex];

    // Set the new player's position to the old player's position
    playerIn.position = { ...playerOut.position };
    playerIn.targetPosition = { ...playerOut.targetPosition };

    // Update the active players array
    const updatedPlayers = [...activePlayers];
    updatedPlayers[playerOutIndex] = playerIn;

    // Update the bench
    this.benchPlayers[request.team] = [
      ...benchPlayers.slice(0, playerInIndex),
      playerOut,
      ...benchPlayers.slice(playerInIndex + 1),
    ];

    // Update team's players list
    team.players = team.players.map((p) => (p.id === playerOut.id ? playerIn : p));

    return {
      success: true,
      message: `Substitution made: ${playerIn.name} replaces ${playerOut.name}`,
      updatedPlayers,
    };
  }

  // AI-controlled substitution decision
  suggestSubstitution(
    team: TeamSide,
    activePlayers: PlayerEntity[],
    _gameTime: number
  ): SubstitutionRequest | null {
    const teamPlayers = activePlayers.filter((p) => p.team === team);
    const benchPlayers = this.benchPlayers[team];

    if (benchPlayers.length === 0) {
      return null; // No bench players available
    }

    // Find the most tired player or a player performing poorly
    let worstPerformer: PlayerEntity | null = null;
    let worstScore = Number.POSITIVE_INFINITY;

    for (const player of teamPlayers) {
      if (player.role === 'GK') continue; // Don't substitute goalkeeper

      // Calculate performance score (lower is worse)
      const fatigueImpact = player.fatigue * 5;
      const performanceScore = 10 - fatigueImpact;

      if (performanceScore < worstScore) {
        worstScore = performanceScore;
        worstPerformer = player;
      }
    }

    // Only substitute if performance is bad enough
    if (worstPerformer && worstScore < 5) {
      // Find best replacement with same role
      const replacements = benchPlayers.filter((p) => p.role === worstPerformer?.role);

      if (replacements.length > 0) {
        // Pick the best replacement
        const bestReplacement = replacements[0];

        return {
          team,
          playerOut: worstPerformer.id,
          playerIn: bestReplacement.id,
        };
      }
    }

    // No substitution needed
    return null;
  }
}

export const substitutionSystem = new SubstitutionSystem();
