import OBR from "@owlbear-rodeo/sdk";
import { ResolvedRollSequence, ResolvedRollStep } from "../../systems/types";
import {
  DICE_PLUS_PROTOCOL,
  DicePlusReadyResponse,
  DicePlusRollRequestPayload,
} from "./protocol";

export interface RollDispatchResult {
  success: boolean;
  transactionId: string;
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

      // Enviar mensagem no canal dice-plus/isReady para TODOS os iFrames da sala
      OBR.broadcast.sendMessage(
        DICE_PLUS_PROTOCOL.readyChannel,
        {
          requestId,
          timestamp: Date.now(),
        },
        { destination: "ALL" }
      );

      // Timeout caso o Dice+ não responda
      setTimeout(() => {
        if (!responded) {
          unsubscribe();
          resolve(false);
        }
      }, DICE_PLUS_PROTOCOL.timeoutMs);
    });
  }

  /**
   * Executa a rolagem de um único passo da sequência de forma assíncrona,
   * aguardando o fim da animação/resultado enviado pelo Dice+.
   */
  private async rollStep(
    actionName: string,
    step: ResolvedRollStep,
    playerId: string,
    playerName: string
  ): Promise<boolean> {
    const stepRollId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const cleanAction = actionName.replace(/[+\-*/]/g, " ").trim();
    const cleanLabel = step.label.replace(/[+\-*/]/g, " ").trim();
    const cleanExpression = step.resolvedExpression.replace(/\s+/g, "");

    // Usamos dois pontos (:) como separador seguro para nao conter operadores matematicos (+, -, *, /)
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
        `${DICE_PLUS_PROTOCOL.source}/roll-result`,
        (event) => {
          const data = event.data as any;
          if (data && data.rollId === stepRollId) {
            cleanup();
            resolve(true);
          }
        }
      );

      const unsubError = OBR.broadcast.onMessage(
        `${DICE_PLUS_PROTOCOL.source}/roll-error`,
        (event) => {
          const data = event.data as any;
          if (data && data.rollId === stepRollId) {
            cleanup();
            resolve(false);
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

      // Enviar solicitação para o Dice+
      OBR.broadcast.sendMessage(
        DICE_PLUS_PROTOCOL.rollChannel,
        requestPayload,
        { destination: "ALL" }
      );

      // Timeout de segurança de 4 segundos caso o Dice+ não notifique a conclusão
      setTimeout(() => {
        if (!finished) {
          cleanup();
          resolve(true);
        }
      }, 4000);
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
      };
    }

    const transactionId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const playerId = OBR.player.id;
    const playerName = await OBR.player.getName();

    // Executa cada passo da sequência de forma enfileirada e sequencial
    for (let i = 0; i < sequence.steps.length; i++) {
      const step = sequence.steps[i];
      await this.rollStep(sequence.actionName, step, playerId, playerName);

      // Intervalo de 500ms entre passos para fluidez na animação do Dice+
      if (i < sequence.steps.length - 1) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }

    return {
      success: true,
      transactionId,
    };
  }
}
