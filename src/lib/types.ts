export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'weighted_bodyweight'
  | 'band';

export interface Exercise {
  id?: number;
  name: string;
  bodyPart: string;
  equipment: Equipment;
  animationFile?: string; // filename in /public/animations
  notes?: string;
}

export interface Routine {
  id?: number;
  name: string;
  notes?: string;
}

export interface RoutineTarget {
  id?: number;
  routineId: number;
  exerciseId: number;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number; // stored in kg
}

export interface Session {
  id?: number;
  date: string; // ISO string
  routineId?: number;
  notes?: string;
  durationSeconds?: number;
  finished?: boolean;
}

export interface SessionExercise {
  id?: number;
  sessionId: number;
  exerciseId: number;
  order: number;
  achieved?: boolean; // set when the exercise is finished
  finished: boolean;
}

export interface SetRow {
  id?: number;
  sessionExerciseId: number;
  exerciseId: number;
  setNumber: number;
  targetReps: number;
  targetWeight: number; // kg
  actualReps: number;
  actualWeight: number; // kg
  completed: boolean;
  isWarmup: boolean;
  completedAt?: number; // epoch ms
}

export type PRType = 'weight' | 'e1rm' | 'volume' | 'reps_at_weight';

export interface PR {
  id?: number;
  exerciseId: number;
  type: PRType;
  value: number;
  weight: number;
  reps: number;
  setId: number;
  date: number; // epoch ms
}

export interface BodyWeight {
  id?: number;
  date: string;
  value: number; // kg
}

export interface Setting {
  key: string;
  value: unknown;
}
