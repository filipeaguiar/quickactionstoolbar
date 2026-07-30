import { ActionDefinition, StepPurpose } from "../types/action";

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

export interface SystemPack {
  id: string;
  name: string;
  getAvailableVariants(action: ActionDefinition): ActionVariant[];
  applyVariant(
    action: ActionDefinition,
    variantId: string,
    variables: Record<string, number>
  ): ResolvedRollSequence;
  validateAction(action: ActionDefinition): ValidationResult;
}
