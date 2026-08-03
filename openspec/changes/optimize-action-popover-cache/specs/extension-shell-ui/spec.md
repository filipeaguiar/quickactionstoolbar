## MODIFIED Requirements

### Requirement: Anchored Variant Selection Popover
The extension SHALL open an anchored `Popover` via `OBR.popover.open` using `anchorElementId: elementId` when a `ToolAction` is clicked, SHALL render cached selected-action context without full-profile Firestore reads when available, and SHALL continue closing the popover after successful execution.

#### Scenario: Clicking an action button
- **WHEN** a user clicks on a `ToolAction` button
- **THEN** the extension opens `/action-popover.html` anchored to the clicked button's element ID

#### Scenario: Cached context is available after iframe recreation
- **WHEN** a previously closed action popover is opened again for an action in valid assigned cache
- **THEN** the fresh Vue application renders the attack name and variant toolbar from cache without waiting for a full action-collection query

#### Scenario: Successful action execution
- **WHEN** Dice+ completes the action successfully and non-blocking history handling finishes
- **THEN** the extension closes the Owlbear popover and permits Owlbear to destroy its iframe as before

#### Scenario: Context cannot be safely resolved
- **WHEN** cache validation and targeted Firestore fallback cannot resolve the assigned selected action
- **THEN** the popover stays open with visible feedback and does not execute a fabricated fallback action
