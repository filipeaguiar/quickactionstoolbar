import OBR from "@owlbear-rodeo/sdk";
import { registerMainTool } from "./registerTool";
import { syncToolActions } from "./registerToolActions";
import { registerContextMenu } from "./registerContextMenu";
import { PlayerToolbarController, type PlayerToolbarState } from "./playerToolbarController";
import { FirebaseAuthSessionService } from "@/integrations/firebase/authSession";
import { getFirebaseServices } from "@/integrations/firebase/client";
import {
  FirestoreProfileActionRepository,
  FirestoreWorkspaceRepository,
} from "@/storage/firebase/firestoreRepositories";
import { FirestoreMembershipRepository } from "@/storage/firebase/firestoreMembershipRepository";
import { FirestoreRollHistoryRepository } from "@/storage/firebase/firestoreRollHistoryRepository";
import { DnD2024SystemPack } from "@/systems/dnd2024";
import { DicePlusAdapter } from "@/integrations/dice-plus/adapter";
import { executeAction } from "@/core/actionExecutor";
import { mapSuccessfulExecutionToHistory } from "@/core/rollHistoryMapper";
import { saveRollHistoryNonBlocking } from "@/core/rollHistoryPersistence";
import type { FirestoreAction } from "@/types/firebase";
import type { AssignedToolbarContext } from "./playerToolbarController";

OBR.onReady(async () => {
  console.log("Quick Actions Toolbar - Firebase background ready.");

  try {
    await registerMainTool();
    await registerContextMenu();

    const firebase = getFirebaseServices();
    const authService = new FirebaseAuthSessionService(firebase.auth);
    const historyRepository = new FirestoreRollHistoryRepository(firebase.firestore);
    const systemPack = new DnD2024SystemPack();
    const diceAdapter = new DicePlusAdapter();
    const rollingActions = new Set<string>();
    const role = await OBR.player.getRole();
    const playerName = await OBR.player.getName();
    const controller = new PlayerToolbarController({
      workspaceRepository: new FirestoreWorkspaceRepository(firebase.firestore),
      profileRepository: new FirestoreProfileActionRepository(firebase.firestore),
      membershipRepository: new FirestoreMembershipRepository(firebase.firestore),
      syncActions: async (actions, context) => {
        await syncToolActions(
          actions,
          context
            ? (actionId, variantId) =>
                executeDirectAction({
                  actionId,
                  variantId,
                  actions,
                  context,
                  rollingActions,
                  systemPack,
                  diceAdapter,
                  historyRepository,
                })
            : null
        );
      },
      onState: notifyState,
    });

    let sessionQueue = Promise.resolve();
    authService.subscribe(
      (session) => {
        sessionQueue = sessionQueue.then(async () => {
          if (!session) {
            await controller.stop();
            if (role === "PLAYER") await authService.ensureAnonymousPlayer();
            return;
          }
          await controller.start(OBR.room.id, session, {
            owlbearPlayerId: OBR.player.id,
            playerName,
          });
        });
      },
      async (error) => {
        console.error("Firebase auth listener failed:", error);
        await controller.stop();
        await OBR.notification.show("Falha ao autenticar as Ações Rápidas.", "ERROR");
      }
    );
  } catch (error) {
    console.error("Erro ao inicializar Quick Actions com Firebase:", error);
    await syncToolActions([]);
    await OBR.notification.show("Falha ao carregar Ações Rápidas do Firebase.", "ERROR");
  }
});

interface DirectExecutionOptions {
  actionId: string;
  variantId: string;
  actions: FirestoreAction[];
  context: AssignedToolbarContext;
  rollingActions: Set<string>;
  systemPack: DnD2024SystemPack;
  diceAdapter: DicePlusAdapter;
  historyRepository: FirestoreRollHistoryRepository;
}

async function executeDirectAction(options: DirectExecutionOptions): Promise<void> {
  const action = options.actions.find((candidate) => candidate.id === options.actionId);
  if (!action) {
    await OBR.notification.show("A ação selecionada não está disponível.", "ERROR");
    return;
  }
  if (options.rollingActions.has(action.id)) return;
  options.rollingActions.add(action.id);

  try {
    const result = await executeAction({
      action,
      variantId: options.variantId,
      variables: options.context.profile.variables,
      systemPack: options.systemPack,
      diceAdapter: options.diceAdapter,
    });
    if (!result.success) {
      await OBR.notification.show(result.error || "Falha ao executar rolagem no Dice+.", "ERROR");
      return;
    }

    const history = mapSuccessfulExecutionToHistory({
      uid: options.context.uid,
      profileId: options.context.profile.id,
      action,
      variantId: options.variantId,
      execution: result,
    });
    const persistence = await saveRollHistoryNonBlocking(
      options.historyRepository,
      OBR.room.id,
      history
    );
    if (history && !persistence.saved) {
      console.warn("Rolagem direta concluída, mas o histórico não foi salvo:", persistence.error);
      await OBR.notification.show("Rolagem concluída; histórico não foi salvo.", "WARNING");
    }
  } catch (error) {
    console.error("Erro ao executar ação direta:", error);
    await OBR.notification.show(
      error instanceof Error ? error.message : "Erro ao executar rolagem.",
      "ERROR"
    );
  } finally {
    options.rollingActions.delete(action.id);
  }
}

function notifyState(state: PlayerToolbarState, message?: string): void {
  if (state === "OFFLINE_CACHE") {
    void OBR.notification.show("Ações Rápidas usando cache offline.", "WARNING");
  } else if (state === "AUTHORIZATION_DENIED") {
    void OBR.notification.show("Acesso ao perfil de Ações Rápidas revogado.", "WARNING");
  } else if (state === "BACKEND_ERROR") {
    void OBR.notification.show(message || "Falha ao sincronizar Ações Rápidas.", "ERROR");
  }
}
