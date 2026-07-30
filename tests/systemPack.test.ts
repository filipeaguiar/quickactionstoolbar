import { describe, it, expect } from "vitest";
import { parseExpression } from "../src/core/parser/parser";
import { serializeAST } from "../src/core/parser/serializer";
import { applyAdvantageToAST, applyDisadvantageToAST, applyCriticalToAST, DnD2024SystemPack } from "../src/systems/dnd2024";
import { ActionDefinition } from "../src/types/action";

describe("D&D 2024 System Pack AST Transformations", () => {
  it("should apply Advantage: 1d20 -> 2d20kh1", () => {
    const ast = parseExpression("1d20 + 3");
    const transformed = applyAdvantageToAST(ast, "ATTACK", "ATTACK");
    expect(serializeAST(transformed)).toBe("2d20kh1 + 3");
  });

  it("should not apply Advantage if it's not a d20", () => {
    const ast = parseExpression("1d8 + 3");
    const transformed = applyAdvantageToAST(ast, "ATTACK", "ATTACK");
    expect(serializeAST(transformed)).toBe("1d8 + 3");
  });

  it("should not apply Advantage if step purpose does not match", () => {
    const ast = parseExpression("1d20 + 3");
    const transformed = applyAdvantageToAST(ast, "ATTACK", "DAMAGE");
    expect(serializeAST(transformed)).toBe("1d20 + 3");
  });

  it("should apply Disadvantage: 1d20 -> 2d20kl1", () => {
    const ast = parseExpression("1d20 + 5");
    const transformed = applyDisadvantageToAST(ast, "SAVE", "SAVE");
    expect(serializeAST(transformed)).toBe("2d20kl1 + 5");
  });

  it("should apply Critical Hit: double the dice but preserve modifiers", () => {
    const ast = parseExpression("1d12 + 2d6 + 4");
    const transformed = applyCriticalToAST(ast, "DAMAGE", "DAMAGE");
    expect(serializeAST(transformed)).toBe("2d12 + 4d6 + 4");
  });

  describe("DnD2024SystemPack applyVariant", () => {
    const mockAction: ActionDefinition = {
      id: "action-1",
      name: "Longsword Attack",
      icon: "sword",
      kind: "ATTACK",
      enabled: true,
      sortOrder: 0,
      systemId: "dnd5e-2024",
      tags: [],
      variantPolicy: {
        allowNormal: true,
        allowAdvantage: true,
        allowDisadvantage: true,
        allowCritical: true,
        customVariants: [
          {
            id: "reckless",
            name: "Reckless Attack",
            transformations: [
              { type: "D20_ADVANTAGE", stepPurpose: "ATTACK" }
            ]
          }
        ]
      },
      sequence: {
        version: 1,
        stopOnError: true,
        steps: [
          {
            id: "step-1",
            label: "Attack Roll",
            purpose: "ATTACK",
            expression: "1d20 + {{str}} + {{prof}}",
            visibility: "PUBLIC",
            execute: "ALWAYS"
          },
          {
            id: "step-2",
            label: "Damage Roll",
            purpose: "DAMAGE",
            expression: "1d8 + {{str}}",
            visibility: "PUBLIC",
            execute: "ON_HIT",
            criticalBehavior: "DOUBLE_DICE"
          }
        ]
      }
    };

    const variables = { str: 4, prof: 3 };
    const systemPack = new DnD2024SystemPack();

    it("should resolve NORMAL variant", () => {
      const result = systemPack.applyVariant(mockAction, "NORMAL", variables);
      expect(result.steps[0].resolvedExpression).toBe("1d20 + 4 + 3");
      expect(result.steps[1].resolvedExpression).toBe("1d8 + 4");
    });

    it("should resolve ADVANTAGE variant", () => {
      const result = systemPack.applyVariant(mockAction, "ADVANTAGE", variables);
      // Advantage affects ATTACK step, not DAMAGE
      expect(result.steps[0].resolvedExpression).toBe("2d20kh1 + 4 + 3");
      expect(result.steps[1].resolvedExpression).toBe("1d8 + 4");
    });

    it("should resolve CRITICAL variant", () => {
      const result = systemPack.applyVariant(mockAction, "CRITICAL", variables);
      // Critical affects DAMAGE step, not ATTACK
      expect(result.steps[0].resolvedExpression).toBe("1d20 + 4 + 3");
      expect(result.steps[1].resolvedExpression).toBe("2d8 + 4");
    });

    it("should resolve custom variant (Reckless Attack)", () => {
      const result = systemPack.applyVariant(mockAction, "reckless", variables);
      // Reckless applies Advantage only to ATTACK
      expect(result.steps[0].resolvedExpression).toBe("2d20kh1 + 4 + 3");
      expect(result.steps[1].resolvedExpression).toBe("1d8 + 4");
    });
  });
});
