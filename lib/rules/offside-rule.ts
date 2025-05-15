import type { BallEntity } from '../core/ball';
import type { PlayerEntity } from '../core/player';
import type { TeamSide, Vector2D } from '../utils/types';

/**
 * Implementation of the offside rule in football
 */
export class OffsideRule {
  // Check if a player is in an offside position
  isPlayerOffside(
    player: PlayerEntity,
    _teammates: PlayerEntity[],
    opponents: PlayerEntity[],
    ball: BallEntity
  ): boolean {
    if (player.role === 'GK') return false; // Goalkeepers can't be offside

    const isHome = player.team === 'home';
    const _direction = isHome ? 1 : -1; // Direction of attack

    // Calculate offside line based on second-last defender
    const defendersPositionsX = opponents
      .filter((p) => p.role === 'DEF' || p.role === 'GK')
      .map((p) => p.position.x)
      .sort((a, b) => (isHome ? a - b : b - a));

    // Need at least two defenders for offside
    if (defendersPositionsX.length < 2) return false;

    // Second last defender's position defines the offside line
    const offsideLine = defendersPositionsX[1];

    // Player is in offside position if ahead of offside line in attacking direction
    const isAheadOfOffsideLine = isHome
      ? player.position.x > offsideLine
      : player.position.x < offsideLine;

    // Player is only offside if ahead of the ball as well
    const isAheadOfBall = isHome
      ? player.position.x > ball.position.x
      : player.position.x < ball.position.x;

    return isAheadOfOffsideLine && isAheadOfBall;
  }

  // Calculate the current offside line for visualization
  calculateOffsideLine(players: PlayerEntity[]): { home: number; away: number } {
    const homePlayers = players.filter((p) => p.team === 'home');
    const awayPlayers = players.filter((p) => p.team === 'away');

    // Get the second-last defender for each team
    const homeDefendersPositionsX = awayPlayers
      .filter((p) => p.role === 'DEF' || p.role === 'GK')
      .map((p) => p.position.x)
      .sort((a, b) => a - b);

    const awayDefendersPositionsX = homePlayers
      .filter((p) => p.role === 'DEF' || p.role === 'GK')
      .map((p) => p.position.x)
      .sort((a, b) => b - a);

    // Default to sensible values if not enough players
    const homeLine = homeDefendersPositionsX.length >= 2 ? homeDefendersPositionsX[1] : 40;

    const awayLine = awayDefendersPositionsX.length >= 2 ? awayDefendersPositionsX[1] : 60;

    return { home: homeLine, away: awayLine };
  }
}
