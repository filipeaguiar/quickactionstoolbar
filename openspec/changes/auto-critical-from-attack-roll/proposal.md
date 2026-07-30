## Why

O dano crítico é atualmente escolhido manualmente antes da rolagem, embora no D&D 2024 ele dependa do resultado natural do d20 de ataque. O Dice+ já retorna os dados individuais, incluindo `value` e `kept`, permitindo detectar corretamente um 20 natural inclusive com vantagem ou desvantagem.

## What Changes

- Receber resultados estruturados pelo canal real `dice-plus/roll-result`, correlacionados por `rollId`, em vez de considerar o timeout como sucesso.
- Executar sequências de ataque em fases: rolar o passo de ataque, classificar o d20 mantido e somente então resolver e rolar o dano.
- Detectar crítico quando o d20 efetivamente mantido tem valor natural 20; não usar o total com modificadores nem qualquer dado descartado.
- Aplicar `DOUBLE_DICE` automaticamente aos passos de dano quando o ataque for crítico, preservando modificadores fixos.
- Preservar e aplicar as condições `ALWAYS`, `ON_HIT` e `ON_CRITICAL` durante a execução.
- Remover “Acerto Crítico” das variantes selecionáveis; Normal, Vantagem e Desvantagem continuam sendo modos de rolagem, enquanto crítico passa a ser um resultado.
- Manter o comportamento atual de executar dano após ataques não críticos enquanto não houver Classe de Armadura disponível para determinar acerto ou erro.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `dice-plus-adapter`: receber, tipar, correlacionar e devolver o resultado detalhado de cada rolagem Dice+.
- `system-pack-dnd2024`: derivar crítico do d20 de ataque mantido e aplicar dano crítico automaticamente durante execução condicional.
- `extension-shell-ui`: apresentar apenas modos de ataque selecionáveis e não tratar crítico como variante manual.

## Impact

Afeta o protocolo e adaptador Dice+, os tipos de sequência resolvida, a orquestração entre passos, o System Pack D&D 2024, o popover de variantes e testes. Não altera o formato persistido das ações; os campos `execute` e `criticalBehavior` existentes passam a ter efeito em runtime.
