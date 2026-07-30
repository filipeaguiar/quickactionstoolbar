import { describe, expect, it, vi } from "vitest";
import { executeAction } from "../src/core/actionExecutor";
import { DnD2024SystemPack } from "../src/systems/dnd2024";
import { ActionDefinition } from "../src/types/action";
import { DiceAdapter, RollDispatchResult } from "../src/integrations/dice-plus/adapter";
import { DicePlusRollResultDetails } from "../src/integrations/dice-plus/protocol";

function attackResult(value: number, kept = true): DicePlusRollResultDetails {
  return {
    rollId: "roll-attack",
    totalValue: value,
    groups: [
      {
        description: "Attack",
        diceType: "d20",
        total: value,
        dice: [{ diceId: "d1", rollId: "roll-attack", diceType: "d20", value, kept }],
      },
    ],
  };
}

function successResult(result?: DicePlusRollResultDetails): RollDispatchResult {
  return {
    success: true,
    transactionId: "tx-1",
    stepResults: [{ success: true, rollId: result?.rollId ?? "roll-1", result }],
  };
}

const action: ActionDefinition = {
  id: "action-1",
  name: "Sword Attack",
  icon: "crossed-swords",
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
    customVariants: [],
  },
  sequence: {
    version: 1,
    stopOnError: true,
    steps: [
      {
        id: "attack",
        label: "Attack",
        purpose: "ATTACK",
        expression: "1d20 + {{str}}",
        visibility: "PUBLIC",
        execute: "ALWAYS",
      },
      {
        id: "damage",
        label: "Damage",
        purpose: "DAMAGE",
        expression: "1d8 + {{str}}",
        visibility: "PUBLIC",
        execute: "ON_HIT",
        criticalBehavior: "DOUBLE_DICE",
      },
      {
        id: "crit-bonus",
        label: "Crit Bonus",
        purpose: "DAMAGE",
        expression: "1d6",
        visibility: "PUBLIC",
        execute: "ON_CRITICAL",
        criticalBehavior: "NONE",
      },
    ],
  },
};

describe("executeAction", () => {
  it("executes normal attack damage and skips critical-only steps", async () => {
    const diceAdapter: DiceAdapter = {
      id: "test",
      isAvailable: vi.fn().mockResolvedValue(true),
      roll: vi
        .fn()
        .mockResolvedValueOnce(successResult(attackResult(19)))
        .mockResolvedValueOnce({
          success: true,
          transactionId: "tx-2",
          stepResults: [
            { success: true, rollId: "roll-damage", result: attackResult(8) },
          ],
        }) as any,
    };

    const result = await executeAction({
      action,
      variantId: "NORMAL",
      variables: { str: 4 },
      systemPack: new DnD2024SystemPack(),
      diceAdapter,
    });

    expect(result.success).toBe(true);
    expect(result.completedStepIds).toEqual(["attack", "damage"]);
    expect(result.skippedStepIds).toEqual(["crit-bonus"]);
    expect(vi.mocked(diceAdapter.roll).mock.calls[1][0].steps).toHaveLength(1);
    expect(vi.mocked(diceAdapter.roll).mock.calls[1][0].steps[0].resolvedExpression).toBe("1d8 + 4");
  });

  it("applies automatic critical damage and executes ON_CRITICAL steps", async () => {
    const diceAdapter: DiceAdapter = {
      id: "test",
      isAvailable: vi.fn().mockResolvedValue(true),
      roll: vi
        .fn()
        .mockResolvedValueOnce(successResult(attackResult(20)))
        .mockResolvedValueOnce({
          success: true,
          transactionId: "tx-2",
          stepResults: [
            { success: true, rollId: "roll-damage", result: attackResult(8) },
            { success: true, rollId: "roll-crit", result: attackResult(6) },
          ],
        }) as any,
    };

    const result = await executeAction({
      action,
      variantId: "ADVANTAGE",
      variables: { str: 4 },
      systemPack: new DnD2024SystemPack(),
      diceAdapter,
    });

    expect(result.success).toBe(true);
    expect(result.completedStepIds).toEqual(["attack", "damage", "crit-bonus"]);
    expect(vi.mocked(diceAdapter.roll).mock.calls[1][0].steps).toHaveLength(2);
    expect(vi.mocked(diceAdapter.roll).mock.calls[1][0].steps[0].resolvedExpression).toBe("2d8 + 4");
  });

  it("skips hit and critical damage after a kept natural 1", async () => {
    const diceAdapter: DiceAdapter = {
      id: "test",
      isAvailable: vi.fn().mockResolvedValue(true),
      roll: vi.fn().mockResolvedValueOnce(successResult(attackResult(1))) as any,
    };

    const result = await executeAction({
      action,
      variantId: "NORMAL",
      variables: { str: 4 },
      systemPack: new DnD2024SystemPack(),
      diceAdapter,
    });

    expect(result.success).toBe(true);
    expect(result.completedStepIds).toEqual(["attack"]);
    expect(result.skippedStepIds).toEqual(["damage", "crit-bonus"]);
    expect(diceAdapter.roll).toHaveBeenCalledTimes(1);
  });

  it("stops on Dice+ failure and returns accurate progress", async () => {
    const diceAdapter: DiceAdapter = {
      id: "test",
      isAvailable: vi.fn().mockResolvedValue(true),
      roll: vi
        .fn()
        .mockResolvedValueOnce(successResult(attackResult(19)))
        .mockResolvedValueOnce({
          success: false,
          transactionId: "tx-1",
          error: "timeout",
          stepResults: [{ success: false, rollId: "roll-damage", error: "timeout" }],
        }) as any,
    };

    const result = await executeAction({
      action,
      variantId: "NORMAL",
      variables: { str: 4 },
      systemPack: new DnD2024SystemPack(),
      diceAdapter,
    });

    expect(result.success).toBe(false);
    expect(result.completedStepIds).toEqual(["attack"]);
    expect(result.error).toBe("timeout");
  });

  it("skips attack-dependent steps when there is no preceding attack", async () => {
    const utilityAction: ActionDefinition = {
      ...action,
      sequence: {
        ...action.sequence,
        steps: [action.sequence.steps[1], action.sequence.steps[2]],
      },
    };

    const diceAdapter: DiceAdapter = {
      id: "test",
      isAvailable: vi.fn().mockResolvedValue(true),
      roll: vi.fn() as any,
    };

    const result = await executeAction({
      action: utilityAction,
      variantId: "NORMAL",
      variables: { str: 4 },
      systemPack: new DnD2024SystemPack(),
      diceAdapter,
    });

    expect(result.success).toBe(true);
    expect(result.completedStepIds).toEqual([]);
    expect(result.skippedStepIds).toEqual(["damage", "crit-bonus"]);
    expect(diceAdapter.roll).not.toHaveBeenCalled();
  });
});
