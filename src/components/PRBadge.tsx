'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Zap, X } from 'lucide-react';
import type { NewPR } from '../lib/pr';
import { formatWeight, type WeightUnit } from '../lib/units';

interface Props {
  prs: NewPR[];
  exerciseName: string;
  unit?: WeightUnit;
  onDismiss: () => void;
}

export function PRBadge({ prs, exerciseName, unit = 'kg', onDismiss }: Props) {
  useEffect(() => {
    if (prs.length > 0) {
      // Fire confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
      });

      // Subtle vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 150]);
      }
    }
  }, [prs]);

  if (!prs || prs.length === 0) return null;

  const prTypeTitles: Record<string, string> = {
    weight: 'Max Weight PR',
    e1rm: 'Estimated 1RM PR',
    volume: 'Set Volume PR',
    reps_at_weight: 'Reps at Weight PR',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-zinc-800 to-zinc-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl shadow-amber-950/50 text-center">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-2xl mb-3 shadow-inner">
          <Trophy className="w-8 h-8 animate-bounce" />
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">NEW RECORD HIT!</h3>
        <p className="text-xs font-semibold text-emerald-400 mt-0.5">{exerciseName}</p>

        <div className="mt-4 space-y-2.5">
          {prs.map((pr, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-800"
            >
              <div className="flex items-center gap-2 text-left">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-200">
                  {prTypeTitles[pr.type] || pr.type}
                </span>
              </div>
              <span className="text-sm font-black text-amber-300">
                {pr.type === 'reps_at_weight'
                  ? `${pr.value} reps @ ${formatWeight(pr.weight, unit)}`
                  : pr.type === 'volume'
                  ? `${pr.value} kg-vol`
                  : formatWeight(pr.value, unit)}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          className="mt-5 w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
        >
          LET&apos;S GO! 💪
        </button>
      </div>
    </div>
  );
}
