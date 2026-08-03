import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import { z } from "zod";
import {
  FirestoreActionSchema,
  FirestoreProfileSchema,
  JoinRequestSchema,
  RollHistoryRecordSchema,
  RoomMemberSchema,
  RoomWorkspaceSchema,
  type FirestoreAction,
  type FirestoreProfile,
  type JoinRequest,
  type RollHistoryRecord,
  type RoomMember,
  type RoomWorkspace,
} from "@/types/firebase";
import { RepositoryError } from "./repositories";

function timestampForWrite(value: string): Timestamp {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RepositoryError("INVALID_DATA", "Data persistida inválida.");
  }
  return Timestamp.fromDate(date);
}

function timestampForRead(value: unknown): unknown {
  return value instanceof Timestamp ? value.toDate().toISOString() : value;
}

function parseDocument<S extends z.ZodTypeAny>(
  schema: S,
  value: unknown,
  kind: string
): z.output<S> {
  if (
    kind === "Workspace" &&
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion !== 2
  ) {
    throw new RepositoryError(
      "UNSUPPORTED_SCHEMA",
      "Versão do workspace Firestore não suportada."
    );
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new RepositoryError(
      "INVALID_DATA",
      `${kind} retornado pelo Firestore não corresponde ao schema.`,
      { cause: result.error }
    );
  }
  return result.data;
}

export const roomWorkspaceConverter: FirestoreDataConverter<RoomWorkspace> = {
  toFirestore(workspace): DocumentData {
    const parsed = parseDocument(RoomWorkspaceSchema, workspace, "Workspace");
    return {
      ...parsed,
      createdAt: timestampForWrite(parsed.createdAt),
      updatedAt: timestampForWrite(parsed.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RoomWorkspace {
    const data = snapshot.data(options);
    return parseDocument(
      RoomWorkspaceSchema,
      {
        ...data,
        createdAt: timestampForRead(data.createdAt),
        updatedAt: timestampForRead(data.updatedAt),
      },
      "Workspace"
    );
  },
};

export const profileConverter: FirestoreDataConverter<FirestoreProfile> = {
  toFirestore(profile): DocumentData {
    const parsed = parseDocument(FirestoreProfileSchema, profile, "Perfil");
    return {
      ...parsed,
      createdAt: timestampForWrite(parsed.createdAt),
      updatedAt: timestampForWrite(parsed.updatedAt),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FirestoreProfile {
    const data = snapshot.data(options);
    return parseDocument(
      FirestoreProfileSchema,
      {
        ...data,
        createdAt: timestampForRead(data.createdAt),
        updatedAt: timestampForRead(data.updatedAt),
      },
      "Perfil"
    );
  },
};

export const actionConverter: FirestoreDataConverter<FirestoreAction> = {
  toFirestore(action): DocumentData {
    return parseDocument(FirestoreActionSchema, action, "Ação");
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FirestoreAction {
    return parseDocument(FirestoreActionSchema, snapshot.data(options), "Ação");
  },
};

export const memberConverter: FirestoreDataConverter<RoomMember> = {
  toFirestore(member): DocumentData {
    const parsed = parseDocument(RoomMemberSchema, member, "Membro");
    return { ...parsed, approvedAt: timestampForWrite(parsed.approvedAt) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RoomMember {
    const data = snapshot.data(options);
    return parseDocument(
      RoomMemberSchema,
      { ...data, approvedAt: timestampForRead(data.approvedAt) },
      "Membro"
    );
  },
};

export const joinRequestConverter: FirestoreDataConverter<JoinRequest> = {
  toFirestore(request): DocumentData {
    const parsed = parseDocument(JoinRequestSchema, request, "Solicitação de entrada");
    return { ...parsed, requestedAt: timestampForWrite(parsed.requestedAt) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): JoinRequest {
    const data = snapshot.data(options);
    return parseDocument(
      JoinRequestSchema,
      { ...data, requestedAt: timestampForRead(data.requestedAt) },
      "Solicitação de entrada"
    );
  },
};

export const rollHistoryConverter: FirestoreDataConverter<RollHistoryRecord> = {
  toFirestore(record): DocumentData {
    const parsed = parseDocument(RollHistoryRecordSchema, record, "Histórico de rolagem");
    return { ...parsed, createdAt: timestampForWrite(parsed.createdAt) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): RollHistoryRecord {
    const data = snapshot.data(options);
    return parseDocument(
      RollHistoryRecordSchema,
      { ...data, createdAt: timestampForRead(data.createdAt) },
      "Histórico de rolagem"
    );
  },
};
