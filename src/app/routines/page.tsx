'use client';

import { useEffect, useState, useRef } from 'react';
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
  Download,
  Upload,
  Share2,
  Copy,
  FileDown,
  Sparkles,
} from 'lucide-react';
import {
  getAllRoutines,
  createRoutine,
  updateRoutine,
  saveRoutineTargets,
  deleteRoutine,
  exportRoutineToJson,
  exportAllRoutinesToJson,
  formatRoutineAsText,
  importRoutineFromJson,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [routines, setRoutines] = useState<HydratedRoutine[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);

  // Modal State: 'create' | 'edit' | null
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);

  // Export Modal State
  const [exportRoutineTarget, setExportRoutineTarget] = useState<HydratedRoutine | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [routineName, setRoutineName] = useState('');
  const [routineNotes, setRoutineNotes] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<RoutineTargetFormItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  };

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
      showToast('Routine deleted.');
    }
  };

  const handleDownloadRoutineJson = (routine: HydratedRoutine) => {
    exportRoutineToJson(routine);
    showToast(`Exported "${routine.name}" as JSON.`);
    setExportRoutineTarget(null);
  };

  const handleCopyRoutineSummary = async (routine: HydratedRoutine) => {
    const summary = formatRoutineAsText(routine, unit);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(summary);
        showToast('Routine copied to clipboard!');
      } catch {
        showToast('Could not copy automatically. Check permissions.');
      }
    }
    setExportRoutineTarget(null);
  };

  const handleExportAll = async () => {
    if (routines.length === 0) {
      showToast('No routines to export.');
      return;
    }
    await exportAllRoutinesToJson();
    showToast(`Exported all ${routines.length} routines.`);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importRoutineFromJson(text);
      if (result.success) {
        showToast(result.message);
        await loadData();
      } else {
        alert(result.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reading routine file.';
      alert(msg);
    } finally {
      if (e.target) e.target.value = '';
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
      showToast('Routine updated successfully.');
    } else {
      await createRoutine(
        routineName.trim(),
        routineNotes.trim() || undefined,
        sanitizedTargets
      );
      showToast('Routine created successfully.');
    }

    setModalMode(null);
    setEditingRoutineId(null);
    await loadData();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-36">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file input for routine import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        className="hidden"
        onChange={handleImportFileChange}
      />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Routines</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{routines.length} saved templates</p>
        </div>

        {/* Global Routine Actions: Import, Export All, New Routine */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Import routine from JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import</span>
          </button>

          {routines.length > 0 && (
            <button
              onClick={handleExportAll}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Export all routines to a backup file"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Export All</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Routine</span>
          </button>
        </div>
      </header>

      {/* Routine Cards */}
      <div className="space-y-3">
        {routines.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
            <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No workout routines created yet.</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-emerald-500 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Create Routine
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Import JSON
              </button>
            </div>
          </div>
        ) : (
          routines.map(r => (
            <div
              key={r.id}
              className="p-4 sm:p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-3.5 shadow-md hover:border-zinc-700 transition-all"
            >
              {/* Routine Card Header: Distortion-free layout */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-white break-words">
                      {r.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md shrink-0 whitespace-nowrap">
                      {r.targets.length} {r.targets.length === 1 ? 'exercise' : 'exercises'}
                    </span>
                  </div>
                  {r.notes && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {r.notes}
                    </p>
                  )}
                </div>

                {/* Actions: Export, Edit, Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setExportRoutineTarget(r)}
                    className="p-2 text-zinc-400 hover:text-emerald-400 rounded-xl hover:bg-zinc-800 transition-colors"
                    title="Export routine"
                  >
                    <Download className="w-4 h-4" />
                  </button>
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
                    className="flex items-center justify-between gap-3 p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80 text-xs"
                  >
                    <span className="font-semibold text-zinc-300 truncate min-w-0">
                      {t.exercise?.name || 'Exercise'}
                    </span>
                    <span className="font-mono text-zinc-400 shrink-0 whitespace-nowrap text-right">
                      {t.targetSets}s × {t.targetReps}r @ {formatWeight(t.targetWeight, unit)}
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

      {/* Export Routine Modal Dialog */}
      {exportRoutineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-black text-white">Export Routine</h2>
                <p className="text-xs text-zinc-400 truncate max-w-[220px]">
                  {exportRoutineTarget.name}
                </p>
              </div>
              <button
                onClick={() => setExportRoutineTarget(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Export this template to share with friends, backup separately, or copy as a formatted text workout plan.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleDownloadRoutineJson(exportRoutineTarget)}
                className="w-full p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 flex items-center gap-3 text-left transition-colors group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Download JSON File</h4>
                  <p className="text-[10px] text-zinc-400">
                    Saves as an importable .json routine template
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleCopyRoutineSummary(exportRoutineTarget)}
                className="w-full p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 flex items-center gap-3 text-left transition-colors group"
              >
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Copy Workout Plan</h4>
                  <p className="text-[10px] text-zinc-400">
                    Copies formatted text summary to clipboard
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setExportRoutineTarget(null)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Routine Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm max-h-[90dvh] sm:max-h-[85vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
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
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoutine} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Form Body */}
              <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4 pr-1 overscroll-contain touch-scroll">
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
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                            <span className="w-5 h-5 bg-zinc-800 text-zinc-400 font-mono text-[10px] rounded-md flex items-center justify-center font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-white truncate">
                              {ex?.name || 'Exercise'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTarget(idx)}
                            className="p-1 text-zinc-500 hover:text-rose-400 rounded-md transition-colors shrink-0"
                            title="Remove exercise"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {/* Sets input */}
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

                          {/* Reps input */}
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

                          {/* Weight input */}
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
                              placeholder="0"
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
              </div>

              {/* Fixed Sticky Footer Actions */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800 shrink-0 bg-zinc-900 mt-auto">
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
