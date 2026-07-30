## 1. Extension Shell & Tool Initialization

- [x] 1.1 Implement background entry point with `OBR.onReady()` in `src/background/index.ts`
- [x] 1.2 Implement main Tool registration module `src/background/registerTool.ts` using `OBR.tool.create`
- [x] 1.3 Add RPG Awesome SVG asset resolver in `src/utils/iconResolver.ts`

## 2. Dynamic ToolAction & Overflow Management

- [x] 2.1 Implement `src/background/registerToolActions.ts` with `syncToolActions()` algorithm
- [x] 2.2 Implement deselect and removal of old `ToolAction` via `OBR.tool.removeAction`
- [x] 2.3 Implement visual limit logic (max 8 direct buttons; 7 direct + 1 overflow button for >=9 actions)

## 3. Anchored Variant Popover & Manager Action

- [x] 3.1 Implement popover dispatcher `src/background/popoverManager.ts` calling `OBR.popover.open` with `anchorElementId`
- [x] 3.2 Update `action-popover.html` and `src/ui/action-popover/App.vue` to render variant options
- [x] 3.3 Verify ManifestAction popover rendering in `src/ui/manager/App.vue`
- [x] 3.4 Execute build (`npm run build`) and test suite (`npm test`) to verify implementation
