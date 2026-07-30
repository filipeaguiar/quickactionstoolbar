## 1. Storage & Capacity Measurement Engine

- [x] 1.1 Implement UTF-8 byte size utility and metrics in `src/storage/metadataSize.ts`
- [x] 1.2 Implement pre-save simulation function `simulateSaveCapacity()` with warning (12 KB) and hard lock (15 KB)
- [x] 1.3 Add unit tests for storage capacity metrics in `tests/storage.test.ts`

## 2. Authorization Engine & Role Validation

- [x] 2.1 Implement `src/storage/authorizationEngine.ts` with role-based write rules (GM vs PLAYER)
- [x] 2.2 Enforce field-level protection preventing players from modifying `playerAssignments` or `ownerPlayerId`
- [x] 2.3 Add unit tests for authorization checks in `tests/authorization.test.ts`

## 3. Room Metadata Repository & Token Linkage

- [x] 3.1 Implement `src/storage/roomProfileRepository.ts` for safe reading and partial updating of `OBR.room.metadata`
- [x] 3.2 Implement `src/storage/tokenProfileLinkRepository.ts` for token metadata linking (`PROFILE_REFERENCE_KEY`)
- [x] 3.3 Add context menu action "Vincular Ações" in `src/background/registerContextMenu.ts`
- [x] 3.4 Wire metadata listeners in `src/background/index.ts` and verify build (`npm run build`) and test suite (`npm test`)
