import { useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useLocalStorage } from './hooks/useLocalStorage';
import { COUNTRIES } from './data/countries';
import { calculateAverage, sortEntries } from './utils/scoring';
import ControlDesk from './components/ControlDesk';
import JudgeManager from './components/JudgeManager';
import Leaderboard from './components/Leaderboard';

const STORAGE_KEY = 'eurovision-2026';

const DEFAULT_STATE = {
  judges: ['Alice', 'Bob', 'Charlie', 'Dave'],
  entries: COUNTRIES.map(({ country, song, artist, order }) => ({
    country,
    song,
    artist,
    order,
    scores: {},
    average: null,
  })),
};

function fireConfetti() {
  const end = Date.now() + 2200;
  const colors = ['#ff0080', '#9d4edd', '#00d4ff', '#ffd700', '#ffffff'];
  (function burst() {
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 65,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 7,
      angle: 120,
      spread: 65,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(burst);
  })();
}

export default function App() {
  const [appState, setAppState] = useLocalStorage(STORAGE_KEY, DEFAULT_STATE);
  const prevFirstRef = useRef(null);

  // ── Derived sorted entries ──
  const sortedEntries = sortEntries(appState.entries);

  // ── Score submission ──
  const handleSubmit = useCallback(
    (country, scoresInput) => {
      setAppState((prev) => {
        const newEntries = prev.entries.map((entry) => {
          if (entry.country !== country) return entry;
          // Merge new scores over existing (allows partial submission)
          const merged = { ...entry.scores };
          prev.judges.forEach((judge) => {
            const val = scoresInput[judge];
            if (val !== '' && val !== undefined && val !== null) {
              merged[judge] = Number(val);
            }
          });
          return { ...entry, scores: merged, average: calculateAverage(merged) };
        });

        const sorted = sortEntries(newEntries);
        const newFirst = sorted.find((e) => e.average !== null)?.country ?? null;
        if (newFirst && newFirst !== prevFirstRef.current) {
          prevFirstRef.current = newFirst;
          setTimeout(fireConfetti, 50);
        }

        return { ...prev, entries: newEntries };
      });
    },
    [setAppState]
  );

  // ── Judge management ──
  const handleAddJudge = useCallback(
    (name) => {
      if (!name.trim() || appState.judges.includes(name.trim())) return;
      setAppState((prev) => ({ ...prev, judges: [...prev.judges, name.trim()] }));
    },
    [appState.judges, setAppState]
  );

  const handleRenameJudge = useCallback(
    (oldName, newName) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName || appState.judges.includes(trimmed)) return;
      setAppState((prev) => ({
        ...prev,
        judges: prev.judges.map((j) => (j === oldName ? trimmed : j)),
        entries: prev.entries.map((entry) => {
          const scores = { ...entry.scores };
          if (oldName in scores) {
            scores[trimmed] = scores[oldName];
            delete scores[oldName];
          }
          return { ...entry, scores, average: calculateAverage(scores) };
        }),
      }));
    },
    [appState.judges, setAppState]
  );

  const handleRemoveJudge = useCallback(
    (name) => {
      setAppState((prev) => ({
        ...prev,
        judges: prev.judges.filter((j) => j !== name),
        entries: prev.entries.map((entry) => {
          const scores = { ...entry.scores };
          delete scores[name];
          return { ...entry, scores, average: calculateAverage(scores) };
        }),
      }));
    },
    [setAppState]
  );

  // ── Hard reset ──
  const handleReset = useCallback(() => {
    if (window.confirm('Reset ALL scores and start fresh? This cannot be undone.')) {
      prevFirstRef.current = null;
      setAppState(DEFAULT_STATE);
    }
  }, [setAppState]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="text-center py-6 px-4 border-b border-[var(--border-dim)]">
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--neon-pink)' }}>
          ★ EUROVISION 2026
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Vienna Grand Final · Score Master Console
        </p>
      </header>

      {/* ── Main layout ── */}
      <main className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left panel — Control Desk */}
        <aside className="w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto">
          <JudgeManager
            judges={appState.judges}
            onAdd={handleAddJudge}
            onRename={handleRenameJudge}
            onRemove={handleRemoveJudge}
          />
          <ControlDesk
            judges={appState.judges}
            entries={appState.entries}
            onSubmit={handleSubmit}
          />
          <button
            className="btn btn-danger w-full mt-auto"
            onClick={handleReset}
          >
            Hard Reset
          </button>
        </aside>

        {/* Right panel — Leaderboard */}
        <section className="flex-1 overflow-y-auto">
          <Leaderboard entries={sortedEntries} judges={appState.judges} />
        </section>
      </main>
    </div>
  );
}
