/** Fisher–Yates shuffle of [0..n*n-1]. Ensures not already solved when n*n > 1. */
export function shufflePositions(gridN: number): number[] {
  const len = gridN * gridN;
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = len - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (len > 1 && arr.every((v, i) => v === i)) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

export function isSolved(positions: number[]): boolean {
  return positions.every((pieceAtSlot, slot) => pieceAtSlot === slot);
}

/** Board[i] = piece that belongs at slot i, or null if empty. Win when every slot holds the correct piece. */
export function isBoardSolved(board: (number | null)[], gridN: number): boolean {
  const gn = Number(gridN);
  if (!Number.isFinite(gn) || gn < 1) {
    return false;
  }
  const expected = gn * gn;
  if (board.length !== expected) {
    return false;
  }
  // Use a loop (not Array#every): every() skips holes in sparse arrays and is vacuously true on [].
  for (let slot = 0; slot < expected; slot++) {
    const piece = board[slot];
    if (piece !== slot) {
      return false;
    }
  }
  return true;
}

/** Fisher–Yates shuffle of a copy of `indices` (e.g. pile only). */
export function shuffleIndices(indices: number[]): number[] {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** In Easy mode, inset “frame” lines on sides that touch the outer edge of the full image. */
export function getOuterEdgeBoxShadow(correctIndex: number, gridN: number): string {
  const row = Math.floor(correctIndex / gridN);
  const col = correctIndex % gridN;
  const n = gridN;
  const c = "rgba(255, 255, 255, 0.9)";
  const t = 2.5;
  const parts: string[] = [];
  if (row === 0) {
    parts.push(`inset 0 ${t}px 0 0 ${c}`);
  }
  if (row === n - 1) {
    parts.push(`inset 0 -${t}px 0 0 ${c}`);
  }
  if (col === 0) {
    parts.push(`inset ${t}px 0 0 0 ${c}`);
  }
  if (col === n - 1) {
    parts.push(`inset -${t}px 0 0 0 ${c}`);
  }
  return parts.join(", ");
}

/** CSS background-size and background-position for the tile that belongs at `correctIndex` in an N×N grid. */
export function tileBackgroundStyles(
  correctIndex: number,
  gridN: number,
): { backgroundSize: string; backgroundPosition: string } {
  const row = Math.floor(correctIndex / gridN);
  const col = correctIndex % gridN;
  const backgroundSize = `${gridN * 100}% ${gridN * 100}%`;
  const x = gridN <= 1 ? 0 : (col / (gridN - 1)) * 100;
  const y = gridN <= 1 ? 0 : (row / (gridN - 1)) * 100;
  return {
    backgroundSize,
    backgroundPosition: `${x}% ${y}%`,
  };
}
