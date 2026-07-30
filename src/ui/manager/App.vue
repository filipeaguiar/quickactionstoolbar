<template>
  <div class="manager-container">
    <header class="header">
      <h2>Quick Actions Manager</h2>
      <span v-if="isGm" class="badge">GM</span>
    </header>

    <main class="main-content">
      <ProfileSelector
        v-if="roomData"
        :roomData="roomData"
        :currentUserId="currentUserId"
        :isGm="isGm"
        @update:roomData="saveRoomData"
        @select-profile="selectedProfileId = $event"
      />

      <div class="tabs" v-if="selectedProfileId">
        <button :class="{ active: currentTab === 'actions' }" @click="currentTab = 'actions'">Ações</button>
        <button :class="{ active: currentTab === 'variables' }" @click="currentTab = 'variables'">Variáveis</button>
        <button :class="{ active: currentTab === 'backup' }" @click="currentTab = 'backup'">Backup</button>
      </div>

      <div class="tab-content" v-if="selectedProfile">
        <ActionList
          v-if="currentTab === 'actions'"
          :profile="selectedProfile"
          @edit-action="editAction"
          @update:profile="updateProfile"
        />
        <VariableEditor
          v-if="currentTab === 'variables'"
          :profile="selectedProfile"
          @update:profile="updateProfile"
        />
        <JsonBackup
          v-if="currentTab === 'backup' && roomData"
          :roomData="roomData"
          :profile="selectedProfile"
          @import:room="saveRoomData"
        />
      </div>

      <ActionEditor
        v-if="editingAction"
        :action="editingAction"
        @save="saveAction"
        @close="editingAction = null"
      />
    </main>

    <footer class="footer">
      <StorageDiagnostic :roomData="roomData" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { getRoomData, saveRoomData as apiSaveRoomData } from "@/storage/roomProfileRepository";
import { RoomQuickActionsData } from "@/types/storage";
import { ActionDefinition } from "@/types/action";
import ProfileSelector from "./components/ProfileSelector.vue";
import ActionList from "./components/ActionList.vue";
import ActionEditor from "./components/ActionEditor.vue";
import VariableEditor from "./components/VariableEditor.vue";
import JsonBackup from "./components/JsonBackup.vue";
import StorageDiagnostic from "./components/StorageDiagnostic.vue";

const roomData = ref<RoomQuickActionsData | null>(null);
const currentUserId = ref("");
const isGm = ref(false);
const selectedProfileId = ref<string | null>(null);
const currentTab = ref("actions");
const editingAction = ref<ActionDefinition | null>(null);

const selectedProfile = computed(() => {
  if (!roomData.value || !selectedProfileId.value) return null;
  return roomData.value.profiles[selectedProfileId.value] || null;
});

async function loadData() {
  if (!OBR.isReady) {
    await new Promise<void>((resolve) => OBR.onReady(() => resolve()));
  }
  const role = await OBR.player.getRole();
  isGm.value = role === "GM";
  currentUserId.value = OBR.player.id;
  roomData.value = await getRoomData();

  if (roomData.value && roomData.value.playerAssignments[currentUserId.value]) {
    selectedProfileId.value = roomData.value.playerAssignments[currentUserId.value];
  }
}

async function saveRoomData(newData: RoomQuickActionsData) {
  const result = await apiSaveRoomData(newData);
  if (result.success) {
    roomData.value = newData;
  }
}

function updateProfile(updatedProfile: any) {
  if (!roomData.value) return;
  const newData = { ...roomData.value };
  newData.profiles[updatedProfile.id] = updatedProfile;
  saveRoomData(newData);
}

function editAction(action: ActionDefinition) {
  editingAction.value = { ...action };
}

function saveAction(action: ActionDefinition) {
  if (!selectedProfile.value) return;
  const updatedProfile = { ...selectedProfile.value };
  const idx = updatedProfile.actions.findIndex(a => a.id === action.id);
  if (idx >= 0) {
    updatedProfile.actions[idx] = action;
  } else {
    updatedProfile.actions.push(action);
  }
  updateProfile(updatedProfile);
  editingAction.value = null;
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.manager-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: sans-serif;
  background-color: #1e1e1e;
  color: #fff;
}
.header {
  padding: 10px;
  background-color: #2c2c2c;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header h2 {
  margin: 0;
  font-size: 16px;
}
.badge {
  background-color: #e74c3c;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.tabs {
  display: flex;
  gap: 5px;
  margin-top: 10px;
  margin-bottom: 10px;
}
.tabs button {
  background-color: #333;
  color: #ccc;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
}
.tabs button.active {
  background-color: #4CAF50;
  color: white;
}
.footer {
  padding: 10px;
  background-color: #2c2c2c;
  border-top: 1px solid #444;
}
</style>
