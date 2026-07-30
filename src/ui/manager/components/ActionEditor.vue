<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <header>
        <h3>Editar Ação</h3>
        <button @click="$emit('close')" class="btn-icon text-danger">✖</button>
      </header>
      
      <div class="form-group">
        <label>Nome:</label>
        <input v-model="localAction.name" type="text" />
      </div>

      <div class="form-group">
        <label>Rótulo Curto:</label>
        <input v-model="localAction.shortLabel" type="text" maxlength="12" />
      </div>

      <div class="form-group">
        <label>Ícone (RPG Awesome ID):</label>
        <div class="icon-selector">
          <i :class="['ra', `ra-${localAction.icon}`]"></i>
          <select v-model="localAction.icon">
            <option v-for="icon in CURATED_ICONS" :key="icon" :value="icon">
              {{ icon }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Tipo (Kind):</label>
        <select v-model="localAction.kind">
          <option value="ATTACK">Ataque</option>
          <option value="DAMAGE">Dano</option>
          <option value="SAVE">Resistência (Save)</option>
          <option value="CHECK">Teste (Check)</option>
          <option value="HEALING">Cura</option>
          <option value="UTILITY">Utilidade</option>
          <option value="CUSTOM">Personalizado</option>
        </select>
      </div>

      <div class="steps-section">
        <h4>Passos de Rolagem</h4>
        <div v-for="(step, index) in localAction.sequence.steps" :key="step.id" class="step-card">
          <div class="step-field step-field-wide">
            <label>Rótulo</label>
            <input v-model="step.label" placeholder="Ex.: Dano Cortante" />
          </div>
          <div class="step-field step-field-wide">
            <label>Expressão</label>
            <input v-model="step.expression" placeholder="Ex.: 1d8 + {{strength}}" />
          </div>
          <div class="step-field">
            <label>Finalidade</label>
            <select v-model="step.purpose" @change="ensureStepDefaults(step)">
              <option value="ATTACK">Ataque</option>
              <option value="DAMAGE">Dano</option>
              <option value="HEALING">Cura</option>
              <option value="CHECK">Teste</option>
              <option value="SAVE">Resistência</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <div class="step-field">
            <label>Executar</label>
            <select v-model="step.execute">
              <option value="ALWAYS">Sempre</option>
              <option value="ON_HIT">Ao acertar</option>
              <option value="ON_CRITICAL">Somente no crítico</option>
            </select>
          </div>
          <div v-if="step.purpose === 'DAMAGE'" class="step-field">
            <label>No crítico</label>
            <select v-model="step.criticalBehavior">
              <option value="DOUBLE_DICE">Duplicar dados</option>
              <option value="NONE">Não alterar</option>
            </select>
          </div>
          <button @click="removeStep(index)" class="btn-icon step-delete text-danger" aria-label="Remover passo">🗑</button>
        </div>
        <button @click="addStep" class="btn-secondary">+ Adicionar Passo</button>
      </div>

      <footer class="modal-actions">
        <button @click="$emit('close')" class="btn-secondary">Cancelar</button>
        <button @click="save" class="btn-primary">Salvar Ação</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ActionDefinition, RollStep } from '@/types/action';
import { CURATED_ICONS } from '@/utils/iconResolver';

const props = defineProps<{
  action: ActionDefinition;
}>();

const emit = defineEmits(['save', 'close']);

function editableCopy(action: ActionDefinition): ActionDefinition {
  const copy = JSON.parse(JSON.stringify(action)) as ActionDefinition;
  for (const step of copy.sequence.steps) ensureStepDefaults(step);
  return copy;
}

const localAction = ref<ActionDefinition>(editableCopy(props.action));

watch(() => props.action, (newAction) => {
  localAction.value = editableCopy(newAction);
}, { deep: true });

function ensureStepDefaults(step: RollStep) {
  if (step.purpose === "DAMAGE" && !step.criticalBehavior) {
    step.criticalBehavior = "DOUBLE_DICE";
  }
}

function addStep() {
  const hasAttack = localAction.value.sequence.steps.some((step) => step.purpose === "ATTACK");
  const step: RollStep = hasAttack
    ? {
        id: "step-" + Date.now(),
        label: "Dano",
        purpose: "DAMAGE",
        expression: "1d6",
        visibility: "PUBLIC",
        execute: "ON_HIT",
        criticalBehavior: "DOUBLE_DICE",
      }
    : {
        id: "step-" + Date.now(),
        label: "Ataque",
        purpose: "ATTACK",
        expression: "1d20",
        visibility: "PUBLIC",
        execute: "ALWAYS",
      };
  localAction.value.sequence.steps.push(step);
}

function removeStep(index: number) {
  localAction.value.sequence.steps.splice(index, 1);
}

function save() {
  for (const step of localAction.value.sequence.steps) ensureStepDefaults(step);
  emit('save', localAction.value);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  overflow: hidden;
  z-index: 100;
}
.modal-content {
  box-sizing: border-box;
  background: #222;
  width: min(760px, 100%);
  max-width: 100%;
  max-height: calc(100vh - 20px);
  min-width: 0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  padding: 15px;
  overflow-x: hidden;
  overflow-y: auto;
}
.modal-content * {
  box-sizing: border-box;
  min-width: 0;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.form-group {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
input, select {
  width: 100%;
  max-width: 100%;
  padding: 8px;
  background: #333;
  border: 1px solid #555;
  color: white;
  border-radius: 4px;
}
.icon-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon-selector i {
  font-size: 24px;
}
.steps-section {
  margin-top: 15px;
  border-top: 1px solid #444;
  padding-top: 10px;
}
.step-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  gap: 8px;
  margin-bottom: 10px;
  background: #2d2d2d;
  padding: 10px;
  border-radius: 4px;
}
.step-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.step-field-wide {
  grid-column: span 2;
}
.step-field label {
  color: #bbb;
  font-size: 11px;
}
.step-delete {
  align-self: end;
  padding: 8px;
}
.modal-actions {
  position: sticky;
  bottom: -15px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin: 20px -15px -15px;
  padding: 12px 15px;
  background: #222;
  border-top: 1px solid #444;
}
.btn-primary {
  background: #4CAF50;
  color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;
}
.btn-secondary {
  background: #555;
  color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;
}
.btn-icon { background: none; border: none; color: white; cursor: pointer; font-size: 16px; }
.text-danger { color: #e74c3c; }

@media (max-width: 520px) {
  .modal-overlay {
    align-items: stretch;
    padding: 0;
  }
  .modal-content {
    width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  .step-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .step-field,
  .step-field-wide {
    grid-column: 1;
  }
  .step-delete {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
