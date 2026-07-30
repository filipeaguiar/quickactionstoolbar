<template>
  <div class="variable-editor">
    <h3>Variáveis de Perfil</h3>
    <p class="help-text">Use as variáveis em expressões com o formato <code v-pre>{{nome}}</code>.</p>
    
    <div class="vars-list">
      <div v-for="(value, key) in profile.variables" :key="key" class="var-item">
        <input :value="key" readonly class="key-input" />
        <span class="equals">=</span>
        <input type="number" :value="value" @change="updateVar(String(key), $event)" class="val-input" />
        <button @click="removeVar(String(key))" class="btn-icon text-danger">🗑</button>
      </div>
    </div>

    <div class="add-var">
      <input v-model="newKey" placeholder="Nome (ex: proficiency)" class="new-key" />
      <input v-model.number="newVal" type="number" placeholder="Valor" class="new-val" />
      <button @click="addVar" class="btn-primary">+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CharacterActionProfile } from '@/types/action';

const props = defineProps<{
  profile: CharacterActionProfile;
}>();

const emit = defineEmits(['update:profile']);

const newKey = ref('');
const newVal = ref(0);

function updateVar(key: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const numValue = Number(target.value);
  if (isNaN(numValue)) return;
  
  const updatedProfile = { ...props.profile };
  updatedProfile.variables = { ...updatedProfile.variables, [key]: numValue };
  emit('update:profile', updatedProfile);
}

function addVar() {
  const k = newKey.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!k) return;
  
  const updatedProfile = { ...props.profile };
  updatedProfile.variables = { ...updatedProfile.variables, [k]: newVal.value };
  emit('update:profile', updatedProfile);
  
  newKey.value = '';
  newVal.value = 0;
}

function removeVar(key: string) {
  const updatedProfile = { ...props.profile };
  const vars = { ...updatedProfile.variables };
  delete vars[key];
  updatedProfile.variables = vars;
  emit('update:profile', updatedProfile);
}
</script>

<style scoped>
.variable-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.help-text {
  font-size: 12px;
  color: #aaa;
  margin: 0 0 10px 0;
}
.vars-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.var-item {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #2a2a2a;
  padding: 5px;
  border-radius: 4px;
}
.key-input {
  flex: 2;
  background: transparent;
  border: none;
  color: #4CAF50;
  font-family: monospace;
}
.equals {
  color: #888;
}
.val-input {
  flex: 1;
  background: #111;
  border: 1px solid #444;
  color: white;
  padding: 4px;
  border-radius: 4px;
}
.add-var {
  display: flex;
  gap: 5px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #444;
}
.new-key {
  flex: 2;
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 6px;
  border-radius: 4px;
}
.new-val {
  flex: 1;
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 6px;
  border-radius: 4px;
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
  cursor: pointer;
}
.text-danger {
  color: #e74c3c;
}
</style>
