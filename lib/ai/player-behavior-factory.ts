/**
 * Factory for creating player behavior trees
 * Simplified implementation that works with the behavior system
 */

import { type AtomBehaviorNode, type NodeResult, type BehaviorContext, createBehaviorTree } from './behavior-tree';
import { atom, type Getter } from 'jotai';
import type { PlayerEntity } from '@/lib/core/player';

// Import player behavior components
import {
  // Condition atoms
  hasBallConditionAtom,
  teamHasBallConditionAtom,
  isInShootingRangeConditionAtom,
  isUnderPressureConditionAtom,
  
  // Action atoms
  shootActionAtom,
  passActionAtom,
  dribbleActionAtom,
  supportNearActionAtom,
  makeRunActionAtom,
  maintainFormationActionAtom,
  chaseBallActionAtom,
  maintainDefensivePositionActionAtom,
  pressBallActionAtom,
  markPlayerActionAtom,
  
  // Types
  type BehaviorNodeAtom
} from './player-behaviors';

/**
 * An enum defining the different player behaviors
 * Makes it easier to track the active behavior
 */
export enum PlayerBehaviorType {
  // Offensive behaviors
  Shoot = 'shoot',
  Pass = 'pass',
  Dribble = 'dribble',
  MakeRun = 'make-run',
  SupportNear = 'support-near',
  MaintainFormation = 'maintain-formation',
  
  // Defensive behaviors
  ChaseBall = 'chase-ball',
  MarkPlayer = 'mark-player',
  PressBall = 'press-ball',
  MaintainDefensivePosition = 'maintain-defensive-position'
}

/**
 * Structure to track behavior state for players
 */
export interface PlayerBehaviorState {
  currentBehavior: PlayerBehaviorType | null;
  result: NodeResult;
}

/**
 * Helper function that creates a behavior result atom with additional state
 */
function createBehaviorStateAtom(): AtomBehaviorNode {
  // Create an atom with the default running state
  return atom<NodeResult>('running');
}

/**
 * Creates a behavior tracking atom for a player
 */
function createBehaviorTrackingAtom() {
  return atom<PlayerBehaviorState>({
    currentBehavior: null,
    result: 'running'
  });
}

/**
 * Helper function to evaluate a condition atom
 */
function evaluateCondition(
  conditionAtom: BehaviorNodeAtom,
  player: PlayerEntity,
  context: BehaviorContext,
  get: Getter
): boolean {
  const conditionFn = get(conditionAtom);
  return conditionFn(player, context) === 'success';
}

/**
 * Helper function to execute an action atom
 */
function executeAction(
  actionAtom: BehaviorNodeAtom,
  player: PlayerEntity,
  context: BehaviorContext,
  get: Getter
): NodeResult {
  const actionFn = get(actionAtom);
  return actionFn(player, context);
}

/**
 * Creates a behavior tree for field players
 */
