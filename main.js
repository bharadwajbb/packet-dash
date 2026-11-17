// Load → validate → run. Wires session state, screens, panels and the canvas game.
import { validateContent } from './engine/content.js';
import { explain } from './engine/feedback.js';
import * as S from './engine/state.js';
import { buildWorld } from './render/world.js';
import { Game } from './render/game.js';
import { tutorialWorld, TUTORIAL_STEPS, advanceTutorial, tutorialFinished } from './render/tutorial.js';
import { h } from './ui/dom.js';
import { mapScreen, briefingScreen, levelDoneScreen, summaryScreen, errorScreen } from './ui/screens.js';
import { headerBar, receiverBoard, pathPanel, consolePanel } from './ui/panels.js';

const $ = (sel) => document.querySelector(sel);
const screenEl = $('#screen');
const headerEl = $('#headerbar');
const logEl = $('#log-lines');
const btnHint = $('#btn-hint');
const btnConsole = $('#btn-console');
const btnMotion = $('#btn-motion');
const btnRestart = $('#btn-restart');

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = prefersReduced.matches;
let consoleMode = false;
let state = null;
let game = null;
let play = null; // { roundId, world, selection, lastPath, nodes }
let tut = null;  // { step, nodes } while the link test is on screen

// ---------- log ----------
function log(text, kind = 'info') {
  const stamp = state && state.view === 'play' ? `[${S.currentRound(state).id}]` : '[--]';
  logEl.append(h('li', { class: `log-${kind}` }, h('span', { class: 'log-stamp' }, stamp), ' ', text));
  while (logEl.children.length > 60) logEl.firstChild.remove();
  logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
}

// ---------- actions ----------
const actions = {
  openBriefing: () => setState(S.openBriefing(state)),
  beginPlay: () => setState(S.beginPlay(state)),
  next: () => {
    setState(S.next(state));
  },
  restart: () => {
    if (!window.confirm('Restart Packet Dash? Your progress in this session will be cleared.')) { log('restart cancelled; progress kept', 'info'); return; }
    logEl.replaceChildren();
    setState(S.restart(state, true));
    log('session restarted', 'info');
  },
  enter: (zone) => {
    if (!play || S.roundProgress(state).solved) return;
    if (zone.kind === 'piece') return actions.togglePiece(zone.num);
    if (zone.kind === 'send') return submit({ kind: 'pieces', resend: [...play.selection] }, zone);
    return submit(zone.answer, zone);
  },
  togglePiece: (num) => {
    if (S.roundProgress(state).solved) return;
    if (play.selection.has(num)) play.selection.delete(num); else play.selection.add(num);
    game?.setSelection(play.selection);
    refreshPlayPanels();
  },
  hint: () => {
    if (state.view === 'tutorial') {
      log('admin: in a level, the first hint explains the method and the second shows the answer. Hints are recorded but never cost anything.', 'hint');
      tutorialEvent({ type: 'hint' });
      return;
    }
    if (state.view !== 'play') return;
    const { state: next, hint } = S.useHint(state);
    state = next;
    log(`hint ${hint.index + 1}/${hint.total}: ${hint.text}`, 'hint');
    renderHeader();
  },
  toggleConsole: () => {
    consoleMode = !consoleMode;
    btnConsole.setAttribute('aria-pressed', String(consoleMode));
    if (state.view === 'play') { renderPlay(true); log(consoleMode ? 'console mode on' : 'platform mode on', 'info'); }
    if (state.view === 'tutorial') { renderTutorial(); log(consoleMode ? 'console mode on: every choice becomes a button, no controls needed' : 'platform mode on', 'info'); }
  },
  finishTutorial: () => setState(S.finishTutorial(state)),
  toggleMotion: () => {
    reducedMotion = !reducedMotion;
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
    btnMotion.setAttribute('aria-pressed', String(reducedMotion));
    if (state.view === 'play') refreshPlayPanels();
  },
};

