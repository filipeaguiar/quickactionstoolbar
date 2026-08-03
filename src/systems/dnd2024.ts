import { ASTNode } from "../core/parser/ast";
import { parseExpression } from "../core/parser/parser";
import { serializeAST } from "../core/parser/serializer";
import { resolveVariables } from "../core/parser/resolver";
import { ActionDefinition, StepPurpose } from "../types/action";
import {
  AttackClassification,
  ActionVariant,
  ResolvedRollSequence,
  RuntimeResolutionOptions,
  SystemPack,
  ValidationResult,
} from "./types";
import { DicePlusRollResultDetails } from "../integrations/dice-plus/protocol";

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

export function applyDisadvantageToAST(node: ASTNode, targetPurpose: StepPurpose, currentPurpose: StepPurpose): ASTNode {
  if (currentPurpose !== targetPurpose) return node;

  switch (node.type) {
    case "DICE":
      if (node.sides === 20 && node.count === 1) {
        return {
          ...node,
          count: 2,
          keep: { mode: "LOWEST", count: 1 },
        };
      }
      return node;
    case "BINARY_OP":
      return {
        ...node,
        left: applyDisadvantageToAST(node.left, targetPurpose, currentPurpose),
        right: applyDisadvantageToAST(node.right, targetPurpose, currentPurpose),
      };
    case "GROUP":
      return {
        ...node,
        expression: applyDisadvantageToAST(node.expression, targetPurpose, currentPurpose),
      };
    default:
      return node;
  }
}

export function applyCriticalToAST(node: ASTNode, targetPurpose: StepPurpose, currentPurpose: StepPurpose): ASTNode {
  if (currentPurpose !== targetPurpose) return node;

  switch (node.type) {
    case "DICE":
      return {
        ...node,
        count: node.count * 2,
      };
    case "BINARY_OP":
      return {
        ...node,
        left: applyCriticalToAST(node.left, targetPurpose, currentPurpose),
        right: applyCriticalToAST(node.right, targetPurpose, currentPurpose),
      };
    case "GROUP":
      return {
        ...node,
        expression: applyCriticalToAST(node.expression, targetPurpose, currentPurpose),
      };
    default:
      return node;
  }
}

export class DnD2024SystemPack implements SystemPack {
  id = "dnd5e-2024";
  name = "Dungeons & Dragons 2024";

  getAvailableVariants(action: ActionDefinition): ActionVariant[] {
    const variants: ActionVariant[] = [];

    if (action.variantPolicy.allowNormal) {
      variants.push({ id: "NORMAL", name: "Normal" });
    }
    const supportsD20Modes = action.sequence.steps.some((step) =>
      ["ATTACK", "CHECK", "SAVE"].includes(step.purpose)
    );
    if (action.variantPolicy.allowAdvantage && supportsD20Modes) {
      variants.push({ id: "ADVANTAGE", name: "Vantagem" });
    }
    if (action.variantPolicy.allowDisadvantage && supportsD20Modes) {
      variants.push({ id: "DISADVANTAGE", name: "Desvantagem" });
    }

    for (const custom of action.variantPolicy.customVariants) {
      variants.push({
        id: custom.id,
        name: custom.name,
        icon: custom.icon,
      });
    }

    return variants;
  }

  applyVariant(
    action: ActionDefinition,
    variantId: string,
    variables: Record<string, number>,
    options: RuntimeResolutionOptions = {}
  ): ResolvedRollSequence {
    const resolvedSteps = action.sequence.steps.map((step) => {
      let ast = parseExpression(step.expression);
      ast = resolveVariables(ast, variables);

      if (variantId === "ADVANTAGE" && ["ATTACK", "CHECK", "SAVE"].includes(step.purpose)) {
        ast = applyAdvantageToAST(ast, step.purpose, step.purpose);
      } else if (variantId === "DISADVANTAGE" && ["ATTACK", "CHECK", "SAVE"].includes(step.purpose)) {
        ast = applyDisadvantageToAST(ast, step.purpose, step.purpose);
      }

      const customVariant = action.variantPolicy.customVariants.find(v => v.id === variantId);
      if (customVariant) {
        for (const t of customVariant.transformations) {
          if (t.stepPurpose && t.stepPurpose !== step.purpose) continue;

          if (t.type === "D20_ADVANTAGE") {
            ast = applyAdvantageToAST(ast, step.purpose, step.purpose);
          } else if (t.type === "D20_DISADVANTAGE") {
            ast = applyDisadvantageToAST(ast, step.purpose, step.purpose);
          } else if (t.type === "DOUBLE_DICE") {
            ast = applyCriticalToAST(ast, step.purpose, step.purpose);
          }
        }
      }

      const shouldApplyCriticalDamage =
        options.isCritical === true &&
        step.purpose === "DAMAGE" &&
        step.criticalBehavior !== "NONE";

      if (shouldApplyCriticalDamage) {
        ast = applyCriticalToAST(ast, step.purpose, step.purpose);
      }

      return {
        id: step.id,
        label: step.label,
        purpose: step.purpose,
        rawExpression: step.expression,
        resolvedExpression: serializeAST(ast),
        visibility: step.visibility,
        execute: step.execute,
        criticalBehavior: step.criticalBehavior,
      };
    });

    return {
      actionName: action.name,
      variantId,
      steps: resolvedSteps,
    };
  }

  classifyAttackResult(result: DicePlusRollResultDetails): AttackClassification {
    const keptD20s = result.groups.flatMap((group) =>
      group.dice.filter((die) => die.diceType === "d20" && die.kept)
    );
    const isCritical = keptD20s.some((die) => die.value === 20);
    const isAutomaticMiss = keptD20s.some((die) => die.value === 1);

    return {
      isCritical,
      isAutomaticMiss,
      isHit: !isAutomaticMiss,
    };
  }

  validateAction(action: ActionDefinition): ValidationResult {
    const errors: string[] = [];
    if (!action.sequence || action.sequence.steps.length === 0) {
      errors.push("Action must have at least one step.");
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
