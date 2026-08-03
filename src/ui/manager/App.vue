<template>
  <div class="manager-container">
    <header class="header">
      <h2>Quick Actions Manager</h2>
      <span v-if="isGm" class="badge">GM</span>
    </header>

    <main class="main-content">
      <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
      <p v-else-if="busy" class="status-card">Sincronizando com Firebase…</p>

      <section v-if="status === 'OWNER_SIGN_IN_REQUIRED'" class="status-card">
        <h3>Identificação do proprietário</h3>
        <p>Entre com uma conta Google permanente para administrar esta sala.</p>
        <button class="btn-primary" :disabled="busy" @click="signInOwner">Entrar com Google</button>
      </section>

      <section v-else-if="status === 'WORKSPACE_NOT_INITIALIZED'" class="status-card">
        <h3>Sala ainda não configurada</h3>
        <p v-if="isGm">Crie o workspace Firebase vazio para começar.</p>
        <p v-else>O GM ainda precisa configurar as ações desta sala.</p>
        <button v-if="isGm" class="btn-primary" :disabled="busy" @click="initializeWorkspace">
          Criar workspace
        </button>
      </section>

      <section v-else-if="status === 'AWAITING_APPROVAL'" class="status-card">
        <h3>Aguardando associação</h3>
        <p>O GM precisa aprovar sua entrada e selecionar um perfil.</p>
      </section>

      <section v-else-if="status === 'AUTHORIZATION_DENIED'" class="status-card error">
        <h3>Acesso negado</h3>
        <p>Esta sala pertence a outra conta Firebase.</p>
      </section>

      <section v-else-if="status === 'BACKEND_ERROR'" class="status-card error">
        <h3>Firebase indisponível</h3>
        <p>Verifique a conexão e tente novamente.</p>
        <button class="btn-secondary" @click="loadData">Tentar novamente</button>
      </section>

      <section v-if="isOwner && legacyData" class="legacy-card">
        <h3>Dados antigos encontrados</h3>
        <p>Os perfis antigos não serão importados. Exporte o JSON antes de liberar o metadata.</p>
        <div class="button-row">
          <button class="btn-secondary" @click="exportLegacy">Exportar JSON legado</button>
          <button class="btn-danger" :disabled="!legacyExport || busy" @click="discardLegacy">
            Descartar metadata antigo
          </button>
        </div>
      </section>

      <template v-if="canShowWorkspace">
        <ProfileSelector
          :profiles="profiles"
          :selectedProfileId="selectedProfileId"
          :isOwner="isOwner"
          :joinRequests="joinRequests"
          :members="members"
          :players="players"
          :ownerUid="session?.uid || ''"
          :currentPlayerId="currentUserId"
          @select-profile="selectedProfileId = $event"
          @create-profile="createProfile"
          @delete-profile="deleteProfile"
          @approve="approveMember"
          @reassign="reassignMember"
          @revoke="revokeMember"
        />

        <div v-if="isOwner && selectedProfileId" class="tabs">
          <button :class="{ active: currentTab === 'actions' }" @click="currentTab = 'actions'">
            Ações
          </button>
          <button :class="{ active: currentTab === 'variables' }" @click="currentTab = 'variables'">
            Variáveis
          </button>
        </div>

        <div v-if="isOwner && selectedProfile" class="tab-content">
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
        </div>

        <section v-else-if="!isOwner && selectedProfile" class="status-card">
          <h3>{{ selectedProfile.name }}</h3>
          <p>Perfil associado. As ações estão disponíveis na ferramenta Ações Rápidas.</p>
          <ul class="read-only-actions">
            <li v-for="action in selectedProfile.actions" :key="action.id">{{ action.name }}</li>
          </ul>
        </section>

        <ActionEditor
          v-if="isOwner && editingAction"
          :action="editingAction"
          @save="saveAction"
          @close="editingAction = null"
        />
      </template>
    </main>

    <footer class="footer">
      <span>{{ statusLabel }}</span>
      <button v-if="session" class="link-button" @click="signOutCurrent">Sair</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import OBR, { type Player } from "@owlbear-rodeo/sdk";
