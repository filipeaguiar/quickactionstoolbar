# Especificação Técnica 03 — Modelo de Dados, Gerenciador e Ícones

**Componentes:** Types & Schemas Zod, Interface Vue 3 (`manager.html`), Resoluções de Ícone RPG Awesome  
**Arquivos de Referência:** `SRD.md` (Seções 8, 13, 16)  
**Status:** Pronto para implementação  

---

## 1. Visão Geral

Esta especificação aborda a definição do modelo de dados estrito das ações e perfis em TypeScript com runtime validation (Zod), o design e comportamento da interface do editor/gerenciador (`manager.html`) em Vue 3, e o sistema local de ícones baseado na biblioteca RPG Awesome.

---

## 2. Modelos de Dados e Schemas TypeScript / Zod

### 2.1 Enums e Tipos Primários (`src/types/action.ts`)
```typescript
import { z } from "zod";

export const ActionKindSchema = z.enum([
  "ATTACK",
  "DAMAGE",
  "SAVE",
  "CHECK",
  "HEALING",
  "UTILITY",
  "CUSTOM",
]);
export type ActionKind = z.infer<typeof ActionKindSchema>;

export const StepPurposeSchema = z.enum([
  "ATTACK",
  "DAMAGE",
  "HEALING",
  "CHECK",
  "SAVE",
  "OTHER",
]);
export type StepPurpose = z.infer<typeof StepPurposeSchema>;

export const CriticalBehaviorSchema = z.enum(["DOUBLE_DICE", "NONE"]);
export type CriticalBehavior = z.infer<typeof CriticalBehaviorSchema>;
```

### 2.2 Schema de RollStep e RollSequence
```typescript
export const RollStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  purpose: StepPurposeSchema,
  expression: z.string().min(1, "A expressão de rolagem não pode ser vazia"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  execute: z.enum(["ALWAYS", "ON_HIT", "ON_CRITICAL"]).default("ALWAYS"),
  criticalBehavior: CriticalBehaviorSchema.optional(),
});
export type RollStep = z.infer<typeof RollStepSchema>;

export const RollSequenceSchema = z.object({
  version: z.literal(1),
  steps: z.array(RollStepSchema).min(1, "A ação precisa de pelo menos uma rolagem"),
  stopOnError: z.boolean().default(true),
});
export type RollSequence = z.infer<typeof RollSequenceSchema>;
```

### 2.3 Schema de Variantes e Custom Variants
```typescript
export const RollTransformationSchema = z.object({
  type: z.enum(["D20_ADVANTAGE", "D20_DISADVANTAGE", "DOUBLE_DICE", "ADD_MODIFIER"]),
  stepPurpose: StepPurposeSchema.optional(),
  modifierValue: z.number().optional(),
});
export type RollTransformation = z.infer<typeof RollTransformationSchema>;

export const CustomVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  transformations: z.array(RollTransformationSchema),
});
export type CustomVariant = z.infer<typeof CustomVariantSchema>;

export const VariantPolicySchema = z.object({
  allowNormal: z.boolean().default(true),
  allowAdvantage: z.boolean().default(true),
  allowDisadvantage: z.boolean().default(true),
  allowCritical: z.boolean().default(true),
  customVariants: z.array(CustomVariantSchema).default([]),
});
export type VariantPolicy = z.infer<typeof VariantPolicySchema>;
```

### 2.4 Schema de ActionDefinition e CharacterActionProfile
```typescript
export const ActionDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome é obrigatório"),
  shortLabel: z.string().max(12, "Rótulo curto deve ter no máximo 12 caracteres").optional(),
  description: z.string().optional(),
  icon: z.string(), // ID do RPG Awesome
  kind: ActionKindSchema,
  enabled: z.boolean().default(true),
  sortOrder: z.number().default(0),
  systemId: z.literal("dnd5e-2024").default("dnd5e-2024"),
  sequence: RollSequenceSchema,
  variantPolicy: VariantPolicySchema,
  tags: z.array(z.string()).default([]),
});
export type ActionDefinition = z.infer<typeof ActionDefinitionSchema>;

export const CharacterActionProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do personagem é obrigatório"),
  ownerPlayerId: z.string().nullable().default(null),
  ownerPlayerName: z.string().nullable().default(null),
  systemId: z.literal("dnd5e-2024").default("dnd5e-2024"),
  variables: z.record(z.string(), z.number()).default({}),
  actions: z.array(ActionDefinitionSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type CharacterActionProfile = z.infer<typeof CharacterActionProfileSchema>;
```

