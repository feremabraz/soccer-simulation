/**
 * Player Behavior nodes for the behavior tree
 */

import type { BehaviorNode, BehaviorContext } from "./behavior-tree"
import type { PlayerEntity } from "../core/player"

// Condition nodes
export class HasBallCondition implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    return player.hasBall ? "success" : "failure"
  }
}

export class TeamHasBallCondition implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    return context.ball.possessor && context.ball.possessor.team === player.team ? "success" : "failure"
  }
}

export class IsInShootingRangeCondition implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    const isHome = player.team === "home"
    const goalX = isHome ? 90 : 10
    const distanceToGoal = Math.abs(player.position.x - goalX)
    const angleToGoal = Math.abs(player.position.y - 50)

    // Better chance if closer and more central
    return distanceToGoal < 25 && angleToGoal < 20 ? "success" : "failure"
  }
}

export class IsUnderPressureCondition implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    // Find closest opponent
    let closestDistance = Number.MAX_VALUE
    for (const opponent of context.opponents) {
      const distance = player.distanceTo(opponent)
      if (distance < closestDistance) {
        closestDistance = distance
      }
    }

    return closestDistance < 10 ? "success" : "failure"
  }
}

// Action nodes
export class ShootAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "shoot"
    return "success"
  }
}

export class PassAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "pass"
    return "success"
  }
}

export class DribbleAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "dribble"
    return "success"
  }
}

export class SupportNearAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "supportNear"
    return "success"
  }
}

export class MakeRunAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "makeRun"
    return "success"
  }
}

export class MaintainFormationAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "maintainFormation"
    return "success"
  }
}

export class ChaseBallAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "chaseBall"
    return "success"
  }
}

export class MaintainDefensivePositionAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "maintainDefensivePosition"
    return "success"
  }
}

export class PressBallAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "pressBall"
    return "success"
  }
}

export class MarkPlayerAction implements BehaviorNode {
  execute(player: PlayerEntity, context: BehaviorContext): NodeResult {
    player.lastAction = "markPlayer"
    return "success"
  }
}

// Import type for NodeResult
import type { NodeResult } from "./behavior-tree"
