# Packet Dash · Implementation plan

## Build target

Implement the clarified specification for Packet Dash. First deliver one complete round (Level 1, round 1) with correct grading, explanatory feedback, retry and advance; then add the other mechanics and polish through the same session and rendering code.

**Hardest behavior to get right:** keeping the platformer and Console mode as two views of one set of choices, so both submit identical answer objects to one evaluator and progress can never be awarded by the animation layer.

**First evidence we'll check:** round 1.1, header `DST 10.0.0.5 : 443`. Entering 10.0.0.5 door 443 is correct; entering 10.0.0.9 door 443 is "wrong building".

## Stack and serving

- Semantic HTML, CSS and native JavaScript modules. No framework, bundler, backend or runtime dependency.
- One `<canvas>` draws the platformer (2D context, no library). Everything a learner must read (header bar, network log, receiver board, race table, Console mode) is DOM text, so the canvas is never the only source of information.
- `data/levels.json` holds all authored content, fetched by relative URL.
- In-memory session; reload starts fresh.
- Relative paths throughout, so it works from a GitHub Pages subpath.

Preview from the repository root:

```sh
python3 start.py            # serves 127.0.0.1:8000 and opens the browser
python3 -m http.server 8000 --bind 127.0.0.1   # equivalent, without auto-open
```

## Files and responsibilities

```text
index.html          Page shell: header bar, stage, log, controls
style.css           Network-operations theme, focus, reduced motion, narrow layout
main.js             Load → validate → run; wires state, screens and game view
engine/
  rules.js          evaluate(round, answer) for door, path and pieces mechanics; pure
  content.js        validateContent(doc): schema, references, ties, empty missing sets
  state.js          Session transitions: attempts, hints, completion, next, restart
  feedback.js       Fills data-authored templates with evaluator evidence
render/
  world.js          Builds a world layout (ground, gaps, choice zones) from a round; pure
  game.js           Canvas loop: physics, camera, drawing, entering zones
ui/
  dom.js            Tiny element helper
  screens.js        Network map, briefing, level done + news card, summary, error
  panels.js         Header bar, Console mode, receiver board, race replay
data/levels.json    Sources, levels, rounds, hints, feedback templates, news cards
tests/
  suite.js          All test cases (shared by Node and the browser runner)
  run.test.js       node:test adapter
  index.html        Browser runner with pass/fail summary
start.py            Local server + browser open
```

## Data contract

`{ schemaVersion: 1, sources: [...], levels: [...] }`

- **Source:** `id`, `title`, `url`, `section`, `claim`.
- **Level:** `id`, `title`, `outcome`, `mechanic` (`door` | `path` | `pieces`), `link` (map edge), `briefing` {`analogy`, `example`, `boundary`}, `sourceIds`, `feedback` {reasonCode → template}, `news` {`headline`, `reported`, `connection`, `sourceIds`}, `rounds`.
- **Round:** `id`, `header`, mechanic data, `hints` [method, worked solution].
  - **door:** `header.src`, `header.dst` (dotted IPv4), `header.port` (1–65535); `buildings` [{`ip`, `doors` [{`port`, `service`, `listening`}]}]. Every round has a Bounce back pad.
  - **path:** `header.sizeKB` (> 0); `paths` exactly two [{`id`, `name`, `medium`, `travelMs` > 0, `bandwidthKBperMs` > 0}].
  - **pieces:** `header.message`; `pieceCount` (2–8, divides message length); `arrived` [sequence numbers in arrival order].
- **Answer shapes:** `{kind:"door", ip, port}`, `{kind:"bounce"}`, `{kind:"path", pathId}`, `{kind:"pieces", resend:[n…]}`.
- **Validation rejects:** missing or duplicate IDs, unknown source IDs, malformed IPs or ports, a destination building not present, duplicate doors, path counts ≠ 2, non-positive numbers, a delivery-time tie, a message not divisible into pieces, sequence numbers out of range, nothing missing, missing hints or feedback templates.

## Domain evaluation contract

`evaluate(round, answer) → { status, expected, reasonCode, evidence }`, with status `correct` | `incorrect` | `invalid-input` | `content-error`. It is pure.

- **door:** find the building whose IP equals `dst`, then its door with `port`. Listening → expected door; absent or closed → expected bounce. Wrong IP → `wrong-building`; right IP and other door → `wrong-door`; the closed door itself → `closed-door`; bounce when someone listens → `unneeded-bounce`.
- **path:** total = `travelMs + sizeKB / bandwidthKBperMs`; the smaller total wins. Higher-bandwidth but slower → `wrong-wider`; shorter-travel but slower → `wrong-shorter`.
- **pieces:** missing = {1…n} − set(arrived). Exact match → `correct-resend`. Any missing piece not resent → `still-missing`. Only extras, all after the first gap → `out-of-order-not-lost`; otherwise → `resent-received`. Empty selection → `invalid-input`.

**Feedback example:** round 2.1, Trunk chosen → `wrong-wider` → "✖ Fibre Trunk: 110 ms + 10 KB ÷ 10 KB/ms = 111 ms. Copper Tunnel: 20 ms + 10 KB ÷ 1 KB/ms = 30 ms. …"

## Session transitions

```text
loading → map → briefing → play ─┬ invalid → guidance → play
                                 ├ incorrect → log + respawn at decision → play
                                 └ correct → log → Next → next round | level-done
level-done (stats + news card) → Next → map → briefing … → summary
content failure → error screen
confirmed Restart → map, fresh session
```

`engine/state.js` owns view, level/round index, attempts, hints and solved rounds. The game view only reports "player entered zone X"; it never decides correctness.

## Interaction and visual direction

Network-operations theme, as specified: packet-capture header bar, topology map, terminal log, server-port doors with LEDs, copper vs fibre paths, receiver board. Motion reveals consequences (race replay, board reordering). `prefers-reduced-motion` and a toggle disable LED blinking and replays. Focus moves to each new screen's heading.

## Implementation order

| Slice | Deliverable | Evidence |
| --- | --- | --- |
| 1 | `rules.js` + spec cases for all three mechanics | Node tests pass |
| 2 | Content validation + `levels.json` | Shipped content validates; broken samples rejected |
| 3 | `state.js` | Attempts, hints, duplicate submit, completion, restart tests pass |
| 4 | Screens, header bar, log, Console mode | Full game playable without canvas |
| 5 | Canvas platformer over the same choices | Playthrough with platforming |
| 6 | Race replay, receiver board, news cards, reduced motion, narrow layout | Manual checklist recorded |
| 7 | README, start.py | Fresh-clone run works |

## Verification and reporting

`node --test tests/` and `http://127.0.0.1:8000/tests/` run the same suite; zero tests discovered is a failure. Results for each acceptance criterion (pass / fail / not run, date, how checked) are recorded in `specs/001-packet-dash/verification.md`.

## Scope controls

No persistence, multiplayer, audio, runtime AI, level editor or procedural rounds in v1. If time runs short, cut polish (replays, LED effects) before explanations or Console mode.