export function createFieldPlayerBehaviorTree() {
  // Create the result atom for the behavior tree
  const resultAtom = createBehaviorStateAtom();
  
  // Create a tracking atom to monitor player behavior
  const behaviorStateAtom = createBehaviorTrackingAtom();
  
  // Create an evaluation function that updates the result atom
  const evaluateBehavior = atom(
    (get) => (player: PlayerEntity, context: BehaviorContext): NodeResult => {
      // Evaluate conditions
      const hasBall = evaluateCondition(hasBallConditionAtom(), player, context, get);
      const teamHasBall = evaluateCondition(teamHasBallConditionAtom(), player, context, get);
      const inShootingRange = evaluateCondition(isInShootingRangeConditionAtom(), player, context, get);
      const underPressure = evaluateCondition(isUnderPressureConditionAtom(), player, context, get);
      
      // Determine behavior based on conditions
      let behaviorType: PlayerBehaviorType | null = null;
      let result: NodeResult = 'running';
      
      // With ball sequence
      if (hasBall) {
        if (inShootingRange) {
          behaviorType = PlayerBehaviorType.Shoot;
          result = executeAction(shootActionAtom(), player, context, get);
        } else if (underPressure) {
          behaviorType = PlayerBehaviorType.Pass;
          result = executeAction(passActionAtom(), player, context, get);
        } else {
          behaviorType = PlayerBehaviorType.Dribble;
          result = executeAction(dribbleActionAtom(), player, context, get);
        }
      }
      // Team has ball sequence
      else if (teamHasBall) {
        // Sequential fallback selection
        const makeRunResult = executeAction(makeRunActionAtom(), player, context, get);
        if (makeRunResult !== 'failure') {
          behaviorType = PlayerBehaviorType.MakeRun;
          result = makeRunResult;
        } else {
          const supportResult = executeAction(supportNearActionAtom(), player, context, get);
          if (supportResult !== 'failure') {
            behaviorType = PlayerBehaviorType.SupportNear;
            result = supportResult;
          } else {
            behaviorType = PlayerBehaviorType.MaintainFormation;
            result = executeAction(maintainFormationActionAtom(), player, context, get);
          }
        }
      }
      // Defensive sequence
      else {
        // Sequential fallback selection
        const chaseResult = executeAction(chaseBallActionAtom(), player, context, get);
        if (chaseResult !== 'failure') {
          behaviorType = PlayerBehaviorType.ChaseBall;
          result = chaseResult;
        } else {
          const markResult = executeAction(markPlayerActionAtom(), player, context, get);
          if (markResult !== 'failure') {
            behaviorType = PlayerBehaviorType.MarkPlayer;
            result = markResult;
          } else {
            const pressResult = executeAction(pressBallActionAtom(), player, context, get);
            if (pressResult !== 'failure') {
              behaviorType = PlayerBehaviorType.PressBall;
              result = pressResult;
            } else {
              behaviorType = PlayerBehaviorType.MaintainDefensivePosition;
              result = executeAction(maintainDefensivePositionActionAtom(), player, context, get);
            }
          }
        }
      }
      
      // Update the behavior state atom
      get(atom(null, (_, set) => {
        set(behaviorStateAtom, {
          currentBehavior: behaviorType,
          result
        });
        set(resultAtom, result);
      }));
      
      return result;
    }
  );
  
  // Create a behavior tree using the createBehaviorTree factory
  const tree = createBehaviorTree(() => resultAtom);
  
  // Enhance the tree with behavior tracking and evaluation
  return {
    ...tree,
    behaviorStateAtom,
    evaluateBehavior
  };
}

/**
 * Creates a behavior tree for goalkeeper players
 */
export function createGoalkeeperBehaviorTree() {
  // Create the result atom for the behavior tree
  const resultAtom = createBehaviorStateAtom();
  
  // Create a tracking atom to monitor goalkeeper behavior
  const behaviorStateAtom = createBehaviorTrackingAtom();

  // Create an evaluation function that updates the result atom
  const evaluateBehavior = atom(
    (get) => (player: PlayerEntity, context: BehaviorContext): NodeResult => {
      // Evaluate conditions - goalkeeper has simpler conditions
      const hasBall = evaluateCondition(hasBallConditionAtom(), player, context, get);
      
      // Determine behavior based on conditions
      let behaviorType: PlayerBehaviorType | null = null;
      let result: NodeResult = 'running';
      
      // Simple goalkeeper logic - either has ball and passes, or maintains position
      if (hasBall) {
        behaviorType = PlayerBehaviorType.Pass;
        result = executeAction(passActionAtom(), player, context, get);
      } else {
        behaviorType = PlayerBehaviorType.MaintainDefensivePosition;
        result = executeAction(maintainDefensivePositionActionAtom(), player, context, get);
      }
      
      // Update the behavior state atom
      get(atom(null, (_, set) => {
        set(behaviorStateAtom, {
          currentBehavior: behaviorType,
          result
        });
        set(resultAtom, result);
      }));
      
      return result;
    }
  );
  
  // Create a behavior tree using the createBehaviorTree factory
  const tree = createBehaviorTree(() => resultAtom);
  
  // Enhance the tree with behavior tracking and evaluation
  return {
    ...tree,
    behaviorStateAtom,
    evaluateBehavior
  };
}
