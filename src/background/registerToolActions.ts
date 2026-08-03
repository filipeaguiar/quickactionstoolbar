import OBR from "@owlbear-rodeo/sdk";
import { TOOL_ID } from "./registerTool";
import { resolveIconUrl, resolveOverflowIconUrl } from "@/utils/iconResolver";
import {
  ACTION_POPOVER_ID,
  openActionPopover,
  openOverflowPopover,
} from "./popoverManager";
import type { ActionDefinition } from "@/types/action";
import { DnD2024SystemPack } from "@/systems/dnd2024";

export type SimpleActionItem = ActionDefinition;
export type DirectActionHandler = (actionId: string, variantId: string) => Promise<void>;

const systemPack = new DnD2024SystemPack();
let currentActions = new Map<string, SimpleActionItem>();
let directActionHandler: DirectActionHandler | null = null;

let registeredActionIds: string[] = [];
let lastToolbarSignature: string | null = null;
let syncQueue: Promise<void> = Promise.resolve();

function visibleActions(actions: SimpleActionItem[]): SimpleActionItem[] {
  return actions
    .filter((action) => action.enabled)
    .map((action) => ({ ...action }))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

function toolbarSignature(actions: SimpleActionItem[]): string {
  return JSON.stringify(
    actions.map(({ id, name, shortLabel, icon, enabled, sortOrder }) => ({
      id,
      name,
      shortLabel,
      icon,
      enabled,
      sortOrder,
    }))
  );
}

async function performSync(
  actions: SimpleActionItem[],
  onDirectAction: DirectActionHandler | null
): Promise<void> {
  const normalizedActions = visibleActions(actions);
  currentActions = new Map(normalizedActions.map((action) => [action.id, action]));
  directActionHandler = onDirectAction;
  const nextSignature = toolbarSignature(normalizedActions);

  if (nextSignature === lastToolbarSignature) {
    return;
  }

  if (registeredActionIds.length > 0) {
    try {
      await OBR.popover.close(ACTION_POPOVER_ID);
    } catch {
      // O popover pode não estar aberto.
    }
  }

  for (const registeredId of registeredActionIds) {
    try {
      await OBR.tool.removeAction(registeredId);
    } catch {
      // Ignorar erros caso a ação já tenha sido removida.
    }
  }
  registeredActionIds = [];

  if (normalizedActions.length === 0) {
    lastToolbarSignature = nextSignature;
    return;
  }

  const MAX_DIRECT_ACTIONS = 8;
  const hasOverflow = normalizedActions.length > MAX_DIRECT_ACTIONS;
  const directActions = hasOverflow ? normalizedActions.slice(0, 7) : normalizedActions;

  for (const action of directActions) {
    const actionId = `${TOOL_ID}/action/${action.id}`;
    registeredActionIds.push(actionId);

    await OBR.tool.createAction({
      id: actionId,
      icons: [
        {
          icon: resolveIconUrl(action.icon),
          label: action.shortLabel || action.name,
          filter: {
            activeTools: [TOOL_ID],
          },
        },
      ],
      async onClick(_context, elementId) {
        const currentAction = currentActions.get(action.id);
        if (!currentAction) {
          await OBR.notification.show("A ação selecionada não está disponível.", "ERROR");
          return;
        }
        const variants = systemPack.getAvailableVariants(currentAction);
        if (variants.length === 1 && directActionHandler) {
          await directActionHandler(currentAction.id, variants[0].id);
          return;
        }
        if (variants.length === 0) {
          await OBR.notification.show("A ação não possui uma variante executável.", "ERROR");
          return;
        }
        await openActionPopover(currentAction.id, elementId);
      },
    });
  }

  if (hasOverflow) {
    const overflowId = `${TOOL_ID}/action/overflow`;
    registeredActionIds.push(overflowId);

    await OBR.tool.createAction({
      id: overflowId,
      icons: [
        {
          icon: resolveOverflowIconUrl(),
          label: "Mais ações...",
          filter: {
            activeTools: [TOOL_ID],
          },
        },
      ],
      onClick(_context, elementId) {
        openOverflowPopover(elementId);
      },
    });
  }

  lastToolbarSignature = nextSignature;
}

/**
 * Sincroniza ToolActions em série e preserva os elementos nativos quando a
 * configuração visual efetiva não mudou, mantendo popovers ancorados estáveis.
 */
export function syncToolActions(
  actions: SimpleActionItem[],
  onDirectAction: DirectActionHandler | null = null
): Promise<void> {
  const snapshot = actions.map((action) => ({ ...action }));
  syncQueue = syncQueue.then(
    () => performSync(snapshot, onDirectAction),
    () => performSync(snapshot, onDirectAction)
  );
  return syncQueue;
}
