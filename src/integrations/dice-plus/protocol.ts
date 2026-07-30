export const DICE_PLUS_PROTOCOL = {
  readyChannel: "dice-plus/isReady",
  rollChannel: "dice-plus/roll-request",
  source: "quick-actions-toolbar",
  timeoutMs: 1500,
} as const;

export interface DicePlusReadyRequest {
  requestId: string;
  timestamp: number;
}

export interface DicePlusReadyResponse {
  requestId: string;
  ready: boolean;
  timestamp: number;
}

export interface DicePlusRollRequestPayload {
  rollId: string;
  playerId: string;
  playerName: string;
  rollTarget: "everyone" | "self" | "dm" | "gm_only";
  diceNotation: string;
  showResults: boolean;
  timestamp: number;
  source: string;
}
