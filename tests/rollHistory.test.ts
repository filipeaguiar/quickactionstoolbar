import { describe, expect, it, vi } from "vitest";
import { mapSuccessfulExecutionToHistory } from "@/core/rollHistoryMapper";
import { saveRollHistoryNonBlocking } from "@/core/rollHistoryPersistence";
import type { ExecuteActionResult } from "@/core/actionExecutor";
import type { RollHistoryRepository } from "@/storage/firebase/repositories";
import type { ActionDefinition } from "@/types/action";

const action: ActionDefinition = {
  id: "attack-1",
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
    steps: [{ id: "step-1", label: "Attack", purpose: "ATTACK", expression: "1d20+4" }],
  },
};

function execution(overrides: Partial<ExecuteActionResult> = {}): ExecuteActionResult {
  return {
    success: true,
    transactionId: "roll-1",
    completedStepIds: ["step-1"],
    skippedStepIds: [],
    critical: true,
    automaticMiss: false,
    stepOutcomes: [
      {
        stepId: "step-1",
        purpose: "ATTACK",
        resolvedExpression: "1d20 + 4",
        result: {
          rollId: "dice-roll-1",
          totalValue: 24,
          groups: [
            {
              description: "Attack",
              diceType: "d20",
              total: 20,
              dice: [
                { diceId: "d1", rollId: "dice-roll-1", diceType: "d20", value: 20, kept: true },
              ],
            },
          ],
        },
      },
    ],
    ...overrides,
  };
}

function repository(create: RollHistoryRepository["create"]): RollHistoryRepository {
  return {
    create,
    list: vi.fn(),
    deleteExpired: vi.fn(),
  };
}

describe("roll history", () => {
  it("maps only bounded successful correlated outcomes", () => {
    const record = mapSuccessfulExecutionToHistory({
      uid: "player-1",
      profileId: "profile-1",
      action,
      variantId: "ADVANTAGE",
      execution: execution(),
      createdAt: "2026-07-30T12:00:00.000Z",
    });

    expect(record).toMatchObject({
      id: "roll-1",
      variant: "ADVANTAGE",
      critical: true,
      automaticMiss: false,
      steps: [{ naturalD20: 20, totalValue: 24, expression: "1d20 + 4" }],
    });
    expect(record).not.toHaveProperty("rawEnvelope");
  });

  it("omits unavailable optional values instead of sending undefined to Firestore", () => {
    const damageExecution = execution({
      critical: false,
      stepOutcomes: [
        {
          stepId: "damage",
          purpose: "DAMAGE",
          resolvedExpression: "1d6 + 4",
          result: {
            rollId: "damage-roll",
            groups: [
              {
                description: "Damage",
                diceType: "d6",
                total: 5,
                dice: [
                  {
                    diceId: "d6-1",
                    rollId: "damage-roll",
                    diceType: "d6",
                    value: 5,
                    kept: true,
                  },
                ],
              },
            ],
          },
        },
      ],
    });
    const record = mapSuccessfulExecutionToHistory({
      uid: "player-1",
      profileId: "profile-1",
      action,
      variantId: "NORMAL",
      execution: damageExecution,
    });

    expect(record?.steps[0]).not.toHaveProperty("naturalD20");
    expect(Object.values(record?.steps[0] ?? {})).not.toContain(undefined);
  });

  it("does not create history for failed or empty executions", () => {
    expect(
      mapSuccessfulExecutionToHistory({
        uid: "player-1",
        profileId: "profile-1",
        action,
        variantId: "NORMAL",
        execution: execution({ success: false }),
      })
    ).toBeNull();
  });

  it("keeps a successful roll successful when history persistence fails", async () => {
    const record = mapSuccessfulExecutionToHistory({
      uid: "player-1",
      profileId: "profile-1",
      action,
      variantId: "NORMAL",
      execution: execution(),
    });
    const failure = new Error("offline");
    const result = await saveRollHistoryNonBlocking(
      repository(vi.fn().mockRejectedValue(failure)),
      "room-1",
      record
    );

    expect(result).toEqual({ saved: false, error: failure });
    expect(execution().success).toBe(true);
  });
});
