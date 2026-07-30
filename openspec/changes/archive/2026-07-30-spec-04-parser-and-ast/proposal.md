## Why

Construir o motor de parsing de expressões de dados de RPG com Tokenizer, Parser Descendente Recursivo, representação em Árvore Sintática Abstrata (AST), substituição de variáveis e serializador compatível com a notação estendida do Dice+ (incluindo Keep/Drop `kh`/`kl`/`dh`/`dl`, Min/Max `min`/`max`, Exploding `!`, Re-Roll `r`, Dice Model `{model}` e Labels `# label`).

## What Changes

- Módulo Tokenizer / Lexer em `src/core/parser/tokens.ts` (suporte a notação de dados `NdX`, `kh`/`kl`/`dh`/`dl`, `min`/`max`, `!`, `r`, números, variáveis `{{var}}`, operadores `+`, `-`, `*`, `()`, modelo `{model}` e rótulos `# label`).
- Definição expandida dos nós da AST em `src/core/parser/ast.ts`.
- Parser Descendente Recursivo em `src/core/parser/parser.ts` respeitando a ordem de precedência matemática, agrupamento e notação de rótulos.
- Resolvedor de variáveis em `src/core/parser/resolver.ts` substituindo variáveis por valores do perfil.
- Serializador de AST em `src/core/parser/serializer.ts` convertendo a árvore manipulada de volta para Notação de Dados compatível 100% com o Dice+.
- Sistema de tratamento de erros com posições exatas (`ParseError`).

## Capabilities

### New Capabilities
- `parser-and-ast`: Lexer, Parser Descendente Recursivo, manipulação de AST, resolução de variáveis e serializador para expressões de dados RPG compatíveis com a especificação Dice+.

### Modified Capabilities
<!-- Nenhuma modificação em capabilities anteriores -->

## Impact

- **Core Module:** Novos arquivos sob `src/core/parser/`.
- **Testes:** Bateria de testes unitários em `tests/parser.test.ts` cobrindo expressões simples, complexas (Keep/Drop/Min/Max/Explode/Reroll), modelo de dados, rótulos `#`, variáveis e tratamento de erros de sintaxe.
