import OBR from "@owlbear-rodeo/sdk";
import { ResolvedRollSequence, ResolvedRollStep } from "../../systems/types";
import {
  DICE_PLUS_PROTOCOL,
  DicePlusReadyResponse,
  DicePlusRollErrorEnvelope,
  DicePlusRollRequestPayload,
  DicePlusRollResultDetails,
  DicePlusRollResultEnvelope,
} from "./protocol";

export interface RollDispatchResult {
  success: boolean;
  transactionId: string;
  error?: string;
  stepResults: StepRollResult[];
}

export interface StepRollResult {
  success: boolean;
  rollId: string;
  result?: DicePlusRollResultDetails;
  error?: string;
}

export interface DiceAdapter {
  id: string;
  isAvailable(): Promise<boolean>;
  roll(sequence: ResolvedRollSequence): Promise<RollDispatchResult>;
}

interface PendingRoll {
  resolve: (result: StepRollResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

function unwrapBroadcastPayload<T>(eventData: unknown): T | null {
  if (!eventData || typeof eventData !== "object") return null;

  const firstLevel = eventData as Record<string, unknown>;
  const firstData = firstLevel.data;
  if (firstData && typeof firstData === "object") {
    const secondLevel = firstData as Record<string, unknown>;
    const secondData = secondLevel.data;
    if (secondData && typeof secondData === "object") {
      return secondData as T;
    }
    return firstData as T;
  }

  return eventData as T;
}

export class DicePlusAdapter implements DiceAdapter {
  id = "dice-plus";

  async isAvailable(): Promise<boolean> {
    const requestId = crypto.randomUUID();

    return new Promise((resolve) => {
      let responded = false;

      const unsubscribe = OBR.broadcast.onMessage(
        DICE_PLUS_PROTOCOL.readyChannel,
        (event) => {
          const data = event.data as DicePlusReadyResponse;
          if (data && data.ready && data.requestId === requestId) {
            responded = true;
            unsubscribe();
            resolve(true);
          }
        }
      );

      OBR.broadcast.sendMessage(
        DICE_PLUS_PROTOCOL.readyChannel,
        {
          requestId,
          timestamp: Date.now(),
        },
        { destination: "ALL" }
      );

      setTimeout(() => {
        if (!responded) {
          unsubscribe();
          resolve(false);
        }
      }, DICE_PLUS_PROTOCOL.timeoutMs);
    });
  }

  private createRollRequestPayload(
    actionName: string,
    step: ResolvedRollStep,
    playerId: string,
    playerName: string,
    rollId: string
  ): DicePlusRollRequestPayload {
    const cleanAction = actionName.replace(/[+\-*/]/g, " ").trim();
    const cleanLabel = step.label.replace(/[+\-*/]/g, " ").trim();
    const cleanExpression = step.resolvedExpression.replace(/\s+/g, "");
    const diceNotation = `${cleanExpression} # ${cleanAction}: ${cleanLabel}`;

    return {
      rollId,
      playerId,
      playerName,
      rollTarget: "everyone",
      diceNotation,
      showResults: true,
      timestamp: Date.now(),
      source: DICE_PLUS_PROTOCOL.source,
    };
  }

  async roll(sequence: ResolvedRollSequence): Promise<RollDispatchResult> {
    const available = await this.isAvailable();
    if (!available) {
      OBR.notification.show(
        "Dice+ não foi detectado. Habilite a extensão Dice+ na sala para executar rolagens 3D.",
        "WARNING"
      );
      return {
        success: false,
        transactionId: "",
        error: "Dice+ indisponível",
        stepResults: [],
      };
    }

    const transactionId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const playerId = OBR.player.id;
    const playerName = await OBR.player.getName();
    const stepResults: StepRollResult[] = [];
    const pendingRolls = new Map<string, PendingRoll>();

    const resolvePending = (result: StepRollResult) => {
      const pending = pendingRolls.get(result.rollId);
      if (!pending) return false;
      clearTimeout(pending.timeoutId);
      pendingRolls.delete(result.rollId);
      pending.resolve(result);
      return true;
    };

    const unsubResult = OBR.broadcast.onMessage(DICE_PLUS_PROTOCOL.resultChannel, (event) => {
      const data = unwrapBroadcastPayload<DicePlusRollResultEnvelope>(event.data);
      if (!data?.rollId) return;
      resolvePending({
        success: true,
        rollId: data.rollId,
        result: data.result,
      });
    });

    const unsubError = OBR.broadcast.onMessage(DICE_PLUS_PROTOCOL.errorChannel, (event) => {
      const data = unwrapBroadcastPayload<DicePlusRollErrorEnvelope>(event.data);
      if (!data?.rollId) return;
      resolvePending({
        success: false,
        rollId: data.rollId,
        error: data.error || data.message || "Dice+ retornou erro",
      });
    });

    try {
      for (let index = 0; index < sequence.steps.length; index += 1) {
        const step = sequence.steps[index];
        const rollId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const payload = this.createRollRequestPayload(sequence.actionName, step, playerId, playerName, rollId);

        const stepResult = await new Promise<StepRollResult>((resolve) => {
          const timeoutId = setTimeout(() => {
            resolvePending({
              success: false,
              rollId,
              error: "Timeout aguardando resultado do Dice+",
            });
          }, DICE_PLUS_PROTOCOL.stepTimeoutMs);

          pendingRolls.set(rollId, { resolve, timeoutId });
          OBR.broadcast.sendMessage(DICE_PLUS_PROTOCOL.rollChannel, payload, {
            destination: "ALL",
          });
        });

        stepResults.push(stepResult);

        if (!stepResult.success) {
          return {
            success: false,
            transactionId,
            error: stepResult.error,
            stepResults,
          };
        }

        if (index < sequence.steps.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DICE_PLUS_PROTOCOL.settleDelayMs));
        }
      }
    } finally {
      unsubResult();
      unsubError();
      for (const pending of pendingRolls.values()) {
        clearTimeout(pending.timeoutId);
      }
      pendingRolls.clear();
    }

    return {
      success: true,
      transactionId,
      stepResults,
    };
  }
}
