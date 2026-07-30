<template>
  <div class="popover-panel">
    <h3 class="action-title">{{ action?.name || actionName }}</h3>

    <div class="variant-toolbar" role="toolbar" aria-label="Modo da rolagem">
      <button
        class="variant-btn btn-normal"
        :disabled="isRolling"
        title="Rolagem normal"
        @click="selectVariant('NORMAL')"
      >
        <img class="action-mode-icon" :src="actionIconUrl" alt="" aria-hidden="true" />
      </button>

      <button
        class="variant-btn btn-advantage"
        :disabled="isRolling"
        title="Rolagem com vantagem"
        @click="selectVariant('ADVANTAGE')"
      >
        <img class="action-mode-icon" :src="actionIconUrl" alt="" aria-hidden="true" />
      </button>

      <button
        class="variant-btn btn-disadvantage"
        :disabled="isRolling"
        title="Rolagem com desvantagem"
        @click="selectVariant('DISADVANTAGE')"
      >
        <img class="action-mode-icon" :src="actionIconUrl" alt="" aria-hidden="true" />
      </button>
    </div>

    <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { ACTION_POPOVER_ID } from "@/background/popoverManager";
import { getRoomData } from "@/storage/roomProfileRepository";
import { DnD2024SystemPack } from "@/systems/dnd2024";
import { DicePlusAdapter } from "@/integrations/dice-plus/adapter";
import { ActionDefinition } from "@/types/action";
import { executeAction } from "@/core/actionExecutor";
import { resolveIconUrl } from "@/utils/iconResolver";

const actionName = ref("Ação do Personagem");
const action = ref<ActionDefinition | null>(null);
const variables = ref<Record<string, number>>({});
const errorMessage = ref("");
const isRolling = ref(false);
const actionIconUrl = computed(() => resolveIconUrl(action.value?.icon || "crossed-swords"));

const systemPack = new DnD2024SystemPack();
const diceAdapter = new DicePlusAdapter();

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const actionId = urlParams.get("actionId");
  if (actionId) {
    actionName.value = actionId.replace(/-/g, " ");
  }

  try {
    if (!OBR.isReady) {
      await new Promise<void>((resolve) => OBR.onReady(() => resolve()));
    }
    const roomData = await getRoomData();
    const playerId = OBR.player.id;
    if (roomData) {
      const profileId = roomData.playerAssignments[playerId] || Object.keys(roomData.profiles)[0];

      if (profileId && roomData.profiles[profileId]) {
        const currentProfile = roomData.profiles[profileId];
        variables.value = currentProfile.variables || {};
        const foundAction = currentProfile.actions.find((a) => a.id === actionId);
        if (foundAction) {
          action.value = foundAction;
        }
      }
    }
  } catch (err) {
    console.warn("Erro ao carregar dados no popover:", err);
  }
});

function createFallbackAction(): ActionDefinition {
  return {
    id: "fallback-action",
    name: actionName.value,
    icon: "sword",
    kind: "ATTACK",
    enabled: true,
    sortOrder: 0,
    systemId: "dnd5e-2024",
    tags: [],
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
          label: "Ataque",
          purpose: "ATTACK",
          expression: "1d20 + 5",
          visibility: "PUBLIC",
          execute: "ALWAYS",
        },
        {
          id: "step-2",
          label: "Dano",
          purpose: "DAMAGE",
          expression: "1d8 + 3",
          visibility: "PUBLIC",
          execute: "ON_HIT",
          criticalBehavior: "DOUBLE_DICE",
        },
      ],
    },
  };
}

async function selectVariant(variant: string) {
  if (isRolling.value) return;

  console.log(`Variante selecionada: ${variant}`);
  errorMessage.value = "";
  isRolling.value = true;

  try {
    const selectedAction = action.value ?? createFallbackAction();
    const result = await executeAction({
      action: selectedAction,
      variantId: variant,
      variables: variables.value,
      systemPack,
      diceAdapter,
    });
    console.log("Resultado envio Dice+:", result);

    if (!result.success) {
      errorMessage.value = result.error || "Falha ao executar rolagem no Dice+.";
      isRolling.value = false;
      return;
    }
  } catch (err) {
    console.error("Erro ao executar rolagem:", err);
    errorMessage.value = err instanceof Error ? err.message : "Erro ao executar rolagem.";
    isRolling.value = false;
    return;
  }

  try {
    await OBR.popover.close(ACTION_POPOVER_ID);
  } catch (err) {
    console.warn("Popover close fallback:", err);
    isRolling.value = false;
  }
}
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent !important;
}
</style>

<style scoped>
.popover-panel {
  box-sizing: border-box;
  width: 100%;
  font-family: system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  padding: 0.35rem;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.action-title {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  text-transform: capitalize;
  white-space: nowrap;
}

.variant-toolbar {
  display: flex;
  justify-content: center;
  align-items: stretch;
  width: 100%;
  gap: 0.35rem;
}

.variant-btn {
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 7px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.variant-btn:hover:not(:disabled) {
  filter: brightness(1.18);
  transform: translateY(-1px);
}

.variant-btn:active:not(:disabled) {
  transform: translateY(0);
}

.variant-btn:disabled {
  cursor: wait;
  filter: saturate(0.5);
  opacity: 0.7;
}

.btn-normal {
  background: #475569;
}

.btn-advantage {
  background: #15803d;
}

.btn-disadvantage {
  background: #b91c1c;
}

.action-mode-icon {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) invert(1);
  pointer-events: none;
}

.error-banner {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  background-color: rgba(127, 29, 29, 0.92);
  border: 1px solid #ef4444;
  color: #fee2e2;
  font-size: 0.72rem;
  text-align: center;
}
</style>
