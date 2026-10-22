import { db } from './db';
import type { SetRow, PRType } from './types';

/** Epley estimated 1RM. A single rep is its own 1RM. */
export const e1rm = (weight: number, reps: number): number =>
  reps <= 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10;

export const volume = (weight: number, reps: number): number =>
  Math.round(weight * reps * 10) / 10;

export interface NewPR {
  type: PRType;
  value: number;
  weight: number;
  reps: number;
}

/**
 * Call when a working set is marked complete.
 * Returns the PRs it broke (empty array if none) so the UI can celebrate.
 */
export async function checkAndRecordPRs(set: SetRow): Promise<NewPR[]> {
  if (set.isWarmup || !set.completed || set.actualReps < 1) return [];

  const { exerciseId, actualWeight: w, actualReps: r, id: setId } = set;

  const candidates: NewPR[] = [
    { type: 'weight', value: w, weight: w, reps: r },
    { type: 'e1rm', value: e1rm(w, r), weight: w, reps: r },
    { type: 'volume', value: volume(w, r), weight: w, reps: r },
    { type: 'reps_at_weight', value: r, weight: w, reps: r },
  ];

  const broken: NewPR[] = [];

  await db.transaction('rw', db.prs, async () => {
    for (const c of candidates) {
      const existing = await db.prs
        .where('[exerciseId+type]')
        .equals([exerciseId, c.type])
        .toArray();

      // reps_at_weight is tracked per weight; the others are one record per exercise
      const pool =
        c.type === 'reps_at_weight'
          ? existing.filter(p => p.weight === c.weight)
          : existing;

      const best = pool.reduce((m, p) => Math.max(m, p.value), 0);
      if (c.value > best) {
        await db.prs.add({
          exerciseId,
          type: c.type,
          value: c.value,
          weight: c.weight,
          reps: c.reps,
          setId: setId ?? 0,
          date: set.completedAt || Date.now(),
        } as never);
        broken.push(c);
      }
    }
  });

  return broken;
}

/**
 * Call after editing or deleting a completed set.
 * Rebuilds all PRs for an exercise from the remaining sets,
 * so a deleted PR set cannot leave a stale record behind.
 */
export async function rebuildPRs(exerciseId: number): Promise<void> {
  await db.prs.where('exerciseId').equals(exerciseId).delete();
  const sets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter(s => s.completed && !s.isWarmup && s.actualReps >= 1)
    .sortBy('completedAt');

  for (const s of sets) {
    await checkAndRecordPRs(s);
  }
}
