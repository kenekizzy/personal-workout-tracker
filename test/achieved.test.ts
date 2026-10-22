import { describe, it, expect } from 'vitest';
import { isAchieved, getAchievedStats } from '../src/lib/achieved';
import type { SetRow } from '../src/lib/types';

describe('achieved logic', () => {
  it('returns false if there are no working sets', () => {
    const sets: SetRow[] = [
      {
        id: 1,
        sessionExerciseId: 1,
        exerciseId: 1,
        setNumber: 1,
        targetReps: 10,
        targetWeight: 50,
        actualReps: 10,
        actualWeight: 50,
        completed: true,
        isWarmup: true,
      },
    ];
    expect(isAchieved(sets)).toBe(false);
  });

  it('returns true when all working sets match or exceed targets', () => {
    const sets: SetRow[] = [
      {
        id: 1,
        sessionExerciseId: 1,
        exerciseId: 1,
        setNumber: 1,
        targetReps: 8,
        targetWeight: 60,
        actualReps: 8,
        actualWeight: 60,
        completed: true,
        isWarmup: false,
      },
      {
        id: 2,
        sessionExerciseId: 1,
        exerciseId: 1,
        setNumber: 2,
        targetReps: 8,
        targetWeight: 60,
        actualReps: 9,
        actualWeight: 62.5,
        completed: true,
        isWarmup: false,
      },
    ];
    expect(isAchieved(sets)).toBe(true);
  });

  it('returns false when any working set falls below target reps or weight or is uncompleted', () => {
    const sets: SetRow[] = [
      {
        id: 1,
        sessionExerciseId: 1,
        exerciseId: 1,
        setNumber: 1,
        targetReps: 8,
        targetWeight: 60,
        actualReps: 8,
        actualWeight: 60,
        completed: true,
        isWarmup: false,
      },
      {
        id: 2,
        sessionExerciseId: 1,
        exerciseId: 1,
        setNumber: 2,
        targetReps: 8,
        targetWeight: 60,
        actualReps: 7, // missed rep
        actualWeight: 60,
        completed: true,
        isWarmup: false,
      },
    ];
    expect(isAchieved(sets)).toBe(false);

    const stats = getAchievedStats(sets);
    expect(stats.totalWorking).toBe(2);
    expect(stats.completedWorking).toBe(2);
    expect(stats.metTargetWorking).toBe(1);
    expect(stats.achieved).toBe(false);
  });
});
