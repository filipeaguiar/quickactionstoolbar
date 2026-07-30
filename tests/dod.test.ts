import { describe, it, expect } from "vitest";
import { CharacterActionProfile } from "../src/types/action";
import { DnD2024SystemPack } from "../src/systems/dnd2024";
import { DICE_PLUS_PROTOCOL, DicePlusRollRequest } from "../src/integrations/dice-plus/protocol";
import { jsonUtf8Size, HARD_LOCK_THRESHOLD } from "../src/storage/metadataSize";

describe("Definition of Done (DoD) End-to-End Validation", () => {
  const sampleProfile: CharacterActionProfile = {
    id: "profile-1",
    name: "Barbarian Hero",
    ownerPlayerId: "player-1",
    ownerPlayerName: "Filipe",
    systemId: "dnd5e-2024",
    variables: { str: 4, prof: 3 },
    actions: [
      {
        id: "greatsword-attack",
        name: "Greatsword Attack",
        icon: "sword",
        kind: "ATTACK",
        enabled: true,
        sortOrder: 1,
        systemId: "dnd5e-2024",
        tags: ["melee"],
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
              id: "step-1",
              label: "Attack",
              purpose: "ATTACK",
              expression: "1d20 + {{str}} + {{prof}}",
              visibility: "PUBLIC",
              execute: "ALWAYS",
            },
            {
              id: "step-2",
              label: "Damage",
              purpose: "DAMAGE",
              expression: "2d6 + {{str}}",
              visibility: "PUBLIC",
              execute: "ON_HIT",
              criticalBehavior: "DOUBLE_DICE",
            },
          ],
        },
      },
    ],
    createdAt: "2026-07-30T15:00:00Z",
    updatedAt: "2026-07-30T15:00:00Z",
    updatedBy: "player-1",
  };

  it("DoD Criterion 4 & 6: End-to-end resolution of Advantage and runtime critical in SystemPack", () => {
    const pack = new DnD2024SystemPack();
    const action = sampleProfile.actions[0];

    const advResult = pack.applyVariant(action, "ADVANTAGE", sampleProfile.variables);
    expect(advResult.steps[0].resolvedExpression).toBe("2d20kh1 + 4 + 3");

    const critResult = pack.applyVariant(action, "NORMAL", sampleProfile.variables, { isCritical: true });
    expect(critResult.steps[1].resolvedExpression).toBe("4d6 + 4");
  });

  it("DoD Criterion 11 & 12: Memory calculation and 15KB room limit check", () => {
    const size = jsonUtf8Size(sampleProfile);
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(HARD_LOCK_THRESHOLD);
    expect(HARD_LOCK_THRESHOLD).toBe(15 * 1024);
  });

  it("DoD Criterion 13: Formatting payloads for Dice+ protocol", () => {
    const pack = new DnD2024SystemPack();
    const resolved = pack.applyVariant(sampleProfile.actions[0], "NORMAL", sampleProfile.variables);

    const stepNotations = resolved.steps.map(
      (s) => `${s.resolvedExpression.replace(/\s+/g, "")} # ${resolved.actionName}: ${s.label}`
    );

    expect(stepNotations[0]).toBe("1d20+4+3 # Greatsword Attack: Attack");
    expect(stepNotations[1]).toBe("2d6+4 # Greatsword Attack: Damage");
    expect(DICE_PLUS_PROTOCOL.readyChannel).toBe("dice-plus/isReady");
    expect(DICE_PLUS_PROTOCOL.rollChannel).toBe("dice-plus/roll-request");
  });
});
