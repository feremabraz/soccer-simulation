/**
 * Player Behavior nodes for the behavior tree
 *
 * This file implements all the condition and action nodes for players using Jotai atoms
 * for state management in a performance-optimized way.
 */

import type { PlayerEntity } from '@/lib/core/player';
import { type PrimitiveAtom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { BehaviorContext, NodeResult } from './behavior-tree';

// Type definitions
export type BehaviorNodeId = string;
export type PlayerAction =
  | 'shoot'
  | 'pass'
  | 'dribble'
  | 'supportNear'
  | 'makeRun'
  | 'maintainFormation'
  | 'chaseBall'
  | 'maintainDefensivePosition'
  | 'pressBall'
  | 'markPlayer';

export interface BehaviorNodeKey {
  playerId: string | number;
  nodeId: BehaviorNodeId;
}

// Base behavior node atom that accepts player and context as parameters
export type BehaviorNodeAtom = PrimitiveAtom<
  (player: PlayerEntity, context: BehaviorContext) => NodeResult
>;

// Cache to store behavior atoms to avoid recreating them unnecessarily
const behaviorAtomCache = new Map<string, BehaviorNodeAtom>();

// Helper to create and cache behavior atoms
function createBehaviorAtom(
  nodeType: string,
  nodeId: BehaviorNodeId,
  implementation: (player: PlayerEntity, context: BehaviorContext) => NodeResult
): BehaviorNodeAtom {
  const cacheKey = `${nodeType}_${nodeId}`;

  if (behaviorAtomCache.has(cacheKey)) {
    const cachedAtom = behaviorAtomCache.get(cacheKey);
    if (cachedAtom) return cachedAtom;
  }

  const behaviorAtom = atom(implementation);
  behaviorAtomCache.set(cacheKey, behaviorAtom);

  return behaviorAtom;
}

// Statistics tracking for behavior nodes
export interface BehaviorNodeStats {
  executionCount: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  lastExecutionTimeMs: number;
  averageExecutionTimeMs: number;
}

// Atom family for tracking behavior node stats
export const behaviorNodeStatsAtom = atomFamily<BehaviorNodeKey, PrimitiveAtom<BehaviorNodeStats>>(
  () =>
    atom<BehaviorNodeStats>({
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      runningCount: 0,
      lastExecutionTimeMs: 0,
      averageExecutionTimeMs: 0,
    })
);

// Selector for retrieving behavior node stats
export const behaviorNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: BehaviorNodeId) => {
    return get(behaviorNodeStatsAtom({ playerId, nodeId }));
  }
);

// Helper to update behavior node stats
function updateNodeStats(
  stats: BehaviorNodeStats,
  result: NodeResult,
  executionTimeMs: number
): BehaviorNodeStats {
  const newExecutionCount = stats.executionCount + 1;
  const newAverageTimeMs =
    (stats.averageExecutionTimeMs * stats.executionCount + executionTimeMs) / newExecutionCount;

  return {
    executionCount: newExecutionCount,
    successCount: result === 'success' ? stats.successCount + 1 : stats.successCount,
    failureCount: result === 'failure' ? stats.failureCount + 1 : stats.failureCount,
    runningCount: result === 'running' ? stats.runningCount + 1 : stats.runningCount,
    lastExecutionTimeMs: executionTimeMs,
    averageExecutionTimeMs: newAverageTimeMs,
  };
}

// -------------------------
// Condition Nodes
// -------------------------

export function hasBallConditionAtom(nodeId: BehaviorNodeId = 'hasBall'): BehaviorNodeAtom {
  return createBehaviorAtom('hasBallCondition', nodeId, (player, _context) => {
    return player.hasBall ? 'success' : 'failure';
  });
}

export function teamHasBallConditionAtom(nodeId: BehaviorNodeId = 'teamHasBall'): BehaviorNodeAtom {
  return createBehaviorAtom('teamHasBallCondition', nodeId, (player, context) => {
    return context.ball.possessor && context.ball.possessor.team === player.team
      ? 'success'
      : 'failure';
  });
}

