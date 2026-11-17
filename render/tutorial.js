// Interactive "link test": a tiny ungraded level that teaches the controls by doing them.
// Pure step logic so it can be tested without a browser.
import { GROUND_Y } from './world.js';

export const TUTORIAL_STEPS = [
  { id: 'move', keys: ['←', '→'], caption: 'run', done: 'ran' },
  { id: 'jump', keys: ['SPACE'], caption: 'jump the dropped link', done: 'jumped the gap' },
  { id: 'enter', keys: ['▲', 'E'], caption: 'enter the door', done: 'entered a door' },
  { id: 'help', keys: ['H'], caption: 'ask the admin for help', done: 'asked for help' },
];

const GAP = { x: 420, w: 80 };

export function tutorialWorld() {
  return {
    width: 1240,
    groundY: GROUND_Y,
    ground: [{ x: 0, w: GAP.x }, { x: GAP.x + GAP.w, w: 1240 - GAP.x - GAP.w }],
    gaps: [GAP],
    platforms: [],
    spawn: { x: 60 },
    decisionX: GAP.x + GAP.w + 40,
    buildings: [{ ip: '127.0.0.1', x: 700, w: 200 }],
    zones: [{
      id: 'echo', kind: 'door', x: 763, w: 74, h: 100, label: '7', sub: 'echo', listening: true, ip: '127.0.0.1',
      answer: null, text: 'Practice door 7 (echo) on 127.0.0.1, your own machine',
    }],
  };
}

// Where each step's keycaps float in the world.
export function stepAnchor(stepId, world, player) {
  if (stepId === 'move') return { x: player.x + 18, y: player.y - 110 };
  if (stepId === 'jump') return { x: world.gaps[0].x + world.gaps[0].w / 2, y: world.groundY - 120 };
  if (stepId === 'enter') { const z = world.zones[0]; return { x: z.x + z.w / 2, y: world.groundY - 262 }; }
  return { x: player.x + 18, y: player.y - 110 };
}

// step: index of the current step (TUTORIAL_STEPS.length = finished). Returns the next index.
export function advanceTutorial(step, event) {
  const current = TUTORIAL_STEPS[step]?.id;
  if (!current) return step;
  const matches =
    (current === 'move' && event.type === 'moved') ||
    (current === 'jump' && event.type === 'crossed-gap') ||
    (current === 'enter' && event.type === 'entered') ||
    (current === 'help' && event.type === 'hint');
  return matches ? step + 1 : step;
}

export const tutorialFinished = (step) => step >= TUTORIAL_STEPS.length;
