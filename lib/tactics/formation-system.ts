import type { BallEntity } from '@/lib/core/ball';
import type { PlayerEntity } from '@/lib/core/player';
import type { TeamEntity } from '@/lib/core/team';
import type { FormationType, Vector2D } from '@/lib/utils/types';

export class FormationSystem {
  // Formation parameters that can be adjusted through team tactics
  private formationParams = {
    defensiveLineHeight: 5, // 1-10 scale, higher = more advanced defensive line
    width: 5, // 1-10 scale, higher = wider formation
    compactness: 5, // 1-10 scale, higher = more vertically compact
    tempo: 5, // 1-10 scale, higher = faster play
  };

  /**
   * Update formation parameters based on team tactical settings
   */
  updateFormationParameters(params: {
    defensiveLineHeight?: number;
    width?: number;
    compactness?: number;
    tempo?: number;
  }): void {
    // Update any provided parameters
    if (params.defensiveLineHeight !== undefined) {
      this.formationParams.defensiveLineHeight = params.defensiveLineHeight;
    }

    if (params.width !== undefined) {
      this.formationParams.width = params.width;
    }

    if (params.compactness !== undefined) {
      this.formationParams.compactness = params.compactness;
    }

    if (params.tempo !== undefined) {
      this.formationParams.tempo = params.tempo;
    }
  }

  /**
   * Update a player's position based on formation, tactics, and game context
   */
  updatePlayerPosition(
    player: PlayerEntity,
    team: TeamEntity,
    ball: BallEntity,
    _deltaTime: number // Kept for API compatibility with Match Engine
  ): void {
    // Get base formation position for the player
    const basePosition = team.formationPositions[player.id];
    if (!basePosition) return;

    // Get team's side (home or away)
    const isHome = player.team === 'home';

    // Adjust position based on ball position and formation parameters
    const adjustedPosition = this.calculateAdjustedPosition(
      basePosition,
      ball.position,
      player,
      isHome
    );

    // Set player's target position
    player.setTarget(adjustedPosition);
  }

  /**
   * Calculate the adjusted position based on tactical context
   */
  private calculateAdjustedPosition(
    basePosition: Vector2D,
    ballPosition: Vector2D,
    player: PlayerEntity,
    isHome: boolean
  ): Vector2D {
    // Deep copy the base position to avoid modifying the original
    const position = { ...basePosition };

    // Shift defensive line based on defensiveLineHeight parameter
    // Higher value = more advanced defense
    const defensiveShift = (this.formationParams.defensiveLineHeight - 5) * 3;
    if (player.role === 'DEF' || player.role === 'MID') {
      position.x += isHome ? defensiveShift : -defensiveShift;
    }

    // Adjust width based on width parameter
    // Higher value = wider position (further from center)
    if (position.y < 50) {
      // Player on left side of field
      position.y -= (this.formationParams.width - 5) * 3;
    } else if (position.y > 50) {
      // Player on right side of field
      position.y += (this.formationParams.width - 5) * 3;
    }

    // Make teams compact vertically when defending
    const ballOnOurSide = (isHome && ballPosition.x < 50) || (!isHome && ballPosition.x > 50);
    if (ballOnOurSide) {
      // Pull players back when ball is on our side
      const compactnessFactor = this.formationParams.compactness * 0.2;
      position.x += isHome ? -compactnessFactor * 5 : compactnessFactor * 5;
    }

    // Attract players to the ball horizontally (ball-side overload)
    const ballSideAttraction = Math.min(15, Math.abs(ballPosition.y - 50) * 0.3);
    if ((ballPosition.y < 50 && position.y < 50) || (ballPosition.y > 50 && position.y > 50)) {
      // Player is on the same side of the field as the ball
      position.y += (ballPosition.y > 50 ? 1 : -1) * ballSideAttraction;
    }

    // Ensure players stay within pitch boundaries
    position.x = Math.max(10, Math.min(90, position.x));
    position.y = Math.max(10, Math.min(90, position.y));

    return position;
  }

  changeFormation(team: TeamEntity, newFormation: FormationType, isHome: boolean): void {
    team.changeFormation(newFormation, isHome);
  }

  suggestFormationChange(
    team: TeamEntity,
    isHome: boolean,
    score: { home: number; away: number },
    gameTime: number
  ): FormationType | null {
    const isWinning = (isHome && score.home > score.away) || (!isHome && score.away > score.home);
    const isLosing = (isHome && score.home < score.away) || (!isHome && score.away < score.home);
    const scoreDifference = Math.abs(score.home - score.away);
    const isLateGame = gameTime > 70; // After 70 minutes

    const currentFormation = team.formation;

    // Don't change formation too often
    if (Math.random() > 0.2) return null;

    // Losing by 2+ goals late in the game - go attacking
    if (isLosing && scoreDifference >= 2 && isLateGame) {
      if (currentFormation !== '4-3-3' && currentFormation !== '3-5-2') {
        return Math.random() > 0.5 ? '4-3-3' : '3-5-2';
      }
    }

    // Winning late in the game - go defensive
    if (isWinning && isLateGame) {
      if (currentFormation !== '5-3-2' && currentFormation !== '4-5-1') {
        return '5-3-2';
      }
    }

    // Tied late in the game - balanced approach
    if (!isWinning && !isLosing && isLateGame) {
      if (currentFormation !== '4-4-2' && currentFormation !== '4-2-3-1') {
        return '4-2-3-1';
      }
    }

    return null;
  }

