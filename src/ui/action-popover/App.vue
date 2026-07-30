<template>
  <div class="popover-panel">
    <header class="popover-header">
      <span class="action-icon">⚔️</span>
      <h3 class="action-title">{{ action?.name || actionName }}</h3>
    </header>

    <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

    <div class="variant-list">
      <button class="variant-btn btn-normal" @click="selectVariant('NORMAL')">
        <span class="variant-label">Rolagem Normal</span>
        <span class="variant-desc">d20 padrão</span>
      </button>

      <button class="variant-btn btn-advantage" @click="selectVariant('ADVANTAGE')">
        <span class="variant-label">Vantagem</span>
        <span class="variant-desc">2d20kh1</span>
      </button>

      <button class="variant-btn btn-disadvantage" @click="selectVariant('DISADVANTAGE')">
        <span class="variant-label">Desvantagem</span>
        <span class="variant-desc">2d20kl1</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { ACTION_POPOVER_ID } from "@/background/popoverManager";
import { getRoomData } from "@/storage/roomProfileRepository";
import { DnD2024SystemPack } from "@/systems/dnd2024";
import { DicePlusAdapter } from "@/integrations/dice-plus/adapter";
import { ActionDefinition } from "@/types/action";
import { executeAction } from "@/core/actionExecutor";

const actionName = ref("Ação do Personagem");
const action = ref<ActionDefinition | null>(null);
const variables = ref<Record<string, number>>({});
const errorMessage = ref("");

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
  console.log(`Variante selecionada: ${variant}`);
  errorMessage.value = "";

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
      return;
    }
  } catch (err) {
    console.error("Erro ao executar rolagem:", err);
    errorMessage.value = err instanceof Error ? err.message : "Erro ao executar rolagem.";
    return;
  }

  try {
    await OBR.popover.close(ACTION_POPOVER_ID);
  } catch (err) {
    console.warn("Popover close fallback:", err);
  }
}
</script>

<style scoped>
.popover-panel {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.popover-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #334155;
  padding-bottom: 0.5rem;
}

.action-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  text-transform: capitalize;
}

.variant-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.variant-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.4rem 0.6rem;
  border: 1px solid #334155;
  border-radius: 6px;
  background-color: #1e293b;
  color: #f8fafc;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.variant-btn:hover {
  background-color: #334155;
  border-color: #6366f1;
}

.variant-label {
  font-size: 0.85rem;
  font-weight: 500;
}

.variant-desc {
  font-size: 0.7rem;
  color: #94a3b8;
}

.btn-advantage:hover {
  border-color: #22c55e;
}

.btn-disadvantage:hover {
  border-color: #ef4444;
}

.error-banner {
  margin: 0;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid #ef4444;
  color: #fecaca;
  font-size: 0.8rem;
}
</style>
