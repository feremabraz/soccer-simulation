/**
 * Centralized Jotai store for soccer simulation
 * This provides a single global store for all Jotai atoms
 */

import { createStore } from 'jotai';

// Create a single global store for all Jotai atoms
export const jotaiStore = createStore();
