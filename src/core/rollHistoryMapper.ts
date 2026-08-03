import type { ExecuteActionResult } from "./actionExecutor";
import type { ActionDefinition } from "@/types/action";
import {
  RollHistoryRecordSchema,
  type RollHistoryRecord,
  type RollStepSummary,
} from "@/types/firebase";

export interface RollHistoryContext {
  uid: string;
  profileId: string;
  action: ActionDefinition;
  variantId: string;
  execution: ExecuteActionResult;
  createdAt?: string;
}

function standardVariant(value: string): "NORMAL" | "ADVANTAGE" | "DISADVANTAGE" {
  if (value === "ADVANTAGE" || value === "DISADVANTAGE") return value;
  return "NORMAL";
}

function naturalKeptD20(outcome: ExecuteActionResult["stepOutcomes"][number]): number | undefined {
  for (const group of outcome.result.groups) {
    const die = group.dice.find((candidate) => candidate.diceType === "d20" && candidate.kept);
    if (die) return die.value;
  }
  return undefined;
}

function totalValue(outcome: ExecuteActionResult["stepOutcomes"][number]): number | undefined {
  if (typeof outcome.result.totalValue === "number") return outcome.result.totalValue;
  const totals = outcome.result.groups.map((group) => group.total).filter(Number.isFinite);
  return totals.length ? totals.reduce((sum, value) => sum + value, 0) : undefined;
}

/** Maps only successful correlated outcomes and intentionally drops raw envelopes. */
export function mapSuccessfulExecutionToHistory(
  context: RollHistoryContext
): RollHistoryRecord | null {
  if (!context.execution.success || context.execution.stepOutcomes.length === 0) return null;

  const steps: RollStepSummary[] = context.execution.stepOutcomes.slice(0, 20).map((outcome) => {
    const summary: RollStepSummary = {
      stepId: outcome.stepId,
      purpose: outcome.purpose,
      expression: outcome.resolvedExpression.slice(0, 300),
      success: true,
    };
    const total = totalValue(outcome);
    const natural = naturalKeptD20(outcome);
    if (total !== undefined) summary.totalValue = total;
    if (natural !== undefined) summary.naturalD20 = natural;
    return summary;
  });

  return RollHistoryRecordSchema.parse({
    id: context.execution.transactionId,
    uid: context.uid,
    profileId: context.profileId,
    actionId: context.action.id,
    actionName: context.action.name.slice(0, 120),
    variant: standardVariant(context.variantId),
    critical: context.execution.critical,
    automaticMiss: context.execution.automaticMiss,
    steps,
    createdAt: context.createdAt ?? new Date().toISOString(),
  });
}
