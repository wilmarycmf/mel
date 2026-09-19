# GlobalPulse Baseline Documentation

## Project layout

The project root (`/Users/wilmarycmf/code/mel`) contains the full stack Vite+React+TypeScript application.

- **Root**: `src/`, `backend/`, `package.json`, `vite.config.ts`, `tsconfig.json`, etc.
- **No duplicate directories**: A previously created `GlobalPulse/` directory was removed as it duplicated the root content and caused confusion.

## Verification steps

1. **No `GlobalPulse/` directory** – `find /Users/wilmarycmf/code/mel -maxdepth 1 -type d -name 'GlobalPulse'` returns nothing.
2. **No imports or path references to `GlobalPulse/`** – `grep -R "GlobalPulse/" .` returns no matches.
3. **Build succeeds** – `npm run build` produces a `dist/` folder.
4. **Dev server** – `npm run dev` starts Vite on `http://localhost:5173/` and the Express backend on `http://localhost:3000/`.
5. **Health endpoint** – `GET http://localhost:3000/api/health` returns `{ "status": "ok" }`.

These steps confirm that the root directory is the sole location of the application.
