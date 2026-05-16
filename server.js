import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { COUNTRIES } from './src/data/countries.js';
import { calculateAverage } from './src/utils/scoring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const STATE_FILE = path.join(__dirname, 'state.json');

app.use(express.json());

// Allow requests from the Vite dev server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Default & persisted state ─────────────────────────────────────────────────

const DEFAULT_STATE = {
  judges: ['Alice', 'Bob', 'Charlie', 'Dave'],
  entries: COUNTRIES.map(({ country, song, artist, order }) => ({
    country, song, artist, order, scores: {}, average: null,
  })),
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log('Loaded saved state from state.json');
      return parsed;
    }
  } catch (e) {
    console.warn('Could not load state.json, starting fresh:', e.message);
  }
  return structuredClone(DEFAULT_STATE);
}

function saveState(s) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    console.error('Failed to persist state:', e.message);
  }
}

let state = loadState();

// ── SSE broadcast ─────────────────────────────────────────────────────────────

const clients = new Set();

function broadcast(s) {
  const payload = `data: ${JSON.stringify(s)}\n\n`;
  for (const client of clients) {
    try { client.write(payload); } catch { clients.delete(client); }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Real-time event stream — the TV and phone both connect here
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send the current state immediately on connect so new clients are in sync
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  clients.add(res);
  console.log(`Client connected (${clients.size} total)`);

  req.on('close', () => {
    clients.delete(res);
    console.log(`Client disconnected (${clients.size} remaining)`);
  });
});

// Snapshot for initial load
app.get('/api/state', (req, res) => res.json(state));

// Submit / update a country's scores
app.post('/api/score', (req, res) => {
  const { country, scores: input } = req.body;
  state = {
    ...state,
    entries: state.entries.map(entry => {
      if (entry.country !== country) return entry;
      const merged = { ...entry.scores };
      state.judges.forEach(judge => {
        const v = input[judge];
        if (v !== '' && v !== undefined && v !== null) merged[judge] = Number(v);
      });
      return { ...entry, scores: merged, average: calculateAverage(merged) };
    }),
  };
  saveState(state);
  broadcast(state);
  res.json({ ok: true });
});

// Add a judge
app.post('/api/judges/add', (req, res) => {
  const name = req.body.name?.trim();
  if (!name || state.judges.includes(name))
    return res.status(400).json({ error: 'Invalid or duplicate name' });
  state = { ...state, judges: [...state.judges, name] };
  saveState(state);
  broadcast(state);
  res.json({ ok: true });
});

// Rename a judge (propagates through all existing scores)
app.post('/api/judges/rename', (req, res) => {
  const { oldName, newName } = req.body;
  const trimmed = newName?.trim();
  if (!trimmed || trimmed === oldName || state.judges.includes(trimmed))
    return res.status(400).json({ error: 'Invalid rename' });
  state = {
    ...state,
    judges: state.judges.map(j => (j === oldName ? trimmed : j)),
    entries: state.entries.map(entry => {
      const scores = { ...entry.scores };
      if (oldName in scores) { scores[trimmed] = scores[oldName]; delete scores[oldName]; }
      return { ...entry, scores, average: calculateAverage(scores) };
    }),
  };
  saveState(state);
  broadcast(state);
  res.json({ ok: true });
});

// Remove a judge (purges their scores from all entries)
app.post('/api/judges/remove', (req, res) => {
  const { name } = req.body;
  state = {
    ...state,
    judges: state.judges.filter(j => j !== name),
    entries: state.entries.map(entry => {
      const scores = { ...entry.scores };
      delete scores[name];
      return { ...entry, scores, average: calculateAverage(scores) };
    }),
  };
  saveState(state);
  broadcast(state);
  res.json({ ok: true });
});

// Hard reset — also used by Playwright tests via /api/reset
app.post('/api/reset', (_req, res) => {
  state = structuredClone(DEFAULT_STATE);
  saveState(state);
  broadcast(state);
  res.json({ ok: true });
});

// Serve built React app in production (after npm run build)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nEurovision scorer running:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  Network: http://${iface.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
