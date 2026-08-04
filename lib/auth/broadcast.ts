"use client";

// Notifies every open tab of this origin that the authenticated session changed
// (login, logout, or switching accounts). A tab that isn't the one where the
// change happened has no other way to learn its rendered UI — and any client
// state built from it — now belongs to a different account.
const CHANNEL_NAME = "voyana-auth";
const STORAGE_KEY = "voyana-auth-change";

export function broadcastAuthChange() {
  try {
    new BroadcastChannel(CHANNEL_NAME).postMessage({ at: Date.now() });
  } catch {
    // BroadcastChannel unsupported — fall through to the storage-event fallback below.
  }
  try {
    // localStorage writes fire a `storage` event on OTHER tabs (not this one),
    // so this is a reliable fallback wherever BroadcastChannel is unavailable.
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode, etc.) — nothing more we can do.
  }
}

export function onAuthChange(callback: () => void): () => void {
  const teardown: Array<() => void> = [];

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => callback();
    teardown.push(() => channel.close());
  } catch {
    // ignore — storage-event fallback below still applies
  }

  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) callback();
  }
  window.addEventListener("storage", onStorage);
  teardown.push(() => window.removeEventListener("storage", onStorage));

  return () => teardown.forEach((fn) => fn());
}
