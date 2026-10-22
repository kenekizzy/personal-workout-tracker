'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play, Layers, Trash2, Edit3, X, Dumbbell, Check } from 'lucide-react';
import {
  getAllRoutines,
  createRoutine,
  deleteRoutine,
  type HydratedRoutine,
} from '../../lib/data/routines';
import { createSessionFromRoutine } from '../../lib/data/sessions';
import { getAllExercises } from '../../lib/data/exercises';
import { formatWeight, type WeightUnit } from '../../lib/units';
import { getSetting } from '../../lib/data/settings';
import type { Exercise } from '../../lib/types';

interface NewRoutineTargetItem {
  exerciseId: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
}

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<HydratedRoutine[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);

  // New Routine Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<NewRoutineTargetItem[]>([]);

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

  const handleDeleteRoutine = async (routineId: number) => {
    if (confirm('Delete this routine template?')) {
      await deleteRoutine(routineId);
      await loadData();
    }
  };

  const handleAddExerciseToRoutine = (exerciseId: number) => {
    setSelectedTargets(prev => [
      ...prev,
      { exerciseId, targetSets: 3, targetReps: 10, targetWeight: 20 },
    ]);
  };

  const handleUpdateTarget = (index: number, patch: Partial<NewRoutineTargetItem>) => {
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

    await createRoutine(
      routineName.trim(),
      routineNotes.trim() || undefined,
      selectedTargets
    );

    setRoutineName('');
    setRoutineNotes('');
    setSelectedTargets([]);
    setShowCreateModal(false);
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
          onClick={() => setShowCreateModal(true)}
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
              className="p-4 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-white">{r.name}</h3>
                  {r.notes && <p className="text-xs text-zinc-400 mt-0.5">{r.notes}</p>}
                </div>
                <button
                  onClick={() => handleDeleteRoutine(r.id!)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                  title="Delete routine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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

      {/* Create New Routine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-white">Create Routine</h2>
              <button
                onClick={() => setShowCreateModal(false)}
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
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
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
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
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
                      className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{ex?.name || 'Exercise'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTarget(idx)}
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Sets</span>
                          <input
                            type="number"
                            min="1"
                            value={t.targetSets}
                            onChange={e =>
                              handleUpdateTarget(idx, {
                                targetSets: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Reps</span>
                          <input
                            type="number"
                            min="1"
                            value={t.targetReps}
                            onChange={e =>
                              handleUpdateTarget(idx, {
                                targetReps: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-center"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block mb-0.5">Kg</span>
                          <input
                            type="number"
                            min="0"
                            step="2.5"
                            value={t.targetWeight}
                            onChange={e =>
                              handleUpdateTarget(idx, {
                                targetWeight: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-center"
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
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
                  onClick={() => setShowCreateModal(false)}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedTargets.length === 0}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  Save Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
