import { db } from '../db';
import type { BodyWeight } from '../types';

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.settings.get(key);
  if (!row || row.value === undefined) return defaultValue;
  return row.value as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const list = await db.settings.toArray();
  const map: Record<string, unknown> = {};
  for (const s of list) {
    map[s.key] = s.value;
  }
  return map;
}

export async function logBodyWeight(valueKg: number, dateStr?: string): Promise<number> {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  // Replace or add for date
  const existing = await db.bodyWeight.where('date').equals(date).first();
  if (existing?.id) {
    await db.bodyWeight.update(existing.id, { value: valueKg });
    return existing.id;
  } else {
    const id = await db.bodyWeight.add({ date, value: valueKg });
    return Number(id);
  }
}

export async function getBodyWeightLogs(): Promise<BodyWeight[]> {
  return await db.bodyWeight.orderBy('date').reverse().toArray();
}
