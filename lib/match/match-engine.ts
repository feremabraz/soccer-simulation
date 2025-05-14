import type { TeamData, GameEvent, TeamSide, Vector2D, MatchStats, PlayerId, EventType } from "../utils/types"
import { PlayerEntity } from "../core/player"
import { BallEntity } from "../core/ball"
import { TeamEntity } from "../core/team"
import { MatchRules } from "../rules/match-rules"
import { OffsideRule } from "../rules/offside-rule"
import { FormationSystem } from "../tactics/formation-system"
import { SubstitutionSystem } from "../tactics/substitution-system"
import { MatchState } from "./match-state"

/**
 * Core match simulation engine
 */
export class MatchEngine {
  // State
  private matchState = new MatchState()

  // Teams
  homeTeam: TeamEntity
  awayTeam: TeamEntity

  // Entities
  players: PlayerEntity[] = []
  ball: BallEntity

  // Systems
  private matchRules = new MatchRules()
  private offsideRule = new OffsideRule()
  private formationSystem = new FormationSystem()
  private substitutionSystem = new SubstitutionSystem()

  // Game loop
  private intervalId: NodeJS.Timeout | null = null
  private lastUpdateTime = 0

  constructor() {
    // Initialize with default values
    this.homeTeam = new TeamEntity("", "", "", "", "4-4-2", {
      style: "possession",
      defensiveStyle: "midblock",
      pressingIntensity: 5,
      defensiveLineHeight: 5,
      width: 5,
      tempo: 5,
      passingStyle: "mixed",
    })
    this.awayTeam = new TeamEntity("", "", "", "", "4-4-2", {
      style: "counter",
      defensiveStyle: "lowblock",
      pressingIntensity: 5,
      defensiveLineHeight: 3,
      width: 5,
      tempo: 7,
      passingStyle: "short",
    })
    this.ball = new BallEntity({ x: 50, y: 50 })
  }

  initialize(homeTeamData: TeamData, awayTeamData: TeamData): void {
    // Create teams
    this.homeTeam = new TeamEntity(
      homeTeamData.id,
      homeTeamData.name,
      homeTeamData.color,
      homeTeamData.secondaryColor,
      homeTeamData.formation,
      homeTeamData.tactics,
    )

    this.awayTeam = new TeamEntity(
      awayTeamData.id,
      awayTeamData.name,
      awayTeamData.color,
      awayTeamData.secondaryColor,
      awayTeamData.formation,
      awayTeamData.tactics,
    )

    // Create players
    this.players = []

    // Home team players
    homeTeamData.players.forEach((playerData) => {
      const player = new PlayerEntity(
        playerData.id,
        playerData.name,
        "home",
        playerData.position,
        playerData.role,
        playerData.attributes,
        playerData.number,
      )
      this.homeTeam.addPlayer(player)
      this.players.push(player)
    })

    // Away team players
    awayTeamData.players.forEach((playerData) => {
      const player = new PlayerEntity(
        playerData.id,
        playerData.name,
        "away",
        playerData.position,
        playerData.role,
        playerData.attributes,
        playerData.number,
      )
      this.awayTeam.addPlayer(player)
      this.players.push(player)
    })

    // Initialize ball
    this.ball = new BallEntity({ x: 50, y: 50 })
    this.ball.lastTouchTeam = "home"

    // Setup team formations
    this.homeTeam.setupFormation(true)
    this.awayTeam.setupFormation(false)

    // Reset game state
    this.resetGame()
  }

  startGame(): void {
    if (this.matchState.gameState !== "playing") {
      // Check if we need to setup kickoff (at start or after halftime)
      const isHalftime = this.matchState.gameState === "halftime"
      const isKickoff = this.matchState.gameTime === 0
      
      // Set to playing state
      this.matchState.gameState = "playing"

      // Setup kickoff if needed
      if (isKickoff || isHalftime) {
        this.setupKickoff()
      }

      this.startGameLoop()
    }
  }

  pauseGame(): void {
    if (this.matchState.gameState === "playing") {
      this.matchState.gameState = "paused"
      this.stopGameLoop()
    }
  }

  resetGame(): void {
    // Stop any existing game loop
    this.stopGameLoop()
    
    // Reset match state
    this.matchState.reset()
    
    // Reset player positions
    this.homeTeam.resetPositions()
    this.awayTeam.resetPositions()
    
    // Reset ball
    this.ball.position = { x: 50, y: 50 }
    this.ball.lastTouchTeam = "home"
    this.ball.setPossessor(null)
  }
  