import { FirebaseAuthSessionService, type FirebaseSession } from "@/integrations/firebase/authSession";
import { getFirebaseServices, nowIso } from "@/integrations/firebase/client";
import { WorkspaceOwnershipService } from "@/core/workspaceOwnership";
import { FirestoreWorkspaceRepository, FirestoreProfileActionRepository } from "@/storage/firebase/firestoreRepositories";
import { FirestoreMembershipRepository } from "@/storage/firebase/firestoreMembershipRepository";
import { FirestoreRollHistoryRepository } from "@/storage/firebase/firestoreRollHistoryRepository";
import { LegacyMetadataRetirementService } from "@/storage/firebase/legacyRetirement";
import type { LegacyDataExport, RepositoryUnsubscribe } from "@/storage/firebase/repositories";
import type { ActionDefinition, CharacterActionProfile } from "@/types/action";
import type { FirestoreProfile, JoinRequest, RoomMember, RoomWorkspace } from "@/types/firebase";
import type { RoomQuickActionsData } from "@/types/storage";
import ProfileSelector from "./components/ProfileSelector.vue";
import ActionList from "./components/ActionList.vue";
import ActionEditor from "./components/ActionEditor.vue";
import VariableEditor from "./components/VariableEditor.vue";

type ManagerStatus =
  | "LOADING"
  | "OWNER_SIGN_IN_REQUIRED"
  | "WORKSPACE_NOT_INITIALIZED"
  | "LEGACY_DATA_DETECTED"
  | "AWAITING_APPROVAL"
  | "ASSIGNED"
  | "AUTHORIZATION_DENIED"
  | "BACKEND_ERROR";

const status = ref<ManagerStatus>("LOADING");
const busy = ref(false);
const errorMessage = ref("");
const isGm = ref(false);
const currentUserId = ref("");
const session = ref<FirebaseSession | null>(null);
const workspace = ref<RoomWorkspace | null>(null);
const profiles = ref<CharacterActionProfile[]>([]);
const selectedProfileId = ref<string | null>(null);
const currentTab = ref<"actions" | "variables">("actions");
const editingAction = ref<ActionDefinition | null>(null);
const joinRequests = ref<JoinRequest[]>([]);
const members = ref<RoomMember[]>([]);
const players = ref<Player[]>([]);
const legacyData = ref<RoomQuickActionsData | null>(null);
const legacyExport = ref<LegacyDataExport | null>(null);
const unsubscribers: RepositoryUnsubscribe[] = [];

const services = getFirebaseServices();
const authService = new FirebaseAuthSessionService(services.auth);
const workspaceRepository = new FirestoreWorkspaceRepository(services.firestore);
const profileRepository = new FirestoreProfileActionRepository(services.firestore);
const membershipRepository = new FirestoreMembershipRepository(services.firestore);
const historyRepository = new FirestoreRollHistoryRepository(services.firestore);
const ownershipService = new WorkspaceOwnershipService(workspaceRepository);
const legacyService = new LegacyMetadataRetirementService(workspaceRepository);

const isOwner = computed(
  () => Boolean(session.value && workspace.value?.ownerUid === session.value.uid)
);
const selectedProfile = computed(
  () => profiles.value.find((profile) => profile.id === selectedProfileId.value) ?? null
);
const canShowWorkspace = computed(
  () => isOwner.value || (status.value === "ASSIGNED" && selectedProfile.value !== null)
);
const statusLabel = computed(() => {
  const labels: Record<ManagerStatus, string> = {
    LOADING: "Carregando…",
    OWNER_SIGN_IN_REQUIRED: "Login do GM necessário",
    WORKSPACE_NOT_INITIALIZED: "Workspace não inicializado",
    LEGACY_DATA_DETECTED: "Firebase conectado · dados antigos detectados",
    AWAITING_APPROVAL: "Aguardando associação do GM",
    ASSIGNED: "Firebase sincronizado",
    AUTHORIZATION_DENIED: "Acesso negado",
    BACKEND_ERROR: "Erro de sincronização",
  };
  return labels[status.value];
});

