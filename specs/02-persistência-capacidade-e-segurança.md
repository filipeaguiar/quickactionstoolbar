# Especificação Técnica 02 — Persistência, Capacidade e Segurança

**Componentes:** Repository de Room Metadata, Calculador de Capacidade UTF-8, Motor de Segurança/Autorização e Vinculador de Tokens  
**Arquivos de Referência:** `SRD.md` (Seções 6, 7, 14)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação define como os perfis de personagem e suas atribuições são armazenados no `OBR.room.metadata`, as travas de segurança e medição em bytes UTF-8 para respeitar o limite de 16 kB da plataforma, o controle de autorização baseado na role do jogador (GM vs PLAYER) e a integração opcional com tokens (`Item` da layer `"CHARACTER"`).

---

## 2. Estrutura dos Dados em `OBR.room.metadata`

Chave com namespace reverso:
```typescript
export const ROOM_DATA_KEY = "com.seudominio.quick-actions/room-data";
export const PROFILE_REFERENCE_KEY = "com.seudominio.quick-actions/profile-id";
```

### 2.1 Interface Root do Metadata
```typescript
export interface RoomQuickActionsData {
  schemaVersion: 1;
  profiles: Record<string, CharacterActionProfile>; // Key: profileId
  playerAssignments: Record<string, string>;       // Key: playerId -> profileId
  settings: RoomQuickActionsSettings;
  updatedAt: string;                               // ISO-8601
  updatedBy: string;                               // Player ID
}

export interface RoomQuickActionsSettings {
  playersCanEditOwnProfiles: boolean;
  maxVisibleActions: number;
}
```

---

## 3. Política e Medição de Capacidade de Armazenamento

A plataforma Owlbear Rodeo limita o tamanho total do `OBR.room.metadata` a 16 kB (compartilhado entre todas as extensões). Para evitar corrupção ou rejeição pelo servidor, a extensão deve utilizar uma margem de segurança rigorosa baseada na codificação UTF-8 dos objetos JSON.

### 3.1 Função de Medição UTF-8 (`src/storage/metadataSize.ts`)
```typescript
export function jsonUtf8Size(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export interface CapacityMetrics {
  totalRoomBytes: number;
  extensionBytes: number;
  projectedTotalBytes: number;
  availableBytes: number;
  status: "OK" | "WARNING" | "BLOCKED";
}
```

### 3.2 Limites Operacionais e Alertas
- **Limite Oficial Documentado:** 16.384 bytes (16 kB).
- **Margem Amarela (WARNING):** ≥ 12.288 bytes (12 KB / 75%).
  - Exibe banner de alerta no editor solicitando limpeza ou exportação JSON.
- **Margem Vermelha (HARD LOCK / BLOCKED):** ≥ 15.360 bytes (15 KB / 93.75%).
  - Bloqueia novas edições/salvamentos no editor. Apresenta erro `OBR.notification.show("Limite de armazenamento da sala atingido!", "ERROR")`.

### 3.3 Simulação Pré-Gravação (`estimateAfterUpdate`)
Antes de executar qualquer `OBR.room.setMetadata()`, o repositório deve executar uma simulação em memória:

```typescript
export async function simulateSaveCapacity(
  nextRoomData: RoomQuickActionsData
): Promise<CapacityMetrics> {
  const currentMetadata = (await OBR.room.getMetadata()) || {};
  const currentTotalBytes = jsonUtf8Size(currentMetadata);
  const extensionBytes = jsonUtf8Size(nextRoomData);

  const simulatedMetadata = {
    ...currentMetadata,
    [ROOM_DATA_KEY]: nextRoomData,
  };
  const projectedTotalBytes = jsonUtf8Size(simulatedMetadata);

  let status: CapacityMetrics["status"] = "OK";
  if (projectedTotalBytes >= 15360) {
    status = "BLOCKED";
  } else if (projectedTotalBytes >= 12288) {
    status = "WARNING";
  }

  return {
    totalRoomBytes: currentTotalBytes,
    extensionBytes,
    projectedTotalBytes,
    availableBytes: 16384 - projectedTotalBytes,
    status,
  };
}
```

