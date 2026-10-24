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

export interface SingleRoutineExport {
  version: 1;
  app: 'workout-tracker';
  type: 'single-routine';
  exportedAt: string;
  routine: {
    name: string;
    notes?: string;
    targets: Array<{
      exerciseName: string;
      bodyPart: string;
      equipment: string;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
    }>;
  };
}

export interface RoutinesBackupExport {
  version: 1;
  app: 'workout-tracker';
  type: 'routines-backup';
  exportedAt: string;
  routines: Array<{
    name: string;
    notes?: string;
    targets: Array<{
      exerciseName: string;
      bodyPart: string;
      equipment: string;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
    }>;
  }>;
}

/** Formats routine into a clean, shareable plain-text message */
export function formatRoutineAsText(routine: HydratedRoutine, unit: 'kg' | 'lb' = 'kg'): string {
  const lines: string[] = [];
  lines.push(`🏋️ ${routine.name}`);
  if (routine.notes) {
    lines.push(routine.notes);
  }
  lines.push('');

  routine.targets.forEach((t, i) => {
    const exName = t.exercise?.name || 'Exercise';
    const weightDisplay = t.targetWeight === 0 ? 'BW' : `${t.targetWeight} ${unit}`;
    lines.push(`${i + 1}. ${exName}: ${t.targetSets} sets × ${t.targetReps} reps @ ${weightDisplay}`);
  });

  return lines.join('\n');
}

/** Downloads single routine as JSON file */
export function exportRoutineToJson(routine: HydratedRoutine): void {
  const exportData: SingleRoutineExport = {
    version: 1,
    app: 'workout-tracker',
    type: 'single-routine',
    exportedAt: new Date().toISOString(),
    routine: {
      name: routine.name,
      notes: routine.notes,
      targets: routine.targets.map(t => ({
        exerciseName: t.exercise?.name || 'Custom Exercise',
        bodyPart: t.exercise?.bodyPart || 'Chest',
        equipment: t.exercise?.equipment || 'barbell',
        targetSets: t.targetSets,
        targetReps: t.targetReps,
        targetWeight: t.targetWeight,
      })),
    },
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const slug = routine.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'routine';
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-routine.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Downloads all routines as a single JSON file */
export async function exportAllRoutinesToJson(): Promise<void> {
  const allRoutines = await getAllRoutines();
  const exportData: RoutinesBackupExport = {
    version: 1,
    app: 'workout-tracker',
    type: 'routines-backup',
    exportedAt: new Date().toISOString(),
    routines: allRoutines.map(r => ({
      name: r.name,
      notes: r.notes,
      targets: r.targets.map(t => ({
        exerciseName: t.exercise?.name || 'Custom Exercise',
        bodyPart: t.exercise?.bodyPart || 'Chest',
        equipment: t.exercise?.equipment || 'barbell',
        targetSets: t.targetSets,
        targetReps: t.targetReps,
        targetWeight: t.targetWeight,
      })),
    })),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `routines-backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Imports routines from JSON string (supports single routine or routines backup) */
export async function importRoutineFromJson(
  jsonString: string
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data || data.app !== 'workout-tracker') {
      throw new Error('Invalid workout tracker routine file format.');
    }

    let routinesToImport: Array<{
      name: string;
      notes?: string;
      targets: Array<{
        exerciseName: string;
        bodyPart?: string;
        equipment?: string;
        targetSets: number;
        targetReps: number;
        targetWeight: number;
      }>;
    }> = [];

    if (data.type === 'single-routine' && data.routine) {
      routinesToImport = [data.routine];
    } else if (data.type === 'routines-backup' && Array.isArray(data.routines)) {
      routinesToImport = data.routines;
    } else {
      throw new Error('Unrecognized routine payload structure.');
    }

    if (routinesToImport.length === 0) {
      throw new Error('No routine data found in file.');
    }

    let importedCount = 0;

    for (const r of routinesToImport) {
      const routineName = r.name?.trim() || 'Imported Routine';
      const targetItems: Array<{
        exerciseId: number;
        targetSets: number;
        targetReps: number;
        targetWeight: number;
      }> = [];

      for (const t of r.targets || []) {
        const exName = t.exerciseName?.trim() || 'Exercise';
        // Find existing exercise or create new one
        const existing = await db.exercises
          .filter(e => e.name.toLowerCase() === exName.toLowerCase())
          .first();

        let exerciseId: number;
        if (existing?.id) {
          exerciseId = existing.id;
        } else {
          // Auto-create exercise so template works immediately
          exerciseId = Number(
            await db.exercises.add({
              name: exName,
              bodyPart: (t.bodyPart as any) || 'Chest',
              equipment: (t.equipment as any) || 'barbell',
            })
          );
        }

        targetItems.push({
          exerciseId,
          targetSets: Math.max(1, Number(t.targetSets) || 3),
          targetReps: Math.max(1, Number(t.targetReps) || 10),
          targetWeight: Math.max(0, Number(t.targetWeight) || 0),
        });
      }

      await createRoutine(routineName, r.notes, targetItems);
      importedCount++;
    }

    return {
      success: true,
      message: `Successfully imported ${importedCount} routine${importedCount === 1 ? '' : 's'}.`,
      count: importedCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to import routine.';
    return { success: false, message: msg, count: 0 };
  }
}

/** Creates and saves a new routine template based on an active or finished workout session */
export async function createRoutineFromSession(
  sessionId: number,
  customName?: string
): Promise<number> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error('Session not found.');

  const sessionExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .sortBy('order');

  const targets: Array<{
    exerciseId: number;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
  }> = [];

  for (const se of sessionExercises) {
    const sets = await db.sets
      .where('sessionExerciseId')
      .equals(se.id!)
      .sortBy('setNumber');

    const workingSets = sets.filter(s => !s.isWarmup);
    const targetSets = Math.max(1, workingSets.length || sets.length || 3);

    // Pick median or last working set weight/reps
    const sampleSet = workingSets[0] || sets[0];
    const targetWeight = sampleSet ? (sampleSet.completed ? sampleSet.actualWeight : sampleSet.targetWeight) : 20;
    const targetReps = sampleSet ? (sampleSet.completed ? sampleSet.actualReps : sampleSet.targetReps) : 10;

    targets.push({
      exerciseId: se.exerciseId,
      targetSets,
      targetReps,
      targetWeight,
    });
  }

  const name =
    customName?.trim() ||
    (session.notes ? `${session.notes} (Template)` : `Workout Template ${new Date().toLocaleDateString()}`);

  return createRoutine(name, `Created from workout on ${new Date(session.date).toLocaleDateString()}`, targets);
}
