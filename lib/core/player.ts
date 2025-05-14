import type { Vector2D, PlayerRole, TeamSide, PlayerId, PlayerAttributes } from "../utils/types"
import { Entity } from "./entity"
import type { BallEntity } from "./"

// Player entity
export class PlayerEntity extends Entity {
  id: PlayerId
  name: string
  team: TeamSide
  role: PlayerRole
  number: number
  targetPosition: Vector2D
  attributes: PlayerAttributes
  fatigue = 0
  hasBall = false
  isMarking: PlayerId | null = null
  isBeingMarkedBy: PlayerId | null = null
  state: "idle" | "moving" | "withBall" | "marking" | "supporting" | "defending" = "idle"
  yellowCard = false
  redCard = false
  injured = false

  // Behavior state
  lastAction: string | null = null
  decisionCooldown = 0

  constructor(
    id: PlayerId,
    name: string,
    team: TeamSide,
    position: Vector2D,
    role: PlayerRole,
    attributes: PlayerAttributes,
    number: number,
  ) {
    super(position)
    this.id = id
    this.name = name
    this.team = team
    this.role = role
    this.number = number
    this.targetPosition = { ...position }
    this.attributes = attributes
  }

  update(gameSpeed: number, ball: BallEntity): void {
    // Update fatigue
    this.fatigue += 0.001 * gameSpeed * (1 / this.attributes.stamina)
    if (this.fatigue > 1) this.fatigue = 1

    // Update position
    const effectiveSpeed = this.attributes.speed * (1 - this.fatigue * 0.3) * gameSpeed * 0.5
    this.moveTo(this.targetPosition, effectiveSpeed)

    // Update decision cooldown
    if (this.decisionCooldown > 0) {
      this.decisionCooldown -= gameSpeed
    }

    // Update state based on ball position
    if (ball.possessor === this) {
      this.state = "withBall"
      this.hasBall = true
    } else {
      this.hasBall = false

      // Update state based on team possession and role
      if (ball.possessor && ball.possessor.team === this.team) {
        this.state = "supporting"
      } else {
        this.state = "defending"
      }
    }
  }

  setTarget(target: Vector2D): void {
    this.targetPosition = {
      x: Math.max(5, Math.min(95, target.x)),
      y: Math.max(5, Math.min(95, target.y)),
    }
  }

  // Calculate the effective attribute value considering fatigue
  getEffectiveAttribute(attribute: keyof PlayerAttributes): number {
    const baseValue = this.attributes[attribute] as number
    return baseValue * (1 - this.fatigue * 0.5)
  }

  // Behavior tree root decision
  makeDecision(ball: BallEntity, teammates: PlayerEntity[], opponents: PlayerEntity[]): string {
    if (this.decisionCooldown > 0) return this.lastAction || "wait"

    // Set a cooldown to prevent constant decision changes
    this.decisionCooldown = 0.5

    if (this.hasBall) {
      return this.decideWithBall(ball, teammates, opponents)
    } else if (this.team === ball.lastTouchTeam) {
      return this.decideOffensiveSupport(ball, teammates, opponents)
    } else {
      return this.decideDefensiveAction(ball, teammates, opponents)
    }
  }

  private decideWithBall(ball: BallEntity, teammates: PlayerEntity[], opponents: PlayerEntity[]): string {
    // Find closest opponent
    const closestOpponent = this.findClosestEntity(opponents) as PlayerEntity
    const distanceToOpponent = closestOpponent ? this.distanceTo(closestOpponent) : 100

    // Check if in shooting range (closer to goal = better chance)
    const isInShootingRange = this.isInShootingRange()

    // Decision tree
    if (isInShootingRange && Math.random() < this.getEffectiveAttribute("shooting") * 0.7) {
      this.lastAction = "shoot"
      return "shoot"
    }

    if (distanceToOpponent < 10) {
      // Under pressure, decide between pass and dribble
      const passingChance = this.getEffectiveAttribute("passing") * 0.8
      const dribblingChance = this.getEffectiveAttribute("dribbling") * 0.6

      if (passingChance > dribblingChance) {
        const bestPassTarget = this.findBestPassTarget(teammates, opponents)
        if (bestPassTarget) {
          this.lastAction = "pass"
          return "pass"
        }
      }

      if (Math.random() < dribblingChance) {
        this.lastAction = "dribble"
        return "dribble"
      }
    }

    // Default: find a pass
    this.lastAction = "pass"
    return "pass"
  }

  private decideOffensiveSupport(ball: BallEntity, teammates: PlayerEntity[], opponents: PlayerEntity[]): string {
    // Find space to receive a pass
    const distanceToBall = this.distanceTo(ball)

    if (distanceToBall < 20) {
      // Close to the ball, provide support
      this.lastAction = "supportNear"
      return "supportNear"
    } else {
      // Further from ball, make a run or maintain formation
      if (Math.random() < this.getEffectiveAttribute("positioning") * 0.5) {
        this.lastAction = "makeRun"
        return "makeRun"
      } else {
        this.lastAction = "maintainFormation"
        return "maintainFormation"
      }
    }
  }

