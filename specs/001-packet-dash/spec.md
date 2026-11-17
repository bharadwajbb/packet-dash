<!-- Feature 001-packet-dash · generated from StarterKit/SPEC.md and clarified 2026-11-17 -->

# Packet Dash · First playable specification

## The pitch

**The player runs and jumps as a data packet across a side-scrolling network and, at the end of each stage, makes one delivery decision that the level then plays out and explains.**

The player is **Pak**, a small packet travelling from a laptop to a server across a stylised network. Each round shows **the packet's own header (destination address, port, size or piece numbers) and the choices in front of it** and asks the player to **jump into the door, path or resend set they think is correct**. A correct decision **delivers the packet with a green "delivered" log line and lights the next link on the network map**; an incorrect decision **bounces Pak back with a terminal-style log line naming the mistake and the rule**, and the round stays playable. The session ends when **all six rounds are delivered and the summary screen appears**.

## Who this is for

- **Learner:** software engineers and other technical people who use networks every day but have never studied networking.
- **Assumed knowledge:** none about networking. Players know what a website, a server and a slow page load are, and can use arrow keys.
- **What the briefing teaches:** before each level, one short card with a plain-language analogy and a worked example: an **IP address** is the building, a **port** is the door to one program inside it; **latency** is how long the road is, **bandwidth** is how wide it is; a message travels as **numbered pieces** that can arrive out of order or go missing.
- **Why interaction helps:** three common beliefs get disproved by watching them fail: "the right door number on any building will do", "a wider connection is always faster", and "if pieces arrive out of order, the later ones are lost".
- **Session target:** 5–10 minutes for a first playthrough, with unlimited thinking time. No countdown clocks.

## Learning outcomes and evidence

| ID | After playing, the learner can… | The game asks them to… | Evidence of success |
| --- | --- | --- | --- |
| LO1 | Explain that an IP address picks the machine and a port picks the program on it, and recognise "connection refused" | Enter the door matching the header's address and port, or choose "Bounce back" when nothing is listening there | Correct door/pad entered in both Level 1 rounds |
| LO2 | Predict whether a short-narrow or long-wide path delivers a given size sooner | Choose the tunnel or the trunk for a packet of a stated size | Faster path chosen in both Level 2 rounds |
| LO3 | Identify exactly which numbered pieces are missing, independent of arrival order | Select the pieces to resend from the receiver's board | Exactly the missing set resent in both Level 3 rounds |

## The technical model

- **Level 1 rule:** a packet is delivered only to the machine with its destination IP address and to the program listening on its destination port. A packet never changes its destination to find an open door. If no program listens on that port, the server replies with a reset, which applications report as "connection refused".
- **Level 2 rule:** delivery time = path travel time + size ÷ path bandwidth. The path with the smaller total wins.
- **Level 3 rule:** each piece carries a sequence number; the receiver reorders pieces by number and reports which numbers it holds. The sender resends only the numbers the receiver lacks.
- **Context:** a deliberately simplified teaching model of one IPv4 packet, one TCP-style connection, and one one-way trip. It is not a protocol simulator.
- **Assumptions:** the network path to the building already works; nothing else shares the links; sizes are in KB and bandwidth in KB per millisecond so the arithmetic stays small.
- **Excluded behavior:** handshakes, firewalls, NAT, DNS, routing tables, congestion, queueing, TCP windows, round trips, headers' own size, encryption and real timing. Level 2 ignores everything except travel time and size ÷ bandwidth.
- **Authoritative references (verify during clarify):**
  - IANA Service Name and Transport Protocol Port Number Registry, https://www.iana.org/assignments/service-names-port-numbers — 22 is SSH, 443 is HTTPS, 5432 is PostgreSQL.
  - RFC 9293 (TCP) §3.5.2 "Reset Generation", https://www.rfc-editor.org/rfc/rfc9293#section-3.5.2 — a segment sent to a port with no connection or listener gets a reset.
  - RFC 9293 §3.4 "Sequence Numbers" — every piece of data is numbered so the receiver can order it and detect gaps.
  - RFC 2018 (TCP Selective Acknowledgment), https://www.rfc-editor.org/rfc/rfc2018 — the receiver can tell the sender which blocks it holds so only missing data is resent.
  - Level 2 formula is the standard transmission-plus-propagation delay model (Kurose & Ross, *Computer Networking: A Top-Down Approach*, §1.4), with queueing and processing delay excluded.

