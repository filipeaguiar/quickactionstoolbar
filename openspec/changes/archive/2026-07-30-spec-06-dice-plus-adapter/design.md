## Context

O Dice+ é uma extensão de terceiros para o Owlbear Rodeo que calcula e exibe rolagens em 3D. A comunicação ocorre por meio do `OBR.broadcast`. Para evitar acoplamento forte no restante da extensão, a Quick Actions Toolbar usará uma interface `DiceAdapter`.

## Goals / Non-Goals

**Goals:**
- Implementar o `DicePlusAdapter` isolado em `src/integrations/dice-plus/`.
- Garantir verificação de disponibilidade via PING/PONG com timeout gracioso.
- Notificar o usuário quando a extensão Dice+ não estiver instalada.

**Non-Goals:**
- Renderização visual 3D própria (o Dice+ é o único responsável pela renderização 3D).

## Decisions

- **Decisão 1: Interface DiceAdapter**: Permite mockar facilmente a comunicação nos testes unitários sem depender do SDK do Owlbear Rodeo rodando em um navegador real.
- **Decisão 2: Canal de Broadcast Dedicado**: Usar a constante de canal `com.owlbear-rodeo.dice-plus/broadcast` com versionamento no payload (`version: 1`).

## Risks / Trade-offs

- **[Risco]** Latência da resposta PING/PONG em redes lentas.
  - *Mitigação*: Timeout fixado em 3000ms.
