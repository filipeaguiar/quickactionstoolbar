## 1. Zod Schemas & Data Model Validation

- [x] 1.1 Complete Zod schemas in `src/types/action.ts` (`ActionKindSchema`, `StepPurposeSchema`, `RollStepSchema`, `RollSequenceSchema`, `VariantPolicySchema`, `ActionDefinitionSchema`, `CharacterActionProfileSchema`)
- [x] 1.2 Add schema validation unit tests in `tests/schema.test.ts`

## 2. Icon Resolver & Curated Catalog

- [x] 2.1 Update `src/utils/iconResolver.ts` with curated RPG Awesome catalog list and validation
- [x] 2.2 Verify local RPG Awesome CSS integration for Vue components in `manager.html` and `action-popover.html`

## 3. Vue 3 Manager UI Components

- [x] 3.1 Implement Profile Selector & Player Assignment component (`src/ui/manager/components/ProfileSelector.vue`)
- [x] 3.2 Implement Action List & Drag/Reorder component (`src/ui/manager/components/ActionList.vue`)
- [x] 3.3 Implement Action & RollStep Editor modal/panel (`src/ui/manager/components/ActionEditor.vue`)
- [x] 3.4 Implement Variable Editor component (`src/ui/manager/components/VariableEditor.vue`)
- [x] 3.5 Implement JSON Import/Export component with Zod validation (`src/ui/manager/components/JsonBackup.vue`)
- [x] 3.6 Implement Storage Diagnostic Footprint Bar (`src/ui/manager/components/StorageDiagnostic.vue`)
- [x] 3.7 Assemble main Manager application in `src/ui/manager/App.vue`, verify build (`npm run build`) and unit tests (`npm test`)
