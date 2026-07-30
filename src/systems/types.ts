import { ActionDefinition, CriticalBehavior, StepPurpose } from "../types/action";
import { DicePlusRollResultDetails } from "../integrations/dice-plus/protocol";

export interface ActionVariant {
  id: "NORMAL" | "ADVANTAGE" | "DISADVANTAGE" | "CRITICAL" | string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ResolvedRollStep {
  id: string;
  label: string;
  purpose: StepPurpose;
  rawExpression: string;
  resolvedExpression: string;
  visibility: "PUBLIC" | "PRIVATE";
  execute: "ALWAYS" | "ON_HIT" | "ON_CRITICAL";
  criticalBehavior?: CriticalBehavior;
}

export interface ResolvedRollSequence {
  actionName: string;
  variantId: string;
  steps: ResolvedRollStep[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AttackClassification {
  isCritical: boolean;
}

export interface RuntimeResolutionOptions {
  isCritical?: boolean;
}

export interface SystemPack {
  id: string;
  name: string;
  getAvailableVariants(action: ActionDefinition): ActionVariant[];
  applyVariant(
    action: ActionDefinition,
    variantId: string,
    variables: Record<string, number>,
    options?: RuntimeResolutionOptions
  ): ResolvedRollSequence;
  classifyAttackResult(result: DicePlusRollResultDetails): AttackClassification;
  validateAction(action: ActionDefinition): ValidationResult;
}
