export const DICE_PLUS_PROTOCOL = {
  channel: "com.owlbear-rodeo.dice-plus/broadcast",
  version: 1,
  timeoutMs: 3000,
} as const;

export interface DicePlusRollRequest {
  version: 1;
  transactionId: string;
  senderId: string;
  rolls: Array<{
    label: string;
    expression: string;
    visibility: "PUBLIC" | "PRIVATE";
  }>;
}

export interface DicePlusHandshakeRequest {
  version: 1;
  type: "PING";
}

export interface DicePlusHandshakeResponse {
  version: 1;
  type: "PONG";
  status: "READY";
}
