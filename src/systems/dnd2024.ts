import { ASTNode } from "../core/parser/ast";
import { parseExpression } from "../core/parser/parser";
import { serializeAST } from "../core/parser/serializer";
import { resolveVariables } from "../core/parser/resolver";
import { ActionDefinition, StepPurpose } from "../types/action";
import { SystemPack, ActionVariant, ResolvedRollSequence, ValidationResult } from "./types";

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
    if (action.variantPolicy.allowAdvantage) {
      variants.push({ id: "ADVANTAGE", name: "Vantagem" });
    }
    if (action.variantPolicy.allowDisadvantage) {
      variants.push({ id: "DISADVANTAGE", name: "Desvantagem" });
    }
    if (action.variantPolicy.allowCritical) {
      variants.push({ id: "CRITICAL", name: "Crítico" });
    }

    // Custom variants
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
    variables: Record<string, number>
  ): ResolvedRollSequence {
    const resolvedSteps = action.sequence.steps.map((step) => {
      let ast = parseExpression(step.expression);

      // We resolve variables first
      ast = resolveVariables(ast, variables);

      // If it's a base variant
      if (variantId === "ADVANTAGE" && ["ATTACK", "CHECK", "SAVE"].includes(step.purpose)) {
        ast = applyAdvantageToAST(ast, step.purpose, step.purpose);
      } else if (variantId === "DISADVANTAGE" && ["ATTACK", "CHECK", "SAVE"].includes(step.purpose)) {
        ast = applyDisadvantageToAST(ast, step.purpose, step.purpose);
      } else if (variantId === "CRITICAL" && step.purpose === "DAMAGE") {
        if (step.criticalBehavior !== "NONE") {
          ast = applyCriticalToAST(ast, step.purpose, step.purpose);
        }
      }

      // If it's a custom variant, we would parse transformations.
      // E.g., Reckless Attack (id: reckless_attack) might just apply D20_ADVANTAGE to ATTACK.
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
          // ADD_MODIFIER could be added if needed, but not strictly asked for in spec.
        }
      }

      return {
        id: step.id,
        label: step.label,
        purpose: step.purpose,
        rawExpression: step.expression,
        resolvedExpression: serializeAST(ast),
        visibility: step.visibility,
      };
    });

    return {
      actionName: action.name,
      variantId,
      steps: resolvedSteps,
    };
  }

  validateAction(action: ActionDefinition): ValidationResult {
    // Simple validation
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
