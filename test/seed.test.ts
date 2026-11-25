import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/lib/db';
import { STARTER_EXERCISES, seedDatabase, syncStarterAnimations } from '../src/lib/seed';

describe('Starter Exercises & Animations', () => {
  beforeEach(async () => {
    await db.exercises.clear();
    await db.routines.clear();
    await db.routineTargets.clear();
    await db.settings.clear();
  });

  it('has a valid local animation file for every starter exercise', () => {
    const animationsDir = path.resolve(process.cwd(), 'public', 'animations');
    expect(STARTER_EXERCISES).toHaveLength(35);

    for (const ex of STARTER_EXERCISES) {
      expect(ex.animationFile).toBeTruthy();
      expect(ex.animationFile!.endsWith('.gif')).toBe(true);

      const filePath = path.join(animationsDir, ex.animationFile!);
      expect(fs.existsSync(filePath), `Missing animation file: ${ex.animationFile}`).toBe(true);

      const buf = fs.readFileSync(filePath);
      expect(buf.length).toBeGreaterThan(1024);
      const header = buf.subarray(0, 6).toString('ascii');
      expect(['GIF89a', 'GIF87a']).toContain(header);
    }
  });

  it('seeds all starter exercises with gif animations on fresh database', async () => {
    await seedDatabase();
    const exercises = await db.exercises.toArray();
    expect(exercises).toHaveLength(STARTER_EXERCISES.length);
    for (const ex of exercises) {
      expect(ex.animationFile).toMatch(/\.gif$/);
    }
  });

  it('non-destructively upgrades legacy .svg starter animations on existing databases', async () => {
    const benchId = Number(
      await db.exercises.add({
        name: 'Barbell Bench Press',
        bodyPart: 'Chest',
        equipment: 'barbell',
        animationFile: 'bench_press.svg',
      })
    );
    const customId = Number(
      await db.exercises.add({
        name: 'My Custom Lift',
        bodyPart: 'Back',
        equipment: 'cable',
        animationFile: 'custom_lift.mp4',
      })
    );

    await seedDatabase();

    const bench = await db.exercises.get(benchId);
    const custom = await db.exercises.get(customId);
    expect(bench?.animationFile).toBe('bench_press.gif');
    expect(custom?.animationFile).toBe('custom_lift.mp4');
  });

  it('does not overwrite custom non-svg animation on starter exercise', async () => {
    const squatId = Number(
      await db.exercises.add({
        name: 'Barbell Back Squat',
        bodyPart: 'Legs',
        equipment: 'barbell',
        animationFile: 'my_squat.mp4',
      })
    );

    await syncStarterAnimations();

    const squat = await db.exercises.get(squatId);
    expect(squat?.animationFile).toBe('my_squat.mp4');
  });
});
