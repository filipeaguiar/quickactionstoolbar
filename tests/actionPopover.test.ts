import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("action popover template", () => {
  const source = readFileSync(resolve("src/ui/action-popover/App.vue"), "utf8");

  it("does not expose a manual critical button", () => {
    expect(source).not.toContain("Acerto Crítico");
    expect(source).not.toContain("selectVariant('CRITICAL')");
  });

  it("renders visible failure feedback", () => {
    expect(source).toContain('v-if="errorMessage"');
    expect(source).toContain("error-banner");
    expect(source).toContain("Falha ao executar rolagem no Dice+");
  });
});
