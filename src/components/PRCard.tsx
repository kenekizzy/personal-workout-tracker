'use client';

import { Trophy, Flame, Dumbbell, Repeat } from 'lucide-react';
import type { PR } from '../lib/types';
import { formatWeight, type WeightUnit } from '../lib/units';

interface Props {
  weightPR?: PR;
  e1rmPR?: PR;
  volumePR?: PR;
  repsAtWeight?: PR[];
  unit?: WeightUnit;
}

export function PRCard({
  weightPR,
  e1rmPR,
  volumePR,
  repsAtWeight = [],
  unit = 'kg',
}: Props) {
  const formatDate = (ms?: number) => {
    if (!ms) return '-';
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const cards = [
    {
      title: 'Top Weight',
      value: weightPR ? formatWeight(weightPR.value, unit) : '-',
      subtext: weightPR ? `${weightPR.reps} reps · ${formatDate(weightPR.date)}` : 'No PR yet',
      icon: Dumbbell,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    },
    {
      title: 'Est. 1RM',
      value: e1rmPR ? formatWeight(e1rmPR.value, unit) : '-',
      subtext: e1rmPR ? `from ${e1rmPR.reps} reps · ${formatDate(e1rmPR.date)}` : 'No PR yet',
      icon: Trophy,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'Best Set Volume',
      value: volumePR ? `${volumePR.value} kg` : '-',
      subtext: volumePR ? `${volumePR.reps} reps · ${formatDate(volumePR.date)}` : 'No PR yet',
      icon: Flame,
      color: 'from-rose-500/20 to-orange-500/10 border-rose-500/30 text-rose-400',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-gradient-to-br border ${c.color} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {c.title}
                </span>
                <Icon className="w-4 h-4 opacity-80" />
              </div>
              <div className="my-2">
                <span className="text-2xl font-black text-white tracking-tight">{c.value}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">{c.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Reps at Weight list */}
      {repsAtWeight.length > 0 && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <Repeat className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Rep Records by Weight
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {repsAtWeight.slice(0, 6).map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs"
              >
                <span className="text-zinc-400 font-medium">{formatWeight(r.weight, unit)}</span>
                <span className="font-bold text-emerald-400 font-mono">{r.value} reps</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
