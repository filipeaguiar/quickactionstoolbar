# Especificação Técnica 06 — Integração com Dice+

**Componentes:** Adaptador `DiceAdapter`, Protocolo Broadcast API e Despachante de Sequência  
**Arquivos de Referência:** `SRD.md` (Seção 12)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação define a camada de integração entre a Quick Actions Toolbar e a extensão de dados 3D **Dice+**. A comunicação utiliza exclusivamente o Broadcast API do Owlbear Rodeo (`OBR.broadcast`). Toda a lógica do protocolo é isolada no `DicePlusAdapter` para evitar contaminação do Core da aplicação.

---

## 2. Abstração e Interface do Adapter (`src/integrations/dice-plus/adapter.ts`)

```typescript
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
```

---

## 3. Protocolo Broadcast API (`src/integrations/dice-plus/protocol.ts`)

O protocolo com o Dice+ utiliza um canal dedicado e versionado:

```typescript
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
```

---

## 4. Implementação do `DicePlusAdapter`

```typescript
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
    const requestPayload: DicePlusRollRequest = {
      version: 1,
      transactionId,
      senderId: OBR.player.id,
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
```

---

## 5. Tratamento de Erros e Notificações ao Usuário

1. **Dice+ Desabilitado / Não Instalado:**
   - Exibe notificação via `OBR.notification.show(..., "WARNING")`.
   - O editor e os popovers da Quick Actions continuam operacionais para inspeção de fórmulas e edição.
2. **Execução Sequencial:**
   - Caso o protocolo do Dice+ exija rolagens individuais passo a passo, o adapter iterará sobre `sequence.steps` com um pequeno delay configurável (ex: 200ms) entre mensagens para garantir exibição ordenada na mesa virtual.
