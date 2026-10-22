'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  Timer,
  Award,
  Trash2,
  ExternalLink,
  Check,
  X,
  Search,
} from 'lucide-react';
import {
  getHydratedSession,
  finishSession,
  deleteSession,
  addExerciseToSession,
  finishSessionExercise,
  removeExerciseFromSession,
  type HydratedSessionExercise,
} from '../../lib/data/sessions';
import {
  addSet,
  updateSet,
  toggleCompleteSet,
  deleteSet,
  getLastTimeSets,
} from '../../lib/data/sets';
import { getAllExercises } from '../../lib/data/exercises';
import { getSetting } from '../../lib/data/settings';
import { formatWeight, type WeightUnit } from '../../lib/units';
import { SetRow } from '../../components/SetRow';
import { RestTimer } from '../../components/RestTimer';
import { PRBadge } from '../../components/PRBadge';
import { AchievedSummary } from '../../components/AchievedSummary';
import { WakeLockManager } from '../../components/WakeLockManager';
import type { Session, SetRow as SetRowType, Exercise } from '../../lib/types';
import type { NewPR } from '../../lib/pr';

function SessionLoggerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const sessionId = idParam ? parseInt(idParam, 10) : null;

  const [session, setSession] = useState<Session | null>(null);
  const [exercises, setExercises] = useState<HydratedSessionExercise[]>([]);
  const [lastTimeMap, setLastTimeMap] = useState<Record<number, SetRowType[]>>({});
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);

  // Rest Timer state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  // PR Celebration state
  const [activePRs, setActivePRs] = useState<{ prs: NewPR[]; exerciseName: string } | null>(null);

  // Achieved Summary modal state
  const [finishingExercise, setFinishingExercise] = useState<HydratedSessionExercise | null>(null);

  // Add Exercise Modal state
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [allAvailableExercises, setAllAvailableExercises] = useState<Exercise[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  // Workout duration stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const reloadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const hydrated = await getHydratedSession(sessionId);
      if (!hydrated) {
        setSession(null);
        return;
      }
      setSession(hydrated.session);
      setExercises(hydrated.exercises);

      // Load "last time" sets for all exercises in this session
      const ltMap: Record<number, SetRowType[]> = {};
      for (const se of hydrated.exercises) {
        if (se.id && se.exerciseId) {
          const past = await getLastTimeSets(se.exerciseId, se.id);
          ltMap[se.exerciseId] = past;
        }
      }
      setLastTimeMap(ltMap);
    } catch (err) {
      console.error('Error loading session:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    async function init() {
      await reloadSession();
      const userUnit = await getSetting<WeightUnit>('unit', 'kg');
      const defRest = await getSetting<number>('restTimerDefaultSeconds', 90);
      setUnit(userUnit);
      setRestDuration(defRest);
      const exList = await getAllExercises();
      setAllAvailableExercises(exList);
      setLoading(false);
    }

    init();
  }, [sessionId, reloadSession]);

  // Duration clock
  useEffect(() => {
    if (!session?.date) return;
    const startMs = new Date(session.date).getTime();

    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.date]);

  // Handlers for SetRow actions
  const handleToggleComplete = async (
    set: SetRowType,
    actualReps: number,
    actualWeight: number,
    exerciseName: string
  ) => {
    if (!set.id) return;
    const res = await toggleCompleteSet(set.id, actualReps, actualWeight);

    if (res.set.completed) {
      // Start rest timer
      setShowRestTimer(true);

      // Check if PR was broken
      if (res.newPRs.length > 0) {
        setActivePRs({ prs: res.newPRs, exerciseName });
      }
    }

    await reloadSession();
  };

  const handleUpdateSet = async (setId: number, patch: Partial<SetRowType>) => {
    await updateSet(setId, patch);
    await reloadSession();
  };

  const handleAddSet = async (sessionExerciseId: number, exerciseId: number) => {
    await addSet(sessionExerciseId, exerciseId);
    await reloadSession();
  };

  const handleDeleteSet = async (setId: number) => {
    await deleteSet(setId);
    await reloadSession();
  };

  // Finish Exercise flow
  const handleTriggerFinishExercise = (se: HydratedSessionExercise) => {
    setFinishingExercise(se);
  };

  const handleConfirmAchieved = async (achieved: boolean) => {
    if (!finishingExercise?.id) return;
    await finishSessionExercise(finishingExercise.id, achieved);
    setFinishingExercise(null);
    await reloadSession();
  };

  // Add exercise to session
  const handleSelectExercise = async (exerciseId: number) => {
    if (!sessionId) return;
    await addExerciseToSession(sessionId, exerciseId);
    setShowAddExerciseModal(false);
    setExerciseSearchQuery('');
    await reloadSession();
  };

  const handleRemoveExercise = async (sessionExerciseId: number) => {
    if (confirm('Remove this exercise from current workout?')) {
      await removeExerciseFromSession(sessionExerciseId);
      await reloadSession();
    }
  };

  // Finish entire workout
  const handleFinishWorkout = async () => {
    if (!sessionId) return;
    await finishSession(sessionId);
    router.push('/history');
  };

  const handleDiscardWorkout = async () => {
    if (!sessionId) return;
    if (confirm('Discard this workout? Any uncompleted data will be deleted.')) {
      await deleteSession(sessionId);
      router.push('/');
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (!sessionId || (!session && !loading)) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-400">Workout session not found.</p>
        <Link href="/" className="mt-4 inline-block text-xs font-bold text-emerald-400">
          Back to Home
        </Link>
      </div>
    );
  }

  const filteredExercisesToAdd = allAvailableExercises.filter(ex => {
    const q = exerciseSearchQuery.toLowerCase().trim();
    return !q || ex.name.toLowerCase().includes(q) || ex.bodyPart.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Session Bar */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/"
          className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Stopwatch & Wake Lock */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full font-mono text-xs font-bold text-emerald-400">
            <Timer className="w-3.5 h-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <WakeLockManager enabled={true} />
        </div>

        <button
          onClick={handleDiscardWorkout}
          className="p-2 text-zinc-500 hover:text-rose-400 rounded-xl bg-zinc-900 border border-zinc-800 transition-colors"
          title="Discard workout"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Session Title */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Active Workout</p>
        <h1 className="text-2xl font-black text-white tracking-tight">
          {session?.notes || 'Gym Workout'}
        </h1>
      </div>

      {/* Exercises in Session */}
      <div className="space-y-6">
        {exercises.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
            <p className="text-xs text-zinc-400">No exercises added to this workout yet.</p>
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add Your First Exercise
            </button>
          </div>
        ) : (
          exercises.map(se => {
            const ex = se.exercise;
            const pastSets = ex?.id ? lastTimeMap[ex.id] || [] : [];

            return (
              <div
                key={se.id}
                className="p-4 rounded-3xl bg-zinc-900/70 border border-zinc-800/80 space-y-3.5 shadow-lg"
              >
                {/* Exercise Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/exercise?id=${se.exerciseId}`}
                      className="text-sm font-black text-white hover:text-emerald-400 flex items-center gap-1.5 group"
                    >
                      <span>{ex?.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Status Badge */}
                    {se.finished ? (
                      se.achieved ? (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Achieved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          Missed
                        </span>
                      )
                    ) : null}

                    <button
                      onClick={() => handleRemoveExercise(se.id!)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Set Rows */}
                <div className="space-y-2">
                  {se.sets.map((set, setIdx) => {
                    const lastTime = pastSets[setIdx];
                    return (
                      <SetRow
                        key={set.id}
                        set={set}
                        lastTimeSet={lastTime}
                        unit={unit}
                        onUpdate={patch => handleUpdateSet(set.id!, patch)}
                        onToggleComplete={(r, w) =>
                          handleToggleComplete(set, r, w, ex?.name || 'Exercise')
                        }
                        onDelete={() => handleDeleteSet(set.id!)}
                      />
                    );
                  })}
                </div>

                {/* Actions for this exercise */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleAddSet(se.id!, se.exerciseId)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Set
                  </button>

                  <button
                    onClick={() => handleTriggerFinishExercise(se)}
                    className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all ${
                      se.finished
                        ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{se.finished ? 'Review Verdict' : 'Finish Exercise'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Actions */}
      <div className="pt-2 space-y-2.5">
        <button
          onClick={() => setShowAddExerciseModal(true)}
          className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4 stroke-[3] text-emerald-400" />
          <span>Add Exercise</span>
        </button>

        <button
          onClick={handleFinishWorkout}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>Finish Workout</span>
        </button>
      </div>

      {/* Rest Timer Floating Banner */}
      {showRestTimer && (
        <RestTimer
          initialSeconds={restDuration}
          onFinish={() => setShowRestTimer(false)}
          onClose={() => setShowRestTimer(false)}
        />
      )}

      {/* PR Celebration Banner/Modal */}
      {activePRs && (
        <PRBadge
          prs={activePRs.prs}
          exerciseName={activePRs.exerciseName}
          unit={unit}
          onDismiss={() => setActivePRs(null)}
        />
      )}

      {/* Achieved Summary Dialog */}
      {finishingExercise && (
        <AchievedSummary
          exerciseName={finishingExercise.exercise?.name || 'Exercise'}
          sets={finishingExercise.sets}
          unit={unit}
          onConfirm={handleConfirmAchieved}
          onCancel={() => setFinishingExercise(null)}
        />
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm max-h-[88dvh] sm:max-h-[80vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0 mb-3">
              <h2 className="text-lg font-black text-white">Add Exercise</h2>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search exercise..."
                value={exerciseSearchQuery}
                onChange={e => setExerciseSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 overscroll-contain touch-scroll">
              {filteredExercisesToAdd.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExercise(ex.id!)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800/80 text-left transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{ex.name}</p>
                    <p className="text-[10px] text-zinc-400 capitalize">
                      {ex.bodyPart} · {ex.equipment.replace('_', ' ')}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400 text-xs">Loading workout...</div>}>
      <SessionLoggerContent />
    </Suspense>
  );
}