---

## 4. Regras de Autorização e Controle de Acesso (GM vs Player)

O controle de segurança deve ser executado no código TypeScript antes de enviar dados ao OBR, e não apenas ocultando elementos de UI.

### 4.1 Permissões por Papel (Role)

| Ação / Operação | GM | PLAYER (Dono do Perfil) | PLAYER (Não-Dono) |
| :--- | :---: | :---: | :---: |
| Criar novo perfil | ✅ | ❌ | ❌ |
| Excluir/Duplicar perfil | ✅ | ❌ | ❌ |
| Atribuir perfil a outro Player (`playerAssignments`) | ✅ | ❌ | ❌ |
| Alterar `playersCanEditOwnProfiles` | ✅ | ❌ | ❌ |
| Editar ações/variáveis do próprio perfil | ✅ | ✅ (se ativado na room) | ❌ |
| Executar ações da barra ativa | ✅ | ✅ | ❌ |
| Exportar backup JSON | ✅ | ✅ (apenas próprio perfil) | ❌ |
| Importar backup JSON | ✅ | ❌ | ❌ |

### 4.2 Verificação de Escrita (`src/storage/authorizationEngine.ts`)
```typescript
export async function validateSavePermissions(
  targetProfileId: string,
  proposedData: RoomQuickActionsData
): Promise<{ allowed: boolean; reason?: string }> {
  const role = await OBR.player.getRole();
  const currentUserId = OBR.player.id;

  if (role === "GM") {
    return { allowed: true };
  }

  // Se for PLAYER:
  const currentMetadata = await OBR.room.getMetadata();
  const currentRoomData = parseRoomData(currentMetadata[ROOM_DATA_KEY]);

  // 1. Impedir alteração de playerAssignments ou settings
  if (
    JSON.stringify(proposedData.playerAssignments) !== JSON.stringify(currentRoomData.playerAssignments) ||
    JSON.stringify(proposedData.settings) !== JSON.stringify(currentRoomData.settings)
  ) {
    return { allowed: false, reason: "Jogadores não podem alterar atribuições ou configurações da sala." };
  }

  // 2. Verificar se o jogador é dono do perfil
  const assignedProfileId = currentRoomData.playerAssignments[currentUserId];
  if (assignedProfileId !== targetProfileId) {
    return { allowed: false, reason: "Você só pode editar o seu próprio perfil de personagem." };
  }

  // 3. Verificar permissão global da sala
  if (!currentRoomData.settings.playersCanEditOwnProfiles) {
    return { allowed: false, reason: "O GM desativou a edição de perfis pelos jogadores nesta sala." };
  }

  return { allowed: true };
}
```

---

## 5. Vinculação Opcional com Tokens da Scene (`CHARACTER`)

A vinculação com um token na Scene é puramente referencial e bidirecional:

1. **Armazenamento no Token:** O metadata do Item na Scene grava apenas a referência do `profileId`:
   ```typescript
   item.metadata[PROFILE_REFERENCE_KEY] = profile.id;
   ```
2. **Context Menu no Token:**
   Ao selecionar um Token da layer `"CHARACTER"`, o GM pode clicar em "Vincular Ações" no menu contextual.
3. **Resiliência:**
   - Deletar o token no mapa **NÃO** remove o perfil do `OBR.room.metadata`.
   - Mudar de Scene **NÃO** desfaz as atribuições de perfis dos jogadores.
   - O campo `Item.createdUserId` não é usado para determinar a propriedade do perfil.

---

## 6. Prevenção de Conflitos de Concorrência

Como múltiplos usuários (GM e jogadores) podem atualizar o metadata simultaneamente:

1. **Re-leitura Obrigatória:** Antes de qualquer gravação, reler a versão mais recente via `OBR.room.getMetadata()`.
2. **Mesclagem de Perfis:** Aplicar a alteração do perfil específico preservando os perfis inalterados de outros personagens.
3. **Timestamp Validation:** Atualizar `updatedAt` com timestamp ISO-8601 e `updatedBy` com o `Player.id` atual.
