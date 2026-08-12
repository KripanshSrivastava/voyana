// Vitest shim for Next.js's `server-only` module. In production, importing
// `server-only` from a client component throws at build time. Under vitest
// there is no client-vs-server distinction so it's a no-op.
export {};
