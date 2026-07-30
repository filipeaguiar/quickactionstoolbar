# Especificação Técnica 07 — Roadmap de Desenvolvimento, Testes e DOD

**Componentes:** Roadmap em 7 Fases, Matriz de Testes e Definition of Done  
**Arquivos de Referência:** `SRD.md` (Seções 19, 20, 24)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação consolida a estratégia de desenvolvimento incremental dividida em 7 fases operacionais, o plano de testes automatizados e unitários (com foco em desacoplamento da API do Owlbear Rodeo) e a matriz de verificação de pronto (Definition of Done) para o MVP.

---

## 2. Roadmap Incremental em 7 Fases

```
 ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
 │ Fase 1  │──>│ Fase 2  │──>│ Fase 3  │──>│ Fase 4  │──>│ Fase 5  │──>│ Fase 6  │──>│ Fase 7  │
 │ Shell   │   │ Persist │   │ Editor  │   │ Parser  │   │ D&D24   │   │ Dice+   │   │ Polim.  │
 └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### Fase 1 — Shell da Extensão & Interface Nativa
- Configuração do projeto (Vite, TypeScript `strict: true`, Tailwind / Vanilla CSS em IFrames).
- Criação do `public/manifest.json` e arquivos base HTML (`background.html`, `manager.html`, `action-popover.html`).
- Inicialização do `OBR.onReady()` e registro do `Tool` principal.
- Teste de inclusão de um `ToolAction` mock e abertura de `Popover` ancorado via `anchorElementId`.

### Fase 2 — Persistência e Segurança de Metadata
- Implementação dos tipos `RoomQuickActionsData` e schemas Zod.
- Implementação de `metadataSize.ts` (medidor UTF-8) e simulação pré-salvamento (`estimateAfterUpdate`).
- Lógica de autorização GM vs Player (`validateSavePermissions`).
- Atribuição de perfil por jogador conectado (`playerAssignments`).
- Vinculação de token (`PROFILE_REFERENCE_KEY` na layer `"CHARACTER"`).

### Fase 3 — Editor Vue 3 (`manager.html`)
- Construção da UI do Gerenciador de Ações (CRUD de ações e variáveis).
- Reordenação de ações por arrasto com atualização de `sortOrder`.
- Catálogo de ícones RPG Awesome local (arquivos SVG).
- Importação e exportação de backups em formato JSON.
- Exibição gráfica da capacidade em bytes UTF-8 da Room.

### Fase 4 — Motor de Rolagem (Parser & AST)
- Lexer/Tokenizer (`1d20`, `+`, `-`, `{{var}}`, `kh1`, `kl1`).
- Parser descendente recursivo e construção de nó da AST.
- Resolvedor de variáveis (`{{strength}}`).
- Serializador de AST para string de rolagem.
- Suporte a múltiplas rolagens ordenadas em uma `RollSequence`.

### Fase 5 — System Pack D&D 2024
- Módulo `dnd5e-2024`.
- Transformações de AST para Vantagem (`2d20kh1`) em jogadas de ataque/teste/resistência.
- Transformações de AST para Desvantagem (`2d20kl1`).
- Transformações de AST para Acerto Crítico (duplicação de dados em `purpose === "DAMAGE"` e `criticalBehavior === "DOUBLE_DICE"`).
- Suporte a variantes customizadas (ex: Ataque Imprudente).

### Fase 6 — Integração com Dice+
- Construção da classe `DicePlusAdapter`.
- Implementação do protocolo Broadcast API (`DICE_PLUS_PROTOCOL`).
- Handshake via `PING`/`PONG` com timeout.
- Notificação legível via `OBR.notification.show` na ausência do Dice+.

### Fase 7 — Polimento, Testes e Publicação
- Ajustes de acessibilidade (`aria-label` nos botões de iframe).
- Auditoria de licenças do RPG Awesome (`licenses/rpg-awesome/`).
- Testes end-to-end e validação do build final (`npm run build`).

---

## 3. Estratégia de Testes Automatizados (Vitest)

Para garantir testabilidade rápida e independente da plataforma Owlbear Rodeo, os módulos de negócios são totalmente desacoplados da global `OBR`:

1. **Testes do Parser e AST (`tests/parser.test.ts`):**
   - Validar se `1d20 + 5` gera a AST correta.
   - Validar erro ao enviar expressão malformada (`1d20 + +`).
   - Validar resolução de variáveis inexistentes.
2. **Testes de Transformações de D&D 2024 (`tests/dnd2024.test.ts`):**
   - Garantir que a Vantagem converte `1d20 + 3` em `2d20kh1 + 3`.
   - Garantir que o Crítico duplica `1d12 + 4` para `2d12 + 4`.
3. **Testes de Medição de Armazenamento (`tests/storage.test.ts`):**
   - Validar cálculo de bytes UTF-8 em strings contendo caracteres acentuados/emojis.
   - Validar que a simulação bloqueia gravações projetadas em ≥ 15 KB.

---

## 4. Matriz de Aceitação e Definition of Done (DOD)

O projeto será considerado **CONCLUÍDO (DONE)** quando todos os 15 critérios de aceitação abaixo forem satisfeitos e verificados:

| # | Critério de Aceitação | Método de Verificação |
| :-: | :--- | :--- |
| 1 | O `Tool` "Ações Rápidas" aparece na toolbar quando uma Scene está aberta. | Teste visual na mesa OBR |
| 2 | As ações do jogador aparecem como `ToolAction` dinâmicos usando SVGs locais do RPG Awesome. | Inspeção visual |
| 3 | Ao clicar em uma ação, um Popover abre ancorado ao botão correto (`anchorElementId`). | Teste de clique |
| 4 | Vantagem transforma o d20 de ataque em `2d20kh1`. | Inspecionar payload emitido |
| 5 | Desvantagem transforma o d20 de ataque em `2d20kl1`. | Inspecionar payload emitido |
| 6 | Crítico duplica os dados de dano mantendo os modificadores constantes (ex: `1d12+3` -> `2d12+3`). | Inspecionar payload emitido |
| 7 | O GM consegue criar perfis e atribuí-los a um jogador conectado via `OBR.party.getPlayers()`. | Teste de atribuição GM |
| 8 | As barras persistem após recarregar a sala ou alternar entre Scenes. | Recarregar navegador |
| 9 | Excluir um token vinculado na Scene NÃO apaga o perfil do metadata da sala. | Deletar token no mapa |
| 10 | Um jogador comum não consegue editar o perfil de outro jogador. | Teste com role `PLAYER` |
| 11 | O editor exibe o consumo de memória UTF-8 total da Room e isolado da extensão. | Inspecionar painel do editor |
| 12 | A extensão simula o tamanho pré-salvamento e bloqueia gravações que ultrapassem 15 KB. | Simulação com payload grande |
| 13 | Notificação clara é exibida via `OBR.notification.show` caso o Dice+ não esteja instalado. | Desabilitar Dice+ na sala |
| 14 | Importação e exportação em formato JSON recriam integralmente os perfis e variáveis. | Exportar/Importar arquivo JSON |
| 15 | O comando `npm run build` executa sem erros de TypeScript (`strict: true`). | Compilação local |