function submit(answer, zone) {
  const level = S.currentLevel(state);
  const round = S.currentRound(state);
  const { state: next, result } = S.submit(state, answer);
  if (!result) return;
  state = next;
  const text = explain(level, result);
  if (result.status === 'correct') {
    log(text, 'ok');
    game?.setSelection(play.selection);
    game?.setSolved(zone);
  } else if (result.status === 'incorrect') {
    log(text, 'bad');
    game?.respawnAtDecision();
  } else if (result.status === 'invalid-input') {
    log(text, 'warn');
  } else {
    log(text, 'warn');
  }
  if (round.mechanic === 'path' && (result.status === 'correct' || result.status === 'incorrect')) play.lastPath = result.evidence;
  renderHeader();
  refreshPlayPanels();
  if (result.status === 'correct') play.nodes.next.focus();
}

// ---------- rendering ----------
function setState(next) {
  const prevView = state?.view;
  const prevRound = state && state.view === 'play' ? S.currentRound(state).id : null;
  state = next;
  renderHeader();
  btnHint.disabled = state.view !== 'play' && state.view !== 'tutorial';
  if (state.view === 'tutorial') { renderTutorial(); return; }
  if (state.view === 'play') {
    const sameRound = prevView === 'play' && prevRound === S.currentRound(state).id;
    if (!sameRound) renderPlay(false);
    return;
  }
  teardownGame();
  const view = { map: mapScreen, briefing: briefingScreen, 'level-done': levelDoneScreen, summary: summaryScreen }[state.view];
  screenEl.replaceChildren(view(state, actions));
  focusHeading();
}

function renderHeader() {
  if (!state) return;
  headerEl.replaceChildren(...headerBar(state));
}

function focusHeading() {
  const hd = screenEl.querySelector('h1');
  if (hd) hd.focus({ preventScroll: false });
}

function teardownGame() {
  if (game) { game.destroy(); game = null; }
  play = null;
  tut = null;
}

// ---------- link test: learn the controls by doing them ----------
function renderTutorial() {
  teardownGame();
  tut = { step: 0, nodes: {} };
  const checklist = h('ol', { class: 'tut-steps', 'aria-live': 'polite' });
  const start = h('button', { class: 'primary', disabled: !consoleMode, onclick: actions.finishTutorial }, 'Start Level 1 ▶');
  const skip = h('button', { onclick: actions.finishTutorial }, 'Skip link test');
  tut.nodes = { checklist, start };
  let stage = null;
  if (!consoleMode) {
    const canvas = h('canvas', { id: 'game', tabindex: 0, role: 'application', 'aria-roledescription': 'practice level',
      'aria-label': 'Link test. Arrow keys run, Space jumps, Up or E enters the door, H asks for help. Press C to use Console mode instead.' });
    stage = h('div', { class: 'stage' }, canvas, h('p', { class: 'focus-hint', 'aria-hidden': 'true' }, 'Click here or press Tab to focus the game'));
    game = new Game(canvas, {
      onEnter: () => tutorialEvent({ type: 'entered' }),
      onTutorial: tutorialEvent,
      onFall: () => {},
      reducedMotion: () => reducedMotion,
    });
    game.load(null, tutorialWorld(), { tutorial: true });
    game.start();
    canvas.addEventListener('pointerdown', () => canvas.focus());
  }
  screenEl.replaceChildren(h('section', { class: `screen screen-tutorial ${consoleMode ? 'is-console' : ''}` },
    h('p', { class: 'eyebrow' }, 'Before Level 1'),
    h('h1', { tabindex: -1 }, consoleMode ? 'Link test · console mode' : 'Link test'),
    h('div', { class: 'play-grid' }, stage,
      h('section', { class: 'panel', 'aria-labelledby': 'tut-title' },
        h('h2', { id: 'tut-title' }, consoleMode ? 'No controls to learn' : 'Do each step in the game'),
        consoleMode ? h('p', { class: 'small' }, 'In Console mode every door, path and piece is a button. Press H at any time for a hint.') : checklist,
        h('div', { class: 'actions' }, start, consoleMode ? null : skip)))));
  renderChecklist();
  if (game) document.getElementById('game').focus(); else focusHeading();
}

