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
          <input v-model="step.label" placeholder="Rótulo (ex: Dano Cortante)" />
          <input v-model="step.expression" placeholder="Expressão (ex: 1d8 + {{strength}})" />
          <button @click="removeStep(index)" class="btn-icon text-danger">🗑</button>
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
import { ActionDefinition } from '@/types/action';
import { CURATED_ICONS } from '@/utils/iconResolver';

const props = defineProps<{
  action: ActionDefinition;
}>();

const emit = defineEmits(['save', 'close']);

const localAction = ref<ActionDefinition>(JSON.parse(JSON.stringify(props.action)));

watch(() => props.action, (newAction) => {
  localAction.value = JSON.parse(JSON.stringify(newAction));
}, { deep: true });

function addStep() {
  localAction.value.sequence.steps.push({
    id: "step-" + Date.now(),
    label: "Nova Rolagem",
    purpose: "OTHER",
    expression: "1d20",
    visibility: "PUBLIC",
    execute: "ALWAYS"
  });
}

function removeStep(index: number) {
  localAction.value.sequence.steps.splice(index, 1);
}

function save() {
  emit('save', localAction.value);
}
</script>

<style scoped>
.modal-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.modal-content {
  background: #222;
  width: 90%;
  max-height: 90%;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  padding: 15px;
  overflow-y: auto;
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
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
  background: #333;
  padding: 8px;
  border-radius: 4px;
}
.step-card input {
  flex: 1;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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
</style>
