import {
  ActionPopoverContextCacheSchema,
  ActionPopoverContextSchema,
  type ActionPopoverContext,
} from "@/types/firebase";
import type { KeyValueStorage } from "./assignedActionCache";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONTEXTS = 20;

export class ActionPopoverContextCache {
  constructor(
    private readonly storage: KeyValueStorage = localStorage,
    private readonly now: () => number = Date.now
  ) {}

  load(roomId: string, uid: string, actionId: string): ActionPopoverContext | null {
    try {
      const raw = this.storage.getItem(this.key(roomId, uid));
      if (!raw) return null;
      const parsed = ActionPopoverContextCacheSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || parsed.data.roomId !== roomId || parsed.data.uid !== uid) {
        this.clearAll(roomId, uid);
        return null;
      }
      const context = parsed.data.contexts[actionId];
      if (
        !context ||
        context.actionId !== actionId ||
        context.action.id !== actionId ||
        Date.parse(context.expiresAt) <= this.now()
      ) {
        if (context) this.clearAction(roomId, uid, actionId);
        return null;
      }
      return context;
    } catch {
      this.clearAll(roomId, uid);
      return null;
    }
  }

  save(
    roomId: string,
    uid: string,
    value: Omit<ActionPopoverContext, "cachedAt" | "expiresAt">,
    ttlMs = CACHE_TTL_MS
  ): ActionPopoverContext {
    const cachedAt = new Date(this.now()).toISOString();
    const context = ActionPopoverContextSchema.parse({
      ...value,
      cachedAt,
      expiresAt: new Date(this.now() + Math.max(1, ttlMs)).toISOString(),
    });
    const existing = this.readContainer(roomId, uid);
    const contexts = { ...(existing?.contexts ?? {}), [context.actionId]: context };
    const bounded = Object.fromEntries(
      Object.entries(contexts)
        .sort(([, left], [, right]) => right.cachedAt.localeCompare(left.cachedAt))
        .slice(0, MAX_CONTEXTS)
    );
    try {
      this.storage.setItem(
        this.key(roomId, uid),
        JSON.stringify({ cacheVersion: 1, roomId, uid, contexts: bounded })
      );
    } catch {
      // Targeted fallback remains usable for this iframe even without storage.
    }
    return context;
  }

  clearAction(roomId: string, uid: string, actionId: string): void {
    const existing = this.readContainer(roomId, uid);
    if (!existing?.contexts[actionId]) return;
    const contexts = { ...existing.contexts };
    delete contexts[actionId];
    try {
      if (Object.keys(contexts).length === 0) this.storage.removeItem(this.key(roomId, uid));
      else {
        this.storage.setItem(
          this.key(roomId, uid),
          JSON.stringify({ ...existing, contexts })
        );
      }
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  clearAll(roomId: string, uid: string): void {
    try {
      this.storage.removeItem(this.key(roomId, uid));
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  private readContainer(roomId: string, uid: string) {
    try {
      const raw = this.storage.getItem(this.key(roomId, uid));
      if (!raw) return null;
      const parsed = ActionPopoverContextCacheSchema.safeParse(JSON.parse(raw));
      return parsed.success && parsed.data.roomId === roomId && parsed.data.uid === uid
        ? parsed.data
        : null;
    } catch {
      return null;
    }
  }

  private key(roomId: string, uid: string): string {
    return `quick-actions:popover:${roomId}:${uid}`;
  }
}
