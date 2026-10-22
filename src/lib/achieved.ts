import type { SetRow } from './types';

/** Achieved = every working set completed at or above target reps and weight. */
export function isAchieved(sets: SetRow[]): boolean {
  const working = sets.filter(s => !s.isWarmup);
  if (working.length === 0) return false;
  return working.every(
    s =>
      s.completed &&
      s.actualReps >= s.targetReps &&
      s.actualWeight >= s.targetWeight
  );
}

export interface AchievedStats {
  totalWorking: number;
  completedWorking: number;
  metTargetWorking: number;
  achieved: boolean;
}

export function getAchievedStats(sets: SetRow[]): AchievedStats {
  const working = sets.filter(s => !s.isWarmup);
  const completedWorking = working.filter(s => s.completed);
  const metTargetWorking = working.filter(
    s => s.completed && s.actualReps >= s.targetReps && s.actualWeight >= s.targetWeight
  );

  return {
    totalWorking: working.length,
    completedWorking: completedWorking.length,
    metTargetWorking: metTargetWorking.length,
    achieved: working.length > 0 && metTargetWorking.length === working.length,
  };
}
