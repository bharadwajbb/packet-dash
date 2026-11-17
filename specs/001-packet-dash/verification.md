# Verification · 001-packet-dash

**Date:** 2026-11-17 · **Environment:** macOS 26 (Darwin 25.3, arm64), Node 22.21.1, Python 3.11.7, Google Chrome (headless, driven by puppeteer-core 23.11.1) · **Server:** `python3 start.py --no-open --port 8765`

## Automated

| Suite | Result |
| --- | --- |
| `npm test` (Node test runner) | 42 / 42 pass |
| `http://127.0.0.1:8765/tests/` (browser runner, same suite) | 41 / 41 pass (Node adds the "tests discovered" check) |

## Acceptance criteria

| AC | Result | How checked |
| --- | --- | --- |
| AC1 fresh session shows map + Level 1 briefing first | Pass | state test; Chrome playtest opened on the map, then the briefing |
| AC2 1.1 correct door delivers with explanation | Pass | rules + feedback tests; Chrome log: `✔ delivered 10.0.0.5:443 → HTTPS …` |
| AC3 1.1 wrong building explains, keeps round, returns Pak | Pass | Chrome: log `✖ right door, wrong building …`, Pak x reset to 840 (decision point) |
| AC4 empty SEND gives guidance, no attempt | Pass | rules test `3.x invalid: empty selection`; state test `invalid input does not count an attempt` |
| AC5 hint method, then worked solution; recorded | Pass | state test; Chrome: H printed `hint 1/2 …` |
| AC6 attempts counted once per valid submit; repeat ignored | Pass | state test `correct completes once; repeat submit ignored` |
| AC7 level completes after both rounds; final → summary | Pass | state full-playthrough test; Chrome reached `level-done` ×3 and `summary` |
| AC8 restart confirm/cancel | Pass | Chrome: cancel kept attempts = 1; confirm returned to map with attempts 0 |
| AC9 keyboard-only, Console mode | Pass (automated) | Chrome played 1.1–3.1 with key presses in platform mode and 3.2 in Console mode |
| AC10 text feedback in live region; reduced motion | Pass (partial) | log is `role="log"` with `aria-live="polite"`; OS reduced-motion enables reduced mode. Screen-reader announcement not tested |

## Spec cases (all in `tests/suite.js`)

1.1 correct / wrong building / wrong door / unneeded bounce; 1.2 refused / lit door / other building / closed door; 2.1 tunnel 30 vs 111 ms; 2.2 trunk 210 vs 1020 ms; tie at 100 KB → content error; 3.1 {3,5} / resend all / only {3}; 3.2 {3} / {3,4,5,6}; empty and out-of-range input; broken content samples.

## Layout and motion

- 1360 × 1000: all screens rendered (screenshots in `docs/`)
- 390 × 900: no horizontal page scroll; canvas small but legible, side panels stack
- `prefers-reduced-motion: reduce`: reduced mode enabled automatically; race replay shows final values without animation

## Not run

- Human keyboard-only playthrough by a teammate
- Screen reader (VoiceOver / NVDA)
- Second-person source review of briefings and news cards
- Hosting on GitHub Pages (not published)
