# Especificação Técnica 05 — System Pack: D&D 2024

**Componente:** Core System Pack (`dnd5e-2024`)  
**Arquivos de Referência:** `SRD.md` (Seção 10)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação detalha o módulo de regras específico para **Dungeons & Dragons 2024** (`dnd5e-2024`). O System Pack é responsável por analisar os `RollStep` de uma ação e aplicar transformações na Árvore Sintática Abstrata (AST) para manipular rolagens normais, com Vantagem, com Desvantagem, Acertos Críticos e Variantes Customizadas (ex: Ataque Imprudente).

---

## 2. Interface de Um System Pack (`src/systems/types.ts`)

```typescript
export interface SystemPack {
  id: string;
  name: string;
  getAvailableVariants(action: ActionDefinition): ActionVariant[];
  applyVariant(
    action: ActionDefinition,
    variantId: string,
    variables: Record<string, number>
  ): ResolvedRollSequence;
  validateAction(action: ActionDefinition): ValidationResult;
}

export interface ActionVariant {
  id: "NORMAL" | "ADVANTAGE" | "DISADVANTAGE" | "CRITICAL" | string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ResolvedRollSequence {
  actionName: string;
  variantId: string;
  steps: Array<{
    id: string;
    label: string;
    purpose: StepPurpose;
    rawExpression: string;
    resolvedExpression: string;
    visibility: "PUBLIC" | "PRIVATE";
  }>;
}
```

---

## 3. Transformações de Regras em D&D 2024

Todas as transformações operam sobre a AST gerada pelo parser.

### 3.1 Vantagem (`ADVANTAGE`)
- **Regra:** Em passos com `purpose` igual a `"ATTACK"`, `"CHECK"` ou `"SAVE"`, localiza-se o primeiro `DiceNode` que represente o dado d20 (isto é, `count: 1` e `sides: 20`).
- **Transformação na AST:**
  - `count` altera-se de `1` para `2`.
  - Adiciona-se a propriedade `keep: { mode: "HIGHEST", count: 1 }`.
  - O resultado serializado converte `1d20 + MOD` em `2d20kh1 + MOD`.
  - Dados de dano ou outros componentes da expressão não são alterados.

```typescript
export function applyAdvantageToAST(node: ASTNode, targetPurpose: StepPurpose, currentPurpose: StepPurpose): ASTNode {
  if (currentPurpose !== targetPurpose) return node;

  switch (node.type) {
    case "DICE":
      if (node.sides === 20 && node.count === 1) {
        return {
          ...node,
          count: 2,
          keep: { mode: "HIGHEST", count: 1 },
        };
      }
      return node;
    case "BINARY_OP":
      return {
        ...node,
        left: applyAdvantageToAST(node.left, targetPurpose, currentPurpose),
        right: applyAdvantageToAST(node.right, targetPurpose, currentPurpose),
      };
    case "GROUP":
      return {
        ...node,
        expression: applyAdvantageToAST(node.expression, targetPurpose, currentPurpose),
      };
    default:
      return node;
  }
}
```

### 3.2 Desvantagem (`DISADVANTAGE`)
- **Regra:** Idêntica à vantagem, porém o modo de retenção é configurado como `LOWEST`:
  - `count` altera-se de `1` para `2`.
  - `keep: { mode: "LOWEST", count: 1 }`.
  - O resultado serializado converte `1d20 + MOD` em `2d20kl1 + MOD`.

### 3.3 Acerto Crítico (`CRITICAL`)
- **Regra:** Em passos de dano (`purpose === "DAMAGE"`) e que possuam `criticalBehavior === "DOUBLE_DICE"`, duplica-se a quantidade de dados de todas as rolagens de dano na AST. Os modificadores fixos não são duplicados.
- **Transformação na AST:**
  - Para cada `DiceNode`, o campo `count` é multiplicado por 2 (ex: `1d12` vira `2d12`, `2d6` vira `4d6`).
  - Para cada `NumberNode` (modificador fixo, ex: `+ 3`), o valor permanece inalterado.
  - Exemplo: `1d12 + 1d6 + 3` torna-se `2d12 + 2d6 + 3`.

```typescript
export function applyCriticalToAST(node: ASTNode): ASTNode {
  switch (node.type) {
    case "DICE":
      return {
        ...node,
        count: node.count * 2,
      };
    case "BINARY_OP":
      return {
        ...node,
        left: applyCriticalToAST(node.left),
        right: applyCriticalToAST(node.right),
      };
    case "GROUP":
      return {
        ...node,
        expression: applyCriticalToAST(node.expression),
      };
    default:
      return node; // NumberNodes mantidos inalterados
  }
}
```

---

## 4. Variantes Customizadas (ex: Ataque Imprudente / Reckless Attack)

O System Pack de D&D 2024 permite configurar transformações compostas.

Exemplo de Ataque Imprudente:
- Aplica **Vantagem** exclusivamente no `RollStep` de Ataque (`purpose: "ATTACK"`).
- Mantém a rolagem de Dano normal (`purpose: "DAMAGE"`).
- Adiciona nota explicativa na interface do Popover.
