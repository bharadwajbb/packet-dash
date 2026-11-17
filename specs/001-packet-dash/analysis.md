# Analysis · 001-packet-dash

Cross-check of constitution, spec, plan and tasks before implementation (2026-11-17). Each finding has a resolution.

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| A1 | High | Round 1.1 had no Bounce back pad, so the misconception "bounce whenever unsure" was untestable, and the pad's presence in 1.2 alone gave away the answer | Pad added to both Level 1 rounds (spec table updated); `unneeded-bounce` reason and feedback added |
| A2 | High | C3 forbids timers, but Level 2 shows millisecond values and a race | The race is a replay of computed delivery time after a choice, never a countdown on the player. Recorded in spec clarifications |
| A3 | Medium | C4 requires every decision without pointer precision or timing; a platformer needs jumping | Console mode (C) offers the same choices from the same world zones; the plan makes zones the single source of choices; a world test checks each zone is gradable |
| A4 | Medium | Round 3.2's original message "SEND MORE CATS" (14 characters) did not split evenly into 6 pieces | Replaced with "PING PONG OK" (12); validation now rejects messages that don't divide evenly |
| A5 | Medium | Boundary case at 100 KB makes both paths 120 ms: two valid answers | Validation rejects ties as a content error; a test proves it; no shipped round uses a tying size |
| A6 | Medium | News cards about real organisations risk overstating causes | Cards quote or closely paraphrase the reporting, show dates and links, include a disclaimer, use no branding, and the connection sentence is framed as an analogy |
| A7 | Low | 1.2's wrong-door feedback didn't remind the player that the requested door is closed | Optional `+refused` follow-up templates in data, appended by `feedback.js` |
| A8 | Low | Plan test command `node --test tests/` fails on Node 22 (directory not accepted) | `npm test` runs `node --test tests/*.test.js`; README updated |

No constitution principle was weakened.
