import Dexie, { type EntityTable } from 'dexie';
import type * as T from './types';

export type WorkoutDatabase = Dexie & {
  exercises: EntityTable<T.Exercise, 'id'>;
  routines: EntityTable<T.Routine, 'id'>;
  routineTargets: EntityTable<T.RoutineTarget, 'id'>;
  sessions: EntityTable<T.Session, 'id'>;
  sessionExercises: EntityTable<T.SessionExercise, 'id'>;
  sets: EntityTable<T.SetRow, 'id'>;
  prs: EntityTable<T.PR, 'id'>;
  bodyWeight: EntityTable<T.BodyWeight, 'id'>;
  settings: EntityTable<T.Setting, 'key'>;
};

export const db = new Dexie('workout-tracker') as WorkoutDatabase;

db.version(1).stores({
  exercises: '++id, name, bodyPart, equipment',
  routines: '++id, name',
  routineTargets: '++id, routineId, exerciseId',
  sessions: '++id, date, routineId',
  sessionExercises: '++id, sessionId, exerciseId',
  sets: '++id, sessionExerciseId, exerciseId, completedAt',
  prs: '++id, exerciseId, [exerciseId+type], date',
  bodyWeight: '++id, date',
  settings: 'key',
});
