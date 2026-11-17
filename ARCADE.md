---
# Adapted from WORKSHOP/LAB/StarterKit/ARCADE.md; filled in by the build agent from its own session.
arcade_version: 1

game:
  title: "Packet Dash"
  slug: packet-dash
  tagline: "Run and jump as a packet; learn ports, latency vs bandwidth and resends."
  summary: "Players run and jump as Pak, a data packet crossing the network, and at the end of each stretch make one delivery decision: which building and door (IP address and port), which path (latency vs bandwidth), which numbered pieces to resend. Each choice is explained in a network log, and after each level a news card links the idea to the November 2026 FAA ground stop and Chase outage."
  topics: ["TCP ports", "connection refused", latency, bandwidth, "sequence numbers", "selective resend"]
  category: network-fundamentals
  skill_level: beginner
  play_minutes: unknown
  levels: 3
  card_image: "docs/card.png"
  card_image_alt: "Packet Dash Level 1: Pak, a cyan envelope-shaped packet, stands before two server racks with numbered port doors 22, 443 and 5432 lit LISTENING, thinking 'my header: DST 10.0.0.5 : 443'."
  repo: "https://github.com/bharadwajbb/packet-dash"
  repo_path: ""
  license: Apache-2.0

creator:
  name: "BB (Bharadwaj)"
  github: bharadwajbb
  location: ""
  organization: ""
  links: []
  first_spec_project: true
  workshop: "NAF AC6"
  consent_to_publish: true

build:
  started: "2026-11-17"
  finished: "2026-11-17"
  wall_time: unknown
  spec_driven:
    framework: "GitHub Spec Kit"
    framework_version: "1.4.2.dev0"
    artifacts: [constitution, spec, clarify, plan, tasks, analysis, verification]
    task_count: 29
    loops_or_phases: 8
  model: "claude-opus-5-5"
  helper_models: []
  harness: "Claude Code"
  harness_version: "2.1.326"
  mcp_servers: ["Blender MCP (connected, not used)", "Claude Docs (connected, not used)", "Microsoft 365 (connected, not used)", "RFC MCP (configured, failed to connect)"]
  rag_and_sources: ["RFC 9293 §3.4 and §3.5.2 (fetched from rfc-editor.org)", "RFC 2018 §3 and §5 (fetched from rfc-editor.org)", "IANA Service Name and Port Number Registry (cited)", "Kurose & Ross, Computer Networking §1.4 (cited, not fetched)", "Scripps News, Al Jazeera and CNN reporting on the Nov 13 FAA ground stop and Nov 16 Chase outage (web search and fetch)", "NAF AC6 StarterKit templates and lab guide"]
  skills_and_plugins: ["Spec Kit project scaffold via `specify init --integration claude`; the /speckit-* commands were not invoked, the agent wrote each artifact by hand in the same order"]
  other_tools: ["Node.js 22.21.1 test runner", "Python 3.11.7", "puppeteer-core 23.11.1 driving Google Chrome 157 headless for playtests and screenshots", "Git", "GitHub CLI", "uv", "web search and fetch"]
  human_prompts: 11
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "Not measured in this session."
  ai_generated_assets: ["visuals: drawn in canvas and CSS code written by the agent; no image, audio or model assets", "screenshots: captured from the running game"]

runtime:
  kind: static-web
  stack: [HTML, CSS, "JavaScript ES modules", "Canvas 2D"]
  start: "python3 start.py"
  url_after_start: "http://127.0.0.1:8000"
  hosted_url: ""
  static_root: "."
  requires_install: false
  requires_network: false
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: ["Chrome 157 (headless)"]
  accessibility: "Automated keyboard-only playthrough of the link test and all six rounds in platform mode and Console mode (choices as buttons, no jumping); OS reduced-motion preference and toggle checked; 390px-wide layout has no horizontal scroll. No screen-reader test and no human keyboard-only run recorded."
  save_state: "In-memory only; reloading starts a new session."

verification:
  tests: "npm test"
  tests_passing: 46
  facts_sourced_from: ["RFC 9293", "RFC 2018", "IANA port registry", "Kurose & Ross §1.4", "news articles linked in data/levels.json"]
  known_limits: ["Simplified model of one IPv4 packet, one TCP-style connection and one one-way trip: no handshakes, routing, DNS, firewalls, NAT, congestion, queueing, TCP windows or real timing.", "Level 2 counts only travel time plus size ÷ bandwidth.", "News cards reflect reporting as of Nov 17, 2026; investigations may change details.", "No screen-reader test or second-person source review yet."]
---

## In one paragraph

Packet Dash is a short browser platformer for software engineers and other technical people who use networks every day but never studied them. You play Pak, a packet travelling from a laptop to a server: run along the cable trays, jump the dropped links, then make one delivery decision per round. Pick a building and door to learn that the IP address picks the machine and the port picks the program, race a copper tunnel against a fibre trunk to see that bandwidth isn't the only thing that sets speed, and resend exactly the missing numbered pieces. Each level ends with a news card tying the idea to that week's FAA ground stop or Chase outage.

## How it was built

Setup came first: Spec Kit was installed and initialised with the Claude integration in a new local repository with the StarterKit files. The human rejected the idea menu, then asked for ideas that need no networking background (they are a software engineer), then asked for "something like a Mario but with networking theme". We made it an original platformer instead of a copy and wrote the spec around three beginner ideas. The human asked for the UI itself to look like networking, so the header bar, topology map, terminal log, port doors and receiver board all show real values. We then wrote the constitution, clarified decisions, plan, tasks and analysis, and built the pure rules engine and hand-checked tests before any UI. Analysis caught a missing Bounce back pad in round 1.1 and a message that didn't split evenly into six pieces. The outage cards were added at the human's request, sourced from published reporting. After a first playable version, the human said the instructions should be interactive, so text controls were replaced by a practice "link test" with floating keys and first-round prompts. Every round was played in headless Chrome before each commit.

## What we'd tell the next builder

- Make the platformer and the accessible mode two views of one list of choices, each carrying the evaluator's answer object, so they can never disagree.
- Write the expected answers by hand before the evaluator exists. It found a tie case and a bad message length early.
- Drive the real browser with key presses before calling it done. It's how we confirmed the gaps were jumpable and the prompts didn't overlap labels.
