## 1. Tokenizer / Lexer Implementation (Dice+ Compatible)

- [x] 1.1 Implement Lexer in `src/core/parser/tokens.ts` supporting `DICE`, `NUMBER`, `VARIABLE`, `PLUS`, `MINUS`, `MULTIPLY`, `KEEP`/`DROP`, `MIN`/`MAX`, `EXPLODE`, `REROLL`, `DICE_MODEL`, `LABEL`, `LPAREN`, `RPAREN`
- [x] 1.2 Add unit tests for Lexer in `tests/parser.test.ts`

## 2. AST Nodes & Recursive Descent Parser

- [x] 2.1 Define complete AST Node interfaces in `src/core/parser/ast.ts`
- [x] 2.2 Implement Recursive Descent Parser in `src/core/parser/parser.ts` with error handling (`ParseError`)
- [x] 2.3 Add unit tests for Parser in `tests/parser.test.ts`

## 3. Variable Resolver & AST Serializer

- [x] 3.1 Implement Variable Resolver in `src/core/parser/resolver.ts`
- [x] 3.2 Implement AST Serializer in `src/core/parser/serializer.ts` (Dice+ notation output)
- [x] 3.3 Add unit tests for Variable Resolution and AST Serialization in `tests/parser.test.ts` and verify build (`npm run build`) and test suite (`npm test`)
