'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  HardDrive,
  Scale,
  Calculator,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Smartphone,
  Plus,
} from 'lucide-react';
import { exportDatabaseToJson, importDatabaseFromJson, exportSetsToCsv } from '../../lib/backup';
import { getSetting, setSetting, logBodyWeight, getBodyWeightLogs } from '../../lib/data/settings';
import { seedDatabase } from '../../lib/seed';
import { formatWeight, type WeightUnit } from '../../lib/units';
import type { BodyWeight } from '../../lib/types';

export default function SettingsPage() {
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [restSeconds, setRestSeconds] = useState(90);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPersisted, setIsPersisted] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // Bodyweight log state
  const [bwLogs, setBwLogs] = useState<BodyWeight[]>([]);
  const [newBwValue, setNewBwValue] = useState('');

  // Plate Calculator state
  const [calcTargetWeight, setCalcTargetWeight] = useState<number>(100);
  const [barWeight, setBarWeight] = useState<number>(20);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const u = await getSetting<WeightUnit>('unit', 'kg');
      const r = await getSetting<number>('restTimerDefaultSeconds', 90);
      const s = await getSetting<boolean>('audioEnabled', true);
      const logs = await getBodyWeightLogs();

      setUnit(u);
      setRestSeconds(r);
      setSoundEnabled(s);
      setBwLogs(logs);

      if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
        const persisted = await navigator.storage.persisted();
        setIsPersisted(persisted);
      }
    }
    loadSettings();
  }, []);

  const handleUnitToggle = async (newUnit: WeightUnit) => {
    setUnit(newUnit);
    await setSetting('unit', newUnit);
  };

  const handleRestChange = async (sec: number) => {
    setRestSeconds(sec);
    await setSetting('restTimerDefaultSeconds', sec);
  };

  const handleSoundToggle = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    await setSetting('audioEnabled', next);
  };

  const handleRequestPersistence = async () => {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      const granted = await navigator.storage.persist();
      setIsPersisted(granted);
      setBackupStatus(granted ? 'Persistent storage granted!' : 'Storage persistence denied by browser.');
    }
  };

  const handleExportJson = async () => {
    try {
      await exportDatabaseToJson();
      setBackupStatus('Backup downloaded successfully.');
    } catch {
      setBackupStatus('Export failed.');
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportSetsToCsv();
      setBackupStatus('CSV spreadsheet downloaded.');
    } catch {
      setBackupStatus('CSV export failed.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        'Warning: Importing a backup file will replace your current data with the contents of this file. Continue?'
      )
    ) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async event => {
      const content = event.target?.result as string;
      const res = await importDatabaseFromJson(content);
      if (res.success) {
        setBackupStatus('Data restored successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setBackupStatus(`Import error: ${res.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddBodyWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBwValue);
    if (!val || isNaN(val)) return;

    await logBodyWeight(val);
    setNewBwValue('');
    const updated = await getBodyWeightLogs();
    setBwLogs(updated);
  };

  const handleResetStarterData = async () => {
    if (
      confirm(
        'This will reset your exercise library and routines back to default starter exercises. Your past workouts and PRs will be preserved. Proceed?'
      )
    ) {
      await seedDatabase(true);
      window.location.reload();
    }
  };

  // Barbell plate calculation (per side)
  const calculatePlates = () => {
    const weightPerSide = Math.max(0, (calcTargetWeight - barWeight) / 2);
    const standardPlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    let remaining = weightPerSide;
    const result: Array<{ plate: number; count: number }> = [];

    for (const p of standardPlates) {
      const count = Math.floor(remaining / p);
      if (count > 0) {
        result.push({ plate: p, count });
        remaining = Math.round((remaining - count * p) * 100) / 100;
      }
    }
    return { weightPerSide, plates: result, remainder: remaining };
  };

  const plateCalcResult = calculatePlates();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <header className="pt-2">
        <h1 className="text-2xl font-black text-white tracking-tight">Settings & Tools</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Preferences, local storage, backup & calculator</p>
      </header>

      {/* Status banner */}
      {backupStatus && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs font-semibold text-emerald-300 flex items-center justify-between">
          <span>{backupStatus}</span>
          <button onClick={() => setBackupStatus(null)} className="text-emerald-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Workout Preferences */}
      <section className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Workout Preferences
        </h2>

        {/* Unit toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">Weight Unit</p>
            <p className="text-[11px] text-zinc-400">Stored in kg, converted for display</p>
          </div>
          <div className="flex items-center p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-bold">
            <button
              onClick={() => handleUnitToggle('kg')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                unit === 'kg' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
              }`}
            >
              KG
            </button>
            <button
              onClick={() => handleUnitToggle('lb')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                unit === 'lb' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
              }`}
            >
              LB
            </button>
          </div>
        </div>

        {/* Rest Timer Default */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div>
            <p className="text-xs font-bold text-white">Default Rest Timer</p>
            <p className="text-[11px] text-zinc-400">Seconds between completed sets</p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
            {[60, 90, 120, 180].map(s => (
              <button
                key={s}
                onClick={() => handleRestChange(s)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  restSeconds === s ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs font-bold text-white">Timer Sound & Vibration</p>
              <p className="text-[11px] text-zinc-400">Synthetic Web Audio chime on rest completion</p>
            </div>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              soundEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Backup and Restore (Core Requirement) */}
      <section className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Backup & Restore (Offline Safety)
        </h2>
        <p className="text-xs text-zinc-400">
          All data is saved in your browser&apos;s IndexedDB. Export regular backups so you never lose your workout history.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportJson}
            className="p-3 bg-zinc-950 hover:bg-zinc-850 rounded-2xl border border-zinc-800 text-left transition-all active:scale-[0.98] flex items-center gap-3"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Export JSON</p>
              <p className="text-[10px] text-zinc-400">Full backup of all tables</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 bg-zinc-950 hover:bg-zinc-850 rounded-2xl border border-zinc-800 text-left transition-all active:scale-[0.98] flex items-center gap-3"
          >
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Import JSON</p>
              <p className="text-[10px] text-zinc-400">Restore from file</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />

          <button
            onClick={handleExportCsv}
            className="p-3 bg-zinc-950 hover:bg-zinc-850 rounded-2xl border border-zinc-800 text-left transition-all active:scale-[0.98] flex items-center gap-3 sm:col-span-2"
          >
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Export CSV</p>
              <p className="text-[10px] text-zinc-400">Spreadsheet table of all logged sets</p>
            </div>
          </button>
        </div>

        {/* Persistence Status */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs font-bold text-white">Storage Durability</p>
              <p className="text-[10px] text-zinc-400">
                {isPersisted ? 'Persistent (Protected from OS eviction)' : 'Best-effort (May be cleared if disk is low)'}
              </p>
            </div>
          </div>
          {!isPersisted && (
            <button
              onClick={handleRequestPersistence}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl"
            >
              Request Persistence
            </button>
          )}
        </div>
      </section>

      {/* Plate Calculator Tool */}
      <section className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Barbell Plate Calculator
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 block mb-1 uppercase">
              Target Weight (kg)
            </label>
            <input
              type="number"
              step="2.5"
              value={calcTargetWeight}
              onChange={e => setCalcTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 block mb-1 uppercase">
              Bar Weight (kg)
            </label>
            <input
              type="number"
              step="5"
              value={barWeight}
              onChange={e => setBarWeight(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
            />
          </div>
        </div>

        <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
          <p className="text-xs font-bold text-zinc-400 mb-2">
            Plates Per Side ({plateCalcResult.weightPerSide} kg each side):
          </p>
          {plateCalcResult.plates.length === 0 ? (
            <p className="text-xs text-zinc-500">Bar weight alone is sufficient.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {plateCalcResult.plates.map((p, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs rounded-lg"
                >
                  {p.count} × {p.plate} kg
                </span>
              ))}
            </div>
          )}
          {plateCalcResult.remainder > 0 && (
            <p className="text-[10px] text-amber-400 mt-1">
              +{plateCalcResult.remainder} kg remaining (fractional plates needed)
            </p>
          )}
        </div>
      </section>

      {/* Body Weight Log Tool */}
      <section className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Body Weight Tracker
          </h2>
        </div>

        <form onSubmit={handleAddBodyWeight} className="flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder="Weight (kg)"
            value={newBwValue}
            onChange={e => setNewBwValue(e.target.value)}
            className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Log Today
          </button>
        </form>

        {bwLogs.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {bwLogs.map(l => (
              <div
                key={l.id}
                className="flex items-center justify-between p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs"
              >
                <span className="text-zinc-400">{l.date}</span>
                <span className="font-mono font-bold text-white">{formatWeight(l.value, unit)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reset Starter Exercises */}
      <div className="pt-2">
        <button
          onClick={handleResetStarterData}
          className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reset Starter Library & Routines
        </button>
      </div>
    </div>
  );
}