function renderChecklist() {
  if (!tut) return;
  tut.nodes.checklist.replaceChildren(...TUTORIAL_STEPS.map((s, i) => {
    const state_ = i < tut.step ? 'done' : i === tut.step ? 'now' : 'todo';
    return h('li', { class: `tut-${state_}` },
      h('span', { class: 'tut-keys', 'aria-hidden': 'true' }, s.keys.map((k) => h('kbd', {}, k))),
      h('span', {}, s.caption),
      h('span', { class: 'sr-only' }, state_ === 'done' ? ' (done)' : state_ === 'now' ? ' (current step)' : ''));
  }));
}

function tutorialEvent(event) {
  if (!tut) return;
  const next = advanceTutorial(tut.step, event);
  if (next === tut.step) return;
  const done = TUTORIAL_STEPS[tut.step];
  tut.step = next;
  game?.setTutorialStep(next);
  renderChecklist();
  log(`✔ link test: ${done.done}`, 'ok');
  if (done.id === 'enter') log('door 7 on 127.0.0.1 is the echo service: you sent PING, it answered PONG', 'info');
  if (tutorialFinished(next)) {
    tut.nodes.start.disabled = false;
    log('link test passed · press Start Level 1', 'ok');
    tut.nodes.start.focus();
  }
}

function renderPlay(keepRound) {
  const level = S.currentLevel(state);
  const round = S.currentRound(state);
  if (!keepRound || !play || play.roundId !== round.id) {
    teardownGame();
    play = { roundId: round.id, world: buildWorld(round), selection: new Set(), lastPath: null, nodes: {} };
    log(`round ${round.id} · ${level.title}: ${roundGoal(round)}`, 'info');
  } else if (game) { game.destroy(); game = null; }

  const solved = S.roundProgress(state).solved;
  const canvas = h('canvas', { id: 'game', tabindex: 0, role: 'application', 'aria-roledescription': 'platform game',
    'aria-label': `Platform level for round ${round.id}. Arrow keys move, Space jumps, Up or E enters. Press C for Console mode, which lists the same choices as buttons.`,
    'aria-describedby': 'scene-text' });
  const sceneText = h('p', { id: 'scene-text', class: 'sr-only' }, `Choices ahead: ${play.world.zones.map((z) => z.text).join('; ')}.`);
  const focusHint = h('p', { class: 'focus-hint', 'aria-hidden': 'true' }, 'Click here or press Tab to focus the game');
  const next = h('button', { class: 'primary', id: 'btn-next', disabled: !solved, onclick: actions.next },
    S.currentLevel(state).rounds.length - 1 === state.roundIndex ? 'Finish level ▶ (N)' : 'Next round ▶ (N)');
  const side = h('div', { class: 'side' });
  const stage = consoleMode ? null : h('div', { class: 'stage' }, canvas, focusHint, sceneText);
  const view = h('section', { class: `screen screen-play ${consoleMode ? 'is-console' : ''}` },
    h('h1', { class: 'sr-only', tabindex: -1 }, `Level ${state.levelIndex + 1}, round ${round.id}: ${level.title}`),
    h('div', { class: 'play-grid' }, stage, side),
    h('div', { class: 'play-actions' },
      h('p', { class: 'goal' }, h('strong', {}, 'Goal: '), roundGoal(round)),
      next));
  play.nodes = { side, next };
  screenEl.replaceChildren(view);

  if (!consoleMode) {
    game = new Game(canvas, { onEnter: actions.enter, onFall: () => {}, reducedMotion: () => reducedMotion });
    // First round of each level shows in-world prompts for its new action.
    game.load(round, play.world, { coach: state.roundIndex === 0 });
    game.setSelection(play.selection);
    if (solved) game.setSolved(null);
    game.start();
    canvas.addEventListener('pointerdown', () => canvas.focus());
    canvas.focus();
  } else {
    view.querySelector('h1').focus();
  }
  refreshPlayPanels();
}

