import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const manager = readFileSync(resolve("src/ui/manager/App.vue"), "utf8");
const selector = readFileSync(
  resolve("src/ui/manager/components/ProfileSelector.vue"),
  "utf8"
);

describe("Firebase manager ownership UI", () => {
  it("uses Firebase repositories instead of metadata profile saves", () => {
    expect(manager).toContain("FirestoreWorkspaceRepository");
    expect(manager).toContain("FirestoreProfileActionRepository");
    expect(manager).toContain("FirestoreMembershipRepository");
    expect(manager).not.toContain("getOrCreateRoomData");
    expect(manager).not.toContain("apiSaveRoomData");
  });

  it("requires durable owner state for editing and initialization", () => {
    expect(manager).toContain("OWNER_SIGN_IN_REQUIRED");
    expect(manager).toContain("signInDurableGm");
    expect(manager).toContain('v-if="isOwner && selectedProfile"');
    expect(manager).toContain('v-else-if="!isOwner && selectedProfile"');
    expect(manager).toContain("ownershipService.initialize");
  });

  it("provides owner-controlled join, assignment, reassignment, and revocation", () => {
    expect(selector).toContain("Atribuir perfil selecionado");
    expect(selector).toContain("Solicitações pendentes");
    expect(selector).toContain("Jogadores associados");
    expect(selector).toContain('$emit(\'revoke\'');
    expect(manager).toContain("membershipRepository.approve");
    expect(manager).toContain("membershipRepository.reassign");
    expect(manager).toContain("membershipRepository.revoke");
    expect(manager).toContain("OBR.party.getPlayers()");
  });

  it("deep-copies reactive actions without structuredClone proxy failures", () => {
    expect(manager).toContain("JSON.parse(JSON.stringify(action))");
    expect(manager).not.toContain("structuredClone(action)");
  });

  it("never silently imports legacy configuration", () => {
    expect(manager).toContain("Exportar JSON legado");
    expect(manager).toContain("Descartar metadata antigo");
    expect(manager).not.toContain("migrate(");
  });
});
