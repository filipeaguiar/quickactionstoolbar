## 1. Dice+ Result Contract

- [x] 1.1 Add typed Dice+ result, group, and die interfaces matching the captured `dice-plus/roll-result` payload while tolerating additional fields
- [x] 1.2 Add protocol constants for the actual result and error channels and a representative captured-result test fixture without player-identifying data
- [x] 1.3 Update the adapter to correlate individual step responses by `rollId`, return structured results, ignore unrelated events, and clean up listeners
- [x] 1.4 Make Dice+ errors and step timeouts return explicit failures instead of successful boolean fallbacks

## 2. D&D 2024 Runtime Rules

- [x] 2.1 Preserve `execute` and `criticalBehavior` in resolved roll steps and update affected interfaces and mappings
- [x] 2.2 Add System Pack classification for a kept natural d20 value of 20, excluding totals and discarded dice
- [x] 2.3 Refactor critical damage transformation so runtime attack outcomes can double damage dice without duplicating fixed modifiers
- [x] 2.4 Remove `CRITICAL` from the selectable variants returned by the D&D 2024 System Pack while retaining internal critical outcome handling

## 3. Conditional Action Execution

- [x] 3.1 Add an action executor that resolves and dispatches steps sequentially while retaining the most recent attack context
- [x] 3.2 Enforce `ALWAYS`, `ON_HIT`, and `ON_CRITICAL`, including skipping attack-dependent steps without a preceding result
- [x] 3.3 Apply `DOUBLE_DICE` only to eligible damage after a critical attack and preserve normal or `NONE` damage otherwise
- [x] 3.4 Stop remaining execution on Dice+ failure when `stopOnError` is enabled and return an accurate overall result

## 4. Popover Integration

- [x] 4.1 Replace direct whole-sequence adapter dispatch in the action popover with the conditional action executor
- [x] 4.2 Remove the manual “Acerto Crítico” button and expose only allowed Normal, Advantage, and Disadvantage attack modes
- [x] 4.3 Keep the popover open and show visible feedback when a Dice+ step errors or times out

## 5. Verification

- [x] 5.1 Add adapter tests for matching results, unrelated `rollId`, error responses, listener cleanup, and timeout failure on the real Dice+ channels
- [x] 5.2 Add System Pack tests for natural 20, modified total without natural 20, kept and discarded advantage/disadvantage dice, and `criticalBehavior: NONE`
- [x] 5.3 Add executor tests for normal damage, automatic critical damage, conditional-step skipping, multiple attack contexts, and `stopOnError`
- [x] 5.4 Add popover tests or component assertions confirming the manual critical option is absent and failure feedback is presented
- [ ] 5.5 Run the full test suite and production build, then verify normal, advantage, disadvantage, automatic critical, and timeout flows in Owlbear Rodeo with Dice+

## 6. Runtime Compatibility and Popover Stability

- [x] 6.1 Normalize nested Owlbear broadcast envelopes and allow special Dice+ animations enough timeout/settle time
- [x] 6.2 Preserve automatic critical damage for legacy DAMAGE steps with omitted `criticalBehavior`, and expose purpose/execution/critical behavior in the action editor
- [x] 6.3 Classify a kept natural 1 as an automatic miss and skip hit/critical-dependent damage
- [x] 6.4 Serialize toolbar synchronization, skip unchanged action sets, and test that stable ToolActions preserve popover anchors
