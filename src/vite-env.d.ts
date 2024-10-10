/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM: "bedrock" | "ollama";
  readonly VITE_MODEL: string;
  readonly VITE_AWS_ACCESS_KEY_ID: string;
  readonly VITE_AWS_SECRET_ACCESS_KEY: string;
  readonly VITE_AWS_SESSION_TOKEN: string;
  readonly VITE_AWS_REGION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
