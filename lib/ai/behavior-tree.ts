/**
 * Behavior Tree implementation for player AI using Jotai for state management
 */

import type { BallEntity } from '@/lib/core/ball';
import type { PlayerEntity } from '@/lib/core/player';
import { atom } from 'jotai';
import { useMemo } from 'react';

// Node result types
export type NodeResult = 'success' | 'failure' | 'running';

// Context for behavior tree execution
export interface BehaviorContext {
  ball: BallEntity;
  teammates: PlayerEntity[];
  opponents: PlayerEntity[];
  deltaTime: number;
}

// -----------------------------------
// Jotai-based state management
// -----------------------------------

// Global atom for behavior tree context
export const behaviorContextAtom = atom<BehaviorContext | null>(null);

// Atom for each player state by ID mapping
export const playerStatesAtom = atom<Map<string | number, PlayerEntity>>(new Map());

// Atom for behavior tree stats
export interface BehaviorStats {
  nodeExecutions: number;
  successCount: number;
  failureCount: number;
  runningCount: number;
  lastExecutionTimeMs: number;
  averageExecutionTimeMs: number;
  maxExecutionTimeMs: number;
}

// Stats for performance tracking
export const behaviorStatsAtom = atom<Map<string, BehaviorStats>>(new Map());

// Derived atom to get a player's state
export const getPlayerAtom = atom(
  (get) => (id: string | number) => get(playerStatesAtom).get(id) || null
);

// -----------------------------------
// Behavior Node System
// -----------------------------------

// Base node interface
export type AtomBehaviorNode = import('jotai').PrimitiveAtom<NodeResult>;

export type BehaviorNode =
  | { execute(player: PlayerEntity, context: BehaviorContext): NodeResult }
  | AtomBehaviorNode; // Atom-based nodes

// Helper to execute a node (class-based or atom-based)
function runNode(
  child: BehaviorNode,
  get: import('jotai').Getter,
  player: PlayerEntity,
  context: BehaviorContext
): NodeResult {
  if ('execute' in child && typeof child.execute === 'function') {
    return child.execute(player, context);
  }
  return get(child as AtomBehaviorNode);
}

// Composite nodes
// Atom family for SelectorNode's last running child index, keyed by player and node instance
import { atomFamily } from 'jotai/utils';

import type { PrimitiveAtom } from 'jotai';

export const selectorNodeLastRunningIndexAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<number>
>(() => atom(0));

// Atom family for SelectorNode performance stats
export const selectorNodeStatsAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<BehaviorStats>
>(() =>
  atom({
    nodeExecutions: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
    lastExecutionTimeMs: 0,
    averageExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
  })
);

// Atom-based SelectorNode implementation
export function selectorNodeAtom(nodeId: string, children: BehaviorNode[]) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      player: PlayerEntity,
      context: BehaviorContext
    ): NodeResult => {
      const lastRunningIndexAtom = selectorNodeLastRunningIndexAtom({
        playerId: player.id,
        nodeId,
      });
      const lastRunningIndex = get(lastRunningIndexAtom);
      const statsAtom = selectorNodeStatsAtom({ playerId: player.id, nodeId });
      const stats = get(statsAtom);
      const startTime = performance.now();

      for (let i = lastRunningIndex; i < children.length; i++) {
        const result = runNode(children[i], get, player, context);
        if (result === 'running') {
          set(lastRunningIndexAtom, i);
          set(statsAtom, {
            ...stats,
            nodeExecutions: stats.nodeExecutions + 1,
            runningCount: stats.runningCount + 1,
            lastExecutionTimeMs: performance.now() - startTime,
          });
          return result;
        }
        if (result === 'success') {
          set(lastRunningIndexAtom, 0);
          set(statsAtom, {
            ...stats,
            nodeExecutions: stats.nodeExecutions + 1,
            successCount: stats.successCount + 1,
            lastExecutionTimeMs: performance.now() - startTime,
          });
          return result;
        }
      }
      // All children failed
      set(lastRunningIndexAtom, 0);
      set(statsAtom, {
        ...stats,
        nodeExecutions: stats.nodeExecutions + 1,
        failureCount: stats.failureCount + 1,
        lastExecutionTimeMs: performance.now() - startTime,
      });
      return 'failure';
    }
  );
}

// Memoized selector for SelectorNode stats
export const selectorNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: string) => {
    return get(selectorNodeStatsAtom({ playerId, nodeId }));
  }
);

// Usage pattern for atom-based SelectorNode:
// const mySelectorNode = selectorNodeAtom('uniqueNodeId', [child1, child2, ...]);
// const result = useAtomValue(mySelectorNode, player, context);

// Atom family for SequenceNode's last running child index
export const sequenceNodeLastRunningIndexAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<number>
>(() => atom(0));

