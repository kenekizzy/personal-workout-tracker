'use client';

import { useState, useEffect } from 'react';
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
  // Local state for fast typing and immediate responsiveness
  const [actualReps, setActualReps] = useState<number>(set.actualReps);
  const [actualWeightDisplay, setActualWeightDisplay] = useState<number>(
    toDisplayWeight(set.actualWeight, unit)
  );

  // Sync state when props update
  useEffect(() => {
    setActualReps(set.actualReps);
    setActualWeightDisplay(toDisplayWeight(set.actualWeight, unit));
  }, [set.actualReps, set.actualWeight, unit]);

  const handleWeightChange = (newDisplayVal: number) => {
    const val = Math.max(0, Math.round(newDisplayVal * 10) / 10);
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
      try {
        navigator.vibrate([25]);
      } catch {
        // ignore vibration failures
      }
    }
    const storedKg = toStoredKg(actualWeightDisplay, unit);
    onToggleComplete(actualReps, storedKg);
  };

  const stepSize = unit === 'lb' ? 5 : 2.5;

  return (
    <div
      className={`relative p-3 rounded-2xl border transition-all duration-150 ${
        set.completed
          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-950/30'
          : set.isWarmup
          ? 'bg-amber-950/15 border-amber-500/30'
          : 'bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-700'
      }`}
    >
      {/* Mobile-first Layout: Top header bar for Set info & target, Bottom row for responsive controls */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Set Info Header */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ isWarmup: !set.isWarmup })}
              className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition-transform active:scale-90 ${
                set.isWarmup
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title={set.isWarmup ? 'Warmup set (tap to make working)' : 'Working set (tap to make warmup)'}
            >
              {set.isWarmup ? 'W' : set.setNumber}
            </button>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-zinc-300">
                Target: {set.targetReps} × {formatWeight(set.targetWeight, unit)}
              </span>
              {lastTimeSet && (
                <span className="text-[11px] text-zinc-400 font-medium">
                  (Last: {lastTimeSet.actualReps} × {formatWeight(lastTimeSet.actualWeight, unit)})
                </span>
              )}
            </div>
          </div>

          {/* Delete button (visible on mobile in top-right) */}
          <button
            type="button"
            onClick={onDelete}
            className="sm:hidden p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800/80 transition-colors"
            title="Delete set"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inputs & Actions Row */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Weight Stepper */}
          <div className="flex-1 sm:flex-initial">
            <div className="flex items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => handleWeightChange(actualWeightDisplay - stepSize)}
                className="w-7 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-90"
              >
                -
              </button>
              <div className="flex items-baseline justify-center px-1">
                <input
                  type="number"
                  inputMode="decimal"
                  step={stepSize}
                  value={actualWeightDisplay === 0 ? '' : actualWeightDisplay}
                  placeholder="0"
                  onChange={e => handleWeightChange(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center bg-transparent text-white font-mono font-black text-sm focus:outline-none"
                />
                <span className="text-[10px] font-bold text-zinc-400 uppercase -ml-1">
                  {unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleWeightChange(actualWeightDisplay + stepSize)}
                className="w-7 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Reps Stepper */}
          <div className="flex-1 sm:flex-initial">
            <div className="flex items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => handleRepsChange(actualReps - 1)}
                className="w-7 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-90"
              >
                -
              </button>
              <div className="flex items-baseline justify-center px-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={actualReps === 0 ? '' : actualReps}
                  placeholder="0"
                  onChange={e => handleRepsChange(parseInt(e.target.value, 10) || 0)}
                  className="w-10 text-center bg-transparent text-white font-mono font-black text-sm focus:outline-none"
                />
                <span className="text-[10px] font-bold text-zinc-400 uppercase -ml-0.5">
                  r
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRepsChange(actualReps + 1)}
                className="w-7 h-8 text-zinc-400 hover:text-white font-black text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Complete Toggle Button */}
          <button
            type="button"
            onClick={handleCompleteClick}
            className={`h-9 px-3.5 rounded-xl flex items-center justify-center gap-1 font-bold text-xs transition-all active:scale-95 shrink-0 ${
              set.completed
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-white border border-zinc-700/60'
            }`}
            title={set.completed ? 'Completed (tap to undo)' : 'Mark completed'}
          >
            <Check className={`w-4 h-4 ${set.completed ? 'stroke-[3]' : 'stroke-[2]'}`} />
            <span className="hidden xs:inline sm:hidden">{set.completed ? 'Done' : 'Log'}</span>
          </button>

          {/* Delete button (desktop version) */}
          <button
            type="button"
            onClick={onDelete}
            className="hidden sm:flex p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Delete set"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
