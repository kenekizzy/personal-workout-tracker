import { db } from '../db';
import type { Session, SessionExercise, SetRow, Exercise } from '../types';

export interface HydratedSessionExercise extends SessionExercise {
  exercise?: Exercise;
  sets: SetRow[];
}

export async function getAllSessions(): Promise<Session[]> {
  return await db.sessions.orderBy('date').reverse().toArray();
}

export async function getSessionById(id: number): Promise<Session | undefined> {
  return await db.sessions.get(id);
}

export async function getActiveSession(): Promise<Session | undefined> {
  // Most recent unfinished session
  const unfinished = await db.sessions
    .filter(s => s.finished !== true)
    .reverse()
    .sortBy('date');
  return unfinished[0];
}

export async function createEmptySession(): Promise<Session> {
  const session: Session = {
    date: new Date().toISOString(),
    finished: false,
  };
  const id = await db.sessions.add(session);
  return { ...session, id: Number(id) };
}

export async function createSessionFromRoutine(routineId: number): Promise<Session> {
  const routine = await db.routines.get(routineId);
  const targets = await db.routineTargets
    .where('routineId')
    .equals(routineId)
    .sortBy('order');

  const session: Session = {
    date: new Date().toISOString(),
    routineId,
    notes: routine ? `Started from ${routine.name}` : undefined,
    finished: false,
  };

  const sessionId = Number(await db.sessions.add(session));

  for (const t of targets) {
    const sessionExerciseId = Number(
      await db.sessionExercises.add({
        sessionId,
        exerciseId: t.exerciseId,
        order: t.order,
        finished: false,
      })
    );

    for (let setIdx = 1; setIdx <= t.targetSets; setIdx++) {
      await db.sets.add({
        sessionExerciseId,
        exerciseId: t.exerciseId,
        setNumber: setIdx,
        targetReps: t.targetReps,
        targetWeight: t.targetWeight,
        actualReps: t.targetReps,
        actualWeight: t.targetWeight,
        completed: false,
        isWarmup: false,
      });
    }
  }

  return { ...session, id: sessionId };
}

export async function finishSession(id: number, notes?: string): Promise<void> {
  const session = await db.sessions.get(id);
  if (!session) return;
  const startTime = new Date(session.date).getTime();
  const now = Date.now();
  const durationSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

  await db.sessions.update(id, {
    finished: true,
    durationSeconds,
    notes: notes !== undefined ? notes : session.notes,
  });
}

export async function deleteSession(id: number): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets], async () => {
    const sessionExercises = await db.sessionExercises.where('sessionId').equals(id).toArray();
    for (const se of sessionExercises) {
      if (se.id) {
        await db.sets.where('sessionExerciseId').equals(se.id).delete();
      }
    }
    await db.sessionExercises.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}

export async function addExerciseToSession(sessionId: number, exerciseId: number): Promise<number> {
  const existing = await db.sessionExercises.where('sessionId').equals(sessionId).toArray();
  const nextOrder = existing.length > 0 ? Math.max(...existing.map(e => e.order)) + 1 : 0;

  // Check last completed set for default target reps/weight
  const lastSets = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .filter(s => s.completed && !s.isWarmup)
    .reverse()
    .sortBy('completedAt');

  const defaultWeight = lastSets.length > 0 ? lastSets[0].actualWeight : 20;
  const defaultReps = lastSets.length > 0 ? lastSets[0].actualReps : 10;

  const sessionExerciseId = Number(
    await db.sessionExercises.add({
      sessionId,
      exerciseId,
      order: nextOrder,
      finished: false,
    })
  );

  // Add 3 default sets
  for (let s = 1; s <= 3; s++) {
    await db.sets.add({
      sessionExerciseId,
      exerciseId,
      setNumber: s,
      targetReps: defaultReps,
      targetWeight: defaultWeight,
      actualReps: defaultReps,
      actualWeight: defaultWeight,
      completed: false,
      isWarmup: false,
    });
  }

  return sessionExerciseId;
}

export async function finishSessionExercise(
  sessionExerciseId: number,
  achieved: boolean
): Promise<void> {
  await db.sessionExercises.update(sessionExerciseId, {
    achieved,
    finished: true,
  });
}

export async function removeExerciseFromSession(sessionExerciseId: number): Promise<void> {
  await db.transaction('rw', [db.sessionExercises, db.sets], async () => {
    await db.sets.where('sessionExerciseId').equals(sessionExerciseId).delete();
    await db.sessionExercises.delete(sessionExerciseId);
  });
}

export async function getHydratedSession(sessionId: number): Promise<{
  session: Session;
  exercises: HydratedSessionExercise[];
} | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;

  const sExercises = await db.sessionExercises
    .where('sessionId')
    .equals(sessionId)
    .sortBy('order');

  const hydratedExercises: HydratedSessionExercise[] = [];

  for (const se of sExercises) {
    const exercise = await db.exercises.get(se.exerciseId);
    const sets = se.id
      ? await db.sets.where('sessionExerciseId').equals(se.id).sortBy('setNumber')
      : [];

    hydratedExercises.push({
      ...se,
      exercise,
      sets,
    });
  }

  return { session, exercises: hydratedExercises };
}
