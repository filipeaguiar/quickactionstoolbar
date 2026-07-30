## Context

O System Pack `dnd5e-2024` é o módulo de regras que traduz intenções de jogo (Vantagem, Desvantagem, Crítico) em modificações sintáticas na expressão dos dados através de manipulação da AST construída pelo Parser (Spec 04).

## Goals / Non-Goals

**Goals:**
- Implementar interface genérica `SystemPack` para expansão futura de novos sistemas (PF2e, CoC, etc).
- Implementar `DnD2024SystemPack` com transformações imutáveis sobre AST (`applyAdvantageToAST`, `applyDisadvantageToAST`, `applyCriticalToAST`).
- Permitir substituição/resolução de variáveis dinâmicas do perfil antes da serialização final.
- Garantir 100% de cobertura com testes unitários para todas as transformações de AST.

**Non-Goals:**
- Integração direta com a API broadcast do OBR (responsabilidade da Spec 06 Adapter).
- Interface visual de seleção de variante (responsabilidade do Popover UI).

## Decisions

- **Decisão 1: Manipulação Imutável de AST**: As funções de transformação retornam novas cópias de nós sem alterar a AST original.
- **Decisão 2: Filtragem por StepPurpose**: As transformações de Vantagem/Desvantagem afetam apenas passos com `purpose` em `ATTACK`, `CHECK` ou `SAVE`. Transformações de Crítico afetam apenas `DAMAGE`.
- **Decisão 3: Preservação de Modificadores Planos em Críticos**: No crítico, apenas `DiceNode.count` é multiplicado por 2. `NumberNode` e variáveis numéricas resolvidas permanecem inalteradas, respeitando a regra do D&D 5e/2024.

## Risks / Trade-offs

- **[Risco]** Expressões complexas agrupadas em `GROUP` (`(1d20 + 2)`).
  - *Mitigação*: Os leitores de AST percorrem recursivamente os nós `GROUP` e `BINARY_OP`.
