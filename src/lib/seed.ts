import { db } from './db';
import type { Exercise, Routine, RoutineTarget } from './types';

export const STARTER_EXERCISES: Omit<Exercise, 'id'>[] = [
  // Chest
  { name: 'Barbell Bench Press', bodyPart: 'Chest', equipment: 'barbell', animationFile: 'bench_press.svg' },
  { name: 'Incline Dumbbell Press', bodyPart: 'Chest', equipment: 'dumbbell', animationFile: 'incline_dumbbell_press.svg' },
  { name: 'Dips', bodyPart: 'Chest', equipment: 'bodyweight', animationFile: 'dips.svg' },
  { name: 'Cable Crossover', bodyPart: 'Chest', equipment: 'cable', animationFile: 'cable_crossover.svg' },
  { name: 'Push-up', bodyPart: 'Chest', equipment: 'bodyweight', animationFile: 'push_up.svg' },
  { name: 'Dumbbell Chest Fly', bodyPart: 'Chest', equipment: 'dumbbell', animationFile: 'dumbbell_fly.svg' },

  // Back
  { name: 'Barbell Deadlift', bodyPart: 'Back', equipment: 'barbell', animationFile: 'deadlift.svg' },
  { name: 'Pull-up', bodyPart: 'Back', equipment: 'bodyweight', animationFile: 'pull_up.svg' },
  { name: 'Barbell Bent-Over Row', bodyPart: 'Back', equipment: 'barbell', animationFile: 'barbell_row.svg' },
  { name: 'Lat Pulldown', bodyPart: 'Back', equipment: 'cable', animationFile: 'lat_pulldown.svg' },
  { name: 'Seated Cable Row', bodyPart: 'Back', equipment: 'cable', animationFile: 'cable_row.svg' },
  { name: 'Face Pull', bodyPart: 'Back', equipment: 'cable', animationFile: 'face_pull.svg' },
  { name: 'Dumbbell Single-Arm Row', bodyPart: 'Back', equipment: 'dumbbell', animationFile: 'dumbbell_row.svg' },

  // Shoulders
  { name: 'Overhead Barbell Press', bodyPart: 'Shoulders', equipment: 'barbell', animationFile: 'overhead_press.svg' },
  { name: 'Dumbbell Lateral Raise', bodyPart: 'Shoulders', equipment: 'dumbbell', animationFile: 'lateral_raise.svg' },
  { name: 'Arnold Press', bodyPart: 'Shoulders', equipment: 'dumbbell', animationFile: 'arnold_press.svg' },
  { name: 'Cable Lateral Raise', bodyPart: 'Shoulders', equipment: 'cable', animationFile: 'cable_lateral_raise.svg' },
  { name: 'Reverse Pec Deck Fly', bodyPart: 'Shoulders', equipment: 'machine', animationFile: 'reverse_fly.svg' },

  // Legs
  { name: 'Barbell Back Squat', bodyPart: 'Legs', equipment: 'barbell', animationFile: 'squat.svg' },
  { name: 'Romanian Deadlift', bodyPart: 'Legs', equipment: 'barbell', animationFile: 'romanian_deadlift.svg' },
  { name: 'Leg Press', bodyPart: 'Legs', equipment: 'machine', animationFile: 'leg_press.svg' },
  { name: 'Bulgarian Split Squat', bodyPart: 'Legs', equipment: 'dumbbell', animationFile: 'split_squat.svg' },
  { name: 'Lying Leg Curl', bodyPart: 'Legs', equipment: 'machine', animationFile: 'leg_curl.svg' },
  { name: 'Leg Extension', bodyPart: 'Legs', equipment: 'machine', animationFile: 'leg_extension.svg' },
  { name: 'Standing Calf Raise', bodyPart: 'Legs', equipment: 'machine', animationFile: 'calf_raise.svg' },

  // Arms - Biceps & Triceps
  { name: 'Barbell Bicep Curl', bodyPart: 'Arms', equipment: 'barbell', animationFile: 'bicep_curl.svg' },
  { name: 'Dumbbell Hammer Curl', bodyPart: 'Arms', equipment: 'dumbbell', animationFile: 'hammer_curl.svg' },
  { name: 'Incline Dumbbell Curl', bodyPart: 'Arms', equipment: 'dumbbell', animationFile: 'incline_curl.svg' },
  { name: 'Tricep Rope Pushdown', bodyPart: 'Arms', equipment: 'cable', animationFile: 'rope_pushdown.svg' },
  { name: 'Skullcrushers', bodyPart: 'Arms', equipment: 'barbell', animationFile: 'skullcrushers.svg' },
  { name: 'Overhead Dumbbell Tricep Extension', bodyPart: 'Arms', equipment: 'dumbbell', animationFile: 'overhead_tricep.svg' },

  // Core
  { name: 'Hanging Leg Raise', bodyPart: 'Core', equipment: 'bodyweight', animationFile: 'leg_raise.svg' },
  { name: 'Cable Woodchopper', bodyPart: 'Core', equipment: 'cable', animationFile: 'woodchopper.svg' },
  { name: 'Plank', bodyPart: 'Core', equipment: 'bodyweight', animationFile: 'plank.svg' },
  { name: 'Ab Wheel Rollout', bodyPart: 'Core', equipment: 'bodyweight', animationFile: 'ab_wheel.svg' },
];

