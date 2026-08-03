export function roomPath(roomId: string): string {
  return `rooms/${encodePathId(roomId)}`;
}

export function profilesPath(roomId: string): string {
  return `${roomPath(roomId)}/profiles`;
}

export function profilePath(roomId: string, profileId: string): string {
  return `${profilesPath(roomId)}/${encodePathId(profileId)}`;
}

export function actionsPath(roomId: string, profileId: string): string {
  return `${profilePath(roomId, profileId)}/actions`;
}

export function actionPath(roomId: string, profileId: string, actionId: string): string {
  return `${actionsPath(roomId, profileId)}/${encodePathId(actionId)}`;
}

export function membersPath(roomId: string): string {
  return `${roomPath(roomId)}/members`;
}

export function memberPath(roomId: string, uid: string): string {
  return `${membersPath(roomId)}/${encodePathId(uid)}`;
}

export function joinRequestsPath(roomId: string): string {
  return `${roomPath(roomId)}/joinRequests`;
}

export function joinRequestPath(roomId: string, uid: string): string {
  return `${joinRequestsPath(roomId)}/${encodePathId(uid)}`;
}

export function rollsPath(roomId: string): string {
  return `${roomPath(roomId)}/rolls`;
}

export function rollPath(roomId: string, rollId: string): string {
  return `${rollsPath(roomId)}/${encodePathId(rollId)}`;
}

function encodePathId(id: string): string {
  const normalized = id.trim();
  if (!normalized || normalized.includes("/")) {
    throw new Error("Identificador Firestore inválido.");
  }
  return normalized;
}
