import { describe, expect, it, vi } from "vitest";
import { ActionPopoverContextResolver } from "@/core/actionPopoverContextResolver";
import { AssignedActionCache, type KeyValueStorage } from "@/storage/firebase/assignedActionCache";
import { ActionPopoverContextCache } from "@/storage/firebase/actionPopoverContextCache";
import type { MembershipRepository, ProfileActionRepository } from "@/storage/firebase/repositories";
import type { FirestoreAction, FirestoreProfile, RoomMember } from "@/types/firebase";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const roomId = "room-1";
const uid = "uid-1";
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
const member: RoomMember = {
  uid,
  owlbearPlayerId: "obr-1",
  playerName: "Player",
  profileId: profile.id,
  approvedAt: "2026-07-30T12:00:00.000Z",
  approvedBy: "owner-1",
};

function repositories(actionResult: FirestoreAction | null = action) {
  const membershipRepository = {
    getMember: vi.fn().mockResolvedValue(member),
  } as unknown as MembershipRepository;
  const profileRepository = {
    getProfile: vi.fn().mockResolvedValue(profile),
    getAction: vi.fn().mockResolvedValue(actionResult),
    listActions: vi.fn(),
  } as unknown as ProfileActionRepository;
  return { membershipRepository, profileRepository };
}

function resolver(storage: MemoryStorage, repos = repositories()) {
  return {
    instance: new ActionPopoverContextResolver({
      ...repos,
      assignedCache: new AssignedActionCache(storage),
      targetedCache: new ActionPopoverContextCache(storage),
    }),
    repos,
  };
}

describe("ActionPopoverContextResolver", () => {
  it("makes zero repository calls across fresh iframe-like resolvers on assigned cache hits", async () => {
    const storage = new MemoryStorage();
    new AssignedActionCache(storage).save(roomId, uid, profile, [action]);
    const repos = repositories();

    const first = resolver(storage, repos).instance;
    const second = resolver(storage, repos).instance;
    await expect(first.resolve(roomId, uid, action.id)).resolves.toMatchObject({
      source: "ASSIGNED_CACHE",
      action,
    });
    await expect(second.resolve(roomId, uid, action.id)).resolves.toMatchObject({
      source: "ASSIGNED_CACHE",
    });

    expect(repos.membershipRepository.getMember).not.toHaveBeenCalled();
    expect(repos.profileRepository.getProfile).not.toHaveBeenCalled();
    expect(repos.profileRepository.getAction).not.toHaveBeenCalled();
    expect(repos.profileRepository.listActions).not.toHaveBeenCalled();
  });

  it("uses exactly three targeted reads on cold fallback and caches the result", async () => {
    const storage = new MemoryStorage();
    const repos = repositories();
    const first = resolver(storage, repos).instance;

    await expect(first.resolve(roomId, uid, action.id)).resolves.toMatchObject({
      source: "FIRESTORE",
      profileId: profile.id,
    });
    expect(repos.membershipRepository.getMember).toHaveBeenCalledTimes(1);
    expect(repos.profileRepository.getProfile).toHaveBeenCalledTimes(1);
    expect(repos.profileRepository.getAction).toHaveBeenCalledTimes(1);
    expect(repos.profileRepository.listActions).not.toHaveBeenCalled();

    const second = resolver(storage, repos).instance;
    await expect(second.resolve(roomId, uid, action.id)).resolves.toMatchObject({
      source: "TARGETED_CACHE",
    });
    expect(repos.membershipRepository.getMember).toHaveBeenCalledTimes(1);
    expect(repos.profileRepository.getProfile).toHaveBeenCalledTimes(1);
    expect(repos.profileRepository.getAction).toHaveBeenCalledTimes(1);
  });

  it("does not replace a complete assigned cache with partial fallback context", async () => {
    const storage = new MemoryStorage();
    const otherAction = { ...action, id: "other", name: "Other" };
    const assigned = new AssignedActionCache(storage);
    assigned.save(roomId, uid, profile, [otherAction]);

    await resolver(storage).instance.resolve(roomId, uid, action.id);

    expect(assigned.load(roomId, uid)?.actions).toEqual([otherAction]);
    expect(new ActionPopoverContextCache(storage).load(roomId, uid, action.id)?.action).toEqual(
      action
    );
  });

  it("reports a removed action without fabricating a fallback", async () => {
    const storage = new MemoryStorage();
    const context = resolver(storage, repositories(null));

    await expect(context.instance.resolve(roomId, uid, action.id)).rejects.toThrow(
      "não está mais disponível"
    );
    expect(context.repos.profileRepository.listActions).not.toHaveBeenCalled();
  });
});
