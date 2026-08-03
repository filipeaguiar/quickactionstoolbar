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

  it("uses cache-first context without listing every profile action", () => {
    expect(source).toContain("ActionPopoverContextResolver");
    expect(source).toContain("contextResolver.resolve");
    expect(source).not.toContain("profileRepository.listActions");
    expect(source).not.toContain("createFallbackAction");
    expect(source).toContain("A ação ainda não foi carregada do Firebase");
  });

  it("does not flash placeholder content before real context is restored", () => {
    expect(source).toContain('<template v-if="action">');
    expect(source).toContain("{{ action.name }}");
    expect(source).not.toContain("Ação do Personagem");
    expect(source).not.toContain('actionId.replace(/-/g, " ")');
    expect(source).not.toContain('action.value?.icon || "crossed-swords"');
  });

  it("renders a transparent horizontal mode toolbar with semantic colors", () => {
    expect(source).toContain('class="variant-toolbar"');
    expect(source).toContain("background: transparent !important");
    expect(source).toContain(".btn-normal");
    expect(source).toContain("background: #475569");
    expect(source).toContain("background: #15803d");
    expect(source).toContain("background: #b91c1c");
    expect(source).toContain('class="action-mode-icon"');
    expect(source).toContain('v-for="variant in availableVariants"');
    expect(source).toContain("systemPack.getAvailableVariants(action.value)");
    expect(source).toContain(':src="resolveIconUrl(variant.icon || action.icon)"');
    expect(source).not.toContain('class="variant-label"');
    expect(source).toContain("width: 52px");
    expect(source).toContain("height: 52px");
    expect(source).toContain("width: max-content");
    expect(source).toContain("gap: 0");
    expect(source).toContain(".variant-btn:first-child");
    expect(source).toContain("border-radius: 7px 0 0 7px");
    expect(source).toContain(".variant-btn:last-child");
    expect(source).toContain("border-radius: 0 7px 7px 0");
    expect(source).toContain("background: #111827");
    expect(source).toContain("text-align: left");
    expect(manager).toContain("width: 190");
    expect(manager).toContain("height: 120");
  });
});
