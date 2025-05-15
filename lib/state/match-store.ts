'use client';

import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';
import type { BallEntity } from '../core/ball';
import type { PlayerEntity } from '../core/player';
import type { TeamEntity } from '../core/team';
import { matchEngine } from '../match/match-engine';
import type { EventType, GameEvent, GameState, TeamData, TeamSide, Vector2D } from '../utils/types';

// State atoms
const gameStateAtom = atom<GameState>('idle');
const gameSpeedAtom = atom(1);
const gameTimeAtom = atom(0);
const halfAtom = atom<1 | 2 | 3 | 4>(1);
const scoreAtom = atom({ home: 0, away: 0 });
const possessionAtom = atom<TeamSide>('home');
const possessionStatsAtom = atom({ home: 50, away: 50 });
const homeTeamAtom = atom<TeamEntity | null>(null);
const awayTeamAtom = atom<TeamEntity | null>(null);
const playersAtom = atom<PlayerEntity[]>([]);
const ballAtom = atom<BallEntity | null>(null);
const gameEventsAtom = atom<GameEvent[]>([]);
const offsideLineAtom = atom({ home: 0, away: 0 });
const setpieceAtom = atom<{
  type: EventType | null;
  team: TeamSide | null;
  position: Vector2D | null;
}>({
  type: null,
  team: null,
  position: null,
});
const cardsAtom = atom({ yellow: [] as number[], red: [] as number[] });
const statsAtom = atom({
  possession: { home: 0, away: 0 },
  shots: { home: 0, away: 0 },
  shotsOnTarget: { home: 0, away: 0 },
  corners: { home: 0, away: 0 },
  fouls: { home: 0, away: 0 },
  yellowCards: { home: 0, away: 0 },
  redCards: { home: 0, away: 0 },
  offsides: { home: 0, away: 0 },
  passes: { home: 0, away: 0 },
  passAccuracy: { home: 0, away: 0 },
});
const stoppageTimeAddedAtom = atom(0);

// Update atom to sync with match engine
const updateStoreFromEngineAtom = atom(null, (_get, set) => {
  const state = matchEngine.getGameState();
  set(gameStateAtom, state.gameState);
  set(gameSpeedAtom, state.gameSpeed);
  set(gameTimeAtom, state.gameTime);
  set(halfAtom, state.half);
  set(scoreAtom, state.score);
  set(possessionAtom, state.possession);
  set(possessionStatsAtom, state.possessionStats);
  set(homeTeamAtom, state.homeTeam);
  set(awayTeamAtom, state.awayTeam);
  set(playersAtom, state.players);
  set(ballAtom, state.ball);
  set(gameEventsAtom, state.gameEvents);
  set(offsideLineAtom, state.offsideLine);
  set(setpieceAtom, state.setpiece);
  set(cardsAtom, state.cards);
  set(statsAtom, state.stats);
  set(stoppageTimeAddedAtom, state.stoppageTimeAdded);
});

// Custom hook for match store
export function useMatchStore() {
  // Get atoms
  const [gameState] = useAtom(gameStateAtom);
  const [gameSpeed] = useAtom(gameSpeedAtom);
  const [gameTime] = useAtom(gameTimeAtom);
  const [half] = useAtom(halfAtom);
  const [score] = useAtom(scoreAtom);
  const [possession] = useAtom(possessionAtom);
  const [possessionStats] = useAtom(possessionStatsAtom);
  const [homeTeam] = useAtom(homeTeamAtom);
  const [awayTeam] = useAtom(awayTeamAtom);
  const [players] = useAtom(playersAtom);
  const [ball] = useAtom(ballAtom);
  const [gameEvents] = useAtom(gameEventsAtom);
  const [offsideLine] = useAtom(offsideLineAtom);
  const [setpiece] = useAtom(setpieceAtom);
  const [cards] = useAtom(cardsAtom);
  const [stats] = useAtom(statsAtom);
  const [stoppageTimeAdded] = useAtom(stoppageTimeAddedAtom);
  const [, updateStore] = useAtom(updateStoreFromEngineAtom);

  // Initialize match engine
  const initialize = useCallback(
    (homeTeamData: TeamData, awayTeamData: TeamData) => {
      matchEngine.initialize(homeTeamData, awayTeamData);
      updateStore();

      // Set up interval to sync store with engine
      const intervalId = setInterval(() => {
        updateStore();
      }, 100);

      return () => clearInterval(intervalId);
    },
    [updateStore]
  );

  // Game control functions
  const startGame = useCallback(() => {
    matchEngine.startGame();
    updateStore();
  }, [updateStore]);

  const pauseGame = useCallback(() => {
    matchEngine.pauseGame();
    updateStore();
  }, [updateStore]);

  const resetGame = useCallback(() => {
    matchEngine.resetGame();
    updateStore();
  }, [updateStore]);

  const setGameSpeed = useCallback(
    (speed: number) => {
      matchEngine.setGameSpeed(speed);
      updateStore();
    },
    [updateStore]
  );

  return {
    // State
    gameState,
    gameSpeed,
    gameTime,
    half,
    score,
    possession,
    possessionStats,
    homeTeam,
    awayTeam,
    players,
    ball,
    gameEvents,
    offsideLine,
    setpiece,
    cards,
    stats,
    stoppageTimeAdded,

    // Actions
    initialize,
    startGame,
    pauseGame,
    resetGame,
    setGameSpeed,
  };
}
