import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import {
  createRoutine,
  updateRoutine,
  saveRoutineTargets,
  getRoutineById,
  deleteRoutine,
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
});
