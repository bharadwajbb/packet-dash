// Full-screen views: network map, briefing, level done (with news card), summary, error.
import { h, s } from './dom.js';
import { isLevelComplete, totals } from '../engine/state.js';

const sourceLinks = (content, ids) => h('ul', { class: 'sources' },
  ids.map((id) => content.sources.find((x) => x.id === id)).filter(Boolean).map((src) =>
    h('li', {}, h('a', { href: src.url, target: '_blank', rel: 'noopener' }, src.title), ` · ${src.section}`)));

// ---------- topology map ----------
export function networkMap(state, { compact = false } = {}) {
  const levels = state.content.levels;
  const nodes = [levels[0].link.from, ...levels.map((l) => l.link.to)];
  const addr = { Laptop: '192.168.1.20', Router: '192.168.1.1', ISP: 'AS 64500', Server: '10.0.0.5' };
  const gap = 240, x0 = 70;
  const status = (i) => {
    if (isLevelComplete(state, levels[i])) return 'up';
    if (i === state.levelIndex && state.view !== 'summary') return 'current';
    return 'down';
  };
  const label = { up: 'link up', current: 'in progress', down: 'not connected' };
  const svg = s('svg', { viewBox: `0 0 ${x0 * 2 + gap * (nodes.length - 1)} 150`, class: 'map-svg', role: 'img',
    'aria-label': `Network map: ${levels.map((l, i) => `${l.link.from} to ${l.link.to}, ${label[status(i)]}`).join('; ')}` },
    levels.map((l, i) => {
      const st = status(i);
      const xa = x0 + i * gap + 34, xb = x0 + (i + 1) * gap - 34;
      return s('g', { class: `link link-${st}` },
        s('line', { x1: xa, y1: 60, x2: xb, y2: 60 }),
        st === 'up' ? s('circle', { class: 'pulse', r: 5, cx: xa, cy: 60 }) : null,
        s('text', { x: (xa + xb) / 2, y: 44, 'text-anchor': 'middle', class: 'link-title' }, `L${i + 1} · ${l.title}`),
        s('text', { x: (xa + xb) / 2, y: 84, 'text-anchor': 'middle', class: 'link-state' },
          st === 'up' ? '✔ link up' : st === 'current' ? '● in progress' : '✕ not connected'));
    }),
    nodes.map((n, i) => s('g', { class: 'node', transform: `translate(${x0 + i * gap}, 60)` },
      s('rect', { x: -32, y: -24, width: 64, height: 48, rx: 8 }),
      s('text', { y: 4, 'text-anchor': 'middle', class: 'node-name' }, n),
      s('text', { y: 44, 'text-anchor': 'middle', class: 'node-addr' }, addr[n] ?? ''))));
  return h('figure', { class: `map ${compact ? 'map-compact' : ''}` }, svg);
}

// ---------- map view ----------
export function mapScreen(state, actions) {
  const level = state.content.levels[state.levelIndex];
  const first = state.levelIndex === 0;
  return h('section', { class: 'screen screen-map' },
    h('h1', { tabindex: -1 }, first ? 'Packet Dash' : `Next hop: ${level.link.from} → ${level.link.to}`),
    first ? h('p', { class: 'lede' }, 'You are ', h('strong', {}, 'Pak'), ', a packet carrying a message from a laptop to a server. Run and jump across the network, and at the end of each stretch make one delivery decision. Every link you deliver lights up on the map.') : null,
    networkMap(state),
    first ? h('ul', { class: 'pitch' },
      h('li', {}, h('strong', {}, 'Level 1 · Find the Door:'), ' addresses pick the machine, ports pick the program.'),
      h('li', {}, h('strong', {}, 'Level 2 · Fast or Wide?'), ' latency vs bandwidth.'),
      h('li', {}, h('strong', {}, 'Level 3 · Lost Pieces:'), ' numbered pieces and resends.'),
      h('li', {}, 'After each level: a "From the news" card linking the idea to the FAA ground stop and Chase outage of November 2026.')) : null,
    h('div', { class: 'actions' },
      h('button', { class: 'primary', onclick: actions.openBriefing }, `Open briefing · Level ${state.levelIndex + 1}`)));
}

