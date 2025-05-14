import type { Vector2D, TeamSide } from "../utils/types"
import { Entity } from "./entity"
import type { PlayerEntity } from "./player"

// Ball entity
export class BallEntity extends Entity {
  possessor: PlayerEntity | null = null
  lastTouchTeam: TeamSide = "home"
  velocity: Vector2D = { x: 0, y: 0 }
  inAir = false
  height = 0

  constructor(position: Vector2D) {
    super(position)
  }

  update(gameSpeed: number): void {
    if (this.possessor) {
      // Ball follows possessor
      this.position = { ...this.possessor.position }
    } else {
      // Ball moves according to physics
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
        // Apply velocity to position
        this.position.x += this.velocity.x * gameSpeed
        this.position.y += this.velocity.y * gameSpeed

        // Apply friction
        const frictionFactor = this.inAir ? 0.98 : 0.9
        this.velocity.x *= frictionFactor
        this.velocity.y *= frictionFactor

        // Stop if velocity is very small
        if (Math.abs(this.velocity.x) < 0.01 && Math.abs(this.velocity.y) < 0.01) {
          this.velocity.x = 0
          this.velocity.y = 0
        }

        // Update height if in air
        if (this.inAir) {
          this.height -= 0.2 * gameSpeed
          if (this.height <= 0) {
            this.height = 0
            this.inAir = false
          }
        }

        // Keep ball in bounds
        this.keepInBounds()
      }
    }
  }

  setPossessor(player: PlayerEntity | null): void {
    if (player) {
      this.possessor = player
      this.lastTouchTeam = player.team
      this.velocity = { x: 0, y: 0 }
      this.inAir = false
      this.height = 0
    } else {
      this.possessor = null
    }
  }

  kick(direction: Vector2D, power: number, isLofted = false): void {
    this.possessor = null
    this.velocity = {
      x: direction.x * power * 0.2,
      y: direction.y * power * 0.2,
    }

    if (isLofted) {
      this.inAir = true
      this.height = 2 + power * 0.3
    }
  }

  keepInBounds(): void {
    // X-axis boundaries (pitch length)
    if (this.position.x < 0) {
      this.position.x = 0
      this.velocity.x = -this.velocity.x * 0.5 // Bounce with reduced velocity
    } else if (this.position.x > 100) {
      this.position.x = 100
      this.velocity.x = -this.velocity.x * 0.5
    }

    // Y-axis boundaries (pitch width)
    if (this.position.y < 0) {
      this.position.y = 0
      this.velocity.y = -this.velocity.y * 0.5
    } else if (this.position.y > 100) {
      this.position.y = 100
      this.velocity.y = -this.velocity.y * 0.5
    }
  }
}