  // Get formation visualization data
  getFormationVisualization(formation: FormationType): { x: number; y: number; role: string }[] {
    const positions: { x: number; y: number; role: string }[] = [];

    // Add goalkeeper
    positions.push({ x: 10, y: 50, role: 'GK' });

    switch (formation) {
      case '4-4-2':
        // Defenders
        positions.push({ x: 20, y: 20, role: 'DEF' });
        positions.push({ x: 20, y: 40, role: 'DEF' });
        positions.push({ x: 20, y: 60, role: 'DEF' });
        positions.push({ x: 20, y: 80, role: 'DEF' });

        // Midfielders
        positions.push({ x: 40, y: 20, role: 'MID' });
        positions.push({ x: 40, y: 40, role: 'MID' });
        positions.push({ x: 40, y: 60, role: 'MID' });
        positions.push({ x: 40, y: 80, role: 'MID' });

        // Forwards
        positions.push({ x: 60, y: 35, role: 'FWD' });
        positions.push({ x: 60, y: 65, role: 'FWD' });
        break;

      case '4-3-3':
        // Defenders
        positions.push({ x: 20, y: 20, role: 'DEF' });
        positions.push({ x: 20, y: 40, role: 'DEF' });
        positions.push({ x: 20, y: 60, role: 'DEF' });
        positions.push({ x: 20, y: 80, role: 'DEF' });

        // Midfielders
        positions.push({ x: 40, y: 30, role: 'MID' });
        positions.push({ x: 40, y: 50, role: 'MID' });
        positions.push({ x: 40, y: 70, role: 'MID' });

        // Forwards
        positions.push({ x: 60, y: 25, role: 'FWD' });
        positions.push({ x: 60, y: 50, role: 'FWD' });
        positions.push({ x: 60, y: 75, role: 'FWD' });
        break;

      case '4-2-3-1':
        // Defenders
        positions.push({ x: 20, y: 20, role: 'DEF' });
        positions.push({ x: 20, y: 40, role: 'DEF' });
        positions.push({ x: 20, y: 60, role: 'DEF' });
        positions.push({ x: 20, y: 80, role: 'DEF' });

        // Defensive Midfielders
        positions.push({ x: 35, y: 35, role: 'MID' });
        positions.push({ x: 35, y: 65, role: 'MID' });

        // Attacking Midfielders
        positions.push({ x: 50, y: 25, role: 'MID' });
        positions.push({ x: 50, y: 50, role: 'MID' });
        positions.push({ x: 50, y: 75, role: 'MID' });

        // Forward
        positions.push({ x: 65, y: 50, role: 'FWD' });
        break;

      case '3-5-2':
        // Defenders
        positions.push({ x: 20, y: 30, role: 'DEF' });
        positions.push({ x: 20, y: 50, role: 'DEF' });
        positions.push({ x: 20, y: 70, role: 'DEF' });

        // Midfielders
        positions.push({ x: 35, y: 15, role: 'MID' }); // Wing back
        positions.push({ x: 40, y: 30, role: 'MID' });
        positions.push({ x: 40, y: 50, role: 'MID' });
        positions.push({ x: 40, y: 70, role: 'MID' });
        positions.push({ x: 35, y: 85, role: 'MID' }); // Wing back

        // Forwards
        positions.push({ x: 60, y: 35, role: 'FWD' });
        positions.push({ x: 60, y: 65, role: 'FWD' });
        break;

      case '5-3-2':
        // Defenders
        positions.push({ x: 20, y: 20, role: 'DEF' });
        positions.push({ x: 20, y: 35, role: 'DEF' });
        positions.push({ x: 20, y: 50, role: 'DEF' });
        positions.push({ x: 20, y: 65, role: 'DEF' });
        positions.push({ x: 20, y: 80, role: 'DEF' });

        // Midfielders
        positions.push({ x: 40, y: 30, role: 'MID' });
        positions.push({ x: 40, y: 50, role: 'MID' });
        positions.push({ x: 40, y: 70, role: 'MID' });

        // Forwards
        positions.push({ x: 60, y: 35, role: 'FWD' });
        positions.push({ x: 60, y: 65, role: 'FWD' });
        break;

      case '4-5-1':
        // Defenders
        positions.push({ x: 20, y: 20, role: 'DEF' });
        positions.push({ x: 20, y: 40, role: 'DEF' });
        positions.push({ x: 20, y: 60, role: 'DEF' });
        positions.push({ x: 20, y: 80, role: 'DEF' });

        // Midfielders
        positions.push({ x: 40, y: 15, role: 'MID' });
        positions.push({ x: 40, y: 30, role: 'MID' });
        positions.push({ x: 40, y: 50, role: 'MID' });
        positions.push({ x: 40, y: 70, role: 'MID' });
        positions.push({ x: 40, y: 85, role: 'MID' });

        // Forward
        positions.push({ x: 60, y: 50, role: 'FWD' });
        break;
    }

    return positions;
  }
}

export const formationSystem = new FormationSystem();
