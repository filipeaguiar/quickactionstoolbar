<template>
  <section class="profile-selector">
    <div class="field">
      <label for="profile-select">Perfil:</label>
      <select id="profile-select" :value="selectedProfileId || ''" @change="selectProfile">
        <option value="" disabled>Selecione um perfil</option>
        <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
          {{ profile.name }}
        </option>
      </select>
      <button v-if="isOwner" class="btn-small" @click="createProfile">+ Novo</button>
      <button
        v-if="isOwner && selectedProfileId"
        class="btn-small danger"
        @click="$emit('delete-profile', selectedProfileId)"
      >
        Excluir
      </button>
    </div>

    <div v-if="isOwner && selectedProfileId" class="assignment-section">
      <h3>Atribuir perfil selecionado</h3>
      <div class="field">
        <select :value="selectedAssignment" @change="assignSelectedProfile">
          <option value="">Selecione um jogador</option>
          <option
            v-for="candidate in assignmentCandidates"
            :key="candidate.value || candidate.label"
            :value="candidate.value"
            :disabled="candidate.disabled"
          >
            {{ candidate.label }}
          </option>
        </select>
      </div>
      <small v-if="!assignableCandidates.length" class="help-text">
        O jogador precisa abrir a extensão nesta sala para solicitar acesso ao Firebase.
      </small>
    </div>

    <template v-if="isOwner">
      <div v-if="joinRequests.length" class="assignment-section">
        <h3>Solicitações pendentes</h3>
        <div v-for="request in joinRequests" :key="request.uid" class="assignment-row">
          <span>
            {{ request.playerName }}
            <small>{{ onlinePlayerIds.has(request.owlbearPlayerId) ? 'online' : 'offline' }}</small>
          </span>
          <select :value="approvalProfiles[request.uid] || ''" @change="setApprovalProfile(request.uid, $event)">
            <option value="" disabled>Escolha o perfil</option>
            <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
              {{ profile.name }}
            </option>
          </select>
          <button
            class="btn-small"
            :disabled="!approvalProfiles[request.uid]"
            @click="approve(request)"
          >
            Aprovar
          </button>
        </div>
      </div>

      <div v-if="members.length" class="assignment-section">
        <h3>Jogadores associados</h3>
        <div v-for="member in members" :key="member.uid" class="assignment-row">
          <span>{{ member.playerName }}</span>
          <select :value="member.profileId" @change="reassign(member.uid, $event)">
            <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
              {{ profile.name }}
            </option>
          </select>
          <button class="btn-small danger" @click="$emit('revoke', member.uid)">Revogar</button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import type { Player } from "@owlbear-rodeo/sdk";
import type { CharacterActionProfile } from "@/types/action";
import type { JoinRequest, RoomMember } from "@/types/firebase";

const props = defineProps<{
  profiles: CharacterActionProfile[];
  selectedProfileId: string | null;
  isOwner: boolean;
  joinRequests: JoinRequest[];
  members: RoomMember[];
  players: Player[];
  ownerUid: string;
  currentPlayerId: string;
}>();

const emit = defineEmits<{
  (event: "select-profile", id: string): void;
  (event: "create-profile", name: string): void;
  (event: "delete-profile", id: string): void;
  (event: "approve", value: { request: JoinRequest; profileId: string }): void;
  (event: "reassign", value: { uid: string; profileId: string }): void;
  (event: "revoke", uid: string): void;
}>();

const approvalProfiles = reactive<Record<string, string>>({});
const onlinePlayerIds = computed(() => new Set(props.players.map((player) => player.id)));
const assignmentCandidates = computed(() => {
  const candidates = props.players.map((player) => {
    const member = props.members.find((item) => item.owlbearPlayerId === player.id);
    if (member) {
      return { value: `member:${member.uid}`, label: player.name, disabled: false };
    }
    const request = props.joinRequests.find((item) => item.owlbearPlayerId === player.id);
    if (request) {
      return { value: `request:${request.uid}`, label: `${player.name} (aprovar)`, disabled: false };
    }
    if (player.id === props.currentPlayerId && props.ownerUid) {
      return { value: `owner:${props.ownerUid}`, label: `${player.name} (GM)`, disabled: false };
    }
    return { value: "", label: `${player.name} (aguardando acesso)`, disabled: true };
  });

  for (const request of props.joinRequests) {
    if (!props.players.some((player) => player.id === request.owlbearPlayerId)) {
      candidates.push({
        value: `request:${request.uid}`,
        label: `${request.playerName} (offline, aprovar)`,
        disabled: false,
      });
    }
  }
  return candidates;
});
const assignableCandidates = computed(() =>
  assignmentCandidates.value.filter((candidate) => !candidate.disabled)
);
const selectedAssignment = computed(() => {
  const assigned = props.members.find((member) => member.profileId === props.selectedProfileId);
  return assigned ? `member:${assigned.uid}` : "";
});

function selectProfile(event: Event) {
  emit("select-profile", (event.target as HTMLSelectElement).value);
}

function createProfile() {
  const name = prompt("Nome do novo perfil:")?.trim();
  if (name) emit("create-profile", name);
}

function assignSelectedProfile(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (!value || !props.selectedProfileId) return;
  const [kind, uid] = value.split(":", 2);
  if (kind === "request") {
    const request = props.joinRequests.find((item) => item.uid === uid);
    if (request) emit("approve", { request, profileId: props.selectedProfileId });
  } else if (kind === "owner") {
    const player = props.players.find((item) => item.id === props.currentPlayerId);
    if (player) {
      emit("approve", {
        request: {
          uid,
          owlbearPlayerId: player.id,
          playerName: player.name,
          requestedAt: new Date().toISOString(),
        },
        profileId: props.selectedProfileId,
      });
    }
  } else if (kind === "member") {
    emit("reassign", { uid, profileId: props.selectedProfileId });
  }
}

function setApprovalProfile(uid: string, event: Event) {
  approvalProfiles[uid] = (event.target as HTMLSelectElement).value;
}

function approve(request: JoinRequest) {
  const profileId = approvalProfiles[request.uid];
  if (profileId) emit("approve", { request, profileId });
}

function reassign(uid: string, event: Event) {
  emit("reassign", { uid, profileId: (event.target as HTMLSelectElement).value });
}
</script>

<style scoped>
.profile-selector,
.assignment-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.profile-selector {
  padding: 10px;
  border-radius: 4px;
  background: #333;
}
.field,
.assignment-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.field select,
.assignment-row select {
  min-width: 0;
  flex: 1 1 140px;
  padding: 5px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #222;
  color: #fff;
}
.assignment-section {
  padding-top: 8px;
  border-top: 1px solid #555;
}
.assignment-section h3 {
  margin: 0;
  font-size: 13px;
}
.assignment-row > span {
  flex: 1 1 120px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.assignment-row small,
.help-text {
  color: #94a3b8;
}
.help-text {
  font-size: 11px;
}
.btn-small {
  padding: 5px 8px;
  border: 0;
  border-radius: 4px;
  background: #4caf50;
  color: #fff;
  cursor: pointer;
}
.btn-small.danger {
  background: #b91c1c;
}
.btn-small:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>
