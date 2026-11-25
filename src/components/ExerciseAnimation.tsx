'use client';

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface Props {
  animationFile?: string;
  exerciseName: string;
  className?: string;
}

export function ExerciseAnimation({ animationFile, exerciseName, className = '' }: Props) {
  const [failedFile, setFailedFile] = useState<string | null>(null);

  // If no file specified, default to generic animation
  const fileToUse = animationFile || 'generic_exercise.svg';
  const loadError = failedFile === fileToUse;
  const isVideo = fileToUse.endsWith('.mp4') || fileToUse.endsWith('.webm');
  const isSvg = fileToUse.endsWith('.svg');

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
      <div className={`relative w-full overflow-hidden rounded-xl bg-white flex items-center justify-center ${className}`}>
        <video
          key={fileToUse}
          src={`/animations/${fileToUse}`}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain"
          onError={() => setFailedFile(fileToUse)}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl flex items-center justify-center ${
        isSvg ? 'bg-zinc-900' : 'bg-white p-2'
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={fileToUse}
        src={`/animations/${fileToUse}`}
        alt={exerciseName}
        className="w-full h-full object-contain max-h-[220px]"
        onError={() => setFailedFile(fileToUse)}
      />
    </div>
  );
}
