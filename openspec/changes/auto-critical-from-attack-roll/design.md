## Context

Hoje o popover transforma a ação inteira com `SystemPack.applyVariant` antes de chamar `DicePlusAdapter.roll`. “CRITICAL” é uma variante escolhida pelo usuário, os metadados `execute` e `criticalBehavior` não são preservados em `ResolvedRollStep`, e o adaptador envia todos os passos sem considerar resultados anteriores.

A investigação em uma sala real mostrou que o Dice+ publica em `dice-plus/roll-result` um payload correlacionável por `rollId`. Em `result.groups[].dice[]`, cada dado informa `diceType`, `value` e `kept`, além de `totalValue` e `rollSummary`. O adaptador escuta hoje `quick-actions-toolbar/roll-result`, ignora o payload e, após quatro segundos, converte ausência de resposta em sucesso. O resultado observado confirma que a detecção não precisa analisar texto nem inferir o natural a partir do total.

## Goals / Non-Goals

**Goals:**

- Detectar o crítico padrão de D&D 2024 por um d20 mantido com valor natural 20.
- Funcionar corretamente com rolagem normal, vantagem e desvantagem.
- Resolver dano somente após conhecer o resultado do ataque que o precede.
- Manter regras de D&D fora do adaptador Dice+, que deve permanecer responsável apenas pelo transporte.
- Aplicar as condições de execução já persistidas e tratar timeout/erro como falha real.

**Non-Goals:**

- Determinar acerto comum contra Classe de Armadura; sem CA, `ON_HIT` continuará executando após uma rolagem de ataque bem-sucedida.
- Implementar faixas de crítico expandidas por classe, arma ou efeito; o limiar inicial é 20 natural.
- Interpretar `rollSummary`, alterar o protocolo do Dice+ ou persistir resultados de rolagem.
- Alterar o schema persistido de ações.

## Decisions

1. **Adicionar tipos locais para o resultado observado do Dice+.** O protocolo modelará o envelope de `dice-plus/roll-result`, grupos e dados necessários (`rollId`, `diceType`, `value`, `kept`), permitindo campos adicionais do Dice+ sem depender de `any`. A correlação será sempre pelo `rollId` gerado na requisição.

2. **Separar transporte, regra e orquestração.** `DicePlusAdapter` enviará/aguardará uma rolagem individual e devolverá resultado estruturado. O System Pack classificará resultados e transformará expressões. Um executor de ação coordenará passos e manterá um contexto transitório do ataque mais recente:

   ```text
   ActionExecutor
      ├─ SystemPack: resolve expressão/classifica crítico
      └─ DiceAdapter: envia passo/retorna dados
   ```

   Colocar a detecção diretamente no adaptador foi rejeitado porque acoplaria Dice+ às regras de D&D. Manter toda a sequência pré-resolvida foi rejeitado porque o dano depende de informação ainda inexistente.

3. **Usar somente o d20 efetivamente mantido.** Para um resultado de passo `ATTACK`, crítico será verdadeiro quando existir dado com `diceType === "d20"`, `kept === true` e `value === 20`. `totalValue`, `rollSummary`, dados descartados e flags de vantagem/desvantagem não participarão da decisão. Isso cobre vantagem e desvantagem pelo próprio resultado final de keep/drop do Dice+.

4. **Preservar semântica de passo na forma resolvida.** `ResolvedRollStep` carregará `execute` e `criticalBehavior`. O executor atualizará o contexto a cada passo `ATTACK`; passos seguintes usarão o ataque mais recente. `ALWAYS` executa sempre, `ON_CRITICAL` somente com crítico e `ON_HIT` executa após ataque concluído, pois CA continua fora do escopo. Se não houver ataque anterior, condições dependentes de ataque não executam.

5. **Aplicar crítico no momento de resolver o dano.** Quando o contexto indicar crítico e o passo `DAMAGE` tiver `criticalBehavior === "DOUBLE_DICE"`, o System Pack duplicará todos os termos de dados da AST e manterá modificadores fixos uma vez. `NONE` preservará a expressão. “CRITICAL” deixa de ser uma opção retornada por `getAvailableVariants`; Normal, Vantagem e Desvantagem continuam como modos de ataque.

6. **Falhar explicitamente em timeout ou erro.** O adaptador escutará `dice-plus/roll-result` e `dice-plus/roll-error`; timeout removerá listeners e retornará falha. O executor interromperá passos restantes quando `stopOnError` for verdadeiro. O resultado geral não poderá indicar sucesso se uma resposta obrigatória não chegou.

## Risks / Trade-offs

- **[O Dice+ pode alterar o payload sem versionamento]** → validar defensivamente os campos necessários e cobrir o payload real capturado com testes de contrato.
- **[Uma sequência com vários ataques pode ser ambígua]** → cada ataque substitui o contexto transitório; condições seguintes referem-se ao ataque mais recente.
- **[ON_HIT ainda não representa acerto real]** → documentar a compatibilidade atual e deixar CA/seleção de alvo para mudança futura.
- **[Remover o crítico manual elimina um fallback]** → falhas de resultado serão exibidas como falha, não convertidas silenciosamente em dano normal ou crítico manual.
- **[Resposta broadcast pode ser observada por vários frames]** → aceitar apenas o canal esperado e `rollId` pendente, limpar listeners imediatamente e não persistir payloads.
