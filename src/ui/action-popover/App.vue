<template>
  <div class="popover-panel">
    <header class="popover-header">
      <span class="action-icon">⚔️</span>
      <h3 class="action-title">{{ actionName }}</h3>
    </header>

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

      <button class="variant-btn btn-critical" @click="selectVariant('CRITICAL')">
        <span class="variant-label">Acerto Crítico</span>
        <span class="variant-desc">Dados de dano duplicados</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { ACTION_POPOVER_ID } from "@/background/popoverManager";

const actionName = ref("Ação do Personagem");

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const actionId = urlParams.get("actionId");
  if (actionId) {
    actionName.value = actionId.replace(/-/g, " ");
  }
});

async function selectVariant(variant: string) {
  console.log(`Variante selecionada: ${variant}`);
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

.btn-critical:hover {
  border-color: #eab308;
}
</style>
