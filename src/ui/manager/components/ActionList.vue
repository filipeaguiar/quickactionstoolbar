<template>
  <div class="action-list">
    <div class="action-header">
      <h3>Lista de Ações ({{ profile.actions.length }})</h3>
      <button @click="createAction" class="btn-primary">+ Nova Ação</button>
    </div>
    <ul class="actions">
      <li v-for="(action, index) in profile.actions" :key="action.id" class="action-item">
        <div class="action-info">
          <i :class="['ra', `ra-${action.icon}`]"></i>
          <span>{{ action.name }}</span>
          <small class="kind-tag">{{ action.kind }}</small>
        </div>
        <div class="action-controls">
          <button @click="$emit('edit-action', action)" class="btn-icon">✎</button>
          <button @click="deleteAction(index)" class="btn-icon text-danger">🗑</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { CharacterActionProfile, ActionDefinition } from '@/types/action';

const props = defineProps<{
  profile: CharacterActionProfile;
}>();

const emit = defineEmits(['update:profile', 'edit-action']);

function createAction() {
  const newAction: ActionDefinition = {
    id: "action-" + Date.now(),
    name: "Nova Ação",
    icon: "crossed-swords",
    kind: "ATTACK",
    enabled: true,
    sortOrder: props.profile.actions.length,
    systemId: "dnd5e-2024",
    sequence: {
      version: 1,
      steps: [
        {
          id: "step-" + Date.now(),
          label: "Ataque",
          purpose: "ATTACK",
          expression: "1d20",
          visibility: "PUBLIC",
          execute: "ALWAYS"
        }
      ],
      stopOnError: true
    },
    variantPolicy: {
      allowNormal: true,
      allowAdvantage: true,
      allowDisadvantage: true,
      allowCritical: true,
      customVariants: []
    },
    tags: []
  };
  emit('edit-action', newAction);
}

function deleteAction(index: number) {
  if (confirm("Tem certeza que deseja remover esta ação?")) {
    const updatedProfile = { ...props.profile };
    updatedProfile.actions.splice(index, 1);
    emit('update:profile', updatedProfile);
  }
}
</script>

<style scoped>
.action-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  gap: 10px;
}
.action-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.actions {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.action-item {
  display: flex;
  justify-content: space-between;
  min-width: 0;
  gap: 8px;
  background: #2a2a2a;
  padding: 8px 12px;
  border-radius: 4px;
  align-items: center;
}
.action-info {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}
.action-info span {
  overflow-wrap: anywhere;
}
.kind-tag {
  background: #444;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  color: #bbb;
}
.action-controls {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
}
.btn-primary {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-icon {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}
.text-danger {
  color: #e74c3c;
}
</style>
