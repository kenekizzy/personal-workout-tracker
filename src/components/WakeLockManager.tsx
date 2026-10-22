'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  enabled?: boolean;
}

export function WakeLockManager({ enabled = true }: Props) {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      setIsSupported(false);
      return;
    }

    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
      }
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        setIsLocked(false);
        wakeLockRef.current = null;
      });
    } catch {
      setIsLocked(false);
    }
  }, []);

  const releaseLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
    setIsLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      releaseLock();
      return;
    }

    requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [enabled, requestLock, releaseLock]);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={isLocked ? releaseLock : requestLock}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
        isLocked
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
      }`}
      title={isLocked ? 'Screen will stay awake during workout' : 'Tap to keep screen awake'}
    >
      {isLocked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      <span>{isLocked ? 'Awake' : 'Screen Dim'}</span>
    </button>
  );
}
