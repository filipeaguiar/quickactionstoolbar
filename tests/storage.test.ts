import { describe, it, expect, vi } from "vitest";

vi.mock("@owlbear-rodeo/sdk", () => ({ default: {} }));

import { jsonUtf8Size, simulateSaveCapacity } from "../src/storage/metadataSize";
import { RoomQuickActionsData, ROOM_DATA_KEY } from "../src/types/storage";
import { createInitialRoomData } from "../src/storage/roomProfileRepository";

const sampleRoomData: RoomQuickActionsData = {
  schemaVersion: 1,
  profiles: {
    "grog-1": {
      id: "grog-1",
      name: "Grog Strongjaw",
      ownerPlayerId: "player-1",
      ownerPlayerName: "Filipe",
      systemId: "dnd5e-2024",
      variables: { strength: 4, proficiency: 3 },
      actions: [],
      createdAt: "2026-07-30T14:00:00Z",
      updatedAt: "2026-07-30T14:00:00Z",
      updatedBy: "player-1",
    },
  },
  playerAssignments: { "player-1": "grog-1" },
  settings: { playersCanEditOwnProfiles: true, maxVisibleActions: 8 },
  updatedAt: "2026-07-30T14:00:00Z",
  updatedBy: "player-1",
};

describe("Initial room data", () => {
  it("creates the default profile without actions", () => {
    const roomData = createInitialRoomData("player-1");
    const defaultProfile = roomData.profiles["profile-default"];

    expect(defaultProfile).toBeDefined();
    expect(defaultProfile.actions).toEqual([]);
    expect(roomData.playerAssignments["player-1"]).toBe("profile-default");
  });
});

describe("Storage & Capacity Measurement", () => {
  it("should calculate exact UTF-8 byte size for objects", () => {
    const bytes = jsonUtf8Size({ test: "Ações Rápidas ⚔️" });
    expect(bytes).toBeGreaterThan(20);
  });

  it("should return OK status for normal payload sizes", () => {
    const metrics = simulateSaveCapacity(sampleRoomData, {});
    expect(metrics.status).toBe("OK");
    expect(metrics.projectedTotalBytes).toBeGreaterThan(0);
  });

  it("should return WARNING status when metadata projected size exceeds 12 KB", () => {
    const dummyLargeObject: Record<string, string> = {};
    // Preencher aproximadamente 13 KB
    dummyLargeObject["other-ext"] = "x".repeat(13000);

    const metrics = simulateSaveCapacity(sampleRoomData, dummyLargeObject);
    expect(metrics.status).toBe("WARNING");
  });

  it("should return BLOCKED status when metadata projected size exceeds 15 KB", () => {
    const dummyLargeObject: Record<string, string> = {};
    // Preencher aproximadamente 15.5 KB
    dummyLargeObject["other-ext"] = "x".repeat(15500);

    const metrics = simulateSaveCapacity(sampleRoomData, dummyLargeObject);
    expect(metrics.status).toBe("BLOCKED");
  });
});
