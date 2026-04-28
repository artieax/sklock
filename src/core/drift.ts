import type { Lockfile } from "../schema/lock.schema.js";

export interface LockfileDiff {
  stale: boolean;
  added: string[];
  removed: string[];
  changed: string[];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

export function diffLockfiles(existing: Lockfile, current: Lockfile): LockfileDiff {
  const currentKeys = Object.keys(current.skills).sort();
  const existingKeys = Object.keys(existing.skills).sort();
  const added = currentKeys.filter((k) => !existing.skills[k]);
  const removed = existingKeys.filter((k) => !current.skills[k]);
  const changed = currentKeys.filter(
    (k) => existing.skills[k] && stableStringify(existing.skills[k]) !== stableStringify(current.skills[k])
  );
  return {
    stale: added.length > 0 || removed.length > 0 || changed.length > 0,
    added,
    removed,
    changed,
  };
}
