import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FirebaseError } from "firebase/app";
import { Timestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { roomWorkspaceConverter } from "@/storage/firebase/converters";
import { mapFirestoreRepositoryError } from "@/storage/firebase/firestoreRepositories";
import { actionPath, profilePath, roomPath } from "@/storage/firebase/paths";
import { RepositoryError } from "@/storage/firebase/repositories";
import {
  FirestoreProfileSchema,
  RollHistoryRecordSchema,
  RoomWorkspaceSchema,
} from "@/types/firebase";

function snapshotWith(data: Record<string, unknown>): QueryDocumentSnapshot {
  return { data: () => data } as unknown as QueryDocumentSnapshot;
}

describe("Firebase persistence contracts", () => {
  it("applies bounded workspace defaults", () => {
    const workspace = RoomWorkspaceSchema.parse({
      schemaVersion: 2,
      ownerUid: "owner-1",
      settings: {},
      createdAt: "2026-07-30T12:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    });

    expect(workspace.settings).toEqual({ maxVisibleActions: 8, rollRetentionDays: 90 });
  });

  it("validates profile and roll bounds", () => {
    expect(
      FirestoreProfileSchema.safeParse({
        id: "profile-1",
        name: "Hero",
        variables: { strength: 4 },
        createdAt: "2026-07-30T12:00:00.000Z",
        updatedAt: "2026-07-30T12:00:00.000Z",
        updatedBy: "owner-1",
      }).success
    ).toBe(true);

    expect(
      RollHistoryRecordSchema.safeParse({
        id: "roll-1",
        uid: "player-1",
        profileId: "profile-1",
        actionId: "attack-1",
        actionName: "Attack",
        variant: "CRITICAL",
        critical: true,
        automaticMiss: false,
        steps: [],
        createdAt: "2026-07-30T12:00:00.000Z",
      }).success
    ).toBe(false);
  });

  it("builds deterministic room-scoped paths and rejects separators", () => {
    expect(roomPath("room-1")).toBe("rooms/room-1");
    expect(profilePath("room-1", "profile-1")).toBe("rooms/room-1/profiles/profile-1");
    expect(actionPath("room-1", "profile-1", "attack-1")).toBe(
      "rooms/room-1/profiles/profile-1/actions/attack-1"
    );
    expect(() => roomPath("room/other")).toThrow("Identificador Firestore inválido");
  });

  it("converts Firestore timestamps and rejects unsupported workspace versions", () => {
    const workspace = roomWorkspaceConverter.fromFirestore(
      snapshotWith({
        schemaVersion: 2,
        ownerUid: "owner-1",
        settings: { maxVisibleActions: 8, rollRetentionDays: 90 },
        createdAt: Timestamp.fromDate(new Date("2026-07-30T12:00:00.000Z")),
        updatedAt: Timestamp.fromDate(new Date("2026-07-30T12:00:00.000Z")),
      }),
      {}
    );
    expect(workspace.createdAt).toBe("2026-07-30T12:00:00.000Z");

    expect(() =>
      roomWorkspaceConverter.fromFirestore(
        snapshotWith({
          schemaVersion: 99,
          ownerUid: "owner-1",
          settings: {},
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }),
        {}
      )
    ).toThrowError(expect.objectContaining({ code: "UNSUPPORTED_SCHEMA" }));
  });

  it("implements selected-action lookup as one document read", () => {
    const source = readFileSync(
      resolve("src/storage/firebase/firestoreRepositories.ts"),
      "utf8"
    );
    const method = source.match(/async getAction\([\s\S]*?\n  async saveAction/)?.[0] ?? "";
    expect(method).toContain("getDoc(");
    expect(method).toContain("actionPath(roomId, profileId, actionId)");
    expect(method).not.toContain("getDocs(");
    expect(method).not.toContain("listActions(");
  });

  it("maps Firebase and validation failures to stable repository errors", () => {
    expect(
      mapFirestoreRepositoryError(
        new FirebaseError("firestore/permission-denied", "not allowed")
      ).code
    ).toBe("PERMISSION_DENIED");

    const existing = new RepositoryError("INVALID_DATA", "invalid");
    expect(mapFirestoreRepositoryError(existing)).toBe(existing);
  });
});
