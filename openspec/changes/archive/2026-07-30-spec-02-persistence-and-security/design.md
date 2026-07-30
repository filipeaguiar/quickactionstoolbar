## Context

O Owlbear Rodeo 2 compartilha o `OBR.room.metadata` entre a sala e todas as extensões instaladas, impondo um limite de 16 kB (16.384 bytes). Para evitar falhas silenciosas ou rejeições de gravação pelo servidor, a Quick Actions Toolbar precisa monitorar o consumo UTF-8 antes de persistir alterações e restringir os privilégios de escrita de acordo com as funções dos usuários (`GM` vs `PLAYER`).

## Goals / Non-Goals

**Goals:**
- Implementar o repositório de perfis `roomProfileRepository.ts` para gerenciar a leitura e atualização parcial de `OBR.room.metadata`.
- Implementar o utilitário de medição em UTF-8 `metadataSize.ts` com cálculo de projeção antes de salvar.
- Definir limites claros: Warning em 12 KB (12.288 bytes) e Hard Lock em 15 KB (15.360 bytes).
- Implementar o validador de autorização `authorizationEngine.ts` validando o papel do usuário (`OBR.player.getRole()`).
- Suportar a vinculação opcional de tokens (`PROFILE_REFERENCE_KEY` na layer `"CHARACTER"`).

**Non-Goals:**
- Não criar armazenamento em servidor externo (o MVP é 100% serverless/estático no OBR).
- Não salvar histórico de rolagens no metadata da sala.

## Decisions

### Decisão 1: Fonte Única da Verdade em `OBR.room.metadata`
- **Opção Escolhida:** Armazenar todos os perfis e o dicionário de atribuições `playerAssignments` na Room.
- **Alternativas Consideradas:** Usar `localStorage` ou `Item.metadata` nos tokens.
- **Razão:** Os dados da Room persistem quando o GM troca de Scene. O `localStorage` é estritamente local ao navegador do usuário e o `Item.metadata` é destruído se o token for removido.

### Decisão 2: Simulação Pré-Salvamento (`simulateSaveCapacity`)
- **Opção Escolhida:** Re-ler o metadata atual da sala, projetar a fusão JSON em memória e medir o tamanho total em bytes UTF-8 via `TextEncoder` antes de invocar `OBR.room.setMetadata`.
- **Alternativas Consideradas:** Gravar diretamente e tratar erro via try/catch.
- **Razão:** O SDK não lança exceções claras com o byte size exato quando a cota do servidor é estourada.

### Decisão 3: Desvinculação entre Token e Perfil
- **Opção Escolhida:** O token guarda apenas uma string de referência `PROFILE_REFERENCE_KEY: profileId`.
- **Alternativas Consideradas:** Duplicar os dados do perfil dentro do token.
- **Razão:** Permite deletar ou recriar tokens na mesa sem destruir a ficha e ações configuradas do personagem.

## Risks / Trade-offs

- **[Risco]** Outra extensão instalada na sala consome espaço excessivo no `OBR.room.metadata`.
  - *Mitigação:* Medir o objeto de metadata completo retornado por `OBR.room.getMetadata()` e não apenas a chave da extensão Quick Actions, garantindo que o acumulado total não ultrapasse 15 KB.
- **[Risco]** Escrita simultânea por múltiplos jogadores gerando sobreposição de dados.
  - *Mitigação:* Re-ler a versão mais recente do metadata antes de cada gravação e mesclar apenas a chave de perfis afetada com validação de timestamp.
