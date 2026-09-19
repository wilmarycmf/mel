/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Production API origin/path override; defaults to same-origin "/api". */
  readonly VITE_API_BASE_URL?: string;
  /** Legacy alias retained for existing local setups. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
