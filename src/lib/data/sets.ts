import { db } from '../db';
import type { SetRow } from '../types';
import { checkAndRecordPRs, rebuildPRs, type NewPR } from '../pr';

export async function getSetsBySessionExercise(sessionExerciseId: number): Promise<SetRow[]> {
  return await db.sets
    .where('sessionExerciseId')
    .equals(sessionExerciseId)
    .sortBy('setNumber');
}

export async function getSetsByExercise(exerciseId: number): Promise<SetRow[]> {
  return await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .sortBy('completedAt');
}

export async function addSet(
  sessionExerciseId: number,
  exerciseId: number,
  isWarmup = false
): Promise<SetRow> {
  const existingSets = await db.sets
    .where('sessionExerciseId')
    .equals(sessionExerciseId)
    .toArray();

  const setNumber = existingSets.length + 1;
  const previousSet = existingSets[existingSets.length - 1];

  const targetReps = previousSet ? previousSet.targetReps : 10;
  const targetWeight = previousSet ? previousSet.targetWeight : 20;

  const newSet: SetRow = {
    sessionExerciseId,
    exerciseId,
    setNumber,
    targetReps,
    targetWeight,
    actualReps: targetReps,
    actualWeight: targetWeight,
    completed: false,
    isWarmup,
  };

  const id = await db.sets.add(newSet);
  return { ...newSet, id: Number(id) };
}

export async function updateSet(setId: number, patch: Partial<SetRow>): Promise<void> {
  const current = await db.sets.get(setId);
  if (!current) return;

  await db.sets.update(setId, patch);

  // If a completed set was edited, recalculate PRs
  if (current.completed || patch.completed) {
    await rebuildPRs(current.exerciseId);
  }
}

export async function toggleCompleteSet(
  setId: number,
  actualReps?: number,
  actualWeight?: number
): Promise<{ set: SetRow; newPRs: NewPR[] }> {
  const current = await db.sets.get(setId);
  if (!current) throw new Error('Set not found');

  if (current.completed) {
    // Uncompleting set
    const updated: SetRow = {
      ...current,
      completed: false,
      completedAt: undefined,
    };
    await db.sets.put(updated);
    await rebuildPRs(current.exerciseId);
    return { set: updated, newPRs: [] };
  } else {
    // Completing set
    const updated: SetRow = {
      ...current,
      actualReps: actualReps !== undefined ? actualReps : current.actualReps,
      actualWeight: actualWeight !== undefined ? actualWeight : current.actualWeight,
      completed: true,
      completedAt: Date.now(),
    };
    await db.sets.put(updated);
    const newPRs = await checkAndRecordPRs(updated);
    return { set: updated, newPRs };
  }
}

export async function deleteSet(setId: number): Promise<void> {
  const current = await db.sets.get(setId);
  if (!current) return;

  await db.sets.delete(setId);

  // Renumber remaining sets for this sessionExercise
  const remaining = await db.sets
    .where('sessionExerciseId')
    .equals(current.sessionExerciseId)
    .sortBy('setNumber');

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].setNumber !== i + 1) {
      await db.sets.update(remaining[i].id!, { setNumber: i + 1 });
    }
  }

  if (current.completed) {
    await rebuildPRs(current.exerciseId);
  }
}

/**
 * Returns previous completed sets for an exercise from the most recent prior session
 */
export async function getLastTimeSets(
  exerciseId: number,
  currentSessionExerciseId?: number
): Promise<SetRow[]> {
  const allPrior = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter(
      s =>
        s.completed &&
        !s.isWarmup &&
        (currentSessionExerciseId === undefined || s.sessionExerciseId !== currentSessionExerciseId)
    )
    .reverse()
    .sortBy('completedAt');

  if (allPrior.length === 0) return [];

  // Group by the most recent sessionExerciseId
  const mostRecentSessionExerciseId = allPrior[0].sessionExerciseId;
  return allPrior
    .filter(s => s.sessionExerciseId === mostRecentSessionExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber);
}
