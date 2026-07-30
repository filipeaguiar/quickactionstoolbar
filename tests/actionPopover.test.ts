import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("action popover template", () => {
  const source = readFileSync(resolve("src/ui/action-popover/App.vue"), "utf8");
  const manager = readFileSync(resolve("src/background/popoverManager.ts"), "utf8");

  it("does not expose a manual critical button", () => {
    expect(source).not.toContain("Acerto Crítico");
    expect(source).not.toContain("selectVariant('CRITICAL')");
  });

  it("renders visible failure feedback", () => {
    expect(source).toContain('v-if="errorMessage"');
    expect(source).toContain("error-banner");
    expect(source).toContain("Falha ao executar rolagem no Dice+");
  });

  it("renders a transparent horizontal mode toolbar with semantic colors", () => {
    expect(source).toContain('class="variant-toolbar"');
    expect(source).toContain("background: transparent !important");
    expect(source).toContain(".btn-normal");
    expect(source).toContain("background: #475569");
    expect(source).toContain("background: #15803d");
    expect(source).toContain("background: #b91c1c");
    expect(manager).toContain("width: 330");
    expect(manager).toContain("height: 120");
  });
});
