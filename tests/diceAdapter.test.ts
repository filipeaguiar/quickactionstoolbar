import { describe, it, expect, vi, beforeEach } from "vitest";
import OBR from "@owlbear-rodeo/sdk";
import { DicePlusAdapter } from "../src/integrations/dice-plus/adapter";
import { ResolvedRollSequence } from "../src/systems/types";

vi.mock("@owlbear-rodeo/sdk", () => {
  const onMessageMock = vi.fn();
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
      },
    },
  };
});

describe("DicePlusAdapter", () => {
  let adapter: DicePlusAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new DicePlusAdapter();
  });

  it("should return true for isAvailable when PONG is received", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation((channel, callback) => {
      // Immediately simulate PONG response
      setTimeout(() => {
        callback({
          data: { version: 1, type: "PONG", status: "READY" },
        } as any);
      }, 10);
      return () => {};
    });

    const available = await adapter.isAvailable();
    expect(available).toBe(true);
    expect(OBR.broadcast.sendMessage).toHaveBeenCalledWith(
      "com.owlbear-rodeo.dice-plus/broadcast",
      { version: 1, type: "PING" }
    );
  });

  it("should return false for isAvailable when timeout expires without PONG", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation(() => {
      return () => {};
    });

    // We can use fake timers or test short timeout if needed, but here let's test timeout
    vi.useFakeTimers();
    const isAvailablePromise = adapter.isAvailable();

    vi.advanceTimersByTime(3500);

    const available = await isAvailablePromise;
    expect(available).toBe(false);
    vi.useRealTimers();
  });

  it("should show warning notification and return success: false if rolling when unavailable", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation(() => () => {});

    vi.useFakeTimers();
    const rollPromise = adapter.roll({
      actionName: "Sword",
      variantId: "NORMAL",
      steps: [],
    });

    vi.advanceTimersByTime(3500);
    const result = await rollPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dice+ indisponível");
    expect(OBR.notification.show).toHaveBeenCalledWith(
      expect.stringContaining("Dice+ não foi detectado"),
      "WARNING"
    );
    vi.useRealTimers();
  });

  it("should dispatch roll payload if Dice+ is available", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation((channel, callback) => {
      setTimeout(() => {
        callback({
          data: { version: 1, type: "PONG", status: "READY" },
        } as any);
      }, 5);
      return () => {};
    });

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
        },
      ],
    };

    const result = await adapter.roll(sequence);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();

    expect(OBR.broadcast.sendMessage).toHaveBeenLastCalledWith(
      "com.owlbear-rodeo.dice-plus/broadcast",
      expect.objectContaining({
        version: 1,
        senderId: "player-123",
        rolls: [
          {
            label: "Fireball - Damage",
            expression: "8d6",
            visibility: "PUBLIC",
          },
        ],
      })
    );
  });
});
