import type { TeamTacticalState } from '../ai/team-behaviors';
import type {
  EventType,
  GameEvent,
  GameState,
  IMatchState,
  MatchStats,
  PlayerId,
  TeamId,
  TeamSide,
  Vector2D,
} from '../utils/types';

/**
 * Manages the state of a football match
 * Implements the MatchState interface from utils/types.ts
 */
export class MatchState implements IMatchState {
  // Game state
  gameState: GameState = 'idle';
  gameSpeed = 1;
  gameTime = 0;
  half: 1 | 2 | 3 | 4 = 1; // 3 and 4 for extra time
  score: { home: number; away: number } = { home: 0, away: 0 };
  possession: TeamSide = 'home';
  possessionStats: { home: number; away: number } = { home: 50, away: 50 };
  lastTouchTeam: TeamSide = 'home';
  gameEvents: GameEvent[] = [];

  // Match rules state
  offsideLine: { home: number; away: number } = { home: 0, away: 0 };
  setpiece: { type: EventType | null; team: TeamSide | null; position: Vector2D | null } = {
    type: null,
    team: null,
    position: null,
  };
  cards: { yellow: PlayerId[]; red: PlayerId[] } = { yellow: [], red: [] };
  substitutionsLeft: { home: number; away: number } = { home: 3, away: 3 };
  injuries: PlayerId[] = [];

  // Match stats
  stats: MatchStats = {
    possession: { home: 0, away: 0 },
    shots: { home: 0, away: 0 },
    shotsOnTarget: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    yellowCards: { home: 0, away: 0 },
    redCards: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    passes: { home: 0, away: 0 },
    passAccuracy: { home: 0, away: 0 },
  };

  // Stoppage time
  stoppageTime = 0;
  stoppageTimeAdded = 0;

  // Team tactical states - stores team behavior information
  tacticalState = new Map<TeamId, TeamTacticalState>();

  reset(): void {
    // Reset game state
    this.gameState = 'idle';
    this.gameTime = 0;
    this.half = 1;
    this.score = { home: 0, away: 0 };
    this.possession = 'home';
    this.lastTouchTeam = 'home';
    this.gameEvents = [];
    this.offsideLine = { home: 0, away: 0 };
    this.setpiece = { type: null, team: null, position: null };
    this.cards = { yellow: [], red: [] };
    this.substitutionsLeft = { home: 3, away: 3 };
    this.injuries = [];
    this.stoppageTime = 0;
    this.stoppageTimeAdded = 0;
    this.tacticalState = new Map<TeamId, TeamTacticalState>();

    // Reset stats
    this.stats = {
      possession: { home: 0, away: 0 },
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
      offsides: { home: 0, away: 0 },
      passes: { home: 0, away: 0 },
      passAccuracy: { home: 0, away: 0 },
    };
  }

  addEvent(event: GameEvent): void {
    this.gameEvents.push(event);

    // Update stats based on event
    switch (event.type) {
      case 'goal':
        if (event.teamId === 'home') {
          this.score.home++;
        } else if (event.teamId === 'away') {
          this.score.away++;
        }
        break;
      case 'shot':
        if (event.teamId === 'home') {
          this.stats.shots.home++;
        } else if (event.teamId === 'away') {
          this.stats.shots.away++;
        }
        break;
      case 'corner':
        if (event.teamId === 'home') {
          this.stats.corners.home++;
        } else if (event.teamId === 'away') {
          this.stats.corners.away++;
        }
        break;
      case 'foul':
        if (event.teamId === 'home') {
          this.stats.fouls.home++;
        } else if (event.teamId === 'away') {
          this.stats.fouls.away++;
        }
        break;
      case 'yellowcard':
        if (event.player1Id !== undefined) {
          this.cards.yellow.push(event.player1Id);
          if (event.teamId === 'home') {
            this.stats.yellowCards.home++;
          } else if (event.teamId === 'away') {
            this.stats.yellowCards.away++;
          }
        }
        break;
      case 'redcard':
        if (event.player1Id !== undefined) {
          this.cards.red.push(event.player1Id);
          if (event.teamId === 'home') {
            this.stats.redCards.home++;
          } else if (event.teamId === 'away') {
            this.stats.redCards.away++;
          }
        }
        break;
      case 'offside':
        if (event.teamId === 'home') {
          this.stats.offsides.home++;
        } else if (event.teamId === 'away') {
          this.stats.offsides.away++;
        }
        break;
    }
  }

  updatePossessionStats(currentPossessionTeam: TeamSide, deltaTime: number): void {
    const totalTime = this.gameTime;
    if (totalTime > 0) {
      // Update possession stats
      if (currentPossessionTeam === 'home') {
        this.stats.possession.home += deltaTime;
      } else {
        this.stats.possession.away += deltaTime;
      }

      // Calculate percentages
      const totalPossessionTime = this.stats.possession.home + this.stats.possession.away;
      this.possessionStats = {
        home: Math.round((this.stats.possession.home / totalPossessionTime) * 100),
        away: Math.round((this.stats.possession.away / totalPossessionTime) * 100),
      };
    }
  }

  isExtraTime(): boolean {
    return this.half === 3 || this.half === 4;
  }

  isTimeForHalfEnd(): boolean {
    const halfDuration = 45;
    const currentHalfTime = this.gameTime % halfDuration;

    if (this.half === 1 || this.half === 3) {
      // End of 1st or extra time 1st half
      return currentHalfTime >= halfDuration && this.stoppageTime >= this.stoppageTimeAdded;
    }

    if (this.half === 2 || this.half === 4) {
      // End of 2nd or extra time 2nd half
      return currentHalfTime >= halfDuration && this.stoppageTime >= this.stoppageTimeAdded;
    }

    return false;
  }

  advanceToNextHalf(): void {
    if (this.half < 4) {
      this.half += 1;
      this.stoppageTime = 0;
      this.stoppageTimeAdded = 0;
      this.setpiece = {
        type: 'kickoff',
        team: this.half === 2 ? 'away' : 'home',
        position: { x: 50, y: 50 },
      };
    }
  }
}
