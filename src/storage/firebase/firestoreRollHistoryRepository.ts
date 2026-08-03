import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  limit as queryLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  writeBatch,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import {
  RollHistoryRecordSchema,
  type RollHistoryRecord,
} from "@/types/firebase";
import { rollHistoryConverter } from "./converters";
import { mapFirestoreRepositoryError } from "./firestoreRepositories";
import { rollPath, rollsPath } from "./paths";
import type {
  RollHistoryCursor,
  RollHistoryPage,
  RollHistoryRepository,
} from "./repositories";

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === "object" && !(value instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([key, fieldValue]) => [key, withoutUndefined(fieldValue)])
    );
  }
  return value;
}

export class FirestoreRollHistoryRepository implements RollHistoryRepository {
  constructor(private readonly firestore: Firestore) {}

  async create(
    roomId: string,
    record: Omit<RollHistoryRecord, "createdAt"> & { createdAt?: string }
  ): Promise<void> {
    const parsed = RollHistoryRecordSchema.parse({
      ...record,
      createdAt: record.createdAt ?? new Date().toISOString(),
    });
    try {
      await setDoc(doc(this.firestore, rollPath(roomId, parsed.id)), {
        ...(withoutUndefined(parsed) as Record<string, unknown>),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async list(
    roomId: string,
    pageSize: number,
    cursor?: RollHistoryCursor
  ): Promise<RollHistoryPage> {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(pageSize)));
    const constraints: QueryConstraint[] = [
      orderBy("createdAt", "desc"),
      orderBy(documentId(), "desc"),
      queryLimit(boundedLimit),
    ];
    if (cursor) {
      constraints.splice(
        2,
        0,
        startAfter(Timestamp.fromDate(new Date(cursor.createdAt)), cursor.id)
      );
    }

    try {
      const snapshot = await getDocs(
        query(
          collection(this.firestore, rollsPath(roomId)).withConverter(rollHistoryConverter),
          ...constraints
        )
      );
      const records = snapshot.docs.map((item) => item.data());
      const last = records.at(-1);
      return {
        records,
        nextCursor:
          records.length === boundedLimit && last
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async deleteExpired(roomId: string, retentionDays: number): Promise<number> {
    const boundedDays = Math.max(1, Math.min(365, Math.trunc(retentionDays)));
    const cutoff = Timestamp.fromMillis(Date.now() - boundedDays * 24 * 60 * 60 * 1000);
    let deleted = 0;

    try {
      while (true) {
        const snapshot = await getDocs(
          query(
            collection(this.firestore, rollsPath(roomId)),
            where("createdAt", "<", cutoff),
            orderBy("createdAt", "asc"),
            queryLimit(500)
          )
        );
        if (snapshot.empty) break;
        const batch = writeBatch(this.firestore);
        snapshot.docs.forEach((item) => batch.delete(item.ref));
        await batch.commit();
        deleted += snapshot.size;
        if (snapshot.size < 500) break;
      }
      return deleted;
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }

  async deleteOne(roomId: string, rollId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, rollPath(roomId, rollId)));
    } catch (error) {
      throw mapFirestoreRepositoryError(error);
    }
  }
}
