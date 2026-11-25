import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import {
  createRoutine,
  updateRoutine,
  saveRoutineTargets,
  getRoutineById,
  deleteRoutine,
  formatRoutineAsText,
  importRoutineFromJson,
  createRoutineFromSession,
} from '../src/lib/data/routines';

describe('Routines Data Operations', () => {
  beforeEach(async () => {
    await db.routines.clear();
    await db.routineTargets.clear();
    await db.exercises.clear();
  });

  it('creates, edits, and updates targets for a routine', async () => {
    // 1. Create starter exercise
    const exId = Number(
      await db.exercises.add({
        name: 'Incline Dumbbell Press',
        bodyPart: 'Chest',
        equipment: 'dumbbell',
      })
    );

    // 2. Create routine
    const routineId = await createRoutine('Chest Hypertrophy', 'Chest workout', [
      { exerciseId: exId, targetSets: 4, targetReps: 8, targetWeight: 30 },
    ]);

    const created = await getRoutineById(routineId);
    expect(created?.name).toBe('Chest Hypertrophy');
    expect(created?.targets).toHaveLength(1);
    expect(created?.targets[0].targetSets).toBe(4);
    expect(created?.targets[0].targetWeight).toBe(30);

    // 3. Edit routine name and notes
    await updateRoutine(routineId, 'Chest & Triceps Power', 'Updated notes');
    const updated = await getRoutineById(routineId);
    expect(updated?.name).toBe('Chest & Triceps Power');
    expect(updated?.notes).toBe('Updated notes');

    // 4. Update targets (e.g. increase sets/weight)
    await saveRoutineTargets(routineId, [
      { exerciseId: exId, targetSets: 5, targetReps: 10, targetWeight: 32.5 },
    ]);
    const updatedTargets = await getRoutineById(routineId);
    expect(updatedTargets?.targets).toHaveLength(1);
    expect(updatedTargets?.targets[0].targetSets).toBe(5);
    expect(updatedTargets?.targets[0].targetReps).toBe(10);
    expect(updatedTargets?.targets[0].targetWeight).toBe(32.5);

    // 5. Delete routine
    await deleteRoutine(routineId);
    const deleted = await getRoutineById(routineId);
    expect(deleted).toBeNull();
  });

  it('formats routine as clean shareable text', async () => {
    const exId = Number(
      await db.exercises.add({
        name: 'Barbell Squat',
        bodyPart: 'Legs',
        equipment: 'barbell',
      })
    );

    const routineId = await createRoutine('Leg Day Blast', 'High intensity quad focus', [
      { exerciseId: exId, targetSets: 4, targetReps: 8, targetWeight: 100 },
    ]);

    const routine = await getRoutineById(routineId);
    expect(routine).not.toBeNull();
    const formatted = formatRoutineAsText(routine!, 'kg');
    expect(formatted).toContain('🏋️ Leg Day Blast');
    expect(formatted).toContain('High intensity quad focus');
    expect(formatted).toContain('1. Barbell Squat: 4 sets × 8 reps @ 100 kg');
  });

  it('imports routine JSON correctly and auto-creates missing exercises', async () => {
    const routinePayload = JSON.stringify({
      version: 1,
      app: 'workout-tracker',
      type: 'single-routine',
      exportedAt: new Date().toISOString(),
      routine: {
        name: 'Back & Biceps Custom',
        notes: 'Imported Routine Test',
        targets: [
          {
            exerciseName: 'Lat Pulldown Machine',
            bodyPart: 'Back',
            equipment: 'cable',
            targetSets: 4,
            targetReps: 12,
            targetWeight: 55,
          },
        ],
      },
    });

    const res = await importRoutineFromJson(routinePayload);
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);

    // Verify routine exists
    const routines = await db.routines.toArray();
    const imported = routines.find(r => r.name === 'Back & Biceps Custom');
    expect(imported).toBeDefined();

    // Verify exercise was auto-created
    const ex = await db.exercises.where('name').equals('Lat Pulldown Machine').first();
    expect(ex).toBeDefined();
    expect(ex?.bodyPart).toBe('Back');
  });

  it('creates routine from a completed workout session', async () => {
    const exId = Number(
      await db.exercises.add({
        name: 'Overhead Press',
        bodyPart: 'Shoulders',
        equipment: 'barbell',
      })
    );

    const sessId = Number(
      await db.sessions.add({
        date: new Date().toISOString(),
        finished: true,
        notes: 'Shoulder Blast',
      })
    );

    const seId = Number(
      await db.sessionExercises.add({
        sessionId: sessId,
        exerciseId: exId,
        order: 0,
      })
    );

    await db.sets.bulkAdd([
      {
        sessionExerciseId: seId,
        exerciseId: exId,
        setNumber: 1,
        isWarmup: false,
        targetReps: 10,
        targetWeight: 40,
        actualReps: 10,
        actualWeight: 40,
        completed: true,
      },
      {
        sessionExerciseId: seId,
        exerciseId: exId,
        setNumber: 2,
        isWarmup: false,
        targetReps: 10,
        targetWeight: 40,
        actualReps: 10,
        actualWeight: 40,
        completed: true,
      },
    ]);

    const routineId = await createRoutineFromSession(sessId, 'Generated Shoulder Routine');
    const routine = await getRoutineById(routineId);
    expect(routine).not.toBeNull();
    expect(routine?.name).toBe('Generated Shoulder Routine');
    expect(routine?.targets).toHaveLength(1);
    expect(routine?.targets[0].targetSets).toBe(2);
    expect(routine?.targets[0].targetWeight).toBe(40);
  });
});
