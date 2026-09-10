/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Crypto/wallet/etc. API base URL. Defaults to production (`https://api-v2.plut.ng`) in
   * src/api/client.ts when unset — see .env.example. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
