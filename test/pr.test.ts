import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { e1rm, volume, checkAndRecordPRs, rebuildPRs } from '../src/lib/pr';
import type { SetRow } from '../src/lib/types';

describe('PR Calculations & Engine', () => {
  beforeEach(async () => {
    await db.prs.clear();
    await db.sets.clear();
  });

  it('calculates e1rm and volume correctly', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBe(133.3);
    expect(volume(100, 10)).toBe(1000);
  });

  it('ignores warm-ups, uncompleted sets, or 0 reps', async () => {
    const warmupSet: SetRow = {
      id: 1,
      sessionExerciseId: 1,
      exerciseId: 10,
      setNumber: 1,
      targetReps: 10,
      targetWeight: 60,
      actualReps: 10,
      actualWeight: 60,
      completed: true,
      isWarmup: true,
    };
    const prs = await checkAndRecordPRs(warmupSet);
    expect(prs).toHaveLength(0);

    const uncompletedSet: SetRow = {
      ...warmupSet,
      isWarmup: false,
      completed: false,
    };
    expect(await checkAndRecordPRs(uncompletedSet)).toHaveLength(0);

    const zeroRepSet: SetRow = {
      ...warmupSet,
      isWarmup: false,
      completed: true,
      actualReps: 0,
    };
    expect(await checkAndRecordPRs(zeroRepSet)).toHaveLength(0);
  });

  it('records first working set as breaking all 4 PR types', async () => {
    const set1: SetRow = {
      id: 101,
      sessionExerciseId: 1,
      exerciseId: 1,
      setNumber: 1,
      targetReps: 10,
      targetWeight: 80,
      actualReps: 10,
      actualWeight: 80,
      completed: true,
      isWarmup: false,
      completedAt: Date.now(),
    };

    const broken = await checkAndRecordPRs(set1);
    expect(broken).toHaveLength(4);
    const types = broken.map(p => p.type).sort();
    expect(types).toEqual(['e1rm', 'reps_at_weight', 'volume', 'weight']);

    const stored = await db.prs.where('exerciseId').equals(1).toArray();
    expect(stored).toHaveLength(4);
  });

  it('does NOT count a tie as a PR', async () => {
    const set1: SetRow = {
      id: 201,
      sessionExerciseId: 1,
      exerciseId: 2,
      setNumber: 1,
      targetReps: 5,
      targetWeight: 100,
      actualReps: 5,
      actualWeight: 100,
      completed: true,
      isWarmup: false,
      completedAt: 1000,
    };
    await checkAndRecordPRs(set1);

    // Identical performance
    const set2: SetRow = {
      ...set1,
      id: 202,
      setNumber: 2,
      completedAt: 2000,
    };
    const broken = await checkAndRecordPRs(set2);
    expect(broken).toHaveLength(0);
  });

  it('records bodyweight reps PR when weight is 0', async () => {
    const pullupSet: SetRow = {
      id: 301,
      sessionExerciseId: 1,
      exerciseId: 3, // Pull-up
      setNumber: 1,
      targetReps: 10,
      targetWeight: 0,
      actualReps: 12,
      actualWeight: 0,
      completed: true,
      isWarmup: false,
      completedAt: Date.now(),
    };

    const broken = await checkAndRecordPRs(pullupSet);
    const repsPr = broken.find(p => p.type === 'reps_at_weight');
    expect(repsPr).toBeDefined();
    expect(repsPr?.value).toBe(12);
    expect(repsPr?.weight).toBe(0);
  });

  it('rebuilds PRs accurately after a set is deleted or modified', async () => {
    const exerciseId = 5;

    // Set 1: 50kg x 10 (e1rm ~ 66.7, vol = 500)
    const set1: SetRow = {
      id: 1,
      sessionExerciseId: 1,
      exerciseId,
      setNumber: 1,
      targetReps: 10,
      targetWeight: 50,
      actualReps: 10,
      actualWeight: 50,
      completed: true,
      isWarmup: false,
      completedAt: 1000,
    };
    await db.sets.add(set1);
    await checkAndRecordPRs(set1);

    // Set 2: 70kg x 10 (PR broken in all categories)
    const set2: SetRow = {
      id: 2,
      sessionExerciseId: 1,
      exerciseId,
      setNumber: 2,
      targetReps: 10,
      targetWeight: 70,
      actualReps: 10,
      actualWeight: 70,
      completed: true,
      isWarmup: false,
      completedAt: 2000,
    };
    await db.sets.add(set2);
    await checkAndRecordPRs(set2);

    const prsBefore = await db.prs.where('exerciseId').equals(exerciseId).toArray();
    const weightPRBefore = prsBefore
      .filter(p => p.type === 'weight')
      .sort((a, b) => b.value - a.value)[0];
    expect(weightPRBefore?.value).toBe(70);

    // Delete set 2 and rebuild
    await db.sets.delete(2);
    await rebuildPRs(exerciseId);

    const prsAfter = await db.prs.where('exerciseId').equals(exerciseId).toArray();
    const weightPRAfter = prsAfter
      .filter(p => p.type === 'weight')
      .sort((a, b) => b.value - a.value)[0];
    expect(weightPRAfter?.value).toBe(50); // Reverted back to set 1
    expect(weightPRAfter?.setId).toBe(1);
  });
});
