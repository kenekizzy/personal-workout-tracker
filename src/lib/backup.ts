import { db } from './db';
import type {
  Exercise,
  Routine,
  RoutineTarget,
  Session,
  SessionExercise,
  SetRow,
  PR,
  BodyWeight,
  Setting,
} from './types';

export interface BackupData {
  version: 1;
  app: 'workout-tracker';
  exportedAt: string;
  tables: {
    exercises: Exercise[];
    routines: Routine[];
    routineTargets: RoutineTarget[];
    sessions: Session[];
    sessionExercises: SessionExercise[];
    sets: SetRow[];
    prs: PR[];
    bodyWeight: BodyWeight[];
    settings: Setting[];
  };
}

/** Exports all IndexedDB tables into a JSON string and triggers download */
export async function exportDatabaseToJson(): Promise<void> {
  const [
    exercises,
    routines,
    routineTargets,
    sessions,
    sessionExercises,
    sets,
    prs,
    bodyWeight,
    settings,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.routineTargets.toArray(),
    db.sessions.toArray(),
    db.sessionExercises.toArray(),
    db.sets.toArray(),
    db.prs.toArray(),
    db.bodyWeight.toArray(),
    db.settings.toArray(),
  ]);

  const backup: BackupData = {
    version: 1,
    app: 'workout-tracker',
    exportedAt: new Date().toISOString(),
    tables: {
      exercises,
      routines,
      routineTargets,
      sessions,
      sessionExercises,
      sets,
      prs,
      bodyWeight,
      settings,
    },
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `workout-backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Update last backup timestamp
  await db.settings.put({ key: 'lastBackupAt', value: Date.now() });
}

/** Validates and restores database from a JSON backup */
export async function importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString) as BackupData;

    if (!data || data.app !== 'workout-tracker' || !data.tables) {
      throw new Error('Invalid backup file format.');
    }

    const {
      exercises = [],
      routines = [],
      routineTargets = [],
      sessions = [],
      sessionExercises = [],
      sets = [],
      prs = [],
      bodyWeight = [],
      settings = [],
    } = data.tables;

    await db.transaction(
      'rw',
      [
        db.exercises,
        db.routines,
        db.routineTargets,
        db.sessions,
        db.sessionExercises,
        db.sets,
        db.prs,
        db.bodyWeight,
        db.settings,
      ],
      async () => {
        // Clear all tables
        await Promise.all([
          db.exercises.clear(),
          db.routines.clear(),
          db.routineTargets.clear(),
          db.sessions.clear(),
          db.sessionExercises.clear(),
          db.sets.clear(),
          db.prs.clear(),
          db.bodyWeight.clear(),
          db.settings.clear(),
        ]);

        // Bulk insert records
        if (exercises.length > 0) await db.exercises.bulkAdd(exercises);
        if (routines.length > 0) await db.routines.bulkAdd(routines);
        if (routineTargets.length > 0) await db.routineTargets.bulkAdd(routineTargets);
        if (sessions.length > 0) await db.sessions.bulkAdd(sessions);
        if (sessionExercises.length > 0) await db.sessionExercises.bulkAdd(sessionExercises);
        if (sets.length > 0) await db.sets.bulkAdd(sets);
        if (prs.length > 0) await db.prs.bulkAdd(prs);
        if (bodyWeight.length > 0) await db.bodyWeight.bulkAdd(bodyWeight);
        if (settings.length > 0) await db.settings.bulkAdd(settings);

        await db.settings.put({ key: 'lastBackupAt', value: Date.now() });
      }
    );

    return { success: true, message: 'Database restored successfully.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to import backup.';
    return { success: false, message: msg };
  }
}

/** Exports completed sets as a CSV file for spreadsheets */
export async function exportSetsToCsv(): Promise<void> {
  const sets = await db.sets.toArray();
  const exercises = await db.exercises.toArray();
  const sessionExercises = await db.sessionExercises.toArray();
  const sessions = await db.sessions.toArray();

  const exMap = new Map(exercises.map(e => [e.id!, e.name]));
  const seMap = new Map(sessionExercises.map(se => [se.id!, se.sessionId]));
  const sessMap = new Map(sessions.map(s => [s.id!, s.date]));

  const headers = ['Date', 'Exercise', 'Set Number', 'Type', 'Target Reps', 'Target Weight (kg)', 'Actual Reps', 'Actual Weight (kg)', 'Completed', 'Completed At'];
  const rows: string[] = [headers.join(',')];

  for (const s of sets) {
    const sessionId = seMap.get(s.sessionExerciseId);
    const date = sessionId ? sessMap.get(sessionId) || '' : '';
    const exName = `"${(exMap.get(s.exerciseId) || 'Unknown').replace(/"/g, '""')}"`;
    const setType = s.isWarmup ? 'Warmup' : 'Working';
    const completedAtStr = s.completedAt ? new Date(s.completedAt).toISOString() : '';

    rows.push([
      date,
      exName,
      s.setNumber,
      setType,
      s.targetReps,
      s.targetWeight,
      s.actualReps,
      s.actualWeight,
      s.completed ? 'Yes' : 'No',
      completedAtStr,
    ].join(','));
  }

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `workout-sets-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Check if backup reminder should be shown */
export async function checkBackupNudgeNeeded(): Promise<boolean> {
  const sessionCount = await db.sessions.count();
  if (sessionCount === 0) return false;

  const lastBackupSetting = await db.settings.get('lastBackupAt');
  if (!lastBackupSetting || !lastBackupSetting.value) return true;

  const lastBackupEpoch = Number(lastBackupSetting.value);
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - lastBackupEpoch > SEVEN_DAYS_MS;
}
