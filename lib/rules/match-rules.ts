import type { Vector2D, EventType, TeamSide } from "../utils/types"
import type { PlayerEntity } from "../core/player"
import type { BallEntity } from "../core/ball"

/**
 * Implementation of core football match rules
 */
export class MatchRules {
  // Check if the ball is out of bounds
  isBallOutOfBounds(ball: BallEntity): {
    isOut: boolean;
    type: "corner" | "goalkick" | "throwin" | null;
    team: TeamSide | null;
    position: Vector2D | null;
  } {
    const pos = ball.position
    
    // Check if ball is out on the sides (throw-in)
    if (pos.y <= 0 || pos.y >= 100) {
      return {
        isOut: true,
        type: "throwin",
        team: ball.lastTouchTeam === "home" ? "away" : "home", // Opposite team gets the throw
        position: { x: pos.x, y: pos.y <= 0 ? 0 : 100 }
      }
    }
    
    // Check if ball is out on home goal line
    if (pos.x <= 0) {
      // Check if it's a corner or goal kick
      if (ball.lastTouchTeam === "home") {
        // Corner for away team
        return {
          isOut: true,
          type: "corner",
          team: "away",
          position: { x: 0, y: pos.y < 50 ? 0 : 100 }
        }
      } else {
        // Goal kick for home team
        return {
          isOut: true,
          type: "goalkick",
          team: "home",
          position: { x: 5, y: 50 }
        }
      }
    }
    
    // Check if ball is out on away goal line
    if (pos.x >= 100) {
      // Check if it's a corner or goal kick
      if (ball.lastTouchTeam === "away") {
        // Corner for home team
        return {
          isOut: true,
          type: "corner",
          team: "home",
          position: { x: 100, y: pos.y < 50 ? 0 : 100 }
        }
      } else {
        // Goal kick for away team
        return {
          isOut: true,
          type: "goalkick",
          team: "away",
          position: { x: 95, y: 50 }
        }
      }
    }
    
    // Ball is in bounds
    return {
      isOut: false,
      type: null,
      team: null,
      position: null
    }
  }
  
  // Check if a goal is scored
  isGoalScored(ball: BallEntity): { isGoal: boolean; team: TeamSide | null } {
    const pos = ball.position
    
    // Goal dimensions
    const goalWidth = 15
    const goalCenterY = 50
    const goalHalfWidth = goalWidth / 2
    
    // Check for home team goal (away team scores)
    if (pos.x <= 0 && 
        pos.y >= goalCenterY - goalHalfWidth && 
        pos.y <= goalCenterY + goalHalfWidth) {
      return { isGoal: true, team: "away" }
    }
    
    // Check for away team goal (home team scores)
    if (pos.x >= 100 && 
        pos.y >= goalCenterY - goalHalfWidth && 
        pos.y <= goalCenterY + goalHalfWidth) {
      return { isGoal: true, team: "home" }
    }
    
    return { isGoal: false, team: null }
  }
  
  // Detect fouls based on player interactions
  detectFoul(
    tacklingPlayer: PlayerEntity, 
    tackledPlayer: PlayerEntity, 
    ball: BallEntity
  ): { isFoul: boolean; isPenalty: boolean; isYellowCard: boolean; isRedCard: boolean } {
    // Base foul probability is influenced by tackling player's tackling attribute and aggression
    const tacklingSkill = tacklingPlayer.getEffectiveAttribute("tackling")
    const aggression = tacklingPlayer.getEffectiveAttribute("aggression")
    
    // Calculate distance to ball - fouls more likely if far from ball
    const distanceToBall = tacklingPlayer.distanceTo(ball)
    
    // Base foul probability (higher aggression and lower tackling skill increases foul chance)
    let foulChance = 0.1 + (aggression / 10) - (tacklingSkill / 20) + (distanceToBall / 50)
    
    // Limit range
    foulChance = Math.max(0.05, Math.min(0.8, foulChance))
    
    // Random check for foul
    const isFoul = Math.random() < foulChance
    
    if (!isFoul) return { isFoul: false, isPenalty: false, isYellowCard: false, isRedCard: false }
    
    // Check if it's in the penalty area
    const isPenalty = this.isInPenaltyArea(tackledPlayer.position, tackledPlayer.team === "home" ? "away" : "home")
    
    // Calculate card probabilities
    // Red card more likely with high aggression, distance from ball, and from behind
    const isYellowCard = Math.random() < (0.3 + aggression / 20 + distanceToBall / 100)
    
    // Red card less common but possible
    const isRedCard = isYellowCard && Math.random() < (0.1 + aggression / 30)
    
    return {
      isFoul,
      isPenalty,
      isYellowCard: isYellowCard && !isRedCard, // Yellow only if not a red
      isRedCard
    }
  }
  
  // Check if a position is in the penalty area
  isInPenaltyArea(position: Vector2D, defendingTeam: TeamSide): boolean {
    const penaltyAreaDepth = 15
    const penaltyAreaWidth = 40
    const fieldCenterY = 50
    const halfPenaltyAreaWidth = penaltyAreaWidth / 2
    
    if (defendingTeam === "home") {
      // Home team penalty area (left side)
      return (
        position.x <= penaltyAreaDepth && 
        position.y >= fieldCenterY - halfPenaltyAreaWidth && 
        position.y <= fieldCenterY + halfPenaltyAreaWidth
      )
    } else {
      // Away team penalty area (right side)
      return (
        position.x >= 100 - penaltyAreaDepth && 
        position.y >= fieldCenterY - halfPenaltyAreaWidth && 
        position.y <= fieldCenterY + halfPenaltyAreaWidth
      )
    }
  }
  
  // Calculate appropriate stoppage time
  calculateStoppageTime(
    regularTime: number,
    events: { type: EventType; time: number }[]
  ): number {
    // Filter events from this half only
    const halfTime = regularTime > 45 ? 45 : 0
    const eventsInThisHalf = events.filter(e => e.time >= halfTime && e.time <= halfTime + 45)
    
    // Count time-consuming events
    let additionalTime = 0
    
    // Goals add time
    const goals = eventsInThisHalf.filter(e => e.type === "goal").length
    additionalTime += goals * 0.5
    
    // Substitutions add time
    const subs = eventsInThisHalf.filter(e => e.type === "substitution").length
    additionalTime += subs * 0.5
    
    // Cards add time
    const cards = eventsInThisHalf.filter(e => e.type === "yellowcard" || e.type === "redcard").length
    additionalTime += cards * 0.5
    
    // Injuries and other stoppages - based on overall randomization
    additionalTime += Math.random() * 2
    
    // Round to nearest integer and ensure minimum is at least 1 minute
    return Math.max(1, Math.round(additionalTime))
  }
}
