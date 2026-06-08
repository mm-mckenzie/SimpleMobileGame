/**
 * Enemy factions — rival fungal organisms.
 * To add a new faction type/personality, add an entry here.
 * Factions are instantiated dynamically by the GameState.
 */

export type EnemyPersonality = 'aggressive' | 'expansive' | 'defensive' | 'opportunist';

export interface EnemyFactionDef {
  id: 'enemy1' | 'enemy2' | 'enemy3';
  name: string;
  emoji: string;
  color: number;
  personality: EnemyPersonality;
  description: string;
  baseSporeIncome: number;
  // Difficulty scaling: income multiplier per BALANCE.difficultyRampTurns turns
  incomeScaling: number;
}

import { C } from '../config';

export const ENEMY_FACTIONS: EnemyFactionDef[] = [
  {
    id: 'enemy1',
    name: 'Crimson Blight',
    emoji: '🔴',
    color: C.enemy1,
    personality: 'aggressive',
    description: 'Grows directly toward your core.',
    baseSporeIncome: 3,
    incomeScaling: 0.15,
  },
  {
    id: 'enemy2',
    name: 'Amber Creep',
    emoji: '🟠',
    color: C.enemy2,
    personality: 'expansive',
    description: 'Rapidly consumes resources, avoids conflict.',
    baseSporeIncome: 4,
    incomeScaling: 0.12,
  },
  {
    id: 'enemy3',
    name: 'Void Mold',
    emoji: '🟣',
    color: C.enemy3,
    personality: 'opportunist',
    description: 'Claims whatever is most valuable nearby.',
    baseSporeIncome: 3,
    incomeScaling: 0.18,
  },
];

/** Personality scoring weights for candidate hex selection. */
export const PERSONALITY_WEIGHTS: Record<EnemyPersonality, {
  towardPlayer: number;  // multiplier for proximity to player core
  resourceValue: number; // multiplier for hex resource yield
  towardSelf: number;    // multiplier for proximity to own core (defensive)
  randomNoise: number;   // random noise added to score
}> = {
  aggressive:  { towardPlayer: 3.0, resourceValue: 1.0, towardSelf: 0.0, randomNoise: 2  },
  expansive:   { towardPlayer: 0.5, resourceValue: 3.0, towardSelf: 0.0, randomNoise: 3  },
  defensive:   { towardPlayer: 0.0, resourceValue: 1.5, towardSelf: 2.0, randomNoise: 1  },
  opportunist: { towardPlayer: 1.0, resourceValue: 2.5, towardSelf: 0.5, randomNoise: 4  },
};
