'use client';

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface Props {
  animationFile?: string;
  exerciseName: string;
  className?: string;
}

export function ExerciseAnimation({ animationFile, exerciseName, className = '' }: Props) {
  const [loadError, setLoadError] = useState(false);

  // If no file specified, default to generic animation
  const fileToUse = animationFile || 'generic_exercise.svg';
  const isVideo = fileToUse.endsWith('.mp4') || fileToUse.endsWith('.webm');

  if (loadError) {
    return (
      <div
        className={`w-full h-full min-h-[140px] bg-zinc-900/80 rounded-xl flex flex-col items-center justify-center p-4 border border-zinc-800 ${className}`}
      >
        <div className="p-3 bg-zinc-800/80 rounded-full text-emerald-400 mb-2">
          <Dumbbell className="w-6 h-6" />
        </div>
        <p className="text-xs text-zinc-400 font-medium text-center">{exerciseName}</p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl bg-zinc-900 ${className}`}>
        <video
          src={`/animations/${fileToUse}`}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onError={() => setLoadError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-zinc-900 flex items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/animations/${fileToUse}`}
        alt={exerciseName}
        className="w-full h-full object-contain max-h-[220px]"
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