// ---------- briefing ----------
export function briefingScreen(state, actions) {
  const level = state.content.levels[state.levelIndex];
  const b = level.briefing;
  return h('section', { class: 'screen screen-briefing' },
    h('p', { class: 'eyebrow' }, `Level ${state.levelIndex + 1} of ${state.content.levels.length} · ${level.link.from} → ${level.link.to}`),
    h('h1', { tabindex: -1 }, level.title),
    h('p', { class: 'lede' }, h('strong', {}, 'You will learn to: '), level.outcome),
    h('div', { class: 'card' }, h('h2', {}, 'The idea'), h('p', {}, b.analogy)),
    h('div', { class: 'card card-term' }, h('h2', {}, 'Worked example'), h('p', { class: 'mono' }, b.example)),
    h('p', { class: 'boundary' }, h('strong', {}, 'Keeping it simple: '), b.boundary),
    b.controls ? h('p', { class: 'controls-tip' }, b.controls) : null,
    h('details', {}, h('summary', {}, 'Sources'), sourceLinks(state.content, level.sourceIds)),
    h('div', { class: 'actions' }, h('button', { class: 'primary', onclick: actions.beginPlay }, 'Start level ▶')));
}

// ---------- level done + news ----------
function roundTable(state, rounds) {
  return h('table', { class: 'stats' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Round'), h('th', { scope: 'col' }, 'Delivered'), h('th', { scope: 'col' }, 'Attempts'), h('th', { scope: 'col' }, 'Hints used'))),
    h('tbody', {}, rounds.map((r) => {
      const p = state.progress[r.id];
      return h('tr', {}, h('th', { scope: 'row' }, r.id), h('td', {}, p.solved ? '✔ yes' : '✕ no'), h('td', {}, p.attempts), h('td', {}, p.hints));
    })));
}

export function newsCard(state, level) {
  const n = level.news;
  return h('aside', { class: 'news', 'aria-labelledby': `news-${level.id}` },
    h('p', { class: 'news-tag' }, '📡 From the news'),
    h('h2', { id: `news-${level.id}` }, n.headline),
    h('h3', {}, 'What was reported'),
    h('ul', {}, n.reported.map((r) => h('li', {}, r))),
    h('h3', {}, 'How it connects to this level'),
    h('p', {}, n.connection),
    sourceLinks(state.content, n.sourceIds),
    h('p', { class: 'disclaimer' }, 'As reported by Nov 17, 2026. Investigations may change these details. The game is a simplified model, not a reconstruction of the incident.'));
}

export function levelDoneScreen(state, actions) {
  const level = state.content.levels[state.levelIndex];
  const last = state.levelIndex === state.content.levels.length - 1;
  return h('section', { class: 'screen screen-done' },
    h('p', { class: 'eyebrow' }, `Level ${state.levelIndex + 1} complete`),
    h('h1', { tabindex: -1 }, `✔ Link up: ${level.link.from} → ${level.link.to}`),
    networkMap(state, { compact: true }),
    roundTable(state, level.rounds),
    newsCard(state, level),
    h('div', { class: 'actions' }, h('button', { class: 'primary', onclick: actions.next }, last ? 'See your delivery report ▶' : 'Continue to the next hop ▶')));
}

// ---------- summary ----------
export function summaryScreen(state, actions) {
  const t = totals(state);
  return h('section', { class: 'screen screen-summary' },
    h('p', { class: 'eyebrow' }, 'Delivery report'),
    h('h1', { tabindex: -1 }, `✔ Message delivered: Laptop → Server`),
    networkMap(state, { compact: true }),
    h('p', { class: 'lede' }, `${t.solved} of ${t.rounds} rounds delivered · ${t.attempts} attempts · ${t.hints} hints used. Hints and retries are part of learning; they don't cost anything.`),
    roundTable(state, state.content.levels.flatMap((l) => l.rounds)),
    h('h2', {}, 'What you practiced'),
    h('ul', {}, state.content.levels.map((l) => h('li', {}, h('strong', {}, `${l.title}: `), l.outcome))),
    h('h2', {}, 'The week in outages'),
    h('ul', {}, state.content.levels.map((l) => h('li', {}, h('strong', {}, l.news.headline), ` — ${l.news.connection}`))),
    h('details', {}, h('summary', {}, 'All sources'), sourceLinks(state.content, state.content.sources.map((x) => x.id))),
    h('div', { class: 'actions' }, h('button', { class: 'primary', onclick: actions.restart }, 'Play again')));
}

export function errorScreen(errors) {
  return h('section', { class: 'screen screen-error', role: 'alert' },
    h('h1', { tabindex: -1 }, '⚠ Content error'),
    h('p', {}, 'The level data failed validation, so nothing can be graded. This is an authoring problem, not something you did.'),
    h('ul', { class: 'mono' }, errors.map((e) => h('li', {}, `${e.where}: ${e.message}`))));
}