Each level's briefing card states its boundary in one plain sentence, for example: "In this level we only count travel time and how long your packet takes to squeeze through. Real networks add more."

## The repeatable game loop

1. **Brief:** a briefing card introduces the level's one idea with an analogy and a worked example using different numbers from the rounds.
2. **Inspect:** Pak runs through a short platforming stretch (one or two screens) to the decision point. Pak's header bar and every choice's labels are on screen throughout.
3. **Choose:** the player enters a door, path entrance, or presses the SEND flag after selecting pieces. Entering is the explicit submission; walking past a door does not submit.
4. **Explain:** the network log prints the outcome, the values involved and the rule. The level shows the consequence (door opens, race replay, receiver board fills).
5. **Retry or advance:** a wrong answer returns Pak to the decision point with the log still visible; a correct answer lights the link on the network map and enables Next.
6. **Reflect:** the level summary lists rounds delivered, attempts per round and hints used.

**Platforming is not graded.** Falling into a gap respawns Pak at the start of the screen with no penalty, no lives and no score. Only the decision counts as an attempt.

**Worked interaction (Level 2, round 1):** Pak's header reads `SIZE 10 KB`. The path splits: a thin copper **Tunnel** labelled `travel 20 ms · 1 KB/ms` and a wide fibre **Trunk** labelled `travel 110 ms · 10 KB/ms`. The player assumes wider is faster and runs into the Trunk. The log prints: `✖ trunk: 110 ms + 10 KB ÷ 10 KB/ms = 111 ms. tunnel: 20 ms + 10 KB ÷ 1 KB/ms = 30 ms. A small packet barely uses the width — the long road costs more than the narrow pipe.` A ghost replay races both paths side by side. Pak returns to the fork; the player enters the Tunnel and the log prints `✔ delivered in 30 ms via tunnel`.

## Required stories and acceptance criteria

### US1 · Make and understand a decision — P1

As a learner, I want to apply the rule to visible evidence and understand the result.

- **AC1:** Given a fresh session, when I start, then I see the network map and the Level 1 briefing card before any decision point.
- **AC2:** Given Level 1 round 1 (header `DST 10.0.0.5 : 443`), when I enter building 10.0.0.5's door 443, then the door opens, the log prints a delivered line naming the address and port, and the explanation appears.
- **AC3:** Given that round, when I enter building 10.0.0.9's door 443, then the log says "right door, wrong building", explains that the address picks the machine, completion stays unchanged, and Pak returns to the decision point.
- **AC4:** Given Level 3, when I press SEND with no pieces selected, then the log shows guidance ("select at least one piece to resend") and attempts and completion stay unchanged.

### US2 · Learn from help and finish the game — P1

As a learner, I want help when stuck and a clear view of my progress.

- **AC5:** "Ask the admin" (H) first explains the method in words. A second press shows the worked solution for this round. Hint use is recorded and does not complete the round.
- **AC6:** Each entered door, path or SEND counts as one attempt until the round is solved. A correct submission completes it once; re-entering after success has no effect.
- **AC7:** A level completes after both of its rounds are delivered. Next opens the following round or level; the final round opens the session summary.
- **AC8:** Restart asks for confirmation, then clears the session and returns to the network map and Level 1 briefing. Cancel keeps the session.

### US3 · Play with accessible controls — P1

As a keyboard user, I want to inspect the challenge, choose, submit, get help, and advance without a mouse.

- **AC9:** Arrow keys move, Space jumps, Up or E enters a door. A **Console mode** toggle (C) replaces the platforming with a focusable list of the same choices as buttons, so every decision can be made with Tab and Enter and no jumping. All controls have visible focus and accessible names.
- **AC10:** Every result is written as text in the network log, stays readable, and is announced through a live region. Reduced motion (system setting or toggle) replaces animations and the race replay with a static before/after table without losing any values.

## Version-one content

Three levels, two rounds per level, six rounds total. One platforming mechanic and one decision per round throughout.

| Level | New concept | Prerequisite | Misconception to expose |
| --- | --- | --- | --- |
| 1 · Find the Door | Address picks the machine; port picks the program; nobody listening means "connection refused" | None | Any building with the right door number will do; a packet can try another open door |
| 2 · Fast or Wide? | Delivery time depends on both travel time and size ÷ bandwidth | Level 1 | A wider connection is always faster |
| 3 · Lost Pieces | Numbered pieces let the receiver reorder and request only what's missing | Level 2 | Out of order means lost; resend everything after the first gap |

