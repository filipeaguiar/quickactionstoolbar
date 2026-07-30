<template>
  <div class="storage-diagnostic">
    <div class="header-info">
      <span>Capacidade da Sala</span>
      <span :class="statusClass">{{ percentage }}% ({{ kbValue }} KB / 16 KB)</span>
    </div>
    
    <div class="progress-bar-container">
      <div class="progress-bar" :style="{ width: percentage + '%' }" :class="statusClass"></div>
    </div>
    
    <div class="details">
      <small>Total: {{ totalBytes }} b</small>
      <small>Quick Actions: {{ extensionBytes }} b</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RoomQuickActionsData } from '@/types/storage';
import { jsonUtf8Size, DOCUMENTED_LIMIT, WARNING_THRESHOLD, HARD_LOCK_THRESHOLD } from '@/storage/metadataSize';

const props = defineProps<{
  roomData: RoomQuickActionsData | null;
}>();

const extensionBytes = computed(() => {
  if (!props.roomData) return 0;
  return jsonUtf8Size(props.roomData);
});

// Nota: idealmente leríamos o metadata completo da room para obter o tamanho real.
// Para este componente de interface, usamos os bytes da extensão como aproximação,
// ou poderíamos injetar currentRoomMetadata total no props.
const totalBytes = computed(() => extensionBytes.value);

const percentage = computed(() => {
  return Math.min(100, Math.round((totalBytes.value / DOCUMENTED_LIMIT) * 100));
});

const kbValue = computed(() => {
  return (totalBytes.value / 1024).toFixed(1);
});

const statusClass = computed(() => {
  if (totalBytes.value >= HARD_LOCK_THRESHOLD) return 'status-blocked';
  if (totalBytes.value >= WARNING_THRESHOLD) return 'status-warning';
  return 'status-ok';
});
</script>

<style scoped>
.storage-diagnostic {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.header-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.progress-bar-container {
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}
.status-ok { color: #4CAF50; }
.status-warning { color: #f39c12; }
.status-blocked { color: #e74c3c; }

.progress-bar.status-ok { background: #4CAF50; }
.progress-bar.status-warning { background: #f39c12; }
.progress-bar.status-blocked { background: #e74c3c; }

.details {
  display: flex;
  justify-content: space-between;
  color: #888;
  font-size: 10px;
}
</style>
