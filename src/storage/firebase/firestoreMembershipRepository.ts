import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { nowIso } from "@/integrations/firebase/client";
import {
  JoinRequestSchema,
  RoomMemberSchema,
  type JoinRequest,
  type RoomMember,
} from "@/types/firebase";
import { joinRequestConverter, memberConverter } from "./converters";
import { mapFirestoreRepositoryError } from "./firestoreRepositories";
import {
  joinRequestPath,
  joinRequestsPath,
  memberPath,
  membersPath,
} from "./paths";
import type {
  MembershipRepository,
  RepositoryErrorListener,
  RepositoryListener,
  RepositoryUnsubscribe,
} from "./repositories";

export class FirestoreMembershipRepository implements MembershipRepository {
  constructor(private readonly firestore: Firestore) {}

  async getMember(roomId: string, uid: string): Promise<RoomMember | null> {
    try {
      const snapshot = await getDoc(
        doc(this.firestore, memberPath(roomId, uid)).withConverter(memberConverter)
      );
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async submitJoinRequest(
    roomId: string,
    request: Omit<JoinRequest, "requestedAt"> & { requestedAt?: string }
  ): Promise<void> {
    const parsed = JoinRequestSchema.parse({ ...request, requestedAt: request.requestedAt ?? nowIso() });
    try {
      await setDoc(
        doc(this.firestore, joinRequestPath(roomId, parsed.uid)).withConverter(
          joinRequestConverter
        ),
        parsed
      );
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async listJoinRequests(roomId: string): Promise<JoinRequest[]> {
    try {
      const snapshot = await getDocs(
        collection(this.firestore, joinRequestsPath(roomId)).withConverter(joinRequestConverter)
      );
      return snapshot.docs
        .map((item) => item.data())
        .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async listMembers(roomId: string): Promise<RoomMember[]> {
    try {
      const snapshot = await getDocs(
        collection(this.firestore, membersPath(roomId)).withConverter(memberConverter)
      );
      return snapshot.docs
        .map((item) => item.data())
        .sort((left, right) => left.playerName.localeCompare(right.playerName));
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async approve(roomId: string, member: RoomMember): Promise<void> {
    const parsed = RoomMemberSchema.parse(member);
    try {
      const batch = writeBatch(this.firestore);
      batch.set(
        doc(this.firestore, memberPath(roomId, parsed.uid)).withConverter(memberConverter),
        parsed
      );
      batch.delete(doc(this.firestore, joinRequestPath(roomId, parsed.uid)));
      await batch.commit();
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async reassign(roomId: string, uid: string, profileId: string): Promise<void> {
    if (!profileId.trim()) throw new Error("Perfil de destino inválido.");
    try {
      await updateDoc(doc(this.firestore, memberPath(roomId, uid)), { profileId });
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async revoke(roomId: string, uid: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, memberPath(roomId, uid)));
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  subscribeMember(
    roomId: string,
    uid: string,
    listener: RepositoryListener<RoomMember | null>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe {
    return onSnapshot(
      doc(this.firestore, memberPath(roomId, uid)).withConverter(memberConverter),
      (snapshot) => listener(snapshot.exists() ? snapshot.data() : null),
      (error) => onError(mapFirestoreRepositoryError(error))
    );
  }

  subscribeJoinRequests(
    roomId: string,
    listener: RepositoryListener<JoinRequest[]>,
    onError: RepositoryErrorListener
  ): RepositoryUnsubscribe {
    return onSnapshot(
      collection(this.firestore, joinRequestsPath(roomId)).withConverter(joinRequestConverter),
      (snapshot) =>
        listener(
          snapshot.docs
            .map((item) => item.data())
            .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt))
        ),
      (error) => onError(mapFirestoreRepositoryError(error))
    );
  }
}