function clearSubscriptions() {
  while (unsubscribers.length) unsubscribers.pop()?.();
}

function toEditorProfile(profile: FirestoreProfile, actions: ActionDefinition[]): CharacterActionProfile {
  return {
    ...profile,
    ownerPlayerId: null,
    ownerPlayerName: null,
    actions,
  };
}

function toFirestoreProfile(profile: CharacterActionProfile): FirestoreProfile {
  return {
    id: profile.id,
    name: profile.name,
    systemId: profile.systemId,
    variables: profile.variables,
    createdAt: profile.createdAt,
    updatedAt: nowIso(),
    updatedBy: session.value?.uid ?? profile.updatedBy,
  };
}

async function loadOwnerWorkspace() {
  if (!session.value) return;
  workspace.value = await workspaceRepository.get(OBR.room.id);
  if (!workspace.value) {
    status.value = "WORKSPACE_NOT_INITIALIZED";
    return;
  }
  if (workspace.value.ownerUid !== session.value.uid) {
    status.value = "AUTHORIZATION_DENIED";
    return;
  }

  await refreshOwnerData();
  await historyRepository.deleteExpired(
    OBR.room.id,
    workspace.value.settings.rollRetentionDays
  );
  legacyData.value = await legacyService.detect();
  status.value = legacyData.value ? "LEGACY_DATA_DETECTED" : "ASSIGNED";
  clearSubscriptions();
  unsubscribers.push(
    membershipRepository.subscribeJoinRequests(
      OBR.room.id,
      (requests) => (joinRequests.value = requests),
      handleBackendError
    )
  );
}

async function refreshOwnerData() {
  const storedProfiles = await profileRepository.listProfiles(OBR.room.id);
  profiles.value = await Promise.all(
    storedProfiles.map(async (profile) =>
      toEditorProfile(profile, await profileRepository.listActions(OBR.room.id, profile.id))
    )
  );
  members.value = await membershipRepository.listMembers(OBR.room.id);
  joinRequests.value = await membershipRepository.listJoinRequests(OBR.room.id);
  if (!profiles.value.some((profile) => profile.id === selectedProfileId.value)) {
    selectedProfileId.value = profiles.value[0]?.id ?? null;
  }
}

async function loadPlayerWorkspace(activeSession: FirebaseSession) {
  workspace.value = await workspaceRepository.get(OBR.room.id);
  if (!workspace.value) {
    status.value = "WORKSPACE_NOT_INITIALIZED";
    return;
  }

  const member = await membershipRepository.getMember(OBR.room.id, activeSession.uid);
  if (!member) {
    await membershipRepository.submitJoinRequest(OBR.room.id, {
      uid: activeSession.uid,
      owlbearPlayerId: OBR.player.id,
      playerName: await OBR.player.getName(),
    });
    status.value = "AWAITING_APPROVAL";
  } else {
    await loadAssignedProfile(member);
  }

  clearSubscriptions();
  unsubscribers.push(
    membershipRepository.subscribeMember(
      OBR.room.id,
      activeSession.uid,
      (nextMember) => {
        if (!nextMember) {
          profiles.value = [];
          selectedProfileId.value = null;
          status.value = "AWAITING_APPROVAL";
          return;
        }
        void loadAssignedProfile(nextMember);
      },
      handleBackendError
    )
  );
}

async function loadAssignedProfile(member: RoomMember) {
  const profile = await profileRepository.getProfile(OBR.room.id, member.profileId);
  if (!profile) {
    profiles.value = [];
    selectedProfileId.value = null;
    status.value = "AWAITING_APPROVAL";
    return;
  }
  const actions = await profileRepository.listActions(OBR.room.id, profile.id);
  profiles.value = [toEditorProfile(profile, actions)];
  selectedProfileId.value = profile.id;
  status.value = "ASSIGNED";
}

