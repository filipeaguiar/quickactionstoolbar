import { describe, expect, it, vi } from "vitest";
import { WorkspaceOwnershipService } from "@/core/workspaceOwnership";
import { sessionIdentityChanged, type FirebaseSession } from "@/integrations/firebase/authSession";
import type { WorkspaceRepository } from "@/storage/firebase/repositories";
import type { RoomWorkspace } from "@/types/firebase";

const workspace: RoomWorkspace = {
  schemaVersion: 2,
  ownerUid: "gm-uid",
  settings: { maxVisibleActions: 8, rollRetentionDays: 90 },
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

function session(uid: string, isAnonymous: boolean): FirebaseSession {
  return { uid, isAnonymous, displayName: null, email: null };
}

function repository(existing: RoomWorkspace | null): WorkspaceRepository {
  return {
    get: vi.fn().mockResolvedValue(existing),
    create: vi.fn().mockResolvedValue(workspace),
    updateSettings: vi.fn(),
    subscribe: vi.fn(),
  };
}

describe("Firebase workspace ownership", () => {
  it("distinguishes an existing owner from a member", async () => {
    const service = new WorkspaceOwnershipService(repository(workspace));

    await expect(service.resolve("room-1", session("gm-uid", false))).resolves.toMatchObject({
      status: "OWNER",
    });
    await expect(
      service.resolve("room-1", session("anonymous-player", true))
    ).resolves.toMatchObject({ status: "MEMBER" });
  });

  it("requires both Owlbear GM role and durable identity for initialization", async () => {
    const target = repository(null);
    const service = new WorkspaceOwnershipService(target);

    await expect(service.initialize("room-1", "PLAYER", session("user", false))).rejects.toThrow(
      "Apenas o GM"
    );
    await expect(
      service.initialize("room-1", "GM", session("anonymous", true))
    ).rejects.toThrow("conta permanente");
    await expect(service.initialize("room-1", "GM", session("gm-uid", false))).resolves.toEqual(
      workspace
    );
    expect(target.create).toHaveBeenCalledWith("room-1", "gm-uid");
  });

  it("detects anonymous identity replacement without transferring ownership", () => {
    expect(
      sessionIdentityChanged(session("anonymous-old", true), session("anonymous-new", true))
    ).toBe(true);
    expect(sessionIdentityChanged(session("gm-uid", false), session("gm-uid", false))).toBe(false);
    expect(workspace.ownerUid).toBe("gm-uid");
  });
});
