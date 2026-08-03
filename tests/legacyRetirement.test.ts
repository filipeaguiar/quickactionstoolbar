import { describe, expect, it, vi } from "vitest";
import {
  LegacyMetadataRetirementService,
  createLegacyExport,
  type RoomMetadataWriter,
} from "@/storage/firebase/legacyRetirement";
import type { WorkspaceRepository } from "@/storage/firebase/repositories";
import { ROOM_DATA_KEY, type RoomQuickActionsData } from "@/types/storage";
import type { RoomWorkspace } from "@/types/firebase";

const roomId = "room-1";
const ownerUid = "owner-1";
const workspace: RoomWorkspace = {
  schemaVersion: 2,
  ownerUid,
  settings: { maxVisibleActions: 8, rollRetentionDays: 90 },
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

function legacyData(): RoomQuickActionsData {
  return {
    schemaVersion: 1,
    profiles: {
      "profile-default": {
        id: "profile-default",
        name: "Hero",
        ownerPlayerId: ownerUid,
        ownerPlayerName: "GM",
        systemId: "dnd5e-2024",
        variables: { strength: 4 },
        actions: [],
        createdAt: "2026-07-30T12:00:00.000Z",
        updatedAt: "2026-07-30T12:00:00.000Z",
        updatedBy: ownerUid,
      },
    },
    playerAssignments: { [ownerUid]: "profile-default" },
    settings: { playersCanEditOwnProfiles: true, maxVisibleActions: 8 },
    updatedAt: "2026-07-30T12:00:00.000Z",
    updatedBy: ownerUid,
  };
}

function workspaceRepository(): WorkspaceRepository {
  return {
    get: vi.fn().mockResolvedValue(workspace),
    create: vi.fn(),
    updateSettings: vi.fn(),
    subscribe: vi.fn(),
  };
}

function metadataWriter(legacy: RoomQuickActionsData): RoomMetadataWriter & {
  setMetadata: ReturnType<typeof vi.fn>;
} {
  return {
    getMetadata: vi.fn().mockResolvedValue({ [ROOM_DATA_KEY]: legacy, "other/key": { keep: true } }),
    setMetadata: vi.fn().mockResolvedValue(undefined),
  };
}

describe("legacy metadata retirement", () => {
  it("detects and exports without changing metadata", async () => {
    const legacy = legacyData();
    const metadata = metadataWriter(legacy);
    const service = new LegacyMetadataRetirementService(workspaceRepository(), metadata);

    const detected = await service.detect();
    const exported = await createLegacyExport(detected as RoomQuickActionsData);

    expect(JSON.parse(exported.json)).toEqual(legacy);
    expect(exported.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(metadata.setMetadata).not.toHaveBeenCalled();
  });

  it("replaces only the extension payload with a compact marker after owner confirmation", async () => {
    const legacy = legacyData();
    const metadata = metadataWriter(legacy);
    const service = new LegacyMetadataRetirementService(workspaceRepository(), metadata);
    const exported = await service.export(legacy);

    await service.discardAsOwner(
      roomId,
      "GM",
      { uid: ownerUid, isAnonymous: false, displayName: "GM", email: null },
      exported,
      "DESCARTAR"
    );

    const update = metadata.setMetadata.mock.calls[0][0];
    expect(update[ROOM_DATA_KEY]).toMatchObject({
      schemaVersion: 2,
      backend: "firebase",
      roomId,
      migrationFingerprint: exported.fingerprint,
    });
    expect(JSON.stringify(update[ROOM_DATA_KEY]).length).toBeLessThan(300);
    expect(JSON.stringify(update)).not.toContain("profile-default");
  });

  it("rejects unauthorized, unconfirmed, or stale discard attempts", async () => {
    const legacy = legacyData();
    const metadata = metadataWriter(legacy);
    const service = new LegacyMetadataRetirementService(workspaceRepository(), metadata);
    const exported = await service.export(legacy);

    await expect(
      service.discardAsOwner(
        roomId,
        "PLAYER",
        { uid: "player", isAnonymous: true, displayName: null, email: null },
        exported,
        "DESCARTAR"
      )
    ).rejects.toThrow("Apenas o GM");
    await expect(
      service.discardAsOwner(
        roomId,
        "GM",
        { uid: ownerUid, isAnonymous: false, displayName: "GM", email: null },
        exported,
        "sim"
      )
    ).rejects.toThrow("Confirmação");
    await expect(service.discard(roomId, ownerUid, "0".repeat(64))).rejects.toThrow(
      "Exporte novamente"
    );
    expect(metadata.setMetadata).not.toHaveBeenCalled();
  });
});
