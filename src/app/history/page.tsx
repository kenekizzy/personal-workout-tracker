'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Dumbbell, Trash2, Award, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import { getAllSessions, getHydratedSession, deleteSession, type HydratedSessionExercise } from '../../lib/data/sessions';
import { formatWeight, type WeightUnit } from '../../lib/units';
import { getSetting } from '../../lib/data/settings';
import type { Session } from '../../lib/types';

interface DetailedSession {
  session: Session;
  exercises: HydratedSessionExercise[];
  totalVolumeKg: number;
}

export default function HistoryPage() {
  const [detailedSessions, setDetailedSessions] = useState<DetailedSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const userUnit = await getSetting<WeightUnit>('unit', 'kg');
      setUnit(userUnit);

      const allSessions = await getAllSessions();
      const detailed: DetailedSession[] = [];

      for (const s of allSessions) {
        if (!s.id) continue;
        const hydrated = await getHydratedSession(s.id);
        if (!hydrated) continue;

        let totalVol = 0;
        for (const se of hydrated.exercises) {
          for (const set of se.sets) {
            if (set.completed && !set.isWarmup) {
              totalVol += set.actualWeight * set.actualReps;
            }
          }
        }

        detailed.push({
          session: s,
          exercises: hydrated.exercises,
          totalVolumeKg: Math.round(totalVol),
        });
      }

      setDetailedSessions(detailed);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteSession = async (sessionId: number) => {
    if (confirm('Are you sure you want to delete this workout from your history?')) {
      await deleteSession(sessionId);
      await loadHistory();
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '< 1 min';
    const mins = Math.floor(sec / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins} mins`;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Workout History</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{detailedSessions.length} sessions logged</p>
        </div>
      </header>

      {/* History List */}
      <div className="space-y-3">
        {detailedSessions.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-2">
            <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No completed workouts yet.</p>
            <Link
              href="/"
              className="mt-3 inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20"
            >
              Start a Workout
            </Link>
          </div>
        ) : (
          detailedSessions.map(({ session, exercises, totalVolumeKg }) => {
            const isExpanded = expandedSessionId === session.id;
            const dateObj = new Date(session.date);
            const dateStr = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={session.id}
                className="p-4 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-md"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {session.notes || 'Workout Session'}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {dateStr}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" /> {formatDuration(session.durationSeconds)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!session.finished && (
                      <Link
                        href={`/session?id=${session.id}`}
                        className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg"
                      >
                        Resume
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeleteSession(session.id!)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800"
                      title="Delete workout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics Pills */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="px-3 py-1.5 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px]">
                    <span className="text-zinc-500 font-medium">Volume: </span>
                    <span className="font-bold text-white font-mono">{formatWeight(totalVolumeKg, unit)}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px]">
                    <span className="text-zinc-500 font-medium">Exercises: </span>
                    <span className="font-bold text-white font-mono">{exercises.length}</span>
                  </div>
                </div>

                {/* Expand / Collapse toggle */}
                <button
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id!)}
                  className="w-full flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs font-bold text-zinc-400 hover:text-zinc-200"
                >
                  <span>{isExpanded ? 'Hide Details' : 'View Exercise Breakdown'}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {/* Expanded Exercise Breakdown */}
                {isExpanded && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-800 animate-in fade-in duration-150">
                    {exercises.map(se => (
                      <div
                        key={se.id}
                        className="p-3 bg-zinc-950/70 rounded-2xl border border-zinc-850 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/exercise?id=${se.exerciseId}`}
                            className="text-xs font-bold text-white hover:text-emerald-400"
                          >
                            {se.exercise?.name}
                          </Link>
                          {se.achieved !== undefined && (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                se.achieved
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {se.achieved ? (
                                <>
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Achieved
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-2.5 h-2.5" /> Missed
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Sets list */}
                        <div className="space-y-1">
                          {se.sets.map(s => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-[11px] text-zinc-400"
                            >
                              <span>
                                {s.isWarmup ? 'Warmup' : `Set ${s.setNumber}`}
                              </span>
                              <span className="font-mono font-medium text-zinc-300">
                                {s.actualReps} reps × {formatWeight(s.actualWeight, unit)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
