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
        getName: vi.fn().mockResolvedValue("Player One"),
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

  it("should return true for isAvailable when ready response is received", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation((channel, callback) => {
      setTimeout(() => {
        // Find requestId sent
        const calls = vi.mocked(OBR.broadcast.sendMessage).mock.calls;
        const lastCall = calls[calls.length - 1];
        const requestId = lastCall ? (lastCall[1] as any).requestId : "test-id";

        callback({
          data: { requestId, ready: true, timestamp: Date.now() },
        } as any);
      }, 10);
      return () => {};
    });

    const available = await adapter.isAvailable();
    expect(available).toBe(true);
    expect(OBR.broadcast.sendMessage).toHaveBeenCalledWith(
      "dice-plus/isReady",
      expect.objectContaining({ requestId: expect.any(String) }),
      { destination: "ALL" }
    );
  });

  it("should return false for isAvailable when timeout expires without ready response", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation(() => () => {});

    vi.useFakeTimers();
    const isAvailablePromise = adapter.isAvailable();

    vi.advanceTimersByTime(2000);

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

    vi.advanceTimersByTime(2000);
    const result = await rollPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dice+ indisponível");
    expect(OBR.notification.show).toHaveBeenCalledWith(
      expect.stringContaining("Dice+ não foi detectado"),
      "WARNING"
    );
    vi.useRealTimers();
  });

  it("should dispatch roll payload to dice-plus/roll-request if Dice+ is available", async () => {
    vi.mocked(OBR.broadcast.onMessage).mockImplementation((channel, callback) => {
      setTimeout(() => {
        const calls = vi.mocked(OBR.broadcast.sendMessage).mock.calls;
        const lastCall = calls[calls.length - 1];
        const requestId = lastCall ? (lastCall[1] as any).requestId : "test-id";

        callback({
          data: { requestId, ready: true, timestamp: Date.now() },
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
      "dice-plus/roll-request",
      expect.objectContaining({
        playerId: "player-123",
        playerName: "Player One",
        diceNotation: "8d6 # Fireball (Damage)",
        source: "quick-actions-toolbar",
      }),
      { destination: "ALL" }
    );
  });
});
