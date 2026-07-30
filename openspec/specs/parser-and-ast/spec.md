## ADDED Requirements

### Requirement: Expression Tokenizer (Lexer)
The extension SHALL parse raw roll expressions (e.g. `2d20kh1 + {{strength}} # Attack`) into typed tokens (`DICE`, `NUMBER`, `VARIABLE`, `PLUS`, `MINUS`, `MULTIPLY`, `KEEP_HIGHEST`, `KEEP_LOWEST`, `DROP_HIGHEST`, `DROP_LOWEST`, `MIN`, `MAX`, `EXPLODE`, `REROLL`, `DICE_MODEL`, `LABEL`, `LPAREN`, `RPAREN`, `EOF`) with character index tracking.

#### Scenario: Tokenizing complex expression with Dice+ modifiers
- **WHEN** tokenizing `2d20dl1{Red} + {{strength}} # Fire damage`
- **THEN** it outputs tokens for dice `2d20`, modifier `dl1`, model `{Red}`, plus `+`, variable `{{strength}}`, and label `# Fire damage`

### Requirement: Recursive Descent AST Parser
The extension SHALL construct an Abstract Syntax Tree (AST) enforcing operator precedence:
1. Parentheses, Variables, and Labels (`# Label`)
2. Dice notation and modifiers (`NdX`, `kh`/`kl`/`dh`/`dl`, `min`/`max`, `!`, `r`, `{model}`)
3. Multiplication (`*`)
4. Addition (`+`) and Subtraction (`-`)

#### Scenario: Building AST with Dice+ modifiers and labels
- **WHEN** parsing `4d6dl1{Fire} + 2 * 3 # Ability Score`
- **THEN** the AST preserves dice model `{Fire}`, drop modifier `dl1`, multiplication `2 * 3`, and attached label `# Ability Score`

### Requirement: Variable Resolution on AST
The extension SHALL traverse the AST and replace `VariableNode` instances with numeric values provided in a `Record<string, number>`.

#### Scenario: Resolving existing and missing variables
- **WHEN** resolving `{{strength}}` with `{ strength: 4 }`
- **THEN** it transforms the node into `{ type: "NUMBER", value: 4 }`. If missing, it throws a descriptive error.

### Requirement: AST Serializer to Dice+ Compatible String
The extension SHALL serialize an AST back into standard dice notation text compatible with Dice+ roller extension.

#### Scenario: Serializing modified AST with Keep/Drop and Labels
- **WHEN** serializing a `DiceNode` with `count: 2`, `sides: 20`, `keep: { mode: "HIGHEST", count: 1 }` and `label: "Ataque com Vantagem"`
- **THEN** it returns `"2d20kh1 # Ataque com Vantagem"`

### Requirement: Syntax Error Handling
The extension SHALL throw structured `ParseError` exceptions containing error message, character position, and unexpected token when parsing invalid syntax.

#### Scenario: Parsing invalid syntax
- **WHEN** parsing `1d20 + + 5`
- **THEN** it throws a `ParseError` indicating position and unexpected token
