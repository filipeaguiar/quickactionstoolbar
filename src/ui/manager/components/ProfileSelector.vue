<template>
  <div class="profile-selector">
    <div class="field">
      <label>Seletor de Perfil:</label>
      <select v-model="selectedId" @change="emitSelect">
        <option value="" disabled>Selecione um perfil</option>
        <option v-for="p in profilesList" :key="p.id" :value="p.id">
          {{ p.name }}
        </option>
      </select>
      <button v-if="isGm || profilesList.length === 0" @click="createProfile" class="btn-small">+ Novo Perfil</button>
    </div>
    
    <div class="field" v-if="isGm && selectedProfile">
      <label>Atribuído a:</label>
      <select v-model="assignedPlayer" @change="updateAssignment">
        <option value="">Nenhum (Somente GM)</option>
        <option v-for="player in availablePlayers" :key="player.id" :value="player.id">
          {{ player.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import OBR from '@owlbear-rodeo/sdk';
import { RoomQuickActionsData } from '@/types/storage';

const props = defineProps<{
  roomData: RoomQuickActionsData;
  currentUserId: string;
  isGm: boolean;
}>();

const emit = defineEmits(['update:roomData', 'select-profile']);

const selectedId = ref('');
const assignedPlayer = ref('');
const availablePlayers = ref<any[]>([]);

const profilesList = computed(() => {
  return Object.values(props.roomData.profiles);
});

const selectedProfile = computed(() => {
  if (!selectedId.value) return null;
  return props.roomData.profiles[selectedId.value];
});

watch(selectedId, (newId) => {
  if (newId) {
    const ownerId = Object.keys(props.roomData.playerAssignments).find(
      key => props.roomData.playerAssignments[key] === newId
    );
    assignedPlayer.value = ownerId || '';
  }
});

function emitSelect() {
  emit('select-profile', selectedId.value);
}

function createProfile() {
  const name = prompt("Nome do novo perfil:");
  if (!name) return;
  const id = "profile-" + Date.now();
  const newData = { ...props.roomData };
  newData.profiles[id] = {
    id,
    name,
    ownerPlayerId: null,
    ownerPlayerName: null,
    systemId: "dnd5e-2024",
    variables: {},
    actions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: props.currentUserId
  };
  emit('update:roomData', newData);
  selectedId.value = id;
  emitSelect();
}

function updateAssignment() {
  const newData = { ...props.roomData };
  
  // Remover atribuição anterior
  const oldOwner = Object.keys(newData.playerAssignments).find(
    key => newData.playerAssignments[key] === selectedId.value
  );
  if (oldOwner) {
    delete newData.playerAssignments[oldOwner];
  }

  // Setar nova
  if (assignedPlayer.value) {
    newData.playerAssignments[assignedPlayer.value] = selectedId.value;
  }
  
  emit('update:roomData', newData);
}

onMounted(async () => {
  if (props.isGm && OBR.isReady) {
    availablePlayers.value = await OBR.party.getPlayers();
    OBR.party.onChange((players) => {
      availablePlayers.value = players;
    });
  }
});
</script>

<style scoped>
.profile-selector {
  background: #333;
  padding: 10px;
  border-radius: 4px;
}
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}
select {
  padding: 4px;
  border-radius: 4px;
  background: #222;
  color: white;
  border: 1px solid #555;
}
.btn-small {
  padding: 4px 8px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
