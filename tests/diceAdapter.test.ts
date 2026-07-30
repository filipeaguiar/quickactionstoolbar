import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OBR from "@owlbear-rodeo/sdk";
import { DicePlusAdapter } from "../src/integrations/dice-plus/adapter";
import { ResolvedRollSequence } from "../src/systems/types";
import dicePlusRollResult from "./fixtures/dicePlusRollResult.json";

const listeners = vi.hoisted(() => new Map<string, Set<(event: any) => void>>());

vi.mock("@owlbear-rodeo/sdk", () => {
  const onMessageMock = vi.fn((channel: string, callback: (event: any) => void) => {
    const channelListeners = listeners.get(channel) ?? new Set();
    channelListeners.add(callback);
    listeners.set(channel, channelListeners);
    return () => {
      const current = listeners.get(channel);
      current?.delete(callback);
      if (current && current.size === 0) listeners.delete(channel);
    };
  });
  const sendMessageMock = vi.fn();
  const showNotificationMock = vi.fn();

  return {
    default: {
      broadcast: {
        onMessage: onMessageMock,
        sendMessage: sendMessageMock,
      },
      notification: {
        show: showNotificationMock,
      },
      player: {
        id: "player-123",
        getName: vi.fn().mockResolvedValue("Player One"),
      },
    },
    __listeners: listeners,
  };
});

function emit(channel: string, data: unknown) {
  const channelListeners = listeners.get(channel);
  channelListeners?.forEach((callback) => callback({ data }));
}

function wrapBroadcastPayload<T>(payload: T) {
  return {
    data: {
      data: payload,
      connectionId: "test-connection",
    },
  };
}

function lastSentRequestId() {
  const calls = vi.mocked(OBR.broadcast.sendMessage).mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall ? (lastCall[1] as any).requestId : "test-id";
}

function lastRollPayload() {
  const calls = vi.mocked(OBR.broadcast.sendMessage).mock.calls;
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const [channel, payload] = calls[index];
    if (channel === "dice-plus/roll-request") return payload as any;
  }
  return undefined;
}