// Atom family for SequenceNode stats
export const sequenceNodeStatsAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<BehaviorStats>
>(() =>
  atom({
    nodeExecutions: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
    lastExecutionTimeMs: 0,
    averageExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
  })
);

export function sequenceNodeAtom(nodeId: string, children: BehaviorNode[]) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      player: PlayerEntity,
      context: BehaviorContext
    ): NodeResult => {
      const lastRunningIndexAtom = sequenceNodeLastRunningIndexAtom({
        playerId: player.id,
        nodeId,
      });
      const lastRunningIndex = get(lastRunningIndexAtom);
      const statsAtom = sequenceNodeStatsAtom({ playerId: player.id, nodeId });
      const stats = get(statsAtom);
      const startTime = performance.now();
      for (let i = lastRunningIndex; i < children.length; i++) {
        const result = runNode(children[i], get, player, context);
        if (result === 'running') {
          set(lastRunningIndexAtom, i);
          set(statsAtom, {
            ...stats,
            nodeExecutions: stats.nodeExecutions + 1,
            runningCount: stats.runningCount + 1,
            lastExecutionTimeMs: performance.now() - startTime,
          });
          return result;
        }
        if (result === 'failure') {
          set(lastRunningIndexAtom, 0);
          set(statsAtom, {
            ...stats,
            nodeExecutions: stats.nodeExecutions + 1,
            failureCount: stats.failureCount + 1,
            lastExecutionTimeMs: performance.now() - startTime,
          });
          return result;
        }
      }
      set(lastRunningIndexAtom, 0);
      set(statsAtom, {
        ...stats,
        nodeExecutions: stats.nodeExecutions + 1,
        successCount: stats.successCount + 1,
        lastExecutionTimeMs: performance.now() - startTime,
      });
      return 'success';
    }
  );
}

export const sequenceNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: string) => {
    return get(sequenceNodeStatsAtom({ playerId, nodeId }));
  }
);

// Decorator nodes
// Atom family for InverterNode stats
export const inverterNodeStatsAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<BehaviorStats>
>(() =>
  atom({
    nodeExecutions: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
    lastExecutionTimeMs: 0,
    averageExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
  })
);

export function inverterNodeAtom(nodeId: string, child: BehaviorNode) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      player: PlayerEntity,
      context: BehaviorContext
    ): NodeResult => {
      const statsAtom = inverterNodeStatsAtom({ playerId: player.id, nodeId });
      const stats = get(statsAtom);
      const startTime = performance.now();
      const result = runNode(child, get, player, context);
      let nodeResult: NodeResult = result;
      if (result === 'success') nodeResult = 'failure';
      else if (result === 'failure') nodeResult = 'success';
      set(statsAtom, {
        ...stats,
        nodeExecutions: stats.nodeExecutions + 1,
        lastExecutionTimeMs: performance.now() - startTime,
        successCount: nodeResult === 'success' ? stats.successCount + 1 : stats.successCount,
        failureCount: nodeResult === 'failure' ? stats.failureCount + 1 : stats.failureCount,
        runningCount: nodeResult === 'running' ? stats.runningCount + 1 : stats.runningCount,
      });
      return nodeResult;
    }
  );
}

export const inverterNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: string) => {
    return get(inverterNodeStatsAtom({ playerId, nodeId }));
  }
);

// Atom family for RepeatUntilFailureNode stats
export const repeatUntilFailureNodeStatsAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<BehaviorStats>
>(() =>
  atom({
    nodeExecutions: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
    lastExecutionTimeMs: 0,
    averageExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
  })
);

export function repeatUntilFailureNodeAtom(nodeId: string, child: BehaviorNode) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      player: PlayerEntity,
      context: BehaviorContext
    ): NodeResult => {
      const statsAtom = repeatUntilFailureNodeStatsAtom({ playerId: player.id, nodeId });
      const stats = get(statsAtom);
      const startTime = performance.now();
      const result = runNode(child, get, player, context);
      let nodeResult: NodeResult = 'running';
      if (result === 'failure') nodeResult = 'failure';
      set(statsAtom, {
        ...stats,
        nodeExecutions: stats.nodeExecutions + 1,
        lastExecutionTimeMs: performance.now() - startTime,
        failureCount: nodeResult === 'failure' ? stats.failureCount + 1 : stats.failureCount,
        runningCount: nodeResult === 'running' ? stats.runningCount + 1 : stats.runningCount,
      });
      return nodeResult;
    }
  );
}

export const repeatUntilFailureNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: string) => {
    return get(repeatUntilFailureNodeStatsAtom({ playerId, nodeId }));
  }
);

