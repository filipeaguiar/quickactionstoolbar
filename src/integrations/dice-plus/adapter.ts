import OBR from "@owlbear-rodeo/sdk";
import { ResolvedRollSequence } from "../../systems/types";
import {
  DICE_PLUS_PROTOCOL,
  DicePlusHandshakeResponse,
  DicePlusRollRequest,
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
    return new Promise((resolve) => {
      let responded = false;

      const unsubscribe = OBR.broadcast.onMessage(
        DICE_PLUS_PROTOCOL.channel,
        (event) => {
          const payload = event.data as DicePlusHandshakeResponse;
          if (payload && payload.type === "PONG" && payload.status === "READY") {
            responded = true;
            unsubscribe();
            resolve(true);
          }
        }
      );

      // Enviar mensagem de handshake PING
      OBR.broadcast.sendMessage(DICE_PLUS_PROTOCOL.channel, {
        version: 1,
        type: "PING",
      });

      // Timeout caso o Dice+ não esteja instalado/habilitado
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

    const transactionId = crypto.randomUUID();
    const playerId = OBR.player.id;

    const requestPayload: DicePlusRollRequest = {
      version: 1,
      transactionId,
      senderId: playerId,
      rolls: sequence.steps.map((step) => ({
        label: `${sequence.actionName} - ${step.label}`,
        expression: step.resolvedExpression,
        visibility: step.visibility,
      })),
    };

    await OBR.broadcast.sendMessage(DICE_PLUS_PROTOCOL.channel, requestPayload);

    return {
      success: true,
      transactionId,
    };
  }
}
