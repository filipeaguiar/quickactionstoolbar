import OBR from "@owlbear-rodeo/sdk";
import { ResolvedRollSequence } from "../../systems/types";
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

    // Formata cada passo sem espaços internos nos operadores de math para a notação do Dice+
    // Exemplo: "1d20+4+3 # Ataque + 1d12+4 # Dano"
    const combinedNotation = sequence.steps
      .map((step) => `${step.resolvedExpression.replace(/\s+/g, "")} # ${step.label}`)
      .join(" + ");

    const requestPayload: DicePlusRollRequestPayload = {
      rollId: transactionId,
      playerId,
      playerName,
      rollTarget: "everyone",
      diceNotation: combinedNotation,
      showResults: true,
      timestamp: Date.now(),
      source: DICE_PLUS_PROTOCOL.source,
    };

    // OBRIGATÓRIO: { destination: "ALL" } para transitar a mensagem entre iFrames de extensões no Owlbear Rodeo
    await OBR.broadcast.sendMessage(
      DICE_PLUS_PROTOCOL.rollChannel,
      requestPayload,
      { destination: "ALL" }
    );

    return {
      success: true,
      transactionId,
    };
  }
}
