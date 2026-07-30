## Context

Em sistemas de RPG de mesa e no ecossistema do Owlbear Rodeo, a notação de rolagem do Dice+ estabelece o padrão de referência para dados 3D. O parser precisa suportar a notação estendida do Dice+ (incluindo `kh`/`kl`/`dh`/`dl`, `min`/`max`, `!`, `r`, `{model}` e `# labels`), garantindo equivalência exata entre o AST gerado e o que é esperado pelo canal Broadcast do Dice+.

## Goals / Non-Goals

**Goals:**
- Implementar Lexer/Tokenizer resiliente com rastreamento de posição de caracteres e suporte a todos os modificadores do Dice+.
- Implementar Parser Descendente Recursivo estrito garantindo precedência matemática e vinculação de rótulos (`# label`).
- Substituir variáveis dinamicamente sem usar regex frágeis.
- Serializar ASTs modificadas para notação 100% compatível com a extensão Dice+.

**Non-Goals:**
- Não executar a rolagem 3D diretamente neste módulo (a transmissão via Broadcast OBR para o Dice+ é tratada na Spec 06).

## Decisions

### Decisão 1: Suporte Nativo a Modificadores do Dice+ na AST
- **Opção Escolhida:** Modelar `DiceNode` na AST com campos opcionais para `keep` (`HIGHEST`/`LOWEST`), `drop` (`HIGHEST`/`LOWEST`), `min`, `max`, `explode`, `reroll`, `model` e `label`.
- **Razão:** Permite transformar e inspecionar nós de dados sem perder informações de contexto visual (como cor dos dados ou rótulos do Dice+).

### Decisão 2: Parser Descendente Recursivo Manual
- **Opção Escolhida:** Escrever o parser manualmente sem geradores automáticos de gramática (como PEG.js ou Nearley).
- **Razão:** Manter a extensão leve e com zero dependências externas no bundle, garantindo tratamento de erros preciso.
