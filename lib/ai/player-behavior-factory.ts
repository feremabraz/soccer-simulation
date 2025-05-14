/**
 * Factory for creating player behavior trees
 */

import { 
  SelectorNode,
  SequenceNode,
  type BehaviorNode
} from "./behavior-tree"

import {
  HasBallCondition,
  TeamHasBallCondition,
  IsInShootingRangeCondition,
  IsUnderPressureCondition,
  ShootAction,
  PassAction,
  DribbleAction,
  SupportNearAction,
  MakeRunAction,
  MaintainFormationAction,
  ChaseBallAction,
  MaintainDefensivePositionAction,
  PressBallAction,
  MarkPlayerAction
} from "./player-behaviors"

// Create behavior trees for different player roles
export function createFieldPlayerBehaviorTree(): BehaviorNode {
  return new SelectorNode([
    // With ball behavior
    new SequenceNode([
      new HasBallCondition(),
      new SelectorNode([
        // Shoot if in range
        new SequenceNode([new IsInShootingRangeCondition(), new ShootAction()]),
        // Pass if under pressure
        new SequenceNode([new IsUnderPressureCondition(), new PassAction()]),
        // Otherwise dribble
        new DribbleAction(),
      ]),
    ]),

    // Offensive support behavior (team has ball)
    new SequenceNode([
      new TeamHasBallCondition(),
      new SelectorNode([
        // Make attacking runs
        new MakeRunAction(),
        // Support current attack
        new SupportNearAction(),
        // Maintain formation
        new MaintainFormationAction(),
      ]),
    ]),

    // Defensive behavior
    new SelectorNode([
      // Chase ball if close
      new ChaseBallAction(),
      // Mark a player
      new MarkPlayerAction(),
      // Press ball possessor
      new PressBallAction(),
      // Maintain defensive position
      new MaintainDefensivePositionAction(),
    ]),
  ])
}

export function createGoalkeeperBehaviorTree(): BehaviorNode {
  return new SelectorNode([
    // With ball behavior
    new SequenceNode([
      new HasBallCondition(),
      new PassAction() // Goalkeepers always pass when they have the ball
    ]),

    // Default: maintain position
    new MaintainDefensivePositionAction()
  ])
}
