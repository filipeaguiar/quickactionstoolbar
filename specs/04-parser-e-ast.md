# Especificação Técnica 04 — Motor de Expressões de Rolagem e AST

**Componentes:** Tokenizer, Parser Descendente Recursivo, AST & Resolver de Variáveis  
**Arquivos de Referência:** `SRD.md` (Seções 9, 11)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação define o motor de rolagens de dados da extensão. Expressões como `1d20 + {{proficiency}} + {{strength}}` ou `2d6 + 4` são convertidas em uma Árvore Sintática Abstrata (AST). As transformações de regras (como vantagem, desvantagem e acerto crítico) são aplicadas diretamente sobre os nós da AST, e não por substituição textual via expressões regulares.

---

## 2. Definidor de Tokens (Tokenizer / Lexer)

O lexer transforma a string da expressão em uma lista de tokens tipados.

### 2.1 Tipos de Tokens (`src/core/parser/tokens.ts`)
```typescript
export type TokenType =
  | "DICE"         // ex: 1d20, 2d6, 1d12
  | "NUMBER"       // ex: 5, 10
  | "VARIABLE"     // ex: {{strength}}, {{proficiency}}
  | "PLUS"         // +
  | "MINUS"        // -
  | "MULTIPLY"     // *
  | "KEEP_HIGHEST" // kh1, kh2
  | "KEEP_LOWEST"  // kl1, kl2
  | "LPAREN"       // (
  | "RPAREN"       // )
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}
```

---

## 3. Árvore Sintática Abstrata (AST)

### 3.1 Definição dos Nós da AST (`src/core/parser/ast.ts`)
```typescript
export type ASTNode =
  | DiceNode
  | NumberNode
  | VariableNode
  | BinaryOperationNode
  | GroupNode;

export interface DiceNode {
  type: "DICE";
  count: number;
  sides: number;
  keep?: {
    mode: "HIGHEST" | "LOWEST";
    count: number;
  };
}

export interface NumberNode {
  type: "NUMBER";
  value: number;
}

export interface VariableNode {
  type: "VARIABLE";
  name: string;
}

export interface BinaryOperationNode {
  type: "BINARY_OP";
  operator: "+" | "-" | "*";
  left: ASTNode;
  right: ASTNode;
}

export interface GroupNode {
  type: "GROUP";
  expression: ASTNode;
}
```

---

## 4. Parser Descendente Recursivo (`src/core/parser/parser.ts`)

O parser consome a sequência de tokens e produz a AST respeitando a precedência dos operadores matemáticos:
1. Parênteses `( ... )` e Variáveis `{{var}}`
2. Dados `NdXkhY` / `NdXklY`
3. Multiplicação `*`
4. Adição `+` e Subtração `-`

### 4.1 Exemplo de Parse de Expressão Complexa:
Expressão: `1d20 + {{strength}} + 2`

AST Resultante:
```json
{
  "type": "BINARY_OP",
  "operator": "+",
  "left": {
    "type": "BINARY_OP",
    "operator": "+",
    "left": {
      "type": "DICE",
      "count": 1,
      "sides": 20
    },
    "right": {
      "type": "VARIABLE",
      "name": "strength"
    }
  },
  "right": {
    "type": "NUMBER",
    "value": 2
  }
}
```

---

## 5. Resolução de Variáveis

O resolvedor de variáveis percorre a AST e substitui todos os nós `VariableNode` pelo valor numérico correspondente encontrado no dicionário `variables` do `CharacterActionProfile`.

```typescript
export function resolveVariables(
  node: ASTNode,
  variables: Record<string, number>
): ASTNode {
  switch (node.type) {
    case "VARIABLE": {
      const val = variables[node.name];
      if (val === undefined) {
        throw new Error(`Variável '{{${node.name}}}' não definida no perfil do personagem.`);
      }
      return { type: "NUMBER", value: val };
    }
    case "BINARY_OP":
      return {
        ...node,
        left: resolveVariables(node.left, variables),
        right: resolveVariables(node.right, variables),
      };
    case "GROUP":
      return {
        ...node,
        expression: resolveVariables(node.expression, variables),
      };
    default:
      return node;
  }
}
```

---

## 6. Serializador de AST para Texto (`src/core/parser/serializer.ts`)

Converte a AST transformada de volta para uma string formatada em notação padrão de rolagens de dados (ex: aceita pelo Dice+):

```typescript
export function serializeAST(node: ASTNode): string {
  switch (node.type) {
    case "DICE": {
      let result = `${node.count}d${node.sides}`;
      if (node.keep) {
        const suffix = node.keep.mode === "HIGHEST" ? "kh" : "kl";
        result += `${suffix}${node.keep.count}`;
      }
      return result;
    }
    case "NUMBER":
      return node.value.toString();
    case "VARIABLE":
      return `{{${node.name}}}`;
    case "BINARY_OP":
      return `${serializeAST(node.left)} ${node.operator} ${serializeAST(node.right)}`;
    case "GROUP":
      return `(${serializeAST(node.expression)})`;
  }
}
```

---

## 7. Tratamento de Erros de Parse

Em caso de sintaxe inválida (ex: `1d20 + + 5` ou `{{var_sem_fechar`), o parser deve lançar uma exceção estruturada contendo:
- `message`: Descrição legível do erro.
- `position`: Posição do caractere na string original.
- `token`: Token problemático retornado pelo lexer.
