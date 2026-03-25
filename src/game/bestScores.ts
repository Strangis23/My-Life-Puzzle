export interface BestRecord {
  moves: number;
  timeMs: number;
}

const LS_KEY = "my-life-puzzle-bests";

type Store = Record<string, BestRecord>;

function key(gridN: number, easy: boolean): string {
  return `${gridN}-${easy ? "easy" : "hard"}`;
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function loadBest(gridN: number, easy: boolean): BestRecord | null {
  const k = key(gridN, easy);
  const rec = readStore()[k];
  if (
    !rec ||
    typeof rec.moves !== "number" ||
    typeof rec.timeMs !== "number"
  ) {
    return null;
  }
  return rec;
}

/** Returns true if this run is a new personal best (fewer moves, or same moves and faster time). */
export function maybeSaveBest(
  gridN: number,
  easy: boolean,
  moves: number,
  timeMs: number,
): boolean {
  const k = key(gridN, easy);
  const store = readStore();
  const prev = store[k];
  const isBetter =
    !prev ||
    moves < prev.moves ||
    (moves === prev.moves && timeMs < prev.timeMs);
  if (!isBetter) return false;
  store[k] = { moves, timeMs };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
  return true;
}

export function formatTimeMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, "0")}` : `${r}s`;
}

export interface BestRow {
  gridN: number;
  easy: boolean;
  moves: number;
  timeMs: number;
}

/** All saved bests for the high scores screen, sorted by grid size then Easy before Hard. */
export function listAllBestRecords(): BestRow[] {
  const store = readStore();
  const rows: BestRow[] = [];
  for (const [k, rec] of Object.entries(store)) {
    const m = /^(\d+)-(easy|hard)$/.exec(k);
    if (
      !m ||
      !rec ||
      typeof rec.moves !== "number" ||
      typeof rec.timeMs !== "number"
    ) {
      continue;
    }
    rows.push({
      gridN: Number(m[1]),
      easy: m[2] === "easy",
      moves: rec.moves,
      timeMs: rec.timeMs,
    });
  }
  rows.sort((a, b) => {
    if (a.gridN !== b.gridN) return a.gridN - b.gridN;
    if (a.easy !== b.easy) return a.easy ? -1 : 1;
    return 0;
  });
  return rows;
}
