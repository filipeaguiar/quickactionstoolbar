## Context

A especificação 03 estabelece as bases de modelagem de domínio com Zod para garantir integridade estrutural das fichas de ações antes da gravação no Room Metadata. Além disso, fornece a interface gráfica do Gerenciador (`manager.html`) em Vue 3, estruturada em abas funcionais para CRUD de perfis, edição visual de sequências de rolagem (`RollStep`), dicionário de variáveis e backup JSON.

## Goals / Non-Goals

**Goals:**
- Implementar os schemas Zod completos em `src/types/action.ts` com inferred TypeScript types.
- Estruturar a UI do Gerenciador Vue 3 (`src/ui/manager/App.vue`) em componentes focados:
  - `ProfileSelector.vue`
  - `ActionList.vue` / `ActionEditor.vue`
  - `VariableEditor.vue`
  - `JsonBackup.vue`
  - `StorageDiagnostic.vue`
- Prover um seletor visual de ícones RPG Awesome integrado com os arquivos locais.

**Non-Goals:**
- Não executar rolagens reais ou integrar com o Dice+ nesta fase (pertence à Spec 04/06).
- Não criar sistemas complexos de permissão granular por ação (apenas por perfil/sala).

## Decisions

### Decisão 1: Validação Zod com Fallback Gracioso
- **Opção Escolhida:** Validar todos os objetos importados ou lidos do metadata via `.safeParse()`. Em caso de erro, exibir os detalhes dos campos inválidos sem quebrar a aplicação.
- **Razão:** Garante que alterações manuais em JSON ou versões legadas não corrompam a execução do aplicativo.

### Decisão 2: Layout Modular em Abas no Gerenciador
- **Opção Escolhida:** Dividir a janela do manager (420x640px) em 3 abas principais ("Ações", "Variáveis", "Importar/Exportar") com um cabeçalho fixo contendo a escolha do perfil/atribuição e um rodapé com o diagnóstico de espaço em bytes.
- **Razão:** Mantém a interface limpa, responsiva e sem poluição visual no iframe do OBR.

## Risks / Trade-offs

- **[Risco]** Tamanho do bundle aumentado por bibliotecas de ícones e componentes.
  - *Mitigação:* Usar lista de ícones curada em SVG e empacotar a fonte RPG Awesome estaticamente no build do Vite.
