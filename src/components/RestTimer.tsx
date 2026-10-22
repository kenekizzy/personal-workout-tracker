'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Timer, X, Plus, Minus, Volume2, VolumeX } from 'lucide-react';

interface Props {
  initialSeconds?: number;
  onFinish?: () => void;
  onClose?: () => void;
}

export function RestTimer({ initialSeconds = 90, onFinish, onClose }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play 2-tone melodic chime: A5 (880Hz) -> C#6 (1108Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.6);
    } catch {
      // Ignore audio failure
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 60, 150]);
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      playChime();
      if (onFinish) onFinish();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          playChime();
          if (onFinish) onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onFinish, playChime]);

  const addSeconds = (amount: number) => {
    setSecondsLeft(prev => {
      const next = Math.max(0, prev + amount);
      if (next > totalSeconds) setTotalSeconds(next);
      return next;
    });
  };

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSecs = secondsLeft % 60;
  const timeFormatted = `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="relative overflow-hidden bg-zinc-900/95 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-black/80 backdrop-blur-md">
        {/* Progress background bar */}
        <div
          className="absolute left-0 bottom-0 top-0 bg-emerald-500/10 transition-all duration-1000 ease-linear pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Rest Timer</p>
              <p className="text-2xl font-black tracking-tight text-white font-mono">{timeFormatted}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => addSeconds(30)}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-all"
            >
              +30s
            </button>
            <button
              onClick={() => addSeconds(-15)}
              className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-all"
            >
              -15s
            </button>
            <button
              onClick={() => setSoundEnabled(s => !s)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
