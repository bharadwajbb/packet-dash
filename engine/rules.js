// Pure domain evaluation for Packet Dash. No DOM, timers, randomness or state.
// evaluate(round, answer) → { status, expected, reasonCode, evidence }

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export const isIPv4 = (s) => typeof s === 'string' && IPV4.test(s);
export const isPort = (n) => Number.isInteger(n) && n >= 1 && n <= 65535;
const isPositive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

const result = (status, reasonCode, expected = null, evidence = {}) => ({ status, reasonCode, expected, evidence });
const contentError = (message) => result('content-error', 'content-error', null, { message });
const invalid = (message) => result('invalid-input', 'invalid-input', null, { message });

// ---------- Level 1: address + port ----------

export function checkDoorRound(round) {
  const h = round.header ?? {};
  if (!isIPv4(h.dst) || !isPort(h.port)) return 'header needs a dotted IPv4 dst and a port 1–65535';
  if (!Array.isArray(round.buildings) || round.buildings.length === 0) return 'round needs buildings';
  const ips = new Set();
  for (const b of round.buildings) {
    if (!isIPv4(b.ip)) return `building ip "${b.ip}" is not IPv4`;
    if (ips.has(b.ip)) return `duplicate building ${b.ip}`;
    ips.add(b.ip);
    if (!Array.isArray(b.doors) || b.doors.length === 0) return `building ${b.ip} has no doors`;
    const ports = new Set();
    for (const d of b.doors) {
      if (!isPort(d.port)) return `building ${b.ip} has an invalid port`;
      if (ports.has(d.port)) return `building ${b.ip} has duplicate door ${d.port}`;
      if (typeof d.listening !== 'boolean' || !d.service) return `door ${b.ip}:${d.port} needs service and listening`;
      ports.add(d.port);
    }
  }
  if (!ips.has(h.dst)) return `destination building ${h.dst} is not in the round`;
  return null;
}

function evaluateDoor(round, answer) {
  const problem = checkDoorRound(round);
  if (problem) return contentError(problem);
  const { dst, port } = round.header;
  const target = round.buildings.find((b) => b.ip === dst);
  const targetDoor = target.doors.find((d) => d.port === port);
  const refused = !targetDoor || !targetDoor.listening;
  const expected = refused ? { kind: 'bounce' } : { kind: 'door', ip: dst, port };
  const base = { ip: dst, port, service: targetDoor?.service ?? 'nothing', refused };

  if (answer?.kind === 'bounce') {
    return refused
      ? result('correct', 'correct-refused', expected, base)
      : result('incorrect', 'unneeded-bounce', expected, base);
  }
  if (answer?.kind !== 'door') return invalid('no door chosen');
  const building = round.buildings.find((b) => b.ip === answer.ip);
  const door = building?.doors.find((d) => d.port === answer.port);
  if (!door) return invalid('that door is not in this round');

  const evidence = { ...base, chosenIp: answer.ip, chosenPort: answer.port, chosenService: door.service, chosenListening: door.listening };
  if (answer.ip !== dst) return result('incorrect', 'wrong-building', expected, evidence);
  if (answer.port !== port) return result('incorrect', 'wrong-door', expected, evidence);
  if (refused) return result('incorrect', 'closed-door', expected, evidence);
  return result('correct', 'correct-deliver', expected, evidence);
}

// ---------- Level 2: latency vs bandwidth ----------

export const deliveryMs = (path, sizeKB) => path.travelMs + sizeKB / path.bandwidthKBperMs;
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
export const calcText = (path, sizeKB) =>
  `${fmt(path.travelMs)} ms + ${fmt(sizeKB)} KB ÷ ${fmt(path.bandwidthKBperMs)} KB/ms = ${fmt(deliveryMs(path, sizeKB))} ms`;

export function checkPathRound(round) {
  const size = round.header?.sizeKB;
  if (!isPositive(size)) return 'header.sizeKB must be a positive number';
  if (!Array.isArray(round.paths) || round.paths.length !== 2) return 'path rounds need exactly two paths';
  const [a, b] = round.paths;
  for (const p of round.paths) {
    if (!p.id || !p.name) return 'each path needs id and name';
    if (!isPositive(p.travelMs) || !isPositive(p.bandwidthKBperMs)) return `path ${p.id} needs positive travelMs and bandwidthKBperMs`;
  }
  if (a.id === b.id) return 'path ids must differ';
  if (Math.abs(deliveryMs(a, size) - deliveryMs(b, size)) < 1e-9) return `paths tie at ${fmt(deliveryMs(a, size))} ms; two answers would be valid`;
  return null;
}