**Round content:**

| Round | Pak's header | Choices on screen | Correct |
| --- | --- | --- | --- |
| 1.1 | `DST 10.0.0.5 : 443` | Building 10.0.0.5 doors 22 · 443 · 5432; building 10.0.0.9 doors 22 · 443 · 5432; all listening; a "Bounce back" pad | 10.0.0.5 door 443 |
| 1.2 | `DST 10.0.0.9 : 5432` | Building 10.0.0.9 doors 22 (listening) · 443 (listening) · 5432 (dark, nobody listening); a "Bounce back" pad | Bounce back (connection refused) |
| 2.1 | `SIZE 10 KB` | Tunnel 20 ms · 1 KB/ms; Trunk 110 ms · 10 KB/ms | Tunnel (30 ms vs 111 ms) |
| 2.2 | `SIZE 1000 KB` | Same two paths | Trunk (210 ms vs 1020 ms) |
| 3.1 | `MSG "HELLO WORLD!" · 6 pieces` | Receiver holds 1, 2, 4, 6; numbered blocks 1–6 to select | Resend {3, 5} |
| 3.2 | `MSG "PING PONG OK" · 6 pieces` | Pieces arrive in order 4, 1, 6, 2, 5; receiver holds 1, 2, 4, 5, 6 | Resend {3} |

**Progression:** sequential on first playthrough; retry without penalty. Completion requires a correct submission in every round. Hints remain available. No points, lives, countdown, leaderboard or streak in v1.

**Session behavior:** progress is held for the current page session; reload starts again.

## Cases the implementation must satisfy

| Case | Input state | Player action | Expected result | Why / source |
| --- | --- | --- | --- | --- |
| Correct | Round 1.1, `DST 10.0.0.5 : 443` | Enter 10.0.0.5 door 443 | Delivered; round complete | Address + port select the program (IANA: 443 = HTTPS) |
| Plausible mistake | Round 1.1 | Enter 10.0.0.9 door 443 | "Right door, wrong building"; not complete; retry | Address picks the machine |
| Plausible mistake | Round 1.2, 5432 dark | Enter door 443 (lit) | "A packet can't switch doors. Nobody listens on 5432, so the server resets: connection refused." Not complete | RFC 9293 §3.5.2 |
| Correct | Round 1.2 | Choose Bounce back | Delivered as "connection refused" explained; complete | RFC 9293 §3.5.2 |
| Correct | Round 2.2, 1000 KB | Enter Trunk | 110 + 1000/10 = 210 ms vs 20 + 1000/1 = 1020 ms; complete | Transmission + propagation model |
| Boundary | Paths as 2.1, size 100 KB | Either path | Both 120 ms; authoring check flags a tie so this size is never shipped as a round | Avoids two valid answers |
| Plausible mistake | Round 3.1, holds 1, 2, 4, 6 | Resend 1–6 | "Delivered, but 4 of 6 pieces were already there — only 3 and 5 were missing." Not complete | RFC 2018 selective acknowledgment |
| Plausible mistake | Round 3.2, arrived 4, 1, 6, 2, 5 | Resend {3, 4, 5, 6} | "Pieces 4–6 arrived, just early. Numbers let the receiver reorder; only 3 is missing." Not complete | RFC 9293 §3.4 |
| Empty input | Level 3 | SEND with nothing selected | Guidance shown; no attempt counted | AC4 |
| Unsupported content | A round whose paths tie, whose correct door is missing, or whose missing set is empty | Open round | Visible content error; no grading or progress | Authoring error, not learner failure |

## Experience direction

The whole interface should look like the inside of a network, and every visual element should carry a real networking value rather than decoration.

