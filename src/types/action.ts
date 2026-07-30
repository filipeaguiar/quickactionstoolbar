import { z } from "zod";

export const ActionKindSchema = z.enum([
  "ATTACK",
  "DAMAGE",
  "SAVE",
  "CHECK",
  "HEALING",
  "UTILITY",
  "CUSTOM",
]);
export type ActionKind = z.infer<typeof ActionKindSchema>;

export const StepPurposeSchema = z.enum([
  "ATTACK",
  "DAMAGE",
  "HEALING",
  "CHECK",
  "SAVE",
  "OTHER",
]);
export type StepPurpose = z.infer<typeof StepPurposeSchema>;

export const CriticalBehaviorSchema = z.enum(["DOUBLE_DICE", "NONE"]);
export type CriticalBehavior = z.infer<typeof CriticalBehaviorSchema>;

export const RollStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  purpose: StepPurposeSchema,
  expression: z.string().min(1, "A expressão de rolagem não pode ser vazia"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  execute: z.enum(["ALWAYS", "ON_HIT", "ON_CRITICAL"]).default("ALWAYS"),
  criticalBehavior: CriticalBehaviorSchema.optional(),
});
export type RollStep = z.infer<typeof RollStepSchema>;

export const RollSequenceSchema = z.object({
  version: z.literal(1),
  steps: z.array(RollStepSchema).min(1, "A ação precisa de pelo menos uma rolagem"),
  stopOnError: z.boolean().default(true),
});
export type RollSequence = z.infer<typeof RollSequenceSchema>;

export const RollTransformationSchema = z.object({
  type: z.enum(["D20_ADVANTAGE", "D20_DISADVANTAGE", "DOUBLE_DICE", "ADD_MODIFIER"]),
  stepPurpose: StepPurposeSchema.optional(),
  modifierValue: z.number().optional(),
});
export type RollTransformation = z.infer<typeof RollTransformationSchema>;

export const CustomVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  transformations: z.array(RollTransformationSchema),
});
export type CustomVariant = z.infer<typeof CustomVariantSchema>;

export const VariantPolicySchema = z.object({
  allowNormal: z.boolean().default(true),
  allowAdvantage: z.boolean().default(true),
  allowDisadvantage: z.boolean().default(true),
  allowCritical: z.boolean().default(true),
  customVariants: z.array(CustomVariantSchema).default([]),
});
export type VariantPolicy = z.infer<typeof VariantPolicySchema>;

export const ActionDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome é obrigatório"),
  shortLabel: z.string().max(12, "Rótulo curto deve ter no máximo 12 caracteres").optional(),
  description: z.string().optional(),
  icon: z.string(), // ID do RPG Awesome
  kind: ActionKindSchema,
  enabled: z.boolean().default(true),
  sortOrder: z.number().default(0),
  systemId: z.literal("dnd5e-2024").default("dnd5e-2024"),
  sequence: RollSequenceSchema,
  variantPolicy: VariantPolicySchema,
  tags: z.array(z.string()).default([]),
});
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;

export const CharacterActionProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do personagem é obrigatório"),
  ownerPlayerId: z.string().nullable().default(null),
  ownerPlayerName: z.string().nullable().default(null),
  systemId: z.literal("dnd5e-2024").default("dnd5e-2024"),
  variables: z.record(z.string(), z.number()).default({}),
  actions: z.array(ActionDefinitionSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type CharacterActionProfile = z.infer<typeof CharacterActionProfileSchema>;
