## Why

Implementar a persistência compartilhada em `OBR.room.metadata`, a medição de capacidade em bytes UTF-8 com margem de segurança e bloqueio preventivo, as regras de autorização baseadas nas roles de GM vs Player e o vínculo referencial opcional com tokens da Scene.

## What Changes

- Repositório de leitura, validação e gravação em `OBR.room.metadata` sob a chave namespace `com.seudominio.quick-actions/room-data`.
- Medidor de uso de armazenamento em bytes UTF-8 com alerta a 12 KB (75%) e trava de gravação (hard lock) a 15 KB (93.75%).
- Simulação em memória do consumo total pré-salvamento (`estimateAfterUpdate`).
- Motor de autorização validando permissões de escrita por papel (GM vs PLAYER).
- Vínculo bidirecional opcional entre tokens da layer `"CHARACTER"` e perfis via `PROFILE_REFERENCE_KEY` no metadata do token.
- Item de menu de contexto no token "Vincular Ações" para o GM.

## Capabilities

### New Capabilities
- `persistence-and-security`: Persistência de perfis e atribuições em Room Metadata, política de capacidade UTF-8 com simulação pré-salvamento, autorização GM vs Player e vinculador opcional de tokens na Scene.

### Modified Capabilities
<!-- Nenhuma funcionalidade anterior modificada -->

## Impact

- **Storage:** Manipulação segura de `OBR.room.metadata` e `OBR.scene.items`.
- **APIs do SDK:** `OBR.room.getMetadata`, `OBR.room.setMetadata`, `OBR.room.onMetadataChange`, `OBR.player.getRole`, `OBR.party.getPlayers`, `OBR.contextMenu.create`.
- **Módulos:** Novos arquivos em `src/storage/` (`roomProfileRepository.ts`, `metadataSize.ts`, `authorizationEngine.ts`, `tokenProfileLinkRepository.ts`) e listeners no background script.