- **World:** a dark network-operations backdrop with a faint grid and slow blinking status LEDs. Platforms are cable trays, server racks and patch panels; gaps are "dropped link" breaks in the cable.
- **Pak:** an original character, a small envelope-shaped packet with a visible header strip on its top edge. The header strip *is* the HUD; Pak carries its own data.
- **Header bar (always visible):** a strip across the top styled like a packet capture row in a monospace font, showing the fields this level uses: `SRC 192.168.1.20 → DST 10.0.0.5 : 443`, `SIZE 10 KB`, or `SEQ 1–6 · MISSING ?`.
- **Network map (level select and progress):** a small topology diagram, `Laptop ─ Router ─ ISP ─ Server`, where each level is one link. Delivered levels light the link green with a moving signal pulse; the current level blinks amber.
- **Network log (feedback):** a terminal-style panel at the bottom that prints every result as a log line (`✔ delivered 10.0.0.5:443 → https`, `✖ RST from 10.0.0.9:5432 — connection refused`). It scrolls, stays readable and is the live region for screen readers.
- **Level 1 doors:** drawn as labelled server ports with a status LED: green and "LISTENING" when a program is there, dark and "CLOSED" when not. Each building shows its IP address on a rack label.
- **Level 2 paths:** the Tunnel is a thin copper cable with one lane; the Trunk is a wide fibre bundle with ten lanes. Each entrance shows `travel ms · KB/ms`. **Memorable moment:** after any choice, a ghost replay races Pak through both paths side by side with live millisecond counters, so the player sees the narrow pipe win for small packets and lose for big ones.
- **Level 3 receiver board:** a row of six numbered slots on the server, filled as pieces land and reordering themselves into number order; empty slots pulse. The selectable resend blocks match the slots.
- **Colour language:** green = delivered/listening, amber = waiting/selected, red = dropped/refused, cyan = Pak and signal. Colour never carries meaning alone: every state also has an icon and text label.
- **Feedback voice:** patient and specific, like a friendly senior engineer reading the log with you. Name what the player did, what happened, and the one rule that explains it.
- **Layout:** header bar on top, game view in the middle, network log below; network map on the briefing and summary screens. No values hidden behind hover.

## Non-goals

No user accounts, multiplayer, backend, live infrastructure access, runtime AI, leaderboard or level editor. No simulation of TCP handshakes, routing, DNS, firewalls, congestion or real timing. Platforming stays simple: no enemies, power-ups or scoring. No characters, art, sound or level layouts from existing games; all visuals are original and drawn in the browser. Visual polish must serve the networking values on screen.

## Real-world echo: the November 2026 outages

After each level, the level-complete screen shows a **"From the news"** card connecting the level's idea to an outage in the week this game was built. Each card states what was reported (quoted or closely paraphrased, with the date and source links), then one sentence on how this level's idea relates. Every card says: *"As reported by Nov 17, 2026. Investigations may change these details. The game is a simplified model, not a reconstruction of the incident."* No logos or branding.

| After | Event | Reported | Connection to the level |
| --- | --- | --- | --- |
| Level 1 | FAA nationwide ground stop, Nov 13, 2026 | Transportation Secretary Duffy said a newly installed router at a remote FAA facility sent "more than 1,000 connection attempts every four to five seconds" into the FAA network; thousands of flights were disrupted; officials saw no evidence of a cyberattack; the cause (human error, installation or equipment) was still under investigation | Each connection attempt is a packet knocking on an address and port, like the doors in this level. A flood of knocks keeps the doors busy for the traffic that matters |
| Level 2 | Same event | The work under way was routine maintenance moving telecommunication lines from old copper wire to fibre | Fibre is this level's wide trunk. Upgrades add bandwidth, but this level shows bandwidth isn't the only thing that sets speed, and the outage shows changes carry their own risk |
| Level 3 | Chase online and branch transaction slowdown, Nov 16, 2026 | Chase said it had "a temporary issue related to a software bug in an on-premise hardware system" that "is not cyber-related"; other banks may have seen slowness only when they were a party to a transaction with Chase; by about 6:30 p.m. ET transactions were posting normally | Like your message, a transaction is only finished when the other side confirms it. When one side can't confirm, the other side waits, which is how one bank's problem showed up as slowness elsewhere |

## Clarified decisions (resolved 2026-11-17)

- **Level 2 formula:** the briefing shows the formula with a worked example using different numbers; the log repeats the arithmetic after every choice.
- **Resend everything (round 3.1):** incorrect. The skill is identifying exactly the missing set; the feedback says the message would arrive but four pieces were wasted.
- **Platforming length:** about one and a half screens of running per round, with two small gaps, then the decision zone.
- **Console mode:** a visible "Console mode (C)" button in the play toolbar, and the first briefing mentions it.
- **Bounce back pad:** present in both Level 1 rounds, so choosing it when someone is listening is a gradable mistake.

## Release evidence

All required acceptance criteria must have a recorded result. All six rounds and their explanations must be checked against the references. A teammate must complete the core flow using only the keyboard, once with platforming and once in Console mode. The README must describe implemented behavior, exact run/test commands and any remaining limits.
