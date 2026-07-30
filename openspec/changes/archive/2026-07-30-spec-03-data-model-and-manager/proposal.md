## Why

Definir o modelo de dados estrito usando Zod com validação em tempo de execução, construir a interface completa do gerenciador (`manager.html`) em Vue 3 para CRUD de perfis, gerenciamento de ações, variáveis e importação/exportação JSON, e estruturar o catálogo de ícones RPG Awesome local.

## What Changes

- Validação em runtime via schemas Zod (`ActionDefinitionSchema`, `CharacterActionProfileSchema`, `RollStepSchema`, `RollSequenceSchema`, `VariantPolicySchema`).
- Interface completa do Gerenciador (`src/ui/manager/App.vue` e subcomponentes) com abas de Ações, Variáveis, Importação/Exportação JSON e Diagnóstico de Capacidade.
- Sistema de ícones RPG Awesome desacoplado (`src/utils/iconResolver.ts` e catálogo curado na UI).
- Suporte a arrastar e soltar (reordenação) de ações.

## Capabilities

### New Capabilities
- `data-model-and-manager`: Schemas estritos Zod para validação em runtime de ações e perfis, interface completa Vue 3 para o gerenciador e resolução de ícones RPG Awesome.

### Modified Capabilities
<!-- Nenhuma modificação em capabilities existentes -->

## Impact

- **TypeScript / Zod:** `src/types/action.ts` atualizado com schemas Zod completos.
- **UI Vue 3:** `src/ui/manager/App.vue` expandido com múltiplos componentes/abas (`ProfileSelector`, `ActionEditor`, `VariableEditor`, `JsonBackup`, `StorageDiagnostic`).
- **Assets:** Biblioteca local de ícones RPG Awesome.