async function loadData() {
  busy.value = true;
  errorMessage.value = "";
  status.value = "LOADING";
  try {
    if (!OBR.isReady) await new Promise<void>((resolve) => OBR.onReady(resolve));
    isGm.value = (await OBR.player.getRole()) === "GM";
    currentUserId.value = OBR.player.id;
    players.value = await OBR.party.getPlayers();
    const unsubscribeParty = OBR.party.onChange((party) => (players.value = party));
    unsubscribers.push(unsubscribeParty);

    session.value = await authService.waitForInitialState();
    if (isGm.value) {
      if (!session.value || session.value.isAnonymous) {
        status.value = "OWNER_SIGN_IN_REQUIRED";
      } else {
        await loadOwnerWorkspace();
      }
    } else {
      session.value = await authService.ensureAnonymousPlayer();
      await loadPlayerWorkspace(session.value);
    }
  } catch (error) {
    handleBackendError(error);
  } finally {
    busy.value = false;
  }
}

async function signInOwner() {
  await runBusy(async () => {
    session.value = await authService.signInDurableGm();
    await loadOwnerWorkspace();
  });
}

async function initializeWorkspace() {
  if (!session.value) return;
  await runBusy(async () => {
    workspace.value = await ownershipService.initialize(OBR.room.id, "GM", session.value!);
    await loadOwnerWorkspace();
  });
}

async function createProfile(name: string) {
  if (!session.value || !isOwner.value) return;
  await runBusy(async () => {
    const id = `profile-${crypto.randomUUID()}`;
    const timestamp = nowIso();
    await profileRepository.saveProfile(OBR.room.id, {
      id,
      name,
      systemId: "dnd5e-2024",
      variables: {},
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: session.value!.uid,
    });
    await refreshOwnerData();
    selectedProfileId.value = id;
  });
}

async function deleteProfile(profileId: string) {
  if (!isOwner.value || !confirm("Excluir este perfil e todas as suas ações?")) return;
  if (members.value.some((member) => member.profileId === profileId)) {
    errorMessage.value = "Revogue ou reatribua os jogadores antes de excluir este perfil.";
    return;
  }
  await runBusy(async () => {
    await profileRepository.deleteProfile(OBR.room.id, profileId);
    await refreshOwnerData();
  });
}

async function updateProfile(updatedProfile: CharacterActionProfile) {
  if (!isOwner.value) return;
  await runBusy(async () => {
    const previous = profiles.value.find((profile) => profile.id === updatedProfile.id);
    await profileRepository.saveProfile(OBR.room.id, toFirestoreProfile(updatedProfile));
    const nextIds = new Set(updatedProfile.actions.map((action) => action.id));
    for (const removed of previous?.actions.filter((action) => !nextIds.has(action.id)) ?? []) {
      await profileRepository.deleteAction(OBR.room.id, updatedProfile.id, removed.id);
    }
    for (const action of updatedProfile.actions) {
      await profileRepository.saveAction(OBR.room.id, updatedProfile.id, action);
    }
    await refreshOwnerData();
  });
}

function editAction(action: ActionDefinition) {
  if (isOwner.value) {
    editingAction.value = JSON.parse(JSON.stringify(action)) as ActionDefinition;
  }
}

async function saveAction(action: ActionDefinition) {
  if (!selectedProfile.value || !isOwner.value) return;
  await runBusy(async () => {
    await profileRepository.saveAction(OBR.room.id, selectedProfile.value!.id, action);
    await refreshOwnerData();
    editingAction.value = null;
  });
}

async function approveMember(value: { request: JoinRequest; profileId: string }) {
  if (!session.value || !isOwner.value) return;
  await runBusy(async () => {
    await membershipRepository.approve(OBR.room.id, {
      uid: value.request.uid,
      owlbearPlayerId: value.request.owlbearPlayerId,
      playerName: value.request.playerName,
      profileId: value.profileId,
      approvedAt: nowIso(),
      approvedBy: session.value!.uid,
    });
    await refreshOwnerData();
  });
}

