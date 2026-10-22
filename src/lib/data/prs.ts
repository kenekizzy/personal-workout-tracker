import { db } from '../db';
import type { PR, PRType, Exercise } from '../types';

export interface HydratedPR extends PR {
  exercise?: Exercise;
}

export async function getPRsForExercise(exerciseId: number): Promise<PR[]> {
  return await db.prs.where('exerciseId').equals(exerciseId).sortBy('date');
}

export async function getBestPRsForExercise(
  exerciseId: number
): Promise<{
  weight?: PR;
  e1rm?: PR;
  volume?: PR;
  repsAtWeight: PR[];
}> {
  const all = await db.prs.where('exerciseId').equals(exerciseId).toArray();

  const weightPRs = all.filter(p => p.type === 'weight');
  const e1rmPRs = all.filter(p => p.type === 'e1rm');
  const volumePRs = all.filter(p => p.type === 'volume');
  const repsPRs = all.filter(p => p.type === 'reps_at_weight');

  const bestWeight = weightPRs.sort((a, b) => b.value - a.value)[0];
  const bestE1rm = e1rmPRs.sort((a, b) => b.value - a.value)[0];
  const bestVolume = volumePRs.sort((a, b) => b.value - a.value)[0];

  // Best reps grouped by distinct weight
  const repsByWeightMap = new Map<number, PR>();
  for (const pr of repsPRs) {
    const existing = repsByWeightMap.get(pr.weight);
    if (!existing || pr.value > existing.value) {
      repsByWeightMap.set(pr.weight, pr);
    }
  }

  const bestRepsAtWeight = Array.from(repsByWeightMap.values()).sort(
    (a, b) => b.weight - a.weight
  );

  return {
    weight: bestWeight,
    e1rm: bestE1rm,
    volume: bestVolume,
    repsAtWeight: bestRepsAtWeight,
  };
}

export async function getPRTimeline(exerciseId: number, type: PRType): Promise<PR[]> {
  const all = await db.prs
    .where('[exerciseId+type]')
    .equals([exerciseId, type])
    .sortBy('date');
  return all;
}

export async function getAllRecentPRs(limit = 10): Promise<HydratedPR[]> {
  const recent = await db.prs.orderBy('date').reverse().limit(limit).toArray();
  const hydrated: HydratedPR[] = [];

  for (const pr of recent) {
    const exercise = await db.exercises.get(pr.exerciseId);
    hydrated.push({ ...pr, exercise });
  }

  return hydrated;
}
