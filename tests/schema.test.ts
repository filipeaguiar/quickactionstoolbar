import { describe, it, expect } from "vitest";
import { ActionDefinitionSchema, CharacterActionProfileSchema } from "../src/types/action";

describe("Zod Schemas Validation", () => {
  describe("ActionDefinitionSchema", () => {
    it("should accept valid action definitions", () => {
      const validAction = {
        id: "attack-1",
        name: "Longsword Attack",
        shortLabel: "Longsword",
        icon: "crossed-swords",
        kind: "ATTACK",
        sequence: {
          version: 1,
          steps: [
            {
              id: "step-1",
              label: "Attack Roll",
              purpose: "ATTACK",
              expression: "1d20+5",
            },
          ],
          stopOnError: true,
        },
        variantPolicy: {
          allowNormal: true,
          allowAdvantage: true,
          allowDisadvantage: true,
          allowCritical: true,
          customVariants: [],
        },
      };

      const result = ActionDefinitionSchema.safeParse(validAction);
      expect(result.success).toBe(true);
    });

    it("should reject action definitions with empty name", () => {
      const invalidAction = {
        id: "attack-1",
        name: "",
        icon: "crossed-swords",
        kind: "ATTACK",
        sequence: {
          version: 1,
          steps: [
            {
              id: "step-1",
              label: "Attack Roll",
              purpose: "ATTACK",
              expression: "1d20+5",
            },
          ],
        },
        variantPolicy: {},
      };

      const result = ActionDefinitionSchema.safeParse(invalidAction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Nome é obrigatório");
      }
    });

    it("should reject roll steps with empty expression", () => {
      const invalidAction = {
        id: "attack-1",
        name: "Attack",
        icon: "crossed-swords",
        kind: "ATTACK",
        sequence: {
          version: 1,
          steps: [
            {
              id: "step-1",
              label: "Attack Roll",
              purpose: "ATTACK",
              expression: "", // Inválido
            },
          ],
        },
        variantPolicy: {},
      };

      const result = ActionDefinitionSchema.safeParse(invalidAction);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("expressão de rolagem não pode ser vazia");
      }
    });
  });

  describe("CharacterActionProfileSchema", () => {
    it("should apply defaults for optional fields", () => {
      const rawProfile = {
        id: "profile-1",
        name: "Grog",
        createdAt: "2026-07-30T14:00:00Z",
        updatedAt: "2026-07-30T14:00:00Z",
        updatedBy: "player-1",
      };

      const result = CharacterActionProfileSchema.safeParse(rawProfile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actions).toEqual([]);
        expect(result.data.variables).toEqual({});
        expect(result.data.ownerPlayerId).toBeNull();
      }
    });
  });
});