  private setupKickoff(): void {
    // Position the ball in the center
    this.ball.position = { x: 50, y: 50 }
    this.ball.setPossessor(null)
    
    // Set kickoff team based on half
    const kickoffTeam = this.matchState.half % 2 === 1 ? "home" : "away"
    
    // Create kickoff event
    const kickoffEvent: GameEvent = {
      type: "kickoff",
      time: this.matchState.gameTime,
      message: `${kickoffTeam === "home" ? this.homeTeam.name : this.awayTeam.name} kicks off${
        this.matchState.half > 1 ? ` the ${this.getHalfName(this.matchState.half)}` : ""
      }`,
      teamId: kickoffTeam,
    }
    
    this.matchState.addEvent(kickoffEvent)
    
    // Setup setpiece
    this.matchState.setpiece = {
      type: "kickoff",
      team: kickoffTeam,
      position: { x: 50, y: 50 },
    }

    // Reset player positions
    this.homeTeam.resetPositions()
    this.awayTeam.resetPositions()
  }
  
  private startGameLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    
    this.lastUpdateTime = Date.now()
    
    // Create game loop
    this.intervalId = setInterval(() => {
      if (this.matchState.gameState === "playing") {
        this.update()
      }
    }, 33) // ~30fps
  }
  
  private stopGameLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
  
  private update(): void {
    // Calculate delta time
    const now = Date.now()
    const deltaTime = (now - this.lastUpdateTime) / 1000 // Convert to seconds
    this.lastUpdateTime = now
    
    // Scale delta by game speed
    const scaledDelta = deltaTime * this.matchState.gameSpeed
    
    // Update match time
    if (this.matchState.gameState === "playing") {
      this.matchState.gameTime += scaledDelta * 2 // 1 real second = 2 game seconds
      
      // Update stoppage time if in added time
      const halfDuration = 45
      const halfTimeElapsed = this.matchState.gameTime % halfDuration
      if (halfTimeElapsed >= halfDuration) {
        this.matchState.stoppageTime += scaledDelta * 2
      }
      
      // Check if half/game should end
      if (this.matchState.isTimeForHalfEnd()) {
        this.handleHalfEnd()
      }
    }
    
    // Update entities
    this.updateEntities(scaledDelta)
    
    // Update match logic
    this.updateMatchLogic(scaledDelta)
    
    // Update offside line
    this.matchState.offsideLine = this.offsideRule.calculateOffsideLine(this.players)
  }
  
  private updateEntities(deltaTime: number): void {
    // Update ball
    this.ball.update(deltaTime)
    
    // Update players
    for (const player of this.players) {
      player.update(deltaTime, this.ball)
    }
  }
  
  private updateMatchLogic(deltaTime: number): void {
    // Handle set pieces
    if (this.matchState.setpiece.type) {
      // Implementation details would go here
      // For brevity, we're omitting complex setpiece handling
    }
    
    // Check if ball is out of bounds
    const ballOutCheck = this.matchRules.isBallOutOfBounds(this.ball)
    if (ballOutCheck.isOut) {
      // Handle out of bounds
      this.handleBallOut(ballOutCheck.type!, ballOutCheck.team!, ballOutCheck.position!)
    }
    
    // Check for goals
    const goalCheck = this.matchRules.isGoalScored(this.ball)
    if (goalCheck.isGoal) {
      this.handleGoal(goalCheck.team!)
    }
    
    // Update possession stats
    this.matchState.updatePossessionStats(
      this.ball.possessor ? this.ball.possessor.team : this.ball.lastTouchTeam, 
      deltaTime
    )
  }
  
  private handleHalfEnd(): void {
    if (this.matchState.half === 2) {
      // End of regular time
      this.matchState.gameState = "fulltime"
      
      const fulltimeEvent: GameEvent = {
        type: "fulltime",
        time: this.matchState.gameTime,
        message: `Full time! ${this.homeTeam.name} ${this.matchState.score.home} - ${this.matchState.score.away} ${this.awayTeam.name}`,
      }
      
      this.matchState.addEvent(fulltimeEvent)
      this.stopGameLoop()
    } else if (this.matchState.half === 4) {
      // End of extra time
      this.matchState.gameState = "fulltime"
      
      const fulltimeEvent: GameEvent = {
        type: "fulltime",
        time: this.matchState.gameTime,
        message: `End of extra time! ${this.homeTeam.name} ${this.matchState.score.home} - ${this.matchState.score.away} ${this.awayTeam.name}`,
      }
      
      this.matchState.addEvent(fulltimeEvent)
      this.stopGameLoop()
    } else {
      // Half time or end of first extra time period
      this.matchState.gameState = "halftime"
      
      const halftimeEvent: GameEvent = {
        type: "halftime",
        time: this.matchState.gameTime,
        message: `End of ${this.getHalfName(this.matchState.half)}! ${this.homeTeam.name} ${this.matchState.score.home} - ${this.matchState.score.away} ${this.awayTeam.name}`,
      }
      
      this.matchState.addEvent(halftimeEvent)
      this.matchState.advanceToNextHalf()
      this.setupKickoff()
    }
  }
  
  private handleBallOut(type: "corner" | "goalkick" | "throwin", team: "home" | "away", position: { x: number; y: number }): void {
    if (this.matchState.setpiece.type === type && 
        this.matchState.setpiece.team === team && 
        this.matchState.setpiece.position?.x === position.x && 
        this.matchState.setpiece.position?.y === position.y) {
      return // Already handling this setpiece
    }
    
    // Create event
    const event: GameEvent = {
      type,
      time: this.matchState.gameTime,
      message: `${type === "corner" ? "Corner" : type === "goalkick" ? "Goal kick" : "Throw-in"} for ${team === "home" ? this.homeTeam.name : this.awayTeam.name}`,
      teamId: team,
      position,
    }
    
    this.matchState.addEvent(event)
    
    // Update match state
    this.matchState.setpiece = {
      type,
      team,
      position,
    }
    
    // Update ball position
    this.ball.position = { ...position }
    this.ball.setPossessor(null)
    this.ball.velocity = { x: 0, y: 0 }
  }
  
  private handleGoal(team: "home" | "away"): void {
    // Create goal event
    const scorer = this.getRandomPlayerFromTeam(team, "FWD")
    const assister = this.getRandomPlayerFromTeam(team, "MID")
    
    const goalEvent: GameEvent = {
      type: "goal",
      time: this.matchState.gameTime,
      message: `GOAL! ${scorer.name} scores for ${team === "home" ? this.homeTeam.name : this.awayTeam.name}${
        assister ? ` assisted by ${assister.name}` : ""
      }!`,
      teamId: team,
      player1Id: scorer.id,
      player2Id: assister?.id,
    }
    
    this.matchState.addEvent(goalEvent)
    
    // Update score
    if (team === "home") {
      this.matchState.score.home++
    } else {
      this.matchState.score.away++
    }
    
    // Setup kickoff for the other team
    this.matchState.setpiece = {
      type: "kickoff",
      team: team === "home" ? "away" : "home",
      position: { x: 50, y: 50 },
    }
    
    // Reset player positions
    this.homeTeam.resetPositions()
    this.awayTeam.resetPositions()
    
    // Position the ball in the center
    this.ball.position = { x: 50, y: 50 }
    this.ball.setPossessor(null)
  }
  
  private getRandomPlayerFromTeam(team: "home" | "away", preferredRole?: "GK" | "DEF" | "MID" | "FWD"): PlayerEntity {
    const teamPlayers = this.players.filter(p => p.team === team && !p.redCard)
    
    if (preferredRole) {
      const rolePlayers = teamPlayers.filter(p => p.role === preferredRole)
      if (rolePlayers.length > 0) {
        return rolePlayers[Math.floor(Math.random() * rolePlayers.length)]
      }
    }
    
    // Fall back to any player
    return teamPlayers[Math.floor(Math.random() * teamPlayers.length)]
  }
  
  private getHalfName(half: number): string {
    switch (half) {
      case 1: return "first half"
      case 2: return "second half"
      case 3: return "first half of extra time"
      case 4: return "second half of extra time"
      default: return "half"
    }
  }
  
  // Public API for state access
  getGameState() {
    return {
      gameState: this.matchState.gameState,
      gameSpeed: this.matchState.gameSpeed,
      gameTime: this.matchState.gameTime,
      half: this.matchState.half,
      score: this.matchState.score,
      possession: this.matchState.possession,
      possessionStats: this.matchState.possessionStats,
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam,
      players: this.players,
      ball: this.ball,
      gameEvents: this.matchState.gameEvents,
      offsideLine: this.matchState.offsideLine,
      setpiece: this.matchState.setpiece,
      cards: this.matchState.cards,
      stats: this.matchState.stats,
      stoppageTimeAdded: this.matchState.stoppageTimeAdded,
    }
  }
  
  setGameSpeed(speed: number): void {
    this.matchState.gameSpeed = Math.max(0.1, Math.min(4, speed))
  }
}

// Singleton instance
export const matchEngine = new MatchEngine()