async function reassignMember(value: { uid: string; profileId: string }) {
  await runBusy(async () => {
    await membershipRepository.reassign(OBR.room.id, value.uid, value.profileId);
    await refreshOwnerData();
  });
}

async function revokeMember(uid: string) {
  if (!confirm("Revogar o acesso deste jogador?")) return;
  await runBusy(async () => {
    await membershipRepository.revoke(OBR.room.id, uid);
    await refreshOwnerData();
  });
}

async function exportLegacy() {
  if (!legacyData.value) return;
  legacyExport.value = await legacyService.export(legacyData.value);
  downloadJson(legacyExport.value.json, `quick-actions-legacy-${OBR.room.id.slice(0, 8)}.json`);
}

async function discardLegacy() {
  if (!legacyExport.value || !session.value) return;
  const confirmation = prompt('Digite "DESCARTAR" para remover o metadata antigo:') ?? "";
  await runBusy(async () => {
    await legacyService.discardAsOwner(
      OBR.room.id,
      isGm.value ? "GM" : "PLAYER",
      session.value!,
      legacyExport.value!,
      confirmation
    );
    legacyData.value = null;
    legacyExport.value = null;
    status.value = "ASSIGNED";
  });
}

function downloadJson(json: string, filename: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function signOutCurrent() {
  await authService.signOut();
  clearSubscriptions();
  session.value = null;
  profiles.value = [];
  await loadData();
}

async function runBusy(operation: () => Promise<void>) {
  busy.value = true;
  errorMessage.value = "";
  try {
    await operation();
  } catch (error) {
    handleBackendError(error);
  } finally {
    busy.value = false;
  }
}

function handleBackendError(error: unknown) {
  console.error("Firebase manager error:", error);
  errorMessage.value = error instanceof Error ? error.message : "Erro ao acessar o Firebase.";
  status.value = "BACKEND_ERROR";
}

onMounted(loadData);
onBeforeUnmount(clearSubscriptions);
</script>

<style scoped>
.manager-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
  font-family: sans-serif;
  background-color: #1e1e1e;
  color: #fff;
}
.manager-container :deep(*) { box-sizing: border-box; }
.manager-container :deep(input),
.manager-container :deep(select),
.manager-container :deep(textarea) { max-width: 100%; min-width: 0; }
.header,
.footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background-color: #2c2c2c;
}
.header h2 { margin: 0; font-size: 16px; }
.badge { padding: 2px 6px; border-radius: 4px; background: #e74c3c; font-size: 12px; }
.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px;
}
.status-card,
.legacy-card {
  margin: 0 0 10px;
  padding: 12px;
  border: 1px solid #475569;
  border-radius: 6px;
  background: #273244;
}
.status-card h3,
.legacy-card h3 { margin: 0 0 6px; font-size: 14px; }
.status-card p,
.legacy-card p { margin: 0 0 8px; font-size: 12px; color: #cbd5e1; }
.status-card.error { border-color: #ef4444; background: #451f24; }
.legacy-card { border-color: #f59e0b; background: #422f16; }
.button-row,
.tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.tabs { margin: 10px 0; }
.tabs button,
.btn-primary,
.btn-secondary,
.btn-danger,
.link-button {
  border: 0;
  border-radius: 4px;
  padding: 6px 10px;
  color: #fff;
  cursor: pointer;
}
.tabs button,
.btn-secondary { background: #475569; }
.tabs button.active,
.btn-primary { background: #15803d; }
.btn-danger { background: #b91c1c; }
.link-button { padding: 2px 4px; background: transparent; text-decoration: underline; }
button:disabled { cursor: not-allowed; opacity: 0.55; }
.tab-content { min-width: 0; max-width: 100%; }
.read-only-actions { margin: 6px 0 0; padding-left: 20px; }
.footer { border-top: 1px solid #444; font-size: 11px; color: #cbd5e1; }
</style>
