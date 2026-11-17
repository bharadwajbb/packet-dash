# Packet Dash · Project constitution

**Purpose:** help software engineers with no networking background practice three everyday networking ideas (addresses and ports, latency vs bandwidth, numbered pieces and resends) through delivery decisions made as a packet in a side-scrolling platformer.

**First release:** one core mechanic (run, jump, enter a choice), three short levels of two rounds each, a browser, and a 60-minute workshop build. Change this budget only by updating the agreed scope.

## C1 · Technical truth is a release requirement

The game must never reward a technically incorrect answer. Grading is reproducible from a documented rule and the round's data. Unsupported or ambiguous content (a tie between paths, a missing destination building, nothing missing to resend) is an authoring error: the round shows a content error and cannot be graded.

The model taught is a simplified teaching model of one IPv4 packet and one TCP-style connection on one one-way trip. It excludes handshakes, routing, DNS, firewalls, NAT, congestion, queueing, TCP windows and real timing. Level 2 counts only travel time plus size ÷ bandwidth. Each level's briefing states its boundary in one sentence; the README repeats them. Platforming, art and animation illustrate a rule and never change it.

Real-world outage cards quote or closely paraphrase published reporting, carry the reporting date and source links, say that investigations may change details, and never claim the game reconstructs the incident.

**Evidence:** hand-checked correct, incorrect and boundary cases in `tests/`; a source record with URL and section for every rule (IANA port registry; RFC 9293 §3.4 and §3.5.2; RFC 2018 §3 and §5; Kurose & Ross §1.4); review of all briefings, feedback and news cards.

## C2 · Every round teaches through a decision

The decision is the point; the platforming is the journey to it. Each level introduces its idea with an analogy and a worked example using different numbers before the first round, and every decision-relevant value is on screen.

Learning sequence: **address and port (foundation) → latency vs bandwidth (application) → missing pieces out of order (transfer and edge case)**. A wrong choice names the specific mistake with the values involved. A correct choice explains why. Hints give the method first, then a worked solution; both are recorded as assistance.

**Evidence:** a teammate can say which learning outcome each round exercises and what a deliberately wrong choice taught them.

## C3 · Progress is honest and retry is safe

A round completes only on a valid, correct submission. Entering a door, path or SEND is the submission; walking past does not count. Wrong answers return Pak to the decision point. Empty submissions give guidance without counting. Re-entering after success has no effect.

Platforming is never graded: falling respawns Pak with no penalty. No lives, score, countdown or speed bonus. Attempts, hints and completion are shown separately.

**Evidence:** automated checks for wrong answer, empty input, repeated submit, hints, level completion, final summary and restart/cancel.

## C4 · Access is part of the core game

Every decision can be made with the keyboard alone. Console mode (C) replaces platforming with a list of the same choices as buttons, so no jumping or timing is ever required. Results are text in the network log and announced through a live region. Colour never carries meaning alone. Reduced motion replaces animations with static tables without losing values. The layout works in a narrow window.

**Evidence:** keyboard-only playthrough in both modes, a narrow-window check and a reduced-motion check, recorded as actually performed.

## C5 · The first version is deterministic and self-contained

Static files only: no account, backend, live network access, model or API key, and no runtime dependency. Content is authored; the evaluator is deterministic. AI helped write this project and its output is reviewed like any other contribution.

**Evidence:** a clean browser session plays from the project's static files served locally.

## C6 · Content and logic can be reviewed separately

Rounds, briefings, hints, feedback wording, sources and news cards live in `data/levels.json`. Domain rules live in `engine/rules.js`, separate from rendering and session state. The content is validated before play. The evaluator computes the correct answer from the rule; there is no stored answer key.

**Evidence:** adding a round with an existing mechanic needs only a data change and its test.

## C7 · Done is demonstrated

Ship the agreed scope. Spec, plan, tasks and README describe the same game. A feature is done when its acceptance criteria pass and the result is recorded; checks not run are listed as not run.

**Evidence:** `node --test tests/`, the browser test page, a recorded playthrough checklist, and a README another attendee can follow.

## How we change these rules

Record the reason for any material change, update the spec and plan, and re-run analysis. A conflict is resolved openly; the build must not weaken a principle to make an implementation pass.
