<template>
  <div class="popover-panel">
    <template v-if="action">
      <div class="action-group">
        <h3 class="action-title">{{ action.name }}</h3>

        <div class="variant-toolbar" role="toolbar" aria-label="Modo da rolagem">
          <button
            v-for="variant in availableVariants"
            :key="variant.id"
            class="variant-btn"
            :class="variantButtonClass(variant.id)"
            :disabled="isRolling"
            :title="variant.name"
            @click="selectVariant(variant.id)"
          >
            <img
              class="action-mode-icon"
              :src="resolveIconUrl(variant.icon || action.icon)"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </template>

    <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import OBR from "@owlbear-rodeo/sdk";
import { ACTION_POPOVER_ID } from "@/background/popoverManager";
import { FirebaseAuthSessionService } from "@/integrations/firebase/authSession";
import { getFirebaseServices } from "@/integrations/firebase/client";
import { FirestoreProfileActionRepository } from "@/storage/firebase/firestoreRepositories";
import { FirestoreMembershipRepository } from "@/storage/firebase/firestoreMembershipRepository";
import { ActionPopoverContextResolver } from "@/core/actionPopoverContextResolver";
import { DnD2024SystemPack } from "@/systems/dnd2024";
import { DicePlusAdapter } from "@/integrations/dice-plus/adapter";
import { ActionDefinition } from "@/types/action";
import { executeAction } from "@/core/actionExecutor";
import { mapSuccessfulExecutionToHistory } from "@/core/rollHistoryMapper";
import { saveRollHistoryNonBlocking } from "@/core/rollHistoryPersistence";
import { FirestoreRollHistoryRepository } from "@/storage/firebase/firestoreRollHistoryRepository";
import { resolveIconUrl } from "@/utils/iconResolver";

const action = ref<ActionDefinition | null>(null);
const variables = ref<Record<string, number>>({});
const errorMessage = ref("");
const isRolling = ref(false);
const assignedProfileId = ref("");
const firebaseUid = ref("");

const systemPack = new DnD2024SystemPack();
const availableVariants = computed(() =>
  action.value ? systemPack.getAvailableVariants(action.value) : []
);
const diceAdapter = new DicePlusAdapter();
const firebase = getFirebaseServices();
const authService = new FirebaseAuthSessionService(firebase.auth);
const profileRepository = new FirestoreProfileActionRepository(firebase.firestore);
const membershipRepository = new FirestoreMembershipRepository(firebase.firestore);
const contextResolver = new ActionPopoverContextResolver({
  membershipRepository,
  profileRepository,
});
const historyRepository = new FirestoreRollHistoryRepository(firebase.firestore);

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const actionId = urlParams.get("actionId");

  try {
    if (!OBR.isReady) {
      await new Promise<void>((resolve) => OBR.onReady(() => resolve()));
    }
    const session =
      (await authService.waitForInitialState()) ?? (await authService.ensureAnonymousPlayer());
    firebaseUid.value = session.uid;
    const context = await contextResolver.resolve(OBR.room.id, session.uid, actionId || "");
    assignedProfileId.value = context.profileId;
    variables.value = context.variables;
    action.value = context.action;
    console.debug(`Contexto do popover carregado por ${context.source}.`);
  } catch (err) {
    console.warn("Erro ao carregar dados no popover:", err);
    errorMessage.value =
      err instanceof Error ? err.message : "Falha ao carregar a ação selecionada.";
  }
});

function variantButtonClass(variantId: string): string {
  if (variantId === "ADVANTAGE") return "btn-advantage";
  if (variantId === "DISADVANTAGE") return "btn-disadvantage";
  return "btn-normal";
}

async function selectVariant(variant: string) {
  if (isRolling.value) return;

  console.log(`Variante selecionada: ${variant}`);
  errorMessage.value = "";
  isRolling.value = true;

  try {
    if (!action.value) throw new Error("A ação ainda não foi carregada do Firebase.");
    const result = await executeAction({
      action: action.value,
      variantId: variant,
      variables: variables.value,
      systemPack,
      diceAdapter,
    });
    console.log("Resultado envio Dice+:", result);

    if (!result.success) {
      errorMessage.value = result.error || "Falha ao executar rolagem no Dice+.";
      isRolling.value = false;
      return;
    }

    const history = mapSuccessfulExecutionToHistory({
      uid: firebaseUid.value,
      profileId: assignedProfileId.value,
      action: action.value,
      variantId: variant,
      execution: result,
    });
    const historyPersistence = await saveRollHistoryNonBlocking(
      historyRepository,
      OBR.room.id,
      history
    );
    if (history && !historyPersistence.saved) {
      console.warn(
        "Rolagem concluída, mas o histórico não foi salvo:",
        historyPersistence.error
      );
      await OBR.notification.show("Rolagem concluída; histórico não foi salvo.", "WARNING");
    }
  } catch (err) {
    console.error("Erro ao executar rolagem:", err);
    errorMessage.value = err instanceof Error ? err.message : "Erro ao executar rolagem.";
    isRolling.value = false;
    return;
  }

  try {
    await OBR.popover.close(ACTION_POPOVER_ID);
  } catch (err) {
    console.warn("Popover close fallback:", err);
    isRolling.value = false;
  }
}
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent !important;
}
</style>

<style scoped>
.popover-panel {
  box-sizing: border-box;
  width: 100%;
  font-family: system-ui, -apple-system, sans-serif;
  color: #f8fafc;
  padding: 0.35rem;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.action-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 100%;
  gap: 0.3rem;
}

.action-title {
  box-sizing: border-box;
  max-width: 156px;
  margin: 0;
  padding: 0.3rem 0.5rem;
  overflow: hidden;
  border-radius: 5px;
  background: #111827;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: left;
  text-overflow: ellipsis;
  text-transform: capitalize;
  white-space: nowrap;
}

.variant-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  width: max-content;
  max-width: 100%;
  gap: 0;
}

.variant-btn {
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.variant-btn + .variant-btn {
  margin-left: -1px;
}

.variant-btn:first-child {
  border-radius: 7px 0 0 7px;
}

.variant-btn:last-child {
  border-radius: 0 7px 7px 0;
}

.variant-btn:hover:not(:disabled) {
  filter: brightness(1.18);
  transform: translateY(-1px);
}

.variant-btn:active:not(:disabled) {
  transform: translateY(0);
}

.variant-btn:disabled {
  cursor: wait;
  filter: saturate(0.5);
  opacity: 0.7;
}

.btn-normal {
  background: #475569;
}

.btn-advantage {
  background: #15803d;
}

.btn-disadvantage {
  background: #b91c1c;
}

.action-mode-icon {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(0) invert(1);
  pointer-events: none;
}

.error-banner {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  background-color: rgba(127, 29, 29, 0.92);
  border: 1px solid #ef4444;
  color: #fee2e2;
  font-size: 0.72rem;
  text-align: center;
}
</style>
