import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  tool: {
    create: vi.fn().mockResolvedValue(undefined),
    createAction: vi.fn().mockResolvedValue(undefined),
    removeAction: vi.fn().mockResolvedValue(undefined),
  },
  contextMenu: {
    create: vi.fn().mockResolvedValue(undefined),
  },
  popover: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
  notification: {
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@owlbear-rodeo/sdk", () => ({ default: sdk }));

import { registerContextMenu } from "../src/background/registerContextMenu";
import { registerMainTool } from "../src/background/registerTool";
import { syncToolActions } from "../src/background/registerToolActions";

function expectAbsoluteSvgUrl(value: unknown, pathname: string) {
  expect(typeof value).toBe("string");
  const url = new URL(value as string);
  expect(["http:", "https:"]).toContain(url.protocol);
  expect(url.pathname).toBe(pathname);
}

describe("native Owlbear icon registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers Tool and Context Menu with curated absolute SVG URLs", async () => {
    await registerMainTool();
    await registerContextMenu();

    const tool = sdk.tool.create.mock.calls[0][0];
    const contextMenu = sdk.contextMenu.create.mock.calls[0][0];
    expectAbsoluteSvgUrl(tool.icons[0].icon, "/icons/rpg-awesome/crossed-swords.svg");
    expectAbsoluteSvgUrl(contextMenu.icons[0].icon, "/icons/rpg-awesome/cog.svg");
  });

  it("executes a single-mode OTHER action directly without opening a popover", async () => {
    const action = {
      id: "other-direct",
      name: "Other",
      icon: "crossed-swords",
      kind: "UTILITY" as const,
      enabled: true,
      sortOrder: 0,
      systemId: "dnd5e-2024" as const,
      tags: [],
      sequence: {
        version: 1 as const,
        stopOnError: true,
        steps: [
          {
            id: "step-other",
            label: "Other",
            purpose: "OTHER" as const,
            expression: "1d6",
            visibility: "PUBLIC" as const,
            execute: "ALWAYS" as const,
          },
        ],
      },
      variantPolicy: {
        allowNormal: true,
        allowAdvantage: true,
        allowDisadvantage: true,
        allowCritical: true,
        customVariants: [],
      },
    };
    const executeDirectly = vi.fn().mockResolvedValue(undefined);

    await syncToolActions([action], executeDirectly);
    const registration = sdk.tool.createAction.mock.calls.at(-1)?.[0];
    await registration.onClick({}, "element-1");

    expect(executeDirectly).toHaveBeenCalledWith(action.id, "NORMAL");
    expect(sdk.popover.open).not.toHaveBeenCalled();
  });

  it("opens the popover when an action offers multiple modes", async () => {
    const action = {
      id: "attack-modes",
      name: "Attack",
      icon: "crossed-swords",
      kind: "ATTACK" as const,
      enabled: true,
      sortOrder: 0,
      systemId: "dnd5e-2024" as const,
      tags: [],
      sequence: {
        version: 1 as const,
        stopOnError: true,
        steps: [
          {
            id: "step-attack",
            label: "Attack",
            purpose: "ATTACK" as const,
            expression: "1d20",
            visibility: "PUBLIC" as const,
            execute: "ALWAYS" as const,
          },
        ],
      },
      variantPolicy: {
        allowNormal: true,
        allowAdvantage: true,
        allowDisadvantage: true,
        allowCritical: true,
        customVariants: [],
      },
    };
    const executeDirectly = vi.fn().mockResolvedValue(undefined);

    await syncToolActions([action], executeDirectly);
    const registration = sdk.tool.createAction.mock.calls.at(-1)?.[0];
    await registration.onClick({}, "element-2");

    expect(executeDirectly).not.toHaveBeenCalled();
    expect(sdk.popover.open).toHaveBeenCalledWith(
      expect.objectContaining({ anchorElementId: "element-2" })
    );
  });

  it("registers action fallback and project-owned overflow URLs", async () => {
    const actions = Array.from({ length: 9 }, (_, index) => ({
      id: `action-${index}`,
      name: `Action ${index}`,
      icon: index === 0 ? "invalid/persisted.svg" : "broadsword",
      enabled: true,
      sortOrder: index,
    }));

    await syncToolActions(actions);

    expect(sdk.tool.createAction).toHaveBeenCalledTimes(8);
    const directAction = sdk.tool.createAction.mock.calls[0][0];
    const overflowAction = sdk.tool.createAction.mock.calls[7][0];
    expectAbsoluteSvgUrl(
      directAction.icons[0].icon,
      "/icons/rpg-awesome/crossed-swords.svg"
    );
    expectAbsoluteSvgUrl(overflowAction.icons[0].icon, "/icons/overflow.svg");
    expect(overflowAction.icons[0].label).toBe("Mais ações...");

    vi.clearAllMocks();
    await Promise.all([syncToolActions(actions), syncToolActions(actions)]);

    expect(sdk.tool.removeAction).not.toHaveBeenCalled();
    expect(sdk.tool.createAction).not.toHaveBeenCalled();
    expect(sdk.popover.close).not.toHaveBeenCalled();
  });
});
