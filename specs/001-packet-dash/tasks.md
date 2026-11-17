# Tasks · 001-packet-dash

Generated from `spec.md` and `plan.md`. One complete round first (T1–T9), then the curriculum, then polish. `[x]` means done **and** its evidence was recorded in `verification.md`.

## Slice 1 · Prove the rule

- [x] T1 `engine/rules.js`: `evaluate` for the door mechanic (correct-deliver, correct-refused, wrong-building, wrong-door, closed-door, unneeded-bounce, invalid-input)
- [x] T2 path mechanic: delivery time = travel + size ÷ bandwidth; wrong-wider, wrong-shorter; tie → content-error
- [x] T3 pieces mechanic: missing set; still-missing, out-of-order-not-lost, resent-received; empty → invalid-input
- [x] T4 `tests/suite.js`: every spec case with hand-written expected results (AC2, AC3, AC4)

## Slice 2 · Content

- [x] T5 `data/levels.json`: 3 levels × 2 rounds, briefings, hints, feedback templates, sources
- [x] T6 `engine/content.js`: validate schema, references, ties, missing building, nothing missing, feedback coverage
- [x] T7 tests: shipped content validates; broken samples rejected

## Slice 3 · Session

- [x] T8 `engine/state.js`: map → briefing → play → level-done → summary; attempts, hints, duplicate submit guard, restart with confirmation (AC5–AC8)
- [x] T9 state tests, including a scripted full playthrough

## Slice 4 · Playable without the canvas

- [x] T10 `index.html`, `style.css`: top bar, packet header bar, screen area, network log (live region)
- [x] T11 `ui/screens.js`: network map (SVG + text label), briefing, level done, summary, content error
- [x] T12 `ui/panels.js`: header bar, Console mode (AC9), receiver board, path table
- [x] T13 `main.js`: wiring, keyboard shortcuts H / C / N, focus management

## Slice 5 · Platformer

- [x] T14 `render/world.js`: runway with two gaps, one zone per choice, each carrying the evaluator's answer object
- [x] T15 `render/game.js`: physics, camera, entering zones, respawn without penalty, networking-themed drawing
- [x] T16 world tests: every zone on solid ground and gradable

## Slice 6 · Teaching polish

- [x] T17 race replay with static fallback (reduced motion)
- [x] T18 "From the news" cards (FAA Nov 13, Chase Nov 16) with sources and disclaimer
- [x] T19 reduced-motion toggle and OS preference; narrow layout (AC10)

## Slice 7 · Package

- [x] T20 `start.py` launcher, `tests/index.html` browser runner, `npm test`
- [x] T21 README with actual behavior, commands and verification
- [x] T22 automated Chrome playtest of all six rounds; screenshots in `docs/`

## Slice 8 · Interactive onboarding (added 2026-11-17 after feedback: "instructions should be interactive, not text")

- [x] T26 `render/tutorial.js`: link test world and pure step logic (run → jump → enter → help)
- [x] T27 floating keycaps, progress strip and live checklist; Skip; shown once per session
- [x] T28 first-round coach prompts for paths and pieces; Pak's thought bubble at the decision point
- [x] T29 removed the text control instructions from briefings

## Not done (recorded, not hidden)

- [ ] T23 human keyboard-only playthrough by a teammate
- [ ] T24 screen-reader check (VoiceOver / NVDA)
- [ ] T25 second-person review of briefings and news cards against sources
