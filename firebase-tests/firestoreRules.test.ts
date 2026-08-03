import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FirestoreRollHistoryRepository } from "@/storage/firebase/firestoreRollHistoryRepository";

const projectId = "quick-actions-toolbar-rules-test";
const roomId = "room-1";
const ownerUid = "owner-1";
const memberUid = "member-1";
const unapprovedUid = "unapproved-1";

let environment: RulesTestEnvironment;
let owner: RulesTestContext;
let member: RulesTestContext;
let unapproved: RulesTestContext;

const timestamp = Timestamp.fromDate(new Date("2026-07-30T12:00:00.000Z"));

function validAction(id: string) {
  return {
    id,
    name: "Attack",
    icon: "crossed-swords",
    kind: "ATTACK",
    enabled: true,
    sortOrder: 0,
    systemId: "dnd5e-2024",
    sequence: { version: 1, steps: [] },
    variantPolicy: {},
    tags: [],
  };
}

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
    },
  });
  owner = environment.authenticatedContext(ownerUid);
  member = environment.authenticatedContext(memberUid);
  unapproved = environment.authenticatedContext(unapprovedUid);
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, `rooms/${roomId}`), {
      schemaVersion: 2,
      ownerUid,
      settings: { maxVisibleActions: 8, rollRetentionDays: 90 },
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    for (const profileId of ["profile-1", "profile-2"]) {
      await setDoc(doc(firestore, `rooms/${roomId}/profiles/${profileId}`), {
        id: profileId,
        name: profileId,
        systemId: "dnd5e-2024",
        variables: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: ownerUid,
      });
      await setDoc(
        doc(firestore, `rooms/${roomId}/profiles/${profileId}/actions/action-1`),
        validAction("action-1")
      );
    }
    await setDoc(doc(firestore, `rooms/${roomId}/members/${memberUid}`), {
      uid: memberUid,
      owlbearPlayerId: "obr-player-1",
      playerName: "Player",
      profileId: "profile-1",
      approvedAt: timestamp,
      approvedBy: ownerUid,
    });
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe("Firestore Security Rules", () => {
  it("allows only the owner to write profiles and actions", async () => {
    await assertSucceeds(
      setDoc(doc(owner.firestore(), `rooms/${roomId}/profiles/profile-3`), {
        id: "profile-3",
        name: "Owner profile",
        systemId: "dnd5e-2024",
        variables: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: ownerUid,
      })
    );
    await assertFails(
      setDoc(
        doc(member.firestore(), `rooms/${roomId}/profiles/profile-1/actions/spoofed`),
        validAction("spoofed")
      )
    );
  });

  it("allows self-owned join requests but rejects UID spoofing", async () => {
    await assertSucceeds(
      setDoc(doc(unapproved.firestore(), `rooms/${roomId}/joinRequests/${unapprovedUid}`), {
        uid: unapprovedUid,
        owlbearPlayerId: "obr-unapproved",
        playerName: "New Player",
        requestedAt: timestamp,
      })
    );
    await assertFails(
      setDoc(doc(unapproved.firestore(), `rooms/${roomId}/joinRequests/other-user`), {
        uid: "other-user",
        owlbearPlayerId: "spoofed",
        playerName: "Spoofed",
        requestedAt: timestamp,
      })
    );
  });

  it("scopes reads to the approved member profile", async () => {
    await assertSucceeds(
      getDoc(doc(member.firestore(), `rooms/${roomId}/profiles/profile-1/actions/action-1`))
    );
    await assertFails(
      getDoc(doc(member.firestore(), `rooms/${roomId}/profiles/profile-2/actions/action-1`))
    );
    await assertFails(
      getDoc(doc(unapproved.firestore(), `rooms/${roomId}/profiles/profile-1`))
    );
  });

  it("accepts only self-attributed assigned-profile rolls and keeps them immutable", async () => {
    const rollReference = doc(member.firestore(), `rooms/${roomId}/rolls/roll-1`);
    await assertSucceeds(
      setDoc(rollReference, {
        id: "roll-1",
        uid: memberUid,
        profileId: "profile-1",
        actionId: "action-1",
        actionName: "Attack",
        variant: "NORMAL",
        critical: false,
        automaticMiss: false,
        steps: [{ stepId: "step-1" }],
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(updateDoc(rollReference, { critical: true }));
    await assertFails(
      setDoc(doc(member.firestore(), `rooms/${roomId}/rolls/roll-2`), {
        id: "roll-2",
        uid: memberUid,
        profileId: "profile-2",
        actionId: "action-1",
        actionName: "Attack",
        variant: "NORMAL",
        critical: false,
        automaticMiss: false,
        steps: [{ stepId: "step-1" }],
        createdAt: serverTimestamp(),
      })
    );
  });

  it("paginates newest-first history and lets only the owner run retention cleanup", async () => {
    const repository = new FirestoreRollHistoryRepository(owner.firestore());
    const baseRecord = {
      uid: memberUid,
      profileId: "profile-1",
      actionId: "action-1",
      actionName: "Attack",
      variant: "NORMAL" as const,
      critical: false,
      automaticMiss: false,
      steps: [
        {
          stepId: "step-1",
          purpose: "ATTACK" as const,
          expression: "1d20",
          success: true,
          totalValue: 10,
          naturalD20: 10,
        },
      ],
    };
    await repository.create(roomId, { ...baseRecord, id: "roll-a" });
    await repository.create(roomId, { ...baseRecord, id: "roll-b" });

    const firstPage = await repository.list(roomId, 1);
    expect(firstPage.records).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = await repository.list(roomId, 1, firstPage.nextCursor!);
    expect(secondPage.records).toHaveLength(1);
    expect(secondPage.records[0].id).not.toBe(firstPage.records[0].id);

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `rooms/${roomId}/rolls/expired`), {
        ...baseRecord,
        id: "expired",
        createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00.000Z")),
      });
    });
    await expect(repository.deleteExpired(roomId, 30)).resolves.toBe(1);
  });
});
