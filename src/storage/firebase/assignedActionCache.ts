import {
  CachedAssignmentSchema,
  type CachedAssignment,
  type FirestoreAction,
  type FirestoreProfile,
} from "@/types/firebase";
import { nowIso } from "@/integrations/firebase/client";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class AssignedActionCache {
  constructor(private readonly storage: KeyValueStorage = localStorage) {}

  load(roomId: string, uid: string): CachedAssignment | null {
    try {
      const raw = this.storage.getItem(this.key(roomId, uid));
      if (!raw) return null;
      const result = CachedAssignmentSchema.safeParse(JSON.parse(raw));
      if (!result.success || result.data.roomId !== roomId || result.data.uid !== uid) {
        this.clear(roomId, uid);
        return null;
      }
      return result.data;
    } catch {
      this.clear(roomId, uid);
      return null;
    }
  }

  save(
    roomId: string,
    uid: string,
    profile: FirestoreProfile,
    actions: FirestoreAction[]
  ): CachedAssignment {
    const value = CachedAssignmentSchema.parse({
      cacheVersion: 1,
      roomId,
      uid,
      profile,
      actions,
      cachedAt: nowIso(),
    });
    try {
      this.storage.setItem(this.key(roomId, uid), JSON.stringify(value));
    } catch {
      // Cache is an optimization; storage denial must not break synchronization.
    }
    return value;
  }

  clear(roomId: string, uid: string): void {
    try {
      this.storage.removeItem(this.key(roomId, uid));
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  private key(roomId: string, uid: string): string {
    return `quick-actions:assigned:${roomId}:${uid}`;
  }
}
