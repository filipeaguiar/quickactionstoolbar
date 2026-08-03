import type {
  FirebaseRoomSettings,
  FirestoreAction,
  FirestoreProfile,
  JoinRequest,
  RollHistoryRecord,
  RoomMember,
  RoomWorkspace,
} from "@/types/firebase";
import type { RoomQuickActionsData } from "@/types/storage";

export type RepositoryUnsubscribe = () => void;
export type RepositoryListener<T> = (value: T) => void;
export type RepositoryErrorListener = (error: RepositoryError) => void;

export type RepositoryErrorCode =
  | "UNAUTHENTICATED"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "INVALID_DATA"
  | "UNSUPPORTED_SCHEMA"
  | "OFFLINE"
  | "UNKNOWN";

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

export interface WorkspaceRepository {
  get(roomId: string): Promise<RoomWorkspace | null>;
  create(roomId: string, ownerUid: string): Promise<RoomWorkspace>;
  updateSettings(roomId: string, settings: FirebaseRoomSettings): Promise<void>;
  subscribe(
    roomId: string,
    listener: RepositoryListener<RoomWorkspace | null>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe;
}

export interface ProfileActionRepository {
  getProfile(roomId: string, profileId: string): Promise<FirestoreProfile | null>;
  listProfiles(roomId: string): Promise<FirestoreProfile[]>;
  saveProfile(roomId: string, profile: FirestoreProfile): Promise<void>;
  deleteProfile(roomId: string, profileId: string): Promise<void>;
  listActions(roomId: string, profileId: string): Promise<FirestoreAction[]>;
  getAction(roomId: string, profileId: string, actionId: string): Promise<FirestoreAction | null>;
  saveAction(roomId: string, profileId: string, action: FirestoreAction): Promise<void>;
  deleteAction(roomId: string, profileId: string, actionId: string): Promise<void>;
  subscribeProfile(
    roomId: string,
    profileId: string,
    listener: RepositoryListener<FirestoreProfile | null>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe;
  subscribeActions(
    roomId: string,
    profileId: string,
    listener: RepositoryListener<FirestoreAction[]>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe;
}

export interface MembershipRepository {
  getMember(roomId: string, uid: string): Promise<RoomMember | null>;
  submitJoinRequest(
    roomId: string,
    request: Omit<JoinRequest, "requestedAt"> & { requestedAt?: string }
  ): Promise<void>;
  listJoinRequests(roomId: string): Promise<JoinRequest[]>;
  listMembers(roomId: string): Promise<RoomMember[]>;
  approve(roomId: string, member: RoomMember): Promise<void>;
  reassign(roomId: string, uid: string, profileId: string): Promise<void>;
  revoke(roomId: string, uid: string): Promise<void>;
  subscribeMember(
    roomId: string,
    uid: string,
    listener: RepositoryListener<RoomMember | null>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe;
  subscribeJoinRequests(
    roomId: string,
    listener: RepositoryListener<JoinRequest[]>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe;
}

export interface LegacyDataExport {
  json: string;
  fingerprint: string;
}

export interface LegacyDataRetirementRepository {
  detect(): Promise<RoomQuickActionsData | null>;
  export(legacy: RoomQuickActionsData): Promise<LegacyDataExport>;
  discard(roomId: string, ownerUid: string, exportFingerprint: string): Promise<void>;
}

export interface RollHistoryCursor {
  createdAt: string;
  id: string;
}

export interface RollHistoryPage {
  records: RollHistoryRecord[];
  nextCursor: RollHistoryCursor | null;
}

export interface RollHistoryRepository {
  create(
    roomId: string,
    record: Omit<RollHistoryRecord, "createdAt"> & { createdAt?: string }
  ): Promise<void>;
  list(roomId: string, limit: number, cursor?: RollHistoryCursor): Promise<RollHistoryPage>;
  deleteExpired(roomId: string, retentionDays: number): Promise<number>;
}
