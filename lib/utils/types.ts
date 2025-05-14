export type TeamId = string
export type PlayerId = number
export type PlayerRole = "GK" | "DEF" | "MID" | "FWD"
export type TeamSide = "home" | "away"
export type GameState = "idle" | "playing" | "paused" | "halftime" | "fulltime" | "extratime"
export type EventType =
  | "pass"
  | "shot"
  | "goal"
  | "save"
  | "tackle"
  | "foul"
  | "offside"
  | "corner"
  | "throwin"
  | "goalkick"
  | "freekick"
  | "penalty"
  | "yellowcard"
  | "redcard"
  | "substitution"
  | "kickoff"
  | "halftime"
  | "fulltime"

export type FormationType = "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "5-3-2" | "4-5-1"
export type TacticStyle = "possession" | "counter" | "direct" | "wing" | "pressing"
export type DefensiveStyle = "highpress" | "midblock" | "lowblock" | "manmarking" | "zonalmarking"

export interface Vector2D {
  x: number
  y: number
}

export interface PlayerAttributes {
  // Technical
  passing: number
  shooting: number
  dribbling: number
  tackling: number
  heading: number

  // Physical
  speed: number
  stamina: number
  strength: number
  agility: number

  // Mental
  vision: number
  positioning: number
  decisions: number
  aggression: number

  // Role-specific
  goalkeeping?: number
}

export interface PlayerData {
  id: PlayerId
  name: string
  position: Vector2D
  role: PlayerRole
  attributes: PlayerAttributes
  number: number
}

export interface TeamData {
  id: TeamId
  name: string
  color: string
  secondaryColor: string
  players: PlayerData[]
  formation: FormationType
  tactics: {
    style: TacticStyle
    defensiveStyle: DefensiveStyle
    pressingIntensity: number
    defensiveLineHeight: number
    width: number
    tempo: number
    passingStyle: "short" | "mixed" | "long"
  }
}

export interface GameEvent {
  type: EventType
  time: number
  message: string
  player1Id?: PlayerId
  player2Id?: PlayerId
  teamId?: TeamId
  position?: Vector2D
}

export interface IMatchState {
  gameState: GameState
  gameSpeed: number
  gameTime: number
  half: 1 | 2 | 3 | 4 // 3 and 4 for extra time
  score: {
    home: number
    away: number
  }
  possession: TeamSide
  lastTouchTeam: TeamSide
  offsideLine: {
    home: number
    away: number
  }
  setpiece: {
    type: EventType | null
    team: TeamSide | null
    position: Vector2D | null
  }
  cards: {
    yellow: PlayerId[]
    red: PlayerId[]
  }
  substitutionsLeft: {
    home: number
    away: number
  }
  injuries: PlayerId[]
  stoppageTime: number
  stoppageTimeAdded: number
}

export interface MatchStats {
  possession: {
    home: number
    away: number
  }
  shots: {
    home: number
    away: number
  }
  shotsOnTarget: {
    home: number
    away: number
  }
  corners: {
    home: number
    away: number
  }
  fouls: {
    home: number
    away: number
  }
  yellowCards: {
    home: number
    away: number
  }
  redCards: {
    home: number
    away: number
  }
  offsides: {
    home: number
    away: number
  }
  passes: {
    home: number
    away: number
  }
  passAccuracy: {
    home: number
    away: number
  }
}