function evaluatePath(round, answer) {
  const problem = checkPathRound(round);
  if (problem) return contentError(problem);
  const size = round.header.sizeKB;
  const times = round.paths.map((p) => ({
    id: p.id, name: p.name, medium: p.medium, travelMs: p.travelMs, bandwidthKBperMs: p.bandwidthKBperMs,
    squeezeMs: size / p.bandwidthKBperMs, totalMs: deliveryMs(p, size), calc: calcText(p, size),
  }));
  const fastest = times[0].totalMs < times[1].totalMs ? times[0] : times[1];
  const expected = { kind: 'path', pathId: fastest.id };
  if (answer?.kind !== 'path') return invalid('no path chosen');
  const chosen = times.find((t) => t.id === answer.pathId);
  if (!chosen) return invalid('that path is not in this round');
  const other = times.find((t) => t !== chosen);
  const evidence = {
    size: fmt(size), times,
    chosenName: chosen.name, chosenMs: fmt(chosen.totalMs), chosenCalc: chosen.calc,
    otherName: other.name, otherMs: fmt(other.totalMs), otherCalc: other.calc,
  };
  if (chosen === fastest) return result('correct', 'correct-fastest', expected, evidence);
  const reason = chosen.bandwidthKBperMs > other.bandwidthKBperMs ? 'wrong-wider' : 'wrong-shorter';
  return result('incorrect', reason, expected, evidence);
}

// ---------- Level 3: numbered pieces ----------

export const listText = (nums) => (nums.length === 0 ? 'none' : nums.join(', '));
export function splitMessage(message, n) {
  const size = message.length / n;
  return Array.from({ length: n }, (_, i) => message.slice(i * size, (i + 1) * size));
}

export function checkPiecesRound(round) {
  const n = round.pieceCount;
  const msg = round.header?.message;
  if (!Number.isInteger(n) || n < 2 || n > 8) return 'pieceCount must be an integer 2–8';
  if (typeof msg !== 'string' || msg.length === 0 || msg.length % n !== 0) return `message length must divide evenly into ${n} pieces`;
  if (!Array.isArray(round.arrived)) return 'arrived must be a list of sequence numbers';
  if (round.arrived.some((x) => !Number.isInteger(x) || x < 1 || x > n)) return `arrived numbers must be 1–${n}`;
  if (new Set(round.arrived).size === n) return 'nothing is missing; the round has no gap to fill';
  return null;
}

export function missingPieces(round) {
  const held = new Set(round.arrived);
  return Array.from({ length: round.pieceCount }, (_, i) => i + 1).filter((x) => !held.has(x));
}

function evaluatePieces(round, answer) {
  const problem = checkPiecesRound(round);
  if (problem) return contentError(problem);
  const n = round.pieceCount;
  const missing = missingPieces(round);
  const held = [...new Set(round.arrived)].sort((a, b) => a - b);
  const expected = { kind: 'pieces', resend: missing };
  if (answer?.kind !== 'pieces' || !Array.isArray(answer.resend)) return invalid('no pieces chosen');
  if (answer.resend.length === 0) return invalid('nothing selected');
  if (answer.resend.some((x) => !Number.isInteger(x) || x < 1 || x > n)) return invalid('piece number out of range');

  const resend = [...new Set(answer.resend)].sort((a, b) => a - b);
  const stillMissing = missing.filter((x) => !resend.includes(x));
  const extras = resend.filter((x) => !missing.includes(x));
  const evidence = {
    n, message: round.header.message,
    held: listText(held), missing: listText(missing), arrival: listText(round.arrived),
    resend: listText(resend), stillMissing: listText(stillMissing), extras: listText(extras),
    heldList: held, missingList: missing,
  };
  if (stillMissing.length > 0) return result('incorrect', 'still-missing', expected, evidence);
  if (extras.length === 0) return result('correct', 'correct-resend', expected, evidence);
  const firstGap = missing[0];
  const reason = extras.every((x) => x > firstGap) ? 'out-of-order-not-lost' : 'resent-received';
  return result('incorrect', reason, expected, evidence);
}

// ---------- entry points ----------

const evaluators = { door: evaluateDoor, path: evaluatePath, pieces: evaluatePieces };
const checkers = { door: checkDoorRound, path: checkPathRound, pieces: checkPiecesRound };

export const REASON_CODES = {
  door: ['correct-deliver', 'correct-refused', 'wrong-building', 'wrong-door', 'closed-door', 'unneeded-bounce', 'invalid-input'],
  path: ['correct-fastest', 'wrong-wider', 'wrong-shorter', 'invalid-input'],
  pieces: ['correct-resend', 'still-missing', 'out-of-order-not-lost', 'resent-received', 'invalid-input'],
};

export function checkRound(round) {
  const check = checkers[round?.mechanic];
  return check ? check(round) : `unknown mechanic "${round?.mechanic}"`;
}

export function evaluate(round, answer) {
  const fn = evaluators[round?.mechanic];
  if (!fn) return contentError(`unknown mechanic "${round?.mechanic}"`);
  return fn(round, answer);
}
