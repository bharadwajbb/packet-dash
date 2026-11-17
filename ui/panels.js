// Panels around the game view: packet header bar, receiver board, race replay, Console mode choices.
import { h } from './dom.js';
import { splitMessage, missingPieces } from '../engine/rules.js';

// ---------- packet header bar ----------
const field = (k, v, cls = '') => h('span', { class: `pf ${cls}` }, h('span', { class: 'pk' }, k), h('span', { class: 'pv' }, v));

export function headerBar(state) {
  const parts = [];
  if (state.view === 'play' || state.view === 'briefing') {
    const level = state.content.levels[state.levelIndex];
    const round = level.rounds[state.roundIndex];
    const hd = round.header;
    if (state.view === 'play') {
      parts.push(field('SRC', hd.src), h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'));
      if (round.mechanic === 'door') parts.push(field('DST', `${hd.dst} : ${hd.port}`, 'hot'), field('PROTO', 'TCP'));
      else parts.push(field('DST', hd.dst));
      if (round.mechanic === 'path') parts.push(field('SIZE', `${hd.sizeKB} KB`, 'hot'));
      if (round.mechanic === 'pieces') {
        parts.push(field('MSG', `"${hd.message}"`), field('SEQ', `1–${round.pieceCount}`),
          field('ON BOARD', [...new Set(round.arrived)].sort((a, b) => a - b).join(',')), field('MISSING', '?', 'hot'));
      }
      if (hd.note) parts.push(field('INFO', hd.note));
      const p = state.progress[round.id];
      parts.push(h('span', { class: 'pf-right' },
        field('LVL', `${state.levelIndex + 1}/${state.content.levels.length}`),
        field('RND', `${state.roundIndex + 1}/${level.rounds.length}`),
        field('TRIES', p.attempts), field('HINTS', p.hints),
        field('STATE', p.solved ? 'DELIVERED' : 'IN FLIGHT', p.solved ? 'ok' : '')));
    } else {
      parts.push(field('STATE', 'BRIEFING'), field('LVL', `${state.levelIndex + 1}/${state.content.levels.length}`), field('HOP', `${level.link.from} → ${level.link.to}`));
    }
  } else {
    parts.push(field('SRC', '192.168.1.20'), h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'), field('DST', '10.0.0.5'),
      field('STATE', state.view === 'summary' ? 'DELIVERED' : state.view === 'level-done' ? 'LINK UP' : 'READY', state.view === 'map' ? '' : 'ok'));
  }
  return parts;
}

// ---------- receiver board (Level 3) ----------
export function receiverBoard(round, selection, solved) {
  const chunks = splitMessage(round.header.message, round.pieceCount);
  const held = new Set(round.arrived);
  return h('section', { class: 'panel board', 'aria-labelledby': 'board-title' },
    h('h2', { id: 'board-title' }, 'Receiver board · 10.0.0.5'),
    h('p', { class: 'mono small' }, `arrived in order: ${round.arrived.join(', ')}`),
    h('ol', { class: 'slots' }, chunks.map((c, i) => {
      const n = i + 1;
      const have = held.has(n) || solved;
      const sel = selection.has(n);
      return h('li', { class: `slot ${have ? 'have' : 'gap'} ${sel ? 'sel' : ''}` },
        h('span', { class: 'slot-n' }, `#${n}`),
        h('span', { class: 'slot-c' }, have ? `"${c}"` : '?'),
        h('span', { class: 'slot-s' }, have ? (held.has(n) ? '✔ on board' : '✔ resent') : '✕ missing'),
        sel ? h('span', { class: 'slot-r' }, '↻ resend') : null);
    })),
    solved ? h('p', { class: 'mono ok' }, `✔ reassembled: "${round.header.message}"`) :
      h('p', { class: 'small' }, `Marked for resend: ${selection.size ? [...selection].sort((a, b) => a - b).join(', ') : 'none'}`));
}
export { missingPieces };

// ---------- path info + race replay (Level 2) ----------
export function pathPanel(round, evidence, reducedMotion) {
  const size = round.header.sizeKB;
  const rows = round.paths.map((p) => {
    const t = evidence?.times.find((x) => x.id === p.id);
    return h('tr', {}, h('th', { scope: 'row' }, `${p.medium === 'fibre' ? '🟦' : '🟧'} ${p.name}`), h('td', {}, `${p.travelMs} ms`), h('td', {}, `${p.bandwidthKBperMs} KB/ms`),
      h('td', {}, t ? `${Math.round(t.squeezeMs * 100) / 100} ms` : '?'), h('td', {}, t ? h('strong', {}, `${Math.round(t.totalMs * 100) / 100} ms`) : '?'));
  });
  const table = h('table', { class: 'stats' },
    h('caption', {}, `Packet ${size} KB · squeeze = size ÷ width · total = travel + squeeze`),
    h('thead', {}, h('tr', {}, ['Path', 'Travel', 'Width', 'Squeeze', 'Total'].map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, rows));
  const panel = h('section', { class: 'panel race', 'aria-labelledby': 'race-title' },
    h('h2', { id: 'race-title' }, evidence ? 'Race replay' : 'The fork ahead'), table);
  if (evidence) {
    const max = Math.max(...evidence.times.map((t) => t.totalMs));
    const lanes = evidence.times.map((t) => {
      const fill = h('span', { class: `race-fill ${t.medium}` });
      const counter = h('span', { class: 'race-ms mono' }, reducedMotion ? `${Math.round(t.totalMs)} ms` : '0 ms');
      const lane = h('div', { class: 'race-lane', 'aria-hidden': 'true' }, h('span', { class: 'race-name' }, t.name), h('span', { class: 'race-track' }, fill), counter);
      const target = (t.totalMs / max) * 100;
      if (reducedMotion) fill.style.width = `${target}%`;
      else {
        const duration = 2200 * (t.totalMs / max);
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / duration);
          fill.style.width = `${target * k}%`;
          counter.textContent = `${Math.round(t.totalMs * k)} ms`;
          if (k < 1 && fill.isConnected) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      return lane;
    });
    panel.insertBefore(h('div', { class: 'race-lanes' }, lanes), table);
  }
  return panel;
}

// ---------- Console mode: the same choices as buttons ----------
export function consolePanel(world, round, selection, solved, actions) {
  const items = [];
  if (round.mechanic === 'pieces') {
    for (const z of world.zones.filter((z) => z.kind === 'piece')) {
      const id = `cb-${z.num}`;
      items.push(h('li', {}, h('input', { type: 'checkbox', id, checked: selection.has(z.num), disabled: solved, onchange: () => actions.togglePiece(z.num) }),
        h('label', { for: id }, `Resend piece #${z.num} — ${z.held ? 'on the board' : 'not on the board'}`)));
    }
    const send = world.zones.find((z) => z.kind === 'send');
    items.push(h('li', {}, h('button', { class: 'primary', disabled: solved, onclick: () => actions.enter(send) }, 'SEND selected pieces ▶')));
  } else {
    for (const z of world.zones) {
      items.push(h('li', {}, h('button', { class: `choice ${z.listening === false ? 'closed' : ''}`, disabled: solved, onclick: () => actions.enter(z) }, z.text)));
    }
  }
  return h('section', { class: 'panel console', 'aria-labelledby': 'console-title' },
    h('h2', { id: 'console-title' }, '> console mode'),
    h('p', { class: 'small' }, 'Same choices as the platform level, no jumping needed. Press C to switch back.'),
    h('ul', { class: 'choices' }, items));
}