  private decideDefensiveAction(ball: BallEntity, teammates: PlayerEntity[], opponents: PlayerEntity[]): string {
    // Find ball possessor
    const ballPossessor = ball.possessor

    // No one has the ball, go for it
    if (!ballPossessor) {
      const distanceToBall = this.distanceTo(ball)
      if (distanceToBall < 15) {
        this.lastAction = "chaseBall"
        return "chaseBall"
      } else {
        this.lastAction = "maintainDefensivePosition"
        return "maintainDefensivePosition"
      }
    }

    // Someone from the other team has the ball
    const distanceToPossessor = this.distanceTo(ballPossessor)

    if (distanceToPossessor < 10) {
      // Close to possessor, press or tackle
      const tackleChance = this.getEffectiveAttribute("tackling") * 0.7
      if (Math.random() < tackleChance || distanceToPossessor < 5) {
        this.lastAction = "pressBall"
        return "pressBall"
      }
    }

    // Mark a nearby opponent
    const nearbyOpponent = this.findNearbyPlayerToMark(opponents)
    if (nearbyOpponent) {
      this.lastAction = "markPlayer"
      this.isMarking = nearbyOpponent.id
      return "markPlayer"
    }

    // Default: maintain defensive position
    this.lastAction = "maintainDefensivePosition"
    return "maintainDefensivePosition"
  }

  private isInShootingRange(): boolean {
    const isHome = this.team === "home"
    const goalX = isHome ? 90 : 10
    const distanceToGoal = Math.abs(this.position.x - goalX)
    const angleToGoal = Math.abs(this.position.y - 50)

    // Better chance if closer and more central
    return distanceToGoal < 25 && angleToGoal < 20
  }

  private findClosestEntity(entities: Entity[]): Entity | null {
    if (!entities.length) return null

    let closest = entities[0]
    let closestDistance = this.distanceTo(closest)

    for (let i = 1; i < entities.length; i++) {
      const distance = this.distanceTo(entities[i])
      if (distance < closestDistance) {
        closest = entities[i]
        closestDistance = distance
      }
    }

    return closest
  }

  private findBestPassTarget(teammates: PlayerEntity[], opponents: PlayerEntity[]): PlayerEntity | null {
    if (!teammates.length) return null

    let bestTarget: PlayerEntity | null = null
    let bestScore = -1

    for (const teammate of teammates) {
      if (teammate === this) continue

      const distanceToTeammate = this.distanceTo(teammate)
      if (distanceToTeammate > 30) continue // Too far

      // Check if pass is blocked
      let isBlocked = false
      for (const opponent of opponents) {
        const distanceToOpponent = this.distanceTo(opponent)
        if (distanceToOpponent > distanceToTeammate) continue // Opponent is further away

        const angleToTeammate = Math.atan2(teammate.position.y - this.position.y, teammate.position.x - this.position.x)
        const angleToOpponent = Math.atan2(opponent.position.y - this.position.y, opponent.position.x - this.position.x)

        if (Math.abs(angleToTeammate - angleToOpponent) < 0.3) {
          isBlocked = true
          break
        }
      }

      if (isBlocked) continue

      // Calculate pass score based on various factors
      const isGoalkeeper = teammate.role === "GK"
      const isForward = teammate.role === "FWD"
      const isAdvancing = this.team === "home" ? teammate.position.x > this.position.x : teammate.position.x < this.position.x

      let score = 10 - distanceToTeammate * 0.2 // Prefer closer teammates
      if (isGoalkeeper) score -= 5 // Avoid passing back to goalkeeper
      if (isForward) score += 2 // Prefer forwards
      if (isAdvancing) score += 3 // Prefer advancing the ball

      if (score > bestScore) {
        bestScore = score
        bestTarget = teammate
      }
    }

    return bestTarget
  }

  private findNearbyPlayerToMark(opponents: PlayerEntity[]): PlayerEntity | null {
    if (!opponents.length) return null

    const isDefender = this.role === "DEF"
    const maxMarkingDistance = isDefender ? 20 : 15

    let bestTarget: PlayerEntity | null = null
    let bestScore = -1

    for (const opponent of opponents) {
      const distance = this.distanceTo(opponent)
      if (distance > maxMarkingDistance) continue

      // Don't mark players already being marked
      if (opponent.isBeingMarkedBy !== null) continue

      // Calculate marking score
      let score = 10 - distance * 0.5 // Prefer closer opponents
      if (opponent.role === "FWD") score += 3 // Prioritize marking forwards
      if (opponent.hasBall) score += 5 // Prioritize marking ball possessor

      if (score > bestScore) {
        bestScore = score
        bestTarget = opponent
      }
    }

    // If target found, mark them
    if (bestTarget) {
      bestTarget.isBeingMarkedBy = this.id
    }

    return bestTarget
  }
}
