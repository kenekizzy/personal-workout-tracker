'use client';

import { useState } from 'react';
import { Check, Flame, Trash2 } from 'lucide-react';
import type { SetRow as SetRowType } from '../lib/types';
import { formatWeight, toStoredKg, toDisplayWeight, type WeightUnit } from '../lib/units';

interface Props {
  set: SetRowType;
  lastTimeSet?: SetRowType;
  unit?: WeightUnit;
  onUpdate: (patch: Partial<SetRowType>) => void;
  onToggleComplete: (actualReps: number, actualWeight: number) => void;
  onDelete: () => void;
}

export function SetRow({
  set,
  lastTimeSet,
  unit = 'kg',
  onUpdate,
  onToggleComplete,
  onDelete,
}: Props) {
  // Local state for fast typing
  const [actualReps, setActualReps] = useState<number>(set.actualReps);
  const [actualWeightDisplay, setActualWeightDisplay] = useState<number>(
    toDisplayWeight(set.actualWeight, unit)
  );

  const handleWeightChange = (newDisplayVal: number) => {
    const val = Math.max(0, newDisplayVal);
    setActualWeightDisplay(val);
    const storedKg = toStoredKg(val, unit);
    onUpdate({ actualWeight: storedKg });
  };

  const handleRepsChange = (newReps: number) => {
    const val = Math.max(0, newReps);
    setActualReps(val);
    onUpdate({ actualReps: val });
  };

  const handleCompleteClick = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([25]);
    }
    const storedKg = toStoredKg(actualWeightDisplay, unit);
    onToggleComplete(actualReps, storedKg);
  };

  return (
    <div
      className={`relative p-3.5 rounded-2xl border transition-all ${
        set.completed
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-950/20'
          : set.isWarmup
          ? 'bg-amber-950/10 border-amber-500/20'
          : 'bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Set number & Warmup toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ isWarmup: !set.isWarmup })}
            className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition-colors ${
              set.isWarmup
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title={set.isWarmup ? 'Warmup set (tap to make working)' : 'Working set (tap to make warmup)'}
          >
            {set.isWarmup ? 'W' : set.setNumber}
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-400">
                Target: {set.targetReps} × {formatWeight(set.targetWeight, unit)}
              </span>
            </div>
            {lastTimeSet && (
              <p className="text-[10px] text-zinc-400 font-medium">
                Last: {lastTimeSet.actualReps} × {formatWeight(lastTimeSet.actualWeight, unit)}
              </p>
            )}
          </div>
        </div>

        {/* Inputs & Complete Action */}
        <div className="flex items-center gap-2.5">
          {/* Weight Input + Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              {unit.toUpperCase()}
            </span>
            <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
              <button
                type="button"
                onClick={() => handleWeightChange(actualWeightDisplay - (unit === 'lb' ? 5 : 2.5))}
                className="w-6 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                inputMode="decimal"
                step={unit === 'lb' ? '5' : '2.5'}
                value={actualWeightDisplay || ''}
                onChange={e => handleWeightChange(parseFloat(e.target.value) || 0)}
                className="w-14 text-center bg-transparent text-white font-mono font-bold text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleWeightChange(actualWeightDisplay + (unit === 'lb' ? 5 : 2.5))}
                className="w-6 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Reps Input + Stepper */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              REPS
            </span>
            <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 p-0.5">
              <button
                type="button"
                onClick={() => handleRepsChange(actualReps - 1)}
                className="w-6 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={actualReps || ''}
                onChange={e => handleRepsChange(parseInt(e.target.value, 10) || 0)}
                className="w-10 text-center bg-transparent text-white font-mono font-bold text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleRepsChange(actualReps + 1)}
                className="w-6 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Large Tap Target Complete Checkbox */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-transparent mb-0.5">✓</span>
            <button
              type="button"
              onClick={handleCompleteClick}
              className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all ${
                set.completed
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white active:scale-95'
              }`}
              title={set.completed ? 'Completed (tap to undo)' : 'Mark completed'}
            >
              <Check className={`w-5 h-5 ${set.completed ? 'stroke-[3]' : 'stroke-[2]'}`} />
            </button>
          </div>

          {/* Delete set */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-transparent mb-0.5">×</span>
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
              title="Delete set"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
