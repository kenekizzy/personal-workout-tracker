'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Award, Check, X } from 'lucide-react';
import type { SetRow } from '../lib/types';
import { getAchievedStats } from '../lib/achieved';
import { formatWeight, type WeightUnit } from '../lib/units';

interface Props {
  exerciseName: string;
  sets: SetRow[];
  unit?: WeightUnit;
  onConfirm: (achieved: boolean) => void;
  onCancel: () => void;
}

export function AchievedSummary({
  exerciseName,
  sets,
  unit = 'kg',
  onConfirm,
  onCancel,
}: Props) {
  const stats = getAchievedStats(sets);
  const [userAchieved, setUserAchieved] = useState(stats.achieved);

  const workingSets = sets.filter(s => !s.isWarmup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-left">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-3 rounded-2xl ${
              userAchieved
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {userAchieved ? (
              <Award className="w-7 h-7" />
            ) : (
              <XCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{exerciseName}</h3>
            <p className="text-xs text-zinc-400">Exercise Summary</p>
          </div>
        </div>

        {/* Verdict Badge */}
        <div
          className={`p-3.5 rounded-2xl border mb-4 flex items-center justify-between ${
            userAchieved
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">
              {userAchieved ? 'Target Achieved' : 'Target Missed'}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {stats.metTargetWorking} of {stats.totalWorking} working sets met target
            </p>
          </div>
          {userAchieved ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
          )}
        </div>

        {/* Set by set breakdown */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto mb-4 pr-1">
          {workingSets.map(s => {
            const met =
              s.completed &&
              s.actualReps >= s.targetReps &&
              s.actualWeight >= s.targetWeight;

            return (
              <div
                key={s.id}
                className="flex items-center justify-between px-3 py-2 bg-zinc-950/50 rounded-xl text-xs border border-zinc-800/80"
              >
                <span className="font-semibold text-zinc-400">Set {s.setNumber}</span>
                <span className="text-zinc-400">
                  Target: {s.targetReps} × {formatWeight(s.targetWeight, unit)}
                </span>
                <span
                  className={`font-bold ${
                    met ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {s.actualReps} × {formatWeight(s.actualWeight, unit)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Manual Override switch */}
        <div className="pt-2 border-t border-zinc-800 mb-5">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-xs font-medium text-zinc-300">
              Override verdict as achieved?
            </span>
            <button
              type="button"
              onClick={() => setUserAchieved(!userAchieved)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userAchieved ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userAchieved ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" /> Keep Editing
          </button>
          <button
            onClick={() => onConfirm(userAchieved)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Save Result
          </button>
        </div>
      </div>
    </div>
  );
}
