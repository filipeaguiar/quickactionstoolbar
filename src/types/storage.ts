import { z } from "zod";
import { CharacterActionProfileSchema } from "./action";

export const ROOM_DATA_KEY = "com.seudominio.quick-actions/room-data";
export const PROFILE_REFERENCE_KEY = "com.seudominio.quick-actions/profile-id";

export const RoomQuickActionsSettingsSchema = z.object({
  playersCanEditOwnProfiles: z.boolean(),
  maxVisibleActions: z.number().int().min(1).max(8),
});
export type RoomQuickActionsSettings = z.infer<typeof RoomQuickActionsSettingsSchema>;

export const RoomQuickActionsDataSchema = z.object({
  schemaVersion: z.literal(1),
  profiles: z.record(z.string(), CharacterActionProfileSchema),
  playerAssignments: z.record(z.string(), z.string()),
  settings: RoomQuickActionsSettingsSchema,
  updatedAt: z.string().datetime({ offset: true }),
  updatedBy: z.string().min(1),
});
export type RoomQuickActionsData = z.infer<typeof RoomQuickActionsDataSchema>;

export const CompactMigrationMarkerSchema = z.object({
  schemaVersion: z.literal(2),
  backend: z.literal("firebase"),
  roomId: z.string().min(1),
  migrationFingerprint: z.string().min(16),
  migratedAt: z.string().datetime({ offset: true }),
});
export type CompactMigrationMarker = z.infer<typeof CompactMigrationMarkerSchema>;