function roundGoal(round) {
  if (round.mechanic === 'door') return `deliver to ${round.header.dst} : ${round.header.port}, or Bounce back if nobody is listening there.`;
  if (round.mechanic === 'path') return `get ${round.header.sizeKB} KB to the server by the path that delivers sooner.`;
  return `mark exactly the pieces the receiver is missing, then SEND.`;
}

function refreshPlayPanels() {
  if (!play) return;
  const round = S.currentRound(state);
  const solved = S.roundProgress(state).solved;
  const panels = [];
  if (consoleMode) panels.push(consolePanel(play.world, round, play.selection, solved, actions));
  if (round.mechanic === 'pieces') panels.push(receiverBoard(round, play.selection, solved));
  if (round.mechanic === 'path') panels.push(pathPanel(round, play.lastPath, reducedMotion));
  if (round.mechanic === 'door') panels.push(doorPanel(round));
  play.nodes.side.replaceChildren(...panels);
  play.nodes.next.disabled = !solved;
}

function doorPanel(round) {
  return h('section', { class: 'panel', 'aria-labelledby': 'hosts-title' },
    h('h2', { id: 'hosts-title' }, 'Hosts on this segment'),
    h('table', { class: 'stats' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Host'), h('th', { scope: 'col' }, 'Port'), h('th', { scope: 'col' }, 'Program'), h('th', { scope: 'col' }, 'State'))),
      h('tbody', {}, round.buildings.flatMap((b) => b.doors.map((d) =>
        h('tr', {}, h('td', { class: 'mono' }, b.ip), h('td', { class: 'mono' }, d.port), h('td', {}, d.service),
          h('td', { class: d.listening ? 'ok' : 'muted' }, d.listening ? '● LISTENING' : '○ CLOSED')))))));
}

// ---------- keyboard ----------
window.addEventListener('keydown', (e) => {
  if (!state || e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (state.view !== 'play' && state.view !== 'tutorial') return;
  if (e.code === 'KeyH') { e.preventDefault(); actions.hint(); }
  else if (e.code === 'KeyC') { e.preventDefault(); actions.toggleConsole(); }
  else if (e.code === 'KeyN' && S.roundProgress(state).solved) { e.preventDefault(); actions.next(); }
});

btnHint.addEventListener('click', actions.hint);
btnConsole.addEventListener('click', actions.toggleConsole);
btnMotion.addEventListener('click', actions.toggleMotion);
btnRestart.addEventListener('click', () => state && actions.restart());
prefersReduced.addEventListener?.('change', (e) => { if (e.matches !== reducedMotion) actions.toggleMotion(); });

// ---------- boot ----------
async function boot() {
  document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  btnMotion.setAttribute('aria-pressed', String(reducedMotion));
  let content;
  try {
    const res = await fetch('./data/levels.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    content = await res.json();
  } catch (e) {
    screenEl.replaceChildren(errorScreen([{ where: 'data/levels.json', message: `could not load (${e.message}). Serve the folder over HTTP: python3 start.py` }]));
    return;
  }
  const v = validateContent(content);
  if (!v.ok) { screenEl.replaceChildren(errorScreen(v.errors)); focusHeading(); return; }
  setState(S.createSession(content));
  log('link established · 3 hops to the server', 'info');
}

// Read-only hook for automated playtests: http://127.0.0.1:8000/?debug
if (new URLSearchParams(location.search).has('debug')) {
  window.__packetDash = { get game() { return game; }, get state() { return state; } };
}

boot();
