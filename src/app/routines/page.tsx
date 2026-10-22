'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Layers,
  Trash2,
  Pencil,
  X,
  Dumbbell,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getAllRoutines,
  createRoutine,
  updateRoutine,
  saveRoutineTargets,
  deleteRoutine,
  type HydratedRoutine,
} from '../../lib/data/routines';
import { createSessionFromRoutine } from '../../lib/data/sessions';
import { getAllExercises } from '../../lib/data/exercises';
import { formatWeight, type WeightUnit } from '../../lib/units';
import { getSetting } from '../../lib/data/settings';
import type { Exercise } from '../../lib/types';

interface RoutineTargetFormItem {
  exerciseId: number;
  targetSets: string | number;
  targetReps: string | number;
  targetWeight: string | number;
}

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<HydratedRoutine[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);

  // Modal State: 'create' | 'edit' | null
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);

  // Form State
  const [routineName, setRoutineName] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<RoutineTargetFormItem[]>([]);

  const loadData = async () => {
    try {
      const [rList, exList, userUnit] = await Promise.all([
        getAllRoutines(),
        getAllExercises(),
        getSetting<WeightUnit>('unit', 'kg'),
      ]);
      setRoutines(rList);
      setAllExercises(exList);
      setUnit(userUnit);
    } catch (err) {
      console.error('Error loading routines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartRoutine = async (routineId: number) => {
    const session = await createSessionFromRoutine(routineId);
    router.push(`/session?id=${session.id}`);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingRoutineId(null);
    setRoutineName('');
    setRoutineNotes('');
    setSelectedTargets([]);
  };

  const handleOpenEditModal = (routine: HydratedRoutine) => {
    setModalMode('edit');
    setEditingRoutineId(routine.id!);
    setRoutineName(routine.name);
    setRoutineNotes(routine.notes || '');
    setSelectedTargets(
      routine.targets.map(t => ({
        exerciseId: t.exerciseId,
        targetSets: t.targetSets,
        targetReps: t.targetReps,
        targetWeight: t.targetWeight,
      }))
    );
  };

  const handleDeleteRoutine = async (routineId: number) => {
    if (confirm('Are you sure you want to delete this routine template?')) {
      await deleteRoutine(routineId);
      await loadData();
    }
  };

  const handleAddExerciseToRoutine = (exerciseId: number) => {
    setSelectedTargets(prev => [
      ...prev,
      { exerciseId, targetSets: '3', targetReps: '10', targetWeight: '20' },
    ]);
  };

  const handleUpdateTarget = (index: number, patch: Partial<RoutineTargetFormItem>) => {
    setSelectedTargets(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleRemoveTarget = (index: number) => {
    setSelectedTargets(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim() || selectedTargets.length === 0) return;

    // Sanitize string/empty inputs into numbers
    const sanitizedTargets = selectedTargets.map(t => ({
      exerciseId: t.exerciseId,
      targetSets: Math.max(1, parseInt(String(t.targetSets), 10) || 1),
      targetReps: Math.max(1, parseInt(String(t.targetReps), 10) || 1),
      targetWeight: Math.max(0, parseFloat(String(t.targetWeight)) || 0),
    }));

    if (modalMode === 'edit' && editingRoutineId) {
      await updateRoutine(
        editingRoutineId,
        routineName.trim(),
        routineNotes.trim() || undefined
      );
      await saveRoutineTargets(editingRoutineId, sanitizedTargets);
    } else {
      await createRoutine(
        routineName.trim(),
        routineNotes.trim() || undefined,
        sanitizedTargets
      );
    }

    setModalMode(null);
    setEditingRoutineId(null);
    await loadData();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Routines</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{routines.length} saved templates</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Routine</span>
        </button>
      </header>

      {/* Routine Cards */}
      <div className="space-y-3">
        {routines.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-2">
            <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No workout routines created yet.</p>
          </div>
        ) : (
          routines.map(r => (
            <div
              key={r.id}
              className="p-4 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-3.5 shadow-md hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">{r.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md">
                      {r.targets.length} exercises
                    </span>
                  </div>
                  {r.notes && <p className="text-xs text-zinc-400 mt-0.5">{r.notes}</p>}
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(r)}
                    className="p-2 text-zinc-400 hover:text-emerald-400 rounded-xl hover:bg-zinc-800 transition-colors"
                    title="Edit routine"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoutine(r.id!)}
                    className="p-2 text-zinc-400 hover:text-rose-400 rounded-xl hover:bg-zinc-800 transition-colors"
                    title="Delete routine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Target exercises list */}
              <div className="space-y-1.5 pt-1">
                {r.targets.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs"
                  >
                    <span className="font-semibold text-zinc-300">
                      {t.exercise?.name || 'Exercise'}
                    </span>
                    <span className="font-mono text-zinc-400">
                      {t.targetSets} sets × {t.targetReps} reps @ {formatWeight(t.targetWeight, unit)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Start Workout Button */}
              <button
                onClick={() => handleStartRoutine(r.id!)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Workout</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Routine Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  {modalMode === 'edit' ? 'Edit Routine' : 'Create Routine'}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {modalMode === 'edit'
                    ? 'Modify routine targets and exercises'
                    : 'Set up your workout template'}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoutine} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Routine Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upper Body Power"
                  value={routineName}
                  onChange={e => setRoutineName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Strength focus: 3-5 minute rests"
                  value={routineNotes}
                  onChange={e => setRoutineNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Target builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Routine Exercises ({selectedTargets.length})
                  </label>
                </div>

                {selectedTargets.map((t, idx) => {
                  const ex = allExercises.find(e => e.id === t.exerciseId);
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2.5 text-xs shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-zinc-800 text-zinc-400 font-mono text-[10px] rounded-md flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white">{ex?.name || 'Exercise'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTarget(idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400 rounded-md transition-colors"
                          title="Remove exercise"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Sets input - cleanable */}
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 block mb-0.5 uppercase tracking-wider">
                            Sets
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={t.targetSets}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdateTarget(idx, { targetSets: val });
                            }}
                            onBlur={() => {
                              if (!t.targetSets || Number(t.targetSets) < 1) {
                                handleUpdateTarget(idx, { targetSets: 1 });
                              }
                            }}
                            placeholder="Sets"
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Reps input - cleanable */}
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 block mb-0.5 uppercase tracking-wider">
                            Reps
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={t.targetReps}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdateTarget(idx, { targetReps: val });
                            }}
                            onBlur={() => {
                              if (!t.targetReps || Number(t.targetReps) < 1) {
                                handleUpdateTarget(idx, { targetReps: 1 });
                              }
                            }}
                            placeholder="Reps"
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Weight input - cleanable */}
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 block mb-0.5 uppercase tracking-wider">
                            {unit.toUpperCase()}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={t.targetWeight}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              const parts = val.split('.');
                              const cleanVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : val;
                              handleUpdateTarget(idx, { targetWeight: cleanVal });
                            }}
                            onBlur={() => {
                              if (t.targetWeight === '' || isNaN(Number(t.targetWeight))) {
                                handleUpdateTarget(idx, { targetWeight: 0 });
                              }
                            }}
                            placeholder="Kg"
                            className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Exercise Picker */}
                <div>
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        handleAddExerciseToRoutine(parseInt(e.target.value, 10));
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="" disabled>
                      + Add Exercise to Template...
                    </option>
                    {allExercises.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.bodyPart})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTargets.length === 0}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {modalMode === 'edit' ? 'Update Routine' : 'Save Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
