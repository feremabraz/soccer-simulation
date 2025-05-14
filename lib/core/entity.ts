import type { Vector2D } from "../utils/types"

// Base entity class
export abstract class Entity {
  position: Vector2D

  constructor(position: Vector2D) {
    this.position = { ...position }
  }

  moveTo(target: Vector2D, speed: number): void {
    const dx = target.x - this.position.x
    const dy = target.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0.5) {
      const moveX = (dx / distance) * speed
      const moveY = (dy / distance) * speed
      this.position.x += moveX
      this.position.y += moveY
    }
  }

  distanceTo(other: Entity): number {
    const dx = this.position.x - other.position.x
    const dy = this.position.y - other.position.y
    return Math.sqrt(dx * dx + dy * dy)
  }
}
