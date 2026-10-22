import { db } from '../db';
import type { Exercise } from '../types';

export async function getAllExercises(): Promise<Exercise[]> {
  return await db.exercises.orderBy('name').toArray();
}

export async function getExerciseById(id: number): Promise<Exercise | undefined> {
  return await db.exercises.get(id);
}

export async function getExercisesByBodyPart(bodyPart: string): Promise<Exercise[]> {
  if (!bodyPart || bodyPart === 'All') {
    return await getAllExercises();
  }
  return await db.exercises.where('bodyPart').equalsIgnoreCase(bodyPart).toArray();
}

export async function searchExercises(query: string, bodyPart?: string): Promise<Exercise[]> {
  let list = await getAllExercises();
  if (bodyPart && bodyPart !== 'All') {
    list = list.filter(e => e.bodyPart.toLowerCase() === bodyPart.toLowerCase());
  }
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    list = list.filter(e => e.name.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q));
  }
  return list;
}

export async function createExercise(exercise: Omit<Exercise, 'id'>): Promise<number> {
  const id = await db.exercises.add(exercise as Exercise);
  return Number(id);
}

export async function updateExercise(id: number, changes: Partial<Exercise>): Promise<void> {
  await db.exercises.update(id, changes);
}

export async function deleteExercise(id: number): Promise<void> {
  await db.transaction('rw', [db.exercises, db.sets, db.prs, db.routineTargets, db.sessionExercises], async () => {
    await db.exercises.delete(id);
    await db.prs.where('exerciseId').equals(id).delete();
    await db.routineTargets.where('exerciseId').equals(id).delete();
  });
}
