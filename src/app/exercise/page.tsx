'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Dumbbell, History, LineChart as ChartIcon, Trash2 } from 'lucide-react';
import { getExerciseById, deleteExercise } from '../../lib/data/exercises';
import { getBestPRsForExercise, getPRTimeline } from '../../lib/data/prs';
import { getSetsByExercise } from '../../lib/data/sets';
import { formatWeight, type WeightUnit } from '../../lib/units';
import { getSetting } from '../../lib/data/settings';
import { PRCard } from '../../components/PRCard';
import { ExerciseAnimation } from '../../components/ExerciseAnimation';
import { ClientOnly } from '../../components/ClientOnly';
import type { Exercise, PR, SetRow } from '../../lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

function ExerciseDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const exerciseId = idParam ? parseInt(idParam, 10) : null;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [bestPRs, setBestPRs] = useState<{
    weight?: PR;
    e1rm?: PR;
    volume?: PR;
    repsAtWeight: PR[];
  }>({ repsAtWeight: [] });
  const [chartMetric, setChartMetric] = useState<'e1rm' | 'weight' | 'volume'>('e1rm');
  const [chartData, setChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [historySets, setHistorySets] = useState<SetRow[]>([]);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) return;

    async function loadExerciseData() {
      try {
        const [ex, prs, timeline, sets, userUnit] = await Promise.all([
          getExerciseById(exerciseId!),
          getBestPRsForExercise(exerciseId!),
          getPRTimeline(exerciseId!, chartMetric),
          getSetsByExercise(exerciseId!),
          getSetting<WeightUnit>('unit', 'kg'),
        ]);

        if (ex) setExercise(ex);
        setBestPRs(prs);
        setUnit(userUnit);
        setHistorySets(sets.filter(s => s.completed && !s.isWarmup));

        const formattedTimeline = timeline.map(p => ({
          date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: p.value,
        }));
        setChartData(formattedTimeline);
      } catch (err) {
        console.error('Error loading exercise detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadExerciseData();
  }, [exerciseId, chartMetric]);

  const handleDelete = async () => {
    if (!exerciseId) return;
    if (confirm('Are you sure you want to delete this exercise and its PR history?')) {
      await deleteExercise(exerciseId);
      router.push('/library');
    }
  };

  if (!exerciseId || (!exercise && !loading)) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-zinc-400">Exercise not found.</p>
        <Link href="/library" className="mt-4 inline-block text-xs font-bold text-emerald-400">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/library"
          className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 border border-zinc-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button
          onClick={handleDelete}
          className="p-2 text-zinc-500 hover:text-rose-400 rounded-xl bg-zinc-900 border border-zinc-800 transition-colors"
          title="Delete exercise"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Header & Badges */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
            {exercise?.bodyPart}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 uppercase tracking-wider capitalize">
            {exercise?.equipment.replace('_', ' ')}
          </span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">{exercise?.name}</h1>
        {exercise?.notes && <p className="text-xs text-zinc-400 mt-1">{exercise.notes}</p>}
      </div>

      {/* Animation loop */}
      <div className="w-full h-44 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
        <ExerciseAnimation
          animationFile={exercise?.animationFile}
          exerciseName={exercise?.name || 'Exercise'}
          className="h-full"
        />
      </div>

      {/* PR Cards */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Personal Records</h2>
        <PRCard
          weightPR={bestPRs.weight}
          e1rmPR={bestPRs.e1rm}
          volumePR={bestPRs.volume}
          repsAtWeight={bestPRs.repsAtWeight}
          unit={unit}
        />
      </section>

      {/* Charts Section */}
      <section className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Progression Trend
            </h3>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[10px] font-bold">
            <button
              onClick={() => setChartMetric('e1rm')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                chartMetric === 'e1rm' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
              }`}
            >
              1RM
            </button>
            <button
              onClick={() => setChartMetric('weight')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                chartMetric === 'weight' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
              }`}
            >
              Weight
            </button>
            <button
              onClick={() => setChartMetric('volume')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                chartMetric === 'volume' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
              }`}
            >
              Volume
            </button>
          </div>
        </div>

        <ClientOnly
          fallback={
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500">
              Loading chart...
            </div>
          }
        >
          {chartData.length < 2 ? (
            <div className="h-40 flex items-center justify-center text-xs text-zinc-500 text-center px-4">
              Log at least 2 completed sessions to view progression timeline.
            </div>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272a38" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ClientOnly>
      </section>

      {/* Historical Sets Log */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Past Working Sets</h2>
        </div>

        {historySets.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">No completed working sets yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {historySets.slice().reverse().map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs"
              >
                <div>
                  <span className="font-semibold text-zinc-300">Set {s.setNumber}</span>
                  {s.completedAt && (
                    <span className="text-[10px] text-zinc-500 ml-2">
                      {new Date(s.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="font-mono font-bold text-emerald-400">
                  {s.actualReps} reps @ {formatWeight(s.actualWeight, unit)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ExerciseDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400 text-xs">Loading exercise...</div>}>
      <ExerciseDetailContent />
    </Suspense>
  );
}
