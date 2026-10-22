import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { importDatabaseFromJson } from '../src/lib/backup';
import type { BackupData } from '../src/lib/backup';

describe('Backup and Restore Cycle', () => {
  beforeEach(async () => {
    await db.exercises.clear();
    await db.sessions.clear();
    await db.sets.clear();
    await db.prs.clear();
  });

  it('rejects malformed json or unknown app payloads', async () => {
    const res = await importDatabaseFromJson('{"foo": "bar"}');
    expect(res.success).toBe(false);
  });

  it('restores all entities accurately from a valid backup payload', async () => {
    const backup: BackupData = {
      version: 1,
      app: 'workout-tracker',
      exportedAt: new Date().toISOString(),
      tables: {
        exercises: [
          { id: 1, name: 'Bench Press', bodyPart: 'Chest', equipment: 'barbell' },
        ],
        routines: [],
        routineTargets: [],
        sessions: [
          { id: 1, date: '2026-10-21T12:00:00.000Z', finished: true },
        ],
        sessionExercises: [
          { id: 1, sessionId: 1, exerciseId: 1, order: 0, finished: true, achieved: true },
        ],
        sets: [
          {
            id: 1,
            sessionExerciseId: 1,
            exerciseId: 1,
            setNumber: 1,
            targetReps: 10,
            targetWeight: 80,
            actualReps: 10,
            actualWeight: 80,
            completed: true,
            isWarmup: false,
            completedAt: 12345678,
          },
        ],
        prs: [
          {
            id: 1,
            exerciseId: 1,
            type: 'weight',
            value: 80,
            weight: 80,
            reps: 10,
            setId: 1,
            date: 12345678,
          },
        ],
        bodyWeight: [],
        settings: [{ key: 'unit', value: 'kg' }],
      },
    };

    const res = await importDatabaseFromJson(JSON.stringify(backup));
    expect(res.success).toBe(true);

    const exercises = await db.exercises.toArray();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('Bench Press');

    const sets = await db.sets.toArray();
    expect(sets).toHaveLength(1);
    expect(sets[0].actualWeight).toBe(80);

    const prs = await db.prs.toArray();
    expect(prs).toHaveLength(1);
    expect(prs[0].value).toBe(80);
  });
});