describe("DicePlusAdapter", () => {
  let adapter: DicePlusAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    adapter = new DicePlusAdapter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true for isAvailable when ready response is received", async () => {
    setTimeout(() => {
      emit("dice-plus/isReady", {
        requestId: lastSentRequestId(),
        ready: true,
        timestamp: Date.now(),
      });
    }, 10);

    const available = await adapter.isAvailable();
    expect(available).toBe(true);
    expect(OBR.broadcast.sendMessage).toHaveBeenCalledWith(
      "dice-plus/isReady",
      expect.objectContaining({ requestId: expect.any(String) }),
      { destination: "ALL" }
    );
  });

  it("should return false for isAvailable when timeout expires without ready response", async () => {
    vi.useFakeTimers();
    const isAvailablePromise = adapter.isAvailable();
    vi.advanceTimersByTime(2000);
    const available = await isAvailablePromise;
    expect(available).toBe(false);
  });

  it("should show warning notification and return success: false if rolling when unavailable", async () => {
    vi.useFakeTimers();
    const rollPromise = adapter.roll({
      actionName: "Sword",
      variantId: "NORMAL",
      steps: [],
    });

    vi.advanceTimersByTime(2000);
    const result = await rollPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dice+ indisponível");
    expect(result.stepResults).toEqual([]);
    expect(OBR.notification.show).toHaveBeenCalledWith(
      expect.stringContaining("Dice+ não foi detectado"),
      "WARNING"
    );
  });

  it("should dispatch roll payload to dice-plus/roll-request if Dice+ is available", async () => {
    setTimeout(() => {
      emit("dice-plus/isReady", {
        requestId: lastSentRequestId(),
        ready: true,
        timestamp: Date.now(),
      });
    }, 5);

    setTimeout(() => {
      const payload = lastRollPayload();
      emit("dice-plus/roll-result", wrapBroadcastPayload({
        ...dicePlusRollResult,
        rollId: payload.rollId,
        result: {
          ...dicePlusRollResult.result,
          rollId: payload.rollId,
          diceNotation: payload.diceNotation,
        },
      }));
    }, 15);

    const sequence: ResolvedRollSequence = {
      actionName: "Fireball",
      variantId: "NORMAL",
      steps: [
        {
          id: "s1",
          label: "Damage",
          purpose: "DAMAGE",
          rawExpression: "8d6",
          resolvedExpression: "8d6",
          visibility: "PUBLIC",
          execute: "ALWAYS",
          criticalBehavior: "NONE",
        },
      ],
    };

    const result = await adapter.roll(sequence);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0].result?.groups[0].dice[0].value).toBe(19);

    expect(OBR.broadcast.sendMessage).toHaveBeenLastCalledWith(
      "dice-plus/roll-request",
      expect.objectContaining({
        playerId: "player-123",
        playerName: "Player One",
        diceNotation: "8d6 # Fireball: Damage",
        source: "quick-actions-toolbar",
      }),
      { destination: "ALL" }
    );
  });

  it("should ignore unrelated roll results and wait for the matching rollId", async () => {
    vi.useFakeTimers();

    const promise = adapter.roll({
      actionName: "Sword",
      variantId: "NORMAL",
      steps: [
        {
          id: "s1",
          label: "Ataque",
          purpose: "ATTACK",
          rawExpression: "1d20 + 5",
          resolvedExpression: "1d20 + 5",
          visibility: "PUBLIC",
          execute: "ALWAYS",
          criticalBehavior: "NONE",
        },
      ],
    });

    vi.advanceTimersByTimeAsync(5);
    emit("dice-plus/isReady", {
      requestId: lastSentRequestId(),
      ready: true,
      timestamp: Date.now(),
    });

    await vi.advanceTimersByTimeAsync(1);
    emit("dice-plus/roll-result", wrapBroadcastPayload({
      ...dicePlusRollResult,
      rollId: "different-roll-id",
      result: { ...dicePlusRollResult.result, rollId: "different-roll-id" },
    }));

    await vi.advanceTimersByTimeAsync(1);
    const payload = lastRollPayload();
    emit("dice-plus/roll-result", wrapBroadcastPayload({
      ...dicePlusRollResult,
      rollId: payload.rollId,
      result: { ...dicePlusRollResult.result, rollId: payload.rollId },
    }));

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it("should fail when Dice+ returns a matching roll error", async () => {
    vi.useFakeTimers();

    const promise = adapter.roll({
      actionName: "Sword",
      variantId: "NORMAL",
      steps: [
        {
          id: "s1",
          label: "Ataque",
          purpose: "ATTACK",
          rawExpression: "1d20 + 5",
          resolvedExpression: "1d20 + 5",
          visibility: "PUBLIC",
          execute: "ALWAYS",
          criticalBehavior: "NONE",
        },
      ],
    });

    await vi.advanceTimersByTimeAsync(5);
    emit("dice-plus/isReady", {
      requestId: lastSentRequestId(),
      ready: true,
      timestamp: Date.now(),
    });

    await vi.advanceTimersByTimeAsync(1);
    const payload = lastRollPayload();
    emit("dice-plus/roll-error", wrapBroadcastPayload({
      rollId: payload.rollId,
      error: "Dice exploded badly",
    }));

    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain("Dice exploded badly");
    expect(result.stepResults[0].error).toContain("Dice exploded badly");
  });

  it("should fail when a step result times out", async () => {
    vi.useFakeTimers();

    const promise = adapter.roll({
      actionName: "Sword",
      variantId: "NORMAL",
      steps: [
        {
          id: "s1",
          label: "Ataque",
          purpose: "ATTACK",
          rawExpression: "1d20 + 5",
          resolvedExpression: "1d20 + 5",
          visibility: "PUBLIC",
          execute: "ALWAYS",
          criticalBehavior: "NONE",
        },
      ],
    });

    await vi.advanceTimersByTimeAsync(5);
    emit("dice-plus/isReady", {
      requestId: lastSentRequestId(),
      ready: true,
      timestamp: Date.now(),
    });

    await vi.advanceTimersByTimeAsync(13000);
    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toContain("Timeout aguardando resultado");
    expect(result.stepResults[0].error).toContain("Timeout aguardando resultado");
  }, 15000);
});