export function isInShootingRangeConditionAtom(
  nodeId: BehaviorNodeId = 'isInShootingRange'
): BehaviorNodeAtom {
  return createBehaviorAtom('isInShootingRangeCondition', nodeId, (player, _context) => {
    const isHome = player.team === 'home';
    const goalX = isHome ? 90 : 10;
    const distanceToGoal = Math.abs(player.position.x - goalX);
    const angleToGoal = Math.abs(player.position.y - 50);

    return distanceToGoal < 25 && angleToGoal < 20 ? 'success' : 'failure';
  });
}

export function isUnderPressureConditionAtom(
  nodeId: BehaviorNodeId = 'isUnderPressure'
): BehaviorNodeAtom {
  return createBehaviorAtom('isUnderPressureCondition', nodeId, (player, context) => {
    let closestDistance = Number.MAX_VALUE;

    for (const opponent of context.opponents) {
      const distance = player.distanceTo(opponent);
      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }

    return closestDistance < 10 ? 'success' : 'failure';
  });
}

// -------------------------
// Action Nodes
// -------------------------

export function shootActionAtom(nodeId: BehaviorNodeId = 'shoot'): BehaviorNodeAtom {
  return createBehaviorAtom('shootAction', nodeId, (player, _context) => {
    player.lastAction = 'shoot';
    return 'success';
  });
}

export function passActionAtom(nodeId: BehaviorNodeId = 'pass'): BehaviorNodeAtom {
  return createBehaviorAtom('passAction', nodeId, (player, _context) => {
    player.lastAction = 'pass';
    return 'success';
  });
}

export function dribbleActionAtom(nodeId: BehaviorNodeId = 'dribble'): BehaviorNodeAtom {
  return createBehaviorAtom('dribbleAction', nodeId, (player, _context) => {
    player.lastAction = 'dribble';
    return 'success';
  });
}

export function supportNearActionAtom(nodeId: BehaviorNodeId = 'supportNear'): BehaviorNodeAtom {
  return createBehaviorAtom('supportNearAction', nodeId, (player, _context) => {
    player.lastAction = 'supportNear';
    return 'success';
  });
}

export function makeRunActionAtom(nodeId: BehaviorNodeId = 'makeRun'): BehaviorNodeAtom {
  return createBehaviorAtom('makeRunAction', nodeId, (player, _context) => {
    player.lastAction = 'makeRun';
    return 'success';
  });
}

export function maintainFormationActionAtom(
  nodeId: BehaviorNodeId = 'maintainFormation'
): BehaviorNodeAtom {
  return createBehaviorAtom('maintainFormationAction', nodeId, (player, _context) => {
    player.lastAction = 'maintainFormation';
    return 'success';
  });
}

export function chaseBallActionAtom(nodeId: BehaviorNodeId = 'chaseBall'): BehaviorNodeAtom {
  return createBehaviorAtom('chaseBallAction', nodeId, (player, _context) => {
    player.lastAction = 'chaseBall';
    return 'success';
  });
}

export function maintainDefensivePositionActionAtom(
  nodeId: BehaviorNodeId = 'maintainDefensivePosition'
): BehaviorNodeAtom {
  return createBehaviorAtom('maintainDefensivePositionAction', nodeId, (player, _context) => {
    player.lastAction = 'maintainDefensivePosition';
    return 'success';
  });
}

export function pressBallActionAtom(nodeId: BehaviorNodeId = 'pressBall'): BehaviorNodeAtom {
  return createBehaviorAtom('pressBallAction', nodeId, (player, _context) => {
    player.lastAction = 'pressBall';
    return 'success';
  });
}

export function markPlayerActionAtom(nodeId: BehaviorNodeId = 'markPlayer'): BehaviorNodeAtom {
  return createBehaviorAtom('markPlayerAction', nodeId, (player, _context) => {
    player.lastAction = 'markPlayer';
    return 'success';
  });
}

// Create a node that reports execution stats
export function createStatsTrackingWrapper(nodeId: BehaviorNodeId) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      playerId: string | number,
      _player: PlayerEntity,
      _context: BehaviorContext,
      nodeExecutor: () => NodeResult
    ) => {
      const startTime = performance.now();
      const result = nodeExecutor();
      const executionTime = performance.now() - startTime;

      // Update stats
      const statsAtom = behaviorNodeStatsAtom({ playerId, nodeId });
      const currentStats = get(statsAtom);
      set(statsAtom, updateNodeStats(currentStats, result, executionTime));

      return result;
    }
  );
}
