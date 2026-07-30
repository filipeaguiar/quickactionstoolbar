import { DiceAdapter } from "@/integrations/dice-plus/adapter";
import { ActionDefinition } from "@/types/action";
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

export interface ExecuteActionResult {
  success: boolean;
  transactionId: string;
  error?: string;
  completedStepIds: string[];
  skippedStepIds: string[];
}

export async function executeAction({
  action,
  variantId,
  variables,
  systemPack,
  diceAdapter,
}: ExecuteActionOptions): Promise<ExecuteActionResult> {
  const available = await diceAdapter.isAvailable();
  if (!available) {
    return {
      success: false,
      transactionId: "",
      error: "Dice+ indisponível",
      completedStepIds: [],
      skippedStepIds: [],
    };
  }

  const completedStepIds: string[] = [];
  const skippedStepIds: string[] = [];
  const transactionId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const attackStep = action.sequence.steps.find((step) => step.purpose === "ATTACK");
  let attackContext: AttackContext | null = null;

  if (attackStep) {
    const attackSequence = systemPack.applyVariant(action, variantId, variables, { isCritical: false });
    const resolvedAttackStep = attackSequence.steps.find((step) => step.id === attackStep.id);

    if (resolvedAttackStep) {
      const attackResult = await diceAdapter.roll({
        actionName: attackSequence.actionName,
        variantId: attackSequence.variantId,
        steps: [resolvedAttackStep],
      });

      if (!attackResult.success) {
        return {
          success: false,
          transactionId: attackResult.transactionId || transactionId,
          error: attackResult.error,
          completedStepIds,
          skippedStepIds,
        };
      }

      completedStepIds.push(attackStep.id);
      const stepResult = attackResult.stepResults[0];
      if (stepResult?.result) {
        attackContext = systemPack.classifyAttackResult(stepResult.result);
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

  if (runnableSteps.length === 0) {
    return {
      success: true,
      transactionId,
      completedStepIds,
      skippedStepIds,
    };
  }

  const resolvedSequence = systemPack.applyVariant(action, variantId, variables, {
    isCritical: attackContext?.isCritical,
  });
  const stepsToRoll = resolvedSequence.steps.filter((step) => runnableSteps.some((candidate) => candidate.id === step.id));

  const remainingResult = await diceAdapter.roll({
    actionName: resolvedSequence.actionName,
    variantId: resolvedSequence.variantId,
    steps: stepsToRoll,
  });

  if (!remainingResult.success) {
    const successfulStepIds = remainingResult.stepResults
      .map((stepResult, index) => (stepResult.success ? stepsToRoll[index]?.id : undefined))
      .filter((id): id is string => Boolean(id));

    completedStepIds.push(...successfulStepIds);

    return {
      success: false,
      transactionId: remainingResult.transactionId || transactionId,
      error: remainingResult.error,
      completedStepIds,
      skippedStepIds,
    };
  }

  completedStepIds.push(...stepsToRoll.map((step) => step.id));

  return {
    success: true,
    transactionId,
    completedStepIds,
    skippedStepIds,
  };
}
