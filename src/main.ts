import "./style.css";
import { formatTimeMs, listAllBestRecords } from "./game/bestScores";
import { mountGameView } from "./game/GameView";
import { addImage, deleteImage, getImage, listImages } from "./storage/images";

const app: HTMLDivElement = (() => {
  const el = document.querySelector<HTMLDivElement>("#app");
  if (!el) {
    throw new Error("#app missing");
  }
  return el;
})();

type Screen = "library" | "setup" | "game" | "highscores";

let currentScreen: Screen = "library";
let gameCleanup: (() => void) | null = null;
let gameObjectUrl: string | null = null;

let selectedId: string | null = null;
let setupGridN = 4;
let setupGhost = true;

const thumbUrls: string[] = [];

function revokeGameUrl() {
  if (gameObjectUrl) {
    URL.revokeObjectURL(gameObjectUrl);
    gameObjectUrl = null;
  }
}

function cleanupThumbs() {
  for (const u of thumbUrls) {
    URL.revokeObjectURL(u);
  }
  thumbUrls.length = 0;
}

function leaveGame() {
  if (gameCleanup) {
    gameCleanup();
    gameCleanup = null;
  }
  revokeGameUrl();
}

function render() {
  leaveGame();
  cleanupThumbs();

  if (currentScreen === "library") {
    void renderLibrary();
    return;
  }
  if (currentScreen === "highscores") {
    renderHighScores();
    return;
  }
  if (currentScreen === "setup") {
    renderSetup();
    return;
  }
  if (currentScreen === "game" && selectedId) {
    void renderGame(selectedId);
  }
}

async function renderLibrary() {
  const items = await listImages();

  app.innerHTML = `
    <div class="shell">
      <header class="hero">
        <h1 class="title">My Life Puzzle</h1>
        <p class="subtitle">Upload photos, then turn them into sliding picture puzzles in your browser.</p>
      </header>
      <section class="panel">
        <div class="toolbar toolbar--split">
          <label class="btn btn-upload">
            <input type="file" accept="image/*" class="visually-hidden" data-upload />
            Add photos
          </label>
          <button type="button" class="btn btn-ghost" data-highscores>High scores</button>
        </div>
        <ul class="gallery" data-gallery></ul>
        ${
          items.length === 0
            ? '<p class="empty-hint">No photos yet. Choose images from your phone or computer — they stay on this device.</p>'
            : ""
        }
      </section>
    </div>
  `;

  const upload = app.querySelector<HTMLInputElement>("[data-upload]");
  const gallery = app.querySelector<HTMLUListElement>("[data-gallery]");

  app.querySelector("[data-highscores]")?.addEventListener("click", () => {
    currentScreen = "highscores";
    render();
  });

  upload?.addEventListener("change", async () => {
    const files = upload.files;
    if (!files?.length) return;
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      await addImage(file, file.name.replace(/\.[^.]+$/, "") || "Photo");
    }
    upload.value = "";
    render();
  });

  if (gallery) {
    for (const item of items) {
      const url = URL.createObjectURL(item.blob);
      thumbUrls.push(url);

      const li = document.createElement("li");
      li.className = "gallery-item";
      li.innerHTML = `
        <button type="button" class="gallery-card" data-select="${item.id}">
          <span class="thumb-wrap"><img src="${url}" alt="" class="thumb" loading="lazy" /></span>
          <span class="gallery-meta">
            <span class="gallery-name">${escapeHtml(item.name)}</span>
            <span class="gallery-date">${formatDate(item.createdAt)}</span>
          </span>
        </button>
        <button type="button" class="btn btn-icon btn-delete" data-delete="${item.id}" aria-label="Delete photo">×</button>
      `;

      li.querySelector(`[data-select="${item.id}"]`)?.addEventListener("click", () => {
        selectedId = item.id;
        currentScreen = "setup";
        render();
      });

      li.querySelector(`[data-delete="${item.id}"]`)?.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteImage(item.id);
        if (selectedId === item.id) selectedId = null;
        render();
      });

      gallery.append(li);
    }
  }
}

