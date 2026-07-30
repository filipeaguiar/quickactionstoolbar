export const DICE_PLUS_PROTOCOL = {
  readyChannel: "dice-plus/isReady",
  rollChannel: "dice-plus/roll-request",
  resultChannel: "dice-plus/roll-result",
  errorChannel: "dice-plus/roll-error",
  source: "quick-actions-toolbar",
  timeoutMs: 1500,
  stepTimeoutMs: 4000,
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

export interface DicePlusDieResult {
  diceId: string;
  rollId: string;
  diceType: string;
  diceStyle?: string;
  value: number;
  kept: boolean;
  isAdvantage?: boolean;
  isDisadvantage?: boolean;
  [key: string]: unknown;
}

export interface DicePlusRollGroup {
  description: string;
  diceType: string;
  dice: DicePlusDieResult[];
  total: number;
  [key: string]: unknown;
}

export interface DicePlusRollResultDetails {
  rollId: string;
  diceNotation?: string;
  totalValue?: number;
  rollSummary?: string;
  groups: DicePlusRollGroup[];
  [key: string]: unknown;
}

export interface DicePlusRollResultEnvelope {
  rollId: string;
  playerId?: string;
  playerName?: string;
  rollTarget?: "everyone" | "self" | "dm" | "gm_only";
  timestamp?: number;
  source?: string;
  showResults?: boolean;
  result: DicePlusRollResultDetails;
  [key: string]: unknown;
}

export interface DicePlusRollErrorEnvelope {
  rollId: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
}
