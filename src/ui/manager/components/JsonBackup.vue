<template>
  <div class="json-backup">
    <h3>Backup e Restauração</h3>
    <p class="help-text">Você pode exportar ou importar dados no formato JSON. Arquivos importados serão validados estritamente para evitar corrompimento.</p>

    <div class="actions">
      <button @click="exportProfile" class="btn-secondary">Exportar Perfil Atual</button>
      <button @click="exportRoom" class="btn-secondary">Exportar Toda a Sala</button>
    </div>

    <div class="import-section">
      <h4>Importar Sala</h4>
      <input type="file" accept=".json" @change="importRoom" />
      <div v-if="importError" class="error-msg">{{ importError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RoomQuickActionsData } from '@/types/storage';
import { CharacterActionProfile, CharacterActionProfileSchema } from '@/types/action';

const props = defineProps<{
  roomData: RoomQuickActionsData;
  profile: CharacterActionProfile;
}>();

const emit = defineEmits(['import:room']);
const importError = ref('');

function exportJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportProfile() {
  exportJson(props.profile, `${props.profile.name}-actions.json`);
}

function exportRoom() {
  exportJson(props.roomData, "quick-actions-room.json");
}

function importRoom(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  importError.value = '';
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      
      // Validação básica de estrutura da sala
      if (parsed.schemaVersion !== 1 || !parsed.profiles) {
        throw new Error("Formato de sala inválido. Requer schemaVersion 1 e objeto profiles.");
      }

      // Validar perfis com Zod
      for (const [key, profileData] of Object.entries(parsed.profiles)) {
        const result = CharacterActionProfileSchema.safeParse(profileData);
        if (!result.success) {
          throw new Error(`Perfil '${key}' inválido: ${result.error.issues[0].message}`);
        }
      }

      emit('import:room', parsed);
      alert("Sala importada com sucesso!");
    } catch (err: any) {
      importError.value = err.message || "Erro desconhecido ao ler JSON.";
    }
  };
  
  reader.readAsText(file);
}
</script>

<style scoped>
.json-backup {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.help-text {
  font-size: 12px;
  color: #aaa;
  margin: 0;
}
.actions {
  display: flex;
  gap: 10px;
}
.btn-secondary {
  background: #555;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.import-section {
  border-top: 1px solid #444;
  padding-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.error-msg {
  color: #e74c3c;
  font-size: 12px;
  background: rgba(231, 76, 60, 0.1);
  padding: 8px;
  border-radius: 4px;
}
</style>
