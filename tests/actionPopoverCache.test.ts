import { describe, expect, it } from "vitest";
import { AssignedActionCache, type KeyValueStorage } from "@/storage/firebase/assignedActionCache";
import { ActionPopoverContextCache } from "@/storage/firebase/actionPopoverContextCache";
import type { FirestoreAction, FirestoreProfile } from "@/types/firebase";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const profile: FirestoreProfile = {
  id: "profile-1",
  name: "Hero",
  systemId: "dnd5e-2024",
  variables: { strength: 4 },
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
  updatedBy: "owner-1",
};
const action: FirestoreAction = {
  id: "attack-1",
  name: "Attack",
  icon: "crossed-swords",
  kind: "ATTACK",
  enabled: true,
  sortOrder: 0,
  systemId: "dnd5e-2024",
  sequence: {
    version: 1,
    stopOnError: true,
    steps: [
      {
        id: "step-1",
        label: "Attack",
        purpose: "ATTACK",
        expression: "1d20",
        visibility: "PUBLIC",
        execute: "ALWAYS",
      },
    ],
  },
  variantPolicy: {
    allowNormal: true,
    allowAdvantage: true,
    allowDisadvantage: true,
    allowCritical: true,
    customVariants: [],
  },
  tags: [],
};

describe("popover context caches", () => {
  it("versions complete assigned cache and invalidates unversioned entries", () => {
    const storage = new MemoryStorage();
    const cache = new AssignedActionCache(storage);
    const saved = cache.save("room-1", "uid-1", profile, [action]);
    expect(saved.cacheVersion).toBe(1);

    const key = "quick-actions:assigned:room-1:uid-1";
    const legacy = JSON.parse(storage.values.get(key)!);
    delete legacy.cacheVersion;
    storage.values.set(key, JSON.stringify(legacy));
    expect(cache.load("room-1", "uid-1")).toBeNull();
    expect(storage.values.has(key)).toBe(false);
  });

  it("isolates targeted context by room, UID, and action", () => {
    const storage = new MemoryStorage();
    const cache = new ActionPopoverContextCache(storage, () => 1_000);
    cache.save("room-1", "uid-1", {
      actionId: action.id,
      profileId: profile.id,
      variables: profile.variables,
      action,
    });

    expect(cache.load("room-1", "uid-1", action.id)?.action).toEqual(action);
    expect(cache.load("room-2", "uid-1", action.id)).toBeNull();
    expect(cache.load("room-1", "uid-2", action.id)).toBeNull();
    expect(cache.load("room-1", "uid-1", "other-action")).toBeNull();
  });

  it("rejects malformed, unsupported, and expired targeted entries", () => {
    const storage = new MemoryStorage();
    const key = "quick-actions:popover:room-1:uid-1";
    let clock = 10_000;
    const cache = new ActionPopoverContextCache(storage, () => clock);

    storage.values.set(key, "not-json");
    expect(cache.load("room-1", "uid-1", action.id)).toBeNull();

    storage.values.set(
      key,
      JSON.stringify({ cacheVersion: 99, roomId: "room-1", uid: "uid-1", contexts: {} })
    );
    expect(cache.load("room-1", "uid-1", action.id)).toBeNull();

    cache.save(
      "room-1",
      "uid-1",
      { actionId: action.id, profileId: profile.id, variables: {}, action },
      1
    );
    clock += 2;
    expect(cache.load("room-1", "uid-1", action.id)).toBeNull();
  });

  it("treats unavailable browser storage as a cache miss", () => {
    const unavailable: KeyValueStorage = {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
      removeItem() { throw new Error("denied"); },
    };
    const assigned = new AssignedActionCache(unavailable);
    const targeted = new ActionPopoverContextCache(unavailable);

    expect(assigned.load("room-1", "uid-1")).toBeNull();
    expect(() => assigned.save("room-1", "uid-1", profile, [action])).not.toThrow();
    expect(targeted.load("room-1", "uid-1", action.id)).toBeNull();
    expect(() =>
      targeted.save("room-1", "uid-1", {
        actionId: action.id,
        profileId: profile.id,
        variables: {},
        action,
      })
    ).not.toThrow();
  });
});
