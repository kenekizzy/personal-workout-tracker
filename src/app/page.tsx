'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Play,
  Trophy,
  ShieldAlert,
  ChevronRight,
  Dumbbell,
  Flame,
  CheckCircle2,
  ArrowRight,
  Layers,
  Sparkles,
  Zap,
  Activity,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { createEmptySession, createSessionFromRoutine, getActiveSession } from '../lib/data/sessions';
import { getAllRoutines, type HydratedRoutine } from '../lib/data/routines';
import { getAllRecentPRs, type HydratedPR } from '../lib/data/prs';
import { checkBackupNudgeNeeded, exportDatabaseToJson } from '../lib/backup';
import { formatWeight, type WeightUnit } from '../lib/units';
import { getSetting } from '../lib/data/settings';
import { db } from '../lib/db';
import type { Session } from '../lib/types';

export default function HomePage() {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [routines, setRoutines] = useState<HydratedRoutine[]>([]);
  const [recentPRs, setRecentPRs] = useState<HydratedPR[]>([]);
  const [showBackupNudge, setShowBackupNudge] = useState(false);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [stats, setStats] = useState({ totalSessions: 0, totalPRs: 0, totalExercises: 0 });
  const [todayStr, setTodayStr] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Ready to Train');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Client-side date and greeting to prevent SSR hydration mismatch
    const now = new Date();
    setTodayStr(
      now.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    );

    const hour = now.getHours();
    if (hour < 12) setGreeting('Morning Grind');
    else if (hour < 17) setGreeting('Afternoon Push');
    else setGreeting('Evening Session');

    async function loadDashboard() {
      try {
        const [active, rList, prList, nudge, userUnit, sessCount, prCount, exCount] = await Promise.all([
          getActiveSession(),
          getAllRoutines(),
          getAllRecentPRs(6),
          checkBackupNudgeNeeded(),
          getSetting<WeightUnit>('unit', 'kg'),
          db.sessions.filter(s => s.finished === true).count(),
          db.prs.count(),
          db.exercises.count(),
        ]);

        setActiveSession(active ?? null);
        setRoutines(rList.slice(0, 4));
        setRecentPRs(prList);
        setShowBackupNudge(nudge);
        setUnit(userUnit);
        setStats({ totalSessions: sessCount, totalPRs: prCount, totalExercises: exCount });
      } catch (err) {
        console.error('Error loading home dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleStartEmpty = async () => {
    const session = await createEmptySession();
    router.push(`/session?id=${session.id}`);
  };

  const handleStartRoutine = async (routineId: number) => {
    const session = await createSessionFromRoutine(routineId);
    router.push(`/session?id=${session.id}`);
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* Top App Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-semibold tracking-wider uppercase">
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayStr || 'Today'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{greeting}</span>
            <span className="text-lg">⚡</span>
          </h1>
        </div>

        {/* Local-Only Privacy Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-full shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-zinc-300 tracking-wide flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Local Vault
          </span>
        </div>
      </header>

      {/* Backup Reminder Banner (if backup is due) */}
      {showBackupNudge && (
        <div className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-r from-amber-950/70 via-zinc-900 to-zinc-900 border border-amber-500/40 shadow-xl shadow-amber-950/30">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                Data Protection Reminder
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Your workouts live entirely in this browser. Export a JSON backup to ensure your PRs and history are never lost.
              </p>
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  onClick={async () => {
                    await exportDatabaseToJson();
                    setShowBackupNudge(false);
                  }}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-amber-400/20"
                >
                  Export JSON Now
                </button>
                <button
                  onClick={() => setShowBackupNudge(false)}
                  className="px-2.5 py-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Workout Card (if ongoing) */}
      {activeSession ? (
        <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-900 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Session In Progress
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400">
              Started {new Date(activeSession.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {activeSession.notes || 'In-Progress Workout'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Screen wake lock active · Sets updating live</p>
          </div>

          <Link
            href={`/session?id=${activeSession.id}`}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Session</span>
          </Link>
        </div>
      ) : (
        /* Hero Quick Start Button */
        <button
          onClick={handleStartEmpty}
          className="relative group w-full overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 text-zinc-950 shadow-2xl shadow-emerald-500/20 active:scale-[0.98] transition-all text-left"
        >
          {/* Subtle background glow effect */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-zinc-950/15 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7 stroke-[3] text-zinc-950" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900/80 block">
                  Quick Start
                </span>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950">
                  Empty Workout
                </h2>
                <p className="text-xs font-semibold text-zinc-900/70 mt-0.5">
                  Log ad-hoc sets, reps and PRs freely
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/15 rounded-full group-hover:translate-x-1.5 transition-transform shrink-0">
              <ArrowRight className="w-5 h-5 stroke-[3] text-zinc-950" />
            </div>
          </div>
        </button>
      )}

      {/* Heads-Up Stats HUD */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Workouts</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{stats.totalSessions}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">PRs Hit</span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono">{stats.totalPRs}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Exercises</span>
            <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{stats.totalExercises}</p>
        </div>
      </section>

      {/* Routine Templates Launcher */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Launch Routine
            </h3>
          </div>
          <Link
            href="/routines"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors"
          >
            <span>All Templates</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {routines.map(r => (
            <div
              key={r.id}
              className="p-4 rounded-3xl bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3 shadow-md group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                    {r.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md">
                    {r.targets.length} moves
                  </span>
                </div>
                {r.notes && (
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{r.notes}</p>
                )}
              </div>

              <button
                onClick={() => handleStartRoutine(r.id!)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Workout</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Recent PRs Hall of Fame */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Recent PR Records
            </h3>
          </div>
          <Link
            href="/library"
            className="text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Exercise Library
          </Link>
        </div>

        {recentPRs.length === 0 ? (
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800/80 text-center space-y-2">
            <div className="p-3 bg-zinc-800/60 text-zinc-500 rounded-2xl w-fit mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">No Personal Records Logged Yet</p>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Complete your first workout and hit your targets to unlock your PR Hall of Fame!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPRs.map((pr, idx) => (
              <Link
                key={idx}
                href={`/exercise?id=${pr.exerciseId}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.99] group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                    <Flame className="w-4 h-4 fill-amber-400/20" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      {pr.exercise?.name || 'Exercise'}
                    </h4>
                    <p className="text-[10px] text-zinc-400 capitalize">
                      {pr.type.replace(/_/g, ' ')} · {new Date(pr.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-amber-400 font-mono">
                    {pr.type === 'reps_at_weight'
                      ? `${pr.value} reps @ ${formatWeight(pr.weight, unit)}`
                      : pr.type === 'volume'
                      ? `${pr.value} kg-vol`
                      : formatWeight(pr.value, unit)}
                  </span>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Record</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Gym Motivational Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800/80 flex items-center gap-3 text-zinc-400">
        <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-zinc-300 leading-relaxed font-medium">
          <strong className="text-white font-bold">Planned vs. Actual:</strong> Consistent incremental progressive overload wins every time.
        </p>
      </div>
    </div>
  );
}