// Additional decorator nodes
// Atom family for ConditionNode stats
export const conditionNodeStatsAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<BehaviorStats>
>(() =>
  atom({
    nodeExecutions: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
    lastExecutionTimeMs: 0,
    averageExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
  })
);

export function conditionNodeAtom(
  nodeId: string,
  condition: (player: PlayerEntity, context: BehaviorContext) => boolean,
  child?: BehaviorNode
) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      player: PlayerEntity,
      context: BehaviorContext
    ): NodeResult => {
      const statsAtom = conditionNodeStatsAtom({ playerId: player.id, nodeId });
      const stats = get(statsAtom);
      const startTime = performance.now();
      let nodeResult: NodeResult;
      if (condition(player, context)) {
        nodeResult = child ? runNode(child, get, player, context) : 'success';
      } else {
        nodeResult = 'failure';
      }
      set(statsAtom, {
        ...stats,
        nodeExecutions: stats.nodeExecutions + 1,
        lastExecutionTimeMs: performance.now() - startTime,
        successCount: nodeResult === 'success' ? stats.successCount + 1 : stats.successCount,
        failureCount: nodeResult === 'failure' ? stats.failureCount + 1 : stats.failureCount,
        runningCount: nodeResult === 'running' ? stats.runningCount + 1 : stats.runningCount,
      });
      return nodeResult;
    }
  );
}

export const conditionNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: string) => {
    return get(conditionNodeStatsAtom({ playerId, nodeId }));
  }
);

// Parallel node that executes all children simultaneously
// Atom family for ParallelNode stats
export const parallelNodeStatsAtom = atomFamily<
  { playerId: string | number; nodeId: string },
  PrimitiveAtom<BehaviorStats>
>(() =>
  atom({
    nodeExecutions: 0,
    successCount: 0,
    failureCount: 0,
    runningCount: 0,
    lastExecutionTimeMs: 0,
    averageExecutionTimeMs: 0,
    maxExecutionTimeMs: 0,
  })
);

export function parallelNodeAtom(
  nodeId: string,
  children: BehaviorNode[],
  requiredSuccessCount: number
) {
  return atom(
    (
      get: import('jotai').Getter,
      set: import('jotai').Setter,
      player: PlayerEntity,
      context: BehaviorContext
    ): NodeResult => {
      const statsAtom = parallelNodeStatsAtom({ playerId: player.id, nodeId });
      const stats = get(statsAtom);
      const startTime = performance.now();
      let successCount = 0;
      let runningCount = 0;
      for (const child of children) {
        const result = runNode(child, get, player, context);
        if (result === 'success') successCount++;
        else if (result === 'running') runningCount++;
      }
      let nodeResult: NodeResult = 'failure';
      if (successCount >= requiredSuccessCount) nodeResult = 'success';
      else if (runningCount > 0) nodeResult = 'running';
      set(statsAtom, {
        ...stats,
        nodeExecutions: stats.nodeExecutions + 1,
        lastExecutionTimeMs: performance.now() - startTime,
        successCount: nodeResult === 'success' ? stats.successCount + 1 : stats.successCount,
        failureCount: nodeResult === 'failure' ? stats.failureCount + 1 : stats.failureCount,
        runningCount: nodeResult === 'running' ? stats.runningCount + 1 : stats.runningCount,
      });
      return nodeResult;
    }
  );
}

export const parallelNodeStatsSelector = atom(
  (get) => (playerId: string | number, nodeId: string) => {
    return get(parallelNodeStatsAtom({ playerId, nodeId }));
  }
);

// NodeKey type for better type safety with atom families
type NodeKey = string;

// Atom family to store behavior node instances
export const behaviorNodesAtom = atom<Map<NodeKey, BehaviorNode>>(new Map());

// Hook to use a behavior node with caching
export function useBehaviorNode<T extends BehaviorNode>(node: T): T {
  // Simply memoize the node with appropriate dependencies
  // We don't need extra dependencies that could cause unnecessary rerenders
  return useMemo(() => node, [node]);
}

/**
 * Helper function to create a behavior tree factory with performance tracking
 * This is a simplified implementation of the behavior tree using Jotai for state
 */
import { getDefaultStore, useAtomValue } from 'jotai';

export function createBehaviorTree(
  rootNode: (player: PlayerEntity, context: BehaviorContext) => AtomBehaviorNode
) {
  const store = getDefaultStore();
  return {
    // For React usage: use the hook in a component
    useExecute: (player: PlayerEntity, context: BehaviorContext): NodeResult => {
      return useAtomValue(rootNode(player, context));
    },
    // For non-React usage: use the store's get method
    execute: (player: PlayerEntity, context: BehaviorContext): NodeResult => {
      return store.get(rootNode(player, context));
    },
    reset: () => {},
  };
}
