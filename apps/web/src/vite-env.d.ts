/// <reference types="vite/client" />

/**
 * Typed Vite environment variables for Quiz2Biz Web
 * @see https://vite.dev/guide/env-and-mode.html#intellisense-for-typescript
 */
interface ImportMetaEnv {
  /** API base URL — empty in production (nginx proxy), localhost:3000 in dev */
  readonly VITE_API_URL: string;
  /** Microsoft OAuth client ID */
  readonly VITE_MICROSOFT_CLIENT_ID: string;
  /** Google OAuth client ID */
  readonly VITE_GOOGLE_CLIENT_ID: string;
  /** Current mode (development | production | test) */
  readonly MODE: string;
  /** true when running in development */
  readonly DEV: boolean;
  /** true when running in production */
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
