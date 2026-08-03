import { DiceAdapter } from "@/integrations/dice-plus/adapter";
import type { DicePlusRollResultDetails } from "@/integrations/dice-plus/protocol";
import { ActionDefinition, type StepPurpose } from "@/types/action";
import { SystemPack } from "@/systems/types";

interface AttackContext {
  isCritical: boolean;
  isAutomaticMiss: boolean;
  isHit: boolean;
}

export interface ExecuteActionOptions {
  action: ActionDefinition;
  variantId: string;
  variables: Record<string, number>;
  systemPack: SystemPack;
  diceAdapter: DiceAdapter;
}

export interface ExecutedStepOutcome {
  stepId: string;
  purpose: StepPurpose;
  resolvedExpression: string;
  result: DicePlusRollResultDetails;
}

export interface ExecuteActionResult {
  success: boolean;
  transactionId: string;
  error?: string;
  completedStepIds: string[];
  skippedStepIds: string[];
  stepOutcomes: ExecutedStepOutcome[];
  critical: boolean;
  automaticMiss: boolean;
}

export async function executeAction({
  action,
  variantId,
  variables,
  systemPack,
  diceAdapter,
}: ExecuteActionOptions): Promise<ExecuteActionResult> {
  const completedStepIds: string[] = [];
  const skippedStepIds: string[] = [];
  const stepOutcomes: ExecutedStepOutcome[] = [];
  const transactionId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let attackContext: AttackContext | null = null;

  const finish = (
    success: boolean,
    overrides: Partial<Pick<ExecuteActionResult, "transactionId" | "error">> = {}
  ): ExecuteActionResult => ({
    success,
    transactionId: overrides.transactionId || transactionId,
    error: overrides.error,
    completedStepIds,
    skippedStepIds,
    stepOutcomes,
    critical: attackContext?.isCritical ?? false,
    automaticMiss: attackContext?.isAutomaticMiss ?? false,
  });

  const available = await diceAdapter.isAvailable();
  if (!available) return finish(false, { transactionId: "", error: "Dice+ indisponível" });

  const attackStep = action.sequence.steps.find((step) => step.purpose === "ATTACK");
  if (attackStep) {
    const attackSequence = systemPack.applyVariant(action, variantId, variables, {
      isCritical: false,
    });
    const resolvedAttackStep = attackSequence.steps.find((step) => step.id === attackStep.id);

    if (resolvedAttackStep) {
      const attackResult = await diceAdapter.roll({
        actionName: attackSequence.actionName,
        variantId: attackSequence.variantId,
        steps: [resolvedAttackStep],
      });

      if (!attackResult.success) {
        return finish(false, {
          transactionId: attackResult.transactionId,
          error: attackResult.error,
        });
      }

      completedStepIds.push(attackStep.id);
      const result = attackResult.stepResults[0]?.result;
      if (result) {
        stepOutcomes.push({
          stepId: attackStep.id,
          purpose: attackStep.purpose,
          resolvedExpression: resolvedAttackStep.resolvedExpression,
          result,
        });
        attackContext = systemPack.classifyAttackResult(result);
      }
    }
  }

  const remainingSteps = action.sequence.steps.filter((step) => step.id !== attackStep?.id);
  const runnableSteps = remainingSteps.filter((step) => {
    if (step.execute === "ON_HIT") return attackContext?.isHit === true;
    if (step.execute === "ON_CRITICAL") return attackContext?.isCritical === true;
    return true;
  });

  for (const step of remainingSteps) {
    if (!runnableSteps.some((candidate) => candidate.id === step.id)) {
      skippedStepIds.push(step.id);
    }
  }

  if (runnableSteps.length === 0) return finish(true);

  const resolvedSequence = systemPack.applyVariant(action, variantId, variables, {
    isCritical: attackContext?.isCritical,
  });
  const stepsToRoll = resolvedSequence.steps.filter((step) =>
    runnableSteps.some((candidate) => candidate.id === step.id)
  );
  const remainingResult = await diceAdapter.roll({
    actionName: resolvedSequence.actionName,
    variantId: resolvedSequence.variantId,
    steps: stepsToRoll,
  });

  remainingResult.stepResults.forEach((stepResult, index) => {
    const step = stepsToRoll[index];
    if (!stepResult.success || !step) return;
    completedStepIds.push(step.id);
    if (stepResult.result) {
      stepOutcomes.push({
        stepId: step.id,
        purpose: step.purpose,
        resolvedExpression: step.resolvedExpression,
        result: stepResult.result,
      });
    }
  });

  if (!remainingResult.success) {
    return finish(false, {
      transactionId: remainingResult.transactionId,
      error: remainingResult.error,
    });
  }

  // Some adapters can omit per-step details while still confirming the full batch.
  for (const step of stepsToRoll) {
    if (!completedStepIds.includes(step.id)) completedStepIds.push(step.id);
  }

  return finish(true, { transactionId: remainingResult.transactionId });
}
