## ADDED Requirements

### Requirement: Broadcast Channel Handshake
The system SHALL check for the availability of the Dice+ extension using a PING/PONG handshake over `OBR.broadcast` with a 3000ms timeout.

#### Scenario: Dice+ is installed and responsive
- **WHEN** `isAvailable()` is called and Dice+ responds with `PONG` within 3000ms
- **THEN** the adapter returns `true`

#### Scenario: Dice+ is not installed or unresponsive
- **WHEN** `isAvailable()` is called and no `PONG` response is received within 3000ms
- **THEN** the adapter returns `false`

### Requirement: Roll Sequence Dispatch
The system SHALL map `ResolvedRollSequence` steps into `DicePlusRollRequest` payloads and transmit them over the `com.owlbear-rodeo.dice-plus/broadcast` channel.

#### Scenario: Successful roll dispatch
- **WHEN** `roll(sequence)` is invoked and Dice+ is available
- **THEN** a `DicePlusRollRequest` payload containing all resolved expressions and visibility flags is broadcasted and returns a successful `RollDispatchResult` with a generated transaction ID

### Requirement: Notification on Unavailable Extension
The system SHALL display an OBR warning notification if a roll is initiated while Dice+ is unavailable.

#### Scenario: Rolling when Dice+ is absent
- **WHEN** `roll(sequence)` is invoked while `isAvailable()` returns `false`
- **THEN** an OBR warning notification is triggered and `success: false` is returned