function renderHighScores() {
  const rows = listAllBestRecords();

  app.innerHTML = `
    <div class="shell highscores-shell">
      <header class="highscores-header">
        <button type="button" class="btn btn-ghost" data-back>← Library</button>
        <h1 class="title highscores-title">High scores</h1>
      </header>
      <p class="highscores-lede">Personal bests on this device (fewest moves wins; same moves, fastest time).</p>
      <section class="panel highscores-panel">
        ${
          rows.length === 0
            ? '<p class="empty-hint highscores-empty">No scores yet. Finish a puzzle to record one.</p>'
            : `
        <div class="table-wrap">
          <table class="scores-table">
            <thead>
              <tr>
                <th scope="col">Grid</th>
                <th scope="col">Mode</th>
                <th scope="col">Moves</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
              <tr>
                <td>${r.gridN}×${r.gridN}</td>
                <td>${r.easy ? "Easy" : "Hard"}</td>
                <td>${r.moves}</td>
                <td>${formatTimeMs(r.timeMs)}</td>
              </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
        }
      </section>
    </div>
  `;

  app.querySelector("[data-back]")?.addEventListener("click", () => {
    currentScreen = "library";
    render();
  });
}

function renderSetup() {
  if (!selectedId) {
    currentScreen = "library";
    render();
    return;
  }

  app.innerHTML = `
    <div class="shell setup-shell">
      <p class="empty-hint" style="margin:2rem 0;text-align:center">Loading…</p>
    </div>
  `;

  void getImage(selectedId).then((record) => {
    if (!record || currentScreen !== "setup" || selectedId !== record.id) return;

    const previewUrl = URL.createObjectURL(record.blob);
    thumbUrls.push(previewUrl);

    app.innerHTML = `
      <div class="shell setup-shell">
        <header class="setup-header">
          <button type="button" class="btn btn-ghost" data-back>← Library</button>
          <h2 class="setup-title">Puzzle options</h2>
        </header>
        <div class="setup-body">
          <div class="setup-preview">
            <img src="${previewUrl}" alt="" class="setup-img" />
          </div>
          <div class="setup-controls">
            <label class="field">
              <span class="field-label">Grid size</span>
              <div class="field-row">
                <input type="range" min="2" max="20" value="${setupGridN}" data-grid />
                <output class="grid-out" data-grid-out>${setupGridN}×${setupGridN}</output>
              </div>
              <span class="field-hint">${setupGridN * setupGridN} pieces</span>
            </label>
            <fieldset class="field difficulty">
              <legend class="field-label">Difficulty</legend>
              <label class="radio">
                <input type="radio" name="diff" value="easy" ${setupGhost ? "checked" : ""} />
                <span>Easy — ghost image behind pieces</span>
              </label>
              <label class="radio">
                <input type="radio" name="diff" value="hard" ${setupGhost ? "" : "checked"} />
                <span>Hard — no ghost</span>
              </label>
            </fieldset>
            <button type="button" class="btn btn-primary btn-block" data-start>Start puzzle</button>
          </div>
        </div>
      </div>
    `;

    const grid = app.querySelector<HTMLInputElement>("[data-grid]");
    const out = app.querySelector<HTMLOutputElement>("[data-grid-out]");
    const hint = app.querySelector(".field-hint");

    grid?.addEventListener("input", () => {
      const v = Number(grid.value);
      setupGridN = v;
      if (out) out.textContent = `${v}×${v}`;
      if (hint) hint.textContent = `${v * v} pieces`;
    });

    app.querySelectorAll<HTMLInputElement>('input[name="diff"]').forEach((r) => {
      r.addEventListener("change", () => {
        setupGhost = r.value === "easy";
      });
    });

    app.querySelector("[data-back]")?.addEventListener("click", () => {
      currentScreen = "library";
      render();
    });

    app.querySelector("[data-start]")?.addEventListener("click", () => {
      currentScreen = "game";
      render();
    });
  });
}

async function renderGame(imageId: string) {
  const record = await getImage(imageId);
  if (!record) {
    currentScreen = "library";
    render();
    return;
  }

  revokeGameUrl();
  gameObjectUrl = URL.createObjectURL(record.blob);

  app.innerHTML = `<div class="game-root" data-game-root></div>`;
  const root = app.querySelector<HTMLDivElement>("[data-game-root]");
  if (!root || !gameObjectUrl) return;

  gameCleanup = mountGameView(root, {
    imageUrl: gameObjectUrl,
    gridN: setupGridN,
    ghost: setupGhost,
    onBack: () => {
      currentScreen = "library";
      selectedId = null;
      render();
    },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(t: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(t));
  } catch {
    return new Date(t).toLocaleString();
  }
}

render();
