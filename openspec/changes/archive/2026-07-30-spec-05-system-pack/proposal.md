## Why

Para dar suporte a regras completas de sistemas de RPG (como D&D 2024 / 5e 2024), a extensão precisa transformar rolagens de acordo com variantes da ação (Vantagem, Desvantagem, Crítico e Ataque Imprudente). O System Pack `dnd5e-2024` intercepta os `RollStep` de uma ação e aplica modificações diretas na AST da notação de dados.

## What Changes

- Implementação do módulo `src/systems/dnd2024.ts` e interfaces em `src/systems/types.ts`.
- Suporte a variações `ADVANTAGE` (converte `1d20` em `2d20kh1` em passos de ataque/teste/resistência).
- Suporte a variações `DISADVANTAGE` (converte `1d20` em `2d20kl1` em passos de ataque/teste/resistência).
- Suporte a variação `CRITICAL` (dobra quantidade de dados de dano mantendo modificadores planos inalterados em passos de dano).
- Suporte a variantes customizadas (ex: Ataque Imprudente / Reckless Attack).
- Registro do System Pack no `SystemPackManager` para resolução dinâmica de ações.

## Capabilities

### New Capabilities

- `system-pack-dnd2024`: Módulo System Pack para regras de D&D 2024 com transformações de AST para Vantagem, Desvantagem e Crítico.

### Modified Capabilities

(nenhuma)

## Impact

- `src/systems/types.ts`: Definição das interfaces `SystemPack`, `ActionVariant`, `ResolvedRollSequence`.
- `src/systems/dnd2024.ts`: Implementação das regras do D&D 2024 e transformadores de AST.
- Integrado com o Parser (`src/core/parser/ast.ts` e `src/core/parser/serializer.ts`).
