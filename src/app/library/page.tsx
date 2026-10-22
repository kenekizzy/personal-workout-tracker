'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Dumbbell, ChevronRight, Filter, X } from 'lucide-react';
import { getAllExercises, createExercise } from '../../lib/data/exercises';
import { getBestPRsForExercise } from '../../lib/data/prs';
import { formatWeight, type WeightUnit } from '../../lib/units';
import { getSetting } from '../../lib/data/settings';
import type { Exercise, Equipment } from '../../lib/types';

const BODY_PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'];

export default function LibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [prMap, setPrMap] = useState<Record<number, number | undefined>>({});
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [showAddModal, setShowAddModal] = useState(false);

  // New exercise form state
  const [newName, setNewName] = useState('');
  const [newBodyPart, setNewBodyPart] = useState('Chest');
  const [newEquipment, setNewEquipment] = useState<Equipment>('barbell');
  const [newNotes, setNewNotes] = useState('');

  const loadData = async () => {
    const list = await getAllExercises();
    setExercises(list);
    const userUnit = await getSetting<WeightUnit>('unit', 'kg');
    setUnit(userUnit);

    // Fetch best weight PR per exercise
    const prs: Record<number, number | undefined> = {};
    for (const ex of list) {
      if (ex.id) {
        const best = await getBestPRsForExercise(ex.id);
        prs[ex.id] = best.weight?.value;
      }
    }
    setPrMap(prs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExercises = exercises.filter(ex => {
    const matchesBodyPart =
      selectedBodyPart === 'All' ||
      ex.bodyPart.toLowerCase() === selectedBodyPart.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      ex.name.toLowerCase().includes(q) ||
      ex.equipment.toLowerCase().includes(q) ||
      ex.bodyPart.toLowerCase().includes(q);
    return matchesBodyPart && matchesQuery;
  });

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await createExercise({
      name: newName.trim(),
      bodyPart: newBodyPart,
      equipment: newEquipment,
      notes: newNotes.trim() || undefined,
    });

    setNewName('');
    setNewNotes('');
    setShowAddModal(false);
    await loadData();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Exercise Library</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{exercises.length} exercises cataloged</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New</span>
        </button>
      </header>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by name, muscle, or equipment..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Muscle Group Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {BODY_PARTS.map(part => {
          const isActive = selectedBodyPart === part;
          return (
            <button
              key={part}
              onClick={() => setSelectedBodyPart(part)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {part}
            </button>
          );
        })}
      </div>

      {/* Exercise List */}
      <div className="space-y-2">
        {filteredExercises.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center">
            <Filter className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">No exercises found matching your filter.</p>
          </div>
        ) : (
          filteredExercises.map(ex => {
            const bestWeight = ex.id ? prMap[ex.id] : undefined;
            return (
              <Link
                key={ex.id}
                href={`/exercise?id=${ex.id}`}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-zinc-800/80 rounded-xl text-zinc-400 group-hover:text-emerald-400 transition-colors">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {ex.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 uppercase tracking-wide">
                        {ex.bodyPart}
                      </span>
                      <span className="text-[10px] text-zinc-400 capitalize">
                        {ex.equipment.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {bestWeight !== undefined && (
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">PR</p>
                      <p className="text-xs font-black text-amber-400 font-mono">
                        {formatWeight(bestWeight, unit)}
                      </p>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Add Custom Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">New Exercise</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Exercise Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Incline Smith Machine Press"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Muscle Group
                </label>
                <select
                  value={newBodyPart}
                  onChange={e => setNewBodyPart(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {BODY_PARTS.filter(p => p !== 'All').map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Equipment
                </label>
                <select
                  value={newEquipment}
                  onChange={e => setNewEquipment(e.target.value as Equipment)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="barbell">Barbell</option>
                  <option value="dumbbell">Dumbbell</option>
                  <option value="machine">Machine</option>
                  <option value="cable">Cable</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="weighted_bodyweight">Weighted Bodyweight</option>
                  <option value="band">Resistance Band</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Form cues, bench angles, etc."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
