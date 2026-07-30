## 1. System Pack Interfaces & AST Transformers

- [x] 1.1 Define `SystemPack`, `ActionVariant`, `ResolvedRollSequence` interfaces in `src/systems/types.ts`
- [x] 1.2 Implement `applyAdvantageToAST`, `applyDisadvantageToAST`, and `applyCriticalToAST` in `src/systems/dnd2024.ts`

## 2. D&D 2024 System Pack & Registration

- [x] 2.1 Implement `DnD2024SystemPack` class implementing `SystemPack` interface in `src/systems/dnd2024.ts`
- [x] 2.2 Create `SystemPackRegistry` in `src/systems/registry.ts` to manage system packs

## 3. Unit Tests & Verification

- [x] 3.1 Write unit tests for Advantage, Disadvantage, Critical, and Reckless Attack AST transformations in `tests/systemPack.test.ts`
- [x] 3.2 Verify test suite (`npm test`) and production build (`npm run build`)
