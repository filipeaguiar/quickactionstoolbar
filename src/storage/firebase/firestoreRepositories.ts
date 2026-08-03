import { FirebaseError } from "firebase/app";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  FirebaseRoomSettingsSchema,
  FirestoreActionSchema,
  FirestoreProfileSchema,
  RoomWorkspaceSchema,
  type FirestoreAction,
  type FirestoreProfile,
  type RoomWorkspace,
} from "@/types/firebase";
import { nowIso } from "@/integrations/firebase/client";
import { actionConverter, profileConverter, roomWorkspaceConverter } from "./converters";
import {
  actionPath,
  actionsPath,
  profilePath,
  profilesPath,
  roomPath,
} from "./paths";
import {
  RepositoryError,
  type ProfileActionRepository,
  type RepositoryErrorCode,
  type RepositoryErrorListener,
  type RepositoryListener,
  type RepositoryUnsubscribe,
  type WorkspaceRepository,
} from "./repositories";

function mapError(error: unknown): RepositoryError {
  if (error instanceof RepositoryError) return error;

  let code: RepositoryErrorCode = "UNKNOWN";
  if (error instanceof FirebaseError) {
    const firebaseCode = error.code.replace("firestore/", "");
    if (firebaseCode === "permission-denied") code = "PERMISSION_DENIED";
    else if (firebaseCode === "unauthenticated") code = "UNAUTHENTICATED";
    else if (firebaseCode === "not-found") code = "NOT_FOUND";
    else if (firebaseCode === "already-exists" || firebaseCode === "aborted") {
      code = "ALREADY_EXISTS";
    } else if (firebaseCode === "unavailable" || firebaseCode === "deadline-exceeded") {
      code = "OFFLINE";
    }
  }

  return new RepositoryError(code, "Falha ao acessar os dados da sala no Firestore.", {
    cause: error,
  });
}

function sortedActions(actions: FirestoreAction[]): FirestoreAction[] {
  return actions.sort(
    (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
  );
}

export class FirestoreWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly firestore: Firestore) {}

  async get(roomId: string): Promise<RoomWorkspace | null> {
    try {
      const snapshot = await getDoc(
        doc(this.firestore, roomPath(roomId)).withConverter(roomWorkspaceConverter)
      );
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw mapError(error);
    }
  }

  async create(roomId: string, ownerUid: string): Promise<RoomWorkspace> {
    const timestamp = nowIso();
    const workspace = RoomWorkspaceSchema.parse({
      schemaVersion: 2,
      ownerUid,
      settings: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    try {
      const reference = doc(this.firestore, roomPath(roomId)).withConverter(
        roomWorkspaceConverter
      );
      await runTransaction(this.firestore, async (transaction) => {
        const existing = await transaction.get(reference);
        if (existing.exists()) {
          throw new RepositoryError("ALREADY_EXISTS", "A sala já possui um proprietário.");
        }
        transaction.set(reference, workspace);
      });
      return workspace;
    } catch (error) {
      throw mapError(error);
    }
  }

  async updateSettings(roomId: string, settings: RoomWorkspace["settings"]): Promise<void> {
    const parsed = FirebaseRoomSettingsSchema.parse(settings);
    try {
      await updateDoc(doc(this.firestore, roomPath(roomId)), {
        settings: parsed,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      throw mapError(error);
    }
  }

  subscribe(
    roomId: string,
    listener: RepositoryListener<RoomWorkspace | null>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe {
    const reference = doc(this.firestore, roomPath(roomId)).withConverter(
      roomWorkspaceConverter
    );
    return onSnapshot(
      reference,
      (snapshot) => listener(snapshot.exists() ? snapshot.data() : null),
      (error) => onError(mapError(error))
    );
  }
}

export class FirestoreProfileActionRepository implements ProfileActionRepository {
  constructor(private readonly firestore: Firestore) {}

  async getProfile(roomId: string, profileId: string): Promise<FirestoreProfile | null> {
    try {
      const snapshot = await getDoc(
        doc(this.firestore, profilePath(roomId, profileId)).withConverter(profileConverter)
      );
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw mapError(error);
    }
  }

  async listProfiles(roomId: string): Promise<FirestoreProfile[]> {
    try {
      const snapshot = await getDocs(
        collection(this.firestore, profilesPath(roomId)).withConverter(profileConverter)
      );
      return snapshot.docs.map((item) => item.data()).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw mapError(error);
    }
  }

  async saveProfile(roomId: string, profile: FirestoreProfile): Promise<void> {
    const parsed = FirestoreProfileSchema.parse(profile);
    try {
      await setDoc(
        doc(this.firestore, profilePath(roomId, parsed.id)).withConverter(profileConverter),
        parsed
      );
    } catch (error) {
      throw mapError(error);
    }
  }

  async deleteProfile(roomId: string, profileId: string): Promise<void> {
    try {
      const actions = await getDocs(collection(this.firestore, actionsPath(roomId, profileId)));
      const references = actions.docs.map((item) => item.ref);
      references.push(doc(this.firestore, profilePath(roomId, profileId)));

      for (let offset = 0; offset < references.length; offset += 500) {
        const batch = writeBatch(this.firestore);
        for (const reference of references.slice(offset, offset + 500)) batch.delete(reference);
        await batch.commit();
      }
    } catch (error) {
      throw mapError(error);
    }
  }

  async listActions(roomId: string, profileId: string): Promise<FirestoreAction[]> {
    try {
      const snapshot = await getDocs(
        collection(this.firestore, actionsPath(roomId, profileId)).withConverter(actionConverter)
      );
      return sortedActions(snapshot.docs.map((item) => item.data()));
    } catch (error) {
      throw mapError(error);
    }
  }

  async getAction(
    roomId: string,
    profileId: string,
    actionId: string
  ): Promise<FirestoreAction | null> {
    try {
      const snapshot = await getDoc(
        doc(this.firestore, actionPath(roomId, profileId, actionId)).withConverter(
          actionConverter
        )
      );
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw mapError(error);
    }
  }

  async saveAction(roomId: string, profileId: string, action: FirestoreAction): Promise<void> {
    const parsed = FirestoreActionSchema.parse(action);
    try {
      await setDoc(
        doc(this.firestore, actionPath(roomId, profileId, parsed.id)).withConverter(
          actionConverter
        ),
        parsed
      );
    } catch (error) {
      throw mapError(error);
    }
  }

  async deleteAction(roomId: string, profileId: string, actionId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, actionPath(roomId, profileId, actionId)));
    } catch (error) {
      throw mapError(error);
    }
  }

  subscribeProfile(
    roomId: string,
    profileId: string,
    listener: RepositoryListener<FirestoreProfile | null>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe {
    const reference = doc(this.firestore, profilePath(roomId, profileId)).withConverter(
      profileConverter
    );
    return onSnapshot(
      reference,
      (snapshot) => listener(snapshot.exists() ? snapshot.data() : null),
      (error) => onError(mapError(error))
    );
  }

  subscribeActions(
    roomId: string,
    profileId: string,
    listener: RepositoryListener<FirestoreAction[]>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe {
    const reference = collection(this.firestore, actionsPath(roomId, profileId)).withConverter(
      actionConverter
    );
    return onSnapshot(
      reference,
      (snapshot) => listener(sortedActions(snapshot.docs.map((item) => item.data()))),
      (error) => onError(mapError(error))
    );
  }
}

export { mapError as mapFirestoreRepositoryError };
