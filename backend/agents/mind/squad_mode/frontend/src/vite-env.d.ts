/// <reference types="vite/client" />

declare module 'mammoth/mammoth.browser' {
  export function extractRawText(source: { arrayBuffer: ArrayBuffer } | { path: string }): Promise<{ value: string }>;
}
