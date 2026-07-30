import { describe, it, expect } from "vitest";
import { validateSavePermissions } from "../src/storage/authorizationEngine";
import { RoomQuickActionsData } from "../src/types/storage";

const baseRoomData: RoomQuickActionsData = {
  schemaVersion: 1,
  profiles: {
    "profile-1": {
      id: "profile-1",
      name: "Grog",
      ownerPlayerId: "player-1",
      ownerPlayerName: "Filipe",
      systemId: "dnd5e-2024",
      variables: {},
      actions: [],
      createdAt: "2026-07-30T14:00:00Z",
      updatedAt: "2026-07-30T14:00:00Z",
      updatedBy: "player-1",
    },
    "profile-2": {
      id: "profile-2",
      name: "Vex",
      ownerPlayerId: "player-2",
      ownerPlayerName: "Ana",
      systemId: "dnd5e-2024",
      variables: {},
      actions: [],
      createdAt: "2026-07-30T14:00:00Z",
      updatedAt: "2026-07-30T14:00:00Z",
      updatedBy: "player-2",
    },
  },
  playerAssignments: {
    "player-1": "profile-1",
    "player-2": "profile-2",
  },
  settings: {
    playersCanEditOwnProfiles: true,
    maxVisibleActions: 8,
  },
  updatedAt: "2026-07-30T14:00:00Z",
  updatedBy: "gm-1",
};

describe("Authorization Engine (GM vs Player)", () => {
  it("should allow GM to perform any save operation", () => {
    const result = validateSavePermissions(
      baseRoomData,
      baseRoomData,
      "GM",
      "gm-1",
      "profile-1"
    );
    expect(result.allowed).toBe(true);
  });

  it("should allow Player to edit their own assigned profile", () => {
    const result = validateSavePermissions(
      baseRoomData,
      baseRoomData,
      "PLAYER",
      "player-1",
      "profile-1"
    );
    expect(result.allowed).toBe(true);
  });

  it("should reject Player attempting to edit another player's profile", () => {
    const result = validateSavePermissions(
      baseRoomData,
      baseRoomData,
      "PLAYER",
      "player-1",
      "profile-2"
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("próprio perfil");
  });

  it("should reject Player attempting to change playerAssignments", () => {
    const modifiedData: RoomQuickActionsData = {
      ...baseRoomData,
      playerAssignments: {
        "player-1": "profile-2", // Tentando roubar o perfil 2
      },
    };
    const result = validateSavePermissions(
      baseRoomData,
      modifiedData,
      "PLAYER",
      "player-1"
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("atribuições");
  });

  it("should reject Player editing profile if playersCanEditOwnProfiles is disabled", () => {
    const disabledSettingsRoom: RoomQuickActionsData = {
      ...baseRoomData,
      settings: { ...baseRoomData.settings, playersCanEditOwnProfiles: false },
    };
    const result = validateSavePermissions(
      disabledSettingsRoom,
      disabledSettingsRoom,
      "PLAYER",
      "player-1",
      "profile-1"
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("desativou a edição");
  });
});