export async function seedDatabase(force = false): Promise<void> {
  const count = await db.exercises.count();
  if (count > 0 && !force) return;

  if (force) {
    await db.exercises.clear();
    await db.routines.clear();
    await db.routineTargets.clear();
  }

  // 1. Insert exercises
  const insertedIds: number[] = [];
  for (const ex of STARTER_EXERCISES) {
    const id = await db.exercises.add(ex as Exercise);
    insertedIds.push(Number(id));
  }

  // Find exercise IDs for sample routines
  const bench = await db.exercises.where('name').equals('Barbell Bench Press').first();
  const squat = await db.exercises.where('name').equals('Barbell Back Squat').first();
  const deadlift = await db.exercises.where('name').equals('Barbell Deadlift').first();
  const ohp = await db.exercises.where('name').equals('Overhead Barbell Press').first();
  const row = await db.exercises.where('name').equals('Barbell Bent-Over Row').first();
  const pullup = await db.exercises.where('name').equals('Pull-up').first();
  const lateral = await db.exercises.where('name').equals('Dumbbell Lateral Raise').first();
  const curl = await db.exercises.where('name').equals('Barbell Bicep Curl').first();
  const tricep = await db.exercises.where('name').equals('Tricep Rope Pushdown').first();

  // 2. Create Starter Routines
  // Routine 1: Push Day
  const pushRoutineId = await db.routines.add({
    name: 'Push Day (Chest / Shoulders / Triceps)',
    notes: 'Compound upper-body pushing workout with progressive overload.',
  } as Routine);

  if (bench && ohp && lateral && tricep) {
    const pushTargets: Omit<RoutineTarget, 'id'>[] = [
      { routineId: Number(pushRoutineId), exerciseId: bench.id!, order: 0, targetSets: 4, targetReps: 8, targetWeight: 60 },
      { routineId: Number(pushRoutineId), exerciseId: ohp.id!, order: 1, targetSets: 3, targetReps: 8, targetWeight: 40 },
      { routineId: Number(pushRoutineId), exerciseId: lateral.id!, order: 2, targetSets: 3, targetReps: 12, targetWeight: 10 },
      { routineId: Number(pushRoutineId), exerciseId: tricep.id!, order: 3, targetSets: 3, targetReps: 12, targetWeight: 25 },
    ];
    for (const t of pushTargets) await db.routineTargets.add(t as RoutineTarget);
  }

  // Routine 2: Pull Day
  const pullRoutineId = await db.routines.add({
    name: 'Pull Day (Back & Biceps)',
    notes: 'Heavy back builder focused on lats, mid-back, and biceps.',
  } as Routine);

  if (deadlift && pullup && row && curl) {
    const pullTargets: Omit<RoutineTarget, 'id'>[] = [
      { routineId: Number(pullRoutineId), exerciseId: deadlift.id!, order: 0, targetSets: 3, targetReps: 5, targetWeight: 100 },
      { routineId: Number(pullRoutineId), exerciseId: pullup.id!, order: 1, targetSets: 3, targetReps: 8, targetWeight: 0 },
      { routineId: Number(pullRoutineId), exerciseId: row.id!, order: 2, targetSets: 3, targetReps: 8, targetWeight: 60 },
      { routineId: Number(pullRoutineId), exerciseId: curl.id!, order: 3, targetSets: 3, targetReps: 10, targetWeight: 25 },
    ];
    for (const t of pullTargets) await db.routineTargets.add(t as RoutineTarget);
  }

  // Routine 3: Leg Day
  const legRoutineId = await db.routines.add({
    name: 'Leg Day (Quads / Glutes / Hamstrings)',
    notes: 'High-intensity lower body strength and hypertrophy.',
  } as Routine);

  if (squat) {
    const legTargets: Omit<RoutineTarget, 'id'>[] = [
      { routineId: Number(legRoutineId), exerciseId: squat.id!, order: 0, targetSets: 4, targetReps: 8, targetWeight: 80 },
    ];
    for (const t of legTargets) await db.routineTargets.add(t as RoutineTarget);
  }

  // 3. Set default settings
  await db.settings.put({ key: 'unit', value: 'kg' });
  await db.settings.put({ key: 'restTimerDefaultSeconds', value: 90 });
  await db.settings.put({ key: 'hapticsEnabled', value: true });
  await db.settings.put({ key: 'audioEnabled', value: true });
  await db.settings.put({ key: 'lastBackupAt', value: null });
}
