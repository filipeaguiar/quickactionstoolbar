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

  private async rollStep(
    actionName: string,
    step: ResolvedRollStep,
    playerId: string,
    playerName: string
  ): Promise<StepRollResult> {
    const stepRollId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const cleanAction = actionName.replace(/[+\-*/]/g, " ").trim();
    const cleanLabel = step.label.replace(/[+\-*/]/g, " ").trim();
    const cleanExpression = step.resolvedExpression.replace(/\s+/g, "");
    const diceNotation = `${cleanExpression} # ${cleanAction}: ${cleanLabel}`;

    const requestPayload: DicePlusRollRequestPayload = {
      rollId: stepRollId,
      playerId,
      playerName,
      rollTarget: "everyone",
      diceNotation,
      showResults: true,
      timestamp: Date.now(),
      source: DICE_PLUS_PROTOCOL.source,
    };

    return new Promise((resolve) => {
      let finished = false;

      const unsubResult = OBR.broadcast.onMessage(
        DICE_PLUS_PROTOCOL.resultChannel,
        (event) => {
          const data = event.data as DicePlusRollResultEnvelope;
          if (data && data.rollId === stepRollId) {
            cleanup();
            resolve({
              success: true,
              rollId: stepRollId,
              result: data.result,
            });
          }
        }
      );

      const unsubError = OBR.broadcast.onMessage(
        DICE_PLUS_PROTOCOL.errorChannel,
        (event) => {
          const data = event.data as DicePlusRollErrorEnvelope;
          if (data && data.rollId === stepRollId) {
            cleanup();
            resolve({
              success: false,
              rollId: stepRollId,
              error: data.error || data.message || "Dice+ retornou erro",
            });
          }
        }
      );

      function cleanup() {
        if (!finished) {
          finished = true;
          unsubResult();
          unsubError();
        }
      }

      OBR.broadcast.sendMessage(DICE_PLUS_PROTOCOL.rollChannel, requestPayload, {
        destination: "ALL",
      });

      setTimeout(() => {
        if (!finished) {
          cleanup();
          resolve({
            success: false,
            rollId: stepRollId,
            error: "Timeout aguardando resultado do Dice+",
          });
        }
      }, DICE_PLUS_PROTOCOL.stepTimeoutMs);
    });
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

    for (let i = 0; i < sequence.steps.length; i++) {
      const step = sequence.steps[i];
      const stepResult = await this.rollStep(sequence.actionName, step, playerId, playerName);
      stepResults.push(stepResult);
      if (!stepResult.success) {
        return {
          success: false,
          transactionId,
          error: stepResult.error,
          stepResults,
        };
      }

      if (i < sequence.steps.length - 1) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    return {
      success: true,
      transactionId,
      stepResults,
    };
  }
}
