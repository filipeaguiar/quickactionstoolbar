import { describe, it, expect } from "vitest";
import { parseExpression } from "../src/core/parser/parser";
import { serializeAST } from "../src/core/parser/serializer";
import { applyAdvantageToAST, applyDisadvantageToAST, applyCriticalToAST, DnD2024SystemPack } from "../src/systems/dnd2024";
import { ActionDefinition } from "../src/types/action";
import { DicePlusRollResultDetails } from "../src/integrations/dice-plus/protocol";

describe("D&D 2024 System Pack AST Transformations", () => {
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
          transformations: [{ type: "D20_ADVANTAGE", stepPurpose: "ATTACK" }],
        },
      ],
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
          execute: "ALWAYS",
        },
        {
          id: "step-2",
          label: "Damage Roll",
          purpose: "DAMAGE",
          expression: "1d8 + {{str}}",
          visibility: "PUBLIC",
          execute: "ON_HIT",
          criticalBehavior: "DOUBLE_DICE",
        },
      ],
    },
  };

  const variables = { str: 4, prof: 3 };

  it("offers only normal mode when an action has no attack, check, or save", () => {
    const otherAction: ActionDefinition = {
      ...mockAction,
      id: "other-action",
      kind: "UTILITY",
      variantPolicy: { ...mockAction.variantPolicy, customVariants: [] },
      sequence: {
        ...mockAction.sequence,
        steps: [
          {
            id: "other-step",
            label: "Other",
            purpose: "OTHER",
            expression: "1d6",
            visibility: "PUBLIC",
            execute: "ALWAYS",
          },
        ],
      },
    };

    expect(new DnD2024SystemPack().getAvailableVariants(otherAction)).toEqual([
      { id: "NORMAL", name: "Normal" },
    ]);
  });

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


    it("should resolve custom variant (Reckless Attack)", () => {
      const result = systemPack.applyVariant(mockAction, "reckless", variables);
      expect(result.steps[0].resolvedExpression).toBe("2d20kh1 + 4 + 3");
      expect(result.steps[1].resolvedExpression).toBe("1d8 + 4");
    });

    it("should preserve execute and criticalBehavior metadata in resolved steps", () => {
      const result = systemPack.applyVariant(mockAction, "NORMAL", variables);
      expect(result.steps[0].execute).toBe("ALWAYS");
      expect(result.steps[1].execute).toBe("ON_HIT");
      expect(result.steps[1].criticalBehavior).toBe("DOUBLE_DICE");
    });

    it("should apply critical damage only when runtime outcome is critical", () => {
      const result = systemPack.applyVariant(mockAction, "NORMAL", variables, { isCritical: true });
      expect(result.steps[1].resolvedExpression).toBe("2d8 + 4");
    });

    it("should keep normal damage when runtime outcome is not critical", () => {
      const result = systemPack.applyVariant(mockAction, "NORMAL", variables, { isCritical: false });
      expect(result.steps[1].resolvedExpression).toBe("1d8 + 4");
    });

    it("should not expose CRITICAL as a selectable variant", () => {
      const variants = systemPack.getAvailableVariants(mockAction);
      expect(variants.map((variant) => variant.id)).not.toContain("CRITICAL");
    });
  });

  describe("DnD2024SystemPack classifyAttackResult", () => {
    const systemPack = new DnD2024SystemPack();

    function attackResult(dice: DicePlusRollResultDetails["groups"][number]["dice"], totalValue = 20): DicePlusRollResultDetails {
      return {
        rollId: "roll-1",
        totalValue,
        groups: [
          {
            description: "Attack",
            diceType: "d20",
            dice,
            total: totalValue,
          },
        ],
      };
    }

    it("should classify a kept natural 20 as critical", () => {
      const result = systemPack.classifyAttackResult(
        attackResult([{ diceId: "d1", rollId: "roll-1", diceType: "d20", value: 20, kept: true }], 27)
      );
      expect(result.isCritical).toBe(true);
    });

    it("should not classify a modified total without natural 20 as critical", () => {
      const result = systemPack.classifyAttackResult(
        attackResult([{ diceId: "d1", rollId: "roll-1", diceType: "d20", value: 19, kept: true }], 25)
      );
      expect(result.isCritical).toBe(false);
    });

    it("should ignore discarded natural 20 on disadvantage", () => {
      const result = systemPack.classifyAttackResult(
        attackResult([
          { diceId: "d1", rollId: "roll-1", diceType: "d20", value: 20, kept: false },
          { diceId: "d2", rollId: "roll-1", diceType: "d20", value: 8, kept: true },
        ], 8)
      );
      expect(result.isCritical).toBe(false);
    });

    it("should classify kept natural 20 with advantage as critical", () => {
      const result = systemPack.classifyAttackResult(
        attackResult([
          { diceId: "d1", rollId: "roll-1", diceType: "d20", value: 20, kept: true },
          { diceId: "d2", rollId: "roll-1", diceType: "d20", value: 4, kept: false },
        ], 20)
      );
      expect(result.isCritical).toBe(true);
    });

    it("should classify a kept natural 1 as an automatic miss", () => {
      const result = systemPack.classifyAttackResult(
        attackResult([{ diceId: "d1", rollId: "roll-1", diceType: "d20", value: 1, kept: true }], 8)
      );
      expect(result.isAutomaticMiss).toBe(true);
      expect(result.isHit).toBe(false);
      expect(result.isCritical).toBe(false);
    });

    it("should double legacy damage when criticalBehavior is omitted", () => {
      const legacyAction: ActionDefinition = {
        ...mockAction,
        sequence: {
          ...mockAction.sequence,
          steps: [
            mockAction.sequence.steps[0],
            {
              ...mockAction.sequence.steps[1],
              criticalBehavior: undefined,
            },
          ],
        },
      };
      const result = systemPack.applyVariant(legacyAction, "NORMAL", variables, { isCritical: true });
      expect(result.steps[1].resolvedExpression).toBe("2d8 + 4");
    });

    it("should preserve damage when criticalBehavior is NONE", () => {
      const action: ActionDefinition = {
        ...mockAction,
        sequence: {
          ...mockAction.sequence,
          steps: [
            mockAction.sequence.steps[0],
            {
              ...mockAction.sequence.steps[1],
              criticalBehavior: "NONE",
            },
          ],
        },
      };
      const result = systemPack.applyVariant(action, "NORMAL", variables, { isCritical: true });
      expect(result.steps[1].resolvedExpression).toBe("1d8 + 4");
    });
  });
});
