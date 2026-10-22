import { db } from '../db';
import type { Routine, RoutineTarget, Exercise } from '../types';

export interface HydratedRoutineTarget extends RoutineTarget {
  exercise?: Exercise;
}

export interface HydratedRoutine extends Routine {
  targets: HydratedRoutineTarget[];
}

export async function getAllRoutines(): Promise<HydratedRoutine[]> {
  const routines = await db.routines.orderBy('name').toArray();
  const hydrated: HydratedRoutine[] = [];

  for (const r of routines) {
    const targets = await getRoutineTargets(r.id!);
    hydrated.push({
      ...r,
      targets,
    });
  }

  return hydrated;
}

export async function getRoutineById(id: number): Promise<HydratedRoutine | null> {
  const routine = await db.routines.get(id);
  if (!routine) return null;
  const targets = await getRoutineTargets(id);
  return { ...routine, targets };
}

export async function getRoutineTargets(routineId: number): Promise<HydratedRoutineTarget[]> {
  const targets = await db.routineTargets
    .where('routineId')
    .equals(routineId)
    .sortBy('order');

  const hydrated: HydratedRoutineTarget[] = [];
  for (const t of targets) {
    const exercise = await db.exercises.get(t.exerciseId);
    hydrated.push({ ...t, exercise });
  }
  return hydrated;
}

export async function createRoutine(
  name: string,
  notes?: string,
  targets?: Array<{ exerciseId: number; targetSets: number; targetReps: number; targetWeight: number }>
): Promise<number> {
  const id = Number(await db.routines.add({ name, notes }));
  if (targets && targets.length > 0) {
    for (let i = 0; i < targets.length; i++) {
      await db.routineTargets.add({
        routineId: id,
        exerciseId: targets[i].exerciseId,
        order: i,
        targetSets: targets[i].targetSets,
        targetReps: targets[i].targetReps,
        targetWeight: targets[i].targetWeight,
      });
    }
  }
  return id;
}

export async function updateRoutine(
  id: number,
  name: string,
  notes?: string
): Promise<void> {
  await db.routines.update(id, { name, notes });
}

export async function saveRoutineTargets(
  routineId: number,
  targets: Array<{ exerciseId: number; targetSets: number; targetReps: number; targetWeight: number }>
): Promise<void> {
  await db.transaction('rw', db.routineTargets, async () => {
    await db.routineTargets.where('routineId').equals(routineId).delete();
    for (let i = 0; i < targets.length; i++) {
      await db.routineTargets.add({
        routineId,
        exerciseId: targets[i].exerciseId,
        order: i,
        targetSets: targets[i].targetSets,
        targetReps: targets[i].targetReps,
        targetWeight: targets[i].targetWeight,
      });
    }
  });
}

export async function deleteRoutine(id: number): Promise<void> {
  await db.transaction('rw', [db.routines, db.routineTargets], async () => {
    await db.routineTargets.where('routineId').equals(id).delete();
    await db.routines.delete(id);
  });
}
