import { describe, expect, it, vi } from "vitest";
import { PlayerToolbarController } from "@/background/playerToolbarController";
import { AssignedActionCache, type KeyValueStorage } from "@/storage/firebase/assignedActionCache";
import { ActionPopoverContextCache } from "@/storage/firebase/actionPopoverContextCache";
import { RepositoryError } from "@/storage/firebase/repositories";
import type {
  MembershipRepository,
  ProfileActionRepository,
  RepositoryErrorListener,
  RepositoryListener,
  WorkspaceRepository,
} from "@/storage/firebase/repositories";
import type {
  FirestoreAction,
  FirestoreProfile,
  RoomMember,
  RoomWorkspace,
} from "@/types/firebase";

const roomId = "room-1";
const uid = "player-1";
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
const workspace: RoomWorkspace = {
  schemaVersion: 2,
  ownerUid: "owner-1",
  settings: { maxVisibleActions: 8, rollRetentionDays: 90 },
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};
const member: RoomMember = {
  uid,
  owlbearPlayerId: "obr-1",
  playerName: "Player",
  profileId: profile.id,
  approvedAt: "2026-07-30T12:00:00.000Z",
  approvedBy: "owner-1",
};

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function fixtures(options: { member?: RoomMember | null; workspaceError?: Error } = {}) {
  let memberListener: RepositoryListener<RoomMember | null> = () => undefined;
  let memberError: RepositoryErrorListener = () => undefined;
  let actionListener: RepositoryListener<FirestoreAction[]> = () => undefined;
  let profileError: RepositoryErrorListener = () => undefined;

  const workspaceRepository: WorkspaceRepository = {
    get: options.workspaceError
      ? vi.fn().mockRejectedValue(options.workspaceError)
      : vi.fn().mockResolvedValue(workspace),
    create: vi.fn(),
    updateSettings: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
  };
  const membershipRepository: MembershipRepository = {
    getMember: vi.fn().mockResolvedValue(options.member === undefined ? member : options.member),
    submitJoinRequest: vi.fn(),
    listJoinRequests: vi.fn(),
    listMembers: vi.fn(),
    approve: vi.fn(),
    reassign: vi.fn(),
    revoke: vi.fn(),
    subscribeMember: vi.fn((_room, _uid, listener, onError) => {
      memberListener = listener;
      memberError = onError;
      return () => undefined;
    }),
    subscribeJoinRequests: vi.fn(() => () => undefined),
  };
  const profileRepository: ProfileActionRepository = {
    getProfile: vi.fn().mockResolvedValue(profile),
    listProfiles: vi.fn(),
    saveProfile: vi.fn(),
    deleteProfile: vi.fn(),
    listActions: vi.fn().mockResolvedValue([action]),
    saveAction: vi.fn(),
    deleteAction: vi.fn(),
    subscribeProfile: vi.fn((_room, _profile, _listener, onError) => {
      profileError = onError;
      return () => undefined;
    }),
    subscribeActions: vi.fn((_room, _profile, listener) => {
      actionListener = listener;
      return () => undefined;
    }),
  };

  return {
    workspaceRepository,
    membershipRepository,
    profileRepository,
    emitMember: (value: RoomMember | null) => memberListener(value),
    failMember: (error: RepositoryError) => memberError(error),
    emitActions: (actions: FirestoreAction[]) => actionListener(actions),
    failProfile: (error: RepositoryError) => profileError(error),
  };
}

const session = { uid, isAnonymous: true, displayName: null, email: null };
const player = { owlbearPlayerId: "obr-1", playerName: "Player" };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("PlayerToolbarController", () => {
  it("requests approval when no member exists", async () => {
    const repos = fixtures({ member: null });
    const syncActions = vi.fn().mockResolvedValue(undefined);
    const onState = vi.fn();
    const cache = new AssignedActionCache(new MemoryStorage());
    const controller = new PlayerToolbarController({ ...repos, cache, syncActions, onState });

    await controller.start(roomId, session, player);

    expect(repos.membershipRepository.submitJoinRequest).toHaveBeenCalledWith(
      roomId,
      expect.objectContaining({ uid, owlbearPlayerId: "obr-1" })
    );
    expect(onState).toHaveBeenLastCalledWith("AWAITING_APPROVAL", undefined);
    expect(syncActions).toHaveBeenLastCalledWith([]);
  });

  it("publishes only assigned actions and reacts to updates and revocation", async () => {
    const repos = fixtures();
    const syncActions = vi.fn().mockResolvedValue(undefined);
    const onState = vi.fn();
    const storage = new MemoryStorage();
    const cache = new AssignedActionCache(storage);
    const targetedCache = new ActionPopoverContextCache(storage);
    const controller = new PlayerToolbarController({
      ...repos,
      cache,
      targetedCache,
      syncActions,
      onState,
    });

    await controller.start(roomId, session, player);
    expect(syncActions).toHaveBeenLastCalledWith([action], { uid, profile });
    expect(repos.profileRepository.getProfile).toHaveBeenCalledWith(roomId, profile.id);

    targetedCache.save(roomId, uid, {
      actionId: action.id,
      profileId: profile.id,
      variables: profile.variables,
      action,
    });
    const changed = { ...action, name: "Changed" };
    repos.emitActions([changed]);
    await tick();
    expect(syncActions).toHaveBeenLastCalledWith([changed], { uid, profile });
    expect(targetedCache.load(roomId, uid, action.id)).toBeNull();

    targetedCache.save(roomId, uid, {
      actionId: action.id,
      profileId: profile.id,
      variables: profile.variables,
      action,
    });
    repos.emitMember({ ...member, profileId: "profile-2" });
    await tick();
    expect(targetedCache.load(roomId, uid, action.id)).toBeNull();

    repos.emitMember(null);
    await tick();
    expect(syncActions).toHaveBeenLastCalledWith([]);
    expect(onState).toHaveBeenLastCalledWith("AWAITING_APPROVAL", undefined);
  });

  it("uses validated cache offline and reconnects to current assignment", async () => {
    const storage = new MemoryStorage();
    const cache = new AssignedActionCache(storage);
    cache.save(roomId, uid, profile, [action]);
    const offline = fixtures({ workspaceError: new RepositoryError("OFFLINE", "offline") });
    const syncActions = vi.fn().mockResolvedValue(undefined);
    const onState = vi.fn();
    const controller = new PlayerToolbarController({ ...offline, cache, syncActions, onState });

    await controller.start(roomId, session, player);
    expect(syncActions).toHaveBeenLastCalledWith([action], { uid, profile });
    expect(onState).toHaveBeenLastCalledWith("OFFLINE_CACHE", "offline");

    const online = fixtures();
    const reconnected = new PlayerToolbarController({ ...online, cache, syncActions, onState });
    await reconnected.start(roomId, session, player);
    expect(onState).toHaveBeenLastCalledWith("ASSIGNED", undefined);
  });

  it("clears cached actions after authorization denial", async () => {
    const storage = new MemoryStorage();
    const cache = new AssignedActionCache(storage);
    const repos = fixtures();
    const syncActions = vi.fn().mockResolvedValue(undefined);
    const onState = vi.fn();
    const controller = new PlayerToolbarController({ ...repos, cache, syncActions, onState });
    await controller.start(roomId, session, player);

    repos.failProfile(new RepositoryError("PERMISSION_DENIED", "denied"));
    await tick();

    expect(cache.load(roomId, uid)).toBeNull();
    expect(syncActions).toHaveBeenLastCalledWith([]);
    expect(onState).toHaveBeenLastCalledWith("AUTHORIZATION_DENIED", undefined);
  });
});
