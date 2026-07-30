## 1. Protocol & Adapter Interfaces

- [x] 1.1 Create `src/integrations/dice-plus/protocol.ts` defining channels, request payloads, and handshake messages
- [x] 1.2 Create `src/integrations/dice-plus/adapter.ts` with `DiceAdapter` interface and `DicePlusAdapter` class

## 2. Unit Tests & Verification

- [x] 2.1 Write unit tests for `DicePlusAdapter` (testing `isAvailable` handshake, timeout, and `roll` dispatch) in `tests/diceAdapter.test.ts`
- [x] 2.2 Verify test suite (`npm test`) and production build (`npm run build`)
