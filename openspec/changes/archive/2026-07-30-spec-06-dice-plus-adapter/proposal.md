## Why

A Quick Actions Toolbar precisa enviar sequências de rolagens resolvidas para a extensão de dados 3D Dice+ no Owlbear Rodeo. O `DicePlusAdapter` isola toda a comunicação Broadcast API (`OBR.broadcast`), valida a disponibilidade da extensão (Handshake PING/PONG) e lida com mensagens de aviso em caso de ausência do Dice+.

## What Changes

- Definição do protocolo de comunicação Broadcast API (`src/integrations/dice-plus/protocol.ts`).
- Definição da interface genérica `DiceAdapter` (`src/integrations/dice-plus/adapter.ts`).
- Implementação de `DicePlusAdapter` com Handshake (`PING`/`PONG`) e tempo limite (3000ms).
- Tratamento de notificação ao usuário (`OBR.notification.show`) caso o Dice+ não responda.

## Capabilities

### New Capabilities

- `dice-plus-adapter`: Comunicação e envio de rolagens para a extensão Dice+ via Broadcast API no Owlbear Rodeo.

### Modified Capabilities

(nenhuma)

## Impact

- Novos arquivos em `src/integrations/dice-plus/`.
- Dependência de `@owlbear-rodeo/sdk` para `OBR.broadcast` e `OBR.notification`.
