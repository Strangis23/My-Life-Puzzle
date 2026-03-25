# My Life Puzzle

Browser-only photo puzzle: upload images (stored in **IndexedDB** on your device), pick a grid from **2×2** through **20×20**, and swap tiles until the picture is restored. **Easy** shows a faint ghost image behind the board; **Hard** does not.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Output is in **`dist/`**. Preview it locally with `npm run preview`.

## GitHub Pages

[Vite `base`](https://vitejs.dev/config/shared-options.html#base) is set to **`./`** in [`vite.config.ts`](vite.config.ts) so scripts and styles load correctly for a project site (`https://<user>.github.io/<repo>/`) without hard-coding the repository name.

### Option A: GitHub Actions (recommended)

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment**: set **Source** to **GitHub Actions**.
3. The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs on pushes to `main`, runs `npm ci` and `npm run build`, and deploys the **`dist`** folder.

### Option B: Deploy from a branch

1. Run `npm run build` locally (or in CI) and commit the **`dist`** contents to a branch such as **`gh-pages`**, or use an action that only pushes `dist`.
2. **Settings → Pages**: choose that branch and the **`/`** (root) or **`dist`** folder as appropriate.

After deployment, open **`https://<your-username>.github.io/<repository-name>/`**.

## Privacy

Photos never leave your browser; they are stored only in this site’s IndexedDB on your device.
