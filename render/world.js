// Pure layout: turns a round into ground, gaps and choice zones.
// Every zone that submits carries the exact answer object the evaluator understands,
// so the platformer and Console mode share one set of choices.
import { splitMessage } from '../engine/rules.js';

export const VIEW_W = 960;
export const VIEW_H = 400;
export const GROUND_Y = 340;
const DECISION_X = 900;

function runway(width) {
  return {
    ground: [{ x: 0, w: 380 }, { x: 460, w: 240 }, { x: 780, w: width - 780 }],
    gaps: [{ x: 380, w: 80 }, { x: 700, w: 80 }],
    platforms: [{ x: 210, y: 268, w: 110 }, { x: 520, y: 252, w: 120 }],
  };
}

function doorWorld(round) {
  const zones = [];
  const buildings = round.buildings.map((b, i) => {
    const bx = DECISION_X + 40 + i * 390;
    b.doors.forEach((d, j) => zones.push({
      id: `door-${b.ip}-${d.port}`, kind: 'door', x: bx + 25 + j * 105, w: 74, h: 100,
      label: String(d.port), sub: d.service, listening: d.listening, ip: b.ip,
      answer: { kind: 'door', ip: b.ip, port: d.port },
      text: `Door ${d.port} (${d.service}) on ${b.ip}, ${d.listening ? 'LISTENING' : 'CLOSED'}`,
    }));
    return { ip: b.ip, x: bx, w: 340 };
  });
  const bounceX = DECISION_X + 40 + round.buildings.length * 390 + 10;
  zones.push({ id: 'bounce', kind: 'bounce', x: bounceX, w: 120, h: 18, label: '↩ BOUNCE BACK', sub: 'connection refused',
    answer: { kind: 'bounce' }, text: 'Bounce back pad: report "connection refused" (nobody listening)' });
  return { width: bounceX + 260, buildings, zones };
}

function pathWorld(round) {
  const [a, b] = round.paths;
  const narrow = a.bandwidthKBperMs <= b.bandwidthKBperMs ? a : b;
  const zones = round.paths.map((p) => {
    const isNarrow = p === narrow;
    return {
      id: `path-${p.id}`, kind: 'path', medium: p.medium, x: isNarrow ? DECISION_X + 130 : DECISION_X + 420,
      w: isNarrow ? 90 : 170, h: isNarrow ? 52 : 150, label: p.name.toUpperCase(),
      sub: `travel ${p.travelMs} ms · ${p.bandwidthKBperMs} KB/ms`, lanes: isNarrow ? 1 : 10,
      answer: { kind: 'path', pathId: p.id },
      text: `${p.name}: travel ${p.travelMs} ms, bandwidth ${p.bandwidthKBperMs} KB per ms`,
    };
  });
  return { width: DECISION_X + 800, buildings: [], zones };
}

function piecesWorld(round) {
  const chunks = splitMessage(round.header.message, round.pieceCount);
  const held = new Set(round.arrived);
  const zones = chunks.map((chunk, i) => ({
    id: `piece-${i + 1}`, kind: 'piece', num: i + 1, x: DECISION_X + 40 + i * 92, w: 62, h: 76,
    label: `#${i + 1}`, sub: held.has(i + 1) ? 'ON BOARD' : 'MISSING', held: held.has(i + 1), chunk,
    text: `Piece ${i + 1}, ${held.has(i + 1) ? 'already on the receiver board' : 'not on the receiver board'}`,
  }));
  const sendX = DECISION_X + 40 + round.pieceCount * 92 + 50;
  zones.push({ id: 'send', kind: 'send', x: sendX, w: 64, h: 130, label: 'SEND ▶', sub: 'resend selected', text: 'SEND flag: resend the selected pieces' });
  return { width: sendX + 260, buildings: [], zones };
}

const builders = { door: doorWorld, path: pathWorld, pieces: piecesWorld };

export function buildWorld(round) {
  const specific = builders[round.mechanic](round);
  return {
    ...runway(specific.width),
    width: specific.width,
    groundY: GROUND_Y,
    spawn: { x: 60 },
    decisionX: DECISION_X - 60,
    buildings: specific.buildings,
    zones: specific.zones,
  };
}
