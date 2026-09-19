# GlobalPulse

A living view of verified human progress and human action. Explore source-backed signals on the globe, review evidence, take part in an external mission, and record a local prototype contribution.

## Local development

Install dependencies:

```bash
npm install
```

Run the frontend and backend together:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

Run the backend alone:

```bash
npm start
```

## Build and preview

```bash
npm run build
npm run preview
```

`npm run preview` serves the built frontend. If frontend and backend are on separate origins, configure the frontend API origin as below.

## Environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Frontend build | API origin or base path. Defaults to same-origin `/api`; for a split deployment use the backend origin, for example `https://api.example.com`. |
| `PORT` | Backend | HTTP port. Defaults to `3000`. |
| `FRONTEND_ORIGIN` | Backend | Single allowed production frontend origin for CORS, for example `https://app.example.com`. When omitted, local Vite origins are allowed for development. |

`VITE_API_BASE` remains supported as a legacy local-development alias. Do not commit `.env` files; use an untracked local `.env` or provider environment settings.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and the backend with file watching. |
| `npm start` | Start the production-style backend. |
| `npm run build` | Build the frontend for production. |
| `npm run preview` | Serve the built frontend locally. |
| `npm run test:backend` | Run backend tests. |
| `npx tsc --noEmit` | Type-check frontend TypeScript. |

## Known limitations

- Approved dynamic ingestion signals are in memory only; restarting the backend resets that review state.
- Guarded ingestion currently accepts only official NASA Science and WHO URLs.
- Mission completion is self-reported.
- Human Constellation counts prototype contributions on this device only.
