import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("manager action editor", () => {
  const editor = readFileSync(resolve("src/ui/manager/components/ActionEditor.vue"), "utf8");
  const manager = readFileSync(resolve("src/ui/manager/App.vue"), "utf8");

  it("exposes step purpose, execution condition, and critical behavior", () => {
    expect(editor).toContain('v-model="step.purpose"');
    expect(editor).toContain('v-model="step.execute"');
    expect(editor).toContain('v-model="step.criticalBehavior"');
    expect(editor).toContain('value="DOUBLE_DICE"');
  });

  it("uses viewport-bounded responsive layout", () => {
    expect(editor).toContain("position: fixed");
    expect(editor).toContain("max-height: calc(100vh - 20px)");
    expect(editor).toContain("overflow-x: hidden");
    expect(editor).toContain("@media (max-width: 520px)");
    expect(manager).toContain("overflow-x: hidden");
    expect(manager).toContain("min-width: 0");
  });
});
