import { CharacterActionProfile } from "./action";

export const ROOM_DATA_KEY = "com.seudominio.quick-actions/room-data";
export const PROFILE_REFERENCE_KEY = "com.seudominio.quick-actions/profile-id";

export interface RoomQuickActionsSettings {
  playersCanEditOwnProfiles: boolean;
  maxVisibleActions: number;
}

export interface RoomQuickActionsData {
  schemaVersion: 1;
  profiles: Record<string, CharacterActionProfile>;
  playerAssignments: Record<string, string>; // playerId -> profileId
  settings: RoomQuickActionsSettings;
  updatedAt: string;
  updatedBy: string;
}