---

## 3. Especificação do Gerenciador (`manager.html` / Vue 3 App)

O `ManifestAction` abre a página `/manager.html` em uma janela popover nativa de tamanho inicial 420x640 px.

### 3.1 Módulos da Interface do Gerenciador

```
┌─────────────────────────────────────────────────────────┐
│ Quick Actions Manager                         [GM Badge]│
├─────────────────────────────────────────────────────────┤
│ Seletor de Perfil: [ Grog Strongjaw (Barbaro) ▼ ]  [+] │
│ Atribuído a: [ Filipe (Player) ▼ ]                       │
├─────────────────────────────────────────────────────────┤
│ Abas:  [ Ações (4) ]   [ Variáveis ]   [ Config / JSON ]│
├─────────────────────────────────────────────────────────┤
│ Lista de Ações (Drag & Drop Reorder)                    │
│ ☰  ⚔️ Ataque Machado Grande (dnd5e-2024) [✎] [🗑]      │
│ ☰  🛡️ Fúria Bárbara                     [✎] [🗑]      │
│ ☰  🏹 Arco Longo                       [✎] [🗑]      │
│                                                         │
│ [+ Nova Ação]                                           │
├─────────────────────────────────────────────────────────┤
│ Painel de Diagnóstico de Armazenamento                  │
│ Room Total: 8.4 KB / 16 KB [████████░░░░░░] (52%)       │
│ Esta Extensão: 3.2 KB | Projetado: 3.4 KB               │
└─────────────────────────────────────────────────────────┘
```

#### Funcionalidades da Interface:
1. **CRUD de Perfis:** Criar, duplicar, renomear e excluir perfis de personagem (Apenas GM).
2. **Atribuição de Jogador:** Mapeamento em tempo real com os jogadores retornados por `OBR.party.getPlayers()`.
3. **Editor de Ações:**
   - Formulário com nome, rótulo curto, seleção de ícone e categoria (`kind`).
   - Construtor de `RollStep` (label, finalidade, expressão como `1d20 + {{proficiency}} + {{strength}}`).
   - Configuração de políticas de variantes (Vantagem, Desvantagem, Crítico).
4. **Editor de Variáveis:** Par chave-valor (ex: `proficiency: 3`, `strength: 4`, `dexterity: 2`).
5. **Importação / Exportação JSON:** Backup individual de perfil ou da room inteira com validação via Zod.
6. **Mapeamento de Armazenamento:** Indicador visual de uso UTF-8 do metadata da sala em tempo real.

---

## 4. Gerenciamento de Ícones com RPG Awesome

Para garantir conformidade com o SDK do Owlbear Rodeo, os ícones são utilizados em dois contextos distintos:

### 4.1 Uso em Interface Nativa (`ToolIcon`)
O `OBR.tool.createAction` exige um caminho SVG estático em arquivo.
- **Diretório:** `public/icons/rpg-awesome/`
- **Mapeamento (`src/utils/iconResolver.ts`):**
```typescript
export function resolveIconUrl(iconId: string): string {
  const safeId = iconId.replace(/[^a-z0-9-]/g, "");
  return `/icons/rpg-awesome/${safeId}.svg`;
}
```

### 4.2 Uso dentro de IFrames (Vue 3 UI)
Dentro do `manager.html` e `action-popover.html`, utiliza-se a fonte/CSS empacotada localmente (`rpg-awesome.min.css`):
```html
<i :class="['ra', `ra-${action.icon}`]"></i>
```

### 4.3 Catálogo Curado de Ícones Disponíveis (MVP)
Para economizar espaço e manter a UI limpa, o MVP conterá uma lista curada contendo os SVGs essenciais:
- `broadsword`, `crossed-swords`, `axe`, `shield`, `lightning-bolt`, `fire`, `frostfire`, `health`, `health-increase`, `targeted`, `archery-target`, `footprint`, `scroll-unfurled`, `dice-six`, `cog`.
