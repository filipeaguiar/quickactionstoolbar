import { z } from "zod";
import { ActionDefinitionSchema } from "./action";

export const FIRESTORE_SCHEMA_VERSION = 2 as const;
export const LOCAL_CACHE_VERSION = 1 as const;

const identifierSchema = z.string().min(1).max(256);
const displayNameSchema = z.string().min(1).max(120);
export const IsoTimestampSchema = z.string().datetime({ offset: true });

export const FirebaseRoomSettingsSchema = z.object({
  maxVisibleActions: z.number().int().min(1).max(8).default(8),
  rollRetentionDays: z.number().int().min(1).max(365).default(90),
});
export type FirebaseRoomSettings = z.infer<typeof FirebaseRoomSettingsSchema>;

export const RoomWorkspaceSchema = z.object({
  schemaVersion: z.literal(FIRESTORE_SCHEMA_VERSION),
  ownerUid: identifierSchema,
  settings: FirebaseRoomSettingsSchema,
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type RoomWorkspace = z.infer<typeof RoomWorkspaceSchema>;

export const FirestoreProfileSchema = z.object({
  id: identifierSchema,
  name: displayNameSchema,
  systemId: z.literal("dnd5e-2024").default("dnd5e-2024"),
  variables: z.record(z.string(), z.number()).default({}),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  updatedBy: identifierSchema,
});
export type FirestoreProfile = z.infer<typeof FirestoreProfileSchema>;

export const FirestoreActionSchema = ActionDefinitionSchema;
export type FirestoreAction = z.infer<typeof FirestoreActionSchema>;

export const RoomMemberSchema = z.object({
  uid: identifierSchema,
  owlbearPlayerId: identifierSchema,
  playerName: displayNameSchema,
  profileId: identifierSchema,
  approvedAt: IsoTimestampSchema,
  approvedBy: identifierSchema,
});
export type RoomMember = z.infer<typeof RoomMemberSchema>;

export const JoinRequestSchema = z.object({
  uid: identifierSchema,
  owlbearPlayerId: identifierSchema,
  playerName: displayNameSchema,
  requestedAt: IsoTimestampSchema,
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;

export const MigrationCountsSchema = z.object({
  profiles: z.number().int().nonnegative(),
  actions: z.number().int().nonnegative(),
  assignments: z.number().int().nonnegative(),
});

export const RoomMigrationSchema = z.object({
  sourceSchemaVersion: z.literal(1),
  targetSchemaVersion: z.literal(FIRESTORE_SCHEMA_VERSION),
  fingerprint: z.string().min(16).max(128),
  status: z.enum(["PENDING", "WRITING", "VERIFYING", "COMPLETE", "FAILED"]),
  counts: MigrationCountsSchema,
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema.optional(),
  error: z.string().max(500).optional(),
});
export type RoomMigration = z.infer<typeof RoomMigrationSchema>;

export const RollStepSummarySchema = z.object({
  stepId: identifierSchema,
  purpose: z.enum(["ATTACK", "DAMAGE", "HEALING", "CHECK", "SAVE", "OTHER"]),
  expression: z.string().min(1).max(300),
  success: z.boolean(),
  totalValue: z.number().finite().optional(),
  naturalD20: z.number().int().min(1).max(20).optional(),
});
export type RollStepSummary = z.infer<typeof RollStepSummarySchema>;

export const RollHistoryRecordSchema = z.object({
  id: identifierSchema,
  uid: identifierSchema,
  profileId: identifierSchema,
  actionId: identifierSchema,
  actionName: displayNameSchema,
  variant: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]),
  critical: z.boolean(),
  automaticMiss: z.boolean(),
  steps: z.array(RollStepSummarySchema).min(1).max(20),
  createdAt: IsoTimestampSchema,
});
export type RollHistoryRecord = z.infer<typeof RollHistoryRecordSchema>;

export const CachedAssignmentSchema = z.object({
  cacheVersion: z.literal(LOCAL_CACHE_VERSION),
  roomId: identifierSchema,
  uid: identifierSchema,
  profile: FirestoreProfileSchema,
  actions: z.array(FirestoreActionSchema),
  cachedAt: IsoTimestampSchema,
});
export type CachedAssignment = z.infer<typeof CachedAssignmentSchema>;

export const ActionPopoverContextSchema = z.object({
  actionId: identifierSchema,
  profileId: identifierSchema,
  variables: z.record(z.string(), z.number()),
  action: FirestoreActionSchema,
  cachedAt: IsoTimestampSchema,
  expiresAt: IsoTimestampSchema,
});
export type ActionPopoverContext = z.infer<typeof ActionPopoverContextSchema>;

export const ActionPopoverContextCacheSchema = z.object({
  cacheVersion: z.literal(LOCAL_CACHE_VERSION),
  roomId: identifierSchema,
  uid: identifierSchema,
  contexts: z.record(z.string(), ActionPopoverContextSchema),
});
export type ActionPopoverContextCache = z.infer<typeof ActionPopoverContextCacheSchema>;
