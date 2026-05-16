import { useRef } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { formatScore } from '../utils/scoring';

const MEDAL = { 1: '👑', 2: '🥈', 3: '🥉' };
const RANK_CLASS = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' };

// Country flag emoji from ISO country code
const FLAG_MAP = {
  Denmark:          '🇩🇰',
  Germany:          '🇩🇪',
  Israel:           '🇮🇱',
  Belgium:          '🇧🇪',
  Albania:          '🇦🇱',
  Greece:           '🇬🇷',
  Ukraine:          '🇺🇦',
  Australia:        '🇦🇺',
  Serbia:           '🇷🇸',
  Malta:            '🇲🇹',
  Czechia:          '🇨🇿',
  Bulgaria:         '🇧🇬',
  Croatia:          '🇭🇷',
  'United Kingdom': '🇬🇧',
  France:           '🇫🇷',
  Moldova:          '🇲🇩',
  Finland:          '🇫🇮',
  Poland:           '🇵🇱',
  Lithuania:        '🇱🇹',
  Sweden:           '🇸🇪',
  Cyprus:           '🇨🇾',
  Italy:            '🇮🇹',
  Norway:           '🇳🇴',
  Romania:          '🇷🇴',
  Austria:          '🇦🇹',
};

function LeaderboardRow({ entry, rank }) {
  const scored = entry.average !== null;
  const rankClass = RANK_CLASS[rank] ?? 'rank-other';
  const medal = MEDAL[rank] ?? null;

  // Score bar width (0–10 scale → 0–100%)
  const barWidth = scored ? `${(entry.average / 10) * 100}%` : '0%';

  return (
    <div
      className={`leaderboard-row panel ${rankClass} flex items-center gap-3 px-4 py-3 rounded-xl`}
    >
      {/* Rank number */}
      <div
        className="w-8 text-center font-black text-lg shrink-0"
        style={{ color: scored ? 'var(--text-primary)' : 'var(--text-muted)' }}
      >
        {scored ? (medal ?? rank) : '–'}
      </div>

      {/* Flag + Name + Song */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{FLAG_MAP[entry.country] ?? '🏳'}</span>
          <span
            className="font-bold text-base truncate"
            style={{ color: rank === 1 && scored ? 'var(--gold)' : 'var(--text-primary)' }}
          >
            {rank === 1 && scored ? (
              <span className="glow-gold">{entry.country}</span>
            ) : (
              entry.country
            )}
          </span>
        </div>
        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
          {entry.song} · {entry.artist}
        </div>

        {/* Score bar */}
        {scored && (
          <div
            className="mt-1.5 h-1 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: barWidth,
                background:
                  rank === 1
                    ? 'linear-gradient(90deg, var(--gold), var(--neon-pink))'
                    : 'linear-gradient(90deg, var(--neon-purple), var(--neon-cyan))',
              }}
            />
          </div>
        )}
      </div>

      {/* Average score */}
      <div
        className="shrink-0 text-2xl font-black tabular-nums"
        style={{
          color: scored
            ? rank === 1
              ? 'var(--gold)'
              : 'var(--text-primary)'
            : 'var(--text-muted)',
          minWidth: '4rem',
          textAlign: 'right',
        }}
      >
        {formatScore(entry.average)}
      </div>
    </div>
  );
}

export default function Leaderboard({ entries, judges }) {
  const [animParent] = useAutoAnimate({ duration: 320 });

  // Split into scored and unscored buckets
  const scored = entries.filter((e) => e.average !== null);
  const unscored = entries.filter((e) => e.average === null);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: 'var(--neon-pink)' }}
        >
          Leaderboard
        </h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {scored.length} / {entries.length} scored
          {judges.length > 0 && ` · ${judges.length} judge${judges.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Scored rows — animated */}
      {scored.length > 0 && (
        <ul ref={animParent} data-testid="leaderboard-list" className="flex flex-col gap-2">
          {scored.map((entry, i) => (
            <li key={entry.country}>
              <LeaderboardRow entry={entry} rank={i + 1} />
            </li>
          ))}
        </ul>
      )}

      {scored.length === 0 && (
        <div
          className="text-center py-16 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          No scores yet — submit the first one to start the board!
        </div>
      )}

      {/* Divider */}
      {unscored.length > 0 && scored.length > 0 && (
        <div
          className="flex items-center gap-2 my-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
          Not yet scored
          <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
        </div>
      )}

      {/* Unscored rows (no animation — static list) */}
      {unscored.length > 0 && (
        <ul data-testid="unscored-list" className="flex flex-col gap-1.5">
          {unscored.map((entry) => (
            <li key={entry.country}>
              <LeaderboardRow entry={entry} rank={null} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
