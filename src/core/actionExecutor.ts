import { DiceAdapter } from "@/integrations/dice-plus/adapter";
import { ActionDefinition } from "@/types/action";
import { SystemPack } from "@/systems/types";

interface AttackContext {
  isCritical: boolean;
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

  let attackContext: AttackContext | null = null;
  const completedStepIds: string[] = [];
  const skippedStepIds: string[] = [];
  const transactionId = `roll_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  for (const step of action.sequence.steps) {
    if (step.execute === "ON_HIT" && !attackContext) {
      skippedStepIds.push(step.id);
      continue;
    }

    if (step.execute === "ON_CRITICAL" && !attackContext?.isCritical) {
      skippedStepIds.push(step.id);
      continue;
    }

    const resolvedSequence = systemPack.applyVariant(action, variantId, variables, {
      isCritical: step.purpose === "DAMAGE" ? attackContext?.isCritical : false,
    });
    const resolvedStep = resolvedSequence.steps.find((candidate) => candidate.id === step.id);
    if (!resolvedStep) {
      skippedStepIds.push(step.id);
      continue;
    }

    const rollResult = await diceAdapter.roll({
      actionName: resolvedSequence.actionName,
      variantId: resolvedSequence.variantId,
      steps: [resolvedStep],
    });

    if (!rollResult.success) {
      return {
        success: false,
        transactionId: rollResult.transactionId || transactionId,
        error: rollResult.error,
        completedStepIds,
        skippedStepIds,
      };
    }

    completedStepIds.push(step.id);

    if (step.purpose === "ATTACK") {
      const stepResult = rollResult.stepResults[0];
      if (stepResult?.result) {
        attackContext = systemPack.classifyAttackResult(stepResult.result);
      }
    }
  }

  return {
    success: true,
    transactionId,
    completedStepIds,
    skippedStepIds,
  };
}
