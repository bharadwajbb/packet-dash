// Session transitions. Every function returns a new state; nothing here touches the DOM.
import { evaluate } from './rules.js';

export function createSession(content) {
  const progress = {};
  for (const level of content.levels) for (const r of level.rounds) progress[r.id] = { attempts: 0, hints: 0, solved: false };
  return { content, view: 'map', levelIndex: 0, roundIndex: 0, progress, last: null, tutorialDone: false };
}

const clone = (s) => ({ ...s, progress: Object.fromEntries(Object.entries(s.progress).map(([k, v]) => [k, { ...v }])) });

export const currentLevel = (s) => s.content.levels[s.levelIndex];
export const currentRound = (s) => currentLevel(s).rounds[s.roundIndex];
export const roundProgress = (s) => s.progress[currentRound(s).id];
export const isLevelComplete = (s, level) => level.rounds.every((r) => s.progress[r.id].solved);
export const isFinalLevel = (s) => s.levelIndex === s.content.levels.length - 1;

// map → link test (first time only) → briefing (for the current level)
export function openBriefing(s) {
  if (s.view !== 'map') return s;
  const view = s.levelIndex === 0 && !s.tutorialDone ? 'tutorial' : 'briefing';
  return { ...clone(s), view, last: null };
}

// link test → briefing. Finishing and skipping both land here; nothing is graded.
export function finishTutorial(s) {
  if (s.view !== 'tutorial') return s;
  return { ...clone(s), view: 'briefing', tutorialDone: true };
}

// briefing → play
export function beginPlay(s) {
  if (s.view !== 'briefing') return s;
  return { ...clone(s), view: 'play', last: null };
}

// Returns { state, result }. result is null when the submission is ignored.
export function submit(s, answer) {
  if (s.view !== 'play') return { state: s, result: null };
  const round = currentRound(s);
  if (s.progress[round.id].solved) return { state: s, result: null };
  const result = evaluate(round, answer);
  const next = clone(s);
  const p = next.progress[round.id];
  if (result.status === 'correct' || result.status === 'incorrect') p.attempts += 1;
  if (result.status === 'correct') p.solved = true;
  next.last = result;
  return { state: next, result };
}

// Returns { state, hint }. Each press reveals the next hint; the last one repeats.
export function useHint(s) {
  if (s.view !== 'play') return { state: s, hint: null };
  const round = currentRound(s);
  const next = clone(s);
  const p = next.progress[round.id];
  const index = Math.min(p.hints, round.hints.length - 1);
  if (!p.solved) p.hints += 1;
  return { state: next, hint: { index, text: round.hints[index], total: round.hints.length } };
}

// play (solved) → next round | level-done; level-done → map | summary
export function next(s) {
  if (s.view === 'play') {
    if (!roundProgress(s).solved) return s;
    const n = clone(s);
    n.last = null;
    if (s.roundIndex < currentLevel(s).rounds.length - 1) n.roundIndex += 1;
    else n.view = 'level-done';
    return n;
  }
  if (s.view === 'level-done') {
    const n = clone(s);
    if (isFinalLevel(s)) n.view = 'summary';
    else { n.levelIndex += 1; n.roundIndex = 0; n.view = 'map'; }
    return n;
  }
  return s;
}

// Restart only when confirmed; cancel returns the same state.
export function restart(s, confirmed) {
  return confirmed ? { ...createSession(s.content), tutorialDone: s.tutorialDone } : s;
}

export function totals(s) {
  const rows = s.content.levels.flatMap((l) => l.rounds.map((r) => ({ level: l, round: r, ...s.progress[r.id] })));
  return {
    rows,
    solved: rows.filter((r) => r.solved).length,
    rounds: rows.length,
    attempts: rows.reduce((a, r) => a + r.attempts, 0),
    hints: rows.reduce((a, r) => a + r.hints, 0),
  };
}
