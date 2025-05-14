/**
 * Behavior Tree implementation for player AI
 */

import type { PlayerEntity } from "../core/player"
import type { BallEntity } from "../core/ball"

// Node result types
export type NodeResult = "success" | "failure" | "running"

// Base node interface
export interface BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult
}

// Context for behavior tree execution
export interface BehaviorContext {
  ball: BallEntity
  teammates: PlayerEntity[]
  opponents: PlayerEntity[]
  deltaTime: number
}

// Composite nodes
export class SelectorNode implements BehaviorNode {
  constructor(private children: BehaviorNode[]) {}

  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    for (const child of this.children) {
      const result = child.execute(player, context)
      if (result !== "failure") {
        return result
      }
    }
    return "failure"
  }
}

export class SequenceNode implements BehaviorNode {
  constructor(private children: BehaviorNode[]) {}

  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    for (const child of this.children) {
      const result = child.execute(player, context)
      if (result !== "success") {
        return result
      }
    }
    return "success"
  }
}

// Decorator nodes
export class InverterNode implements BehaviorNode {
  constructor(private child: BehaviorNode) {}

  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    const result = this.child.execute(player, context)
    if (result === "success") return "failure"
    if (result === "failure") return "success"
    return result
  }
}

export class RepeatUntilFailureNode implements BehaviorNode {
  constructor(private child: BehaviorNode) {}

  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    const result = this.child.execute(player, context)
    if (result === "failure") return "failure"
    return "running"
  }
}
