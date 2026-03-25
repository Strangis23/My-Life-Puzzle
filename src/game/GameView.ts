import {
  formatTimeMs,
  loadBest,
  maybeSaveBest,
} from "./bestScores";
import {
  getOuterEdgeBoxShadow,
  isBoardSolved,
  shuffleIndices,
  shufflePositions,
  tileBackgroundStyles,
} from "./puzzle";

export interface GameViewOptions {
  imageUrl: string;
  gridN: number;
  ghost: boolean;
  onBack: () => void;
}

type DragSource =
  | { kind: "pile"; pieceIndex: number }
  | { kind: "board"; slot: number };

export function mountGameView(
  container: HTMLElement,
  options: GameViewOptions,
): () => void {
  const n = options.gridN;
  const total = n * n;

  let board: (number | null)[] = Array.from({ length: total }, () => null);
  let pile: number[] = shufflePositions(n);
  let solved = false;
  let moves = 0;
  const startMs = Date.now();
  let elapsedAtWinMs = 0;

  const root = document.createElement("div");
  root.className = "game-view";

  const header = document.createElement("header");
  header.className = "game-header game-header--stacked";
  header.innerHTML = `
    <div class="game-header-row">
      <button type="button" class="btn btn-ghost" data-action="back">← Library</button>
      <div class="game-title-wrap">
        <span class="game-badge">${options.gridN}×${options.gridN}</span>
        <span class="game-badge">${options.ghost ? "Easy" : "Hard"}</span>
      </div>
      <button type="button" class="btn" data-action="shuffle-pile" title="Shuffle only the pieces still in the pile">Shuffle pile</button>
    </div>
    <div class="game-stats" data-stats>
      <span data-stat-moves>Moves: 0</span>
      <span data-stat-time>Time: 0s</span>
      <span data-stat-best>Best: —</span>
    </div>
  `;

  const statMovesEl = header.querySelector("[data-stat-moves]");
  const statTimeEl = header.querySelector("[data-stat-time]");
  const statBestEl = header.querySelector("[data-stat-best]");

  function updateStatsDisplay() {
    if (statMovesEl) {
      statMovesEl.textContent = `Moves: ${moves}`;
    }
    if (statTimeEl) {
      const ms = solved ? elapsedAtWinMs : Date.now() - startMs;
      statTimeEl.textContent = `Time: ${formatTimeMs(ms)}`;
    }
    if (statBestEl) {
      const b = loadBest(n, options.ghost);
      statBestEl.textContent = b
        ? `Best: ${b.moves} moves · ${formatTimeMs(b.timeMs)}`
        : "Best: —";
    }
  }

  const playArea = document.createElement("div");
  playArea.className = "game-play-area";

  const boardWrap = document.createElement("div");
  boardWrap.className = "game-board-outer";
  if (options.ghost) {
    boardWrap.classList.add("game-board--easy");
  }

  const ghost = document.createElement("div");
  ghost.className = "game-ghost";
  ghost.style.backgroundImage = `url(${JSON.stringify(options.imageUrl)})`;
  ghost.style.display = options.ghost ? "block" : "none";
  ghost.setAttribute("aria-hidden", "true");

  const grid = document.createElement("div");
  grid.className = "puzzle-grid";
  grid.setAttribute("role", "grid");

  const winBanner = document.createElement("div");
  winBanner.className = "win-banner";
  winBanner.hidden = true;
  winBanner.innerHTML = `<p class="win-text">Complete!</p>`;

  boardWrap.append(ghost, grid, winBanner);

  const pileSection = document.createElement("div");
  pileSection.className = "piece-pile-section";

  const pileLabel = document.createElement("div");
  pileLabel.className = "piece-pile-label";
  pileLabel.textContent = "Pieces — drag onto the board";

  const pileEl = document.createElement("div");
  pileEl.className = "piece-pile";
  pileEl.dataset.pile = "true";

  pileSection.append(pileLabel, pileEl);

  playArea.append(boardWrap, pileSection);
  root.append(header, playArea);
  container.append(root);

  updateStatsDisplay();

  let timerId: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (!solved) {
      updateStatsDisplay();
    }
  }, 300);

  const img = new Image();
  img.decoding = "async";

  let dragState: {
    source: DragSource;
    preview: HTMLElement;
    pointerId: number;
    originEl: HTMLElement;
  } | null = null;

  function applyPieceFace(el: HTMLElement, correctPieceIndex: number) {
    const { backgroundSize, backgroundPosition } = tileBackgroundStyles(
      correctPieceIndex,
      options.gridN,
    );
    el.style.backgroundImage = `url(${JSON.stringify(options.imageUrl)})`;
    el.style.backgroundSize = backgroundSize;
    el.style.backgroundPosition = backgroundPosition;
    el.style.backgroundRepeat = "no-repeat";
    if (options.ghost) {
      el.style.boxShadow = getOuterEdgeBoxShadow(correctPieceIndex, options.gridN);
    } else {
      el.style.boxShadow = "";
    }
  }

  function makePieceElement(
    correctPieceIndex: number,
    source: DragSource,
  ): HTMLElement {
    const piece = document.createElement("div");
    piece.className = "puzzle-piece";
    piece.dataset.piece = String(correctPieceIndex);
    piece.tabIndex = 0;
    if (source.kind === "pile") {
      piece.dataset.fromPile = "true";
    } else {
      piece.dataset.fromSlot = String(source.slot);
    }
    applyPieceFace(piece, correctPieceIndex);
    piece.addEventListener("pointerdown", (e) => onPiecePointerDown(e, source));
    return piece;
  }

  function makeEmptySlot(slotIndex: number): HTMLElement {
    const slot = document.createElement("div");
    slot.className = "puzzle-slot puzzle-slot-empty";
    slot.dataset.slot = String(slotIndex);
    slot.setAttribute("role", "gridcell");
    slot.setAttribute("aria-label", `Empty slot ${slotIndex + 1}`);
    return slot;
  }

  function makeFilledSlot(slotIndex: number, pieceIndex: number): HTMLElement {
    const slot = document.createElement("div");
    slot.className = "puzzle-slot puzzle-slot-filled";
    slot.dataset.slot = String(slotIndex);
    slot.setAttribute("role", "gridcell");
    slot.setAttribute("aria-label", `Slot ${slotIndex + 1}`);
    const piece = makePieceElement(pieceIndex, { kind: "board", slot: slotIndex });
    slot.append(piece);
    return slot;
  }

  function syncSolved() {
    const wasSolved = solved;
    solved = isBoardSolved(board, n);
    winBanner.hidden = !solved;
    if (solved && !wasSolved) {
      elapsedAtWinMs = Date.now() - startMs;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      maybeSaveBest(n, options.ghost, moves, elapsedAtWinMs);
      updateStatsDisplay();
    }
  }

  function applyDrop(
    pieceIndex: number,
    source: DragSource,
    targetSlot: number | "pile",
  ): boolean {
    if (targetSlot === "pile") {
      if (source.kind !== "board") return false;
      const s = source.slot;
      if (board[s] !== pieceIndex) return false;
      board[s] = null;
      pile.push(pieceIndex);
      return true;
    }

    const s = targetSlot;
    const atTarget = board[s];

    if (source.kind === "pile") {
      if (!pile.includes(pieceIndex)) return false;
      if (atTarget === null) {
        board[s] = pieceIndex;
        pile = pile.filter((p) => p !== pieceIndex);
      } else {
        board[s] = pieceIndex;
        pile = pile.filter((p) => p !== pieceIndex);
        pile.push(atTarget);
      }
      return true;
    }

    const fromSlot = source.slot;
    if (board[fromSlot] !== pieceIndex) return false;

    if (s === fromSlot) return false;

    if (atTarget === null) {
      board[s] = pieceIndex;
      board[fromSlot] = null;
    } else {
      board[fromSlot] = atTarget;
      board[s] = pieceIndex;
    }
    return true;
  }

  function endDrag(e: PointerEvent) {
    if (!dragState) return;
    if (e.pointerId !== dragState.pointerId) return;

    const { source, originEl } = dragState;
    const pieceIndex =
      source.kind === "pile"
        ? source.pieceIndex
        : (board[source.slot] ?? -1);
    if (pieceIndex < 0) {
      cleanupDrag();
      return;
    }

    originEl.style.opacity = "";

    const wasSolvedAtStart = solved;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slotTarget = el?.closest("[data-slot]");
    const pileTarget = el?.closest("[data-pile]");

    let changed = false;
    if (pileTarget && source.kind === "board") {
      changed = applyDrop(pieceIndex, source, "pile");
    } else if (slotTarget) {
      const slot = parseInt(slotTarget.getAttribute("data-slot") ?? "", 10);
      if (!Number.isNaN(slot)) {
        changed = applyDrop(pieceIndex, source, slot);
      }
    }

    if (changed && !wasSolvedAtStart) {
      moves += 1;
    }

    cleanupDrag();
    render();
  }

  function cleanupDrag() {
    if (!dragState) return;
    dragState.preview.remove();
    document.body.classList.remove("is-dragging-piece");
    document.removeEventListener("pointermove", onPointerMoveWhileDrag);
    document.removeEventListener("pointerup", endDrag);
    document.removeEventListener("pointercancel", endDrag);
    dragState = null;
  }

  function onPointerMoveWhileDrag(e: PointerEvent) {
    if (!dragState) return;
    if (e.pointerId !== dragState.pointerId) return;
    e.preventDefault();
    const { preview } = dragState;
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    preview.style.left = `${e.clientX - w / 2}px`;
    preview.style.top = `${e.clientY - h / 2}px`;
  }

  function onPiecePointerDown(e: PointerEvent, source: DragSource) {
    if (solved) return;
    if (e.button !== 0) return;
    const target = e.currentTarget as HTMLElement;
    e.preventDefault();

    const pieceIndex =
      source.kind === "pile"
        ? source.pieceIndex
        : (board[source.slot] ?? null);
    if (pieceIndex === null) return;

    const preview = document.createElement("div");
    preview.className = "puzzle-piece puzzle-piece--floating";
    applyPieceFace(preview, pieceIndex);
    const rect = target.getBoundingClientRect();
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.append(preview);

    preview.style.left = `${e.clientX - rect.width / 2}px`;
    preview.style.top = `${e.clientY - rect.height / 2}px`;

    target.style.opacity = "0.35";

    dragState = {
      source,
      preview,
      pointerId: e.pointerId,
      originEl: target,
    };
    document.body.classList.add("is-dragging-piece");

    document.addEventListener("pointermove", onPointerMoveWhileDrag, { passive: false });
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
  }

  function renderBoardAndPile() {
    grid.replaceChildren();
    grid.style.setProperty("--n", String(options.gridN));

    for (let slot = 0; slot < total; slot++) {
      const p = board[slot];
      if (p === null) {
        grid.append(makeEmptySlot(slot));
      } else {
        grid.append(makeFilledSlot(slot, p));
      }
    }

    pileEl.replaceChildren();
    for (const pieceIndex of pile) {
      pileEl.append(makePieceElement(pieceIndex, { kind: "pile", pieceIndex }));
    }

    boardWrap.style.setProperty("--aspect", String(img.naturalWidth / img.naturalHeight));
    pileSection.style.setProperty(
      "--board-aspect",
      String(img.naturalWidth / img.naturalHeight),
    );
  }

  function render() {
    renderBoardAndPile();
    syncSolved();
    updateStatsDisplay();
  }

  function onShufflePile() {
    cleanupDrag();
    if (pile.length < 2) return;
    pile = shuffleIndices(pile);
    render();
  }

  function tryInitialRender() {
    if (img.naturalWidth > 0) {
      render();
    }
  }

  img.onload = tryInitialRender;

  img.onerror = () => {
    boardWrap.innerHTML =
      '<p class="error-msg">Could not load this image. Try another photo.</p>';
  };

  img.src = options.imageUrl;
  if (img.complete) {
    tryInitialRender();
  }

  const onBack = options.onBack;
  header.querySelector('[data-action="back"]')?.addEventListener("click", onBack);
  header
    .querySelector('[data-action="shuffle-pile"]')
    ?.addEventListener("click", onShufflePile);

  return () => {
    cleanupDrag();
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    header.querySelector('[data-action="back"]')?.removeEventListener("click", onBack);
    header
      .querySelector('[data-action="shuffle-pile"]')
      ?.removeEventListener("click", onShufflePile);
    root.remove();
  };
}
